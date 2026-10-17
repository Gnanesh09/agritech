import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import AppText from "@/components/ui/AppText";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth-storage";

const C = {
  bg: "#0B0D0B",
  surface: "#141815",
  surface2: "#1B211C",
  surface3: "#222A23",
  border: "#2C382E",
  text: "#F4F7F1",
  muted: "#A0ADA1",
  subtle: "#748176",
  lime: "#C8FF67",
  green: "#347D4A",
  greenSoft: "#1A2A1D",
  red: "#FF8178",
  redSoft: "#321D1B",
  amber: "#F3BF79",
  amberSoft: "#302417",
  blue: "#8EBBFF",
  blueSoft: "#1D2A3A",
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.49.17.210:5000/api";
const IMAGEKIT_PUBLIC_KEY = process.env.EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "";
const IMAGEKIT_AUTH_ENDPOINT =
  process.env.EXPO_PUBLIC_IMAGEKIT_AUTH_ENDPOINT ?? "";
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

type PackUnit = "G" | "KG" | "PCS" | "BUNCH" | "BOX" | "PACK";
type HarvestType = "HARVESTED" | "UPCOMING";
type MainTab = "LISTINGS" | "ORDERS";
type FlowStep = "CROP" | "DETAILS" | "FULFILMENT";

type SellerCrop = {
  id: string;
  cropName: string;
  status: string;
  sowingDate?: string | null;
  expectedHarvestDate?: string | null;
  harvestedAt?: string | null;
  notes?: string | null;
  rack?: { id: string; name: string };
  row?: { id: string; name: string; rowNumber: number };
  tray?: { id: string; name: string; slot: number };
  selling?: {
    canSellAsHarvested: boolean;
    canSellAsUpcoming: boolean;
    hasListing: boolean;
    listingId?: string | null;
    listingStatus?: string | null;
  };
};

type SellerLocation = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  mapplsPin?: string | null;
  landmark?: string | null;
  isDefault?: boolean;
};

type SellerListing = {
  id: string;
  cropCycleId?: string;
  cropName: string;
  harvestType: HarvestType;
  expectedHarvestDate?: string | null;
  packSizeValue: number;
  packSizeUnit: PackUnit;
  originalPrice: number;
  discountPercent: number;
  price: number;
  quantityAvailable: number;
  minOrderQuantity: number;
  maxOrderQuantity?: number | null;
  description?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  imageSizeBytes?: number | null;
  sellerDelivery: boolean;
  customerPickup: boolean;
  deliveryRadiusKm?: number | null;
  deliveryFee: number;
  status: string;
  createdAt?: string;
  sellerLocation?: SellerLocation | null;
  cropCycle?: any;
  orderCount?: number;
};

type SellerOrder = {
  id: string;
  orderNumber: string;
  listingId: string;
  cropName: string;
  quantity: number;
  packSizeValue: number;
  packSizeUnit: PackUnit;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  fulfillmentType: "SELLER_DELIVERY" | "CUSTOMER_PICKUP";
  paymentMethod: "ONLINE" | "COD";
  paymentStatus: string;
  status: string;
  buyer?: {
    id?: string;
    username?: string;
    phoneNo?: string;
    countryCode?: string;
  };
  buyerLocation?: SellerLocation;
  buyerAddressSnapshot?: string | null;
  buyerLatitude?: number | null;
  buyerLongitude?: number | null;
  tracking?: {
    isActive?: boolean;
    latitude?: number | null;
    longitude?: number | null;
    etaMinutes?: number | null;
    distanceRemainingKm?: number | null;
    reachedAt?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
  payments?: Array<{
    id: string;
    kind: string;
    status: string;
    amount: number;
    createdAt?: string;
  }>;
};

type Draft = {
  cropCycleId: string;
  harvestType: HarvestType;
  packSizeValue: string;
  packSizeUnit: PackUnit;
  basePrice: string;
  discountPercent: string;
  quantityAvailable: string;
  minOrderQuantity: string;
  maxOrderQuantity: string;
  description: string;
  imageUrl: string;
  imageFileId: string;
  imageSizeBytes: string;
  sellerLocationId: string;
  sellerDelivery: boolean;
  customerPickup: boolean;
  deliveryRadiusKm: string;
  deliveryFee: string;
};

type PendingImage = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
};

const money = (value: unknown) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
const errorMessage = (error: unknown) =>
  error instanceof Error && error.message.trim()
    ? error.message
    : typeof error === "string" && error.trim()
      ? error
      : "Something went wrong. Please try again.";
const isPositive = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) > 0;
const isNonNegative = (value: string) =>
  Number.isFinite(Number(value)) && Number(value) >= 0;
const statusLabel = (status: string) =>
  status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
const dateLabel = (value?: string | null) => {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not specified"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

function initialDraft(locationId = ""): Draft {
  return {
    cropCycleId: "",
    harvestType: "UPCOMING",
    packSizeValue: "1",
    packSizeUnit: "KG",
    basePrice: "",
    discountPercent: "0",
    quantityAvailable: "1",
    minOrderQuantity: "1",
    maxOrderQuantity: "",
    description: "",
    imageUrl: "",
    imageFileId: "",
    imageSizeBytes: "",
    sellerLocationId: locationId,
    sellerDelivery: false,
    customerPickup: true,
    deliveryRadiusKm: "5",
    deliveryFee: "0",
  };
}

async function uploadToImageKit(image: PendingImage) {
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_AUTH_ENDPOINT) {
    throw new Error(
      "Photo upload is not configured. Set EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY and EXPO_PUBLIC_IMAGEKIT_AUTH_ENDPOINT, or remove the photo and publish without one.",
    );
  }
  const token = await getAccessToken();
  const authUrl = IMAGEKIT_AUTH_ENDPOINT.startsWith("http")
    ? IMAGEKIT_AUTH_ENDPOINT
    : `${API_URL}${IMAGEKIT_AUTH_ENDPOINT.startsWith("/") ? "" : "/"}${IMAGEKIT_AUTH_ENDPOINT}`;
  const authResponse = await fetch(authUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const auth = await authResponse.json().catch(() => null);
  if (!authResponse.ok)
    throw new Error(auth?.message ?? "Unable to authorize photo upload.");

  const form = new FormData();
  form.append("file", {
    uri: image.uri,
    name: image.name,
    type: image.mimeType || "image/jpeg",
  } as any);
  form.append("fileName", image.name);
  form.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);
  const response = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    body: form,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.url)
    throw new Error(result?.message ?? "Photo upload failed.");
  return {
    url: String(result.url),
    fileId: String(result.fileId ?? ""),
    sizeBytes: Number(result.size ?? image.sizeBytes ?? 0),
  };
}

async function getGpsPayload() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("Location permission is required to start delivery.");
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    heading: position.coords.heading,
    speedKmh: (position.coords.speed ?? 0) * 3.6,
  };
}

