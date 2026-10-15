import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { apiRequest } from "../../lib/api";
import type { MarketplaceLocation } from "../../lib/marketplace-store";
import { MARKETPLACE_COLORS as C } from "../../theme/marketplace-colors";

type Crop = { id: string; cropName?: string; status: string; sowingDate?: string | null; expectedHarvestDate?: string | null; selling?: { canSellAsHarvested?: boolean; canSellAsUpcoming?: boolean; hasListing?: boolean } };
type Listing = { id: string; cropName: string; price: number; originalPrice?: number; packSizeValue: number; packSizeUnit: string; quantityAvailable: number; status: string; orderCount?: number; imageUrl?: string | null; sellerLocation?: { label?: string } };

// UI sections: grower inventory, crop selector, listing form, delivery settings, and publish action.
export default function MarketplaceSellScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [locations, setLocations] = useState<MarketplaceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [cropId, setCropId] = useState("");
  const [harvestType, setHarvestType] = useState<"HARVESTED" | "UPCOMING">("HARVESTED");
  const [packSizeValue, setPackSizeValue] = useState("250");
  const [packSizeUnit, setPackSizeUnit] = useState("G");
  const [basePrice, setBasePrice] = useState("58");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [quantityAvailable, setQuantityAvailable] = useState("10");
  const [minOrderQuantity, setMinOrderQuantity] = useState("1");
  const [description, setDescription] = useState("");
  const [sellerLocationId, setSellerLocationId] = useState("");
  const [sellerDelivery, setSellerDelivery] = useState(true);
  const [customerPickup, setCustomerPickup] = useState(true);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState("10");
  const [deliveryFee, setDeliveryFee] = useState("0");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [cropData, listingData, locationData] = await Promise.all([
        apiRequest("/user/marketplace/my-crops"),
        apiRequest("/user/marketplace/my-listings"),
        apiRequest("/user/marketplace/locations"),
      ]);
      const cropRows = (cropData?.crops ?? []) as Crop[];
      const locationRows = (locationData?.locations ?? []).map((row: any) => ({ ...row, latitude: Number(row.latitude), longitude: Number(row.longitude) })) as MarketplaceLocation[];
      setCrops(cropRows);
      setListings((listingData?.listings ?? []) as Listing[]);
      setLocations(locationRows);
      setCropId((current) => current || cropRows.find((crop) => crop.selling?.canSellAsHarvested || crop.selling?.canSellAsUpcoming)?.id || cropRows[0]?.id || "");
      setSellerLocationId((current) => current || locationRows.find((location) => location.isDefault)?.id || locationRows[0]?.id || "");
    } catch (e) {
      Alert.alert("Marketplace", e instanceof Error ? e.message : "Unable to load your seller data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const selectedCrop = crops.find((crop) => crop.id === cropId);
  const startCreate = () => {
    if (!crops.length) {
      Alert.alert("No crops yet", "Add a grow record first. Crops you have grown will appear here.");
      return;
    }
    setShowForm(true);
  };
  const submitListing = async () => {
    if (!selectedCrop) return Alert.alert("Select crop", "Choose the crop you want to sell.");
    if (!sellerLocationId) return Alert.alert("Seller location required", "Add a location before publishing a listing.");
    if (!sellerDelivery && !customerPickup) return Alert.alert("Fulfilment required", "Enable delivery or customer pickup.");
    if (Number(basePrice) <= 0 || Number(quantityAvailable) <= 0 || Number(packSizeValue) <= 0) return Alert.alert("Check the details", "Pack size, price and available quantity must be greater than zero.");
    if (sellerDelivery && Number(deliveryRadiusKm) <= 0) return Alert.alert("Delivery radius", "Delivery radius must be greater than zero.");
    const validHarvestType = selectedCrop.status === "HARVESTED" ? "HARVESTED" : harvestType;
    if (validHarvestType === "HARVESTED" && selectedCrop.status !== "HARVESTED") return Alert.alert("Harvest status", "Only harvested crops can be listed as harvested.");
    setBusy(true);
    try {
      await apiRequest("/user/marketplace/listings", {
        method: "POST",
        body: JSON.stringify({
          cropCycleId: cropId,
          harvestType: validHarvestType,
          packSizeValue: Number(packSizeValue),
          packSizeUnit,
          basePrice: Number(basePrice),
          discountPercent: Number(discountPercent) || 0,
          quantityAvailable: Number(quantityAvailable),
          minOrderQuantity: Number(minOrderQuantity) || 1,
          maxOrderQuantity: null,
          description: description.trim() || null,
          imageUrl: null,
          imageFileId: null,
          imageSizeBytes: null,
          sellerLocationId,
          sellerDelivery,
          customerPickup,
          deliveryRadiusKm: sellerDelivery ? Number(deliveryRadiusKm) : null,
          deliveryFee: Number(deliveryFee) || 0,
          status: "ACTIVE",
        }),
      });
      setShowForm(false);
      setDescription("");
      Alert.alert("Published", "Your harvest listing has been submitted.");
      await load(true);
    } catch (e) {
      Alert.alert("Could not publish", e instanceof Error ? e.message : "Please check the listing details and try again.");
    } finally {
      setBusy(false);
    }
  };
  const removeListing = (listing: Listing) => Alert.alert("Remove listing?", `Stop selling ${listing.cropName}?`, [
    { text: "Keep listing", style: "cancel" },
    { text: "Remove", style: "destructive", onPress: async () => {
      setBusy(true);
      try { await apiRequest(`/user/marketplace/listings/${listing.id}`, { method: "DELETE" }); await load(true); }
      catch (e) { Alert.alert("Unable to remove", e instanceof Error ? e.message : "Try again."); }
      finally { setBusy(false); }
    } },
  ]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={20} color={C.ink} /></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.kicker}>LOCAL HARVEST MARKET</Text><Text style={styles.title}>Sell your harvest</Text></View>
        <Pressable onPress={() => void load()} style={styles.refresh}><Feather name="refresh-cw" size={17} color={C.green} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }} tintColor={C.green} />} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroMark}><Ionicons name="leaf" size={24} color={C.bg} /></View>
          <Text style={styles.heroTitle}>Your harvest, your market.</Text>
          <Text style={styles.heroText}>Publish available crops, set your price and let nearby buyers find you on the map.</Text>
          <View style={styles.statsRow}>
            <View style={styles.stat}><Text style={styles.statValue}>{crops.length}</Text><Text style={styles.statLabel}>Grow records</Text></View>
            <View style={styles.statDivider} /><View style={styles.stat}><Text style={styles.statValue}>{listings.filter((x) => x.status === "ACTIVE").length}</Text><Text style={styles.statLabel}>Live listings</Text></View>
          </View>
          <Pressable style={styles.primaryButton} onPress={startCreate}><Feather name="plus" size={18} color={C.bg} /><Text style={styles.primaryText}>Create listing</Text></Pressable>
        </View>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your listings</Text><Text style={styles.sectionCount}>{listings.length} total</Text></View>
        {loading ? <ActivityIndicator color={C.green} style={{ marginTop: 28 }} /> : listings.length === 0 ? (
          <View style={styles.empty}><Feather name="shopping-bag" size={27} color={C.green} /><Text style={styles.emptyTitle}>Nothing listed yet</Text><Text style={styles.emptyText}>Create your first listing from one of your grow records.</Text></View>
        ) : listings.map((item) => (
          <View key={item.id} style={styles.listingCard}>
            <View style={styles.leafThumb}><Ionicons name="leaf-outline" size={23} color={C.green} /></View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}><Text style={styles.listingTitle} numberOfLines={1}>{item.cropName}</Text><Text style={[styles.status, item.status === "ACTIVE" && styles.statusActive]}>{item.status}</Text></View>
              <Text style={styles.meta}>{`₹${Math.round(Number(item.price || 0))} · ${item.packSizeValue}${item.packSizeUnit} · ${item.quantityAvailable} packs`}</Text>
              <Text style={styles.meta}>{item.sellerLocation?.label ?? "Seller location set"} · {item.orderCount ?? 0} orders</Text>
              <Pressable onPress={() => removeListing(item)} style={styles.remove}><Feather name="trash-2" size={13} color={C.red} /><Text style={styles.removeText}>Remove listing</Text></Pressable>
            </View>
          </View>
        ))}
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Crops you can sell</Text><Text style={styles.sectionCount}>{crops.length}</Text></View>
        {crops.slice(0, 6).map((crop) => <View key={crop.id} style={styles.cropRow}><View style={styles.cropIcon}><Ionicons name="nutrition-outline" size={17} color={C.green} /></View><View style={{ flex: 1 }}><Text style={styles.cropName}>{crop.cropName ?? "Grow record"}</Text><Text style={styles.meta}>{crop.status.replace(/_/g, " ")}</Text></View><Feather name={crop.selling?.hasListing ? "check-circle" : "chevron-right"} size={17} color={crop.selling?.hasListing ? C.green : C.muted} /></View>)}
        <View style={{ height: 20 }} />
      </ScrollView>

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBackdrop}><View style={[styles.modal, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={styles.modalHeader}><View><Text style={styles.kicker}>NEW PRODUCT</Text><Text style={styles.modalTitle}>Create listing</Text></View><Pressable onPress={() => setShowForm(false)} style={styles.close}><Feather name="x" size={18} color={C.ink} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 13, paddingBottom: 20 }}>
            <Text style={styles.label}>Crop / grow record</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {crops.map((crop) => <Pressable key={crop.id} onPress={() => { setCropId(crop.id); if (crop.status === "HARVESTED") setHarvestType("HARVESTED"); else setHarvestType("UPCOMING"); }} style={[styles.choice, cropId === crop.id && styles.choiceActive]}><Text style={[styles.choiceText, cropId === crop.id && styles.choiceTextActive]}>{crop.cropName ?? "Crop"}</Text></Pressable>)}
            </ScrollView>
            <Text style={styles.label}>Harvest status</Text>
            <View style={styles.choiceRow}>{(["HARVESTED", "UPCOMING"] as const).map((v) => <Pressable key={v} onPress={() => setHarvestType(v)} style={[styles.choice, styles.choiceWide, harvestType === v && styles.choiceActive]}><Text style={[styles.choiceText, harvestType === v && styles.choiceTextActive]}>{v === "HARVESTED" ? "Ready now" : "Upcoming harvest"}</Text></Pressable>)}</View>
            <View style={styles.inputGrid}><Field label="Pack size" value={packSizeValue} onChangeText={setPackSizeValue} keyboardType="decimal-pad"/><View style={{ flex: 1 }}><Text style={styles.label}>Unit</Text><View style={styles.choiceRow}>{["G", "KG", "PCS", "BUNCH", "PACK"].map((unit) => <Pressable key={unit} onPress={() => setPackSizeUnit(unit)} style={[styles.unitChoice, packSizeUnit === unit && styles.choiceActive]}><Text style={[styles.choiceText, packSizeUnit === unit && styles.choiceTextActive]}>{unit}</Text></Pressable>)}</View></View></View>
            <View style={styles.inputGrid}><Field label="Price (₹)" value={basePrice} onChangeText={setBasePrice} keyboardType="decimal-pad"/><Field label="Discount (%)" value={discountPercent} onChangeText={setDiscountPercent} keyboardType="decimal-pad"/></View>
            <View style={styles.inputGrid}><Field label="Available packs" value={quantityAvailable} onChangeText={setQuantityAvailable} keyboardType="number-pad"/><Field label="Minimum order" value={minOrderQuantity} onChangeText={setMinOrderQuantity} keyboardType="number-pad"/></View>
            <Text style={styles.label}>Seller location</Text>
            {locations.length === 0 ? <Text style={styles.warning}>No saved location. Go back and add a location before publishing.</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{locations.map((loc) => <Pressable key={loc.id} onPress={() => setSellerLocationId(loc.id)} style={[styles.choice, sellerLocationId === loc.id && styles.choiceActive]}><Text style={[styles.choiceText, sellerLocationId === loc.id && styles.choiceTextActive]}>{loc.label}</Text></Pressable>)}</ScrollView>}
            <Text style={styles.label}>Delivery options</Text>
            <View style={styles.choiceRow}><Pressable onPress={() => setSellerDelivery((v) => !v)} style={[styles.choice, styles.choiceWide, sellerDelivery && styles.choiceActive]}><Text style={[styles.choiceText, sellerDelivery && styles.choiceTextActive]}>Delivery {sellerDelivery ? "✓" : ""}</Text></Pressable><Pressable onPress={() => setCustomerPickup((v) => !v)} style={[styles.choice, styles.choiceWide, customerPickup && styles.choiceActive]}><Text style={[styles.choiceText, customerPickup && styles.choiceTextActive]}>Pickup {customerPickup ? "✓" : ""}</Text></Pressable></View>
            {sellerDelivery && <View style={styles.inputGrid}><Field label="Delivery radius (km)" value={deliveryRadiusKm} onChangeText={setDeliveryRadiusKm} keyboardType="decimal-pad"/><Field label="Delivery fee (₹)" value={deliveryFee} onChangeText={setDeliveryFee} keyboardType="decimal-pad"/></View>}
            <Text style={styles.label}>Description</Text><TextInput value={description} onChangeText={setDescription} placeholder="Describe your harvest…" placeholderTextColor={C.muted} multiline style={[styles.input, { minHeight: 82, textAlignVertical: "top" }]} />
            <Pressable onPress={() => void submitListing()} disabled={busy} style={[styles.primaryButton, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={C.bg} /> : <><Feather name="check" size={17} color={C.bg} /><Text style={styles.primaryText}>Publish listing</Text></>}</Pressable>
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  );
}
function Field({ label, value, onChangeText, keyboardType }: { label: string; value: string; onChangeText: (v: string) => void; keyboardType?: "decimal-pad" | "number-pad" }) {
  return <View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} placeholderTextColor={C.muted} style={styles.input}/></View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 15 },
  back: { width: 42, height: 42, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" }, refresh: { height: 40, width: 40, borderRadius: 13, backgroundColor: C.card, alignItems: "center", justifyContent: "center" },
  kicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.8, color: C.green }, title: { color: C.ink, fontSize: 23, fontWeight: "900", marginTop: 3 }, content: { paddingHorizontal: 15, paddingBottom: 35 },
  hero: { padding: 18, borderRadius: 23, backgroundColor: "#1B2614", borderWidth: 1, borderColor: "#36492A", marginBottom: 21 }, heroMark: { height: 43, width: 43, borderRadius: 14, backgroundColor: C.green, alignItems: "center", justifyContent: "center", marginBottom: 13 }, heroTitle: { color: C.ink, fontSize: 21, fontWeight: "900", letterSpacing: -0.4 }, heroText: { color: C.muted, fontSize: 11.5, lineHeight: 17, marginTop: 7 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 18, marginBottom: 18 }, stat: { gap: 3 }, statValue: { color: C.green, fontSize: 23, fontWeight: "900" }, statLabel: { color: C.muted, fontSize: 10 }, statDivider: { width: 1, height: 33, backgroundColor: C.line },
  primaryButton: { minHeight: 47, borderRadius: 13, backgroundColor: C.green, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, primaryText: { color: C.bg, fontSize: 12, fontWeight: "900" }, sectionRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 11 }, sectionTitle: { color: C.ink, fontSize: 16, fontWeight: "900" }, sectionCount: { color: C.green, fontSize: 11, fontWeight: "800" },
  empty: { borderRadius: 17, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 25, alignItems: "center", gap: 9, marginBottom: 23 }, emptyTitle: { color: C.ink, fontSize: 13, fontWeight: "800" }, emptyText: { color: C.muted, fontSize: 11, lineHeight: 16, textAlign: "center" },
  listingCard: { flexDirection: "row", gap: 11, padding: 11, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, marginBottom: 9 }, leafThumb: { width: 51, height: 56, borderRadius: 13, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" }, rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }, listingTitle: { color: C.ink, fontSize: 13, fontWeight: "800", flexShrink: 1 }, status: { color: C.orange, fontSize: 8, fontWeight: "900" }, statusActive: { color: C.green }, meta: { color: C.muted, fontSize: 10, marginTop: 4 }, remove: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 8 }, removeText: { color: C.red, fontSize: 10, fontWeight: "700" },
  cropRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line }, cropIcon: { height: 36, width: 36, borderRadius: 11, backgroundColor: C.soft, alignItems: "center", justifyContent: "center" }, cropName: { color: C.ink, fontSize: 12, fontWeight: "800" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" }, modal: { maxHeight: "92%", backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 17, paddingTop: 20 }, modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 18 }, modalTitle: { color: C.ink, fontSize: 22, fontWeight: "900", marginTop: 3 }, close: { height: 36, width: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  label: { color: C.muted, fontSize: 10.5, fontWeight: "800", marginBottom: 6, marginTop: 2 }, input: { color: C.ink, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 12 }, inputGrid: { flexDirection: "row", gap: 10 }, choiceRow: { flexDirection: "row", gap: 8 }, choice: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, choiceWide: { flex: 1, alignItems: "center" }, choiceActive: { borderColor: C.green, backgroundColor: C.soft }, choiceText: { color: C.muted, fontSize: 10, fontWeight: "800" }, choiceTextActive: { color: C.green }, unitChoice: { paddingHorizontal: 8, paddingVertical: 11, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }, warning: { color: C.orange, fontSize: 11, lineHeight: 16 },
});
