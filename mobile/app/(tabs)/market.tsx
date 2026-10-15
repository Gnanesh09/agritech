import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import MarketplaceActionBar from "../../components/marketplace/MarketplaceActionBar";
import { MapsView } from "../market/mapsview";
import { LinearGradient } from "expo-linear-gradient";
import {
  getSelectedLocation,
  setSelectedListing as setSharedSelectedListing,
} from "../../lib/marketplace-store";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../lib/auth-context";
import { apiRequest } from "../../lib/api";
import { getAccessToken } from "../../lib/auth-storage";

// Expo Go-compatible map renderer.
// Mapbox is still used through its REST APIs for geocoding/routing;
// react-native-maps is used only for rendering the native map in Expo Go.
import MapView, { Circle, Marker, Polyline } from "react-native-maps";

// Installed only in a native/dev build that includes Razorpay checkout.
// Keep the import here instead of WebView/redirect based checkout.
import RazorpayCheckout from "react-native-razorpay";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.49.17.210:5000/api";
const WS_URL = process.env.EXPO_PUBLIC_MARKETPLACE_WS_URL ?? "";
const IMAGEKIT_PUBLIC_KEY = process.env.EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY ?? "";
const IMAGEKIT_AUTH_ENDPOINT =
  process.env.EXPO_PUBLIC_IMAGEKIT_AUTH_ENDPOINT ?? "";
const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

// ================================================================
// MARKETPLACE THEME — edit this one object to restyle this screen.
// Zomato/Swiggy-inspired dark surfaces, clear typography, one bright
// produce accent, and restrained orange/red status colors.
// MapsView, action buttons, and product pins receive this same palette.
// ================================================================
const C = {
  // Base backgrounds and surfaces
  bg: "#0C0D0B",
  black: "#080907",
  card: "#171916",
  cardAlt: "#20221E",
  soft: "#202A19",
  line: "#30352D",
  lineStrong: "#3B4334",

  // Text hierarchy
  ink: "#F6F7F4",
  white: "#FFFFFF",
  muted: "#A2A79E",
  mutedOnLight: "#50594A", // Secondary copy shown on the light product-pin surface

  // Brand / action accent (keeps your configured lime-green identity)
  primary: "#C8FF67",
  primaryDark1: "#0C0D0B",
  green: "#C8FF67",
  lime: "#C8FF67",
  greenDark: "#0C0D0B",
  greenSoft: "rgba(200, 255, 103, 0.14)",
  primaryBorder: "#718F38",

  // Small semantic accents for offers, warnings, and statuses
  accent: "#F59E0B",
  orange: "#F59E0B",
  accentSoft: "#382A18",
  accentBorder: "#F5DCB0",
  red: "#FF6B6B",
  danger: "#FF6B6B",
  dangerSoft: "#301B1B",
  dangerBorder: "#F0C8C8",
  blue: "#86B3FF",
  blueSoft: "#1E2A3A",
  success: "#C8FF67",
  successBorder: "#CBEAD2",
  toast: "#202A22",
};

// Utility for native map overlays; color values themselves stay in C above.
const withAlpha = (hex: string, alpha: number) => {
  const raw = String(hex || "#000000").replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((part) => part + part)
          .join("")
      : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return `rgba(0, 0, 0, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

// SECTION: Native Google Maps styling. These are map-renderer colors, not NativeWind view classes.
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: C.bg }] },
  { elementType: "labels.text.fill", stylers: [{ color: C.muted }] },
  { elementType: "labels.text.stroke", stylers: [{ color: C.bg }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: C.line }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: C.card }],
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: C.soft }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: C.line }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: C.bg }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: C.card }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: C.bg }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: C.bg }],
  },
];

type Mode = "BUYER" | "SELLER";
type ViewMode = "LIST" | "MAP";
type Sheet =
  | "NONE"
  | "LISTING"
  | "CHECKOUT"
  | "LOCATION"
  | "ORDERS"
  | "ORDER_DETAIL"
  | "SELLER_LISTING"
  | "PAYMENT";
type HarvestType = "HARVESTED" | "UPCOMING";
type PackUnit = "G" | "KG" | "PCS" | "BUNCH" | "BOX" | "PACK";
type FulfillmentType = "SELLER_DELIVERY" | "CUSTOMER_PICKUP";
type PaymentMethod = "ONLINE" | "COD";
type SortMode = "DISTANCE" | "PRICE_ASC" | "PRICE_DESC" | "NEWEST";

type Coordinates = { latitude: number; longitude: number };

type LocationRecord = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  mapplsPin?: string | null;
  landmark?: string | null;
  isDefault?: boolean;
};

type Crop = {
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

type Listing = {
  id: string;
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
  createdAt: string;
  updatedAt?: string;
  distanceKm?: number | null;
  seller?: { id: string; username: string };
  sellerLocation?: LocationRecord;
  cropCycle?: Crop;
  orderCount?: number;
};

type Tracking = {
  isActive?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  heading?: number | null;
  speedKmh?: number | null;
  distanceRemainingKm?: number | null;
  etaMinutes?: number | null;
  routeDistanceKm?: number | null;
  routeDurationMinutes?: number | null;
  routeGeometry?: string | unknown | null;
  startedAt?: string | null;
  lastUpdatedAt?: string | null;
  reachedAt?: string | null;
};

type MarketplaceOrder = {
  id: string;
  orderNumber: string;
  listingId: string;
  cropName: string;
  expectedHarvestDate?: string | null;
  packSizeValue: number;
  packSizeUnit: PackUnit;
  quantity: number;
  originalUnitPrice: number;
  discountPercent: number;
  unitPrice: number;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  fulfillmentType: FulfillmentType;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  status: string;
  buyerId?: string;
  sellerId?: string;
  buyer?: {
    id: string;
    username: string;
    email?: string;
    phoneNo?: string;
    countryCode?: string;
  };
  seller?: {
    id: string;
    username: string;
    email?: string;
    phoneNo?: string;
    countryCode?: string;
  };
  buyerLocation?: LocationRecord;
  sellerLocation?: LocationRecord;
  buyerAddressSnapshot?: string | null;
  sellerAddressSnapshot?: string | null;
  buyerLatitude?: number | null;
  buyerLongitude?: number | null;
  sellerLatitude?: number | null;
  sellerLongitude?: number | null;
  straightLineDistanceKm?: number | null;
  routeDistanceKm?: number | null;
  estimatedDeliveryMinutes?: number | null;
  routeGeometry?: string | unknown | null;
  reservationExpiresAt?: string | null;
  tracking?: Tracking | null;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string | null;
  payments?: Array<{
    id: string;
    kind: string;
    status: string;
    amount: number;
    currency: string;
    provider: string;
    providerOrderId?: string | null;
    providerPaymentId?: string | null;
    providerLinkId?: string | null;
    collectedAt?: string | null;
    createdAt: string;
  }>;
};

type PickedPlace = {
  address: string;
  label: string;
  latitude: number;
  longitude: number;
  mapplsPin?: string | null;
  landmark?: string | null;
};

type ImageDraft = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  uploaded?: { url: string; fileId?: string | null } | null;
};

const money = (value: number) =>
  `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
const num = (value: unknown) => Number(value ?? 0);
const fmtKm = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value) < 10
    ? `${Number(value).toFixed(1)} km`
    : `${Math.round(Number(value))} km`;
};
const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
const fmtTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

function normalizePickerResult(value: any): PickedPlace | null {
  if (!value) return null;
  const candidate = Array.isArray(value) ? value[0] : value;
  const coordinates =
    candidate?.geometry?.coordinates ??
    candidate?.coordinates ??
    candidate?.location?.coordinates;

  const longitude = num(
    candidate?.longitude ??
      candidate?.lng ??
      candidate?.lon ??
      candidate?.location?.longitude ??
      candidate?.location?.lng ??
      coordinates?.[0],
  );
  const latitude = num(
    candidate?.latitude ??
      candidate?.lat ??
      candidate?.location?.latitude ??
      candidate?.location?.lat ??
      coordinates?.[1],
  );

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    address: String(
      candidate?.full_address ??
        candidate?.place_formatted ??
        candidate?.formattedAddress ??
        candidate?.address ??
        candidate?.placeName ??
        candidate?.name ??
        "Selected location",
    ),
    label: String(
      candidate?.name_preferred ??
        candidate?.name ??
        candidate?.placeName ??
        candidate?.locality ??
        "Marketplace location",
    ),
    latitude,
    longitude,
    // The current backend keeps this optional legacy field; Mapbox does not need it.
    mapplsPin: null,
    landmark: null,
  };
}

async function mapboxReverseGeocode(coords: Coordinates): Promise<PickedPlace> {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error("EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is not configured.");
  }

  const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${encodeURIComponent(
    coords.longitude,
  )}&latitude=${encodeURIComponent(coords.latitude)}&types=address,poi&country=in&access_token=${encodeURIComponent(
    MAPBOX_ACCESS_TOKEN,
  )}`;

  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "Mapbox reverse geocoding failed.");
  }

  const feature = payload?.features?.[0];
  return (
    normalizePickerResult(feature) ?? {
      label: "Pinned location",
      address: `Pinned location (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`,
      latitude: coords.latitude,
      longitude: coords.longitude,
      mapplsPin: null,
      landmark: null,
    }
  );
}

function parseGeometry(value: unknown): any | null {
  if (!value) return null;
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (parsed?.type === "Feature") return parsed.geometry;
    if (parsed?.type === "FeatureCollection")
      return parsed.features?.[0]?.geometry ?? null;
    if (parsed?.type) return parsed;
  } catch {
    return null;
  }
  return null;
}

function routeFeature(geometry: any) {
  const route = parseGeometry(geometry);
  if (!route) return null;
  if (route.type === "LineString") {
    return { type: "Feature", properties: {}, geometry: route };
  }
  if (route.type === "MultiLineString") {
    return { type: "Feature", properties: {}, geometry: route };
  }
  return null;
}

function circleFeature(center: Coordinates, radiusKm: number) {
  const points: number[][] = [];
  const lat = (center.latitude * Math.PI) / 180;
  const radius = radiusKm / 111.32;
  const lonScale = Math.cos(lat) || 1;
  for (let i = 0; i <= 72; i += 1) {
    const angle = (i / 72) * 2 * Math.PI;
    const latitude = center.latitude + radius * Math.sin(angle);
    const longitude = center.longitude + (radius * Math.cos(angle)) / lonScale;
    points.push([longitude, latitude]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [points] },
  };
}

async function getCurrentGps(): Promise<Coordinates> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("Location permission is required to use GPS features.");
  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
  };
}

async function reverseGeocode(coords: Coordinates) {
  try {
    const rows = await Location.reverseGeocodeAsync(coords);
    const first = rows[0];
    if (!first) return "Current GPS location";
    return [first.name, first.street, first.subregion, first.city, first.region]
      .filter(Boolean)
      .join(", ")
      .slice(0, 500);
  } catch {
    return "Current GPS location";
  }
}

async function imageKitUpload(image: ImageDraft) {
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_AUTH_ENDPOINT) {
    throw new Error(
      "ImageKit upload is not configured. Set EXPO_PUBLIC_IMAGEKIT_PUBLIC_KEY and EXPO_PUBLIC_IMAGEKIT_AUTH_ENDPOINT.",
    );
  }

  const token = await getAccessToken();
  const authResponse = await fetch(
    IMAGEKIT_AUTH_ENDPOINT.startsWith("http")
      ? IMAGEKIT_AUTH_ENDPOINT
      : `${API_URL}${IMAGEKIT_AUTH_ENDPOINT}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );
  if (!authResponse.ok)
    throw new Error("Unable to get ImageKit upload authorization.");
  const auth = await authResponse.json();

  const data = new FormData();
  data.append("file", {
    uri: image.uri,
    name: image.name,
    type: image.mimeType || "image/jpeg",
  } as any);
  data.append("fileName", image.name);
  data.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  data.append("signature", auth.signature);
  data.append("expire", String(auth.expire));
  data.append("token", auth.token);

  const uploadResponse = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: "POST",
    body: data,
  });
  const payload = await uploadResponse.json().catch(() => null);
  if (!uploadResponse.ok)
    throw new Error(payload?.message ?? "Image upload failed.");
  if (!payload?.url) throw new Error("ImageKit did not return an image URL.");
  return {
    url: payload.url as string,
    fileId: (payload.fileId as string | undefined) ?? null,
  };
}

function useMarketplaceSocket(
  orderId: string | null,
  onMessage: (message: any) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!orderId || !WS_URL) return undefined;
    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = async () => {
      const token = await getAccessToken();
      if (cancelled) return;
      const separator = WS_URL.includes("?") ? "&" : "?";
      const url = `${WS_URL}${separator}token=${encodeURIComponent(token ?? "")}`;
      socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        try {
          socket?.send(JSON.stringify({ type: "order:subscribe", orderId }));
        } catch {
          // Socket is still useful for server broadcast if the backend subscribes by auth.
        }
      };
      socket.onmessage = (event) => {
        try {
          onMessage(JSON.parse(event.data));
        } catch {
          // Ignore malformed frames.
        }
      };
      socket.onerror = () => undefined;
    };

    void connect();
    return () => {
      cancelled = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [orderId, onMessage]);
}

function IconButton({
  name,
  onPress,
  active = false,
}: {
  name: keyof typeof Feather.glyphMap;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        active
          ? "w-[39px] h-[39px] rounded-[14px] border items-center justify-center bg-[rgba(200,255,103,0.14)] border-[#3B4334]"
          : "w-[39px] h-[39px] rounded-[14px] bg-[#171916] border border-[#30352D] items-center justify-center"
      }
    >
      <Feather name={name} size={19} color={active ? C.greenDark : C.ink} />
    </Pressable>
  );
}

function Pill({
  children,
  tone = "soft",
}: {
  children: React.ReactNode;
  tone?: "soft" | "green" | "orange" | "red" | "blue";
}) {
  const toneClasses = {
    soft: "bg-[#20221E] px-[6.5px] py-[4px] rounded-[6px] flex-row items-center gap-[3px]",
    green:
      "bg-[rgba(200,255,103,0.14)] px-[6.5px] py-[4px] rounded-[6px] flex-row items-center gap-[3px]",
    orange:
      "bg-[#382A18] px-[6.5px] py-[4px] rounded-[6px] flex-row items-center gap-[3px]",
    red: "bg-[#301B1B] px-[6.5px] py-[4px] rounded-[6px] flex-row items-center gap-[3px]",
    blue: "bg-[#1E2A3A] px-[6.5px] py-[4px] rounded-[6px] flex-row items-center gap-[3px]",
  } as const;
  return (
    <View className={toneClasses[tone]}>
      <Text className="text-[#F6F7F4] text-[9px] font-extrabold">
        {children}
      </Text>
    </View>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: any) => void;
}) {
  return (
    <View className="flex-row bg-[#20221E] rounded-[14px] p-[3px] mt-[13px]">
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          className={
            value === option.value
              ? "flex-1 rounded-[11px] items-center py-[8px] bg-[#171916]"
              : "flex-1 rounded-[11px] items-center py-[8px]"
          }
        >
          <Text
            className={
              value === option.value
                ? "font-bold text-[12px] text-[#F6F7F4]"
                : "text-[#A2A79E] font-bold text-[12px]"
            }
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10000,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <View className="flex-row bg-[#171916] rounded-[14px] border border-[#30352D] p-[4px] items-center">
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        className="w-[32px] h-[32px] rounded-[10px] bg-[#171916] items-center justify-center"
      >
        <Feather name="minus" size={18} color={C.ink} />
      </Pressable>
      <Text className="w-[42px] text-center text-[12.5px] font-black text-[#F6F7F4]">
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        className="w-[32px] h-[32px] rounded-[10px] bg-[#171916] items-center justify-center"
      >
        <Feather name="plus" size={18} color={C.ink} />
      </Pressable>
    </View>
  );
}

