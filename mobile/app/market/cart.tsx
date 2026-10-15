import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
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
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
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

  return (
    <View className="flex-1 bg-[#0C0D0B]">
      <StatusBar barStyle="light-content" backgroundColor="#0C0D0B" />

      {/* Cart header */}
      <View
        className="flex-row items-center gap-3 border-b border-[#252922] px-4 pb-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-[#30352D] bg-[#171916]"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Feather name="arrow-left" size={20} color="#F6F7F4" />
        </Pressable>

        <View className="min-w-0 flex-1">
          <Text className="text-[10px] font-bold tracking-[1.7px] text-[#A2A79E]">
            FRESH FROM LOCAL GROWERS
          </Text>
          <Text className="mt-0.5 text-[25px] font-extrabold leading-8 text-[#F6F7F4]">
            Your cart
          </Text>
        </View>

        {items.length > 0 && (
          <>
            <View className="rounded-full bg-[#202A19] px-2.5 py-1.5">
              <Text className="text-[11px] font-extrabold text-[#C8FF67]">
                {totalUnits} {totalUnits === 1 ? "item" : "items"}
              </Text>
            </View>
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
              className="h-10 w-10 items-center justify-center rounded-xl border border-[#30352D] bg-[#171916]"
              accessibilityRole="button"
              accessibilityLabel="Clear cart"
            >
              <Feather name="trash-2" size={16} color="#F59E6B" />
            </Pressable>
          </>
        )}
      </View>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-5 h-[88px] w-[88px] items-center justify-center rounded-[30px] border border-[#35432A] bg-[#171E12]">
            <Ionicons name="basket-outline" size={39} color="#C8FF67" />
          </View>
          <Text className="text-center text-[22px] font-extrabold text-[#F6F7F4]">
            Nothing here. Yet.
          </Text>
          <Text className="mt-2 max-w-[280px] text-center text-[13px] leading-[21px] text-[#A2A79E]">
            Your next fresh find is waiting. Browse local harvests and add
            something good.
          </Text>
          <Pressable
            onPress={() => router.replace("/(tabs)/market" as any)}
            className="mt-6 min-h-[50px] w-full flex-row items-center justify-center gap-2 rounded-2xl bg-[#C8FF67] px-5"
          >
            <Text className="text-[13px] font-extrabold text-[#0C0D0B]">
              Explore the marketplace
            </Text>
            <Feather name="arrow-up-right" size={17} color="#0C0D0B" />
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 28 }}
          >
            <View className="px-4 pt-5">
              {/* Cart items */}
              <View className="mb-3 flex-row items-end justify-between">
                <View>
                  <Text className="text-[17px] font-extrabold text-[#F6F7F4]">
                    Items in your bag
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#8D9489]">
                    Review your picks before checkout
                  </Text>
                </View>
                <Text className="text-[11px] font-semibold text-[#A2A79E]">
                  {items.length} {items.length === 1 ? "product" : "products"}
                </Text>
              </View>

              {items.map(({ listing, quantity }: CartLine) => {
                const bounds = quantityBounds(listing);
                const selectedFulfillment = getFulfillment(listing);
                const itemSubtotal = Number(listing.price || 0) * quantity;
                const itemSavings =
                  Math.max(
                    0,
                    Number(listing.originalPrice || listing.price || 0) -
                      Number(listing.price || 0),
                  ) * quantity;
                const overStock =
                  quantity > bounds.max || bounds.max < bounds.min;

                return (
                  <View
                    key={listing.id}
                    className="mb-3 rounded-[19px] border border-[#30352D] bg-[#171916] p-3.5"
                  >
                    <View className="flex-row gap-3">
                      <View className="h-[94px] w-[91px] shrink-0 overflow-hidden rounded-[14px] bg-[#202A19]">
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
                              size={31}
                              color="#C8FF67"
                            />
                            <Text className="mt-1 text-[9px] text-[#A2A79E]">
                              Fresh produce
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="min-w-0 flex-1 py-0.5">
                        <View className="flex-row items-start gap-2">
                          <View className="min-w-0 flex-1">
                            <Text
                              className="text-[14px] font-extrabold leading-5 text-[#F6F7F4]"
                              numberOfLines={2}
                            >
                              {listing.cropName}
                            </Text>
                            <Text
                              className="mt-1 text-[11px] text-[#A2A79E]"
                              numberOfLines={1}
                            >
                              {listing.packSizeValue} {listing.packSizeUnit} ·{" "}
                              {listing.seller?.username ?? "Local grower"}
                            </Text>
                          </View>
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
                            className="h-7 w-7 items-center justify-center rounded-lg bg-[#242720]"
                          >
                            <Feather name="x" size={15} color="#A2A79E" />
                          </Pressable>
                        </View>

                        <View className="mt-auto flex-row items-end justify-between gap-2 pt-3">
                          <View className="min-w-0 flex-1">
                            <Text className="text-[16px] font-extrabold text-[#F6F7F4]">
                              {money(itemSubtotal)}
                            </Text>
                            <Text className="mt-0.5 text-[10px] text-[#8D9489]">
                              {money(Number(listing.price || 0))} each
                            </Text>
                          </View>

                          <View className="h-9 flex-row items-center rounded-xl border border-[#46513A] bg-[#10130E]">
                            <Pressable
                              onPress={() => {
                                if (quantity > bounds.min) {
                                  setCartQuantity(listing.id, quantity - 1);
                                }
                              }}
                              disabled={quantity <= bounds.min}
                              className="h-8 w-8 items-center justify-center"
                              accessibilityRole="button"
                              accessibilityLabel={`Decrease ${listing.cropName} quantity`}
                            >
                              <Feather
                                name="minus"
                                size={13}
                                color={
                                  quantity <= bounds.min ? "#555B53" : "#F6F7F4"
                                }
                              />
                            </Pressable>
                            <Text className="min-w-[22px] text-center text-[12px] font-extrabold text-[#F6F7F4]">
                              {quantity}
                            </Text>
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
                                bounds.max < bounds.min ||
                                quantity >= bounds.max
                              }
                              className="h-8 w-8 items-center justify-center"
                              accessibilityRole="button"
                              accessibilityLabel={`Increase ${listing.cropName} quantity`}
                            >
                              <Feather
                                name="plus"
                                size={13}
                                color={
                                  bounds.max < bounds.min ||
                                  quantity >= bounds.max
                                    ? "#555B53"
                                    : "#C8FF67"
                                }
                              />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>

                    {itemSavings > 0 && (
                      <View className="mt-3 flex-row items-center gap-1.5">
                        <Feather name="tag" size={12} color="#C8FF67" />
                        <Text className="text-[10px] font-semibold text-[#C8FF67]">
                          You save {money(itemSavings)} on this item
                        </Text>
                      </View>
                    )}

                    {/* Fulfillment method is chosen per seller/listing. */}
                    <View className="mt-3 border-t border-[#30352D] pt-3">
                      {listing.sellerDelivery && listing.customerPickup ? (
                        <>
                          <Text className="mb-2 text-[10px] font-bold uppercase tracking-[0.8px] text-[#8D9489]">
                            Fulfilment option
                          </Text>
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={() =>
                                chooseFulfillment(listing.id, "SELLER_DELIVERY")
                              }
                              className={`min-h-[42px] flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-2 ${selectedFulfillment === "SELLER_DELIVERY" ? "border-[#718F38] bg-[#202A19]" : "border-[#30352D] bg-[#10110F]"}`}
                            >
                              <Feather
                                name="truck"
                                size={13}
                                color={
                                  selectedFulfillment === "SELLER_DELIVERY"
                                    ? "#C8FF67"
                                    : "#A2A79E"
                                }
                              />
                              <View className="shrink">
                                <Text
                                  className={`text-[11px] font-bold ${selectedFulfillment === "SELLER_DELIVERY" ? "text-[#F6F7F4]" : "text-[#A2A79E]"}`}
                                >
                                  Delivery
                                </Text>
                                <Text className="mt-0.5 text-[9px] text-[#8D9489]">
                                  {Number(listing.deliveryFee || 0) > 0
                                    ? `+${money(Number(listing.deliveryFee || 0))}`
                                    : "No fee"}
                                </Text>
                              </View>
                            </Pressable>

                            <Pressable
                              onPress={() =>
                                chooseFulfillment(listing.id, "CUSTOMER_PICKUP")
                              }
                              className={`min-h-[42px] flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border px-2 ${selectedFulfillment === "CUSTOMER_PICKUP" ? "border-[#718F38] bg-[#202A19]" : "border-[#30352D] bg-[#10110F]"}`}
                            >
                              <Feather
                                name="map-pin"
                                size={13}
                                color={
                                  selectedFulfillment === "CUSTOMER_PICKUP"
                                    ? "#C8FF67"
                                    : "#A2A79E"
                                }
                              />
                              <View className="shrink">
                                <Text
                                  className={`text-[11px] font-bold ${selectedFulfillment === "CUSTOMER_PICKUP" ? "text-[#F6F7F4]" : "text-[#A2A79E]"}`}
                                >
                                  Pickup
                                </Text>
                                <Text className="mt-0.5 text-[9px] text-[#8D9489]">
                                  Free
                                </Text>
                              </View>
                            </Pressable>
                          </View>
                        </>
                      ) : (
                        <View className="flex-row items-center gap-2">
                          <Feather
                            name={listing.sellerDelivery ? "truck" : "map-pin"}
                            size={14}
                            color="#C8FF67"
                          />
                          <Text className="text-[11px] font-semibold text-[#DDE2D6]">
                            {listing.sellerDelivery
                              ? `Seller delivery · ${Number(listing.deliveryFee || 0) > 0 ? money(Number(listing.deliveryFee || 0)) : "Free"}`
                              : listing.customerPickup
                                ? "Customer pickup · Free"
                                : "No fulfilment option available"}
                          </Text>
                        </View>
                      )}
                    </View>

                    {overStock && (
                      <View className="mt-3 flex-row items-start gap-2 rounded-xl border border-[#6B4930] bg-[#2A2017] px-3 py-2.5">
                        <Feather
                          name="alert-triangle"
                          size={14}
                          color="#F5B66B"
                        />
                        <Text className="min-w-0 flex-1 text-[10px] leading-4 text-[#F5D5AE]">
                          {bounds.max < bounds.min
                            ? "This listing is currently below its minimum order quantity. Remove it and choose another listing."
                            : `Only ${bounds.max} pack${bounds.max === 1 ? " is" : "s are"} available for this listing. Update the quantity before checkout.`}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}

              <Pressable
                onPress={() => router.replace("/(tabs)/market" as any)}
                className="mb-7 mt-1 flex-row items-center justify-center gap-2 rounded-xl border border-[#30352D] bg-[#141612] py-3.5"
              >
                <Feather name="plus" size={14} color="#C8FF67" />
                <Text className="text-[11px] font-bold text-[#DDE2D6]">
                  Add more products
                </Text>
              </Pressable>

              {/* Delivery address API */}
              <View className="mb-3 flex-row items-center justify-between">
                <View className="min-w-0 flex-1">
                  <Text className="text-[17px] font-extrabold text-[#F6F7F4]">
                    Delivery address
                  </Text>
                  <Text className="mt-1 text-[11px] text-[#8D9489]">
                    Where should your order go?
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/market/location" as any)}
                  className="rounded-lg px-2 py-1.5"
                >
                  <Text className="text-[12px] font-bold text-[#C8FF67]">
                    Manage
                  </Text>
                </Pressable>
              </View>

              {loadingLocations ? (
                <View className="items-center rounded-2xl border border-[#30352D] bg-[#171916] py-6">
                  <ActivityIndicator color="#C8FF67" />
                  <Text className="mt-2 text-[11px] text-[#A2A79E]">
                    Loading saved addresses…
                  </Text>
                </View>
              ) : locationError ? (
                <View className="rounded-2xl border border-[#6B4930] bg-[#221C15] p-4">
                  <View className="flex-row items-start gap-2">
                    <Feather name="alert-circle" size={16} color="#F5B66B" />
                    <Text className="min-w-0 flex-1 text-[11px] leading-4 text-[#E8CBA8]">
                      {locationError}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => void loadLocations()}
                    className="mt-3 self-start rounded-lg bg-[#383020] px-3 py-2"
                  >
                    <Text className="text-[11px] font-bold text-[#F5D5AE]">
                      Try again
                    </Text>
                  </Pressable>
                </View>
              ) : locations.length === 0 ? (
                <Pressable
                  onPress={() => router.push("/market/location" as any)}
                  className="flex-row items-center gap-3 rounded-[18px] border border-dashed border-[#536344] bg-[#171E12] p-4"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#26351D]">
                    <Feather name="map-pin" size={18} color="#C8FF67" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13px] font-bold text-[#F6F7F4]">
                      Add a delivery address
                    </Text>
                    <Text className="mt-1 text-[11px] text-[#A2A79E]">
                      Choose where your fresh produce should arrive.
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color="#A2A79E" />
                </Pressable>
              ) : (
                <View className="gap-2">
                  {locations.map((location) => {
                    const selected = locationId === location.id;
                    return (
                      <Pressable
                        key={location.id}
                        onPress={() => setLocationId(location.id)}
                        className={`flex-row items-center gap-3 rounded-[17px] border p-3.5 ${selected ? "border-[#718F38] bg-[#171E12]" : "border-[#30352D] bg-[#171916]"}`}
                      >
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-xl ${selected ? "bg-[#29391D]" : "bg-[#242720]"}`}
                        >
                          <Feather
                            name={location.isDefault ? "home" : "map-pin"}
                            size={17}
                            color={selected ? "#C8FF67" : "#A2A79E"}
                          />
                        </View>
                        <View className="min-w-0 flex-1">
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text
                              className="text-[13px] font-bold text-[#F6F7F4]"
                              numberOfLines={1}
                            >
                              {location.label}
                            </Text>
                            {location.isDefault && (
                              <View className="rounded-md bg-[#242720] px-1.5 py-0.5">
                                <Text className="text-[9px] font-bold text-[#C8FF67]">
                                  DEFAULT
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            className="mt-1 text-[11px] leading-[16px] text-[#A2A79E]"
                            numberOfLines={2}
                          >
                            {location.address}
                          </Text>
                        </View>
                        <View
                          className={`h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#C8FF67] bg-[#C8FF67]" : "border-[#596052] bg-transparent"}`}
                        >
                          {selected && (
                            <Feather name="check" size={12} color="#0C0D0B" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              {/* Payment method */}
              <View className="mb-3 mt-7">
                <Text className="text-[17px] font-extrabold text-[#F6F7F4]">
                  Payment method
                </Text>
                <Text className="mt-1 text-[11px] text-[#8D9489]">
                  Choose how you’d like to pay
                </Text>
              </View>

              <View className="gap-2">
                <Pressable
                  onPress={() => setPaymentMethod("COD")}
                  className={`flex-row items-center gap-3 rounded-[17px] border p-3.5 ${paymentMethod === "COD" ? "border-[#718F38] bg-[#171E12]" : "border-[#30352D] bg-[#171916]"}`}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-xl ${paymentMethod === "COD" ? "bg-[#29391D]" : "bg-[#242720]"}`}
                  >
                    <Feather
                      name="truck"
                      size={18}
                      color={paymentMethod === "COD" ? "#C8FF67" : "#A2A79E"}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13px] font-bold text-[#F6F7F4]">
                      Cash on delivery
                    </Text>
                    <Text className="mt-1 text-[11px] leading-4 text-[#A2A79E]">
                      Pay when your order arrives
                    </Text>
                  </View>
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border ${paymentMethod === "COD" ? "border-[#C8FF67] bg-[#C8FF67]" : "border-[#596052]"}`}
                  >
                    {paymentMethod === "COD" && (
                      <Feather name="check" size={12} color="#0C0D0B" />
                    )}
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setPaymentMethod("ONLINE")}
                  className={`flex-row items-center gap-3 rounded-[17px] border p-3.5 ${paymentMethod === "ONLINE" ? "border-[#718F38] bg-[#171E12]" : "border-[#30352D] bg-[#171916]"}`}
                >
                  <View
                    className={`h-10 w-10 items-center justify-center rounded-xl ${paymentMethod === "ONLINE" ? "bg-[#29391D]" : "bg-[#242720]"}`}
                  >
                    <Feather
                      name="credit-card"
                      size={18}
                      color={paymentMethod === "ONLINE" ? "#C8FF67" : "#A2A79E"}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[13px] font-bold text-[#F6F7F4]">
                      Pay online
                    </Text>
                    <Text className="mt-1 text-[11px] leading-4 text-[#A2A79E]">
                      Secure Razorpay checkout
                    </Text>
                    {items.length > 1 && (
                      <Text className="mt-1 text-[10px] leading-4 text-[#8D9489]">
                        Each grower order is paid separately.
                      </Text>
                    )}
                  </View>
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border ${paymentMethod === "ONLINE" ? "border-[#C8FF67] bg-[#C8FF67]" : "border-[#596052]"}`}
                  >
                    {paymentMethod === "ONLINE" && (
                      <Feather name="check" size={12} color="#0C0D0B" />
                    )}
                  </View>
                </Pressable>
              </View>

              {/* Bill summary */}
              <View className="mt-7 rounded-[20px] border border-[#30352D] bg-[#171916] p-4">
                <View className="mb-4 flex-row items-center gap-2">
                  <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#242720]">
                    <Feather name="file-text" size={15} color="#C8FF67" />
                  </View>
                  <Text className="text-[15px] font-extrabold text-[#F6F7F4]">
                    Bill summary
                  </Text>
                </View>

                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[12px] text-[#A2A79E]">
                    Item subtotal
                  </Text>
                  <Text className="text-[12px] font-semibold text-[#E8EAE5]">
                    {money(subtotal)}
                  </Text>
                </View>

                {savings > 0 && (
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text className="text-[12px] text-[#A2A79E]">
                      Product savings
                    </Text>
                    <Text className="text-[12px] font-semibold text-[#C8FF67]">
                      −{money(savings)}
                    </Text>
                  </View>
                )}

                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-[12px] text-[#A2A79E]">
                    Delivery fees
                  </Text>
                  <Text
                    className={`text-[12px] font-semibold ${delivery ? "text-[#E8EAE5]" : "text-[#C8FF67]"}`}
                  >
                    {delivery ? money(delivery) : "FREE"}
                  </Text>
                </View>

                <View className="my-1 border-t border-dashed border-[#3A4035]" />

                <View className="mt-3 flex-row items-end justify-between">
                  <View>
                    <Text className="text-[13px] font-bold text-[#F6F7F4]">
                      Estimated total
                    </Text>
                    <Text className="mt-1 text-[10px] text-[#8D9489]">
                      {totalUnits} units · {items.length} seller{" "}
                      {items.length === 1 ? "order" : "orders"}
                    </Text>
                  </View>
                  <Text className="text-[23px] font-extrabold leading-7 text-[#C8FF67]">
                    {money(total)}
                  </Text>
                </View>
              </View>

              <View className="mb-3 mt-4 flex-row items-start gap-2 rounded-xl bg-[#141612] px-3 py-3">
                <Feather name="shield" size={15} color="#A2A79E" />
                <Text className="min-w-0 flex-1 text-[10px] leading-[16px] text-[#8D9489]">
                  Products from different growers are placed as separate orders.
                  Final delivery fees and availability are confirmed by the
                  server during checkout.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky checkout bar */}
          <View
            className="flex-row items-center gap-3 border-t border-[#30352D] bg-[#10110F] px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <View className="min-w-0 flex-1">
              <Text className="text-[10px] font-bold tracking-[1px] text-[#8D9489]">
                TOTAL
              </Text>
              <Text className="mt-0.5 text-[21px] font-extrabold leading-7 text-[#F6F7F4]">
                {money(total)}
              </Text>
              <Text className="mt-0.5 text-[10px] text-[#8D9489]">
                {paymentMethod === "ONLINE"
                  ? "Secure online payment"
                  : "Cash on delivery"}
              </Text>
            </View>

            <Pressable
              onPress={() => void checkout()}
              disabled={busy || loadingLocations}
              className={`min-h-[52px] min-w-[165px] flex-row items-center justify-center gap-2 rounded-2xl px-4 ${busy || loadingLocations ? "bg-[#68705C]" : "bg-[#C8FF67]"}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              accessibilityRole="button"
              accessibilityLabel={
                paymentMethod === "ONLINE"
                  ? "Pay and place order"
                  : "Place order"
              }
            >
              {busy ? (
                <ActivityIndicator color="#0C0D0B" />
              ) : (
                <>
                  <Text className="text-[13px] font-extrabold text-[#0C0D0B]">
                    {paymentMethod === "ONLINE" ? "Pay & order" : "Place order"}
                  </Text>
                  <Feather name="arrow-right" size={16} color="#0C0D0B" />
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}
