import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { useAuth } from "../../lib/auth-context";
import { apiRequest } from "../../lib/api";
import {
  clearCart,
  removeCartItem,
  setCartQuantity,
  useCartItems,
  type MarketplaceLocation,
} from "../../lib/marketplace-store";
import { MARKETPLACE_COLORS as C } from "../../theme/marketplace-colors";
import AppText from "@/components/ui/AppText";

type PaymentMethod = "COD" | "ONLINE";
type FulfillmentType = "SELLER_DELIVERY" | "CUSTOMER_PICKUP";
type CartListing = ReturnType<typeof useCartItems>[number]["listing"];
type CartLine = ReturnType<typeof useCartItems>[number];
type CreatedOrder = {
  id: string;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  totalAmount?: number | string;
};

const money = (value: number) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Something went wrong. Please try again.";
}

function quantityBounds(listing: CartListing) {
  const min = Math.max(1, Number(listing.minOrderQuantity ?? 1));
  const availableValue = Number(listing.quantityAvailable ?? 9999);
  const available = Number.isFinite(availableValue)
    ? Math.max(0, availableValue)
    : 9999;
  const maxValue = Number(listing.maxOrderQuantity ?? available);
  const declaredMax = Number.isFinite(maxValue) ? maxValue : available;
  return { min, max: Math.max(0, Math.min(available, declaredMax)), available };
}

function defaultFulfillment(listing: CartListing): FulfillmentType | null {
  if (listing.sellerDelivery) return "SELLER_DELIVERY";
  if (listing.customerPickup) return "CUSTOMER_PICKUP";
  return null;
}