function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  tone = "green",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  tone?: "green" | "lime" | "muted" | "danger";
}) {
  const bg =
    tone === "lime"
      ? C.lime
      : tone === "muted"
        ? C.surface3
        : tone === "danger"
          ? C.redSoft
          : C.green;
  const fg = tone === "lime" ? C.bg : tone === "danger" ? C.red : C.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className="min-h-[48px] flex-row items-center justify-center gap-2 rounded-[14px] px-4"
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: disabled || loading ? 0.48 : pressed ? 0.84 : 1,
      })}
    >
      {loading ? <ActivityIndicator color={fg} /> : null}
      {!loading ? (
        <AppText className="text-[13px] font-bold" style={{ color: fg }}>
          {label}
        </AppText>
      ) : null}
      {!loading && icon ? <Feather name={icon} size={16} color={fg} /> : null}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  suffix,
  helper,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad" | "number-pad";
  multiline?: boolean;
  suffix?: string;
  helper?: string;
  maxLength?: number;
}) {
  return (
    <View className="gap-1.5">
      <AppText className="text-[11px] font-semibold text-[#A0ADA1]">
        {label}
      </AppText>
      <View
        className={`flex-row items-center rounded-[12px] border border-[#2C382E] bg-[#0F130F] px-3 ${multiline ? "items-start" : ""}`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#68766A"
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          selectionColor={C.lime}
          textAlignVertical={multiline ? "top" : "center"}
          className={`min-w-0 flex-1 py-3 text-[13px] text-[#F4F7F1] ${multiline ? "min-h-[86px]" : ""}`}
        />
        {suffix ? (
          <AppText className="pl-2 text-[11px] text-[#748176]">
            {suffix}
          </AppText>
        ) : null}
      </View>
      {helper ? (
        <AppText className="text-[10px] leading-4 text-[#748176]">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-3 gap-1">
      <AppText className="text-[16px] font-bold text-[#F4F7F1]">
        {title}
      </AppText>
      {subtitle ? (
        <AppText className="text-[11px] leading-4 text-[#A0ADA1]">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

function Drawer({
  visible,
  title,
  subtitle,
  onClose,
  onRequestClose,
  children,
  footer,
  insets,
  large = true,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose?: () => void;
  onRequestClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  insets: { bottom: number; top: number };
  large?: boolean;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View className="flex-1 justify-end bg-[rgba(0,0,0,0.65)]">
        <Pressable
          className="flex-1"
          onPress={onRequestClose}
          accessibilityLabel="Close drawer overlay"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ maxHeight: "94%" }}
        >
          <View
            className="overflow-hidden rounded-t-[26px] border border-[#2C382E] bg-[#101510]"
            style={{
              height: large ? "91%" : "auto",
              maxHeight: "94%",
              paddingBottom: Math.max(insets.bottom, 10),
            }}
          >
            <View className="items-center pb-2 pt-2.5">
              <View className="h-1 w-10 rounded-full bg-[#465247]" />
            </View>
            <View className="flex-row items-center gap-3 border-b border-[#263128] px-4 pb-3 pt-1">
              <View className="min-w-0 flex-1 gap-0.5">
                <AppText className="text-[17px] font-bold text-[#F4F7F1]">
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText className="text-[10px] leading-4 text-[#A0ADA1]">
                    {subtitle}
                  </AppText>
                ) : null}
              </View>
              {onClose ? (
                <Pressable
                  onPress={onClose}
                  className="h-9 w-9 items-center justify-center rounded-full border border-[#2C382E] bg-[#1B211C]"
                >
                  <Feather name="x" size={17} color={C.text} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 22 }}
            >
              {children}
            </ScrollView>
            {footer ? (
              <View
                className="border-t border-[#263128] bg-[#101510] px-4 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 10) }}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ListingCard({
  listing,
  onEdit,
  onToggle,
  onRemove,
  onRelist,
  busy,
}: {
  listing: SellerListing;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onRelist: () => void;
  busy: boolean;
}) {
  const isRemoved = listing.status === "REMOVED";
  const isPaused = listing.status === "PAUSED";
  const discount = Number(listing.discountPercent || 0);
  const statusColor =
    listing.status === "ACTIVE"
      ? C.lime
      : listing.status === "PAUSED"
        ? C.amber
        : listing.status === "SOLD_OUT"
          ? C.red
          : C.muted;
  return (
    <View className="mb-3 overflow-hidden rounded-[17px] border border-[#2C382E] bg-[#141815]">
      <View className="flex-row gap-3 p-3">
        <View className="h-[91px] w-[88px] shrink-0 overflow-hidden rounded-[12px] bg-[#202A19]">
          {listing.imageUrl ? (
            <Image
              source={{ uri: listing.imageUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="leaf-outline" size={29} color={C.lime} />
              <AppText className="mt-1 text-[9px] text-[#A0ADA1]">
                No photo
              </AppText>
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 justify-between gap-2">
          <View className="flex-row items-start gap-2">
            <View className="min-w-0 flex-1 gap-1">
              <AppText
                className="text-[14px] font-bold text-[#F4F7F1]"
                numberOfLines={2}
              >
                {listing.cropName}
              </AppText>
              <AppText className="text-[10px] text-[#A0ADA1]">
                {listing.packSizeValue} {listing.packSizeUnit} ·{" "}
                {listing.harvestType === "UPCOMING"
                  ? `Expected ${dateLabel(listing.expectedHarvestDate)}`
                  : "Harvested"}
              </AppText>
            </View>
            <View
              className="rounded-full px-2 py-1"
              style={{
                backgroundColor:
                  listing.status === "ACTIVE"
                    ? C.greenSoft
                    : listing.status === "PAUSED"
                      ? C.amberSoft
                      : C.surface3,
              }}
            >
              <AppText
                className="text-[9px] font-bold"
                style={{ color: statusColor }}
              >
                {statusLabel(listing.status)}
              </AppText>
            </View>
          </View>
          <View className="flex-row items-end justify-between gap-2">
            <View className="min-w-0 flex-1">
              <AppText className="text-[18px] font-extrabold text-[#F4F7F1]">
                {money(listing.price)}
              </AppText>
              <AppText className="mt-0.5 text-[10px] text-[#8ACB8A]">
                {listing.quantityAvailable} available ·{" "}
                {listing.orderCount ?? 0} orders
              </AppText>
            </View>
            {discount > 0 ? (
              <View className="rounded-md bg-[#25351E] px-2 py-1">
                <AppText className="text-[9px] font-bold text-[#C8FF67]">
                  {discount}% OFF
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <View className="flex-row border-t border-[#263128] p-2.5">
        {isRemoved ? (
          <Pressable
            onPress={onRelist}
            disabled={busy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#C8FF67] py-2.5"
          >
            <Feather name="refresh-cw" size={13} color={C.bg} />
            <AppText className="text-[11px] font-bold text-[#0B0D0B]">
              Relist crop
            </AppText>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onEdit}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#222A23] py-2.5"
            >
              <Feather name="edit-3" size={13} color={C.text} />
              <AppText className="text-[11px] font-bold text-[#F4F7F1]">
                Edit
              </AppText>
            </Pressable>
            <Pressable
              onPress={onToggle}
              disabled={busy}
              className="ml-2 flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#222A23] py-2.5"
            >
              <Feather
                name={isPaused ? "play" : "pause"}
                size={13}
                color={C.amber}
              />
              <AppText className="text-[11px] font-bold text-[#F4F7F1]">
                {isPaused ? "Resume" : "Pause"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onRemove}
              disabled={busy}
              className="ml-2 h-9 w-10 items-center justify-center rounded-[10px] bg-[#321D1B]"
            >
              {busy ? (
                <ActivityIndicator size="small" color={C.red} />
              ) : (
                <Feather name="trash-2" size={14} color={C.red} />
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function OrderCard({
  order,
  onPress,
}: {
  order: SellerOrder;
  onPress: () => void;
}) {
  const isPaid = order.paymentStatus === "PAID";
  const statusColor =
    order.status === "COMPLETED"
      ? C.lime
      : order.status === "CANCELLED"
        ? C.red
        : order.status === "PLACED"
          ? C.blue
          : C.amber;
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[16px] border border-[#2C382E] bg-[#141815] p-3.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}
    >
      <View className="flex-row items-start gap-2">
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#202A19]">
          <Feather name="shopping-bag" size={17} color={C.lime} />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <AppText
            className="text-[13px] font-bold text-[#F4F7F1]"
            numberOfLines={1}
          >
            {order.cropName}
          </AppText>
          <AppText className="text-[10px] text-[#A0ADA1]">
            Order {order.orderNumber} · {order.buyer?.username ?? "Buyer"}
          </AppText>
          <AppText className="text-[10px] text-[#748176]">
            {order.quantity} × {order.packSizeValue} {order.packSizeUnit} ·{" "}
            {order.fulfillmentType === "SELLER_DELIVERY"
              ? "Delivery"
              : "Pickup"}
          </AppText>
        </View>
        <View className="items-end gap-1">
          <AppText className="text-[15px] font-extrabold text-[#F4F7F1]">
            {money(order.totalAmount)}
          </AppText>
          <View
            className="rounded-full px-2 py-1"
            style={{
              backgroundColor:
                order.status === "COMPLETED"
                  ? C.greenSoft
                  : order.status === "CANCELLED"
                    ? C.redSoft
                    : C.surface3,
            }}
          >
            <AppText
              className="text-[9px] font-bold"
              style={{ color: statusColor }}
            >
              {statusLabel(order.status)}
            </AppText>
          </View>
        </View>
      </View>
      <View className="mt-3 flex-row items-center justify-between border-t border-[#263128] pt-2.5">
        <View className="flex-row items-center gap-1.5">
          <Feather
            name={isPaid ? "check-circle" : "clock"}
            size={12}
            color={isPaid ? C.lime : C.amber}
          />
          <AppText className="text-[10px] text-[#A0ADA1]">
            {isPaid
              ? "Payment received"
              : `${order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"} · ${statusLabel(order.paymentStatus)}`}
          </AppText>
        </View>
        <View className="flex-row items-center gap-1">
          <AppText className="text-[10px] font-bold text-[#C8FF67]">
            Manage order
          </AppText>
          <Feather name="chevron-right" size={13} color={C.lime} />
        </View>
      </View>
    </Pressable>
  );
}

export default function MarketplaceSellScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<MainTab>("LISTINGS");
  const [crops, setCrops] = useState<SellerCrop[]>([]);
  const [listings, setListings] = useState<SellerListing[]>([]);
  const [locations, setLocations] = useState<SellerLocation[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [step, setStep] = useState<FlowStep>("CROP");
  const [draft, setDraft] = useState<Draft>(() => initialDraft());
  const [selectedCrop, setSelectedCrop] = useState<SellerCrop | null>(null);
  const [editingListing, setEditingListing] = useState<SellerListing | null>(
    null,
  );
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [savingListing, setSavingListing] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [orderVisible, setOrderVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [cropData, listingData, locationData, orderData] =
        await Promise.all([
          apiRequest("/user/marketplace/my-crops"),
          apiRequest("/user/marketplace/my-listings"),
          apiRequest("/user/marketplace/locations"),
          apiRequest("/user/marketplace/orders/selling"),
        ]);
      setCrops((cropData?.crops ?? []) as SellerCrop[]);
      setListings((listingData?.listings ?? []) as SellerListing[]);
      setLocations(
        (locationData?.locations ?? []).map((row: any) => ({
          ...row,
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
        })) as SellerLocation[],
      );
      setOrders((orderData?.orders ?? []) as SellerOrder[]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const activeListings = useMemo(
    () => listings.filter((item) => item.status === "ACTIVE").length,
    [listings],
  );
  const openOrders = useMemo(
    () =>
      orders.filter((item) => !["COMPLETED", "CANCELLED"].includes(item.status))
        .length,
    [orders],
  );
  const completedRevenue = useMemo(
    () =>
      orders
        .filter((item) => item.paymentStatus === "PAID")
        .reduce((sum, item) => sum + Number(item.totalAmount || 0), 0),
    [orders],
  );
  const availableCrops = useMemo(
    () =>
      crops.filter((crop) =>
        ["GROWING", "READY", "HARVESTED"].includes(crop.status),
      ),
    [crops],
  );

  const changeDraft = (patch: Partial<Draft>) =>
    setDraft((current) => ({ ...current, ...patch }));

  const cropHarvestType = (crop: SellerCrop): HarvestType =>
    crop.status === "HARVESTED" ? "HARVESTED" : "UPCOMING";

  const startNewListing = () => {
    if (!availableCrops.length) {
      Alert.alert(
        "No crops ready to list",
        "Your sellable crops are loaded from your active grow racks. Grow or harvest a crop before creating a listing.",
      );
      return;
    }
    setEditingListing(null);
    setSelectedCrop(null);
    setPendingImage(null);
    setDraft(
      initialDraft(
        locations.find((item) => item.isDefault)?.id ?? locations[0]?.id ?? "",
      ),
    );
    setStep("CROP");
    setFormVisible(true);
  };

  const beginEditListing = (listing: SellerListing, relist = false) => {
    const cropId = listing.cropCycleId ?? listing.cropCycle?.id;
    const cropFromApi = crops.find((item) => item.id === cropId);
    const crop =
      cropFromApi ??
      (listing.cropCycle
        ? ({
            id: String(listing.cropCycle.id ?? cropId ?? ""),
            cropName: listing.cropName,
            status:
              listing.harvestType === "HARVESTED" ? "HARVESTED" : "GROWING",
            expectedHarvestDate: listing.expectedHarvestDate,
            selling: undefined,
          } as SellerCrop)
        : null);
    if (!crop) {
      Alert.alert(
        "Crop details unavailable",
        "Refresh your crops and try again.",
      );
      void loadAll(true);
      return;
    }
    setEditingListing(relist ? null : listing);
    setSelectedCrop(crop);
    setPendingImage(null);
    setDraft({
      cropCycleId: crop.id,
      harvestType: relist ? cropHarvestType(crop) : listing.harvestType,
      packSizeValue: String(listing.packSizeValue ?? 1),
      packSizeUnit: listing.packSizeUnit ?? "KG",
      basePrice: String(listing.originalPrice ?? listing.price ?? ""),
      discountPercent: String(listing.discountPercent ?? 0),
      quantityAvailable: String(listing.quantityAvailable ?? 1),
      minOrderQuantity: String(listing.minOrderQuantity ?? 1),
      maxOrderQuantity:
        listing.maxOrderQuantity == null
          ? ""
          : String(listing.maxOrderQuantity),
      description: listing.description ?? "",
      imageUrl: listing.imageUrl ?? "",
      imageFileId: listing.imageFileId ?? "",
      imageSizeBytes:
        listing.imageSizeBytes == null ? "" : String(listing.imageSizeBytes),
      sellerLocationId:
        listing.sellerLocation?.id ??
        locations.find((item) => item.isDefault)?.id ??
        locations[0]?.id ??
        "",
      sellerDelivery: Boolean(listing.sellerDelivery),
      customerPickup: Boolean(listing.customerPickup),
      deliveryRadiusKm: String(listing.deliveryRadiusKm ?? 5),
      deliveryFee: String(listing.deliveryFee ?? 0),
    });
    setStep(relist ? "DETAILS" : "DETAILS");
    setFormVisible(true);
  };

  const attemptCloseForm = () => {
    if (savingListing) return;
    Alert.alert(
      "Discard listing changes?",
      editingListing
        ? "Your edits have not been saved. Leave this form and discard them?"
        : "Your listing draft has not been published. Are you sure you want to leave?",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            setFormVisible(false);
            setSelectedCrop(null);
            setEditingListing(null);
            setPendingImage(null);
            setDraft(initialDraft());
          },
        },
      ],
    );
  };

  const pickPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Photo permission needed",
          "Allow photo library access to add a photo of your crop.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.82,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const fileName = asset.fileName || `crop-${Date.now()}.jpg`;
      const mimeType = asset.mimeType || "image/jpeg";
      setPendingImage({
        uri: asset.uri,
        name: fileName,
        mimeType,
        sizeBytes: asset.fileSize,
      });
      changeDraft({
        imageUrl: asset.uri,
        imageFileId: "",
        imageSizeBytes: asset.fileSize ? String(asset.fileSize) : "",
      });
    } catch (e) {
      Alert.alert("Could not select photo", errorMessage(e));
    }
  };

  const validateDetails = () => {
    if (!isPositive(draft.packSizeValue))
      return "Enter a pack size greater than zero.";
    if (!isPositive(draft.basePrice))
      return "Enter the base price for one pack.";
    if (
      !isNonNegative(draft.discountPercent) ||
      Number(draft.discountPercent) > 100
    )
      return "Discount must be between 0 and 100%.";
    if (
      !Number.isInteger(Number(draft.quantityAvailable)) ||
      !isPositive(draft.quantityAvailable)
    )
      return "Available quantity must be a positive whole number.";
    if (
      !Number.isInteger(Number(draft.minOrderQuantity)) ||
      !isPositive(draft.minOrderQuantity)
    )
      return "Minimum order quantity must be a positive whole number.";
    if (Number(draft.minOrderQuantity) > Number(draft.quantityAvailable))
      return "Minimum order quantity cannot exceed available quantity.";
    if (
      draft.maxOrderQuantity.trim() &&
      (!Number.isInteger(Number(draft.maxOrderQuantity)) ||
        !isPositive(draft.maxOrderQuantity) ||
        Number(draft.maxOrderQuantity) < Number(draft.minOrderQuantity) ||
        Number(draft.maxOrderQuantity) > Number(draft.quantityAvailable))
    )
      return "Maximum order quantity must be between the minimum order and available quantity.";
    return "";
  };

  const validateFulfilment = () => {
    if (
      !draft.sellerLocationId ||
      !locations.some((item) => item.id === draft.sellerLocationId)
    )
      return "Choose the location where the crop will be handed over or dispatched from.";
    if (!draft.sellerDelivery && !draft.customerPickup)
      return "Enable seller delivery, customer pickup, or both.";
    if (draft.sellerDelivery && !isPositive(draft.deliveryRadiusKm))
      return "Enter a delivery radius greater than zero.";
    if (!isNonNegative(draft.deliveryFee))
      return "Delivery fee cannot be negative.";
    return "";
  };

  const submitListing = async () => {
    if (!selectedCrop || !draft.cropCycleId) {
      Alert.alert("Select a crop", "Choose a crop from your grow rack first.");
      setStep("CROP");
      return;
    }
    const detailError = validateDetails();
    if (detailError) {
      Alert.alert("Check listing details", detailError);
      setStep("DETAILS");
      return;
    }
    const fulfilmentError = validateFulfilment();
    if (fulfilmentError) {
      Alert.alert("Complete fulfilment details", fulfilmentError);
      return;
    }

    setSavingListing(true);
    try {
      let imageUrl: string | null = draft.imageUrl.trim() || null;
      let imageFileId: string | null = draft.imageFileId.trim() || null;
      let imageSizeBytes: number | null = draft.imageSizeBytes.trim()
        ? Number(draft.imageSizeBytes)
        : null;
      if (pendingImage) {
        setPhotoBusy(true);
        const upload = await uploadToImageKit(pendingImage);
        imageUrl = upload.url;
        imageFileId = upload.fileId || null;
        imageSizeBytes = upload.sizeBytes || null;
      }

      const payload = {
        cropCycleId: draft.cropCycleId,
        harvestType: draft.harvestType,
        packSizeValue: Number(draft.packSizeValue),
        packSizeUnit: draft.packSizeUnit,
        basePrice: Number(draft.basePrice),
        discountPercent: Number(draft.discountPercent || 0),
        quantityAvailable: Number(draft.quantityAvailable),
        minOrderQuantity: Number(draft.minOrderQuantity),
        maxOrderQuantity: draft.maxOrderQuantity.trim()
          ? Number(draft.maxOrderQuantity)
          : null,
        description: draft.description.trim() || null,
        imageUrl,
        imageFileId,
        imageSizeBytes,
        sellerLocationId: draft.sellerLocationId,
        sellerDelivery: draft.sellerDelivery,
        customerPickup: draft.customerPickup,
        ...(draft.sellerDelivery
          ? { deliveryRadiusKm: Number(draft.deliveryRadiusKm) }
          : {}),
        deliveryFee: Number(draft.deliveryFee || 0),
      };

      if (editingListing && editingListing.status !== "REMOVED") {
        const editablePayload = {
          packSizeValue: payload.packSizeValue,
          packSizeUnit: payload.packSizeUnit,
          basePrice: payload.basePrice,
          discountPercent: payload.discountPercent,
          quantityAvailable: payload.quantityAvailable,
          minOrderQuantity: payload.minOrderQuantity,
          maxOrderQuantity: payload.maxOrderQuantity,
          description: payload.description,
          imageUrl: payload.imageUrl,
          imageFileId: payload.imageFileId,
          imageSizeBytes: payload.imageSizeBytes,
          sellerLocationId: payload.sellerLocationId,
          sellerDelivery: payload.sellerDelivery,
          customerPickup: payload.customerPickup,
          ...(draft.sellerDelivery
            ? { deliveryRadiusKm: Number(draft.deliveryRadiusKm) }
            : {}),
          deliveryFee: payload.deliveryFee,
          ...(editingListing.status === "PAUSED" ? { status: "PAUSED" } : {}),
        };
        await apiRequest(`/user/marketplace/listings/${editingListing.id}`, {
          method: "PATCH",
          body: JSON.stringify(editablePayload),
        });
      } else {
        await apiRequest("/user/marketplace/listings", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setFormVisible(false);
      setSelectedCrop(null);
      setEditingListing(null);
      setPendingImage(null);
      await loadAll(true);
      Alert.alert(
        "Listing saved",
        "Your crop listing has been saved successfully.",
      );
    } catch (e) {
      Alert.alert("Could not save listing", errorMessage(e));
    } finally {
      setSavingListing(false);
      setPhotoBusy(false);
    }
  };

  const toggleListingStatus = (listing: SellerListing) => {
    const nextStatus = listing.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    Alert.alert(
      nextStatus === "PAUSED" ? "Pause this listing?" : "Resume this listing?",
      nextStatus === "PAUSED"
        ? "Customers will no longer be able to place new orders for this crop."
        : "This crop will become visible for new orders again.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: nextStatus === "PAUSED" ? "Pause listing" : "Resume listing",
          onPress: async () => {
            setActionBusy(true);
            try {
              await apiRequest(`/user/marketplace/listings/${listing.id}`, {
                method: "PATCH",
                body: JSON.stringify({ status: nextStatus }),
              });
              await loadAll(true);
            } catch (e) {
              Alert.alert("Update failed", errorMessage(e));
            } finally {
              setActionBusy(false);
            }
          },
        },
      ],
    );
  };

  const removeListing = (listing: SellerListing) => {
    Alert.alert(
      "Remove listing?",
      `Remove ${listing.cropName} from your marketplace listings?`,
      [
        { text: "Keep listing", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setActionBusy(true);
            try {
              await apiRequest(`/user/marketplace/listings/${listing.id}`, {
                method: "DELETE",
              });
              await loadAll(true);
            } catch (e) {
              Alert.alert("Could not remove listing", errorMessage(e));
            } finally {
              setActionBusy(false);
            }
          },
        },
      ],
    );
  };

  const openOrder = async (order: SellerOrder) => {
    setSelectedOrder(order);
    setOrderError("");
    setOrderVisible(true);
    setOrderBusy(true);
    try {
      const response = await apiRequest(`/user/marketplace/orders/${order.id}`);
      if (response?.order) setSelectedOrder(response.order as SellerOrder);
    } catch (e) {
      setOrderError(errorMessage(e));
    } finally {
      setOrderBusy(false);
    }
  };

  const refreshOrder = async (orderId: string) => {
    const response = await apiRequest(`/user/marketplace/orders/${orderId}`);
    if (response?.order) setSelectedOrder(response.order as SellerOrder);
    await loadAll(true);
  };

  const updateOrderStatus = async (
    order: SellerOrder,
    status: string,
    confirmation = true,
  ) => {
    const perform = async () => {
      setOrderBusy(true);
      setOrderError("");
      try {
        await apiRequest(`/user/marketplace/orders/${order.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        });
        await refreshOrder(order.id);
      } catch (e) {
        setOrderError(errorMessage(e));
        Alert.alert("Order update failed", errorMessage(e));
      } finally {
        setOrderBusy(false);
      }
    };
    if (confirmation) {
      Alert.alert(
        "Update order?",
        `Change order ${order.orderNumber} to ${statusLabel(status)}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Confirm", onPress: () => void perform() },
        ],
      );
    } else await perform();
  };

  const cancelOrder = (order: SellerOrder) => {
    Alert.alert(
      "Cancel this order?",
      "This action may release reserved stock. If an online payment was collected, the backend must process the refund before cancellation can complete.",
      [
        { text: "Keep order", style: "cancel" },
        {
          text: "Cancel order",
          style: "destructive",
          onPress: async () => {
            setOrderBusy(true);
            try {
              await apiRequest(`/user/marketplace/orders/${order.id}/cancel`, {
                method: "POST",
              });
              await refreshOrder(order.id);
            } catch (e) {
              Alert.alert("Could not cancel order", errorMessage(e));
            } finally {
              setOrderBusy(false);
            }
          },
        },
      ],
    );
  };

  const startDelivery = async (order: SellerOrder) => {
    setOrderBusy(true);
    try {
      const gps = await getGpsPayload();
      await apiRequest(`/user/marketplace/orders/${order.id}/tracking/start`, {
        method: "POST",
        body: JSON.stringify(gps),
      });
      await refreshOrder(order.id);
      Alert.alert(
        "Delivery started",
        "Live delivery tracking has started for this order.",
      );
    } catch (e) {
      Alert.alert("Could not start delivery", errorMessage(e));
    } finally {
      setOrderBusy(false);
    }
  };

  const markReached = async (order: SellerOrder) => {
    setOrderBusy(true);
    try {
      const gps = await getGpsPayload();
      await apiRequest(
        `/user/marketplace/orders/${order.id}/tracking/reached`,
        {
          method: "POST",
          body: JSON.stringify({
            latitude: gps.latitude,
            longitude: gps.longitude,
          }),
        },
      );
      await refreshOrder(order.id);
      Alert.alert(
        "Arrival confirmed",
        "Your location was verified by the server.",
      );
    } catch (e) {
      Alert.alert("Could not confirm arrival", errorMessage(e));
    } finally {
      setOrderBusy(false);
    }
  };

  const collectCash = async (order: SellerOrder) => {
    Alert.alert(
      "Confirm cash collection",
      `Have you received ${money(order.totalAmount)} from the buyer?`,
      [
        { text: "Not yet", style: "cancel" },
        {
          text: "Yes, received",
          onPress: async () => {
            setOrderBusy(true);
            try {
              await apiRequest(
                `/user/marketplace/orders/${order.id}/payment/cash`,
                { method: "POST" },
              );
              await refreshOrder(order.id);
              Alert.alert(
                "Payment recorded",
                "Cash collection recorded and the order marked complete.",
              );
            } catch (e) {
              Alert.alert("Could not record payment", errorMessage(e));
            } finally {
              setOrderBusy(false);
            }
          },
        },
      ],
    );
  };

  const createUpiLink = async (order: SellerOrder) => {
    setOrderBusy(true);
    try {
      const response = await apiRequest(
        `/user/marketplace/orders/${order.id}/payment/upi`,
        { method: "POST" },
      );
      const url = response?.payment?.shortUrl;
      if (!url) {
        Alert.alert(
          "UPI link created",
          "The payment link was created, but the server did not return a short URL.",
        );
      } else {
        Alert.alert(
          "Collect with UPI",
          "Open the secure payment link and let the buyer complete payment.",
          [
            { text: "Later", style: "cancel" },
            {
              text: "Open payment link",
              onPress: () => {
                void Linking.openURL(url);
              },
            },
          ],
        );
      }
      await refreshOrder(order.id);
    } catch (e) {
      Alert.alert("Could not create UPI link", errorMessage(e));
    } finally {
      setOrderBusy(false);
    }
  };

  const attemptCloseOrder = () => {
    if (orderBusy) return;
    setOrderVisible(false);
    setSelectedOrder(null);
    setOrderError("");
  };

  const orderActions = (order: SellerOrder) => {
    if (order.status === "PLACED")
      return [
        {
          label: "Accept order",
          icon: "check-circle" as const,
          run: () => updateOrderStatus(order, "ACCEPTED"),
        },
      ];
    if (order.status === "ACCEPTED") {
      return order.fulfillmentType === "CUSTOMER_PICKUP"
        ? [
            {
              label: "Start preparing",
              icon: "package" as const,
              run: () => updateOrderStatus(order, "PREPARING"),
            },
            {
              label: "Ready for pickup",
              icon: "check-circle" as const,
              run: () => updateOrderStatus(order, "READY_FOR_PICKUP"),
            },
          ]
        : [
            {
              label: "Start preparing",
              icon: "package" as const,
              run: () => updateOrderStatus(order, "PREPARING"),
            },
          ];
    }
    if (order.status === "PREPARING")
      return [
        {
          label:
            order.fulfillmentType === "SELLER_DELIVERY"
              ? "Ready for dispatch"
              : "Ready for pickup",
          icon: "check-circle" as const,
          run: () => updateOrderStatus(order, "READY_FOR_PICKUP"),
        },
      ];
    if (
      order.status === "READY_FOR_PICKUP" &&
      order.fulfillmentType === "SELLER_DELIVERY"
    )
      return [
        {
          label: "Start delivery",
          icon: "truck" as const,
          run: () => void startDelivery(order),
        },
      ];
    if (order.status === "OUT_FOR_DELIVERY")
      return [
        {
          label: "Confirm customer reached",
          icon: "map-pin" as const,
          run: () => void markReached(order),
        },
      ];
    if (order.status === "READY_FOR_PICKUP" && order.paymentStatus === "PAID")
      return [
        {
          label: "Complete pickup order",
          icon: "check-circle" as const,
          run: () => updateOrderStatus(order, "COMPLETED"),
        },
      ];
    if (
      ["READY_FOR_PICKUP", "REACHED"].includes(order.status) &&
      order.paymentMethod === "COD" &&
      order.paymentStatus !== "PAID"
    ) {
      return [
        ...(order.status === "REACHED"
          ? [
              {
                label: "Request UPI payment",
                icon: "credit-card" as const,
                run: () => void createUpiLink(order),
              },
            ]
          : []),
        {
          label: "Record cash received",
          icon: "check-circle" as const,
          run: () => void collectCash(order),
        },
      ];
    }
    if (order.status === "REACHED" && order.paymentStatus === "PAID")
      return [
        {
          label: "Complete order",
          icon: "check-circle" as const,
          run: () => updateOrderStatus(order, "COMPLETED"),
        },
      ];
    return [];
  };

  const renderCropPicker = () => (
    <View className="gap-3">
      <View className="rounded-[13px] border border-[#2C382E] bg-[#141815] px-3.5 py-3">
        <View className="flex-row items-start gap-2">
          <Feather name="info" size={14} color={C.lime} />
          <AppText className="min-w-0 flex-1 text-[10px] leading-4 text-[#A0ADA1]">
            Choose a crop from your active grow racks. Crop name and harvest
            status come from your crop records.
          </AppText>
        </View>
      </View>
      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={C.lime} />
          <AppText className="mt-2 text-[11px] text-[#A0ADA1]">
            Loading your crops…
          </AppText>
        </View>
      ) : availableCrops.length === 0 ? (
        <View className="items-center rounded-[16px] border border-dashed border-[#3A493C] px-6 py-9">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-[15px] bg-[#202A19]">
            <Ionicons name="leaf-outline" size={24} color={C.lime} />
          </View>
          <AppText className="text-[14px] font-bold text-[#F4F7F1]">
            No sellable crops yet
          </AppText>
          <AppText className="mt-1 text-center text-[11px] leading-4 text-[#A0ADA1]">
            Your GROWING, READY, and HARVESTED crops will appear here.
          </AppText>
          <Pressable
            onPress={() => void loadAll()}
            className="mt-4 rounded-[10px] bg-[#222A23] px-3 py-2"
          >
            <AppText className="text-[11px] font-bold text-[#C8FF67]">
              Refresh crops
            </AppText>
          </Pressable>
        </View>
      ) : (
        availableCrops.map((crop) => {
          const chosen = draft.cropCycleId === crop.id;
          const cropType = cropHarvestType(crop);
          return (
            <Pressable
              key={crop.id}
              onPress={() => {
                setSelectedCrop(crop);
                changeDraft({ cropCycleId: crop.id, harvestType: cropType });
              }}
              className={`flex-row items-center gap-3 rounded-[14px] border p-3.5 ${chosen ? "border-[#718F38] bg-[#1A2A1D]" : "border-[#2C382E] bg-[#141815]"}`}
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-[12px] ${chosen ? "bg-[#2B4127]" : "bg-[#202A19]"}`}
              >
                <Ionicons
                  name="leaf-outline"
                  size={21}
                  color={chosen ? C.lime : C.muted}
                />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <AppText className="text-[13px] font-bold text-[#F4F7F1]">
                  {crop.cropName}
                </AppText>
                <AppText className="text-[10px] text-[#A0ADA1]">
                  {crop.rack?.name ?? "Grow rack"}
                  {crop.row?.name ? ` · ${crop.row.name}` : ""}
                  {crop.tray?.name ? ` · ${crop.tray.name}` : ""}
                </AppText>
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <View className="rounded-full bg-[#202A19] px-2 py-1">
                    <AppText className="text-[9px] font-bold text-[#C8FF67]">
                      {statusLabel(crop.status)}
                    </AppText>
                  </View>
                  {crop.selling?.hasListing ? (
                    <View className="rounded-full bg-[#302417] px-2 py-1">
                      <AppText className="text-[9px] font-bold text-[#F3BF79]">
                        Already listed
                      </AppText>
                    </View>
                  ) : null}
                  {cropType === "UPCOMING" ? (
                    <AppText className="text-[9px] text-[#748176]">
                      Expected {dateLabel(crop.expectedHarvestDate)}
                    </AppText>
                  ) : null}
                </View>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border ${chosen ? "border-[#C8FF67] bg-[#C8FF67]" : "border-[#526052]"}`}
              >
                {chosen ? (
                  <Feather name="check" size={12} color={C.bg} />
                ) : null}
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );

  const renderDetailsStep = () => (
    <View className="gap-4">
      {selectedCrop ? (
        <View className="flex-row items-center gap-3 rounded-[14px] border border-[#2C382E] bg-[#141815] p-3">
          <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#202A19]">
            <Feather name="check-circle" size={18} color={C.lime} />
          </View>
          <View className="min-w-0 flex-1">
            <AppText className="text-[13px] font-bold text-[#F4F7F1]">
              {selectedCrop.cropName}
            </AppText>
            <AppText className="mt-0.5 text-[10px] text-[#A0ADA1]">
              {draft.harvestType === "HARVESTED"
                ? "Harvested crop"
                : `Upcoming harvest · ${dateLabel(selectedCrop.expectedHarvestDate)}`}
            </AppText>
          </View>
          {!editingListing ? (
            <Pressable onPress={() => setStep("CROP")}>
              <AppText className="text-[10px] font-bold text-[#C8FF67]">
                Change
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle
          title="Product details"
          subtitle="Set the pack size, quantity and price buyers will see."
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label="Pack size"
              value={draft.packSizeValue}
              onChangeText={(value) => changeDraft({ packSizeValue: value })}
              placeholder="e.g. 250"
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1 gap-1.5">
            <AppText className="text-[11px] font-semibold text-[#A0ADA1]">
              Unit
            </AppText>
            <View className="flex-row flex-wrap gap-1.5">
              {(["G", "KG", "PCS", "BUNCH", "BOX", "PACK"] as PackUnit[]).map(
                (unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => changeDraft({ packSizeUnit: unit })}
                    className={`rounded-[9px] border px-2.5 py-2.5 ${draft.packSizeUnit === unit ? "border-[#718F38] bg-[#1A2A1D]" : "border-[#2C382E] bg-[#0F130F]"}`}
                  >
                    <AppText
                      className={`text-[10px] font-bold ${draft.packSizeUnit === unit ? "text-[#C8FF67]" : "text-[#A0ADA1]"}`}
                    >
                      {unit}
                    </AppText>
                  </Pressable>
                ),
              )}
            </View>
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label="Price per pack"
              value={draft.basePrice}
              onChangeText={(value) => changeDraft({ basePrice: value })}
              placeholder="₹ 0.00"
              keyboardType="decimal-pad"
              helper="Original price before discount"
            />
          </View>
          <View className="flex-1">
            <Field
              label="Discount"
              value={draft.discountPercent}
              onChangeText={(value) => changeDraft({ discountPercent: value })}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="%"
              helper="Enter 0 if not discounted"
            />
          </View>
        </View>
        <View className="rounded-[12px] border border-[#2C382E] bg-[#141815] p-3">
          <AppText className="text-[10px] text-[#A0ADA1]">
            Selling price per pack
          </AppText>
          <AppText className="mt-1 text-[22px] font-extrabold text-[#C8FF67]">
            {isPositive(draft.basePrice) &&
            isNonNegative(draft.discountPercent) &&
            Number(draft.discountPercent) <= 100
              ? money(
                  Number(draft.basePrice) *
                    (1 - Number(draft.discountPercent) / 100),
                )
              : "—"}
          </AppText>
          <AppText className="mt-0.5 text-[10px] text-[#748176]">
            Calculated from the price and discount you enter.
          </AppText>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label="Available quantity"
              value={draft.quantityAvailable}
              onChangeText={(value) =>
                changeDraft({ quantityAvailable: value })
              }
              placeholder="e.g. 20"
              keyboardType="number-pad"
              helper="Number of packs in stock"
            />
          </View>
          <View className="flex-1">
            <Field
              label="Minimum order"
              value={draft.minOrderQuantity}
              onChangeText={(value) => changeDraft({ minOrderQuantity: value })}
              placeholder="1"
              keyboardType="number-pad"
              helper="Packs per order"
            />
          </View>
        </View>
        <Field
          label="Maximum order (optional)"
          value={draft.maxOrderQuantity}
          onChangeText={(value) => changeDraft({ maxOrderQuantity: value })}
          placeholder="Leave empty for no separate limit"
          keyboardType="number-pad"
          helper="Cannot exceed the available quantity."
        />
      </View>

      <View className="gap-3">
        <SectionTitle
          title="Crop photo"
          subtitle="A clear photo helps buyers understand what they are ordering."
        />
        {draft.imageUrl ? (
          <View className="overflow-hidden rounded-[13px] border border-[#2C382E] bg-[#141815]">
            <Image
              source={{ uri: draft.imageUrl }}
              resizeMode="cover"
              className="h-[165px] w-full"
            />
            <View className="flex-row gap-2 p-2.5">
              <Pressable
                onPress={() => void pickPhoto()}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#222A23] py-2.5"
              >
                <Feather name="image" size={13} color={C.text} />
                <AppText className="text-[10px] font-bold text-[#F4F7F1]">
                  Change photo
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPendingImage(null);
                  changeDraft({
                    imageUrl: "",
                    imageFileId: "",
                    imageSizeBytes: "",
                  });
                }}
                className="flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#321D1B] px-3 py-2.5"
              >
                <Feather name="trash-2" size={13} color={C.red} />
                <AppText className="text-[10px] font-bold text-[#FF8178]">
                  Remove
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => void pickPhoto()}
            className="flex-row items-center gap-3 rounded-[13px] border border-dashed border-[#3A493C] bg-[#141815] p-4"
          >
            <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#202A19]">
              <Feather name="camera" size={17} color={C.lime} />
            </View>
            <View className="min-w-0 flex-1">
              <AppText className="text-[12px] font-bold text-[#F4F7F1]">
                Add crop photo
              </AppText>
              <AppText className="mt-1 text-[10px] text-[#A0ADA1]">
                Optional · Choose an image from your gallery
              </AppText>
            </View>
            <Feather name="chevron-right" size={16} color={C.muted} />
          </Pressable>
        )}
        <Field
          label="Description (optional)"
          value={draft.description}
          onChangeText={(value) => changeDraft({ description: value })}
          placeholder="Growing method, freshness, pack contents…"
          multiline
          maxLength={2000}
          helper={`${draft.description.length}/2000 characters`}
        />
      </View>
    </View>
  );

  const renderFulfilmentStep = () => (
    <View className="gap-4">
      <View className="rounded-[13px] border border-[#2C382E] bg-[#141815] p-3.5">
        <View className="flex-row items-start gap-2">
          <Feather name="truck" size={15} color={C.lime} />
          <View className="min-w-0 flex-1">
            <AppText className="text-[12px] font-bold text-[#F4F7F1]">
              How can buyers receive this crop?
            </AppText>
            <AppText className="mt-1 text-[10px] leading-4 text-[#A0ADA1]">
              Select at least one option. Delivery fees and delivery radius are
              saved with the listing.
            </AppText>
          </View>
        </View>
      </View>
      <View className="gap-2">
        <Pressable
          onPress={() => changeDraft({ customerPickup: !draft.customerPickup })}
          className={`flex-row items-center gap-3 rounded-[13px] border p-3.5 ${draft.customerPickup ? "border-[#718F38] bg-[#1A2A1D]" : "border-[#2C382E] bg-[#141815]"}`}
        >
          <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#202A19]">
            <Feather name="map-pin" size={17} color={C.lime} />
          </View>
          <View className="min-w-0 flex-1">
            <AppText className="text-[12px] font-bold text-[#F4F7F1]">
              Customer pickup
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#A0ADA1]">
              Buyer collects the order from your selected location.
            </AppText>
          </View>
          <View
            className={`h-5 w-5 items-center justify-center rounded-full border ${draft.customerPickup ? "border-[#C8FF67] bg-[#C8FF67]" : "border-[#526052]"}`}
          >
            {draft.customerPickup ? (
              <Feather name="check" size={12} color={C.bg} />
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={() => changeDraft({ sellerDelivery: !draft.sellerDelivery })}
          className={`flex-row items-center gap-3 rounded-[13px] border p-3.5 ${draft.sellerDelivery ? "border-[#718F38] bg-[#1A2A1D]" : "border-[#2C382E] bg-[#141815]"}`}
        >
          <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#202A19]">
            <Feather name="truck" size={17} color={C.lime} />
          </View>
          <View className="min-w-0 flex-1">
            <AppText className="text-[12px] font-bold text-[#F4F7F1]">
              Seller delivery
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#A0ADA1]">
              You deliver within the radius you set.
            </AppText>
          </View>
          <View
            className={`h-5 w-5 items-center justify-center rounded-full border ${draft.sellerDelivery ? "border-[#C8FF67] bg-[#C8FF67]" : "border-[#526052]"}`}
          >
            {draft.sellerDelivery ? (
              <Feather name="check" size={12} color={C.bg} />
            ) : null}
          </View>
        </Pressable>
      </View>
      {draft.sellerDelivery ? (
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label="Delivery radius"
              value={draft.deliveryRadiusKm}
              onChangeText={(value) => changeDraft({ deliveryRadiusKm: value })}
              placeholder="5"
              keyboardType="decimal-pad"
              suffix="km"
            />
          </View>
          <View className="flex-1">
            <Field
              label="Delivery fee"
              value={draft.deliveryFee}
              onChangeText={(value) => changeDraft({ deliveryFee: value })}
              placeholder="0"
              keyboardType="decimal-pad"
              suffix="₹"
              helper="Fee charged per order"
            />
          </View>
        </View>
      ) : (
        <Field
          label="Delivery fee"
          value={draft.deliveryFee}
          onChangeText={(value) => changeDraft({ deliveryFee: value })}
          placeholder="0"
          keyboardType="decimal-pad"
          suffix="₹"
          helper="Used only when seller delivery is selected."
        />
      )}
      <View className="gap-2">
        <SectionTitle
          title="Pickup / dispatch location"
          subtitle="Choose one of your saved marketplace locations."
        />
        {locations.length ? (
          locations.map((location) => {
            const selected = draft.sellerLocationId === location.id;
            return (
              <Pressable
                key={location.id}
                onPress={() => changeDraft({ sellerLocationId: location.id })}
                className={`flex-row items-center gap-3 rounded-[13px] border p-3 ${selected ? "border-[#718F38] bg-[#1A2A1D]" : "border-[#2C382E] bg-[#141815]"}`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#202A19]">
                  <Feather
                    name={location.isDefault ? "home" : "map-pin"}
                    size={15}
                    color={C.lime}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <AppText className="text-[12px] font-bold text-[#F4F7F1]">
                      {location.label}
                    </AppText>
                    {location.isDefault ? (
                      <AppText className="rounded bg-[#2A391F] px-1.5 py-0.5 text-[8px] font-bold text-[#C8FF67]">
                        DEFAULT
                      </AppText>
                    ) : null}
                  </View>
                  <AppText
                    className="mt-1 text-[10px] leading-4 text-[#A0ADA1]"
                    numberOfLines={2}
                  >
                    {location.address}
                  </AppText>
                </View>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#C8FF67] bg-[#C8FF67]" : "border-[#526052]"}`}
                >
                  {selected ? (
                    <Feather name="check" size={12} color={C.bg} />
                  ) : null}
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="rounded-[13px] border border-dashed border-[#3A493C] bg-[#141815] p-4">
            <AppText className="text-[12px] font-bold text-[#F4F7F1]">
              No saved locations
            </AppText>
            <AppText className="mt-1 text-[10px] leading-4 text-[#A0ADA1]">
              Add a seller location before publishing this listing.
            </AppText>
            <Pressable
              onPress={() => {
                Alert.alert(
                  "Add a seller location",
                  "You will open the saved location page. Return here after saving your address.",
                  [
                    { text: "Stay here", style: "cancel" },
                    {
                      text: "Open locations",
                      onPress: () => {
                        setFormVisible(false);
                        router.push("/market/location" as any);
                      },
                    },
                  ],
                );
              }}
              className="mt-3 self-start rounded-[10px] bg-[#222A23] px-3 py-2"
            >
              <AppText className="text-[10px] font-bold text-[#C8FF67]">
                Manage locations
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
      <View className="rounded-[14px] border border-[#2C382E] bg-[#141815] p-3.5">
        <AppText className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#A0ADA1]">
          Listing preview
        </AppText>
        <View className="mt-2 flex-row items-end justify-between gap-3">
          <View className="min-w-0 flex-1">
            <AppText className="text-[15px] font-bold text-[#F4F7F1]">
              {selectedCrop?.cropName ?? "Your crop"}
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#A0ADA1]">
              {draft.packSizeValue || "—"} {draft.packSizeUnit} ·{" "}
              {draft.quantityAvailable || "—"} packs available
            </AppText>
          </View>
          <AppText className="text-[20px] font-extrabold text-[#C8FF67]">
            {isPositive(draft.basePrice) && isNonNegative(draft.discountPercent)
              ? money(
                  Number(draft.basePrice) *
                    (1 - Number(draft.discountPercent) / 100),
                )
              : "—"}
          </AppText>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {draft.customerPickup ? (
            <View className="rounded-full bg-[#202A19] px-2.5 py-1">
              <AppText className="text-[9px] font-semibold text-[#C8FF67]">
                Customer pickup
              </AppText>
            </View>
          ) : null}
          {draft.sellerDelivery ? (
            <View className="rounded-full bg-[#202A19] px-2.5 py-1">
              <AppText className="text-[9px] font-semibold text-[#C8FF67]">
                Delivery · {draft.deliveryRadiusKm} km
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );

  const renderOrderDetails = () => {
    if (!selectedOrder)
      return (
        <View className="items-center py-8">
          <ActivityIndicator color={C.lime} />
        </View>
      );
    const order = selectedOrder;
    const canCancel = [
      "PENDING_PAYMENT",
      "PLACED",
      "ACCEPTED",
      "PREPARING",
    ].includes(order.status);
    const actions = orderActions(order);
    return (
      <View className="gap-4">
        {orderError ? (
          <View className="rounded-[12px] bg-[#321D1B] p-3">
            <AppText className="text-[11px] leading-4 text-[#FF8178]">
              {orderError}
            </AppText>
          </View>
        ) : null}
        <View className="rounded-[15px] border border-[#2C382E] bg-[#141815] p-3.5">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <AppText className="text-[16px] font-bold text-[#F4F7F1]">
                {order.cropName}
              </AppText>
              <AppText className="mt-1 text-[10px] text-[#A0ADA1]">
                Order {order.orderNumber}
              </AppText>
            </View>
            <View className="items-end">
              <AppText className="text-[19px] font-extrabold text-[#C8FF67]">
                {money(order.totalAmount)}
              </AppText>
              <AppText className="mt-1 text-[9px] text-[#A0ADA1]">
                {statusLabel(order.status)}
              </AppText>
            </View>
          </View>
          <View className="mt-3 flex-row justify-between border-t border-[#263128] pt-3">
            <View>
              <AppText className="text-[9px] text-[#748176]">QUANTITY</AppText>
              <AppText className="mt-1 text-[11px] font-bold text-[#F4F7F1]">
                {order.quantity} × {order.packSizeValue} {order.packSizeUnit}
              </AppText>
            </View>
            <View>
              <AppText className="text-[9px] text-[#748176]">PAYMENT</AppText>
              <AppText className="mt-1 text-[11px] font-bold text-[#F4F7F1]">
                {statusLabel(order.paymentStatus)}
              </AppText>
            </View>
            <View>
              <AppText className="text-[9px] text-[#748176]">METHOD</AppText>
              <AppText className="mt-1 text-[11px] font-bold text-[#F4F7F1]">
                {order.paymentMethod}
              </AppText>
            </View>
          </View>
        </View>
        <View className="gap-2">
          <SectionTitle title="Buyer and fulfilment" />
          <View className="rounded-[13px] border border-[#2C382E] bg-[#141815] p-3.5">
            <View className="flex-row items-center gap-2">
              <Feather name="user" size={14} color={C.lime} />
              <AppText className="text-[12px] font-bold text-[#F4F7F1]">
                {order.buyer?.username ?? "Buyer"}
              </AppText>
            </View>
            {order.buyer?.phoneNo ? (
              <AppText className="mt-1 text-[11px] text-[#A0ADA1]">
                {order.buyer.countryCode ?? ""}
                {order.buyer.phoneNo}
              </AppText>
            ) : null}
            <View className="mt-3 flex-row items-start gap-2">
              <Feather name="map-pin" size={14} color={C.muted} />
              <View className="min-w-0 flex-1">
                <AppText className="text-[11px] font-bold text-[#F4F7F1]">
                  {order.fulfillmentType === "SELLER_DELIVERY"
                    ? "Delivery address"
                    : "Buyer pickup"}
                </AppText>
                <AppText className="mt-1 text-[10px] leading-4 text-[#A0ADA1]">
                  {order.buyerLocation?.address ??
                    order.buyerAddressSnapshot ??
                    "No address details returned."}
                </AppText>
              </View>
            </View>
          </View>
        </View>
        {order.tracking ? (
          <View className="rounded-[13px] border border-[#2C382E] bg-[#141815] p-3.5">
            <View className="flex-row items-center gap-2">
              <Feather name="navigation" size={15} color={C.lime} />
              <AppText className="text-[12px] font-bold text-[#F4F7F1]">
                Delivery tracking
              </AppText>
            </View>
            <AppText className="mt-2 text-[10px] leading-4 text-[#A0ADA1]">
              {order.tracking.isActive
                ? "Live tracking is active."
                : order.tracking.reachedAt
                  ? "Buyer reached."
                  : "Tracking details are available for this order."}
              {order.tracking.distanceRemainingKm != null
                ? ` Approx. ${Number(order.tracking.distanceRemainingKm).toFixed(2)} km remaining.`
                : ""}
              {order.tracking.etaMinutes != null
                ? ` ETA ${order.tracking.etaMinutes} min.`
                : ""}
            </AppText>
          </View>
        ) : null}
        {order.payments?.length ? (
          <View className="gap-2">
            <SectionTitle title="Payment history" />
            {order.payments.map((payment) => (
              <View
                key={payment.id}
                className="flex-row items-center justify-between rounded-[11px] border border-[#2C382E] bg-[#141815] p-3"
              >
                <View>
                  <AppText className="text-[11px] font-bold text-[#F4F7F1]">
                    {statusLabel(payment.kind)}
                  </AppText>
                  <AppText className="mt-1 text-[9px] text-[#A0ADA1]">
                    {statusLabel(payment.status)}
                  </AppText>
                </View>
                <AppText className="text-[12px] font-bold text-[#F4F7F1]">
                  {money(payment.amount)}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
        {actions.length ? (
          <View className="gap-2">
            <SectionTitle
              title="Next step"
              subtitle="The actions below are enabled according to the order status returned by the server."
            />
            {actions.map((action) => (
              <PrimaryButton
                key={action.label}
                label={action.label}
                icon={action.icon}
                onPress={action.run}
                loading={orderBusy}
                disabled={orderBusy}
              />
            ))}
          </View>
        ) : null}
        {canCancel ? (
          <Pressable
            onPress={() => cancelOrder(order)}
            disabled={orderBusy}
            className="min-h-[44px] items-center justify-center rounded-[12px] border border-[#59302C] bg-[#241512]"
          >
            <AppText className="text-[11px] font-bold text-[#FF8178]">
              Cancel order
            </AppText>
          </Pressable>
        ) : null}
        {["COMPLETED", "CANCELLED"].includes(order.status) ? (
          <View className="flex-row items-center gap-2 rounded-[12px] bg-[#1A2A1D] p-3">
            <Feather name="check-circle" size={15} color={C.lime} />
            <AppText className="text-[11px] text-[#D7E9D4]">
              This order is {statusLabel(order.status).toLowerCase()}.
            </AppText>
          </View>
        ) : null}
      </View>
    );
  };

  const detailFooter = selectedOrder ? (
    <View className="flex-row gap-2">
      <View className="flex-1">
        <PrimaryButton
          label="Refresh order"
          icon="refresh-cw"
          tone="muted"
          onPress={() => {
            setOrderBusy(true);
            void refreshOrder(selectedOrder.id)
              .catch((e) => setOrderError(errorMessage(e)))
              .finally(() => setOrderBusy(false));
          }}
          loading={orderBusy}
        />
      </View>
      <View className="flex-1">
        <PrimaryButton
          label="Done"
          onPress={attemptCloseOrder}
          disabled={orderBusy}
        />
      </View>
    </View>
  ) : null;

  const formTitle =
    step === "CROP"
      ? "Choose a crop"
      : step === "DETAILS"
        ? editingListing
          ? "Edit listing"
          : "Listing details"
        : "Fulfilment & publish";
  const formSubtitle =
    step === "CROP"
      ? "Pick one of your actual grow records."
      : step === "DETAILS"
        ? "Keep it simple: pack, price, quantity and photo."
        : "Choose a saved location and delivery options.";
  const formFooter = (
    <View className="flex-row gap-2">
      {step !== "CROP" ? (
        <View className="w-[100px]">
          <PrimaryButton
            label="Back"
            icon="arrow-left"
            tone="muted"
            onPress={() => setStep(step === "FULFILMENT" ? "DETAILS" : "CROP")}
          />
        </View>
      ) : (
        <View className="w-[100px]">
          <PrimaryButton
            label="Cancel"
            tone="muted"
            onPress={attemptCloseForm}
          />
        </View>
      )}
      <View className="flex-1">
        {step === "CROP" ? (
          <PrimaryButton
            label="Continue"
            icon="arrow-right"
            onPress={() => {
              if (!selectedCrop || !draft.cropCycleId) {
                Alert.alert(
                  "Choose a crop",
                  "Select the crop you want to list.",
                );
                return;
              }
              setStep("DETAILS");
            }}
            disabled={!selectedCrop}
          />
        ) : step === "DETAILS" ? (
          <PrimaryButton
            label="Delivery options"
            icon="arrow-right"
            onPress={() => {
              const error = validateDetails();
              if (error) {
                Alert.alert("Check listing details", error);
                return;
              }
              setStep("FULFILMENT");
            }}
          />
        ) : (
          <PrimaryButton
            label={
              savingListing
                ? "Saving listing…"
                : editingListing && editingListing.status !== "REMOVED"
                  ? "Save changes"
                  : "Publish listing"
            }
            icon="check"
            onPress={() => void submitListing()}
            loading={savingListing}
            disabled={savingListing || photoBusy}
          />
        )}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-[#0B0D0B]">
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top }} />
      <View className="flex-row items-center gap-3 border-b border-[#202A22] px-4 pb-4 pt-2">
        <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#202A19]">
          <Ionicons name="leaf" size={21} color={C.lime} />
        </View>
        <View className="min-w-0 flex-1">
          <AppText className="text-[22px] font-extrabold text-[#F4F7F1]">
            Sell your harvest
          </AppText>
          <AppText className="mt-0.5 text-[10px] text-[#A0ADA1]">
            Manage listings, orders and fulfilment.
          </AppText>
        </View>
        <Pressable
          onPress={() => {
            setRefreshing(true);
            void loadAll(true);
          }}
          className="h-10 w-10 items-center justify-center rounded-full border border-[#2C382E] bg-[#141815]"
        >
          <Feather name="refresh-cw" size={16} color={C.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.lime}
            colors={[C.lime]}
            onRefresh={() => {
              setRefreshing(true);
              void loadAll(true);
            }}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
      >
        <View className="overflow-hidden rounded-[19px] border border-[#304331] bg-[#142019] p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <View className="self-start rounded-full bg-[#263B28] px-2.5 py-1">
                <AppText className="text-[9px] font-bold tracking-[0.6px] text-[#C8FF67]">
                  GROW · LIST · EARN
                </AppText>
              </View>
              <AppText className="mt-3 text-[20px] font-extrabold leading-6 text-[#F4F7F1]">
                From your rack to nearby buyers.
              </AppText>
              <AppText className="mt-1.5 text-[11px] leading-4 text-[#A0ADA1]">
                Create a listing from your grow records and manage every order
                in one place.
              </AppText>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-[15px] bg-[#263B28]">
              <Feather name="trending-up" size={22} color={C.lime} />
            </View>
          </View>
          <PrimaryButton
            label="List a crop"
            icon="plus"
            tone="lime"
            onPress={startNewListing}
          />
        </View>

        <View className="mt-3 flex-row gap-2">
          {[
            {
              label: "Active listings",
              value: String(activeListings),
              icon: "package" as const,
            },
            {
              label: "Open orders",
              value: String(openOrders),
              icon: "shopping-bag" as const,
            },
            {
              label: "Payments received",
              value: money(completedRevenue),
              icon: "credit-card" as const,
            },
          ].map((item) => (
            <View
              key={item.label}
              className="min-w-0 flex-1 rounded-[13px] border border-[#2C382E] bg-[#141815] p-3"
            >
              <Feather name={item.icon} size={14} color={C.lime} />
              <AppText
                className="mt-2 text-[15px] font-extrabold text-[#F4F7F1]"
                numberOfLines={1}
              >
                {item.value}
              </AppText>
              <AppText className="mt-1 text-[9px] leading-3 text-[#A0ADA1]">
                {item.label}
              </AppText>
            </View>
          ))}
        </View>

        <View className="mt-5 flex-row rounded-[13px] bg-[#1B211C] p-1">
          <Pressable
            onPress={() => setTab("LISTINGS")}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-[10px] py-2.5 ${tab === "LISTINGS" ? "bg-[#303B30]" : ""}`}
          >
            <Feather
              name="layers"
              size={14}
              color={tab === "LISTINGS" ? C.lime : C.muted}
            />
            <AppText
              className={`text-[11px] font-bold ${tab === "LISTINGS" ? "text-[#F4F7F1]" : "text-[#A0ADA1]"}`}
            >
              My listings (
              {listings.filter((item) => item.status !== "REMOVED").length})
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setTab("ORDERS")}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-[10px] py-2.5 ${tab === "ORDERS" ? "bg-[#303B30]" : ""}`}
          >
            <Feather
              name="shopping-bag"
              size={14}
              color={tab === "ORDERS" ? C.lime : C.muted}
            />
            <AppText
              className={`text-[11px] font-bold ${tab === "ORDERS" ? "text-[#F4F7F1]" : "text-[#A0ADA1]"}`}
            >
              Selling orders ({orders.length})
            </AppText>
          </Pressable>
        </View>

        {error ? (
          <View className="mt-4 rounded-[13px] border border-[#59302C] bg-[#241512] p-3">
            <View className="flex-row items-start gap-2">
              <Feather name="alert-circle" size={15} color={C.red} />
              <View className="min-w-0 flex-1">
                <AppText className="text-[11px] font-bold text-[#FF8178]">
                  Could not refresh seller data
                </AppText>
                <AppText className="mt-1 text-[10px] leading-4 text-[#E5B1AD]">
                  {error}
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={() => void loadAll()}
              className="mt-3 self-start rounded-[9px] bg-[#321D1B] px-3 py-2"
            >
              <AppText className="text-[10px] font-bold text-[#FF8178]">
                Try again
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color={C.lime} size="large" />
            <AppText className="mt-3 text-[11px] text-[#A0ADA1]">
              Loading your seller workspace…
            </AppText>
          </View>
        ) : tab === "LISTINGS" ? (
          <View className="mt-5">
            <View className="mb-3 flex-row items-end justify-between gap-2">
              <View className="min-w-0 flex-1">
                <AppText className="text-[17px] font-extrabold text-[#F4F7F1]">
                  Your listings
                </AppText>
                <AppText className="mt-1 text-[10px] text-[#A0ADA1]">
                  Update pricing and availability at any time.
                </AppText>
              </View>
              <Pressable
                onPress={startNewListing}
                className="flex-row items-center gap-1 rounded-[10px] bg-[#C8FF67] px-3 py-2"
              >
                <Feather name="plus" size={13} color={C.bg} />
                <AppText className="text-[10px] font-extrabold text-[#0B0D0B]">
                  Add crop
                </AppText>
              </Pressable>
            </View>
            {listings.length === 0 ? (
              <View className="items-center rounded-[16px] border border-dashed border-[#3A493C] bg-[#141815] px-6 py-9">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-[15px] bg-[#202A19]">
                  <Ionicons name="basket-outline" size={24} color={C.lime} />
                </View>
                <AppText className="text-[14px] font-bold text-[#F4F7F1]">
                  No listings yet
                </AppText>
                <AppText className="mt-1 text-center text-[11px] leading-4 text-[#A0ADA1]">
                  Create a listing using crops already recorded in your grow
                  racks.
                </AppText>
                <View className="mt-4 w-full">
                  <PrimaryButton
                    label="Create your first listing"
                    icon="arrow-right"
                    onPress={startNewListing}
                  />
                </View>
              </View>
            ) : (
              listings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onEdit={() => beginEditListing(listing)}
                  onToggle={() => toggleListingStatus(listing)}
                  onRemove={() => removeListing(listing)}
                  onRelist={() => beginEditListing(listing, true)}
                  busy={actionBusy}
                />
              ))
            )}
            <View className="mt-2 rounded-[13px] border border-[#2C382E] bg-[#111611] p-3">
              <View className="flex-row items-start gap-2">
                <Feather name="shield-check" size={14} color={C.muted} />
                <AppText className="min-w-0 flex-1 text-[10px] leading-4 text-[#748176]">
                  Available crops, stock, listing status, order counts and
                  seller locations are loaded from your marketplace API. Server
                  validation is applied when saving.
                </AppText>
              </View>
            </View>
          </View>
        ) : (
          <View className="mt-5">
            <View className="mb-3">
              <AppText className="text-[17px] font-extrabold text-[#F4F7F1]">
                Selling orders
              </AppText>
              <AppText className="mt-1 text-[10px] text-[#A0ADA1]">
                Accept orders, prepare them, track deliveries and record
                payment.
              </AppText>
            </View>
            {orders.length === 0 ? (
              <View className="items-center rounded-[16px] border border-dashed border-[#3A493C] bg-[#141815] px-6 py-9">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-[15px] bg-[#202A19]">
                  <Feather name="shopping-bag" size={22} color={C.lime} />
                </View>
                <AppText className="text-[14px] font-bold text-[#F4F7F1]">
                  No customer orders yet
                </AppText>
                <AppText className="mt-1 text-center text-[11px] leading-4 text-[#A0ADA1]">
                  Orders placed for your active listings will appear here.
                </AppText>
              </View>
            ) : (
              orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => void openOrder(order)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Drawer
        visible={formVisible}
        title={formTitle}
        subtitle={formSubtitle}
        insets={insets}
        onClose={attemptCloseForm}
        onRequestClose={attemptCloseForm}
        footer={formFooter}
      >
        {step === "CROP"
          ? renderCropPicker()
          : step === "DETAILS"
            ? renderDetailsStep()
            : renderFulfilmentStep()}
      </Drawer>

      <Drawer
        visible={orderVisible}
        title={
          selectedOrder ? `Order ${selectedOrder.orderNumber}` : "Order details"
        }
        subtitle="Order details and seller actions"
        insets={insets}
        onRequestClose={attemptCloseOrder}
        onClose={attemptCloseOrder}
        footer={detailFooter}
      >
        {orderBusy && !selectedOrder ? (
          <View className="items-center py-10">
            <ActivityIndicator color={C.lime} />
            <AppText className="mt-2 text-[10px] text-[#A0ADA1]">
              Loading order details…
            </AppText>
          </View>
        ) : (
          renderOrderDetails()
        )}
      </Drawer>
    </View>
  );
}
