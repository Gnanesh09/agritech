import React, { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, Alert, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { addToCart, useSelectedListing } from "../../../lib/marketplace-store";
import { MARKETPLACE_COLORS as C } from "../../../theme/marketplace-colors";

const money = (value: number) => `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;

// UI sections: product hero, seller summary, harvest details, quantity stepper, and sticky add-to-cart bar.
export default function MarketplaceProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const listing = useSelectedListing();
  const product = listing?.id === routeId ? listing : null;
  const [quantity, setQuantity] = useState(Math.max(1, Number(product?.minOrderQuantity ?? 1)));
  const total = useMemo(() => Number(product?.price ?? 0) * quantity, [product?.price, quantity]);

  if (!product) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <Pressable onPress={() => router.back()} style={styles.backFallback}><Feather name="arrow-left" size={20} color={C.ink} /></Pressable>
        <View style={styles.missing}><Ionicons name="leaf-outline" size={31} color={C.green} /><Text style={styles.missingTitle}>Product unavailable</Text><Text style={styles.missingText}>Go back to Maps or List and open the product again.</Text><Pressable onPress={() => router.replace("/(tabs)/market" as any)} style={styles.primary}><Text style={styles.primaryText}>Back to marketplace</Text></Pressable></View>
      </View>
    );
  }

  const maxQuantity = Math.max(Number(product.minOrderQuantity ?? 1), Math.min(Number(product.maxOrderQuantity ?? product.quantityAvailable ?? 9999), Number(product.quantityAvailable ?? 9999)));
  const add = () => {
    addToCart(product, quantity);
    Alert.alert("Added to cart", `${product.cropName} has been added to your cart.`, [
      { text: "Continue browsing", onPress: () => router.back() },
      { text: "View cart", onPress: () => router.push("/market/cart" as any) },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={{ paddingBottom: 118 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: Math.min(340, Math.max(245, height * 0.34)) }]}>
          {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" /> : <View style={styles.heroFallback}><Ionicons name="leaf-outline" size={64} color={C.green} /></View>}
          <View style={[styles.heroTop, { top: insets.top + 9 }]}>
            <Pressable onPress={() => router.back()} style={styles.heroIcon}><Feather name="arrow-left" size={20} color={C.ink} /></Pressable>
            <Pressable onPress={() => router.push("/market/cart" as any)} style={styles.heroIcon}><Feather name="shopping-bag" size={19} color={C.ink} /></Pressable>
          </View>
          {product.harvestType === "UPCOMING" && <View style={styles.harvestTag}><Text style={styles.harvestTagText}>UPCOMING HARVEST</Text></View>}
        </View>

        <View style={styles.productCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}><Text style={styles.productName}>{product.cropName}</Text><Text style={styles.packText}>Net quantity: {product.packSizeValue} {product.packSizeUnit}, pack of 1</Text></View>
            <View style={styles.priceChip}><Text style={styles.priceText}>{money(product.price)}</Text></View>
          </View>
          <View style={styles.sellerRow}><View style={styles.sellerAvatar}><Ionicons name="leaf" size={16} color={C.green} /></View><View style={{ flex: 1 }}><Text style={styles.sellerName}>{product.seller?.username ?? "Local grower"}</Text><Text style={styles.sellerSub}>Nearby independent grower</Text></View><Text style={styles.distance}>{product.distanceKm == null ? "Nearby" : `${Number(product.distanceKm).toFixed(1)} km`}</Text></View>
        </View>

        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Product details</Text>
          {!!product.description && <Text style={styles.description}>{product.description}</Text>}
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}><Feather name="package" size={16} color={C.green} /><Text style={styles.detailLabel}>Pack size</Text><Text style={styles.detailValue}>{product.packSizeValue} {product.packSizeUnit}</Text></View>
            <View style={styles.detailItem}><Feather name="layers" size={16} color={C.green} /><Text style={styles.detailLabel}>Availability</Text><Text style={styles.detailValue}>{product.quantityAvailable} packs</Text></View>
            <View style={styles.detailItem}><Feather name="truck" size={16} color={C.green} /><Text style={styles.detailLabel}>Delivery</Text><Text style={styles.detailValue}>{product.sellerDelivery ? "Available" : "Pickup"}</Text></View>
          </View>
          <View style={styles.harvestInfo}><View style={styles.harvestInfoIcon}><Ionicons name="leaf-outline" size={19} color={C.green} /></View><View style={{ flex: 1 }}><Text style={styles.harvestInfoTitle}>{product.harvestType === "UPCOMING" ? "Upcoming harvest" : "Freshly listed harvest"}</Text><Text style={styles.harvestInfoText}>{product.harvestType === "UPCOMING" && product.expectedHarvestDate ? `Expected ${new Date(product.expectedHarvestDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "Local produce from a nearby grower."}</Text></View></View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.quantityBox}>
          <Pressable onPress={() => setQuantity((v) => Math.max(Number(product.minOrderQuantity ?? 1), v - 1))} style={styles.quantityButton}><Feather name="minus" size={15} color={C.ink} /></Pressable>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <Pressable onPress={() => setQuantity((v) => Math.min(maxQuantity, v + 1))} style={styles.quantityButton}><Feather name="plus" size={15} color={C.ink} /></Pressable>
        </View>
        <Pressable style={styles.addButton} onPress={add}><Text style={styles.addButtonText}>Add to cart · {money(total)}</Text><Feather name="arrow-right" size={17} color={C.bg} /></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, hero: { width: "100%", backgroundColor: "#172012", position: "relative" }, heroImage: { width: "100%", height: "100%" }, heroFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#172012" },
  heroTop: { position: "absolute", left: 15, right: 15, flexDirection: "row", justifyContent: "space-between" }, heroIcon: { height: 41, width: 41, borderRadius: 14, backgroundColor: "rgba(9,12,7,0.78)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }, harvestTag: { position: "absolute", bottom: 60, left: 16, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.green }, harvestTagText: { color: C.bg, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  productCard: { marginHorizontal: 14, marginTop: -43, borderRadius: 18, backgroundColor: C.card, padding: 14, borderWidth: 1, borderColor: C.line, zIndex: 2 }, titleRow: { flexDirection: "row", alignItems: "center", gap: 10 }, productName: { color: C.ink, fontSize: 17, fontWeight: "900" }, packText: { color: C.muted, fontSize: 9.5, marginTop: 4 }, priceChip: { backgroundColor: "#246F1C", borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, priceText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line }, sellerAvatar: { width: 32, height: 32, borderRadius: 11, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" }, sellerName: { color: C.ink, fontSize: 10.5, fontWeight: "800" }, sellerSub: { color: C.muted, fontSize: 9, marginTop: 2 }, distance: { color: C.green, fontSize: 10, fontWeight: "800" },
  detailsSection: { paddingHorizontal: 17, paddingTop: 26 }, sectionTitle: { color: C.ink, fontSize: 14, fontWeight: "900", marginBottom: 12 }, description: { color: C.muted, fontSize: 11, lineHeight: 17, marginBottom: 15 }, detailGrid: { flexDirection: "row", gap: 8 }, detailItem: { flex: 1, borderRadius: 13, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, padding: 10, minHeight: 91, gap: 6 }, detailLabel: { color: C.muted, fontSize: 9 }, detailValue: { color: C.ink, fontSize: 10.5, fontWeight: "800" },
  harvestInfo: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 13, padding: 13, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }, harvestInfoIcon: { height: 35, width: 35, borderRadius: 11, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" }, harvestInfoTitle: { color: C.ink, fontSize: 10.5, fontWeight: "800" }, harvestInfoText: { color: C.muted, fontSize: 9.5, marginTop: 3 },
  bottomBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg }, quantityBox: { height: 47, flexDirection: "row", alignItems: "center", borderRadius: 13, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, quantityButton: { height: 45, width: 32, alignItems: "center", justifyContent: "center" }, quantityValue: { color: C.ink, minWidth: 19, textAlign: "center", fontSize: 12, fontWeight: "900" }, addButton: { flex: 1, minHeight: 48, borderRadius: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.green }, addButtonText: { color: C.bg, fontSize: 11.5, fontWeight: "900" },
  backFallback: { marginLeft: 16, width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, alignItems: "center", justifyContent: "center" }, missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 10 }, missingTitle: { color: C.ink, fontSize: 19, fontWeight: "900" }, missingText: { color: C.muted, fontSize: 12, textAlign: "center", lineHeight: 18 }, primary: { backgroundColor: C.green, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 13, marginTop: 7 }, primaryText: { color: C.bg, fontSize: 11, fontWeight: "900" },
});
