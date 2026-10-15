import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";
import { useAuth } from "../../lib/auth-context";
import { apiRequest } from "../../lib/api";
import { clearCart, removeCartItem, setCartQuantity, useCartItems, type MarketplaceLocation } from "../../lib/marketplace-store";
import { MARKETPLACE_COLORS as C } from "../../theme/marketplace-colors";

const money = (value: number) => `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

// UI sections: cart items, saved delivery address, payment choice, and checkout summary.
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
      const rows = (data?.locations ?? []).map((row: any) => ({ ...row, latitude: Number(row.latitude), longitude: Number(row.longitude) })) as MarketplaceLocation[];
      setLocations(rows);
      setLocationId((current) => current || rows.find((row) => row.isDefault)?.id || rows[0]?.id || "");
    } catch (e) {
      Alert.alert("Delivery location", e instanceof Error ? e.message : "Unable to load your saved locations.");
    } finally { setLoadingLocations(false); }
  }, []);
  useEffect(() => { void loadLocations(); }, [loadLocations]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.listing.price || 0) * item.quantity, 0), [items]);
  const delivery = useMemo(() => items.reduce((sum, item) => sum + (item.listing.sellerDelivery ? Number(item.listing.deliveryFee || 0) : 0), 0), [items]);
  const total = subtotal + delivery;

  const checkout = async () => {
    if (!items.length) return;
    if (!locationId) {
      Alert.alert("Add a delivery location", "Choose a saved location before checking out.", [
        { text: "Cancel", style: "cancel" },
        { text: "Choose location", onPress: () => router.push("/market/location" as any) },
      ]);
      return;
    }
    setBusy(true);
    try {
      // The current marketplace API creates one order per listing, so cart items are submitted sequentially.
      for (const item of items) {
        const fulfillmentType = item.listing.sellerDelivery ? "SELLER_DELIVERY" : "CUSTOMER_PICKUP";
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
        if (!order?.id) throw new Error(`The order for ${item.listing.cropName} was not created.`);

        if (paymentMethod === "ONLINE" && order.status === "PENDING_PAYMENT") {
          const payData = await apiRequest(`/user/marketplace/orders/${order.id}/payment/create`, { method: "POST" });
          const razorpay = payData?.razorpay;
          if (!razorpay?.orderId || !razorpay?.keyId) throw new Error("The payment session was not created.");
          const result = await RazorpayCheckout.open({
            key: razorpay.keyId,
            amount: razorpay.amount,
            currency: razorpay.currency || "INR",
            order_id: razorpay.orderId,
            name: "Agri Marketplace",
            description: `${item.listing.cropName} • ${item.listing.packSizeValue} ${item.listing.packSizeUnit}`,
            theme: { color: C.green },
            prefill: { name: user?.username ?? "", email: user?.email ?? "" },
          });
          await apiRequest(`/user/marketplace/orders/${order.id}/payment/verify`, {
            method: "POST",
            body: JSON.stringify({
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
              razorpay_signature: result.razorpay_signature,
            }),
          });
        }
      }
      clearCart();
      Alert.alert("Order placed", paymentMethod === "ONLINE" ? "Payment verified and your order is placed." : "Your cash-on-delivery order has been placed.", [
        { text: "Continue shopping", onPress: () => router.replace("/(tabs)/market" as any) },
      ]);
    } catch (e) {
      Alert.alert("Checkout failed", e instanceof Error ? e.message : "Unable to complete checkout. Your remaining cart items are still saved.");
    } finally { setBusy(false); }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color={C.ink} /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.kicker}>MARKETPLACE</Text><Text style={styles.title}>Your cart</Text></View>
        {items.length > 0 && <Pressable onPress={() => Alert.alert("Clear cart?", "Remove every product from your cart?", [{ text: "Keep", style: "cancel" }, { text: "Clear cart", style: "destructive", onPress: clearCart }])} style={styles.clear}><Feather name="trash-2" size={17} color={C.red} /></Pressable>}
      </View>
      {items.length === 0 ? (
        <View style={styles.emptyWrap}><View style={styles.emptyIcon}><Ionicons name="bag-handle-outline" size={31} color={C.green} /></View><Text style={styles.emptyTitle}>Your cart is empty</Text><Text style={styles.emptyText}>Explore the map and add fresh harvests from local growers.</Text><Pressable style={styles.primaryButton} onPress={() => router.replace("/(tabs)/market" as any)}><Text style={styles.primaryText}>Explore marketplace</Text><Feather name="arrow-up-right" size={17} color={C.bg} /></Pressable></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Your products <Text style={styles.itemCount}>({items.length})</Text></Text>
            {items.map(({ listing, quantity }) => (
              <View key={listing.id} style={styles.itemCard}>
                <View style={styles.thumb}>{listing.imageUrl ? <Image source={{ uri: listing.imageUrl }} style={styles.thumbImage} /> : <Ionicons name="leaf-outline" size={26} color={C.green} />}</View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemName} numberOfLines={1}>{listing.cropName}</Text>
                  <Text style={styles.itemMeta}>{listing.packSizeValue} {listing.packSizeUnit} · {listing.seller?.username ?? "Local grower"}</Text>
                  <View style={styles.itemBottom}><Text style={styles.itemPrice}>{money(Number(listing.price) * quantity)}</Text><View style={styles.stepper}><Pressable onPress={() => quantity <= 1 ? removeCartItem(listing.id) : setCartQuantity(listing.id, quantity - 1)} style={styles.stepButton}><Feather name="minus" size={14} color={C.ink} /></Pressable><Text style={styles.quantity}>{quantity}</Text><Pressable onPress={() => setCartQuantity(listing.id, quantity + 1)} style={styles.stepButton}><Feather name="plus" size={14} color={C.ink} /></Pressable></View></View>
                </View>
                <Pressable onPress={() => removeCartItem(listing.id)} style={styles.remove}><Feather name="x" size={16} color={C.muted} /></Pressable>
              </View>
            ))}

            <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Deliver to</Text><Pressable onPress={() => router.push("/market/location" as any)}><Text style={styles.changeText}>Change</Text></Pressable></View>
            {loadingLocations ? <ActivityIndicator color={C.green} /> : locations.length === 0 ? (
              <Pressable style={styles.locationEmpty} onPress={() => router.push("/market/location" as any)}><Feather name="map-pin" size={18} color={C.green} /><Text style={styles.locationEmptyText}>Add delivery location</Text><Feather name="chevron-right" size={17} color={C.muted} /></Pressable>
            ) : (
              <View style={styles.locationChoices}>{locations.map((loc) => <Pressable key={loc.id} onPress={() => setLocationId(loc.id)} style={[styles.locationOption, locationId === loc.id && styles.locationOptionActive]}><Feather name={locationId === loc.id ? "check-circle" : "map-pin"} size={17} color={locationId === loc.id ? C.green : C.muted} /><View style={{ flex: 1 }}><Text style={styles.locationName}>{loc.label}</Text><Text style={styles.locationAddress} numberOfLines={1}>{loc.address}</Text></View></Pressable>)}</View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 21, marginBottom: 10 }]}>Payment method</Text>
            <View style={styles.paymentRow}><Pressable onPress={() => setPaymentMethod("COD")} style={[styles.paymentOption, paymentMethod === "COD" && styles.paymentActive]}><Feather name="truck" size={18} color={paymentMethod === "COD" ? C.green : C.muted} /><View style={{ flex: 1 }}><Text style={styles.paymentTitle}>Cash on delivery</Text><Text style={styles.paymentSub}>Pay when you receive your harvest</Text></View>{paymentMethod === "COD" && <Feather name="check-circle" size={17} color={C.green} />}</Pressable><Pressable onPress={() => setPaymentMethod("ONLINE")} style={[styles.paymentOption, paymentMethod === "ONLINE" && styles.paymentActive]}><Feather name="credit-card" size={18} color={paymentMethod === "ONLINE" ? C.green : C.muted} /><View style={{ flex: 1 }}><Text style={styles.paymentTitle}>Pay online</Text><Text style={styles.paymentSub}>Secure Razorpay checkout</Text></View>{paymentMethod === "ONLINE" && <Feather name="check-circle" size={17} color={C.green} />}</Pressable></View>

            <View style={styles.billCard}><View style={styles.billRow}><Text style={styles.billLabel}>Subtotal</Text><Text style={styles.billValue}>{money(subtotal)}</Text></View><View style={styles.billRow}><Text style={styles.billLabel}>Delivery fees</Text><Text style={styles.billValue}>{delivery ? money(delivery) : "FREE"}</Text></View><View style={styles.billDivider} /><View style={styles.billRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.totalValue}>{money(total)}</Text></View></View>
            <Text style={styles.footnote}>Each grower listing is submitted as a separate order, so delivery and order tracking remain tied to the correct seller.</Text>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}><View><Text style={styles.bottomLabel}>TOTAL</Text><Text style={styles.bottomTotal}>{money(total)}</Text></View><Pressable onPress={() => void checkout()} disabled={busy || !items.length} style={[styles.checkout, (busy || !items.length) && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={C.bg} /> : <><Text style={styles.checkoutText}>{paymentMethod === "ONLINE" ? "Pay & place order" : "Place order"}</Text><Feather name="arrow-right" size={17} color={C.bg} /></>}</Pressable></View>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 15 }, back: { height: 42, width: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }, kicker: { color: C.green, fontSize: 9, fontWeight: "900", letterSpacing: 1.8 }, title: { color: C.ink, fontSize: 24, fontWeight: "900", marginTop: 3 }, clear: { width: 40, height: 40, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 15, paddingBottom: 25 }, sectionTitle: { color: C.ink, fontSize: 15, fontWeight: "900", marginBottom: 10 }, itemCount: { color: C.muted, fontSize: 12 }, itemCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 10, marginBottom: 9 }, thumb: { width: 76, height: 78, borderRadius: 12, overflow: "hidden", backgroundColor: C.soft, alignItems: "center", justifyContent: "center" }, thumbImage: { width: "100%", height: "100%" }, itemBody: { flex: 1, minWidth: 0 }, itemName: { color: C.ink, fontSize: 13, fontWeight: "900" }, itemMeta: { color: C.muted, fontSize: 10, marginTop: 4 }, itemBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 6 }, itemPrice: { color: C.green, fontSize: 15, fontWeight: "900" }, stepper: { flexDirection: "row", alignItems: "center", backgroundColor: C.bg, borderWidth: 1, borderColor: C.line, borderRadius: 10 }, stepButton: { width: 28, height: 29, alignItems: "center", justifyContent: "center" }, quantity: { minWidth: 23, color: C.ink, textAlign: "center", fontSize: 11, fontWeight: "800" }, remove: { alignSelf: "flex-start", padding: 2 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18 }, changeText: { color: C.green, fontSize: 11, fontWeight: "800" }, locationChoices: { gap: 8 }, locationOption: { flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12 }, locationOptionActive: { borderColor: C.green, backgroundColor: "#151D10" }, locationName: { color: C.ink, fontSize: 11.5, fontWeight: "800" }, locationAddress: { color: C.muted, fontSize: 9.5, marginTop: 3 }, locationEmpty: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, locationEmptyText: { flex: 1, color: C.ink, fontSize: 12, fontWeight: "800" },
  paymentRow: { gap: 8 }, paymentOption: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, backgroundColor: C.card }, paymentActive: { borderColor: C.green, backgroundColor: "#151D10" }, paymentTitle: { color: C.ink, fontSize: 11.5, fontWeight: "800" }, paymentSub: { color: C.muted, fontSize: 9.5, marginTop: 3 }, billCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 15, marginTop: 18, gap: 11 }, billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, billLabel: { color: C.muted, fontSize: 11 }, billValue: { color: C.ink, fontSize: 11, fontWeight: "800" }, billDivider: { height: 1, backgroundColor: C.line }, totalLabel: { color: C.ink, fontSize: 13, fontWeight: "900" }, totalValue: { color: C.green, fontSize: 19, fontWeight: "900" }, footnote: { color: C.muted, fontSize: 9.5, lineHeight: 15, marginTop: 12, marginBottom: 14 },
  bottomBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 16, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }, bottomLabel: { color: C.muted, fontSize: 8, fontWeight: "900", letterSpacing: 1.1 }, bottomTotal: { color: C.ink, fontSize: 19, fontWeight: "900", marginTop: 2 }, checkout: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 11, backgroundColor: C.green, borderRadius: 14, paddingHorizontal: 18, flex: 1, maxWidth: 215 }, checkoutText: { color: C.bg, fontSize: 12, fontWeight: "900" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 }, emptyIcon: { width: 70, height: 70, borderRadius: 22, backgroundColor: C.soft, borderWidth: 1, borderColor: "#41532D", alignItems: "center", justifyContent: "center", marginBottom: 19 }, emptyTitle: { color: C.ink, fontSize: 20, fontWeight: "900" }, emptyText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 8, marginBottom: 23 }, primaryButton: { width: "100%", minHeight: 48, borderRadius: 14, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 }, primaryText: { color: C.bg, fontSize: 12, fontWeight: "900" },
});
