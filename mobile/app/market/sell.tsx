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
  bg: "#F5F7F5",
  surface: "#FFFFFF",
  surface2: "#F7F9F7",
  surface3: "#EDF2ED",
  border: "#E1E8E2",
  text: "#172019",
  muted: "#68756B",
  subtle: "#818C83",
  lime: "#2F7D4E",
  green: "#2F7D4E",
  greenSoft: "#E5F3E7",
  red: "#C53D38",
  redSoft: "#FCEBE9",
  amber: "#946200",
  amberSoft: "#FFF1D9",
  blue: "#426FBA",
  blueSoft: "#EAF1FC",
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
  const publicKey = IMAGEKIT_PUBLIC_KEY.trim();
  const configuredEndpoint = IMAGEKIT_AUTH_ENDPOINT.trim();

  if (!publicKey || !configuredEndpoint) {
    throw new Error(
      "Photo upload is not configured. Set EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY and EXPO_PUBLIC_IMAGEKIT_AUTH_ENDPOINT in your app environment, then restart Expo.",
    );
  }

  // Keep the authorization contract used by market.tsx, while safely
  // accepting absolute URLs, /user/... paths, and /api/... paths.
  const apiBase = API_URL.replace(/\/+$/, "");
  const cleanEndpoint = configuredEndpoint.replace(/^\/+/, "");
  let endpoint: string;
  if (/^https?:\/\//i.test(configuredEndpoint)) {
    endpoint = configuredEndpoint;
  } else if (/^api\//i.test(cleanEndpoint) && /\/api$/i.test(apiBase)) {
    // Avoid accidentally producing /api/api/... when the env already includes /api.
    endpoint = `${apiBase.slice(0, -4)}/${cleanEndpoint}`;
  } else {
    endpoint = `${apiBase}/${cleanEndpoint}`;
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error(
      "Your session is missing or expired, so the photo authorization request cannot be authenticated. Sign in again and retry.",
    );
  }

  const authResponse = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  const authText = await authResponse.text();
  let auth: any = null;
  try {
    auth = authText ? JSON.parse(authText) : null;
  } catch {
    auth = null;
  }

  if (!authResponse.ok) {
    const detail =
      auth?.message ??
      auth?.error ??
      (authText && !authText.trim().startsWith("<")
        ? authText.trim().slice(0, 180)
        : "The server did not return a JSON error message.");
    throw new Error(
      `ImageKit authorization failed (HTTP ${authResponse.status}). ${detail} Check EXPO_PUBLIC_IMAGEKIT_AUTH_ENDPOINT and confirm its backend route is reachable by an authenticated user.`,
    );
  }

  if (
    !auth ||
    typeof auth.token !== "string" ||
    !auth.token ||
    typeof auth.signature !== "string" ||
    !auth.signature ||
    auth.expire === undefined ||
    auth.expire === null ||
    String(auth.expire).length === 0
  ) {
    throw new Error(
      "The photo authorization endpoint responded, but did not return the required token, signature, and expire fields. Return these fields from the ImageKit authentication endpoint.",
    );
  }

  const form = new FormData();
  form.append("file", {
    uri: image.uri,
    name: image.name || `marketplace-${Date.now()}.jpg`,
    type: image.mimeType || "image/jpeg",
  } as any);
  form.append("fileName", image.name || `marketplace-${Date.now()}.jpg`);
  form.append("publicKey", publicKey);
  form.append("signature", auth.signature);
  form.append("expire", String(auth.expire));
  form.append("token", auth.token);

  const uploadResponse = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    body: form,
  });
  const uploadText = await uploadResponse.text();
  let result: any = null;
  try {
    result = uploadText ? JSON.parse(uploadText) : null;
  } catch {
    result = null;
  }

  if (!uploadResponse.ok || !result?.url) {
    const detail =
      result?.message ??
      result?.help ??
      (uploadText && !uploadText.trim().startsWith("<")
        ? uploadText.trim().slice(0, 180)
        : "ImageKit did not return a usable upload URL.");
    throw new Error(
      `Photo upload failed (HTTP ${uploadResponse.status}). ${detail}`,
    );
  }

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
      <AppText className="text-[11px] font-semibold text-[#69766D]">
        {label}
      </AppText>
      <View
        className={`flex-row items-center rounded-[12px] border border-[#E1E8E2] bg-[#FFFFFF] px-3 ${multiline ? "items-start" : ""}`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#89958B"
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          selectionColor={C.lime}
          textAlignVertical={multiline ? "top" : "center"}
          className={`min-w-0 flex-1 py-3 text-[13px] text-[#171D18] ${multiline ? "min-h-[86px]" : ""}`}
        />
        {suffix ? (
          <AppText className="pl-2 text-[11px] text-[#7A877D]">
            {suffix}
          </AppText>
        ) : null}
      </View>
      {helper ? (
        <AppText className="text-[10px] leading-4 text-[#7A877D]">
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
      <AppText className="text-[16px] font-bold text-[#171D18]">
        {title}
      </AppText>
      {subtitle ? (
        <AppText className="text-[11px] leading-4 text-[#69766D]">
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
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View className="flex-1 justify-end bg-[rgba(12,20,14,0.34)]">
        <Pressable
          className="flex-1"
          onPress={onRequestClose}
          accessibilityLabel="Close drawer overlay"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            height: large ? "93%" : undefined,
            maxHeight: "96%",
            width: "100%",
          }}
        >
          <View
            className="flex-1 overflow-hidden rounded-t-[26px] border border-[#E1E8E2] bg-white"
            style={{ paddingBottom: 0 }}
          >
            <View className="items-center pb-2 pt-2.5">
              <View className="h-1 w-10 rounded-full bg-[#D7E0D8]" />
            </View>

            <View className="flex-row items-center gap-3 border-b border-[#E6ECE6] px-4 pb-3 pt-1">
              <View className="min-w-0 flex-1 gap-0.5">
                <AppText className="text-[17px] font-bold text-[#172019]">
                  {title}
                </AppText>
                {subtitle ? (
                  <AppText className="text-[10px] leading-4 text-[#69766D]">
                    {subtitle}
                  </AppText>
                ) : null}
              </View>

              {onClose ? (
                <Pressable
                  onPress={onClose}
                  className="h-9 w-9 items-center justify-center rounded-full border border-[#E1E8E2] bg-[#F5F7F5]"
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Feather name="x" size={17} color={C.text} />
                </Pressable>
              ) : null}
            </View>

            <ScrollView
              className="flex-1"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16, paddingBottom: 18 }}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View
                className="border-t border-[#E6ECE6] bg-white px-4 pt-3"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                {footer}
              </View>
            ) : (
              <View style={{ height: insets.bottom }} />
            )}
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
    <View className="mb-3 overflow-hidden rounded-[17px] border border-[#E1E8E2] bg-[#FFFFFF]">
      <View className="flex-row gap-3 p-3">
        <View className="h-[91px] w-[88px] shrink-0 overflow-hidden rounded-[12px] bg-[#EAF4E4]">
          {listing.imageUrl ? (
            <Image
              source={{ uri: listing.imageUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="leaf-outline" size={29} color={C.lime} />
              <AppText className="mt-1 text-[9px] text-[#69766D]">
                No photo
              </AppText>
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 justify-between gap-2">
          <View className="flex-row items-start gap-2">
            <View className="min-w-0 flex-1 gap-1">
              <AppText
                className="text-[14px] font-bold text-[#171D18]"
                numberOfLines={2}
              >
                {listing.cropName}
              </AppText>
              <AppText className="text-[10px] text-[#69766D]">
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
              <AppText className="text-[18px] font-extrabold text-[#171D18]">
                {money(listing.price)}
              </AppText>
              <AppText className="mt-0.5 text-[10px] text-[#2E7D4F]">
                {listing.quantityAvailable} available ·{" "}
                {listing.orderCount ?? 0} orders
              </AppText>
            </View>
            {discount > 0 ? (
              <View className="rounded-md bg-[#E5F3E4] px-2 py-1">
                <AppText className="text-[9px] font-bold text-[#2F7D4E]">
                  {discount}% OFF
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <View className="flex-row border-t border-[#E6ECE6] p-2.5">
        {isRemoved ? (
          <Pressable
            onPress={onRelist}
            disabled={busy}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#2F7D4E] py-2.5"
          >
            <Feather name="refresh-cw" size={13} color={C.bg} />
            <AppText className="text-[11px] font-bold text-[#F5F7F5]">
              Relist crop
            </AppText>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={onEdit}
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#EDF2ED] py-2.5"
            >
              <Feather name="edit-3" size={13} color={C.text} />
              <AppText className="text-[11px] font-bold text-[#171D18]">
                Edit
              </AppText>
            </Pressable>
            <Pressable
              onPress={onToggle}
              disabled={busy}
              className="ml-2 flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#EDF2ED] py-2.5"
            >
              <Feather
                name={isPaused ? "play" : "pause"}
                size={13}
                color={C.amber}
              />
              <AppText className="text-[11px] font-bold text-[#171D18]">
                {isPaused ? "Resume" : "Pause"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onRemove}
              disabled={busy}
              className="ml-2 h-9 w-10 items-center justify-center rounded-[10px] bg-[#FCEBE9]"
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
      className="mb-3 rounded-[16px] border border-[#E1E8E2] bg-[#FFFFFF] p-3.5"
      style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}
    >
      <View className="flex-row items-start gap-2">
        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#EAF4E4]">
          <Feather name="shopping-bag" size={17} color={C.lime} />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <AppText
            className="text-[13px] font-bold text-[#171D18]"
            numberOfLines={1}
          >
            {order.cropName}
          </AppText>
          <AppText className="text-[10px] text-[#69766D]">
            Order {order.orderNumber} · {order.buyer?.username ?? "Buyer"}
          </AppText>
          <AppText className="text-[10px] text-[#7A877D]">
            {order.quantity} × {order.packSizeValue} {order.packSizeUnit} ·{" "}
            {order.fulfillmentType === "SELLER_DELIVERY"
              ? "Delivery"
              : "Pickup"}
          </AppText>
        </View>
        <View className="items-end gap-1">
          <AppText className="text-[15px] font-extrabold text-[#171D18]">
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
      <View className="mt-3 flex-row items-center justify-between border-t border-[#E6ECE6] pt-2.5">
        <View className="flex-row items-center gap-1.5">
          <Feather
            name={isPaid ? "check-circle" : "clock"}
            size={12}
            color={isPaid ? C.lime : C.amber}
          />
          <AppText className="text-[10px] text-[#69766D]">
            {isPaid
              ? "Payment received"
              : `${order.paymentMethod === "COD" ? "Cash on delivery" : "Online payment"} · ${statusLabel(order.paymentStatus)}`}
          </AppText>
        </View>
        <View className="flex-row items-center gap-1">
          <AppText className="text-[10px] font-bold text-[#2F7D4E]">
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

  // Derive the chart and activity list only from the orders returned by the API.
  const weeklyRevenueBars = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setHours(0, 0, 0, 0);
      date.setDate(today.getDate() - (6 - index));
      const amount = orders.reduce((sum, order) => {
        if (order.paymentStatus !== "PAID" || !order.createdAt) return sum;
        const orderDate = new Date(order.createdAt);
        if (Number.isNaN(orderDate.getTime())) return sum;
        return orderDate.toDateString() === date.toDateString()
          ? sum + Number(order.totalAmount || 0)
          : sum;
      }, 0);
      return {
        key: date.toISOString().slice(0, 10),
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        amount,
      };
    });
    return days;
  }, [orders]);

  const weeklyPaidRevenue = useMemo(
    () => weeklyRevenueBars.reduce((sum, day) => sum + day.amount, 0),
    [weeklyRevenueBars],
  );

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort((a, b) => {
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 3),
    [orders],
  );

  const maxWeeklyRevenue = Math.max(
    1,
    ...weeklyRevenueBars.map((day) => day.amount),
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
      <View className="rounded-[13px] border border-[#E1E8E2] bg-[#FFFFFF] px-3.5 py-3">
        <View className="flex-row items-start gap-2">
          <Feather name="info" size={14} color={C.lime} />
          <AppText className="min-w-0 flex-1 text-[10px] leading-4 text-[#69766D]">
            Choose a crop from your active grow racks. Crop name and harvest
            status come from your crop records.
          </AppText>
        </View>
      </View>
      {loading ? (
        <View className="items-center py-10">
          <ActivityIndicator color={C.lime} />
          <AppText className="mt-2 text-[11px] text-[#69766D]">
            Loading your crops…
          </AppText>
        </View>
      ) : availableCrops.length === 0 ? (
        <View className="items-center rounded-[16px] border border-dashed border-[#C9D9CC] px-6 py-9">
          <View className="mb-3 h-12 w-12 items-center justify-center rounded-[15px] bg-[#EAF4E4]">
            <Ionicons name="leaf-outline" size={24} color={C.lime} />
          </View>
          <AppText className="text-[14px] font-bold text-[#171D18]">
            No sellable crops yet
          </AppText>
          <AppText className="mt-1 text-center text-[11px] leading-4 text-[#69766D]">
            Your GROWING, READY, and HARVESTED crops will appear here.
          </AppText>
          <Pressable
            onPress={() => void loadAll()}
            className="mt-4 rounded-[10px] bg-[#EDF2ED] px-3 py-2"
          >
            <AppText className="text-[11px] font-bold text-[#2F7D4E]">
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
              className={`flex-row items-center gap-3 rounded-[14px] border p-3.5 ${chosen ? "border-[#4A8154] bg-[#E6F3E7]" : "border-[#E1E8E2] bg-[#FFFFFF]"}`}
            >
              <View
                className={`h-11 w-11 items-center justify-center rounded-[12px] ${chosen ? "bg-[#E0F0E0]" : "bg-[#EAF4E4]"}`}
              >
                <Ionicons
                  name="leaf-outline"
                  size={21}
                  color={chosen ? C.lime : C.muted}
                />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <AppText className="text-[13px] font-bold text-[#171D18]">
                  {crop.cropName}
                </AppText>
                <AppText className="text-[10px] text-[#69766D]">
                  {crop.rack?.name ?? "Grow rack"}
                  {crop.row?.name ? ` · ${crop.row.name}` : ""}
                  {crop.tray?.name ? ` · ${crop.tray.name}` : ""}
                </AppText>
                <View className="flex-row flex-wrap items-center gap-1.5">
                  <View className="rounded-full bg-[#EAF4E4] px-2 py-1">
                    <AppText className="text-[9px] font-bold text-[#2F7D4E]">
                      {statusLabel(crop.status)}
                    </AppText>
                  </View>
                  {crop.selling?.hasListing ? (
                    <View className="rounded-full bg-[#FFF1D9] px-2 py-1">
                      <AppText className="text-[9px] font-bold text-[#946200]">
                        Already listed
                      </AppText>
                    </View>
                  ) : null}
                  {cropType === "UPCOMING" ? (
                    <AppText className="text-[9px] text-[#7A877D]">
                      Expected {dateLabel(crop.expectedHarvestDate)}
                    </AppText>
                  ) : null}
                </View>
              </View>
              <View
                className={`h-5 w-5 items-center justify-center rounded-full border ${chosen ? "border-[#2F7D4E] bg-[#2F7D4E]" : "border-[#A1AEA3]"}`}
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
        <View className="flex-row items-center gap-3 rounded-[14px] border border-[#E1E8E2] bg-[#FFFFFF] p-3">
          <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#EAF4E4]">
            <Feather name="check-circle" size={18} color={C.lime} />
          </View>
          <View className="min-w-0 flex-1">
            <AppText className="text-[13px] font-bold text-[#171D18]">
              {selectedCrop.cropName}
            </AppText>
            <AppText className="mt-0.5 text-[10px] text-[#69766D]">
              {draft.harvestType === "HARVESTED"
                ? "Harvested crop"
                : `Upcoming harvest · ${dateLabel(selectedCrop.expectedHarvestDate)}`}
            </AppText>
          </View>
          {!editingListing ? (
            <Pressable onPress={() => setStep("CROP")}>
              <AppText className="text-[10px] font-bold text-[#2F7D4E]">
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
            <AppText className="text-[11px] font-semibold text-[#69766D]">
              Unit
            </AppText>
            <View className="flex-row flex-wrap gap-1.5">
              {(["G", "KG", "PCS", "BUNCH", "BOX", "PACK"] as PackUnit[]).map(
                (unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => changeDraft({ packSizeUnit: unit })}
                    className={`rounded-[9px] border px-2.5 py-2.5 ${draft.packSizeUnit === unit ? "border-[#4A8154] bg-[#E6F3E7]" : "border-[#E1E8E2] bg-[#FFFFFF]"}`}
                  >
                    <AppText
                      className={`text-[10px] font-bold ${draft.packSizeUnit === unit ? "text-[#2F7D4E]" : "text-[#69766D]"}`}
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
        <View className="rounded-[12px] border border-[#E1E8E2] bg-[#FFFFFF] p-3">
          <AppText className="text-[10px] text-[#69766D]">
            Selling price per pack
          </AppText>
          <AppText className="mt-1 text-[22px] font-extrabold text-[#2F7D4E]">
            {isPositive(draft.basePrice) &&
            isNonNegative(draft.discountPercent) &&
            Number(draft.discountPercent) <= 100
              ? money(
                  Number(draft.basePrice) *
                    (1 - Number(draft.discountPercent) / 100),
                )
              : "—"}
          </AppText>
          <AppText className="mt-0.5 text-[10px] text-[#7A877D]">
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
          <View className="overflow-hidden rounded-[13px] border border-[#E1E8E2] bg-[#FFFFFF]">
            <Image
              source={{ uri: draft.imageUrl }}
              resizeMode="cover"
              className="h-[165px] w-full"
            />
            <View className="flex-row gap-2 p-2.5">
              <Pressable
                onPress={() => void pickPhoto()}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#EDF2ED] py-2.5"
              >
                <Feather name="image" size={13} color={C.text} />
                <AppText className="text-[10px] font-bold text-[#171D18]">
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
                className="flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#FCEBE9] px-3 py-2.5"
              >
                <Feather name="trash-2" size={13} color={C.red} />
                <AppText className="text-[10px] font-bold text-[#C53D38]">
                  Remove
                </AppText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => void pickPhoto()}
            className="flex-row items-center gap-3 rounded-[13px] border border-dashed border-[#C9D9CC] bg-[#FFFFFF] p-4"
          >
            <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#EAF4E4]">
              <Feather name="camera" size={17} color={C.lime} />
            </View>
            <View className="min-w-0 flex-1">
              <AppText className="text-[12px] font-bold text-[#171D18]">
                Add crop photo
              </AppText>
              <AppText className="mt-1 text-[10px] text-[#69766D]">
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
      <View className="rounded-[13px] border border-[#E1E8E2] bg-[#FFFFFF] p-3.5">
        <View className="flex-row items-start gap-2">
          <Feather name="truck" size={15} color={C.lime} />
          <View className="min-w-0 flex-1">
            <AppText className="text-[12px] font-bold text-[#171D18]">
              How can buyers receive this crop?
            </AppText>
            <AppText className="mt-1 text-[10px] leading-4 text-[#69766D]">
              Select at least one option. Delivery fees and delivery radius are
              saved with the listing.
            </AppText>
          </View>
        </View>
      </View>
      <View className="gap-2">
        <Pressable
          onPress={() => changeDraft({ customerPickup: !draft.customerPickup })}
          className={`flex-row items-center gap-3 rounded-[13px] border p-3.5 ${draft.customerPickup ? "border-[#4A8154] bg-[#E6F3E7]" : "border-[#E1E8E2] bg-[#FFFFFF]"}`}
        >
          <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#EAF4E4]">
            <Feather name="map-pin" size={17} color={C.lime} />
          </View>
          <View className="min-w-0 flex-1">
            <AppText className="text-[12px] font-bold text-[#171D18]">
              Customer pickup
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#69766D]">
              Buyer collects the order from your selected location.
            </AppText>
          </View>
          <View
            className={`h-5 w-5 items-center justify-center rounded-full border ${draft.customerPickup ? "border-[#2F7D4E] bg-[#2F7D4E]" : "border-[#A1AEA3]"}`}
          >
            {draft.customerPickup ? (
              <Feather name="check" size={12} color={C.bg} />
            ) : null}
          </View>
        </Pressable>
        <Pressable
          onPress={() => changeDraft({ sellerDelivery: !draft.sellerDelivery })}
          className={`flex-row items-center gap-3 rounded-[13px] border p-3.5 ${draft.sellerDelivery ? "border-[#4A8154] bg-[#E6F3E7]" : "border-[#E1E8E2] bg-[#FFFFFF]"}`}
        >
          <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-[#EAF4E4]">
            <Feather name="truck" size={17} color={C.lime} />
          </View>
          <View className="min-w-0 flex-1">
            <AppText className="text-[12px] font-bold text-[#171D18]">
              Seller delivery
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#69766D]">
              You deliver within the radius you set.
            </AppText>
          </View>
          <View
            className={`h-5 w-5 items-center justify-center rounded-full border ${draft.sellerDelivery ? "border-[#2F7D4E] bg-[#2F7D4E]" : "border-[#A1AEA3]"}`}
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
                className={`flex-row items-center gap-3 rounded-[13px] border p-3 ${selected ? "border-[#4A8154] bg-[#E6F3E7]" : "border-[#E1E8E2] bg-[#FFFFFF]"}`}
              >
                <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-[#EAF4E4]">
                  <Feather
                    name={location.isDefault ? "home" : "map-pin"}
                    size={15}
                    color={C.lime}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center gap-1.5">
                    <AppText className="text-[12px] font-bold text-[#171D18]">
                      {location.label}
                    </AppText>
                    {location.isDefault ? (
                      <AppText className="rounded bg-[#EAF4E4] px-1.5 py-0.5 text-[8px] font-bold text-[#2F7D4E]">
                        DEFAULT
                      </AppText>
                    ) : null}
                  </View>
                  <AppText
                    className="mt-1 text-[10px] leading-4 text-[#69766D]"
                    numberOfLines={2}
                  >
                    {location.address}
                  </AppText>
                </View>
                <View
                  className={`h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#2F7D4E] bg-[#2F7D4E]" : "border-[#A1AEA3]"}`}
                >
                  {selected ? (
                    <Feather name="check" size={12} color={C.bg} />
                  ) : null}
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="rounded-[13px] border border-dashed border-[#C9D9CC] bg-[#FFFFFF] p-4">
            <AppText className="text-[12px] font-bold text-[#171D18]">
              No saved locations
            </AppText>
            <AppText className="mt-1 text-[10px] leading-4 text-[#69766D]">
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
              className="mt-3 self-start rounded-[10px] bg-[#EDF2ED] px-3 py-2"
            >
              <AppText className="text-[10px] font-bold text-[#2F7D4E]">
                Manage locations
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
      <View className="rounded-[14px] border border-[#E1E8E2] bg-[#FFFFFF] p-3.5">
        <AppText className="text-[10px] font-semibold uppercase tracking-[0.8px] text-[#69766D]">
          Listing preview
        </AppText>
        <View className="mt-2 flex-row items-end justify-between gap-3">
          <View className="min-w-0 flex-1">
            <AppText className="text-[15px] font-bold text-[#171D18]">
              {selectedCrop?.cropName ?? "Your crop"}
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#69766D]">
              {draft.packSizeValue || "—"} {draft.packSizeUnit} ·{" "}
              {draft.quantityAvailable || "—"} packs available
            </AppText>
          </View>
          <AppText className="text-[20px] font-extrabold text-[#2F7D4E]">
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
            <View className="rounded-full bg-[#EAF4E4] px-2.5 py-1">
              <AppText className="text-[9px] font-semibold text-[#2F7D4E]">
                Customer pickup
              </AppText>
            </View>
          ) : null}
          {draft.sellerDelivery ? (
            <View className="rounded-full bg-[#EAF4E4] px-2.5 py-1">
              <AppText className="text-[9px] font-semibold text-[#2F7D4E]">
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
          <View className="rounded-[12px] bg-[#FCEBE9] p-3">
            <AppText className="text-[11px] leading-4 text-[#C53D38]">
              {orderError}
            </AppText>
          </View>
        ) : null}
        <View className="rounded-[15px] border border-[#E1E8E2] bg-[#FFFFFF] p-3.5">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1">
              <AppText className="text-[16px] font-bold text-[#171D18]">
                {order.cropName}
              </AppText>
              <AppText className="mt-1 text-[10px] text-[#69766D]">
                Order {order.orderNumber}
              </AppText>
            </View>
            <View className="items-end">
              <AppText className="text-[19px] font-extrabold text-[#2F7D4E]">
                {money(order.totalAmount)}
              </AppText>
              <AppText className="mt-1 text-[9px] text-[#69766D]">
                {statusLabel(order.status)}
              </AppText>
            </View>
          </View>
          <View className="mt-3 flex-row justify-between border-t border-[#E6ECE6] pt-3">
            <View>
              <AppText className="text-[9px] text-[#7A877D]">QUANTITY</AppText>
              <AppText className="mt-1 text-[11px] font-bold text-[#171D18]">
                {order.quantity} × {order.packSizeValue} {order.packSizeUnit}
              </AppText>
            </View>
            <View>
              <AppText className="text-[9px] text-[#7A877D]">PAYMENT</AppText>
              <AppText className="mt-1 text-[11px] font-bold text-[#171D18]">
                {statusLabel(order.paymentStatus)}
              </AppText>
            </View>
            <View>
              <AppText className="text-[9px] text-[#7A877D]">METHOD</AppText>
              <AppText className="mt-1 text-[11px] font-bold text-[#171D18]">
                {order.paymentMethod}
              </AppText>
            </View>
          </View>
        </View>
        <View className="gap-2">
          <SectionTitle title="Buyer and fulfilment" />
          <View className="rounded-[13px] border border-[#E1E8E2] bg-[#FFFFFF] p-3.5">
            <View className="flex-row items-center gap-2">
              <Feather name="user" size={14} color={C.lime} />
              <AppText className="text-[12px] font-bold text-[#171D18]">
                {order.buyer?.username ?? "Buyer"}
              </AppText>
            </View>
            {order.buyer?.phoneNo ? (
              <AppText className="mt-1 text-[11px] text-[#69766D]">
                {order.buyer.countryCode ?? ""}
                {order.buyer.phoneNo}
              </AppText>
            ) : null}
            <View className="mt-3 flex-row items-start gap-2">
              <Feather name="map-pin" size={14} color={C.muted} />
              <View className="min-w-0 flex-1">
                <AppText className="text-[11px] font-bold text-[#171D18]">
                  {order.fulfillmentType === "SELLER_DELIVERY"
                    ? "Delivery address"
                    : "Buyer pickup"}
                </AppText>
                <AppText className="mt-1 text-[10px] leading-4 text-[#69766D]">
                  {order.buyerLocation?.address ??
                    order.buyerAddressSnapshot ??
                    "No address details returned."}
                </AppText>
              </View>
            </View>
          </View>
        </View>
        {order.tracking ? (
          <View className="rounded-[13px] border border-[#E1E8E2] bg-[#FFFFFF] p-3.5">
            <View className="flex-row items-center gap-2">
              <Feather name="navigation" size={15} color={C.lime} />
              <AppText className="text-[12px] font-bold text-[#171D18]">
                Delivery tracking
              </AppText>
            </View>
            <AppText className="mt-2 text-[10px] leading-4 text-[#69766D]">
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
                className="flex-row items-center justify-between rounded-[11px] border border-[#E1E8E2] bg-[#FFFFFF] p-3"
              >
                <View>
                  <AppText className="text-[11px] font-bold text-[#171D18]">
                    {statusLabel(payment.kind)}
                  </AppText>
                  <AppText className="mt-1 text-[9px] text-[#69766D]">
                    {statusLabel(payment.status)}
                  </AppText>
                </View>
                <AppText className="text-[12px] font-bold text-[#171D18]">
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
            className="min-h-[44px] items-center justify-center rounded-[12px] border border-[#F0CFCA] bg-[#FCEBE9]"
          >
            <AppText className="text-[11px] font-bold text-[#C53D38]">
              Cancel order
            </AppText>
          </Pressable>
        ) : null}
        {["COMPLETED", "CANCELLED"].includes(order.status) ? (
          <View className="flex-row items-center gap-2 rounded-[12px] bg-[#E6F3E7] p-3">
            <Feather name="check-circle" size={15} color={C.lime} />
            <AppText className="text-[11px] text-[#386547]">
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
    <View className="flex-1 bg-[#F5F7F5]">
      <StatusBar style="dark" backgroundColor="#F5F7F5" />
      <View style={{ height: insets.top, backgroundColor: "#F5F7F5" }} />

      <View className="flex-row items-center gap-3 border-b border-[#E6ECE6] bg-[#F5F7F5] px-5 pb-4 pt-2">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#E4F1E6]">
          <Ionicons name="leaf" size={21} color="#2F7D4E" />
        </View>
        <View className="min-w-0 flex-1">
          <AppText className="text-[21px] font-extrabold leading-7 text-[#172019]">
            Seller overview
          </AppText>
          <AppText className="mt-0.5 text-[11px] text-[#69766D]">
            Your harvest, listings and orders
          </AppText>
        </View>
        <Pressable
          onPress={() => {
            setRefreshing(true);
            void loadAll(true);
          }}
          disabled={refreshing}
          className="h-10 w-10 items-center justify-center rounded-full border border-[#E1E8E2] bg-white"
          accessibilityRole="button"
          accessibilityLabel="Refresh seller data"
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#2F7D4E" />
          ) : (
            <Feather name="refresh-cw" size={16} color="#435348" />
          )}
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor="#2F7D4E"
            colors={["#2F7D4E"]}
            onRefresh={() => {
              setRefreshing(true);
              void loadAll(true);
            }}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 18) + 36,
        }}
      >
        <View className="mb-3 flex-row items-center justify-between">
          <AppText className="text-[16px] font-bold text-[#172019]">
            Overview
          </AppText>
          <AppText className="text-[10px] text-[#7A877D]">
            Live marketplace data
          </AppText>
        </View>

        <View className="flex-row gap-3">
          <View className="min-w-0 flex-1 overflow-hidden rounded-[20px] bg-[#F0EAFB] p-4">
            <View className="flex-row items-center justify-between">
              <AppText className="text-[11px] font-medium text-[#5C566D]">
                Active listings
              </AppText>
              <View className="h-8 w-8 items-center justify-center rounded-[11px] bg-[#E0D6F5]">
                <Feather name="package" size={15} color="#765CB6" />
              </View>
            </View>
            <AppText className="mt-3 text-[28px] font-extrabold leading-8 text-[#211A32]">
              {activeListings.toLocaleString("en-IN")}
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#6C6380]">
              {listings.filter((item) => item.status !== "REMOVED").length}{" "}
              published in total
            </AppText>
            <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#DED5F1]">
              <View
                className="h-full rounded-full bg-[#8C76C8]"
                style={{
                  width: `${
                    listings.filter((item) => item.status !== "REMOVED").length
                      ? Math.max(
                          4,
                          (activeListings /
                            listings.filter((item) => item.status !== "REMOVED")
                              .length) *
                            100,
                        )
                      : 0
                  }%`,
                }}
              />
            </View>
          </View>

          <View className="min-w-0 flex-1 overflow-hidden rounded-[20px] bg-[#E3F1E5] p-4">
            <View className="flex-row items-center justify-between">
              <AppText className="text-[11px] font-medium text-[#47664D]">
                Paid revenue
              </AppText>
              <View className="h-8 w-8 items-center justify-center rounded-[11px] bg-[#CDE5D1]">
                <Feather name="trending-up" size={15} color="#2F7D4E" />
              </View>
            </View>
            <AppText
              className="mt-3 text-[25px] font-extrabold leading-8 text-[#183B24]"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(completedRevenue)}
            </AppText>
            <AppText className="mt-1 text-[10px] text-[#52745A]">
              Confirmed payments
            </AppText>
            <View className="mt-4 flex-row items-center gap-1.5">
              <Feather name="check-circle" size={12} color="#2F7D4E" />
              <AppText className="text-[10px] font-semibold text-[#2F7D4E]">
                {
                  orders.filter((order) => order.paymentStatus === "PAID")
                    .length
                }{" "}
                paid orders
              </AppText>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row items-center rounded-[16px] border border-[#E1E8E2] bg-white px-4 py-3.5">
          <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#F0EAFB]">
              <Feather name="shopping-bag" size={16} color="#765CB6" />
            </View>
            <View>
              <AppText className="text-[19px] font-extrabold text-[#172019]">
                {openOrders}
              </AppText>
              <AppText className="text-[10px] text-[#69766D]">
                Open orders
              </AppText>
            </View>
          </View>
          <View className="mx-3 h-9 w-px bg-[#E6ECE6]" />
          <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
            <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#E3F1E5]">
              <Ionicons name="leaf-outline" size={17} color="#2F7D4E" />
            </View>
            <View>
              <AppText className="text-[19px] font-extrabold text-[#172019]">
                {availableCrops.length}
              </AppText>
              <AppText className="text-[10px] text-[#69766D]">
                Sellable crops
              </AppText>
            </View>
          </View>
        </View>

        <Pressable
          onPress={startNewListing}
          className="mt-4 flex-row items-center gap-3 rounded-[18px] bg-[#2F7D4E] px-4 py-4"
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[rgba(255,255,255,0.16)]">
            <Feather name="plus" size={21} color="#FFFFFF" />
          </View>
          <View className="min-w-0 flex-1">
            <AppText className="text-[14px] font-bold text-white">
              List a crop
            </AppText>
            <AppText className="mt-0.5 text-[10px] leading-4 text-[#E4F3E7]">
              Publish produce from your grow records
            </AppText>
          </View>
          <Feather name="arrow-up-right" size={19} color="#FFFFFF" />
        </Pressable>

        <View className="mt-5 rounded-[20px] border border-[#E1E8E2] bg-white p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <AppText className="text-[15px] font-bold text-[#172019]">
                Revenue this week
              </AppText>
              <AppText className="mt-1 text-[10px] text-[#7A877D]">
                Confirmed payments · last 7 days
              </AppText>
            </View>
            <AppText
              className="text-[16px] font-extrabold text-[#2F7D4E]"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {money(weeklyPaidRevenue)}
            </AppText>
          </View>
          <View className="mt-4 flex-row items-end justify-between gap-2">
            {weeklyRevenueBars.map((day) => (
              <View key={day.key} className="min-w-0 flex-1 items-center">
                <View className="h-[96px] w-full items-center justify-end">
                  <View
                    className="w-full max-w-[24px] rounded-t-[6px]"
                    style={{
                      height:
                        day.amount > 0
                          ? Math.max(7, (day.amount / maxWeeklyRevenue) * 88)
                          : 4,
                      backgroundColor: day.amount > 0 ? "#65A875" : "#E8EEE9",
                    }}
                  />
                </View>
                <AppText className="mt-2 text-[9px] font-medium text-[#7A877D]">
                  {day.label}
                </AppText>
              </View>
            ))}
          </View>
          {weeklyPaidRevenue === 0 ? (
            <View className="mt-3 flex-row items-center gap-2 rounded-[11px] bg-[#F5F8F5] px-3 py-2.5">
              <Feather name="info" size={13} color="#7A877D" />
              <AppText className="flex-1 text-[10px] leading-4 text-[#69766D]">
                Confirmed sales will appear here when paid order data is
                available.
              </AppText>
            </View>
          ) : null}
        </View>

        {recentOrders.length > 0 ? (
          <View className="mt-5">
            <View className="mb-3 flex-row items-end justify-between">
              <View>
                <AppText className="text-[15px] font-bold text-[#172019]">
                  Recent activity
                </AppText>
                <AppText className="mt-1 text-[10px] text-[#7A877D]">
                  Your latest customer orders
                </AppText>
              </View>
              <Pressable onPress={() => setTab("ORDERS")} className="py-1">
                <AppText className="text-[11px] font-semibold text-[#2F7D4E]">
                  View all
                </AppText>
              </Pressable>
            </View>
            <View className="overflow-hidden rounded-[18px] border border-[#E1E8E2] bg-white px-3.5">
              {recentOrders.map((order, index) => (
                <Pressable
                  key={order.id}
                  onPress={() => void openOrder(order)}
                  className={`flex-row items-center gap-3 py-3.5 ${
                    index < recentOrders.length - 1
                      ? "border-b border-[#E6ECE6]"
                      : ""
                  }`}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-[#E3F1E5]">
                    <Feather name="shopping-bag" size={16} color="#2F7D4E" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <AppText
                      className="text-[12px] font-bold text-[#172019]"
                      numberOfLines={1}
                    >
                      {order.buyer?.username || "Customer"} · {order.cropName}
                    </AppText>
                    <AppText
                      className="mt-1 text-[10px] text-[#7A877D]"
                      numberOfLines={1}
                    >
                      {order.orderNumber} · {statusLabel(order.status)}
                    </AppText>
                  </View>
                  <View className="items-end gap-1">
                    <AppText className="text-[12px] font-bold text-[#172019]">
                      {money(order.totalAmount)}
                    </AppText>
                    <AppText
                      className="text-[9px] font-semibold"
                      style={{
                        color:
                          order.paymentStatus === "PAID"
                            ? "#2F7D4E"
                            : "#946200",
                      }}
                    >
                      {statusLabel(order.paymentStatus)}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View className="mt-6">
          <AppText className="text-[17px] font-extrabold text-[#172019]">
            Workspace
          </AppText>
          <AppText className="mt-1 text-[10px] text-[#7A877D]">
            Manage your products and fulfilment
          </AppText>
        </View>

        <View className="mt-3 flex-row rounded-[14px] border border-[#E1E8E2] bg-[#ECEFEC] p-1">
          <Pressable
            onPress={() => setTab("LISTINGS")}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-[11px] py-3 ${
              tab === "LISTINGS" ? "bg-white" : ""
            }`}
            style={
              tab === "LISTINGS"
                ? {
                    shadowColor: "#1B2A1D",
                    shadowOpacity: 0.07,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 1,
                  }
                : undefined
            }
          >
            <Feather
              name="layers"
              size={14}
              color={tab === "LISTINGS" ? "#2F7D4E" : "#7A877D"}
            />
            <AppText
              className={`text-[11px] font-bold ${
                tab === "LISTINGS" ? "text-[#172019]" : "text-[#69766D]"
              }`}
            >
              Listings (
              {listings.filter((item) => item.status !== "REMOVED").length})
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setTab("ORDERS")}
            className={`flex-1 flex-row items-center justify-center gap-2 rounded-[11px] py-3 ${
              tab === "ORDERS" ? "bg-white" : ""
            }`}
            style={
              tab === "ORDERS"
                ? {
                    shadowColor: "#1B2A1D",
                    shadowOpacity: 0.07,
                    shadowRadius: 5,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 1,
                  }
                : undefined
            }
          >
            <Feather
              name="shopping-bag"
              size={14}
              color={tab === "ORDERS" ? "#2F7D4E" : "#7A877D"}
            />
            <AppText
              className={`text-[11px] font-bold ${
                tab === "ORDERS" ? "text-[#172019]" : "text-[#69766D]"
              }`}
            >
              Orders ({orders.length})
            </AppText>
          </Pressable>
        </View>

        {error ? (
          <View className="mt-4 rounded-[13px] border border-[#F0CFCA] bg-[#FCEBE9] p-3">
            <View className="flex-row items-start gap-2">
              <Feather name="alert-circle" size={15} color="#C53D38" />
              <View className="min-w-0 flex-1">
                <AppText className="text-[11px] font-bold text-[#913F39]">
                  Could not refresh seller data
                </AppText>
                <AppText className="mt-1 text-[10px] leading-4 text-[#913F39]">
                  {error}
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={() => void loadAll()}
              className="mt-3 self-start rounded-[9px] bg-white px-3 py-2"
            >
              <AppText className="text-[10px] font-bold text-[#2F7D4E]">
                Try again
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <View className="items-center py-12">
            <ActivityIndicator color="#2F7D4E" size="large" />
            <AppText className="mt-3 text-[11px] text-[#69766D]">
              Loading your seller workspace…
            </AppText>
          </View>
        ) : tab === "LISTINGS" ? (
          <View className="mt-5">
            <View className="mb-3 flex-row items-end justify-between gap-2">
              <View className="min-w-0 flex-1">
                <AppText className="text-[17px] font-extrabold text-[#172019]">
                  Your listings
                </AppText>
                <AppText className="mt-1 text-[10px] text-[#7A877D]">
                  Update pricing and availability at any time.
                </AppText>
              </View>
              <Pressable
                onPress={startNewListing}
                className="flex-row items-center gap-1.5 rounded-full bg-[#2F7D4E] px-3.5 py-2.5"
              >
                <Feather name="plus" size={13} color="#FFFFFF" />
                <AppText className="text-[10px] font-bold text-white">
                  Add crop
                </AppText>
              </Pressable>
            </View>
            {listings.length === 0 ? (
              <View className="items-center rounded-[18px] border border-dashed border-[#C9D9CC] bg-white px-6 py-9">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-[15px] bg-[#E5F3E7]">
                  <Ionicons name="basket-outline" size={24} color="#2F7D4E" />
                </View>
                <AppText className="text-[14px] font-bold text-[#172019]">
                  No listings yet
                </AppText>
                <AppText className="mt-1 text-center text-[11px] leading-4 text-[#69766D]">
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
            <View className="mt-2 rounded-[13px] border border-[#E1E8E2] bg-white p-3">
              <View className="flex-row items-start gap-2">
                <Feather name="shield" size={14} color="#7A877D" />
                <AppText className="min-w-0 flex-1 text-[10px] leading-4 text-[#7A877D]">
                  Crops, stock, listing status, order counts and locations come
                  from your marketplace API. The server validates each change.
                </AppText>
              </View>
            </View>
          </View>
        ) : (
          <View className="mt-5">
            <View className="mb-3">
              <AppText className="text-[17px] font-extrabold text-[#172019]">
                Selling orders
              </AppText>
              <AppText className="mt-1 text-[10px] text-[#7A877D]">
                Accept orders, prepare them, track deliveries and record
                payment.
              </AppText>
            </View>
            {orders.length === 0 ? (
              <View className="items-center rounded-[18px] border border-dashed border-[#C9D9CC] bg-white px-6 py-9">
                <View className="mb-3 h-12 w-12 items-center justify-center rounded-[15px] bg-[#E3F1E5]">
                  <Feather name="shopping-bag" size={22} color="#2F7D4E" />
                </View>
                <AppText className="text-[14px] font-bold text-[#172019]">
                  No customer orders yet
                </AppText>
                <AppText className="mt-1 text-center text-[11px] leading-4 text-[#69766D]">
                  Orders for your active listings will appear here.
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
            <ActivityIndicator color="#2F7D4E" />
            <AppText className="mt-2 text-[10px] text-[#69766D]">
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