function ListingCard({
  listing,
  onPress,
}: {
  listing: Listing;
  onPress: () => void;
}) {
  const discount = Math.round(num(listing.discountPercent));
  return (
    <Pressable
      onPress={onPress}
      className="w-full min-h-[126px] bg-[#171916] rounded-[17px] border border-[#30352D] overflow-hidden mb-[11px] p-[9px] flex-row gap-[11px]"
      style={({ pressed }) => (pressed ? { opacity: 0.88 } : undefined)}
    >
      <View className="w-[100px] h-[108px] rounded-[13px] overflow-hidden bg-[#20221E] relative shrink-0">
        {listing.imageUrl ? (
          <Image
            source={{ uri: listing.imageUrl }}
            className="w-full h-full object-cover"
          />
        ) : (
          <View className="flex-1 items-center justify-center bg-[#202A19]">
            <Ionicons name="leaf-outline" size={34} color={C.green} />
          </View>
        )}
        {discount > 0 && (
          <View className="absolute left-[9px] top-[9px] bg-[#C8FF67] rounded-[7px] px-[7px] py-[4px]">
            <Text className="text-[#080907] text-[9px] font-black">
              {discount}% OFF
            </Text>
          </View>
        )}
      </View>
      <View className="flex-1 min-w-[0px] py-[2px] pr-[2px]">
        <View className="flex-row items-center justify-between gap-[8px]">
          <Text
            className="text-[#F6F7F4] text-[13.5px] font-extrabold flex-1"
            numberOfLines={1}
          >
            {listing.cropName}
          </Text>
          <Text className="text-[#0C0D0B] text-[10.5px] font-extrabold">
            {fmtKm(listing.distanceKm)}
          </Text>
        </View>
        <Text
          className="max-w-[74px] text-right text-[#A2A79E] text-[9.5px] font-bold"
          numberOfLines={1}
        >
          Sold by{" "}
          <Text className="text-[#C8FF67] italic">
            {listing.seller?.username ?? "local grower"}
          </Text>
        </Text>
        <Text
          className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]"
          numberOfLines={2}
        >
          {listing.description?.trim() ||
            `${listing.packSizeValue} ${listing.packSizeUnit} pack · ${listing.quantityAvailable} available`}
        </Text>
        <View
          className="flex-row items-center justify-between gap-[8px]"
          style={{ marginTop: "auto", paddingTop: 7 }}
        >
          <Text className="text-[#F6F7F4] text-[17px] font-black">
            {money(listing.price)}
          </Text>
          <Text className="text-[#C8FF67] text-[10px] font-bold">
            {listing.harvestType === "UPCOMING"
              ? fmtDate(listing.expectedHarvestDate)
              : "Harvest details ›"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  body,
  action,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View className="items-center justify-center px-[28px] py-[48px]">
      <View className="w-[58px] h-[58px] rounded-[20px] bg-[rgba(200,255,103,0.14)] items-center justify-center mb-[13px]">
        <Ionicons name={icon} size={27} color={C.green} />
      </View>
      <Text className="text-[#F6F7F4] text-[17px] font-extrabold text-center">
        {title}
      </Text>
      <Text className="text-[#A2A79E] text-[11.5px] leading-[17px] mt-[6px] text-center max-w-[320px]">
        {body}
      </Text>
      {action && onPress && (
        <Pressable
          onPress={onPress}
          className="mt-[16px] px-[14px] py-[10px] rounded-[12px] border border-[#30352D] bg-[#171916]"
        >
          <Text className="text-[#F6F7F4] font-extrabold text-[11px]">
            {action}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function BottomSheet({
  visible,
  title,
  onClose,
  children,
  height = "auto",
  hideHeader = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  height?: number | `${number}%` | "auto";
  hideHeader?: boolean;
}) {
  const sizeStyle =
    typeof height === "number"
      ? { height, maxHeight: height }
      : height === "auto"
        ? undefined
        : { height };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[rgba(7,12,8,0.48)] justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="bg-[#0C0D0B] rounded-tl-[28px] rounded-tr-[28px] overflow-hidden border border-[#30352D]"
          style={sizeStyle}
        >
          {!hideHeader && (
            <>
              <View className="w-[40px] h-[4px] rounded-full bg-[#3B4334] self-center mt-[9px]" />
              <View className="flex-row items-center justify-between px-[18px] pt-[10px] pb-[11px]">
                <Text className="text-[#F6F7F4] text-[17px] font-black">
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  className="w-[38px] h-[38px] rounded-[13px] bg-[#171916] border border-[#30352D] items-center justify-center"
                >
                  <Feather name="x" size={19} color={C.ink} />
                </Pressable>
              </View>
            </>
          )}
          {children}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function geometryToCoordinates(geometry: unknown): Array<{
  latitude: number;
  longitude: number;
}> {
  const parsed = parseGeometry(geometry);
  if (!parsed) return [];

  const coordinates =
    parsed.type === "LineString"
      ? parsed.coordinates
      : parsed.type === "MultiLineString"
        ? parsed.coordinates?.flat?.()
        : [];

  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .filter(
      (point: unknown) =>
        Array.isArray(point) &&
        point.length >= 2 &&
        Number.isFinite(Number(point[0])) &&
        Number.isFinite(Number(point[1])),
    )
    .map((point: [number, number]) => ({
      longitude: Number(point[0]),
      latitude: Number(point[1]),
    }));
}

function MarketplaceMap({
  center,
  radiusKm,
  listings,
  routeGeometry,
  selectedListingId,
  onSelectListing,
  userMarker = true,
  fullScreen = false,
}: {
  center: Coordinates;
  radiusKm: number;
  listings: Listing[];
  routeGeometry?: unknown;
  selectedListingId?: string | null;
  onSelectListing?: (listing: Listing) => void;
  userMarker?: boolean;
  fullScreen?: boolean;
}) {
  const mapRef = useRef<MapView | null>(null);

  const routeCoordinates = useMemo(
    () => geometryToCoordinates(routeGeometry),
    [routeGeometry],
  );

  const region = useMemo(
    () => ({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: Math.max(0.015, radiusKm / 90),
      longitudeDelta: Math.max(0.015, radiusKm / 90),
    }),
    [center.latitude, center.longitude, radiusKm],
  );

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 350);
  }, [region]);

  return (
    <View
      className={
        fullScreen
          ? "overflow-hidden flex-1 w-full rounded-none mb-[0px] border-0 border-[transparent] bg-[#080907] h-full"
          : "h-[345px] rounded-[20px] overflow-hidden mb-[16px] border border-[#30352D] bg-[#0C0D0B]"
      }
    >
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        userInterfaceStyle="dark"
        customMapStyle={DARK_MAP_STYLE}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        <Circle
          center={{
            latitude: center.latitude,
            longitude: center.longitude,
          }}
          radius={radiusKm * 1000}
          fillColor={withAlpha(C.primary, 0.08)}
          strokeColor={withAlpha(C.primary, 0.42)}
          strokeWidth={1}
        />

        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={C.green}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {userMarker && (
          <Marker
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="w-[25px] h-[25px] rounded-full bg-[rgba(183,243,75,0.18)] items-center justify-center">
              <View className="w-[10px] h-[10px] rounded-full bg-[#C8FF67] border-[2px] border-[#FFFFFF]" />
            </View>
          </Marker>
        )}

        {listings.map((listing) => {
          const location = listing.sellerLocation;
          if (!location) return null;

          const isSelected = selectedListingId === listing.id;

          return (
            <Marker
              key={listing.id}
              coordinate={{
                latitude: Number(location.latitude),
                longitude: Number(location.longitude),
              }}
              onPress={() => onSelectListing?.(listing)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View
                className={
                  isSelected
                    ? "min-w-[112px] max-w-[158px] min-h-[48px] p-[5px] rounded-[13px] border flex-row items-center gap-[8px] bg-[#C8FF67] border-[#C8FF67]"
                    : "min-w-[112px] max-w-[158px] min-h-[48px] p-[5px] rounded-[13px] bg-[#171916] border border-[#718F38] flex-row items-center gap-[8px]"
                }
                style={[
                  nativeStyles.mapPricePin,
                  isSelected && nativeStyles.mapPricePinSelected,
                ]}
              >
                <View className="flex-1 min-w-[0px] pl-[3px]">
                  <Text
                    numberOfLines={1}
                    className={
                      isSelected
                        ? "text-[9.5px] font-bold mb-[2px] text-[#080907]"
                        : "text-[#A2A79E] text-[9.5px] font-bold mb-[2px]"
                    }
                  >
                    {listing.cropName}
                  </Text>
                  <Text
                    className={
                      isSelected
                        ? "text-[12px] font-black text-[#080907]"
                        : "text-[#C8FF67] text-[12px] font-black"
                    }
                  >
                    {money(listing.price)}
                  </Text>
                </View>
                {listing.imageUrl ? (
                  <Image
                    source={{ uri: listing.imageUrl }}
                    className="w-[34px] h-[34px] rounded-[9px] bg-[rgba(200,255,103,0.14)]"
                  />
                ) : (
                  <View className="w-[34px] h-[34px] rounded-[9px] bg-[#202A19] items-center justify-center">
                    <Ionicons
                      name="leaf-outline"
                      size={16}
                      color={isSelected ? C.black : C.green}
                    />
                  </View>
                )}
              </View>
            </Marker>
          );
        })}
      </MapView>

      {!fullScreen && (
        <View
          className="absolute top-[12px] left-[12px] bg-[#171916] rounded-[12px] px-[10px] py-[7px] flex-row items-center gap-[5px]"
          style={nativeStyles.mapTopChip}
        >
          <Feather name="map-pin" size={13} color={C.greenDark} />
          <Text className="text-[#F6F7F4] text-[10.5px] font-extrabold">
            Within {radiusKm} km
          </Text>
        </View>
      )}
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<Mode>("BUYER");
  const [viewMode, setViewMode] = useState<ViewMode>("MAP");
  const [sheet, setSheet] = useState<Sheet>("NONE");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(
    null,
  );

  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [buyingOrders, setBuyingOrders] = useState<MarketplaceOrder[]>([]);
  const [sellingOrders, setSellingOrders] = useState<MarketplaceOrder[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);

  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("DISTANCE");
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [doorstepPaymentUrl, setDoorstepPaymentUrl] = useState<string | null>(
    null,
  );

  const loadLocations = useCallback(async () => {
    const data = await apiRequest("/user/marketplace/locations");
    setLocations(
      (data?.locations ?? []).map((location: any) => ({
        ...location,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
      })),
    );
  }, []);

  const loadBuyerListings = useCallback(async () => {
    if (!coords) return;
    const params = new URLSearchParams({
      latitude: String(coords.latitude),
      longitude: String(coords.longitude),
      radiusKm: String(radiusKm),
      sort,
    });
    if (search.trim()) params.set("q", search.trim());
    const data = await apiRequest(
      `/user/marketplace/listings?${params.toString()}`,
    );
    setListings(data?.listings ?? []);
  }, [coords, radiusKm, search, sort]);

  const loadSellerData = useCallback(async () => {
    const [cropData, listingData] = await Promise.all([
      apiRequest("/user/marketplace/my-crops"),
      apiRequest("/user/marketplace/my-listings"),
    ]);
    setCrops(cropData?.crops ?? []);
    setMyListings(listingData?.listings ?? []);
  }, []);

  const loadOrders = useCallback(async () => {
    const [buying, selling] = await Promise.all([
      apiRequest("/user/marketplace/orders/buying"),
      apiRequest("/user/marketplace/orders/selling"),
    ]);
    setBuyingOrders(buying?.orders ?? []);
    setSellingOrders(selling?.orders ?? []);
  }, []);

  const ensureGps = useCallback(async () => {
    const current = await getCurrentGps();
    setCoords(current);
    return current;
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const current = coords ?? (await ensureGps());
      await Promise.all([
        loadLocations(),
        loadBuyerListingsRef(current, radiusKm, search, sort),
        loadSellerData(),
        loadOrders(),
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load marketplace.");
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  }, [
    coords,
    ensureGps,
    loadLocations,
    loadSellerData,
    loadOrders,
    radiusKm,
    search,
    sort,
  ]);

  const loadBuyerListingsRef = useCallback(
    async (
      currentCoords: Coordinates,
      radius: number,
      query: string,
      sortMode: SortMode,
    ) => {
      const params = new URLSearchParams({
        latitude: String(currentCoords.latitude),
        longitude: String(currentCoords.longitude),
        radiusKm: String(radius),
        sort: sortMode,
      });
      if (query.trim()) params.set("q", query.trim());
      const data = await apiRequest(
        `/user/marketplace/listings?${params.toString()}`,
      );
      setListings(data?.listings ?? []);
    },
    [],
  );

  useEffect(() => {
    if (authLoading || !user) return;
    void refreshAll();
  }, [authLoading, user?.id]);

  // When returning from the dedicated location route, use its selected address
  // as the marketplace centre and refresh nearby inventory.
  useFocusEffect(
    useCallback(() => {
      const picked = getSelectedLocation();
      if (!picked) return;
      const next = {
        latitude: Number(picked.latitude),
        longitude: Number(picked.longitude),
      };
      setCoords(next);
      void loadBuyerListingsRef(next, radiusKm, search, sort).catch((e) =>
        setError(
          e instanceof Error ? e.message : "Unable to refresh listings.",
        ),
      );
    }, [loadBuyerListingsRef, radiusKm, search, sort]),
  );

  useEffect(() => {
    if (!coords || authLoading || !user) return;
    const timer = setTimeout(
      () =>
        void loadBuyerListings().catch((e) =>
          setError(
            e instanceof Error ? e.message : "Unable to refresh listings.",
          ),
        ),
      260,
    );
    return () => clearTimeout(timer);
  }, [coords, radiusKm, search, sort]);

  const defaultBuyerLocation =
    locations.find((location) => location.isDefault) ?? locations[0] ?? null;
  const selectedLocation = selectedOrder?.buyerLocation ?? defaultBuyerLocation;

  const openListing = useCallback(
    async (listing: Listing) => {
      setSelectedListing(listing);
      setSharedSelectedListing(listing);
      router.push({
        pathname: "/market/product/[id]",
        params: { id: listing.id },
      } as any);
    },
    [router],
  );

  const openOrder = useCallback(async (order: MarketplaceOrder) => {
    try {
      setBusy(true);
      const data = await apiRequest(`/user/marketplace/orders/${order.id}`);
      setSelectedOrder(data?.order ?? order);
      setTrackingOrderId(
        order.fulfillmentType === "SELLER_DELIVERY" ? order.id : null,
      );
      setSheet("ORDER_DETAIL");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to open order.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSocketMessage = useCallback(
    (message: any) => {
      const type = message?.type;
      if (!selectedOrder || message?.orderId !== selectedOrder.id) return;
      if (
        type === "order:status" ||
        type === "order:payment" ||
        type === "order:reached"
      ) {
        void (async () => {
          const data = await apiRequest(
            `/user/marketplace/orders/${selectedOrder.id}`,
          ).catch(() => null);
          if (data?.order) setSelectedOrder(data.order);
        })();
      }
      if (type === "order:tracking:started" && message.tracking) {
        setSelectedOrder((current) =>
          current
            ? {
                ...current,
                status: message.status ?? current.status,
                tracking: { ...current.tracking, ...message.tracking },
              }
            : current,
        );
      }
      if (message?.tracking) {
        setSelectedOrder((current) =>
          current
            ? {
                ...current,
                tracking: { ...current.tracking, ...message.tracking },
              }
            : current,
        );
      }
    },
    [selectedOrder],
  );

  useMarketplaceSocket(trackingOrderId, handleSocketMessage);

  const showAppError = (e: unknown) => {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    setError(message);
    Alert.alert("Marketplace", message);
  };

  const createLocationFromPicker = async (
    place: PickedPlace,
    existingId?: string,
  ) => {
    const payload = {
      label: place.label,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      mapplsPin: place.mapplsPin ?? null,
      landmark: place.landmark ?? null,
      isDefault: !locations.length,
    };
    if (existingId) {
      await apiRequest(`/user/marketplace/locations/${existingId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/user/marketplace/locations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    await loadLocations();
  };

  const recenterMapOnGps = async () => {
    try {
      const current = await getCurrentGps();
      setCoords(current);
    } catch (e) {
      showAppError(e);
    }
  };

  const useGpsAsLocation = async () => {
    setBusy(true);
    try {
      const gps = await getCurrentGps();
      const address = await reverseGeocode(gps);
      await createLocationFromPicker({
        label: "Current location",
        address,
        latitude: gps.latitude,
        longitude: gps.longitude,
      });
      setCoords(gps);
      setSheet("NONE");
    } catch (e) {
      showAppError(e);
    } finally {
      setBusy(false);
    }
  };

  const placeOrder = async ({
    listing,
    quantity,
    buyerLocationId,
    fulfillmentType,
    paymentMethod,
  }: {
    listing: Listing;
    quantity: number;
    buyerLocationId: string;
    fulfillmentType: FulfillmentType;
    paymentMethod: PaymentMethod;
  }) => {
    setBusy(true);
    try {
      const data = await apiRequest("/user/marketplace/orders", {
        method: "POST",
        body: JSON.stringify({
          listingId: listing.id,
          quantity,
          buyerLocationId,
          fulfillmentType,
          paymentMethod,
        }),
      });
      const order = data?.order as MarketplaceOrder;
      setSelectedOrder(order);
      setSheet("NONE");
      if (paymentMethod === "ONLINE" && order?.status === "PENDING_PAYMENT") {
        const payData = await apiRequest(
          `/user/marketplace/orders/${order.id}/payment/create`,
          { method: "POST" },
        );
        const razorpay = payData?.razorpay;
        if (!razorpay?.orderId || !razorpay?.keyId)
          throw new Error("Razorpay checkout session was not created.");

        const checkout = await RazorpayCheckout.open({
          key: razorpay.keyId,
          amount: razorpay.amount,
          currency: razorpay.currency || "INR",
          order_id: razorpay.orderId,
          name: "Agri Marketplace",
          description: `${listing.cropName} • ${listing.packSizeValue} ${listing.packSizeUnit}`,
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
              razorpay_order_id: checkout.razorpay_order_id,
              razorpay_payment_id: checkout.razorpay_payment_id,
              razorpay_signature: checkout.razorpay_signature,
            }),
          },
        );
      }
      await Promise.all([loadBuyerListings(), loadOrders()]);
      Alert.alert(
        "Order placed",
        paymentMethod === "ONLINE"
          ? "Payment confirmed. Your order is now placed."
          : "Your COD order is now placed.",
      );
    } catch (e) {
      showAppError(e);
    } finally {
      setBusy(false);
    }
  };

  const updateSellerOrder = async (orderId: string, status: string) => {
    setBusy(true);
    try {
      const data = await apiRequest(
        `/user/marketplace/orders/${orderId}/status`,
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      if (selectedOrder?.id === orderId)
        setSelectedOrder(data?.order ?? selectedOrder);
      await loadOrders();
    } catch (e) {
      showAppError(e);
    } finally {
      setBusy(false);
    }
  };

  const startDelivery = async (order: MarketplaceOrder) => {
    setBusy(true);
    try {
      const current = await getCurrentGps();
      const gpsData = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await apiRequest(`/user/marketplace/orders/${order.id}/tracking/start`, {
        method: "POST",
        body: JSON.stringify({
          latitude: current.latitude,
          longitude: current.longitude,
          heading: gpsData.coords.heading,
          speedKmh: (gpsData.coords.speed ?? 0) * 3.6,
        }),
      });
      setTrackingOrderId(order.id);
      const detail = await apiRequest(`/user/marketplace/orders/${order.id}`);
      setSelectedOrder(detail?.order ?? order);
      await loadOrders();
    } catch (e) {
      showAppError(e);
    } finally {
      setBusy(false);
    }
  };

  const markReached = async (order: MarketplaceOrder) => {
    setBusy(true);
    try {
      const current = await getCurrentGps();
      const data = await apiRequest(
        `/user/marketplace/orders/${order.id}/tracking/reached`,
        {
          method: "POST",
          body: JSON.stringify(current),
        },
      );
      setSelectedOrder(data?.order ?? order);
      await loadOrders();
      Alert.alert(
        "Reached",
        "You are within the backend's 500 m handover radius.",
      );
    } catch (e) {
      showAppError(e);
    } finally {
      setBusy(false);
    }
  };

  const collectCash = async (order: MarketplaceOrder) => {
    Alert.alert(
      "Collect cash",
      `Collect ${money(order.totalAmount)} from the buyer?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark paid",
          onPress: async () => {
            setBusy(true);
            try {
              const data = await apiRequest(
                `/user/marketplace/orders/${order.id}/payment/cash`,
                { method: "POST" },
              );
              setSelectedOrder(data?.order ?? order);
              await loadOrders();
            } catch (e) {
              showAppError(e);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const cancelOrder = async (order: MarketplaceOrder) => {
    Alert.alert("Cancel order", "Are you sure you want to cancel this order?", [
      { text: "Keep order", style: "cancel" },
      {
        text: "Cancel order",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            const data = await apiRequest(
              `/user/marketplace/orders/${order.id}/cancel`,
              { method: "POST" },
            );
            setSelectedOrder(data?.order ?? { ...order, status: "CANCELLED" });
            await Promise.all([loadOrders(), loadBuyerListings()]);
          } catch (e) {
            showAppError(e);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const createDoorstepUpi = async (order: MarketplaceOrder) => {
    setBusy(true);
    try {
      const data = await apiRequest(
        `/user/marketplace/orders/${order.id}/payment/upi`,
        { method: "POST" },
      );
      const shortUrl = data?.payment?.shortUrl;
      if (!shortUrl)
        throw new Error("The backend did not return a UPI payment link.");
      setDoorstepPaymentUrl(shortUrl);
      setSheet("PAYMENT");
    } catch (e) {
      showAppError(e);
    } finally {
      setBusy(false);
    }
  };

  const saveListing = async (payload: any, editingId?: string) => {
    setBusy(true);
    try {
      const endpoint = editingId
        ? `/user/marketplace/listings/${editingId}`
        : "/user/marketplace/listings";
      const data = await apiRequest(endpoint, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      const listing = data?.listing;
      setSheet("NONE");
      await loadSellerData();
      Alert.alert(
        "Marketplace",
        listing?.status === "ACTIVE" ? "Listing is live." : "Listing saved.",
      );
    } catch (e) {
      showAppError(e);
    } finally {
      setBusy(false);
    }
  };

  const removeListing = async (listingId: string) => {
    Alert.alert(
      "Remove listing",
      "This will stop new buyers from ordering it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await apiRequest(`/user/marketplace/listings/${listingId}`, {
                method: "DELETE",
              });
              await loadSellerData();
            } catch (e) {
              showAppError(e);
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (authLoading || initialLoading) {
    return (
      <View className="flex-1 bg-[#0C0D0B] items-center justify-center p-[28px]">
        <ActivityIndicator size="large" color={C.green} />
        <Text className="mt-[12px] text-[#A2A79E] text-[13px]">
          Opening marketplace…
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-[#0C0D0B] items-center justify-center p-[28px]">
        <Text className="text-[#F6F7F4] text-[17px] font-extrabold text-center">
          Sign in to use the marketplace.
        </Text>
      </View>
    );
  }

  const activeOrders = mode === "BUYER" ? buyingOrders : sellingOrders;
  const sharedLocation = getSelectedLocation();
  const mapCenter = sharedLocation
    ? {
        latitude: Number(sharedLocation.latitude),
        longitude: Number(sharedLocation.longitude),
      }
    : defaultBuyerLocation
      ? {
          latitude: Number(defaultBuyerLocation.latitude),
          longitude: Number(defaultBuyerLocation.longitude),
        }
      : (coords ?? { latitude: 12.9716, longitude: 77.5946 });

  // RENDER FLOW: the buyer header stays mounted. Only the canvas below it changes between MAP and LIST.
  return (
    <View className="flex-1 bg-[#0C0D0B]">
      <StatusBar
        style="light"
        translucent={mode === "BUYER"}
        backgroundColor={mode === "BUYER" ? "transparent" : C.bg}
      />

      {mode === "BUYER" ? (
        <>
          {/* FIXED MARKETPLACE HEADER: these controls never scroll away or get replaced. */}
          <View
            className="relative z-0 gap-3 border-b border-[#30352D] bg-transparent px-4 pb-20"
            style={{ paddingTop: insets.top + 8 }}
          >
            <LinearGradient
              // 1. Starts solid #094BDB, then fades into deeper midnight blues
              colors={["#094BDB", "#094BDB", "#04256E", "#010A1C"]}

              // 2. Holds the solid color until 30% down the screen
              locations={[0, 0.3, 0.7, 1]}

              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFillObject}
              pointerEvents="none"
            />

            {/* Rest of your content goes here */}

            {/* Search stays shared between map and list. */}
            <View
              className="min-h-[54px] pl-[16px] pr-[7px] flex-row items-center gap-[9px] bg-[#171916] border border-[#30352D] rounded-[20px] mb-4"
              style={nativeStyles.mapSearchBar}
            >
              <Feather name="search" size={19} color={C.primary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search fresh harvests"
                placeholderTextColor={C.muted}
                className="flex-1 min-w-[0px] text-[#F6F7F4] text-[14px] py-[0px]"
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Feather name="x-circle" size={17} color={C.muted} />
                </Pressable>
              )}
              <View className="h-[24px] w-[1px] bg-[#30352D]" />
              <Pressable
                onPress={() => router.push("/market/location" as any)}
                accessibilityRole="button"
                accessibilityLabel="Choose delivery location"
                className="w-[40px] h-[40px] rounded-[14px] bg-[#202A19] items-center justify-center"
              >
                <Feather name="map-pin" size={18} color={C.primary} />
              </Pressable>
            </View>

            {/* Five primary actions. MAP/LIST highlight changes; the row itself stays fixed. */}
            <MarketplaceActionBar
              colors={C}
              active={viewMode}
              onMaps={() => setViewMode("MAP")}
              onList={() => setViewMode("LIST")}
              onSell={() => router.push("/market/sell" as any)}
              onLocation={() => router.push("/market/location" as any)}
              onCart={() => router.push("/market/cart" as any)}
            />

            {/* Shared radius filters and product count. They appear identically in both modes. */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-[8px] pr-[2px] mt-[16px]"
            >
              {[2, 5, 10, 25].map((value) => {
                const active = radiusKm === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setRadiusKm(value)}
                    className={
                      active
                        ? "h-[34px] min-w-[58px] px-[13px] rounded-full items-center justify-center border bg-[#C8FF67] border-[#C8FF67]"
                        : "h-[34px] min-w-[58px] px-[13px] rounded-full items-center justify-center bg-[#171916] border border-[#30352D]"
                    }
                    style={({ pressed }) =>
                      pressed ? nativeStyles.marketHeaderPressed : undefined
                    }
                  >
                    <Text
                      className={
                        active
                          ? "text-[11px] font-extrabold text-[#080907]"
                          : "text-[#F6F7F4] text-[11px] font-extrabold"
                      }
                    >
                      {value} km
                    </Text>
                  </Pressable>
                );
              })}
              <View className="h-[34px] min-w-[58px] px-[13px] rounded-full items-center justify-center bg-[#171916] border border-[#30352D]">
                <Text className="text-[#F6F7F4] text-[11px] font-extrabold">
                  {listings.length} nearby
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* CONTENT CANVAS: this is the only area swapped when MAP or LIST is selected. */}
          <View className="relative z-10 -mt-12 flex-1 min-h-0 overflow-hidden rounded-t-[35px] bg-[#080907]">
            {viewMode === "MAP" ? (
              <MapsView
                colors={C}
                center={mapCenter}
                radiusKm={radiusKm}
                listings={listings}
                onRecenter={() => void recenterMapOnGps()}
                onOpenListing={(listing) =>
                  void openListing(listing as Listing)
                }
              />
            ) : (
              <FlatList
                className="flex-1 bg-[#0C0D0B]"
                data={listings}
                keyExtractor={(item) => item.id}
                numColumns={1}
                contentContainerClassName="px-[15px] pb-[30px] grow"
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={refreshAll}
                    tintColor={C.green}
                  />
                }
                ListHeaderComponent={
                  <View className="pt-[14px] pb-[12px]">
                    <View className="flex-row items-center justify-between gap-[12px]">
                      <View className="flex-1">
                        <Text className="text-[#F6F7F4] text-[17px] font-black">
                          Fresh near you
                        </Text>
                        <Text className="text-[#A2A79E] text-[10.5px]">
                          {listings.length} products · within {radiusKm} km
                        </Text>
                      </View>
                      <Pressable
                        onPress={() =>
                          setSort(
                            sort === "PRICE_ASC" ? "PRICE_DESC" : "PRICE_ASC",
                          )
                        }
                        className="h-[34px] min-w-[58px] px-[13px] rounded-full items-center justify-center bg-[#171916] border border-[#30352D]"
                        style={({ pressed }) =>
                          pressed ? nativeStyles.marketHeaderPressed : undefined
                        }
                      >
                        <Feather name="chevrons-down" size={13} color={C.ink} />
                        <Text className="text-[#F6F7F4] text-[11px] font-extrabold">
                          {sort === "PRICE_DESC" ? "Price: high" : "Price: low"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                }
                renderItem={({ item }) => (
                  <ListingCard
                    listing={item}
                    onPress={() => void openListing(item)}
                  />
                )}
                ListEmptyComponent={
                  <EmptyState
                    icon="leaf-outline"
                    title="Nothing nearby yet"
                    body="Increase your search radius or try a different crop."
                    action="Try 25 km"
                    onPress={() => setRadiusKm(25)}
                  />
                }
                ListFooterComponent={<View className="h-[34px]" />}
              />
            )}
          </View>
        </>
      ) : (
        <ScrollView
          contentContainerClassName="px-[14px] pt-[3px] pb-[50px]"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshAll}
              tintColor={C.green}
            />
          }
        >
          <View className="bg-[rgba(200,255,103,0.14)] border border-[#CBEAD2] rounded-[20px] p-[14px] flex-row items-center gap-[10px]">
            <View className="w-[45px] h-[45px] rounded-[15px] bg-[#171916] items-center justify-center">
              <Ionicons name="basket-outline" size={25} color={C.greenDark} />
            </View>
            <View className="flex-1">
              <Text className="text-[#0C0D0B] text-[14px] font-black">
                Turn your grow records into sales
              </Text>
              <Text className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[2px]">
                Harvested and upcoming crops are already linked to your account.
              </Text>
            </View>
            <Pressable
              onPress={() => setSheet("SELLER_LISTING")}
              className="w-[37px] h-[37px] rounded-[13px] bg-[#C8FF67] items-center justify-center"
            >
              <Feather name="plus" size={18} color={C.black} />
            </Pressable>
          </View>

          <View className="flex-row gap-[9px] my-[14px]">
            <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[16px] p-[11px]">
              <Text className="text-[#F6F7F4] text-[19px] font-black">
                {crops.length}
              </Text>
              <Text className="text-[#A2A79E] text-[9.5px] font-bold mt-[2px]">
                Sellable crops
              </Text>
            </View>
            <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[16px] p-[11px]">
              <Text className="text-[#F6F7F4] text-[19px] font-black">
                {
                  myListings.filter((listing) => listing.status === "ACTIVE")
                    .length
                }
              </Text>
              <Text className="text-[#A2A79E] text-[9.5px] font-bold mt-[2px]">
                Live listings
              </Text>
            </View>
            <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[16px] p-[11px]">
              <Text className="text-[#F6F7F4] text-[19px] font-black">
                {
                  sellingOrders.filter(
                    (order) =>
                      !["COMPLETED", "CANCELLED"].includes(order.status),
                  ).length
                }
              </Text>
              <Text className="text-[#A2A79E] text-[9.5px] font-bold mt-[2px]">
                Open orders
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between mb-[9px]">
            <View>
              <Text className="text-[#F6F7F4] text-[18px] font-extrabold">
                Your sellable crops
              </Text>
              <Text className="text-[#A2A79E] text-[11.5px] mt-[2px]">
                Pick a crop to create or update its listing
              </Text>
            </View>
          </View>

          {crops.length === 0 ? (
            <EmptyState
              icon="nutrition-outline"
              title="No crops ready for marketplace"
              body="Your marketplace crops come from the active crop cycles attached to your growing racks."
            />
          ) : (
            crops.map((crop) => (
              <Pressable
                key={crop.id}
                onPress={() => {
                  setSelectedListing(
                    myListings.find(
                      (listing) => listing.cropCycle?.id === crop.id,
                    ) ?? null,
                  );
                  setSheet("SELLER_LISTING");
                }}
                className="bg-[#171916] border border-[#30352D] rounded-[16px] p-[11px] flex-row items-center gap-[10px] mb-[8px]"
              >
                <View className="w-[40px] h-[40px] rounded-[13px] bg-[rgba(200,255,103,0.14)] items-center justify-center">
                  <Ionicons name="leaf-outline" size={21} color={C.green} />
                </View>
                <View className="flex-1">
                  <Text className="text-[#F6F7F4] text-[12.5px] font-extrabold">
                    {crop.cropName}
                  </Text>
                  <Text className="text-[#A2A79E] text-[10px] mt-[3px]">
                    {crop.status} • {crop.tray?.name ?? "Tray"}{" "}
                    {crop.selling?.hasListing ? "• listed" : "• not listed"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.muted} />
              </Pressable>
            ))
          )}

          <View className="flex-row items-center justify-between mb-[9px]">
            <View>
              <Text className="text-[#F6F7F4] text-[18px] font-extrabold">
                Live & past listings
              </Text>
              <Text className="text-[#A2A79E] text-[11.5px] mt-[2px]">
                Pause, edit or remove without losing the crop record
              </Text>
            </View>
          </View>
          {myListings.length === 0 ? (
            <EmptyState
              icon="storefront-outline"
              title="No listings yet"
              body="Start from one of your sellable crops above."
              action="Create listing"
              onPress={() => setSheet("SELLER_LISTING")}
            />
          ) : (
            myListings.map((listing) => (
              <View
                key={listing.id}
                className="bg-[#171916] rounded-[17px] border border-[#30352D] p-[11px] flex-row gap-[10px] mb-[9px]"
              >
                <View className="w-[61px] h-[61px] rounded-[14px] overflow-hidden bg-[#202A19] items-center justify-center">
                  {listing.imageUrl ? (
                    <Image
                      source={{ uri: listing.imageUrl }}
                      className="w-full h-full"
                    />
                  ) : (
                    <Ionicons name="leaf-outline" size={26} color={C.green} />
                  )}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between gap-[8px]">
                    <Text className="text-[#F6F7F4] text-[13.5px] font-extrabold flex-1">
                      {listing.cropName}
                    </Text>
                    <Pill
                      tone={listing.status === "ACTIVE" ? "green" : "orange"}
                    >
                      {listing.status}
                    </Pill>
                  </View>
                  <Text className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]">
                    {money(listing.price)} / {listing.packSizeValue}
                    {listing.packSizeUnit} • {listing.quantityAvailable} packs •{" "}
                    {listing.orderCount ?? 0} orders
                  </Text>
                  <Text
                    className="text-[#A2A79E] text-[9.5px] mt-[3px]"
                    numberOfLines={1}
                  >
                    {listing.sellerLocation?.label ??
                      listing.sellerLocation?.address ??
                      "Location not set"}
                  </Text>
                  <View className="flex-row gap-[7px] mt-[9px]">
                    <Pressable
                      onPress={() => {
                        setSelectedListing(listing);
                        setSheet("SELLER_LISTING");
                      }}
                      className="flex-row items-center gap-[5px] bg-[#171916] border border-[#30352D] rounded-[9px] px-[9px] py-[6px]"
                    >
                      <Feather name="edit-2" size={13} color={C.ink} />
                      <Text className="text-[#F6F7F4] text-[9.5px] font-extrabold">
                        Edit
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeListing(listing.id)}
                      className="flex-row items-center gap-[5px] bg-[#171916] border border-[#30352D] rounded-[9px] px-[9px] py-[6px]"
                      style={{ backgroundColor: C.dangerSoft }}
                    >
                      <Feather name="trash-2" size={13} color={C.red} />
                      <Text
                        className="text-[#F6F7F4] text-[9.5px] font-extrabold"
                        style={{ color: C.red }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
          <View className="h-[120px]" />
        </ScrollView>
      )}

      {/* SECTION: Marketplace sheets — listing, checkout, location, orders and payment flows. */}
      <BottomSheet
        visible={sheet === "LISTING" && !!selectedListing}
        title={selectedListing?.cropName ?? "Listing"}
        onClose={() => setSheet("NONE")}
        height="92%"
      >
        {selectedListing && (
          <BuyerListingSheet
            listing={selectedListing}
            locations={locations}
            busy={busy}
            onAddLocation={() => setSheet("LOCATION")}
            onCheckout={(selection) =>
              placeOrder({ listing: selectedListing, ...selection })
            }
          />
        )}
      </BottomSheet>

      <BottomSheet
        visible={sheet === "CHECKOUT" && !!selectedListing}
        title="Checkout"
        onClose={() => setSheet("NONE")}
        height="92%"
      >
        {selectedListing && (
          <CheckoutSheet
            listing={selectedListing}
            locations={locations}
            onAddLocation={() => setSheet("LOCATION")}
            busy={busy}
            onConfirm={(selection) =>
              placeOrder({ listing: selectedListing, ...selection })
            }
          />
        )}
      </BottomSheet>

      <BottomSheet
        visible={sheet === "LOCATION"}
        title="Your locations"
        onClose={() => setSheet("NONE")}
        height="96%"
        hideHeader
      >
        <LocationSheet
          locations={locations}
          busy={busy}
          onUseGps={useGpsAsLocation}
          onReload={loadLocations}
          onClose={() => setSheet("NONE")}
          initialCoords={coords}
          onLocationSaved={(place) =>
            setCoords({ latitude: place.latitude, longitude: place.longitude })
          }
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === "SELLER_LISTING"}
        title={
          selectedListing
            ? `Edit ${selectedListing.cropName}`
            : "Publish a harvest"
        }
        onClose={() => {
          setSelectedListing(null);
          setSheet("NONE");
        }}
        height="94%"
      >
        <SellerListingSheet
          crops={crops}
          locations={locations}
          existing={selectedListing}
          busy={busy}
          onAddLocation={() => setSheet("LOCATION")}
          onSave={saveListing}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === "ORDERS"}
        title={mode === "BUYER" ? "Your purchases" : "Your sales"}
        onClose={() => setSheet("NONE")}
        height="92%"
      >
        <OrdersSheet
          orders={activeOrders}
          mode={mode}
          onOpen={openOrder}
          busy={busy}
        />
      </BottomSheet>

      <BottomSheet
        visible={sheet === "ORDER_DETAIL" && !!selectedOrder}
        title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : "Order"}
        onClose={() => {
          setTrackingOrderId(null);
          setSheet("NONE");
        }}
        height="95%"
      >
        {selectedOrder && (
          <OrderDetailSheet
            order={selectedOrder}
            mode={mode}
            busy={busy}
            onStatus={updateSellerOrder}
            onStartDelivery={startDelivery}
            onReached={markReached}
            onCash={collectCash}
            onUpi={createDoorstepUpi}
            onCancel={cancelOrder}
          />
        )}
      </BottomSheet>

      <BottomSheet
        visible={sheet === "PAYMENT"}
        title="Payment"
        onClose={() => {
          setDoorstepPaymentUrl(null);
          setSheet("NONE");
        }}
        height="70%"
      >
        {selectedOrder && (
          <DoorstepPaymentSheet
            order={selectedOrder}
            shortUrl={doorstepPaymentUrl}
          />
        )}
      </BottomSheet>

      {!!error && (
        <Pressable
          onPress={() => setError(null)}
          className="absolute left-[14px] right-[14px] bottom-[16px] rounded-[14px] bg-[#202A22] px-[12px] py-[10px] flex-row items-center gap-[8px]"
          style={nativeStyles.errorToast}
        >
          <Feather name="alert-circle" size={15} color={C.white} />
          <Text
            className="text-[#FFFFFF] text-[10.5px] leading-[15px] flex-1"
            numberOfLines={2}
          >
            {error}
          </Text>
          <Feather name="x" size={15} color={C.white} />
        </Pressable>
      )}

      {busy && (
        <View className="absolute top-[0px] bottom-[0px] left-[0px] right-[0px] bg-[rgba(21,32,26,0.15)] items-center justify-center">
          <ActivityIndicator color={C.white} />
        </View>
      )}
    </View>
  );
}

function BuyerListingSheet({
  listing,
  locations,
  busy,
  onAddLocation,
  onCheckout,
}: {
  listing: Listing;
  locations: LocationRecord[];
  busy: boolean;
  onAddLocation: () => void;
  onCheckout: (selection: {
    quantity: number;
    buyerLocationId: string;
    fulfillmentType: FulfillmentType;
    paymentMethod: PaymentMethod;
  }) => void;
}) {
  const [quantity, setQuantity] = useState(
    Math.max(1, listing.minOrderQuantity),
  );
  const [fulfillment, setFulfillment] = useState<FulfillmentType>(
    listing.sellerDelivery ? "SELLER_DELIVERY" : "CUSTOMER_PICKUP",
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("ONLINE");
  const [route, setRoute] = useState<{
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const location = locations.find((item) => item.isDefault) ?? locations[0];
  const subtotal = num(listing.price) * quantity;
  const deliveryFee =
    fulfillment === "SELLER_DELIVERY" ? num(listing.deliveryFee) : 0;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (!location || !listing.sellerLocation) return;
    setRouteLoading(true);
    apiRequest("/user/marketplace/map/distance", {
      method: "POST",
      body: JSON.stringify({
        origin: { latitude: location.latitude, longitude: location.longitude },
        destination: {
          latitude: listing.sellerLocation.latitude,
          longitude: listing.sellerLocation.longitude,
        },
        route: true,
        traffic: true,
      }),
    })
      .then((data) =>
        setRoute(
          data?.route
            ? {
                distanceKm: num(data.route.distanceKm),
                durationMinutes: num(data.route.durationMinutes),
              }
            : null,
        ),
      )
      .catch(() => setRoute(null))
      .finally(() => setRouteLoading(false));
  }, [location?.id, fulfillment, listing.id]);

  const canDelivery = !!listing.sellerDelivery;
  const canPickup = !!listing.customerPickup;

  return (
    <ScrollView
      contentContainerClassName="px-[17px] pb-[20px]"
      showsVerticalScrollIndicator={false}
    >
      <View className="h-[230px] bg-[#202A19] rounded-[21px] items-center justify-center overflow-hidden">
        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} className="w-full h-full" />
        ) : (
          <Ionicons name="leaf-outline" size={52} color={C.green} />
        )}
      </View>

      <View className="flex-row items-start mt-[13px] gap-[12px]">
        <View className="flex-1">
          <Text className="text-[#F6F7F4] text-[22px] font-black">
            {listing.cropName}
          </Text>
          <Text className="text-[#A2A79E] text-[11px] leading-[16px] mt-[3px]">
            {listing.packSizeValue} {listing.packSizeUnit} •{" "}
            {listing.quantityAvailable} available • by{" "}
            {listing.seller?.username ?? "Local grower"}
          </Text>
        </View>
        <Text className="text-[#F6F7F4] text-[21px] font-black">
          {money(listing.price)}
        </Text>
      </View>

      {listing.description ? (
        <Text className="text-[#A2A79E] text-[11.5px] leading-[17px] mt-[9px]">
          {listing.description}
        </Text>
      ) : null}
      <View className="flex-row gap-[8px] mt-[14px]">
        <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[15px] p-[10px]">
          <Feather name="package" size={15} color={C.green} />
          <Text className="text-[#A2A79E] text-[9px] font-bold mt-[5px]">
            Pack
          </Text>
          <Text className="text-[#F6F7F4] text-[12.5px] font-black mt-[2px]">
            {listing.packSizeValue}
            {listing.packSizeUnit}
          </Text>
        </View>
        <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[15px] p-[10px]">
          <Feather name="percent" size={15} color={C.orange} />
          <Text className="text-[#A2A79E] text-[9px] font-bold mt-[5px]">
            Save
          </Text>
          <Text className="text-[#F6F7F4] text-[12.5px] font-black mt-[2px]">
            {Math.round(num(listing.discountPercent))}%
          </Text>
        </View>
        <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[15px] p-[10px]">
          <Feather name="navigation" size={15} color={C.blue} />
          <Text className="text-[#A2A79E] text-[9px] font-bold mt-[5px]">
            Distance
          </Text>
          <Text className="text-[#F6F7F4] text-[12.5px] font-black mt-[2px]">
            {fmtKm(listing.distanceKm)}
          </Text>
        </View>
      </View>

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        Quantity
      </Text>
      <View className="flex-row items-center justify-between gap-[8px]">
        <Text className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]">
          Minimum {listing.minOrderQuantity}
          {listing.maxOrderQuantity
            ? ` • Maximum ${listing.maxOrderQuantity}`
            : ""}
        </Text>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          min={listing.minOrderQuantity}
          max={Math.min(
            listing.maxOrderQuantity ?? 10000,
            listing.quantityAvailable,
          )}
        />
      </View>

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        Choose how you receive it
      </Text>
      <View className="flex-row gap-[8px]">
        {canDelivery && (
          <OptionCard
            icon="truck"
            title="Seller delivery"
            subtitle={
              listing.deliveryRadiusKm
                ? `Within ${listing.deliveryRadiusKm} km`
                : "Local delivery"
            }
            selected={fulfillment === "SELLER_DELIVERY"}
            onPress={() => setFulfillment("SELLER_DELIVERY")}
          />
        )}
        {canPickup && (
          <OptionCard
            icon="map-pin"
            title="Customer pickup"
            subtitle="Collect from seller"
            selected={fulfillment === "CUSTOMER_PICKUP"}
            onPress={() => setFulfillment("CUSTOMER_PICKUP")}
          />
        )}
      </View>

      <View className="bg-[#171916] border border-[#30352D] rounded-[15px] mt-[12px] p-[10px] flex-row items-center gap-[8px]">
        <View className="w-[30px] h-[30px] rounded-[10px] bg-[rgba(200,255,103,0.14)] items-center justify-center mr-[9px]">
          <Feather name="map-pin" size={15} color={C.greenDark} />
        </View>
        <View className="flex-1">
          <Text className="text-[#A2A79E] text-[10px] font-bold uppercase tracking-[0.7px]">
            Your location
          </Text>
          <Text className="text-[#F6F7F4] text-[12.5px] font-extrabold mt-[2px]">
            {location?.label ?? "No location selected"}
          </Text>
          <Text
            className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]"
            numberOfLines={1}
          >
            {location?.address ?? "Add a precise delivery/pickup point"}
          </Text>
        </View>
        <Pressable onPress={onAddLocation}>
          <Text className="text-[#0C0D0B] text-[10.5px] font-black">
            {location ? "Change" : "Add"}
          </Text>
        </Pressable>
      </View>

      {location && routeLoading ? (
        <View className="mt-[9px] bg-[rgba(200,255,103,0.14)] rounded-[12px] px-[11px] py-[8px] flex-row items-center gap-[7px]">
          <ActivityIndicator size="small" color={C.green} />
          <Text className="text-[#0C0D0B] text-[10.5px] font-extrabold">
            Checking road distance…
          </Text>
        </View>
      ) : route ? (
        <View className="mt-[9px] bg-[rgba(200,255,103,0.14)] rounded-[12px] px-[11px] py-[8px] flex-row items-center gap-[7px]">
          <Feather name="navigation" size={14} color={C.green} />
          <Text className="text-[#0C0D0B] text-[10.5px] font-extrabold">
            {route.distanceKm.toFixed(1)} km by road • about{" "}
            {route.durationMinutes} min
          </Text>
        </View>
      ) : null}

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        Payment
      </Text>
      <View className="flex-row gap-[8px]">
        <OptionCard
          icon="credit-card"
          title="Online"
          subtitle="Razorpay"
          selected={paymentMethod === "ONLINE"}
          onPress={() => setPaymentMethod("ONLINE")}
        />
        <OptionCard
          icon="dollar-sign"
          title="COD"
          subtitle="Pay on handover"
          selected={paymentMethod === "COD"}
          onPress={() => setPaymentMethod("COD")}
        />
      </View>

      <View className="bg-[#171916] border border-[#30352D] rounded-[17px] p-[13px] mt-[14px]">
        <View className="flex-row items-center justify-between gap-[8px]">
          <Text className="text-[#A2A79E] text-[10.5px] font-bold">
            Subtotal
          </Text>
          <Text className="text-[#F6F7F4] text-[10.5px] font-extrabold">
            {money(subtotal)}
          </Text>
        </View>
        {num(listing.discountPercent) > 0 && (
          <View className="flex-row items-center justify-between gap-[8px]">
            <Text
              className="text-[#A2A79E] text-[10.5px] font-bold"
              style={{ color: C.green }}
            >
              Discount
            </Text>
            <Text
              className="text-[#F6F7F4] text-[10.5px] font-extrabold"
              style={{ color: C.green }}
            >
              −{money(num(listing.originalPrice - listing.price) * quantity)}
            </Text>
          </View>
        )}
        <View className="flex-row items-center justify-between gap-[8px]">
          <Text className="text-[#A2A79E] text-[10.5px] font-bold">
            Delivery
          </Text>
          <Text className="text-[#F6F7F4] text-[10.5px] font-extrabold">
            {deliveryFee ? money(deliveryFee) : "FREE"}
          </Text>
        </View>
        <View className="h-[1px] bg-[#30352D] my-[10px]" />
        <View className="flex-row items-center justify-between gap-[8px]">
          <Text className="text-[#F6F7F4] text-[13px] font-black">Total</Text>
          <Text className="text-[#0C0D0B] text-[19px] font-black">
            {money(total)}
          </Text>
        </View>
      </View>

      <Pressable
        disabled={!location || busy}
        onPress={() => {
          if (!location) {
            onAddLocation();
            return;
          }
          onCheckout({
            quantity,
            buyerLocationId: location.id,
            fulfillmentType: fulfillment,
            paymentMethod,
          });
        }}
        className="min-h-[50px] mt-[13px] rounded-[16px] bg-[#C8FF67] px-[16px] flex-row items-center justify-center gap-[8px]"
        style={!location ? { opacity: 0.6 } : undefined}
      >
        <Text className="text-[#080907] text-[12.5px] font-black">
          {paymentMethod === "ONLINE"
            ? `Pay ${money(total)}`
            : `Place COD order • ${money(total)}`}
        </Text>
        <Feather name="arrow-right" size={18} color={C.white} />
      </Pressable>
      <Text className="text-[#A2A79E] text-[9.5px] leading-[14px] text-center mt-[9px] px-[12px]">
        Your precise coordinates are used by the marketplace backend to enforce
        the seller’s delivery radius and calculate road distance.
      </Text>
    </ScrollView>
  );
}

function CheckoutSheet({
  listing,
  locations,
  busy,
  onAddLocation,
  onConfirm,
}: {
  listing: Listing;
  locations: LocationRecord[];
  busy: boolean;
  onAddLocation: () => void;
  onConfirm: (selection: {
    quantity: number;
    buyerLocationId: string;
    fulfillmentType: FulfillmentType;
    paymentMethod: PaymentMethod;
  }) => void;
}) {
  return (
    <BuyerListingSheet
      listing={listing}
      locations={locations}
      busy={busy}
      onAddLocation={onAddLocation}
      onCheckout={onConfirm}
    />
  );
}

function OptionCard({
  icon,
  title,
  subtitle,
  selected,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={
        selected
          ? "flex-1 min-h-[67px] border rounded-[15px] p-[10px] flex-row items-center gap-[8px] border-[#CBEAD2] bg-[#171916]"
          : "flex-1 min-h-[67px] bg-[#171916] border border-[#30352D] rounded-[15px] p-[10px] flex-row items-center gap-[8px]"
      }
    >
      <View
        className="w-[31px] h-[31px] rounded-[10px] bg-[#20221E] items-center justify-center"
        style={selected ? { backgroundColor: C.greenSoft } : undefined}
      >
        <Feather
          name={icon}
          size={17}
          color={selected ? C.greenDark : C.muted}
        />
      </View>
      <View className="flex-1">
        <Text
          className="text-[#F6F7F4] text-[10.5px] font-black"
          style={selected ? { color: C.greenDark } : undefined}
        >
          {title}
        </Text>
        <Text className="text-[#A2A79E] text-[8.8px] mt-[2px]">{subtitle}</Text>
      </View>
      <View
        className={
          selected
            ? "w-[17px] h-[17px] rounded-full border-[1.5px] items-center justify-center border-[#C8FF67]"
            : "w-[17px] h-[17px] rounded-full border-[1.5px] border-[#A2A79E] items-center justify-center"
        }
      >
        {selected && (
          <View className="w-[9px] h-[9px] rounded-full bg-[#C8FF67]" />
        )}
      </View>
    </Pressable>
  );
}

function LocationPicker({
  initial,
  onPicked,
  saving,
}: {
  initial?: Coordinates;
  onPicked: (place: PickedPlace) => void;
  saving: boolean;
}) {
  const start = initial ?? { latitude: 12.9716, longitude: 77.5946 };
  const [center, setCenter] = useState<Coordinates>(start);
  const mapRef = useRef<MapView | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<PickedPlace | null>(null);

  useEffect(() => {
    if (initial) setCenter(initial);
  }, [initial?.latitude, initial?.longitude]);

  useEffect(() => {
    mapRef.current?.animateToRegion(
      { ...center, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      280,
    );
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!MAPBOX_ACCESS_TOKEN || trimmed.length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({
          q: trimmed,
          autocomplete: "true",
          limit: "6",
          country: "in",
          language: "en",
          proximity: `${center.longitude},${center.latitude}`,
          access_token: MAPBOX_ACCESS_TOKEN,
        });
        const response = await fetch(
          `https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`,
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(payload?.message ?? "Mapbox search failed.");
        setResults(Array.isArray(payload?.features) ? payload.features : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, center.latitude, center.longitude]);

  const chooseFeature = (feature: any) => {
    const place = normalizePickerResult(feature);
    if (!place) return;
    setCenter({ latitude: place.latitude, longitude: place.longitude });
    setPicked(place);
    setQuery(place.address);
    setResults([]);
  };

  const handleMapPress = async (event: any) => {
    const coordinates = event?.geometry?.coordinates ?? event?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return;
    const next = {
      latitude: Number(coordinates[1]),
      longitude: Number(coordinates[0]),
    };
    if (!Number.isFinite(next.latitude) || !Number.isFinite(next.longitude))
      return;
    setCenter(next);
    try {
      const place = await mapboxReverseGeocode(next);
      setPicked(place);
      setQuery(place.address);
    } catch {
      setPicked({
        label: "Pinned location",
        address: `Pinned location (${next.latitude.toFixed(6)}, ${next.longitude.toFixed(6)})`,
        latitude: next.latitude,
        longitude: next.longitude,
        mapplsPin: null,
        landmark: null,
      });
      setQuery("Pinned location");
    }
    setResults([]);
  };

  const confirm = async () => {
    const place =
      picked ??
      (await mapboxReverseGeocode(center).catch(
        () =>
          ({
            label: "Pinned location",
            address: `Pinned location (${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)})`,
            latitude: center.latitude,
            longitude: center.longitude,
            mapplsPin: null,
            landmark: null,
          }) as PickedPlace,
      ));
    onPicked(place);
  };

  return (
    <View className="flex-1 bg-[#0C0D0B]">
      <View className="mx-[14px] mb-[8px] bg-[#171916] border border-[#30352D] rounded-[15px] min-h-[47px] px-[12px] flex-row items-center gap-[8px]">
        <Feather name="search" size={17} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search address, area or landmark"
          placeholderTextColor={C.muted}
          className="flex-1 text-[#F6F7F4] text-[12px] font-bold py-[0px]"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" color={C.green} /> : null}
      </View>

      {results.length > 0 && (
        <View className="mx-[14px] bg-[#171916] border border-[#30352D] rounded-[15px] overflow-hidden mb-[8px]">
          {results.map((feature) => {
            const title =
              feature?.properties?.name_preferred ??
              feature?.properties?.name ??
              feature?.text ??
              "Location";
            const subtitle =
              feature?.properties?.place_formatted ?? feature?.place_name ?? "";
            return (
              <Pressable
                key={String(feature.id)}
                onPress={() => chooseFeature(feature)}
                className="flex-row items-center gap-[9px] px-[11px] py-[10px] border-b border-b-[#30352D]"
              >
                <View className="w-[30px] h-[30px] rounded-[10px] bg-[rgba(200,255,103,0.14)] items-center justify-center">
                  <Feather name="map-pin" size={14} color={C.greenDark} />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-[#F6F7F4] text-[11px] font-black"
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  <Text
                    className="text-[#A2A79E] text-[9.5px] leading-[13px] mt-[2px]"
                    numberOfLines={2}
                  >
                    {subtitle}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <View className="flex-1 min-h-[300px] mx-[14px] rounded-[18px] overflow-hidden border border-[#30352D] bg-[#20221E]">
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          userInterfaceStyle="dark"
          customMapStyle={DARK_MAP_STYLE}
          initialRegion={{
            latitude: center.latitude,
            longitude: center.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          onPress={(event) => {
            const coordinate = event.nativeEvent.coordinate;
            void handleMapPress({
              coordinates: [coordinate.longitude, coordinate.latitude],
            });
          }}
          onMapReady={() => {
            // Map is ready; location is controlled through state below.
          }}
        >
          <Marker
            coordinate={{
              latitude: center.latitude,
              longitude: center.longitude,
            }}
            draggable
            onDragEnd={(event) => {
              const coordinate = event.nativeEvent.coordinate;
              void handleMapPress({
                coordinates: [coordinate.longitude, coordinate.latitude],
              });
            }}
            tracksViewChanges={false}
          >
            <View className="w-[32px] h-[32px] rounded-[16px] bg-[rgba(15,122,58,0.18)] items-center justify-center">
              <View className="w-[12px] h-[12px] rounded-[6px] bg-[#C8FF67] border-[2px] border-[#FFFFFF]" />
            </View>
          </Marker>
        </MapView>

        <View
          pointerEvents="none"
          className="absolute left-[12px] right-[12px] top-[12px] self-center bg-[rgba(23,28,19,0.96)] rounded-[11px] px-[10px] py-[7px] flex-row items-center justify-center gap-[5px]"
        >
          <Feather name="move" size={13} color={C.greenDark} />
          <Text className="text-[#F6F7F4] text-[9.5px] font-extrabold">
            Search above or tap anywhere on the map
          </Text>
        </View>
      </View>

      <View className="m-[14px] mt-[10px] bg-[#171916] rounded-[17px] border border-[#30352D] p-[11px] flex-row items-center gap-[10px]">
        <View className="flex-1">
          <Text className="text-[#F6F7F4] text-[11px] font-black">
            {picked?.label ?? "Selected point"}
          </Text>
          <Text
            className="text-[#A2A79E] text-[9.5px] leading-[13px] mt-[2px]"
            numberOfLines={2}
          >
            {picked?.address ??
              `${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}`}
          </Text>
        </View>
        <Pressable
          disabled={saving}
          onPress={confirm}
          className="rounded-[16px] bg-[#C8FF67] flex-row items-center justify-center gap-[8px] min-w-[128px] min-h-[42px] px-[11px]"
        >
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text className="text-[#080907] text-[12.5px] font-black">
              Use this location
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function LocationSheet({
  locations,
  busy,
  onUseGps,
  onReload,
  onClose,
  onLocationSaved,
  initialCoords,
}: {
  locations: LocationRecord[];
  busy: boolean;
  onUseGps: () => void;
  onReload: () => Promise<void>;
  onClose: () => void;
  onLocationSaved?: (place: PickedPlace) => void;
  initialCoords?: Coordinates | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<LocationRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const savePicked = async (place: PickedPlace) => {
    setSaving(true);
    try {
      const payload = {
        label: place.label,
        address: place.address,
        latitude: place.latitude,
        longitude: place.longitude,
        mapplsPin: place.mapplsPin ?? null,
        landmark: place.landmark ?? null,
        isDefault: !locations.length || !!editing?.isDefault,
      };
      if (editing) {
        await apiRequest(`/user/marketplace/locations/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/user/marketplace/locations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      await onReload();
      onLocationSaved?.(place);
      setEditing(null);
      setPickerOpen(false);
    } catch (e) {
      Alert.alert(
        "Location",
        e instanceof Error ? e.message : "Could not save location.",
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (location: LocationRecord) => {
    Alert.alert(
      "Remove location",
      "Locations referenced by listings or orders cannot be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/user/marketplace/locations/${location.id}`, {
                method: "DELETE",
              });
              await onReload();
            } catch (e) {
              Alert.alert(
                "Location",
                e instanceof Error ? e.message : "Unable to remove location.",
              );
            }
          },
        },
      ],
    );
  };

  if (pickerOpen) {
    return (
      <View className="flex-1 bg-[#0C0D0B]">
        <View className="min-h-[72px] px-[16px] pt-[7px] pb-[9px] flex-row items-center border-b border-b-[#30352D]">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to saved locations"
            onPress={() => {
              setPickerOpen(false);
              setEditing(null);
            }}
            className="w-[40px] h-[40px] rounded-[14px] bg-[#171916] border border-[#30352D] items-center justify-center"
          >
            <Feather name="arrow-left" size={19} color={C.ink} />
          </Pressable>
          <View className="flex-1 mx-[12px]">
            <Text className="text-[#F6F7F4] text-[16px] font-black">
              {editing ? "Update location" : "Pick a location"}
            </Text>
            <Text className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]">
              Search an address or move the pin
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close location picker"
            onPress={onClose}
            className="w-[40px] h-[40px] rounded-[14px] bg-[#171916] border border-[#30352D] items-center justify-center"
          >
            <Feather name="x" size={19} color={C.ink} />
          </Pressable>
        </View>
        <LocationPicker
          initial={
            editing
              ? { latitude: editing.latitude, longitude: editing.longitude }
              : (initialCoords ?? undefined)
          }
          onPicked={(place) => void savePicked(place)}
          saving={saving}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#0C0D0B]">
      <View className="min-h-[72px] px-[16px] pt-[7px] pb-[9px] flex-row items-center border-b border-b-[#30352D]">
        <View className="flex-1">
          <Text className="text-[#F6F7F4] text-[16px] font-black">
            Your locations
          </Text>
          <Text className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]">
            Set where you buy, grow or collect fresh produce
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close locations"
          onPress={onClose}
          className="w-[40px] h-[40px] rounded-[14px] bg-[#171916] border border-[#30352D] items-center justify-center"
        >
          <Feather name="x" size={19} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-[17px] pb-[20px]"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="bg-[rgba(200,255,103,0.14)] rounded-[18px] p-[12px] flex-row items-center gap-[10px]">
          <View className="w-[41px] h-[41px] rounded-[13px] bg-[#171916] items-center justify-center">
            <Feather name="crosshair" size={22} color={C.greenDark} />
          </View>
          <View className="flex-1">
            <Text className="text-[#0C0D0B] text-[13.5px] font-black">
              Precise marketplace location
            </Text>
            <Text className="text-[#A2A79E] text-[10px] leading-[15px] mt-[2px]">
              Nearby harvests are based on your selected location.
            </Text>
          </View>
        </View>

        <View className="flex-row gap-[8px] mt-[12px]">
          <Pressable
            onPress={onUseGps}
            disabled={busy || saving}
            className={
              busy || saving
                ? "flex-1 bg-[#171916] border border-[#30352D] rounded-[15px] py-[11px] items-center justify-center flex-row gap-[7px] opacity-[0.55]"
                : "flex-1 bg-[#171916] border border-[#30352D] rounded-[15px] py-[11px] items-center justify-center flex-row gap-[7px]"
            }
          >
            {busy ? (
              <ActivityIndicator color={C.green} size="small" />
            ) : (
              <Feather name="navigation" size={16} color={C.greenDark} />
            )}
            <Text className="text-[#F6F7F4] text-[10.5px] font-black">
              Use current GPS
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setEditing(null);
              setPickerOpen(true);
            }}
            disabled={busy || saving}
            className={
              busy || saving
                ? "flex-1 bg-[#171916] border border-[#30352D] rounded-[15px] py-[11px] items-center justify-center flex-row gap-[7px] opacity-[0.55]"
                : "flex-1 bg-[#171916] border border-[#30352D] rounded-[15px] py-[11px] items-center justify-center flex-row gap-[7px]"
            }
          >
            <Feather name="map-pin" size={16} color={C.greenDark} />
            <Text className="text-[#F6F7F4] text-[10.5px] font-black">
              Choose on map
            </Text>
          </Pressable>
        </View>

        {locations.length === 0 ? (
          <EmptyState
            icon="map-outline"
            title="No saved locations"
            body="Add a home, farm, pickup point or delivery point. You can save more than one location."
            action="Choose on map"
            onPress={() => {
              setEditing(null);
              setPickerOpen(true);
            }}
          />
        ) : (
          locations.map((location) => (
            <View
              key={location.id}
              className="bg-[#171916] border border-[#30352D] rounded-[17px] p-[12px] mt-[9px] flex-row gap-[9px]"
            >
              <View className="w-[34px] h-[34px] rounded-[11px] bg-[rgba(200,255,103,0.14)] items-center justify-center">
                <Feather name="map-pin" size={17} color={C.greenDark} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between gap-[8px]">
                  <Text className="text-[#F6F7F4] text-[12px] font-black">
                    {location.label}
                  </Text>
                  {location.isDefault && <Pill tone="green">Default</Pill>}
                </View>
                <Text className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]">
                  {location.address}
                </Text>
                <Text className="text-[#A2A79E] text-[8.8px] mt-[3px]">
                  {location.latitude.toFixed(6)},{" "}
                  {location.longitude.toFixed(6)}
                  {location.mapplsPin ? ` • ${location.mapplsPin}` : ""}
                </Text>
                <View className="flex-row gap-[7px] mt-[9px]">
                  <Pressable
                    onPress={() => {
                      setEditing(location);
                      setPickerOpen(true);
                    }}
                    className="flex-row items-center gap-[5px] bg-[#171916] border border-[#30352D] rounded-[9px] px-[9px] py-[6px]"
                  >
                    <Feather name="edit-2" size={13} color={C.ink} />
                    <Text className="text-[#F6F7F4] text-[9.5px] font-extrabold">
                      Edit
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteLocation(location)}
                    className="flex-row items-center gap-[5px] bg-[#171916] border border-[#30352D] rounded-[9px] px-[9px] py-[6px]"
                  >
                    <Feather name="trash-2" size={13} color={C.red} />
                    <Text
                      className="text-[#F6F7F4] text-[9.5px] font-extrabold"
                      style={{ color: C.red }}
                    >
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
        <View className="h-[28px]" />
      </ScrollView>
    </View>
  );
}

function SellerListingSheet({
  crops,
  locations,
  existing,
  busy,
  onAddLocation,
  onSave,
}: {
  crops: Crop[];
  locations: LocationRecord[];
  existing: Listing | null;
  busy: boolean;
  onAddLocation: () => void;
  onSave: (payload: any, editingId?: string) => Promise<void>;
}) {
  const editingCropId = existing?.cropCycle?.id ?? existing?.id;
  const defaultCrop =
    crops.find((crop) => crop.id === existing?.cropCycle?.id) ??
    crops.find((crop) => crop.selling?.canSellAsHarvested) ??
    crops[0];
  const [cropId, setCropId] = useState(editingCropId ?? defaultCrop?.id ?? "");
  const [harvestType, setHarvestType] = useState<HarvestType>(
    existing?.harvestType ??
      (defaultCrop?.status === "HARVESTED" ? "HARVESTED" : "UPCOMING"),
  );
  const [packSizeValue, setPackSizeValue] = useState(
    existing ? String(existing.packSizeValue) : "250",
  );
  const [packUnit, setPackUnit] = useState<PackUnit>(
    existing?.packSizeUnit ?? "G",
  );
  const [basePrice, setBasePrice] = useState(
    existing ? String(existing.originalPrice) : "80",
  );
  const [discount, setDiscount] = useState(
    existing ? String(existing.discountPercent) : "0",
  );
  const [quantity, setQuantity] = useState(
    existing ? String(existing.quantityAvailable) : "10",
  );
  const [minQty, setMinQty] = useState(
    existing ? String(existing.minOrderQuantity) : "1",
  );
  const [maxQty, setMaxQty] = useState(
    existing?.maxOrderQuantity ? String(existing.maxOrderQuantity) : "",
  );
  const [description, setDescription] = useState(existing?.description ?? "");
  const [sellerLocationId, setSellerLocationId] = useState(
    existing?.sellerLocation?.id ??
      locations.find((item) => item.isDefault)?.id ??
      locations[0]?.id ??
      "",
  );
  const [sellerDelivery, setSellerDelivery] = useState(
    existing?.sellerDelivery ?? true,
  );
  const [customerPickup, setCustomerPickup] = useState(
    existing?.customerPickup ?? true,
  );
  const [deliveryRadius, setDeliveryRadius] = useState(
    existing?.deliveryRadiusKm ? String(existing.deliveryRadiusKm) : "10",
  );
  const [deliveryFee, setDeliveryFee] = useState(
    existing ? String(existing.deliveryFee) : "0",
  );
  const [image, setImage] = useState<ImageDraft | null>(
    existing?.imageUrl
      ? {
          uri: existing.imageUrl,
          name: "existing.jpg",
          mimeType: "image/jpeg",
          uploaded: { url: existing.imageUrl, fileId: existing.imageFileId },
        }
      : null,
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const crop = crops.find((item) => item.id === cropId);
    if (!crop || existing) return;
    setHarvestType(crop.status === "HARVESTED" ? "HARVESTED" : "UPCOMING");
  }, [cropId, crops, existing]);

  const selectedCrop = crops.find((crop) => crop.id === cropId);
  const finalPrice = Math.max(0, num(basePrice) * (1 - num(discount) / 100));

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Images", "Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setImage({
      uri: asset.uri,
      name: asset.fileName ?? `crop-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      sizeBytes: asset.fileSize,
    });
  };

  const uploadImage = async () => {
    if (!image || image.uploaded) return image?.uploaded ?? null;
    setUploadingImage(true);
    try {
      const uploaded = await imageKitUpload(image);
      setImage((current) => (current ? { ...current, uploaded } : current));
      return uploaded;
    } catch (e) {
      Alert.alert(
        "Image upload",
        e instanceof Error ? e.message : "Unable to upload image.",
      );
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async () => {
    const crop = selectedCrop;
    if (!cropId || !crop) {
      Alert.alert("Listing", "Select one of your crops first.");
      return;
    }
    if (crop.status === "HARVESTED" && harvestType !== "HARVESTED") {
      Alert.alert(
        "Listing",
        "A harvested crop can only be listed as harvested.",
      );
      return;
    }
    if (crop.status !== "HARVESTED" && harvestType === "HARVESTED") {
      Alert.alert(
        "Listing",
        "Only harvested crops can be listed as harvested.",
      );
      return;
    }
    if (!sellerLocationId) {
      Alert.alert("Listing", "Add or select a seller location.");
      onAddLocation();
      return;
    }
    if (!sellerDelivery && !customerPickup) {
      Alert.alert("Listing", "Select seller delivery or customer pickup.");
      return;
    }
    if (sellerDelivery && num(deliveryRadius) <= 0) {
      Alert.alert("Listing", "Delivery radius must be greater than 0 km.");
      return;
    }
    const uploaded = await uploadImage();
    await onSave(
      {
        cropCycleId: cropId,
        harvestType,
        packSizeValue: num(packSizeValue),
        packSizeUnit: packUnit,
        basePrice: num(basePrice),
        discountPercent: num(discount),
        quantityAvailable: num(quantity),
        minOrderQuantity: num(minQty) || 1,
        maxOrderQuantity: maxQty.trim() ? num(maxQty) : null,
        description: description.trim() || null,
        imageUrl: uploaded?.url ?? existing?.imageUrl ?? null,
        imageFileId: uploaded?.fileId ?? existing?.imageFileId ?? null,
        imageSizeBytes: image?.sizeBytes ?? existing?.imageSizeBytes ?? null,
        sellerLocationId,
        sellerDelivery,
        customerPickup,
        deliveryRadiusKm: sellerDelivery ? num(deliveryRadius) : null,
        deliveryFee: num(deliveryFee),
        status: existing?.status === "PAUSED" ? "PAUSED" : "ACTIVE",
      },
      existing?.id,
    );
  };

  return (
    <ScrollView
      contentContainerClassName="px-[17px] pb-[20px]"
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-[#171916] border border-[#30352D] rounded-[17px] p-[12px] flex-row gap-[9px] items-center">
        <View className="w-[40px] h-[40px] rounded-[13px] bg-[rgba(200,255,103,0.14)] items-center justify-center">
          <Ionicons name="leaf-outline" size={22} color={C.greenDark} />
        </View>
        <View className="flex-1">
          <Text className="text-[#F6F7F4] text-[12.5px] font-black">
            Build one clean product card
          </Text>
          <Text className="text-[#A2A79E] text-[9.5px] leading-[14px] mt-[2px]">
            Price is per pack. The backend calculates the final price and
            protects the inventory during checkout.
          </Text>
        </View>
      </View>

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        1. Crop
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-[8px] pb-[12px]"
      >
        {crops.map((crop) => (
          <Pressable
            key={crop.id}
            onPress={() => setCropId(crop.id)}
            className={
              cropId === crop.id
                ? "rounded-[12px] border px-[10px] py-[8px] flex-row items-center gap-[5px] bg-[rgba(200,255,103,0.14)] border-[#3B4334]"
                : "rounded-[12px] bg-[#171916] border border-[#30352D] px-[10px] py-[8px] flex-row items-center gap-[5px]"
            }
          >
            <Ionicons
              name="leaf-outline"
              size={13}
              color={cropId === crop.id ? C.greenDark : C.muted}
            />
            <Text
              className={
                cropId === crop.id
                  ? "text-[10.5px] font-extrabold text-[#0C0D0B]"
                  : "text-[#A2A79E] text-[10.5px] font-extrabold"
              }
            >
              {crop.cropName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {selectedCrop && (
        <View className="mt-[9px] bg-[#202A19] rounded-[13px] p-[10px]">
          <Text className="text-[#0C0D0B] text-[11.5px] font-black">
            {selectedCrop.cropName}
          </Text>
          <Text className="text-[#A2A79E] text-[9.5px] leading-[14px] mt-[2px]">
            {selectedCrop.status} • Expected harvest{" "}
            {fmtDate(selectedCrop.expectedHarvestDate)} •{" "}
            {selectedCrop.rack?.name ?? "Rack"} /{" "}
            {selectedCrop.tray?.name ?? "Tray"}
          </Text>
        </View>
      )}

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        2. Harvest state
      </Text>
      <View className="flex-row gap-[8px]">
        <OptionCard
          icon="sunrise"
          title="Harvested"
          subtitle="Ready to sell now"
          selected={harvestType === "HARVESTED"}
          onPress={() => setHarvestType("HARVESTED")}
        />
        <OptionCard
          icon="clock"
          title="Upcoming"
          subtitle={
            selectedCrop?.expectedHarvestDate
              ? fmtDate(selectedCrop.expectedHarvestDate)
              : "Coming harvest"
          }
          selected={harvestType === "UPCOMING"}
          onPress={() => setHarvestType("UPCOMING")}
        />
      </View>

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        3. Pack & inventory
      </Text>
      <View className="flex-row gap-[8px] mb-[8px]">
        <Field
          label="Pack size"
          value={packSizeValue}
          onChangeText={setPackSizeValue}
          keyboardType="decimal-pad"
        />
        <SelectLike
          label="Unit"
          value={packUnit}
          options={["G", "KG", "PCS", "BUNCH", "BOX", "PACK"]}
          onChange={setPackUnit as any}
        />
      </View>
      <View className="flex-row gap-[8px] mb-[8px]">
        <Field
          label="Available packs"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
        <Field
          label="Minimum order"
          value={minQty}
          onChangeText={setMinQty}
          keyboardType="number-pad"
        />
        <Field
          label="Max order (optional)"
          value={maxQty}
          onChangeText={setMaxQty}
          keyboardType="number-pad"
        />
      </View>

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        4. Price
      </Text>
      <View className="flex-row gap-[8px] mb-[8px]">
        <Field
          label="Base price / pack"
          value={basePrice}
          onChangeText={setBasePrice}
          keyboardType="decimal-pad"
          prefix="₹"
        />
        <Field
          label="Discount %"
          value={discount}
          onChangeText={setDiscount}
          keyboardType="decimal-pad"
          suffix="%"
        />
      </View>
      <View className="mt-[4px] rounded-[15px] p-[12px] bg-[rgba(200,255,103,0.14)] flex-row justify-between items-center">
        <View>
          <Text className="text-[#A2A79E] text-[9.5px] font-bold">
            Buyer pays
          </Text>
          <Text className="text-[#0C0D0B] text-[20px] font-black mt-[1px]">
            {money(finalPrice)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[#A2A79E] text-[9.5px] font-bold">
            You save them
          </Text>
          <Text className="text-[#0C0D0B] text-[17px] font-black mt-[1px]">
            {num(discount).toFixed(0)}%
          </Text>
        </View>
      </View>

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        5. Photos & description
      </Text>
      <Pressable
        onPress={pickImage}
        className="h-[185px] bg-[#20221E] rounded-[18px] border border-[#30352D] border-dashed overflow-hidden relative"
      >
        {image ? (
          <Image source={{ uri: image.uri }} className="w-full h-full" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Feather name="camera" size={23} color={C.green} />
            <Text className="text-[#F6F7F4] text-[12.5px] font-black mt-[7px]">
              Add crop photo
            </Text>
            <Text className="text-[#A2A79E] text-[10px] mt-[3px]">
              Clear, natural-light photo works best
            </Text>
          </View>
        )}
        {image && (
          <View className="absolute right-[10px] top-[10px] w-[29px] h-[29px] rounded-[10px] bg-[rgba(21,32,26,0.72)] items-center justify-center">
            <Feather name="edit-2" size={12} color={C.white} />
          </View>
        )}
      </Pressable>
      {image && !image.uploaded && (
        <Pressable
          onPress={() => void uploadImage()}
          className="mt-[8px] bg-[#171916] border border-[#CBEAD2] rounded-[12px] py-[9px] flex-row items-center justify-center gap-[7px]"
        >
          {uploadingImage ? (
            <ActivityIndicator color={C.greenDark} />
          ) : (
            <>
              <Feather name="upload-cloud" size={15} color={C.greenDark} />
              <Text className="text-[#0C0D0B] text-[10.5px] font-black">
                Upload to ImageKit
              </Text>
            </>
          )}
        </Pressable>
      )}
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe freshness, growing method, expected harvest notes, etc."
        placeholderTextColor={C.muted}
        multiline
        className="min-h-[92px] mt-[8px] bg-[#171916] border border-[#30352D] rounded-[14px] px-[11px] pt-[10px] text-[#F6F7F4] text-[11px] leading-[16px] align-top"
      />

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        6. Seller location
      </Text>
      {locations.length === 0 ? (
        <View className="bg-[#382A18] border border-[#F5DCB0] rounded-[15px] p-[11px] flex-row items-center gap-[8px]">
          <Feather name="map-pin" size={16} color={C.orange} />
          <View className="flex-1">
            <Text className="text-[#F6F7F4] text-[10.5px] font-black">
              You need a precise seller location
            </Text>
            <Text className="text-[#A2A79E] text-[9px] leading-[13px] mt-[2px]">
              This location is stored with the listing and is also used for
              radius-based buyer discovery.
            </Text>
          </View>
          <Pressable onPress={onAddLocation}>
            <Text className="text-[#0C0D0B] text-[11.5px] font-black">Add</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-[8px] pb-[12px]"
        >
          {locations.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSellerLocationId(location.id)}
              className={
                sellerLocationId === location.id
                  ? "border rounded-[14px] px-[10px] py-[8px] min-w-[170px] flex-row items-center gap-[6px] bg-[rgba(200,255,103,0.14)] border-[#3B4334]"
                  : "bg-[#171916] border border-[#30352D] rounded-[14px] px-[10px] py-[8px] min-w-[170px] flex-row items-center gap-[6px]"
              }
            >
              <Feather
                name="map-pin"
                size={13}
                color={sellerLocationId === location.id ? C.greenDark : C.muted}
              />
              <View>
                <Text
                  className="text-[#F6F7F4] text-[10.5px] font-black"
                  style={
                    sellerLocationId === location.id
                      ? { color: C.greenDark }
                      : undefined
                  }
                >
                  {location.label}
                </Text>
                <Text
                  className="text-[#A2A79E] text-[8.5px] mt-[2px] max-w-[126px]"
                  numberOfLines={1}
                >
                  {location.address}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Text className="text-[#F6F7F4] text-[11.5px] font-black mt-[17px] mb-[8px]">
        7. Fulfillment
      </Text>
      <View className="flex-row gap-[8px]">
        <OptionCard
          icon="truck"
          title="Seller delivery"
          subtitle="Set radius + fee"
          selected={sellerDelivery}
          onPress={() => setSellerDelivery((value) => !value)}
        />
        <OptionCard
          icon="map-pin"
          title="Customer pickup"
          subtitle="At seller location"
          selected={customerPickup}
          onPress={() => setCustomerPickup((value) => !value)}
        />
      </View>
      {sellerDelivery && (
        <View className="flex-row gap-[8px] mb-[8px]">
          <Field
            label="Delivery radius"
            value={deliveryRadius}
            onChangeText={setDeliveryRadius}
            keyboardType="decimal-pad"
            suffix="km"
          />
          <Field
            label="Delivery fee"
            value={deliveryFee}
            onChangeText={setDeliveryFee}
            keyboardType="decimal-pad"
            prefix="₹"
          />
        </View>
      )}
      <Text className="text-[#A2A79E] text-[9.5px] leading-[14px] text-center mt-[9px] px-[12px]">
        At least one fulfillment mode is required. Seller delivery is available
        only within the radius you publish. The backend validates the
        buyer-to-seller coordinates again during checkout.
      </Text>

      <Pressable
        disabled={busy || uploadingImage || !sellerLocationId}
        onPress={submit}
        className="min-h-[50px] mt-[13px] rounded-[16px] bg-[#C8FF67] px-[16px] flex-row items-center justify-center gap-[8px]"
        style={
          !sellerLocationId || uploadingImage ? { opacity: 0.6 } : undefined
        }
      >
        <Text className="text-[#080907] text-[12.5px] font-black">
          {existing ? "Save listing changes" : "Publish to marketplace"}
        </Text>
        <Feather name="arrow-up-right" size={18} color={C.white} />
      </Pressable>
      <View className="h-[120px]" />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  prefix,
  suffix,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: any;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[14px] px-[10px] pt-[7px] pb-[4px]">
      <Text className="text-[#A2A79E] text-[8.8px] font-extrabold">
        {label}
      </Text>
      <View className="flex-row items-center">
        {prefix && (
          <Text className="text-[#F6F7F4] text-[12px] font-extrabold">
            {prefix}
          </Text>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor={C.muted}
          className="flex-1 h-[32px] text-[#F6F7F4] text-[12px] font-extrabold py-[0px]"
        />
        {suffix && (
          <Text className="text-[#F6F7F4] text-[12px] font-extrabold">
            {suffix}
          </Text>
        )}
      </View>
    </View>
  );
}

function SelectLike({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View className="flex-1 bg-[#171916] border border-[#30352D] rounded-[14px] px-[10px] pt-[7px] pb-[4px]">
      <Text className="text-[#A2A79E] text-[8.8px] font-extrabold">
        {label}
      </Text>
      <View className="py-[5px]">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              className={
                value === option
                  ? "px-[9px] py-[7px] rounded-[9px] mr-[5px] bg-[#C8FF67]"
                  : "px-[9px] py-[7px] rounded-[9px] bg-[#20221E] mr-[5px]"
              }
            >
              <Text
                className={
                  value === option
                    ? "text-[9.5px] font-extrabold text-[#FFFFFF]"
                    : "text-[#A2A79E] text-[9.5px] font-extrabold"
                }
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function OrdersSheet({
  orders,
  mode,
  onOpen,
  busy,
}: {
  orders: MarketplaceOrder[];
  mode: Mode;
  onOpen: (order: MarketplaceOrder) => void;
  busy: boolean;
}) {
  if (orders.length === 0)
    return (
      <EmptyState
        icon="receipt-outline"
        title={mode === "BUYER" ? "No purchases yet" : "No sales yet"}
        body={
          mode === "BUYER"
            ? "Your confirmed marketplace orders will appear here."
            : "When a buyer orders one of your listings, it will appear here."
        }
      />
    );
  return (
    <FlatList
      data={orders}
      keyExtractor={(item) => item.id}
      contentContainerClassName="px-[17px] pb-[20px]"
      renderItem={({ item }) => {
        const open = !["COMPLETED", "CANCELLED"].includes(item.status);
        return (
          <Pressable
            onPress={() => onOpen(item)}
            className="bg-[#171916] border border-[#30352D] rounded-[17px] p-[11px] flex-row items-center gap-[10px] mb-[9px]"
          >
            <View className="w-[40px] h-[40px] rounded-[13px] bg-[#202A19] items-center justify-center">
              {item.fulfillmentType === "SELLER_DELIVERY" ? (
                <Feather name="truck" size={18} color={C.green} />
              ) : (
                <Feather name="map-pin" size={18} color={C.blue} />
              )}
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between gap-[8px]">
                <Text className="text-[#F6F7F4] text-[12.5px] font-black">
                  {item.cropName}
                </Text>
                <Pill tone={item.paymentStatus === "PAID" ? "green" : "orange"}>
                  {item.paymentStatus}
                </Pill>
              </View>
              <Text className="text-[#A2A79E] text-[9.5px] mt-[2px] font-bold">
                {item.orderNumber}
              </Text>
              <Text className="text-[#A2A79E] text-[10.5px] leading-[15px] mt-[3px]">
                {item.quantity} × {item.packSizeValue}
                {item.packSizeUnit} • {money(item.totalAmount)} • {item.status}
              </Text>
              {item.fulfillmentType === "SELLER_DELIVERY" &&
                item.tracking?.isActive && (
                  <Text className="text-[#0C0D0B] text-[9px] font-black mt-[5px]">
                    ● Live delivery tracking
                  </Text>
                )}
            </View>
            <Feather name="chevron-right" size={17} color={C.muted} />
          </Pressable>
        );
      }}
      ListFooterComponent={<View className="h-[80px]" />}
    />
  );
}

function OrderDetailSheet({
  order,
  mode,
  busy,
  onStatus,
  onStartDelivery,
  onReached,
  onCash,
  onUpi,
  onCancel,
}: {
  order: MarketplaceOrder;
  mode: Mode;
  busy: boolean;
  onStatus: (id: string, status: string) => void;
  onStartDelivery: (order: MarketplaceOrder) => void;
  onReached: (order: MarketplaceOrder) => void;
  onCash: (order: MarketplaceOrder) => void;
  onUpi: (order: MarketplaceOrder) => void;
  onCancel: (order: MarketplaceOrder) => void;
}) {
  const routeGeometry = order.tracking?.routeGeometry ?? order.routeGeometry;
  const center: Coordinates =
    mode === "BUYER"
      ? {
          latitude: num(order.buyerLatitude),
          longitude: num(order.buyerLongitude),
        }
      : {
          latitude: num(order.sellerLatitude),
          longitude: num(order.sellerLongitude),
        };
  const trackingCenter =
    order.tracking?.latitude != null && order.tracking?.longitude != null
      ? {
          latitude: num(order.tracking.latitude),
          longitude: num(order.tracking.longitude),
        }
      : center;

  const buyerIsViewer = mode === "BUYER";
  const sellerStatus = order.status;
  const nextSellerAction =
    sellerStatus === "PLACED"
      ? "ACCEPTED"
      : sellerStatus === "ACCEPTED"
        ? "PREPARING"
        : sellerStatus === "PREPARING"
          ? "READY_FOR_PICKUP"
          : null;

  return (
    <ScrollView
      contentContainerClassName="px-[17px] pb-[20px]"
      showsVerticalScrollIndicator={false}
    >
      <View className="bg-[#171916] border border-[#30352D] rounded-[18px] p-[12px] flex-row items-center gap-[10px]">
        <View className="w-[45px] h-[45px] rounded-[14px] bg-[rgba(200,255,103,0.14)] items-center justify-center">
          {order.paymentStatus === "PAID" ? (
            <Feather name="check" size={23} color={C.greenDark} />
          ) : (
            <Feather name="clock" size={23} color={C.orange} />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[#F6F7F4] text-[22px] font-black">
            {order.cropName}
          </Text>
          <Text className="text-[#A2A79E] text-[11px] leading-[16px] mt-[3px]">
            {order.status.replaceAll("_", " ")} • {fmtDate(order.createdAt)} at{" "}
            {fmtTime(order.createdAt)}
          </Text>
        </View>
        <Text className="text-[#F6F7F4] text-[21px] font-black">
          {money(order.totalAmount)}
        </Text>
      </View>

      {order.fulfillmentType === "SELLER_DELIVERY" && (
        <View className="mb-[14px]">
          <View className="mt-[10px] rounded-[17px] bg-[rgba(200,255,103,0.14)] border border-[#CBEAD2] p-[12px] flex-row items-center gap-[10px]">
            <View className="flex-1">
              <Text className="text-[#0C0D0B] text-[12px] font-black">
                {order.status === "OUT_FOR_DELIVERY"
                  ? "Your order is moving"
                  : order.status === "REACHED"
                    ? "Seller has reached the handover area"
                    : "Delivery route is ready"}
              </Text>
              <Text className="text-[#A2A79E] text-[10px] mt-[2px]">
                {order.tracking?.distanceRemainingKm != null
                  ? `${fmtKm(order.tracking.distanceRemainingKm)} remaining`
                  : order.routeDistanceKm != null
                    ? `${fmtKm(order.routeDistanceKm)} route`
                    : "Location-aware delivery"}
                {order.tracking?.etaMinutes
                  ? ` • ${order.tracking.etaMinutes} min ETA`
                  : ""}
              </Text>
            </View>
            <View className="w-[25px] h-[25px] rounded-full bg-[rgba(15,122,58,0.13)] items-center justify-center">
              <View className="w-[9px] h-[9px] rounded-full bg-[#C8FF67]" />
            </View>
          </View>
          <MarketplaceMap
            center={trackingCenter}
            radiusKm={Math.max(
              1,
              Math.ceil(
                num(order.routeDistanceKm) ||
                  num(order.straightLineDistanceKm) ||
                  4,
              ),
            )}
            listings={[]}
            routeGeometry={routeGeometry}
            userMarker
            selectedListingId={null}
          />
          {order.buyerLocation && (
            <View className="mt-[10px] bg-[#171916] border border-[#30352D] rounded-[16px] p-[12px]">
              <Endpoint
                title={buyerIsViewer ? "You" : "Customer"}
                location={order.buyerLocation}
              />
              <View className="w-[1px] h-[15px] ml-[4.5px] bg-[#30352D] my-[4px]" />
              <Endpoint title={"Seller"} location={order.sellerLocation} />
            </View>
          )}
        </View>
      )}

      <View className="bg-[#171916] border border-[#30352D] rounded-[17px] p-[13px] mt-[14px]">
        <View className="flex-row items-center justify-between gap-[8px]">
          <Text className="text-[#A2A79E] text-[10.5px] font-bold">
            Unit price
          </Text>
          <Text className="text-[#F6F7F4] text-[10.5px] font-extrabold">
            {money(order.unitPrice)} × {order.quantity}
          </Text>
        </View>
        {num(order.discountAmount) > 0 && (
          <View className="flex-row items-center justify-between gap-[8px]">
            <Text
              className="text-[#A2A79E] text-[10.5px] font-bold"
              style={{ color: C.green }}
            >
              Discount
            </Text>
            <Text
              className="text-[#F6F7F4] text-[10.5px] font-extrabold"
              style={{ color: C.green }}
            >
              −{money(order.discountAmount)}
            </Text>
          </View>
        )}
        <View className="flex-row items-center justify-between gap-[8px]">
          <Text className="text-[#A2A79E] text-[10.5px] font-bold">
            Delivery
          </Text>
          <Text className="text-[#F6F7F4] text-[10.5px] font-extrabold">
            {order.deliveryFee ? money(order.deliveryFee) : "FREE"}
          </Text>
        </View>
        <View className="h-[1px] bg-[#30352D] my-[10px]" />
        <View className="flex-row items-center justify-between gap-[8px]">
          <Text className="text-[#F6F7F4] text-[13px] font-black">Total</Text>
          <Text className="text-[#0C0D0B] text-[19px] font-black">
            {money(order.totalAmount)}
          </Text>
        </View>
      </View>

      {mode === "BUYER" && (
        <View className="bg-[#171916] border border-[#30352D] rounded-[17px] mt-[11px] p-[12px]">
          <TimelineStep
            done={order.status !== "PENDING_PAYMENT"}
            title="Order placed"
            body={
              order.paymentStatus === "PAID"
                ? "Payment confirmed"
                : "Waiting for payment"
            }
          />
          <TimelineStep
            done={[
              "ACCEPTED",
              "PREPARING",
              "READY_FOR_PICKUP",
              "OUT_FOR_DELIVERY",
              "REACHED",
              "COMPLETED",
            ].includes(order.status)}
            title="Seller is preparing"
            body={
              order.status === "PLACED"
                ? "Seller will accept and prepare it"
                : order.status.replaceAll("_", " ")
            }
          />
          <TimelineStep
            done={["OUT_FOR_DELIVERY", "REACHED", "COMPLETED"].includes(
              order.status,
            )}
            title="On the way"
            body={
              order.fulfillmentType === "SELLER_DELIVERY"
                ? order.tracking?.isActive
                  ? "Live location available"
                  : "Delivery starts from seller"
                : "Pickup from seller"
            }
          />
          <TimelineStep
            done={order.status === "COMPLETED"}
            title="Completed"
            body={
              order.paymentStatus === "PAID"
                ? "Payment settled"
                : "Payment pending"
            }
          />
          {["PENDING_PAYMENT", "PLACED"].includes(order.status) && (
            <Pressable
              disabled={busy}
              onPress={() => onCancel(order)}
              className="mt-[2px] min-h-[42px] rounded-[13px] border border-[#F0C8C8] bg-[#301B1B] items-center justify-center"
            >
              <Text className="text-[#FF6B6B] text-[10.5px] font-black">
                Cancel order
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {mode === "SELLER" && (
        <View className="bg-[#171916] border border-[#30352D] rounded-[17px] mt-[11px] p-[12px] gap-[8px]">
          {nextSellerAction && (
            <ActionButton
              title={
                nextSellerAction === "ACCEPTED"
                  ? "Accept order"
                  : nextSellerAction === "PREPARING"
                    ? "Start preparing"
                    : "Mark ready"
              }
              icon={
                nextSellerAction === "ACCEPTED"
                  ? "check-circle"
                  : nextSellerAction === "PREPARING"
                    ? "package"
                    : "check-square"
              }
              onPress={() => onStatus(order.id, nextSellerAction)}
            />
          )}
          {order.fulfillmentType === "SELLER_DELIVERY" &&
            ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"].includes(
              order.status,
            ) &&
            (order.paymentMethod === "COD" ||
              order.paymentStatus === "PAID") && (
              <ActionButton
                title="Start live delivery"
                icon="navigation"
                onPress={() => onStartDelivery(order)}
              />
            )}
          {order.fulfillmentType === "SELLER_DELIVERY" &&
            order.status === "OUT_FOR_DELIVERY" && (
              <ActionButton
                title="Reached customer"
                icon="map-pin"
                onPress={() => onReached(order)}
              />
            )}
          {order.paymentMethod === "COD" &&
            order.paymentStatus !== "PAID" &&
            ["REACHED", "READY_FOR_PICKUP"].includes(order.status) && (
              <View className="flex-row gap-[8px]">
                <OptionCard
                  icon="dollar-sign"
                  title="Collect cash"
                  subtitle={money(order.totalAmount)}
                  selected={false}
                  onPress={() => onCash(order)}
                />
                <OptionCard
                  icon="smartphone"
                  title="UPI QR"
                  subtitle="Razorpay link"
                  selected={false}
                  onPress={() => onUpi(order)}
                />
              </View>
            )}
          {order.paymentStatus === "PAID" && order.status !== "COMPLETED" && (
            <View className="bg-[rgba(200,255,103,0.14)] rounded-[13px] p-[10px] flex-row gap-[7px] items-start">
              <Feather name="check-circle" size={16} color={C.greenDark} />
              <Text className="text-[#0C0D0B] text-[9.8px] leading-[14px] flex-1">
                Payment is confirmed. Complete the handover flow to finish the
                order.
              </Text>
            </View>
          )}
        </View>
      )}

      <View className="mt-[11px] bg-[#171916] border border-[#30352D] rounded-[16px] p-[12px]">
        <Endpoint title="Buyer" location={order.buyerLocation} />
        <View className="w-[1px] h-[15px] ml-[4.5px] bg-[#30352D] my-[4px]" />
        <Endpoint title="Seller" location={order.sellerLocation} />
      </View>
      <View className="h-[100px]" />
    </ScrollView>
  );
}

function Endpoint({
  title,
  location,
}: {
  title: string;
  location?: LocationRecord;
}) {
  return (
    <View className="flex-row items-start gap-[9px]">
      <View className="w-[10px] h-[10px] rounded-full mt-[4px] bg-[#C8FF67]" />
      <View className="flex-1">
        <Text className="text-[#F6F7F4] text-[10.5px] font-black">{title}</Text>
        <Text className="text-[#A2A79E] text-[9.5px] leading-[14px] mt-[2px]">
          {location?.address ?? "Location snapshot saved with order"}
        </Text>
        {location && (
          <Text className="text-[#A2A79E] text-[8.8px] mt-[3px]">
            {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </Text>
        )}
      </View>
    </View>
  );
}

function TimelineStep({
  done,
  title,
  body,
}: {
  done: boolean;
  title: string;
  body: string;
}) {
  return (
    <View className="flex-row items-start gap-[9px] pb-[12px]">
      <View
        className={
          done
            ? "w-[19px] h-[19px] rounded-full items-center justify-center bg-[#C8FF67]"
            : "w-[19px] h-[19px] rounded-full bg-[#30352D] items-center justify-center"
        }
      >
        {done && <Feather name="check" size={10} color={C.white} />}
      </View>
      <View className="flex-1">
        <Text className="text-[#F6F7F4] text-[10.5px] font-black">{title}</Text>
        <Text className="text-[#A2A79E] text-[9.5px] mt-[1px]">{body}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="min-h-[45px] bg-[#C8FF67] rounded-[14px] px-[13px] flex-row items-center gap-[8px]"
    >
      <Feather name={icon} size={17} color={C.white} />
      <Text className="text-[#FFFFFF] text-[11.5px] font-black flex-1">
        {title}
      </Text>
      <Feather name="arrow-right" size={16} color={C.white} />
    </Pressable>
  );
}

function DoorstepPaymentSheet({
  order,
  shortUrl,
}: {
  order: MarketplaceOrder;
  shortUrl?: string | null;
}) {
  return (
    <View className="p-[18px] items-center">
      <View className="w-[70px] h-[70px] rounded-[22px] bg-[rgba(200,255,103,0.14)] items-center justify-center">
        <Ionicons name="qr-code-outline" size={32} color={C.greenDark} />
      </View>
      <Text className="text-[#F6F7F4] text-[20px] font-black mt-[14px] text-center">
        Collect {money(order.totalAmount)} by UPI
      </Text>
      <Text className="text-[#A2A79E] text-[11px] leading-[17px] text-center mt-[6px]">
        The backend created a Razorpay Payment Link. Open it on the customer’s
        phone or show the URL as a QR in your payment UI.
      </Text>
      <View className="w-full bg-[#171916] border border-[#30352D] rounded-[15px] p-[12px] mt-[13px]">
        <Text
          className="text-[#F6F7F4] text-[10.5px] leading-[15px]"
          numberOfLines={3}
        >
          {shortUrl ?? "Payment link pending"}
        </Text>
      </View>
      {shortUrl && (
        <Pressable
          onPress={() => void Linking.openURL(shortUrl)}
          className="min-h-[50px] mt-[13px] rounded-[16px] bg-[#C8FF67] px-[16px] flex-row items-center justify-center gap-[8px]"
        >
          <Text className="text-[#080907] text-[12.5px] font-black">
            Open UPI payment link
          </Text>
          <Feather name="external-link" size={17} color={C.white} />
        </Pressable>
      )}
      <Text className="text-[#A2A79E] text-[9.5px] leading-[14px] text-center mt-[9px] px-[12px]">
        The webhook on your backend is responsible for marking the order PAID.
        Do not mark doorstep UPI complete purely from the client.
      </Text>
    </View>
  );
}

const nativeStyles: Record<string, any> = {
  marketplaceFixedHeader: {
    shadowColor: C.black,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  marketHeaderPressed: { transform: [{ scale: 0.97 }] },
  mapSearchBar: {
    shadowColor: C.black,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  mapTopChip: {
    shadowColor: C.black,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  mapPricePin: {
    shadowColor: C.black,
    shadowOpacity: 0.35,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  mapPricePinSelected: { transform: [{ scale: 1.04 }] },
  errorToast: {
    shadowColor: C.black,
    shadowOpacity: 0.17,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
};