export default function MarketplaceCartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useCartItems();
  const { user } = useAuth();

  const [locations, setLocations] = useState<MarketplaceLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [fulfillmentByListing, setFulfillmentByListing] = useState<
    Record<string, FulfillmentType>
  >({});
  const [busy, setBusy] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationError, setLocationError] = useState("");
  const [showAddressOptions, setShowAddressOptions] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [showCheckoutOptions, setShowCheckoutOptions] = useState(false);
  const checkoutLock = useRef(false);

  // GET /api/user/marketplace/locations
  // Reload whenever the user returns from the saved-address screen.
  const loadLocations = useCallback(async () => {
    setLoadingLocations(true);
    setLocationError("");

    try {
      const response = await apiRequest("/user/marketplace/locations");
      const rows = (response?.locations ?? []).map((row: any) => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      })) as MarketplaceLocation[];

      setLocations(rows);
      setLocationId((current) => {
        if (rows.some((row) => row.id === current)) return current;
        return rows.find((row) => row.isDefault)?.id ?? rows[0]?.id ?? "";
      });
    } catch (error) {
      setLocationError(
        getErrorMessage(error) || "Unable to load saved addresses.",
      );
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLocations();
    }, [loadLocations]),
  );

  const getFulfillment = useCallback(
    (listing: CartListing): FulfillmentType | null => {
      const selected = fulfillmentByListing[listing.id];
      if (selected === "SELLER_DELIVERY" && listing.sellerDelivery) {
        return selected;
      }
      if (selected === "CUSTOMER_PICKUP" && listing.customerPickup) {
        return selected;
      }
      return defaultFulfillment(listing);
    },
    [fulfillmentByListing],
  );

  const chooseFulfillment = (listingId: string, value: FulfillmentType) => {
    setFulfillmentByListing((current) => ({ ...current, [listingId]: value }));
  };

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Number(item.listing.price || 0) * item.quantity,
        0,
      ),
    [items],
  );

  const delivery = useMemo(
    () =>
      items.reduce((sum, item) => {
        return getFulfillment(item.listing) === "SELLER_DELIVERY"
          ? sum + Number(item.listing.deliveryFee || 0)
          : sum;
      }, 0),
    [items, getFulfillment],
  );

  const savings = useMemo(
    () =>
      items.reduce((sum, item) => {
        const original = Number(
          item.listing.originalPrice || item.listing.price || 0,
        );
        const current = Number(item.listing.price || 0);
        return sum + Math.max(0, original - current) * item.quantity;
      }, 0),
    [items],
  );

  const total = subtotal + delivery;
  const cancelPendingOrder = async (orderId: string) => {
    // POST /api/user/marketplace/orders/:orderId/cancel
    await apiRequest(`/user/marketplace/orders/${orderId}/cancel`, {
      method: "POST",
    });
  };

  const checkout = async () => {
    if (!items.length || checkoutLock.current || busy) return;

    if (!locationId) {
      Alert.alert(
        "Choose a delivery address",
        "Add or select a saved location before placing your order.",
        [
          { text: "Not now", style: "cancel" },
          {
            text: "Manage addresses",
            onPress: () => router.push("/market/location" as any),
          },
        ],
      );
      return;
    }

    const invalidItem = items.find(({ listing, quantity }) => {
      const bounds = quantityBounds(listing);
      return (
        bounds.max < bounds.min ||
        quantity < bounds.min ||
        quantity > bounds.max ||
        !getFulfillment(listing)
      );
    });

    if (invalidItem) {
      const bounds = quantityBounds(invalidItem.listing);
      const message = !getFulfillment(invalidItem.listing)
        ? `${invalidItem.listing.cropName} has no available delivery or pickup option.`
        : bounds.max < bounds.min
          ? `${invalidItem.listing.cropName} is currently unavailable in the required order quantity.`
          : `Update ${invalidItem.listing.cropName} to between ${bounds.min} and ${bounds.max} packs before checkout.`;

      Alert.alert("Check your cart", message);
      return;
    }

    checkoutLock.current = true;
    setBusy(true);

    // Orders are created one-by-one because the backend creates one order per listing.
    // Remove each item only after its order is confirmed, so failed items stay in cart.
    const placedOrders: CreatedOrder[] = [];

    try {
      for (const item of items) {
        const { listing, quantity } = item;
        const fulfillmentType = getFulfillment(listing);
        if (!fulfillmentType) {
          throw new Error(
            `${listing.cropName} has no available fulfillment option.`,
          );
        }

        // POST /api/user/marketplace/orders
        const created = await apiRequest("/user/marketplace/orders", {
          method: "POST",
          body: JSON.stringify({
            listingId: listing.id,
            quantity,
            buyerLocationId: locationId,
            fulfillmentType,
            paymentMethod,
          }),
        });

        const order = created?.order as CreatedOrder | undefined;
        if (!order?.id) {
          throw new Error(`The order for ${listing.cropName} was not created.`);
        }

        if (paymentMethod === "ONLINE" && order.status === "PENDING_PAYMENT") {
          // POST /api/user/marketplace/orders/:orderId/payment/create
          let paymentData: any;
          try {
            paymentData = await apiRequest(
              `/user/marketplace/orders/${order.id}/payment/create`,
              { method: "POST" },
            );
          } catch (error) {
            try {
              await cancelPendingOrder(order.id);
            } catch {
              // Keep the original payment setup error; reservation cleanup also runs server-side.
            }
            throw new Error(
              `Could not start payment for ${listing.cropName}. The unpaid reservation was cancelled where possible. ${getErrorMessage(error)}`,
            );
          }

          const razorpay = paymentData?.razorpay;
          if (!razorpay?.orderId || !razorpay?.keyId) {
            try {
              await cancelPendingOrder(order.id);
            } catch {
              // Do not hide the missing-checkout-session error.
            }
            throw new Error(
              `Payment could not be initialized for ${listing.cropName}.`,
            );
          }

          let result: any;
          try {
            result = await RazorpayCheckout.open({
              key: razorpay.keyId,
              amount: razorpay.amount,
              currency: razorpay.currency || "INR",
              order_id: razorpay.orderId,
              name: "Agri Marketplace",
              description: `${listing.cropName} · ${listing.packSizeValue} ${listing.packSizeUnit}`,
              theme: { color: C.green },
              prefill: {
                name: user?.username ?? "",
                email: user?.email ?? "",
              },
            });
          } catch (error) {
            let reservationCancelled = false;
            try {
              await cancelPendingOrder(order.id);
              reservationCancelled = true;
            } catch {
              // If cancellation fails, tell the user the order may still be pending.
            }

            throw new Error(
              reservationCancelled
                ? `Payment was cancelled for ${listing.cropName}. The pending order was cancelled and the item remains in your cart.`
                : `Payment was cancelled for ${listing.cropName}, but the pending order could not be cancelled automatically. Check your orders before retrying. ${getErrorMessage(error)}`,
            );
          }

          // POST /api/user/marketplace/orders/:orderId/payment/verify
          try {
            await apiRequest(
              `/user/marketplace/orders/${order.id}/payment/verify`,
              {
                method: "POST",
                body: JSON.stringify({
                  razorpay_order_id: result.razorpay_order_id,
                  razorpay_payment_id: result.razorpay_payment_id,
                  razorpay_signature: result.razorpay_signature,
                }),
              },
            );
          } catch (verificationError) {
            // A webhook may have confirmed payment even if the verify response failed.
            const latest = await apiRequest(
              `/user/marketplace/orders/${order.id}`,
            ).catch(() => null);

            const currentOrder = latest?.order;
            if (
              currentOrder?.paymentStatus !== "PAID" ||
              currentOrder?.status !== "PLACED"
            ) {
              // Do not cancel here: payment could have been captured at the provider.
              throw new Error(
                `Payment for ${listing.cropName} could not be confirmed. The item remains in your cart. Check your buying orders before trying again. ${getErrorMessage(verificationError)}`,
              );
            }
          }
        } else if (
          paymentMethod === "ONLINE" &&
          order.paymentStatus !== "PAID"
        ) {
          throw new Error(
            `The order for ${listing.cropName} was created but is not ready for payment. Check your buying orders before retrying.`,
          );
        }

        placedOrders.push(order);
        removeCartItem(listing.id);
      }

      // GET /api/user/marketplace/orders/buying confirms the user's order feed is reachable.
      // Order creation and payment confirmation above are authoritative; this refresh is best-effort.
      await apiRequest("/user/marketplace/orders/buying").catch(() => null);

      const orderNumbers = placedOrders
        .map((order) => order.orderNumber)
        .filter(Boolean);
      const orderSummary = orderNumbers.length
        ? `Order${orderNumbers.length === 1 ? "" : "s"}: ${orderNumbers.join(", ")}. `
        : "";

      Alert.alert(
        "Order placed successfully",
        `${orderSummary}${paymentMethod === "ONLINE" ? "Payment verified. Your orders are confirmed." : "Your cash-on-delivery orders are confirmed."}`,
        [
          {
            text: "Continue shopping",
            onPress: () => router.replace("/(tabs)/market" as any),
          },
        ],
      );
    } catch (error) {
      const message = getErrorMessage(error);
      if (placedOrders.length > 0) {
        Alert.alert(
          "Checkout partially completed",
          `${placedOrders.length} order${placedOrders.length === 1 ? " was" : "s were"} placed successfully. Those products have been removed from your cart. The remaining items are still saved.\n\n${message}`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert(
          "Checkout failed",
          `${message}\n\nYour unconfirmed items remain in your cart.`,
        );
      }
    } finally {
      checkoutLock.current = false;
      setBusy(false);
    }
  };

  const originalSubtotal = subtotal + savings;
  const discountPercent =
    originalSubtotal > 0 ? Math.round((savings / originalSubtotal) * 100) : 0;
  const selectedLocation = locations.find(
    (location) => location.id === locationId,
  );

  return (
    <View className="flex-1 bg-[#07110B]">
      <StatusBar barStyle="light-content" backgroundColor="#07110B" />

      {/* Full-screen cart: safe-area insets are handled by the screen, not a floating drawer. */}
      <View
        className="flex-1 bg-[#0D140F]"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* Cart header */}
        <View className="flex-row items-center justify-between border-b border-[#263229] bg-[#111914] px-4 py-3">
          <AppText className="text-[19px] font-bold leading-6 text-[#F5F7F2]">
            Your Cart ({items.length})
          </AppText>

          <View className="flex-row items-center gap-1">
            {items.length > 0 ? (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Clear cart?",
                    "Remove every product from your cart?",
                    [
                      { text: "Keep items", style: "cancel" },
                      {
                        text: "Clear cart",
                        style: "destructive",
                        onPress: clearCart,
                      },
                    ],
                  )
                }
                className="h-8 w-8 items-center justify-center rounded-full"
                accessibilityRole="button"
                accessibilityLabel="Clear cart"
              >
                <Feather name="trash-2" size={15} color="#8F9B90" />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.back()}
              className="h-8 w-8 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel="Close cart"
            >
              <Feather name="x" size={25} color="#EAF0E8" />
            </Pressable>
          </View>
        </View>

        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center px-7">
            <View className="mb-4 h-[76px] w-[76px] items-center justify-center rounded-[22px] border border-[#344832] bg-[#17251A]">
              <Ionicons name="basket-outline" size={35} color="#C9F477" />
            </View>
            <AppText className="text-center text-[21px] font-bold text-[#F5F7F2]">
              Your cart is empty
            </AppText>
            <AppText className="mt-2 text-center text-[12px] leading-5 text-[#A0ADA1]">
              Find something fresh from growers near you.
            </AppText>
            <Pressable
              onPress={() => router.replace("/(tabs)/market" as any)}
              className="mt-5 min-h-[46px] w-full flex-row items-center justify-center gap-2 rounded-full bg-[#347D4A] px-4"
            >
              <AppText className="text-[13px] font-bold text-white">
                Browse marketplace
              </AppText>
              <Feather name="arrow-right" size={15} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 14 }}
            >
              {/* Cart items: independent full-width section. */}
              <View className="border-b border-[#26372A] bg-[#0D140F] pb-4 pt-3">
                {items.map(({ listing, quantity }: CartLine) => {
                  const bounds = quantityBounds(listing);
                  const selectedFulfillment = getFulfillment(listing);
                  const price = Number(listing.price || 0);
                  const originalPrice = Number(
                    listing.originalPrice || listing.price || 0,
                  );
                  const itemSubtotal = price * quantity;
                  const itemOriginalSubtotal = originalPrice * quantity;
                  const itemSavings = Math.max(
                    0,
                    itemOriginalSubtotal - itemSubtotal,
                  );
                  const overStock =
                    quantity > bounds.max || bounds.max < bounds.min;

                  return (
                    <View key={listing.id} className="mb-4 px-4">
                      <View className="mb-2 flex-row items-center justify-between">
                        <AppText className="text-[11px] font-semibold text-[#DCE6DA]">
                          Fresh from your local grower
                        </AppText>
                        <Pressable
                          onPress={() =>
                            Alert.alert(
                              "Remove item?",
                              `Remove ${listing.cropName} from your cart?`,
                              [
                                { text: "Keep", style: "cancel" },
                                {
                                  text: "Remove",
                                  style: "destructive",
                                  onPress: () => removeCartItem(listing.id),
                                },
                              ],
                            )
                          }
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${listing.cropName}`}
                        >
                          <Feather name="trash-2" size={15} color="#8F9B90" />
                        </Pressable>
                      </View>

                      <View className="flex-row gap-3">
                        <View className="h-[88px] w-[82px] shrink-0 overflow-hidden rounded-[10px] bg-[#202D23]">
                          {listing.imageUrl ? (
                            <Image
                              source={{ uri: listing.imageUrl }}
                              className="h-full w-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="flex-1 items-center justify-center">
                              <Ionicons
                                name="leaf-outline"
                                size={30}
                                color="#C9F477"
                              />
                              <AppText className="mt-1 text-[9px] text-[#A0ADA1]">
                                Fresh produce
                              </AppText>
                            </View>
                          )}
                        </View>

                        <View className="min-w-0 flex-1">
                          <AppText
                            className="text-[15px] font-bold leading-5 text-[#F5F7F2]"
                            numberOfLines={2}
                          >
                            {listing.cropName}
                          </AppText>
                          <AppText className="mt-0.5 text-[11px] text-[#A0ADA1]">
                            {listing.packSizeValue} {listing.packSizeUnit}
                          </AppText>
                          <AppText
                            className="text-[11px] text-[#A0ADA1]"
                            numberOfLines={1}
                          >
                            {listing.seller?.username ?? "Local grower"}
                          </AppText>

                          <View className="mt-2 flex-row flex-wrap items-baseline gap-1.5">
                            <AppText className="text-[16px] font-bold text-[#F5F7F2]">
                              {money(itemSubtotal)}
                            </AppText>
                            {itemSavings > 0 ? (
                              <AppText className="text-[10px] text-[#849087] line-through">
                                {money(itemOriginalSubtotal)}
                              </AppText>
                            ) : null}
                          </View>

                          {itemSavings > 0 ? (
                            <View className="mt-1.5 self-start flex-row items-center gap-1 rounded-md bg-[#24372A] px-2 py-1">
                              <Feather name="tag" size={10} color="#C9F477" />
                              <AppText className="text-[10px] font-semibold text-[#DCEBD6]">
                                SAVE {money(itemSavings)}
                              </AppText>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Quantity controls */}
                      <View className="mt-3 flex-row flex-wrap items-center justify-between gap-2">
                        <View className="h-9 flex-row items-center rounded-full border border-[#344337] bg-[#101711]">
                          <Pressable
                            onPress={() => {
                              if (quantity > bounds.min) {
                                setCartQuantity(listing.id, quantity - 1);
                              }
                            }}
                            disabled={quantity <= bounds.min}
                            className="h-8 w-9 items-center justify-center"
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease ${listing.cropName} quantity`}
                          >
                            <Feather
                              name="minus"
                              size={14}
                              color={
                                quantity <= bounds.min ? "#59645A" : "#F5F7F2"
                              }
                            />
                          </Pressable>
                          <AppText className="min-w-[20px] text-center text-[12px] font-bold text-[#F5F7F2]">
                            {quantity}
                          </AppText>
                          <Pressable
                            onPress={() => {
                              if (
                                bounds.max >= bounds.min &&
                                quantity < bounds.max
                              ) {
                                setCartQuantity(
                                  listing.id,
                                  Math.min(
                                    bounds.max,
                                    Math.max(bounds.min, quantity + 1),
                                  ),
                                );
                              }
                            }}
                            disabled={
                              bounds.max < bounds.min || quantity >= bounds.max
                            }
                            className="h-8 w-9 items-center justify-center"
                            accessibilityRole="button"
                            accessibilityLabel={`Increase ${listing.cropName} quantity`}
                          >
                            <Feather
                              name="plus"
                              size={14}
                              color={
                                bounds.max < bounds.min ||
                                quantity >= bounds.max
                                  ? "#59645A"
                                  : "#C9F477"
                              }
                            />
                          </Pressable>
                        </View>

                        <AppText className="text-[10px] text-[#A0ADA1]">
                          {money(price)} per pack
                        </AppText>
                      </View>

                      {/* Compact delivery and pickup options */}
                      {listing.sellerDelivery && listing.customerPickup ? (
                        <View className="mt-3 flex-row gap-2">
                          <Pressable
                            onPress={() =>
                              chooseFulfillment(listing.id, "SELLER_DELIVERY")
                            }
                            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border px-2 py-2 ${selectedFulfillment === "SELLER_DELIVERY" ? "border-[#638D5D] bg-[#1B2B1D]" : "border-[#2A382D] bg-[#111813]"}`}
                          >
                            <Feather
                              name="truck"
                              size={12}
                              color={
                                selectedFulfillment === "SELLER_DELIVERY"
                                  ? "#C9F477"
                                  : "#A0ADA1"
                              }
                            />
                            <AppText className="text-[10px] font-semibold text-[#E5ECE3]">
                              Delivery{" "}
                              {Number(listing.deliveryFee || 0) > 0
                                ? `· ${money(Number(listing.deliveryFee || 0))}`
                                : "· Free"}
                            </AppText>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              chooseFulfillment(listing.id, "CUSTOMER_PICKUP")
                            }
                            className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-lg border px-2 py-2 ${selectedFulfillment === "CUSTOMER_PICKUP" ? "border-[#638D5D] bg-[#1B2B1D]" : "border-[#2A382D] bg-[#111813]"}`}
                          >
                            <Feather
                              name="map-pin"
                              size={12}
                              color={
                                selectedFulfillment === "CUSTOMER_PICKUP"
                                  ? "#C9F477"
                                  : "#A0ADA1"
                              }
                            />
                            <AppText className="text-[10px] font-semibold text-[#E5ECE3]">
                              Pickup · Free
                            </AppText>
                          </Pressable>
                        </View>
                      ) : (
                        <View className="mt-2 flex-row items-center gap-1.5">
                          <Feather
                            name={listing.sellerDelivery ? "truck" : "map-pin"}
                            size={12}
                            color="#9EC49B"
                          />
                          <AppText className="text-[10px] text-[#A0ADA1]">
                            {listing.sellerDelivery
                              ? `Seller delivery · ${Number(listing.deliveryFee || 0) > 0 ? money(Number(listing.deliveryFee || 0)) : "Free"}`
                              : listing.customerPickup
                                ? "Customer pickup · Free"
                                : "No delivery or pickup option available"}
                          </AppText>
                        </View>
                      )}

                      {overStock ? (
                        <View className="mt-2 flex-row items-start gap-2 rounded-lg border border-[#624B30] bg-[#281F15] px-3 py-2">
                          <Feather
                            name="alert-triangle"
                            size={13}
                            color="#F2B873"
                          />
                          <AppText className="flex-1 text-[10px] leading-4 text-[#F4D7B2]">
                            {bounds.max < bounds.min
                              ? "This listing is below its minimum order quantity. Remove it and choose another listing."
                              : `Only ${bounds.max} packs are available. Update the quantity before checkout.`}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {/* Dark olive upsell panel, mirroring the reference's highlighted section. */}
              <View className="border-y border-[#3A4329] bg-[#202719] px-3.5 py-4">
                <AppText className="text-[17px] font-bold leading-6 text-[#F0F4E9]">
                  More goodness for your table
                </AppText>
                <AppText className="mt-1 text-[11px] leading-[18px] text-[#D0D8C8]">
                  Discover seasonal produce from nearby growers and add
                  something fresh to your order.
                </AppText>
                <AppText className="mt-1 text-[9px] leading-4 text-[#AAB59E]">
                  Browse the marketplace for current availability and pricing.
                </AppText>

                <View className="mt-3 flex-row items-center gap-3 rounded-[14px] bg-[#101711] p-2.5">
                  <View className="h-[94px] w-[94px] shrink-0 items-center justify-center rounded-[10px] bg-[#263529]">
                    <Ionicons name="leaf" size={46} color="#C9F477" />
                    <AppText className="mt-1 text-[9px] font-bold text-[#DDE8D8]">
                      LOCAL HARVEST
                    </AppText>
                  </View>
                  <View className="min-w-0 flex-1">
                    <AppText className="text-[13px] font-bold text-[#F5F7F2]">
                      Seasonal favourites
                    </AppText>
                    <AppText className="mt-1 text-[10px] leading-[15px] text-[#B7C2B6]">
                      Fresh picks, fair prices, and direct-from-grower produce.
                    </AppText>
                    <Pressable
                      onPress={() => router.replace("/(tabs)/market" as any)}
                      className="mt-2.5 min-h-[36px] items-center justify-center rounded-full border border-[#D3E99C] bg-[#C9F477] px-3"
                    >
                      <AppText className="text-[11px] font-bold text-[#142013]">
                        Browse Marketplace
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Compact expandable delivery/payment row keeps the reference layout clean. */}
              <View className="pt-3">
                <Pressable
                  onPress={() => setShowCheckoutOptions((value) => !value)}
                  className="flex-row items-center gap-3 rounded-xl border border-[#2A382D] bg-[#111813] p-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#223224]">
                    <Feather name="clipboard" size={15} color="#C9F477" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <AppText className="text-[12px] font-bold text-[#F5F7F2]">
                      Delivery & payment
                    </AppText>
                    <AppText
                      className="mt-0.5 text-[10px] text-[#A0ADA1]"
                      numberOfLines={1}
                    >
                      {selectedLocation?.label ??
                        (loadingLocations
                          ? "Loading address…"
                          : "Choose an address")}
                      {paymentMethod === "ONLINE"
                        ? " · Pay online"
                        : " · Cash on delivery"}
                    </AppText>
                  </View>
                  <AppText className="text-[10px] font-bold text-[#C9F477]">
                    {showCheckoutOptions ? "Hide" : "Change"}
                  </AppText>
                </Pressable>
              </View>

              {showCheckoutOptions ? (
                <>
                  {/* Compact address selector */}
                  <View className="pt-4">
                    <View className="mb-2 flex-row items-center justify-between">
                      <AppText className="text-[16px] font-bold text-[#F5F7F2]">
                        Delivery address
                      </AppText>
                      <Pressable
                        onPress={() => router.push("/market/location" as any)}
                        className="px-1 py-1"
                      >
                        <AppText className="text-[11px] font-bold text-[#C9F477]">
                          Manage
                        </AppText>
                      </Pressable>
                    </View>

                    {loadingLocations ? (
                      <View className="flex-row items-center gap-2 rounded-xl border border-[#2A382D] bg-[#111813] p-3">
                        <ActivityIndicator size="small" color="#C9F477" />
                        <AppText className="text-[11px] text-[#A0ADA1]">
                          Loading saved addresses…
                        </AppText>
                      </View>
                    ) : locationError ? (
                      <View className="rounded-xl border border-[#624B30] bg-[#211C15] p-3">
                        <AppText className="text-[11px] leading-4 text-[#E8CBA8]">
                          {locationError}
                        </AppText>
                        <Pressable
                          onPress={() => void loadLocations()}
                          className="mt-2 self-start"
                        >
                          <AppText className="text-[11px] font-bold text-[#F2B873]">
                            Try again
                          </AppText>
                        </Pressable>
                      </View>
                    ) : locations.length === 0 ? (
                      <Pressable
                        onPress={() => router.push("/market/location" as any)}
                        className="flex-row items-center gap-3 rounded-xl border border-dashed border-[#405640] bg-[#111813] p-3"
                      >
                        <Feather name="map-pin" size={17} color="#C9F477" />
                        <View className="min-w-0 flex-1">
                          <AppText className="text-[12px] font-semibold text-[#F5F7F2]">
                            Add a delivery address
                          </AppText>
                          <AppText className="mt-0.5 text-[10px] text-[#A0ADA1]">
                            Required before placing your order.
                          </AppText>
                        </View>
                        <Feather
                          name="chevron-right"
                          size={16}
                          color="#A0ADA1"
                        />
                      </Pressable>
                    ) : (
                      <>
                        <Pressable
                          onPress={() =>
                            setShowAddressOptions((value) => !value)
                          }
                          className="flex-row items-center gap-3 rounded-xl border border-[#2A382D] bg-[#111813] p-3"
                        >
                          <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#223224]">
                            <Feather name="map-pin" size={15} color="#C9F477" />
                          </View>
                          <View className="min-w-0 flex-1">
                            <AppText
                              className="text-[12px] font-bold text-[#F5F7F2]"
                              numberOfLines={1}
                            >
                              {selectedLocation?.label ?? "Select an address"}
                            </AppText>
                            <AppText
                              className="mt-0.5 text-[10px] leading-4 text-[#A0ADA1]"
                              numberOfLines={2}
                            >
                              {selectedLocation?.address ??
                                "Choose a saved location"}
                            </AppText>
                          </View>
                          <AppText className="text-[10px] font-bold text-[#C9F477]">
                            {showAddressOptions ? "Done" : "Change"}
                          </AppText>
                        </Pressable>

                        {showAddressOptions ? (
                          <View className="mt-2 gap-2">
                            {locations.map((location) => {
                              const selected = locationId === location.id;
                              return (
                                <Pressable
                                  key={location.id}
                                  onPress={() => {
                                    setLocationId(location.id);
                                    setShowAddressOptions(false);
                                  }}
                                  className={`flex-row items-center gap-2 rounded-lg border p-3 ${selected ? "border-[#638D5D] bg-[#1B2B1D]" : "border-[#2A382D] bg-[#111813]"}`}
                                >
                                  <View className="min-w-0 flex-1">
                                    <AppText className="text-[11px] font-bold text-[#F5F7F2]">
                                      {location.label}
                                      {location.isDefault ? " · DEFAULT" : ""}
                                    </AppText>
                                    <AppText
                                      className="mt-0.5 text-[10px] leading-4 text-[#A0ADA1]"
                                      numberOfLines={2}
                                    >
                                      {location.address}
                                    </AppText>
                                  </View>
                                  {selected ? (
                                    <Feather
                                      name="check-circle"
                                      size={16}
                                      color="#C9F477"
                                    />
                                  ) : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        ) : null}
                      </>
                    )}
                  </View>

                  {/* Compact payment selector */}
                  <View className="pt-4">
                    <AppText className="mb-2 text-[16px] font-bold text-[#F5F7F2]">
                      Payment method
                    </AppText>
                    <Pressable
                      onPress={() => setShowPaymentOptions((value) => !value)}
                      className="flex-row items-center gap-3 rounded-xl border border-[#2A382D] bg-[#111813] p-3"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-lg bg-[#223224]">
                        <Feather
                          name={
                            paymentMethod === "ONLINE" ? "credit-card" : "truck"
                          }
                          size={15}
                          color="#C9F477"
                        />
                      </View>
                      <View className="min-w-0 flex-1">
                        <AppText className="text-[12px] font-bold text-[#F5F7F2]">
                          {paymentMethod === "ONLINE"
                            ? "Pay online"
                            : "Cash on delivery"}
                        </AppText>
                        <AppText className="mt-0.5 text-[10px] text-[#A0ADA1]">
                          {paymentMethod === "ONLINE"
                            ? "Secure Razorpay checkout"
                            : "Pay when your order arrives"}
                        </AppText>
                      </View>
                      <AppText className="text-[10px] font-bold text-[#C9F477]">
                        {showPaymentOptions ? "Done" : "Change"}
                      </AppText>
                    </Pressable>

                    {showPaymentOptions ? (
                      <View className="mt-2 flex-row gap-2">
                        <Pressable
                          onPress={() => {
                            setPaymentMethod("COD");
                            setShowPaymentOptions(false);
                          }}
                          className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-2 py-3 ${paymentMethod === "COD" ? "border-[#638D5D] bg-[#1B2B1D]" : "border-[#2A382D] bg-[#111813]"}`}
                        >
                          <Feather
                            name="truck"
                            size={13}
                            color={
                              paymentMethod === "COD" ? "#C9F477" : "#A0ADA1"
                            }
                          />
                          <AppText className="text-[10px] font-semibold text-[#E5ECE3]">
                            Cash on delivery
                          </AppText>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setPaymentMethod("ONLINE");
                            setShowPaymentOptions(false);
                          }}
                          className={`flex-1 flex-row items-center justify-center gap-2 rounded-lg border px-2 py-3 ${paymentMethod === "ONLINE" ? "border-[#638D5D] bg-[#1B2B1D]" : "border-[#2A382D] bg-[#111813]"}`}
                        >
                          <Feather
                            name="credit-card"
                            size={13}
                            color={
                              paymentMethod === "ONLINE" ? "#C9F477" : "#A0ADA1"
                            }
                          />
                          <AppText className="text-[10px] font-semibold text-[#E5ECE3]">
                            Pay online
                          </AppText>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </>
              ) : null}

              {/* Order summary */}
              <View className="px-3.5 pb-2 pt-5 ">
                <AppText className="mb-3 text-[17px] font-bold text-[#F5F7F2]">
                  Order Summary
                </AppText>

                <View className="mb-2.5 flex-row items-center justify-between gap-3">
                  <AppText className="text-[12px] text-[#A0ADA1]">
                    Subtotal
                  </AppText>
                  <AppText className="text-[12px] font-semibold text-[#E8EFE6]">
                    {money(subtotal)}
                  </AppText>
                </View>

                <View className="mb-2.5 flex-row items-center justify-between gap-3">
                  <AppText className="text-[12px] text-[#A0ADA1]">
                    Discount
                  </AppText>
                  <AppText className="text-[12px] font-bold text-[#88C58A]">
                    {savings > 0 ? `−${money(savings)}` : money(0)}
                  </AppText>
                </View>

                {savings > 0 ? (
                  <View className="mb-3 flex-row flex-wrap gap-1.5">
                    <View className="flex-row items-center gap-1 rounded-md bg-[#24372A] px-2 py-1.5">
                      <Feather name="tag" size={10} color="#AFC8A8" />
                      <AppText className="text-[9px] font-semibold text-[#DCEBD6]">
                        PRODUCT SAVINGS
                      </AppText>
                    </View>
                  </View>
                ) : null}

                <View className="mb-2.5 flex-row items-center justify-between gap-3">
                  <AppText className="text-[12px] text-[#A0ADA1]">
                    Shipping
                  </AppText>
                  <AppText className="text-[11px] font-bold text-[#88C58A]">
                    {delivery > 0 ? money(delivery) : "FREE"}
                  </AppText>
                </View>

                <View className="mb-3 flex-row items-center justify-between gap-3">
                  <AppText className="text-[12px] text-[#A0ADA1]">
                    Taxes & other charges
                  </AppText>
                  <AppText className="text-right text-[10px] text-[#A0ADA1]">
                    Confirmed at checkout
                  </AppText>
                </View>
              </View>
            </ScrollView>

            {/* Sticky footer with total, checkout, and trust row */}
            <View className="border-t border-[#29362B] bg-[#101711] pb-3 pt-3">
              <View className="px-4">
                <View className="mb-3 flex-row items-center justify-between gap-2">
                  <AppText className="text-[15px] font-bold text-[#F5F7F2]">
                    {delivery > 0 ? "Order total" : "Subtotal"}
                  </AppText>
                  <View className="flex-row flex-wrap items-center justify-end gap-1.5">
                    {savings > 0 ? (
                      <View className="rounded-full bg-[#C9F477] px-2.5 py-1">
                        <AppText className="text-[10px] font-bold text-[#172014]">
                          {discountPercent}% OFF
                        </AppText>
                      </View>
                    ) : null}
                    {savings > 0 ? (
                      <AppText className="text-[11px] text-[#849087] line-through">
                        {money(originalSubtotal + delivery)}
                      </AppText>
                    ) : null}
                    <AppText className="text-[17px] font-bold text-[#F5F7F2]">
                      {money(total)}
                    </AppText>
                  </View>
                </View>

                <Pressable
                  onPress={() => void checkout()}
                  disabled={busy || loadingLocations}
                  className={`min-h-[52px] flex-row items-center justify-center gap-2 rounded-full border border-[#142D1C] px-4 ${busy || loadingLocations ? "bg-[#526B53]" : "bg-[#347D4A]"}`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                  accessibilityRole="button"
                  accessibilityLabel={
                    paymentMethod === "ONLINE"
                      ? "Pay and place order"
                      : "Place order"
                  }
                >
                  {busy ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <AppText className="text-[14px] font-bold text-white">
                        Secure Checkout
                      </AppText>
                      <Feather name="lock" size={16} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>

                <View className="mt-3 flex-row items-start justify-between gap-2 border-t border-[#29362B] pt-3">
                  <View className="min-w-0 flex-1 flex-row items-start gap-1.5">
                    <Feather name="shield-check" size={14} color="#A0ADA1" />
                    <AppText className="flex-1 text-[9px] leading-3 text-[#B4BEB3]">
                      Secure{`\n`}checkout
                    </AppText>
                  </View>
                  <View className="min-w-0 flex-1 flex-row items-start gap-1.5">
                    <Feather name="map-pin" size={14} color="#A0ADA1" />
                    <AppText className="flex-1 text-[9px] leading-3 text-[#B4BEB3]">
                      Local{`\n`}growers
                    </AppText>
                  </View>
                  <View className="min-w-0 flex-1 flex-row items-start gap-1.5">
                    <Feather name="truck" size={14} color="#A0ADA1" />
                    <AppText className="flex-1 text-[9px] leading-3 text-[#B4BEB3]">
                      Delivery or{`\n`}pickup
                    </AppText>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );
}
