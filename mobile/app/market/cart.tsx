import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useRouter } from "expo-router";
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

const money = (value: number) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

export default function MarketplaceCartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useCartItems();
  const { user } = useAuth();

  const [locations, setLocations] = useState<MarketplaceLocation[]>([]);
  const [locationId, setLocationId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [busy, setBusy] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const loadLocations = useCallback(async () => {
    try {
      const data = await apiRequest("/user/marketplace/locations");
      const rows = (data?.locations ?? []).map((row: any) => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      })) as MarketplaceLocation[];

      setLocations(rows);
      setLocationId(
        (current) =>
          current || rows.find((row) => row.isDefault)?.id || rows[0]?.id || "",
      );
    } catch (error) {
      Alert.alert(
        "Delivery location",
        error instanceof Error
          ? error.message
          : "Unable to load your saved locations.",
      );
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

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
      items.reduce(
        (sum, item) =>
          sum +
          (item.listing.sellerDelivery
            ? Number(item.listing.deliveryFee || 0)
            : 0),
        0,
      ),
    [items],
  );

  const total = subtotal + delivery;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const checkout = async () => {
    if (!items.length || busy) return;

    if (!locationId) {
      Alert.alert(
        "Add a delivery location",
        "Choose a saved location before checking out.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Choose location",
            onPress: () => router.push("/market/location" as any),
          },
        ],
      );
      return;
    }

    setBusy(true);

    try {
      // The API creates one order per listing, so submit cart items sequentially.
      for (const item of items) {
        const fulfillmentType = item.listing.sellerDelivery
          ? "SELLER_DELIVERY"
          : "CUSTOMER_PICKUP";

        const created = await apiRequest("/user/marketplace/orders", {
          method: "POST",
          body: JSON.stringify({
            listingId: item.listing.id,
            quantity: item.quantity,
            buyerLocationId: locationId,
            fulfillmentType,
            paymentMethod,
          }),
        });

        const order = created?.order;
        if (!order?.id) {
          throw new Error(
            `The order for ${item.listing.cropName} was not created.`,
          );
        }

        if (paymentMethod === "ONLINE" && order.status === "PENDING_PAYMENT") {
          const payData = await apiRequest(
            `/user/marketplace/orders/${order.id}/payment/create`,
            { method: "POST" },
          );

          const razorpay = payData?.razorpay;
          if (!razorpay?.orderId || !razorpay?.keyId) {
            throw new Error("The payment session was not created.");
          }

          const result = await RazorpayCheckout.open({
            key: razorpay.keyId,
            amount: razorpay.amount,
            currency: razorpay.currency || "INR",
            order_id: razorpay.orderId,
            name: "Agri Marketplace",
            description: `${item.listing.cropName} • ${item.listing.packSizeValue} ${item.listing.packSizeUnit}`,
            theme: { color: C.green },
            prefill: {
              name: user?.username ?? "",
              email: user?.email ?? "",
            },
          });

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
        }
      }

      clearCart();
      Alert.alert(
        "Order placed",
        paymentMethod === "ONLINE"
          ? "Payment verified and your order is placed."
          : "Your cash-on-delivery order has been placed.",
        [
          {
            text: "Continue shopping",
            onPress: () => router.replace("/(tabs)/market" as any),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "Checkout failed",
        error instanceof Error
          ? error.message
          : "Unable to complete checkout. Your cart is still saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const selectedLocation = locations.find(
    (location) => location.id === locationId,
  );

  return (
    <View className="flex-1 bg-[#0C0D0B]">
      <StatusBar barStyle="light-content" backgroundColor="#0C0D0B" />

      {/* Header */}
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
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <View className="px-4 pt-5">
              {/* Items */}
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

              {items.map(({ listing, quantity }) => {
                const lineTotal = Number(listing.price || 0) * quantity;
                const discount = Math.max(
                  0,
                  Math.round(Number(listing.discountPercent || 0)),
                );

                return (
                  <View
                    key={listing.id}
                    className="mb-3 flex-row gap-3 rounded-[20px] border border-[#30352D] bg-[#171916] p-3"
                  >
                    <View className="h-[100px] w-[91px] shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-[#20221E]">
                      {listing.imageUrl ? (
                        <Image
                          source={{ uri: listing.imageUrl }}
                          resizeMode="cover"
                          className="h-full w-full"
                        />
                      ) : (
                        <View className="flex-1 items-center justify-center bg-[#202A19]">
                          <Ionicons
                            name="leaf-outline"
                            size={30}
                            color="#C8FF67"
                          />
                          <Text className="mt-1 text-[9px] font-medium text-[#A2A79E]">
                            Fresh produce
                          </Text>
                        </View>
                      )}
                      {discount > 0 && (
                        <View className="absolute left-1.5 top-1.5 rounded-md bg-[#F4C66A] px-1.5 py-1">
                          <Text className="text-[9px] font-extrabold text-[#241B0A]">
                            {discount}% OFF
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="min-w-0 flex-1 justify-between py-0.5">
                      <View>
                        <Text
                          className="text-[14px] font-extrabold leading-[19px] text-[#F6F7F4]"
                          numberOfLines={1}
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
                        <View className="mt-2 flex-row items-center gap-1.5">
                          <View className="h-1.5 w-1.5 rounded-full bg-[#C8FF67]" />
                          <Text className="text-[10px] font-medium text-[#B2B8AC]">
                            {listing.sellerDelivery
                              ? "Delivery available"
                              : "Customer pickup"}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-2 flex-row items-end justify-between gap-2">
                        <View className="min-w-0 flex-1">
                          <Text className="text-[16px] font-extrabold text-[#F6F7F4]">
                            {money(lineTotal)}
                          </Text>
                          <Text className="mt-0.5 text-[10px] text-[#858D80]">
                            {money(Number(listing.price))} each
                          </Text>
                        </View>

                        <View className="h-[34px] flex-row items-center rounded-xl border border-[#3B4930] bg-[#10140D]">
                          <Pressable
                            onPress={() =>
                              quantity <= 1
                                ? removeCartItem(listing.id)
                                : setCartQuantity(listing.id, quantity - 1)
                            }
                            className="h-8 w-8 items-center justify-center"
                            accessibilityRole="button"
                            accessibilityLabel={
                              quantity <= 1
                                ? `Remove ${listing.cropName}`
                                : `Decrease ${listing.cropName} quantity`
                            }
                          >
                            <Feather
                              name={quantity <= 1 ? "trash-2" : "minus"}
                              size={13}
                              color={quantity <= 1 ? "#F59E6B" : "#F6F7F4"}
                            />
                          </Pressable>
                          <Text className="min-w-[22px] text-center text-[12px] font-extrabold text-[#F6F7F4]">
                            {quantity}
                          </Text>
                          <Pressable
                            onPress={() =>
                              setCartQuantity(listing.id, quantity + 1)
                            }
                            className="h-8 w-8 items-center justify-center"
                            accessibilityRole="button"
                            accessibilityLabel={`Increase ${listing.cropName} quantity`}
                          >
                            <Feather name="plus" size={14} color="#C8FF67" />
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => removeCartItem(listing.id)}
                      className="h-7 w-7 items-center justify-center rounded-full bg-[#242720]"
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${listing.cropName} from cart`}
                    >
                      <Feather name="x" size={14} color="#A2A79E" />
                    </Pressable>
                  </View>
                );
              })}

              <Pressable
                onPress={() => router.replace("/(tabs)/market" as any)}
                className="mb-7 mt-1 flex-row items-center justify-center gap-2 self-start rounded-full border border-[#30352D] px-3.5 py-2.5"
              >
                <Feather name="plus" size={14} color="#C8FF67" />
                <Text className="text-[11px] font-bold text-[#DDE2D6]">
                  Add more products
                </Text>
              </Pressable>

              {/* Delivery address */}
              <View className="mb-3 flex-row items-center justify-between">
                <View>
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
                        className={`flex-row items-center gap-3 rounded-[17px] border p-3.5 ${
                          selected
                            ? "border-[#718F38] bg-[#171E12]"
                            : "border-[#30352D] bg-[#171916]"
                        }`}
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

              {/* Payment choice */}
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
                  className={`flex-row items-center gap-3 rounded-[17px] border p-3.5 ${
                    paymentMethod === "COD"
                      ? "border-[#718F38] bg-[#171E12]"
                      : "border-[#30352D] bg-[#171916]"
                  }`}
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
                  className={`flex-row items-center gap-3 rounded-[17px] border p-3.5 ${
                    paymentMethod === "ONLINE"
                      ? "border-[#718F38] bg-[#171E12]"
                      : "border-[#30352D] bg-[#171916]"
                  }`}
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
                      Secure payment via Razorpay
                    </Text>
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

              {/* Bill details */}
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

                <View className="mb-3 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[12px] text-[#A2A79E]">
                      Delivery fees
                    </Text>
                    <Feather name="info" size={12} color="#727A6E" />
                  </View>
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
                      Total to pay
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
                <Feather name="check-circle" size={15} color="#A2A79E" />
                <Text className="min-w-0 flex-1 text-[10px] leading-[16px] text-[#8D9489]">
                  Products from different growers are placed as separate orders.
                  Delivery charges may apply per grower.
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
              disabled={busy || !items.length || loadingLocations}
              className={`min-h-[52px] min-w-[175px] flex-row items-center justify-center gap-2 rounded-2xl px-4 ${busy || !items.length || loadingLocations ? "bg-[#68705C]" : "bg-[#C8FF67]"}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
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
