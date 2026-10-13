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

const C = {
  bg: "#090C07",
  card: "#171C13",
  ink: "#F2F4EC",
  muted: "#9AA38F",
  line: "#2B3325",
  green: "#B7F34B",
  greenDark: "#B7F34B",
  greenSoft: "#26351B",
  lime: "#B7F34B",
  orange: "#FFB65C",
  red: "#FF7373",
  blue: "#86B3FF",
  white: "#F5F7EF",
  black: "#090C07",
};

// Google Maps style is applied by react-native-maps where the native provider supports it.
const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#151A12" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#89947D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#151A12" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#293223" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1B2417" }],
  },
  {
    featureType: "poi",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry.fill",
    stylers: [{ color: "#203019" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2A3223" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#10140D" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#56632E" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#222A18" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry.fill",
    stylers: [{ color: "#111A18" }],
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
      style={[styles.iconButton, active && styles.iconButtonActive]}
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
  const map = {
    soft: styles.pillSoft,
    green: styles.pillGreen,
    orange: styles.pillOrange,
    red: styles.pillRed,
    blue: styles.pillBlue,
  } as const;
  return (
    <View style={map[tone]}>
      <Text style={styles.pillText}>{children}</Text>
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
    <View style={styles.segmented}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          onPress={() => onChange(option.value)}
          style={[
            styles.segment,
            value === option.value && styles.segmentActive,
          ]}
        >
          <Text
            style={[
              styles.segmentText,
              value === option.value && styles.segmentTextActive,
            ]}
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
    <View style={styles.stepper}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - 1))}
        style={styles.stepButton}
      >
        <Feather name="minus" size={18} color={C.ink} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + 1))}
        style={styles.stepButton}
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
      style={({ pressed }) => [
        styles.listingCard,
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={styles.imageWrap}>
        {listing.imageUrl ? (
          <Image
            source={{ uri: listing.imageUrl }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.productPlaceholder}>
            <Ionicons name="leaf-outline" size={40} color={C.green} />
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>{discount}% OFF</Text>
          </View>
        )}
        {listing.harvestType === "UPCOMING" && (
          <View style={styles.harvestBadge}>
            <Text style={styles.harvestBadgeText}>Upcoming harvest</Text>
          </View>
        )}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.rowBetween}>
          <Text style={styles.listingTitle} numberOfLines={1}>
            {listing.cropName}
          </Text>
          <Text style={styles.distanceText}>{fmtKm(listing.distanceKm)}</Text>
        </View>
        <Text style={styles.subtle}>
          {listing.packSizeValue} {listing.packSizeUnit} pack •{" "}
          {listing.quantityAvailable} available
        </Text>
        <View style={[styles.rowBetween, { marginTop: 10 }]}>
          <View style={styles.rowGap}>
            <Text style={styles.priceText}>{money(listing.price)}</Text>
            {discount > 0 && (
              <Text style={styles.oldPrice}>
                {money(listing.originalPrice)}
              </Text>
            )}
          </View>
          <Text style={styles.sellerText}>
            {listing.seller?.username ?? "Local seller"}
          </Text>
        </View>
        <View style={styles.metaRow}>
          {listing.sellerDelivery && (
            <Pill tone="green">
              <Feather name="truck" size={10} color={C.greenDark} /> Delivery
            </Pill>
          )}
          {listing.customerPickup && (
            <Pill tone="blue">
              <Feather name="map-pin" size={10} color={C.blue} /> Pickup
            </Pill>
          )}
          {listing.harvestType === "UPCOMING" && (
            <Pill tone="orange">{fmtDate(listing.expectedHarvestDate)}</Pill>
          )}
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
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={27} color={C.green} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action && onPress && (
        <Pressable onPress={onPress} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{action}</Text>
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
  height?: number | string;
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
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.backdropTouchable} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.bottomSheet, sizeStyle]}
        >
          {!hideHeader && (
            <>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{title}</Text>
                <Pressable onPress={onClose} style={styles.closeButton}>
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
    <View style={[styles.mapContainer, fullScreen && styles.mapContainerFull]}>
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
          fillColor="rgba(183, 243, 75, 0.08)"
          strokeColor="rgba(183, 243, 75, 0.42)"
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
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
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
                style={[
                  styles.mapPricePin,
                  isSelected && styles.mapPricePinSelected,
                ]}
              >
                <View style={styles.mapPricePinCopy}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.mapPriceCrop,
                      isSelected && styles.mapPriceCropSelected,
                    ]}
                  >
                    {listing.cropName}
                  </Text>
                  <Text
                    style={[
                      styles.mapPriceText,
                      isSelected && styles.mapPriceTextSelected,
                    ]}
                  >
                    {money(listing.price)}
                  </Text>
                </View>
                {listing.imageUrl ? (
                  <Image
                    source={{ uri: listing.imageUrl }}
                    style={styles.mapPriceThumb}
                  />
                ) : (
                  <View style={styles.mapPriceThumbFallback}>
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
        <View style={styles.mapTopChip}>
          <Feather name="map-pin" size={13} color={C.greenDark} />
          <Text style={styles.mapTopChipText}>Within {radiusKm} km</Text>
        </View>
      )}
    </View>
  );
}

export default function MarketplaceScreen() {
  const insets = useSafeAreaInsets();
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

  const openListing = useCallback(async (listing: Listing) => {
    setSelectedListing(listing);
    setSheet("LISTING");
  }, []);

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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.green} />
        <Text style={styles.loadingText}>Opening marketplace…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Sign in to use the marketplace.</Text>
      </View>
    );
  }

  const activeOrders = mode === "BUYER" ? buyingOrders : sellingOrders;
  const mapCenter = coords ??
    defaultBuyerLocation ?? { latitude: 12.9716, longitude: 77.5946 };
  const featured = listings.slice(0, 6);

  return (
    <View style={styles.screen}>
      <StatusBar
        style="light"
        translucent={mode === "BUYER" && viewMode === "MAP"}
        backgroundColor={
          mode === "BUYER" && viewMode === "MAP" ? "transparent" : C.bg
        }
      />

      {!(mode === "BUYER" && viewMode === "MAP") && (
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>LOCAL HARVEST MARKET</Text>
              <Text style={styles.headerTitle}>
                {mode === "BUYER" ? "Fresh around you" : "Sell your harvest"}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <IconButton
                name="map-pin"
                active={!!defaultBuyerLocation}
                onPress={() => setSheet("LOCATION")}
              />
              <IconButton
                name="shopping-bag"
                onPress={() => setSheet("ORDERS")}
              />
            </View>
          </View>

          <Segmented
            value={mode}
            options={[
              { value: "BUYER", label: "Buy" },
              { value: "SELLER", label: "Sell" },
            ]}
            onChange={setMode}
          />
        </View>
      )}

      {mode === "BUYER" && viewMode === "MAP" ? (
        <View style={styles.mapFullScreen}>
          <MarketplaceMap
            fullScreen
            center={mapCenter}
            radiusKm={radiusKm}
            listings={listings}
            selectedListingId={selectedListing?.id}
            onSelectListing={(listing) => setSelectedListing(listing)}
          />

          <View style={[styles.mapFloatingHeader, { top: insets.top + 9 }]}>
            <View style={styles.mapSearchBar}>
              <Feather name="search" size={18} color={C.muted} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search fresh harvests"
                placeholderTextColor={C.muted}
                style={styles.mapSearchInput}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch("")} hitSlop={8}>
                  <Feather name="x-circle" size={17} color={C.muted} />
                </Pressable>
              )}
              <View style={styles.mapSearchDivider} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose delivery location"
                onPress={() => setSheet("LOCATION")}
                style={styles.mapSearchIconButton}
              >
                <Feather name="map-pin" size={17} color={C.green} />
              </Pressable>
            </View>

            <View style={styles.mapControlRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mapRangeScroll}
              >
                {[2, 5, 10, 25].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setRadiusKm(value)}
                    style={[
                      styles.mapRangeChip,
                      radiusKm === value && styles.mapRangeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.mapRangeText,
                        radiusKm === value && styles.mapRangeTextActive,
                      ]}
                    >
                      {value} km
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                accessibilityRole="button"
                onPress={() => setViewMode("LIST")}
                style={styles.mapListButton}
              >
                <Feather name="list" size={16} color={C.black} />
                <Text style={styles.mapListButtonText}>List</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Center map on my location"
            onPress={() => void recenterMapOnGps()}
            style={[
              styles.mapLocateButton,
              { bottom: Math.max(insets.bottom, 12) + 104 },
            ]}
          >
            <Feather name="crosshair" size={20} color={C.ink} />
          </Pressable>

          <View
            style={[
              styles.mapBottomPanel,
              { bottom: Math.max(insets.bottom, 10) + 12 },
            ]}
          >
            {selectedListing ? (
              <>
                <View style={styles.mapPreviewImage}>
                  {selectedListing.imageUrl ? (
                    <Image
                      source={{ uri: selectedListing.imageUrl }}
                      style={styles.mapPreviewImageFill}
                    />
                  ) : (
                    <Ionicons name="leaf-outline" size={22} color={C.green} />
                  )}
                </View>
                <View style={styles.mapBottomCopy}>
                  <Text style={styles.mapBottomTitle} numberOfLines={1}>
                    {selectedListing.cropName}
                  </Text>
                  <Text style={styles.mapSelectedPrice}>
                    {money(selectedListing.price)}
                    <Text style={styles.mapBottomSubtitle}>
                      {" "}
                      · {fmtKm(selectedListing.distanceKm)} away
                    </Text>
                  </Text>
                  <Text style={styles.mapBottomSubtitle} numberOfLines={1}>
                    {selectedListing.seller?.username ?? "Local grower"} ·{" "}
                    {selectedListing.packSizeValue}{" "}
                    {selectedListing.packSizeUnit}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void openListing(selectedListing)}
                  style={styles.mapExploreButton}
                >
                  <Text style={styles.mapExploreText}>View</Text>
                  <Feather name="arrow-up-right" size={17} color={C.black} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.mapBottomCopy}>
                  <Text style={styles.mapBottomTitle}>
                    {listings.length} fresh{" "}
                    {listings.length === 1 ? "harvest" : "harvests"} nearby
                  </Text>
                  <Text style={styles.mapBottomSubtitle} numberOfLines={1}>
                    {defaultBuyerLocation?.label ??
                      "Explore growers around you"}{" "}
                    · within {radiusKm} km
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setViewMode("LIST")}
                  style={styles.mapExploreButton}
                >
                  <Text style={styles.mapExploreText}>Explore</Text>
                  <Feather name="arrow-up-right" size={17} color={C.black} />
                </Pressable>
              </>
            )}
          </View>
        </View>
      ) : mode === "BUYER" ? (
        <FlatList
          data={featured}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnGap}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshAll}
              tintColor={C.green}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.searchBar}>
                <Feather name="search" size={18} color={C.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search spinach, lettuce, tomatoes…"
                  placeholderTextColor="#98A39C"
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")}>
                    <Feather name="x-circle" size={17} color={C.muted} />
                  </Pressable>
                )}
              </View>

              <View style={styles.contextRow}>
                <Pressable
                  onPress={() => setSheet("LOCATION")}
                  style={styles.locationContext}
                >
                  <View style={styles.locationIcon}>
                    <Feather name="navigation" size={14} color={C.greenDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contextLabel}>Delivering to</Text>
                    <Text style={styles.contextValue} numberOfLines={1}>
                      {defaultBuyerLocation?.label ?? "Set your location"}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={17} color={C.muted} />
                </Pressable>
                <View style={styles.viewToggle}>
                  <IconButton
                    name="list"
                    active={viewMode === "LIST"}
                    onPress={() => setViewMode("LIST")}
                  />
                  <IconButton
                    name="map"
                    active={viewMode === "MAP"}
                    onPress={() => setViewMode("MAP")}
                  />
                </View>
              </View>

              <View style={styles.discoveryHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Near you</Text>
                  <Text style={styles.sectionSub}>
                    {listings.length} fresh listings in {radiusKm} km
                  </Text>
                </View>
                <Pressable
                  onPress={() => setSheet("LOCATION")}
                  style={styles.filterButton}
                >
                  <Feather name="sliders" size={15} color={C.ink} />
                  <Text style={styles.filterText}>Range</Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
              >
                {[2, 5, 10, 25].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setRadiusKm(value)}
                    style={[
                      styles.rangeChip,
                      radiusKm === value && styles.rangeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.rangeChipText,
                        radiusKm === value && styles.rangeChipTextActive,
                      ]}
                    >
                      {value} km
                    </Text>
                  </Pressable>
                ))}
                <Pressable
                  onPress={() =>
                    setSort(sort === "PRICE_ASC" ? "PRICE_DESC" : "PRICE_ASC")
                  }
                  style={styles.rangeChip}
                >
                  <Feather name="chevrons-down" size={13} color={C.ink} />
                  <Text style={styles.rangeChipText}>
                    {sort === "PRICE_DESC" ? "High price" : "Price"}
                  </Text>
                </Pressable>
              </ScrollView>

              {viewMode === "MAP" && (
                <MarketplaceMap
                  center={mapCenter}
                  radiusKm={radiusKm}
                  listings={listings}
                  selectedListingId={selectedListing?.id}
                  onSelectListing={openListing}
                />
              )}

              {!defaultBuyerLocation && (
                <View style={styles.locationNotice}>
                  <View style={styles.noticeIcon}>
                    <Feather name="map-pin" size={16} color={C.greenDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.noticeTitle}>
                      Add your delivery location
                    </Text>
                    <Text style={styles.noticeBody}>
                      We use precise coordinates to show sellers inside your
                      radius and calculate road distance.
                    </Text>
                  </View>
                  <Pressable onPress={() => setSheet("LOCATION")}>
                    <Text style={styles.noticeAction}>Add</Text>
                  </Pressable>
                </View>
              )}

              {listings.length === 0 && viewMode === "LIST" && (
                <EmptyState
                  icon="leaf-outline"
                  title="Nothing nearby yet"
                  body="Increase your range or try a different crop. Seller locations are filtered on the backend before we show results."
                  action="Try 25 km"
                  onPress={() => setRadiusKm(25)}
                />
              )}

              {featured.length > 0 && (
                <Text
                  style={[
                    styles.sectionTitle,
                    { marginTop: 8, marginBottom: 11 },
                  ]}
                >
                  Browse fresh harvests
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => openListing(item)} />
          )}
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.sellerContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshAll}
              tintColor={C.green}
            />
          }
        >
          <View style={styles.sellerHero}>
            <View style={styles.sellerHeroIcon}>
              <Ionicons name="basket-outline" size={25} color={C.greenDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerHeroTitle}>
                Turn your grow records into sales
              </Text>
              <Text style={styles.sellerHeroBody}>
                Harvested and upcoming crops are already linked to your account.
              </Text>
            </View>
            <Pressable
              onPress={() => setSheet("SELLER_LISTING")}
              style={styles.primaryRoundButton}
            >
              <Feather name="plus" size={18} color={C.black} />
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{crops.length}</Text>
              <Text style={styles.statLabel}>Sellable crops</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {
                  myListings.filter((listing) => listing.status === "ACTIVE")
                    .length
                }
              </Text>
              <Text style={styles.statLabel}>Live listings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {
                  sellingOrders.filter(
                    (order) =>
                      !["COMPLETED", "CANCELLED"].includes(order.status),
                  ).length
                }
              </Text>
              <Text style={styles.statLabel}>Open orders</Text>
            </View>
          </View>

          <View style={styles.discoveryHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your sellable crops</Text>
              <Text style={styles.sectionSub}>
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
                style={styles.cropRow}
              >
                <View style={styles.cropIcon}>
                  <Ionicons name="leaf-outline" size={21} color={C.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cropName}>{crop.cropName}</Text>
                  <Text style={styles.cropMeta}>
                    {crop.status} • {crop.tray?.name ?? "Tray"}{" "}
                    {crop.selling?.hasListing ? "• listed" : "• not listed"}
                  </Text>
                </View>
                <Feather name="chevron-right" size={17} color={C.muted} />
              </Pressable>
            ))
          )}

          <View style={styles.discoveryHeader}>
            <View>
              <Text style={styles.sectionTitle}>Live & past listings</Text>
              <Text style={styles.sectionSub}>
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
              <View key={listing.id} style={styles.sellerListingCard}>
                <View style={styles.sellerListingImage}>
                  {listing.imageUrl ? (
                    <Image
                      source={{ uri: listing.imageUrl }}
                      style={styles.sellerListingThumb}
                    />
                  ) : (
                    <Ionicons name="leaf-outline" size={26} color={C.green} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.listingTitle}>{listing.cropName}</Text>
                    <Pill
                      tone={listing.status === "ACTIVE" ? "green" : "orange"}
                    >
                      {listing.status}
                    </Pill>
                  </View>
                  <Text style={styles.subtle}>
                    {money(listing.price)} / {listing.packSizeValue}
                    {listing.packSizeUnit} • {listing.quantityAvailable} packs •{" "}
                    {listing.orderCount ?? 0} orders
                  </Text>
                  <Text style={styles.sellerAddress} numberOfLines={1}>
                    {listing.sellerLocation?.label ??
                      listing.sellerLocation?.address ??
                      "Location not set"}
                  </Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => {
                        setSelectedListing(listing);
                        setSheet("SELLER_LISTING");
                      }}
                      style={styles.smallAction}
                    >
                      <Feather name="edit-2" size={13} color={C.ink} />
                      <Text style={styles.smallActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeListing(listing.id)}
                      style={[
                        styles.smallAction,
                        { backgroundColor: "#351E1E" },
                      ]}
                    >
                      <Feather name="trash-2" size={13} color={C.red} />
                      <Text style={[styles.smallActionText, { color: C.red }]}>
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

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
        <Pressable onPress={() => setError(null)} style={styles.errorToast}>
          <Feather name="alert-circle" size={15} color={C.white} />
          <Text style={styles.errorToastText} numberOfLines={2}>
            {error}
          </Text>
          <Feather name="x" size={15} color={C.white} />
        </Pressable>
      )}

      {busy && (
        <View style={styles.globalBusy}>
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
      contentContainerStyle={styles.sheetScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.detailHeroImage}>
        {listing.imageUrl ? (
          <Image
            source={{ uri: listing.imageUrl }}
            style={styles.detailImage}
          />
        ) : (
          <Ionicons name="leaf-outline" size={52} color={C.green} />
        )}
      </View>

      <View style={styles.detailTitleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{listing.cropName}</Text>
          <Text style={styles.detailSubtitle}>
            {listing.packSizeValue} {listing.packSizeUnit} •{" "}
            {listing.quantityAvailable} available • by{" "}
            {listing.seller?.username ?? "Local grower"}
          </Text>
        </View>
        <Text style={styles.detailPrice}>{money(listing.price)}</Text>
      </View>

      {listing.description ? (
        <Text style={styles.detailDescription}>{listing.description}</Text>
      ) : null}
      <View style={styles.metaGrid}>
        <View style={styles.metaBox}>
          <Feather name="package" size={15} color={C.green} />
          <Text style={styles.metaBoxLabel}>Pack</Text>
          <Text style={styles.metaBoxValue}>
            {listing.packSizeValue}
            {listing.packSizeUnit}
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Feather name="percent" size={15} color={C.orange} />
          <Text style={styles.metaBoxLabel}>Save</Text>
          <Text style={styles.metaBoxValue}>
            {Math.round(num(listing.discountPercent))}%
          </Text>
        </View>
        <View style={styles.metaBox}>
          <Feather name="navigation" size={15} color={C.blue} />
          <Text style={styles.metaBoxLabel}>Distance</Text>
          <Text style={styles.metaBoxValue}>{fmtKm(listing.distanceKm)}</Text>
        </View>
      </View>

      <Text style={styles.formLabel}>Quantity</Text>
      <View style={styles.rowBetween}>
        <Text style={styles.subtle}>
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

      <Text style={styles.formLabel}>Choose how you receive it</Text>
      <View style={styles.optionCardRow}>
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

      <View style={styles.locationCard}>
        <View style={styles.locationIcon}>
          <Feather name="map-pin" size={15} color={C.greenDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.contextLabel}>Your location</Text>
          <Text style={styles.contextValue}>
            {location?.label ?? "No location selected"}
          </Text>
          <Text style={styles.subtle} numberOfLines={1}>
            {location?.address ?? "Add a precise delivery/pickup point"}
          </Text>
        </View>
        <Pressable onPress={onAddLocation}>
          <Text style={styles.editText}>{location ? "Change" : "Add"}</Text>
        </Pressable>
      </View>

      {location && routeLoading ? (
        <View style={styles.routeHint}>
          <ActivityIndicator size="small" color={C.green} />
          <Text style={styles.routeHintText}>Checking road distance…</Text>
        </View>
      ) : route ? (
        <View style={styles.routeHint}>
          <Feather name="navigation" size={14} color={C.green} />
          <Text style={styles.routeHintText}>
            {route.distanceKm.toFixed(1)} km by road • about{" "}
            {route.durationMinutes} min
          </Text>
        </View>
      ) : null}

      <Text style={styles.formLabel}>Payment</Text>
      <View style={styles.optionCardRow}>
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

      <View style={styles.billCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.billLabel}>Subtotal</Text>
          <Text style={styles.billValue}>{money(subtotal)}</Text>
        </View>
        {num(listing.discountPercent) > 0 && (
          <View style={styles.rowBetween}>
            <Text style={[styles.billLabel, { color: C.green }]}>Discount</Text>
            <Text style={[styles.billValue, { color: C.green }]}>
              −{money(num(listing.originalPrice - listing.price) * quantity)}
            </Text>
          </View>
        )}
        <View style={styles.rowBetween}>
          <Text style={styles.billLabel}>Delivery</Text>
          <Text style={styles.billValue}>
            {deliveryFee ? money(deliveryFee) : "FREE"}
          </Text>
        </View>
        <View style={styles.billDivider} />
        <View style={styles.rowBetween}>
          <Text style={styles.billTotalLabel}>Total</Text>
          <Text style={styles.billTotal}>{money(total)}</Text>
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
        style={[styles.primaryButton, !location && { opacity: 0.6 }]}
      >
        <Text style={styles.primaryButtonText}>
          {paymentMethod === "ONLINE"
            ? `Pay ${money(total)}`
            : `Place COD order • ${money(total)}`}
        </Text>
        <Feather name="arrow-right" size={18} color={C.white} />
      </Pressable>
      <Text style={styles.termsText}>
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
      style={[styles.optionCard, selected && styles.optionCardSelected]}
    >
      <View
        style={[
          styles.optionIcon,
          selected && { backgroundColor: C.greenSoft },
        ]}
      >
        <Feather
          name={icon}
          size={17}
          color={selected ? C.greenDark : C.muted}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionTitle, selected && { color: C.greenDark }]}>
          {title}
        </Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
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
    <View style={styles.mapPickerRoot}>
      <View style={styles.mapPickerSearchWrap}>
        <Feather name="search" size={17} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search address, area or landmark"
          placeholderTextColor="#98A39C"
          style={styles.mapPickerSearchInput}
          autoCorrect={false}
          returnKeyType="search"
        />
        {searching ? <ActivityIndicator size="small" color={C.green} /> : null}
      </View>

      {results.length > 0 && (
        <View style={styles.mapPickerResults}>
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
                style={styles.mapPickerResultRow}
              >
                <View style={styles.mapPickerResultIcon}>
                  <Feather name="map-pin" size={14} color={C.greenDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mapPickerResultTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  <Text
                    style={styles.mapPickerResultSubtitle}
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

      <View style={styles.mapPickerMapWrap}>
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
            <View style={styles.pickerMarkerOuter}>
              <View style={styles.pickerMarkerInner} />
            </View>
          </Marker>
        </MapView>

        <View pointerEvents="none" style={styles.mapPickerHint}>
          <Feather name="move" size={13} color={C.greenDark} />
          <Text style={styles.mapPickerHintText}>
            Search above or tap anywhere on the map
          </Text>
        </View>
      </View>

      <View style={styles.mapPickerFooter}>
        <View style={{ flex: 1 }}>
          <Text style={styles.mapPickerSelectedLabel}>
            {picked?.label ?? "Selected point"}
          </Text>
          <Text style={styles.mapPickerSelectedAddress} numberOfLines={2}>
            {picked?.address ??
              `${center.latitude.toFixed(6)}, ${center.longitude.toFixed(6)}`}
          </Text>
        </View>
        <Pressable
          disabled={saving}
          onPress={confirm}
          style={[styles.primaryButton, styles.mapPickerConfirmButton]}
        >
          {saving ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={styles.primaryButtonText}>Use this location</Text>
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
      <View style={styles.locationPickerScreen}>
        <View style={styles.locationManagerHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to saved locations"
            onPress={() => {
              setPickerOpen(false);
              setEditing(null);
            }}
            style={styles.locationHeaderButton}
          >
            <Feather name="arrow-left" size={19} color={C.ink} />
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            <Text style={styles.locationManagerTitle}>
              {editing ? "Update location" : "Pick a location"}
            </Text>
            <Text style={styles.locationManagerSubtitle}>
              Search an address or move the pin
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close location picker"
            onPress={onClose}
            style={styles.locationHeaderButton}
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
    <View style={styles.locationSheetRoot}>
      <View style={styles.locationManagerHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.locationManagerTitle}>Your locations</Text>
          <Text style={styles.locationManagerSubtitle}>
            Set where you buy, grow or collect fresh produce
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close locations"
          onPress={onClose}
          style={styles.locationHeaderButton}
        >
          <Feather name="x" size={19} color={C.ink} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.sheetScroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.locationHero}>
          <View style={styles.locationHeroIcon}>
            <Feather name="crosshair" size={22} color={C.greenDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.locationHeroTitle}>
              Precise marketplace location
            </Text>
            <Text style={styles.locationHeroBody}>
              Nearby harvests are based on your selected location.
            </Text>
          </View>
        </View>

        <View style={styles.locationActionRow}>
          <Pressable
            onPress={onUseGps}
            disabled={busy || saving}
            style={[
              styles.locationAction,
              (busy || saving) && styles.disabledAction,
            ]}
          >
            {busy ? (
              <ActivityIndicator color={C.green} size="small" />
            ) : (
              <Feather name="navigation" size={16} color={C.greenDark} />
            )}
            <Text style={styles.locationActionText}>Use current GPS</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setEditing(null);
              setPickerOpen(true);
            }}
            disabled={busy || saving}
            style={[
              styles.locationAction,
              (busy || saving) && styles.disabledAction,
            ]}
          >
            <Feather name="map-pin" size={16} color={C.greenDark} />
            <Text style={styles.locationActionText}>Choose on map</Text>
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
            <View key={location.id} style={styles.savedLocationCard}>
              <View style={styles.savedLocationPin}>
                <Feather name="map-pin" size={17} color={C.greenDark} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.savedLocationLabel}>
                    {location.label}
                  </Text>
                  {location.isDefault && <Pill tone="green">Default</Pill>}
                </View>
                <Text style={styles.savedLocationAddress}>
                  {location.address}
                </Text>
                <Text style={styles.coordsText}>
                  {location.latitude.toFixed(6)},{" "}
                  {location.longitude.toFixed(6)}
                  {location.mapplsPin ? ` • ${location.mapplsPin}` : ""}
                </Text>
                <View style={styles.actionRow}>
                  <Pressable
                    onPress={() => {
                      setEditing(location);
                      setPickerOpen(true);
                    }}
                    style={styles.smallAction}
                  >
                    <Feather name="edit-2" size={13} color={C.ink} />
                    <Text style={styles.smallActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteLocation(location)}
                    style={styles.smallAction}
                  >
                    <Feather name="trash-2" size={13} color={C.red} />
                    <Text style={[styles.smallActionText, { color: C.red }]}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 28 }} />
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
      contentContainerStyle={styles.sheetScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formIntro}>
        <View style={styles.formIntroIcon}>
          <Ionicons name="leaf-outline" size={22} color={C.greenDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.formIntroTitle}>
            Build one clean product card
          </Text>
          <Text style={styles.formIntroBody}>
            Price is per pack. The backend calculates the final price and
            protects the inventory during checkout.
          </Text>
        </View>
      </View>

      <Text style={styles.formLabel}>1. Crop</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {crops.map((crop) => (
          <Pressable
            key={crop.id}
            onPress={() => setCropId(crop.id)}
            style={[
              styles.cropChip,
              cropId === crop.id && styles.cropChipActive,
            ]}
          >
            <Ionicons
              name="leaf-outline"
              size={13}
              color={cropId === crop.id ? C.greenDark : C.muted}
            />
            <Text
              style={[
                styles.cropChipText,
                cropId === crop.id && styles.cropChipTextActive,
              ]}
            >
              {crop.cropName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {selectedCrop && (
        <View style={styles.cropContext}>
          <Text style={styles.cropContextTitle}>{selectedCrop.cropName}</Text>
          <Text style={styles.cropContextBody}>
            {selectedCrop.status} • Expected harvest{" "}
            {fmtDate(selectedCrop.expectedHarvestDate)} •{" "}
            {selectedCrop.rack?.name ?? "Rack"} /{" "}
            {selectedCrop.tray?.name ?? "Tray"}
          </Text>
        </View>
      )}

      <Text style={styles.formLabel}>2. Harvest state</Text>
      <View style={styles.optionCardRow}>
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

      <Text style={styles.formLabel}>3. Pack & inventory</Text>
      <View style={styles.formGrid}>
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
      <View style={styles.formGrid}>
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

      <Text style={styles.formLabel}>4. Price</Text>
      <View style={styles.formGrid}>
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
      <View style={styles.previewPrice}>
        <View>
          <Text style={styles.previewPriceLabel}>Buyer pays</Text>
          <Text style={styles.previewPriceValue}>{money(finalPrice)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.previewPriceLabel}>You save them</Text>
          <Text style={styles.previewSave}>{num(discount).toFixed(0)}%</Text>
        </View>
      </View>

      <Text style={styles.formLabel}>5. Photos & description</Text>
      <Pressable onPress={pickImage} style={styles.imagePickerCard}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.uploadPreview} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Feather name="camera" size={23} color={C.green} />
            <Text style={styles.uploadTitle}>Add crop photo</Text>
            <Text style={styles.uploadBody}>
              Clear, natural-light photo works best
            </Text>
          </View>
        )}
        {image && (
          <View style={styles.imageEditBadge}>
            <Feather name="edit-2" size={12} color={C.white} />
          </View>
        )}
      </Pressable>
      {image && !image.uploaded && (
        <Pressable
          onPress={() => void uploadImage()}
          style={styles.uploadButton}
        >
          {uploadingImage ? (
            <ActivityIndicator color={C.greenDark} />
          ) : (
            <>
              <Feather name="upload-cloud" size={15} color={C.greenDark} />
              <Text style={styles.uploadButtonText}>Upload to ImageKit</Text>
            </>
          )}
        </Pressable>
      )}
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Describe freshness, growing method, expected harvest notes, etc."
        placeholderTextColor="#96A19A"
        multiline
        style={styles.textArea}
      />

      <Text style={styles.formLabel}>6. Seller location</Text>
      {locations.length === 0 ? (
        <View style={styles.warningCard}>
          <Feather name="map-pin" size={16} color={C.orange} />
          <View style={{ flex: 1 }}>
            <Text style={styles.warningTitle}>
              You need a precise seller location
            </Text>
            <Text style={styles.warningBody}>
              This location is stored with the listing and is also used for
              radius-based buyer discovery.
            </Text>
          </View>
          <Pressable onPress={onAddLocation}>
            <Text style={styles.noticeAction}>Add</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {locations.map((location) => (
            <Pressable
              key={location.id}
              onPress={() => setSellerLocationId(location.id)}
              style={[
                styles.locationChip,
                sellerLocationId === location.id && styles.locationChipActive,
              ]}
            >
              <Feather
                name="map-pin"
                size={13}
                color={sellerLocationId === location.id ? C.greenDark : C.muted}
              />
              <View>
                <Text
                  style={[
                    styles.locationChipTitle,
                    sellerLocationId === location.id && { color: C.greenDark },
                  ]}
                >
                  {location.label}
                </Text>
                <Text style={styles.locationChipSub} numberOfLines={1}>
                  {location.address}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Text style={styles.formLabel}>7. Fulfillment</Text>
      <View style={styles.optionCardRow}>
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
        <View style={styles.formGrid}>
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
      <Text style={styles.termsText}>
        At least one fulfillment mode is required. Seller delivery is available
        only within the radius you publish. The backend validates the
        buyer-to-seller coordinates again during checkout.
      </Text>

      <Pressable
        disabled={busy || uploadingImage || !sellerLocationId}
        onPress={submit}
        style={[
          styles.primaryButton,
          (!sellerLocationId || uploadingImage) && { opacity: 0.6 },
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {existing ? "Save listing changes" : "Publish to marketplace"}
        </Text>
        <Feather name="arrow-up-right" size={18} color={C.white} />
      </Pressable>
      <View style={{ height: 120 }} />
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
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        {prefix && <Text style={styles.inputAffix}>{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholderTextColor="#96A19A"
          style={styles.textInput}
        />
        {suffix && <Text style={styles.inputAffix}>{suffix}</Text>}
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
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.selectWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {options.map((option) => (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[
                styles.unitOption,
                value === option && styles.unitOptionActive,
              ]}
            >
              <Text
                style={[
                  styles.unitOptionText,
                  value === option && styles.unitOptionTextActive,
                ]}
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
      contentContainerStyle={styles.sheetScroll}
      renderItem={({ item }) => {
        const open = !["COMPLETED", "CANCELLED"].includes(item.status);
        return (
          <Pressable onPress={() => onOpen(item)} style={styles.orderCard}>
            <View style={styles.orderIcon}>
              {item.fulfillmentType === "SELLER_DELIVERY" ? (
                <Feather name="truck" size={18} color={C.green} />
              ) : (
                <Feather name="map-pin" size={18} color={C.blue} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.orderCrop}>{item.cropName}</Text>
                <Pill tone={item.paymentStatus === "PAID" ? "green" : "orange"}>
                  {item.paymentStatus}
                </Pill>
              </View>
              <Text style={styles.orderNumber}>{item.orderNumber}</Text>
              <Text style={styles.subtle}>
                {item.quantity} × {item.packSizeValue}
                {item.packSizeUnit} • {money(item.totalAmount)} • {item.status}
              </Text>
              {item.fulfillmentType === "SELLER_DELIVERY" &&
                item.tracking?.isActive && (
                  <Text style={styles.liveText}>● Live delivery tracking</Text>
                )}
            </View>
            <Feather name="chevron-right" size={17} color={C.muted} />
          </Pressable>
        );
      }}
      ListFooterComponent={<View style={{ height: 80 }} />}
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
      contentContainerStyle={styles.sheetScroll}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.orderStatusHero}>
        <View style={styles.orderStatusIcon}>
          {order.paymentStatus === "PAID" ? (
            <Feather name="check" size={23} color={C.greenDark} />
          ) : (
            <Feather name="clock" size={23} color={C.orange} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.detailTitle}>{order.cropName}</Text>
          <Text style={styles.detailSubtitle}>
            {order.status.replaceAll("_", " ")} • {fmtDate(order.createdAt)} at{" "}
            {fmtTime(order.createdAt)}
          </Text>
        </View>
        <Text style={styles.detailPrice}>{money(order.totalAmount)}</Text>
      </View>

      {order.fulfillmentType === "SELLER_DELIVERY" && (
        <View style={{ marginBottom: 14 }}>
          <View style={styles.trackingBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.trackingBannerTitle}>
                {order.status === "OUT_FOR_DELIVERY"
                  ? "Your order is moving"
                  : order.status === "REACHED"
                    ? "Seller has reached the handover area"
                    : "Delivery route is ready"}
              </Text>
              <Text style={styles.trackingBannerBody}>
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
            <View style={styles.liveDot}>
              <View style={styles.liveDotInner} />
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
            <View style={styles.routeEndpoints}>
              <Endpoint
                title={buyerIsViewer ? "You" : "Customer"}
                location={order.buyerLocation}
              />
              <View style={styles.endpointLine} />
              <Endpoint title={"Seller"} location={order.sellerLocation} />
            </View>
          )}
        </View>
      )}

      <View style={styles.billCard}>
        <View style={styles.rowBetween}>
          <Text style={styles.billLabel}>Unit price</Text>
          <Text style={styles.billValue}>
            {money(order.unitPrice)} × {order.quantity}
          </Text>
        </View>
        {num(order.discountAmount) > 0 && (
          <View style={styles.rowBetween}>
            <Text style={[styles.billLabel, { color: C.green }]}>Discount</Text>
            <Text style={[styles.billValue, { color: C.green }]}>
              −{money(order.discountAmount)}
            </Text>
          </View>
        )}
        <View style={styles.rowBetween}>
          <Text style={styles.billLabel}>Delivery</Text>
          <Text style={styles.billValue}>
            {order.deliveryFee ? money(order.deliveryFee) : "FREE"}
          </Text>
        </View>
        <View style={styles.billDivider} />
        <View style={styles.rowBetween}>
          <Text style={styles.billTotalLabel}>Total</Text>
          <Text style={styles.billTotal}>{money(order.totalAmount)}</Text>
        </View>
      </View>

      {mode === "BUYER" && (
        <View style={styles.timelineCard}>
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
              style={styles.cancelOrderButton}
            >
              <Text style={styles.cancelOrderButtonText}>Cancel order</Text>
            </Pressable>
          )}
        </View>
      )}

      {mode === "SELLER" && (
        <View style={styles.sellerActionsCard}>
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
              <View style={styles.optionCardRow}>
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
            <View style={styles.successNotice}>
              <Feather name="check-circle" size={16} color={C.greenDark} />
              <Text style={styles.successNoticeText}>
                Payment is confirmed. Complete the handover flow to finish the
                order.
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.locationSnapshot}>
        <Endpoint title="Buyer" location={order.buyerLocation} />
        <View style={styles.endpointLine} />
        <Endpoint title="Seller" location={order.sellerLocation} />
      </View>
      <View style={{ height: 100 }} />
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
    <View style={styles.endpoint}>
      <View style={styles.endpointDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.endpointTitle}>{title}</Text>
        <Text style={styles.endpointAddress}>
          {location?.address ?? "Location snapshot saved with order"}
        </Text>
        {location && (
          <Text style={styles.coordsText}>
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
    <View style={styles.timelineStep}>
      <View style={[styles.timelineDot, done && styles.timelineDotDone]}>
        {done && <Feather name="check" size={10} color={C.white} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineBody}>{body}</Text>
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
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Feather name={icon} size={17} color={C.white} />
      <Text style={styles.actionButtonText}>{title}</Text>
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
    <View style={styles.paymentSheet}>
      <View style={styles.paymentIcon}>
        <Ionicons name="qr-code-outline" size={32} color={C.greenDark} />
      </View>
      <Text style={styles.paymentTitle}>
        Collect {money(order.totalAmount)} by UPI
      </Text>
      <Text style={styles.paymentBody}>
        The backend created a Razorpay Payment Link. Open it on the customer’s
        phone or show the URL as a QR in your payment UI.
      </Text>
      <View style={styles.paymentUrlCard}>
        <Text style={styles.paymentUrl} numberOfLines={3}>
          {shortUrl ?? "Payment link pending"}
        </Text>
      </View>
      {shortUrl && (
        <Pressable
          onPress={() => void Linking.openURL(shortUrl)}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Open UPI payment link</Text>
          <Feather name="external-link" size={17} color={C.white} />
        </Pressable>
      )}
      <Text style={styles.termsText}>
        The webhook on your backend is responsible for marking the order PAID.
        Do not mark doorstep UPI complete purely from the client.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  mapExperience: { backgroundColor: C.black },
  centered: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  loadingText: { marginTop: 12, color: C.muted, fontSize: 13 },
  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: C.bg,
  },
  headerTop: { flexDirection: "row", alignItems: "center" },
  headerActions: { flexDirection: "row", gap: 8 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    fontWeight: "800",
    color: C.green,
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: "800",
    color: C.ink,
  },
  iconButton: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: { backgroundColor: C.greenSoft, borderColor: "#41532D" },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#20271D",
    borderRadius: 14,
    padding: 3,
    marginTop: 13,
  },
  segment: {
    flex: 1,
    borderRadius: 11,
    alignItems: "center",
    paddingVertical: 8,
  },
  segmentActive: { backgroundColor: C.card },
  segmentText: { color: C.muted, fontWeight: "700", fontSize: 12 },
  segmentTextActive: { color: C.ink },
  listContent: { paddingHorizontal: 14, paddingBottom: 30 },
  columnGap: { gap: 10 },
  searchBar: {
    height: 50,
    borderRadius: 17,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  searchInput: { flex: 1, marginHorizontal: 10, color: C.ink, fontSize: 13.5 },
  contextRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  locationContext: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  locationIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  contextLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  contextValue: {
    color: C.ink,
    fontSize: 12.5,
    fontWeight: "800",
    marginTop: 2,
  },
  viewToggle: { flexDirection: "row", alignItems: "center", gap: 6 },
  discoveryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  sectionTitle: { color: C.ink, fontSize: 18, fontWeight: "800" },
  sectionSub: { color: C.muted, fontSize: 11.5, marginTop: 2 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  filterText: { fontSize: 11.5, fontWeight: "800", color: C.ink },
  chipScroll: { gap: 8, paddingBottom: 12 },
  rangeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rangeChipActive: { backgroundColor: C.green, borderColor: C.green },
  rangeChipText: { fontSize: 11.5, fontWeight: "700", color: C.ink },
  rangeChipTextActive: { color: C.white },
  listingCard: {
    width: "50%",
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
    marginBottom: 11,
  },
  imageWrap: { height: 160, backgroundColor: "#20271D", position: "relative" },
  productImage: { width: "100%", height: "100%" },
  productPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1E2B19",
  },
  discountBadge: {
    position: "absolute",
    left: 9,
    top: 9,
    backgroundColor: C.green,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  discountBadgeText: { color: C.black, fontSize: 9, fontWeight: "900" },
  harvestBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "#382A18",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  harvestBadgeText: { color: C.orange, fontSize: 8.5, fontWeight: "800" },
  cardBody: { padding: 11 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowGap: { flexDirection: "row", alignItems: "baseline", gap: 7 },
  listingTitle: { color: C.ink, fontSize: 13.5, fontWeight: "800", flex: 1 },
  distanceText: { color: C.greenDark, fontSize: 10.5, fontWeight: "800" },
  subtle: { color: C.muted, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  priceText: { color: C.ink, fontSize: 17, fontWeight: "900" },
  oldPrice: {
    color: "#9CA59F",
    fontSize: 11,
    textDecorationLine: "line-through",
  },
  sellerText: {
    maxWidth: 74,
    textAlign: "right",
    color: C.muted,
    fontSize: 9.5,
    fontWeight: "700",
  },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  pillSoft: {
    backgroundColor: "#232A20",
    paddingHorizontal: 6.5,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  pillGreen: {
    backgroundColor: C.greenSoft,
    paddingHorizontal: 6.5,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  pillOrange: {
    backgroundColor: "#382818",
    paddingHorizontal: 6.5,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  pillRed: {
    backgroundColor: "#351E1E",
    paddingHorizontal: 6.5,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  pillBlue: {
    backgroundColor: "#1E2A3A",
    paddingHorizontal: 6.5,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  pillText: { color: C.ink, fontSize: 9, fontWeight: "800" },
  locationNotice: {
    marginBottom: 14,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: "#CBEAD2",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  noticeIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeTitle: { color: C.ink, fontWeight: "800", fontSize: 12 },
  noticeBody: { color: C.muted, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  noticeAction: { color: C.greenDark, fontSize: 11.5, fontWeight: "900" },
  mapContainer: {
    height: 345,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#151A12",
  },
  mapContainerFull: {
    flex: 1,
    height: undefined,
    width: "100%",
    borderRadius: 0,
    marginBottom: 0,
    borderWidth: 0,
    borderColor: "transparent",
    backgroundColor: C.black,
  },
  mapFullScreen: { flex: 1, backgroundColor: C.black },
  mapFloatingHeader: {
    position: "absolute",
    left: 14,
    right: 14,
    gap: 11,
  },
  mapSearchBar: {
    minHeight: 54,
    paddingLeft: 16,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(23,28,19,0.97)",
    borderWidth: 1,
    borderColor: "#323B2A",
    borderRadius: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  mapSearchInput: {
    flex: 1,
    minWidth: 0,
    color: C.ink,
    fontSize: 14,
    paddingVertical: 0,
  },
  mapSearchDivider: { height: 24, width: 1, backgroundColor: C.line },
  mapSearchIconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#29351D",
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  mapRangeScroll: { gap: 8, paddingRight: 2 },
  mapRangeChip: {
    height: 34,
    minWidth: 58,
    paddingHorizontal: 13,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(23,28,19,0.96)",
    borderWidth: 1,
    borderColor: "#39432E",
  },
  mapRangeChipActive: { backgroundColor: C.green, borderColor: C.green },
  mapRangeText: { color: C.ink, fontSize: 11, fontWeight: "800" },
  mapRangeTextActive: { color: C.black },
  mapListButton: {
    minWidth: 72,
    height: 38,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.green,
  },
  mapListButtonText: { color: C.black, fontSize: 11.5, fontWeight: "900" },
  mapLocateButton: {
    position: "absolute",
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(23,28,19,0.98)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  mapBottomPanel: {
    position: "absolute",
    left: 14,
    right: 14,
    minHeight: 76,
    padding: 12,
    borderRadius: 22,
    backgroundColor: "rgba(20,25,16,0.98)",
    borderWidth: 1,
    borderColor: "#343D2A",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 9,
  },
  mapBottomCopy: { flex: 1, minWidth: 0 },
  mapBottomTitle: { color: C.ink, fontSize: 14, fontWeight: "900" },
  mapBottomSubtitle: { color: C.muted, fontSize: 10.5, marginTop: 5 },
  mapExploreButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 15,
    backgroundColor: C.green,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapExploreText: { color: C.black, fontSize: 11.5, fontWeight: "900" },
  mapTopChip: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  mapTopChipText: { color: C.ink, fontSize: 10.5, fontWeight: "800" },
  userDotOuter: {
    width: 25,
    height: 25,
    borderRadius: 99,
    backgroundColor: "rgba(183,243,75,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  userDotInner: {
    width: 10,
    height: 10,
    borderRadius: 99,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.white,
  },
  mapPricePin: {
    minWidth: 112,
    maxWidth: 158,
    minHeight: 48,
    padding: 5,
    borderRadius: 13,
    backgroundColor: "#171C13",
    borderWidth: 1,
    borderColor: "#718F38",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.35,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  mapPricePinCopy: { flex: 1, minWidth: 0, paddingLeft: 3 },
  mapPriceCrop: {
    color: C.muted,
    fontSize: 9.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  mapPriceCropSelected: { color: C.black },
  mapPriceThumb: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.greenSoft,
  },
  mapPriceThumbFallback: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#29351D",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPricePinSelected: {
    backgroundColor: C.green,
    borderColor: C.green,
    transform: [{ scale: 1.04 }],
  },
  mapPriceText: { color: C.green, fontSize: 12, fontWeight: "900" },
  mapPriceTextSelected: { color: C.black },
  mapPreviewImage: {
    width: 52,
    height: 52,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#29351D",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPreviewImageFill: { width: "100%", height: "100%" },
  mapSelectedPrice: {
    color: C.green,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  emptyTitle: {
    color: C.ink,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBody: {
    color: C.muted,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 320,
  },
  secondaryButton: {
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.card,
  },
  secondaryButtonText: { color: C.ink, fontWeight: "800", fontSize: 11 },
  sellerContent: { paddingHorizontal: 14, paddingTop: 3, paddingBottom: 50 },
  sellerHero: {
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: "#CAE9D1",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sellerHeroIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerHeroTitle: { color: C.greenDark, fontSize: 14, fontWeight: "900" },
  sellerHeroBody: {
    color: C.muted,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 2,
  },
  primaryRoundButton: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flexDirection: "row", gap: 9, marginVertical: 14 },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 11,
  },
  statNumber: { color: C.ink, fontSize: 19, fontWeight: "900" },
  statLabel: { color: C.muted, fontSize: 9.5, fontWeight: "700", marginTop: 2 },
  cropRow: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  cropIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cropName: { color: C.ink, fontSize: 12.5, fontWeight: "800" },
  cropMeta: { color: C.muted, fontSize: 10, marginTop: 3 },
  sellerListingCard: {
    backgroundColor: C.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.line,
    padding: 11,
    flexDirection: "row",
    gap: 10,
    marginBottom: 9,
  },
  sellerListingImage: {
    width: 61,
    height: 61,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#1D2918",
    alignItems: "center",
    justifyContent: "center",
  },
  sellerListingThumb: { width: "100%", height: "100%" },
  sellerAddress: { color: C.muted, fontSize: 9.5, marginTop: 3 },
  actionRow: { flexDirection: "row", gap: 7, marginTop: 9 },
  smallAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 9,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  smallActionText: { color: C.ink, fontSize: 9.5, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7,12,8,0.48)",
    justifyContent: "flex-end",
  },
  backdropTouchable: { flex: 1 },
  bottomSheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 99,
    backgroundColor: "#3A4334",
    alignSelf: "center",
    marginTop: 9,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 11,
  },
  sheetTitle: { color: C.ink, fontSize: 17, fontWeight: "900" },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetScroll: { paddingHorizontal: 17, paddingBottom: 20 },
  detailHeroImage: {
    height: 230,
    backgroundColor: "#1D2918",
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  detailImage: { width: "100%", height: "100%" },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 13,
    gap: 12,
  },
  detailTitle: { color: C.ink, fontSize: 22, fontWeight: "900" },
  detailSubtitle: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  detailPrice: { color: C.ink, fontSize: 21, fontWeight: "900" },
  detailDescription: {
    color: C.muted,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 9,
  },
  metaGrid: { flexDirection: "row", gap: 8, marginTop: 14 },
  metaBox: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    padding: 10,
  },
  metaBoxLabel: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 5,
  },
  metaBoxValue: {
    color: C.ink,
    fontSize: 12.5,
    fontWeight: "900",
    marginTop: 2,
  },
  formLabel: {
    color: C.ink,
    fontSize: 11.5,
    fontWeight: "900",
    marginTop: 17,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    padding: 4,
    alignItems: "center",
  },
  stepButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    width: 42,
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "900",
    color: C.ink,
  },
  optionCardRow: { flexDirection: "row", gap: 8 },
  optionCard: {
    flex: 1,
    minHeight: 67,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionCardSelected: { borderColor: "#9CD3AA", backgroundColor: "#171C13" },
  optionIcon: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: "#20271D",
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: { color: C.ink, fontSize: 10.5, fontWeight: "900" },
  optionSubtitle: { color: C.muted, fontSize: 8.8, marginTop: 2 },
  radioOuter: {
    width: 17,
    height: 17,
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: "#B7C0BA",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: { borderColor: C.green },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: C.green,
  },
  locationCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    marginTop: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editText: { color: C.greenDark, fontSize: 10.5, fontWeight: "900" },
  routeHint: {
    marginTop: 9,
    backgroundColor: C.greenSoft,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  routeHintText: { color: C.greenDark, fontSize: 10.5, fontWeight: "800" },
  billCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 17,
    padding: 13,
    marginTop: 14,
  },
  billLabel: { color: C.muted, fontSize: 10.5, fontWeight: "700" },
  billValue: { color: C.ink, fontSize: 10.5, fontWeight: "800" },
  billDivider: { height: 1, backgroundColor: C.line, marginVertical: 10 },
  billTotalLabel: { color: C.ink, fontSize: 13, fontWeight: "900" },
  billTotal: { color: C.greenDark, fontSize: 19, fontWeight: "900" },
  primaryButton: {
    minHeight: 50,
    marginTop: 13,
    borderRadius: 16,
    backgroundColor: C.green,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonText: { color: C.black, fontSize: 12.5, fontWeight: "900" },
  termsText: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: "center",
    marginTop: 9,
    paddingHorizontal: 12,
  },
  locationHero: {
    backgroundColor: C.greenSoft,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  locationHeroIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
  },
  locationHeroTitle: { color: C.greenDark, fontSize: 13.5, fontWeight: "900" },
  locationHeroBody: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  locationActionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  locationAction: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  locationActionText: { color: C.ink, fontSize: 10.5, fontWeight: "900" },
  savedLocationCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 17,
    padding: 12,
    marginTop: 9,
    flexDirection: "row",
    gap: 9,
  },
  savedLocationPin: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  savedLocationLabel: { color: C.ink, fontSize: 12, fontWeight: "900" },
  savedLocationAddress: {
    color: C.muted,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
  },
  coordsText: { color: "#8A948D", fontSize: 8.8, marginTop: 3 },
  pickerScreen: { flex: 1, backgroundColor: C.bg },
  pickerHeader: {
    height: 66,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerSaving: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderColor: C.line,
  },
  locationSheetRoot: { flex: 1, backgroundColor: C.bg },
  locationPickerScreen: { flex: 1, backgroundColor: C.bg },
  locationManagerHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingTop: 7,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  locationManagerTitle: { color: C.ink, fontSize: 16, fontWeight: "900" },
  locationManagerSubtitle: {
    color: C.muted,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
  },
  locationHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledAction: { opacity: 0.55 },
  mapPickerRoot: { flex: 1, backgroundColor: C.bg },
  mapPickerSearchWrap: {
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    minHeight: 47,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  mapPickerSearchInput: {
    flex: 1,
    color: C.ink,
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 0,
  },
  mapPickerResults: {
    marginHorizontal: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 8,
  },
  mapPickerResultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  mapPickerResultIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  mapPickerResultTitle: { color: C.ink, fontSize: 11, fontWeight: "900" },
  mapPickerResultSubtitle: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 13,
    marginTop: 2,
  },
  mapPickerMapWrap: {
    flex: 1,
    minHeight: 300,
    marginHorizontal: 14,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#20271D",
  },
  mapPickerHint: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    alignSelf: "center",
    backgroundColor: "rgba(23,28,19,0.96)",
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  mapPickerHintText: { color: C.ink, fontSize: 9.5, fontWeight: "800" },
  pickerMarkerOuter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(15,122,58,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  pickerMarkerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.white,
  },
  mapPickerFooter: {
    margin: 14,
    marginTop: 10,
    backgroundColor: C.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.line,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mapPickerSelectedLabel: { color: C.ink, fontSize: 11, fontWeight: "900" },
  mapPickerSelectedAddress: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 13,
    marginTop: 2,
  },
  mapPickerConfirmButton: {
    minWidth: 128,
    minHeight: 42,
    marginTop: 0,
    paddingHorizontal: 11,
  },
  formIntro: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 17,
    padding: 12,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
  },
  formIntroIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  formIntroTitle: { color: C.ink, fontSize: 12.5, fontWeight: "900" },
  formIntroBody: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 2,
  },
  cropChip: {
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cropChipActive: { backgroundColor: C.greenSoft, borderColor: "#41532D" },
  cropChipText: { color: C.muted, fontSize: 10.5, fontWeight: "800" },
  cropChipTextActive: { color: C.greenDark },
  cropContext: {
    marginTop: 9,
    backgroundColor: "#1E2B19",
    borderRadius: 13,
    padding: 10,
  },
  cropContextTitle: { color: C.greenDark, fontSize: 11.5, fontWeight: "900" },
  cropContextBody: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 2,
  },
  formGrid: { flexDirection: "row", gap: 8, marginBottom: 8 },
  field: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 4,
  },
  fieldLabel: { color: C.muted, fontSize: 8.8, fontWeight: "800" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  inputAffix: { color: C.ink, fontSize: 12, fontWeight: "800" },
  textInput: {
    flex: 1,
    height: 32,
    color: C.ink,
    fontSize: 12,
    fontWeight: "800",
    paddingVertical: 0,
  },
  selectWrap: { paddingVertical: 5 },
  unitOption: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#20271D",
    marginRight: 5,
  },
  unitOptionActive: { backgroundColor: C.green },
  unitOptionText: { color: C.muted, fontSize: 9.5, fontWeight: "800" },
  unitOptionTextActive: { color: C.white },
  previewPrice: {
    marginTop: 4,
    borderRadius: 15,
    padding: 12,
    backgroundColor: C.greenSoft,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewPriceLabel: { color: C.muted, fontSize: 9.5, fontWeight: "700" },
  previewPriceValue: {
    color: C.greenDark,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 1,
  },
  previewSave: {
    color: C.greenDark,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 1,
  },
  imagePickerCard: {
    height: 185,
    backgroundColor: "#20271D",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    borderStyle: "dashed",
    overflow: "hidden",
    position: "relative",
  },
  uploadPreview: { width: "100%", height: "100%" },
  uploadPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    color: C.ink,
    fontSize: 12.5,
    fontWeight: "900",
    marginTop: 7,
  },
  uploadBody: { color: C.muted, fontSize: 10, marginTop: 3 },
  imageEditBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: "rgba(21,32,26,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButton: {
    marginTop: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: "#B8D8BF",
    borderRadius: 12,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  uploadButtonText: { color: C.greenDark, fontSize: 10.5, fontWeight: "900" },
  textArea: {
    minHeight: 92,
    marginTop: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingTop: 10,
    color: C.ink,
    fontSize: 11,
    lineHeight: 16,
    textAlignVertical: "top",
  },
  locationChip: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 170,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationChipActive: { backgroundColor: C.greenSoft, borderColor: "#41532D" },
  locationChipTitle: { color: C.ink, fontSize: 10.5, fontWeight: "900" },
  locationChipSub: {
    color: C.muted,
    fontSize: 8.5,
    marginTop: 2,
    maxWidth: 126,
  },
  warningCard: {
    backgroundColor: "#382A18",
    borderWidth: 1,
    borderColor: "#F5DCB0",
    borderRadius: 15,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  warningTitle: { color: C.ink, fontSize: 10.5, fontWeight: "900" },
  warningBody: { color: C.muted, fontSize: 9, lineHeight: 13, marginTop: 2 },
  orderCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 17,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 9,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#1E2B19",
    alignItems: "center",
    justifyContent: "center",
  },
  orderCrop: { color: C.ink, fontSize: 12.5, fontWeight: "900" },
  orderNumber: {
    color: C.muted,
    fontSize: 9.5,
    marginTop: 2,
    fontWeight: "700",
  },
  liveText: {
    color: C.greenDark,
    fontSize: 9,
    fontWeight: "900",
    marginTop: 5,
  },
  orderStatusHero: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  orderStatusIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  trackingBanner: {
    marginTop: 10,
    borderRadius: 17,
    backgroundColor: C.greenSoft,
    borderWidth: 1,
    borderColor: "#C7E6CE",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  trackingBannerTitle: { color: C.greenDark, fontSize: 12, fontWeight: "900" },
  trackingBannerBody: { color: C.muted, fontSize: 10, marginTop: 2 },
  liveDot: {
    width: 25,
    height: 25,
    borderRadius: 99,
    backgroundColor: "rgba(15,122,58,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveDotInner: {
    width: 9,
    height: 9,
    borderRadius: 99,
    backgroundColor: C.green,
  },
  routeEndpoints: {
    marginTop: 10,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 12,
  },
  locationSnapshot: {
    marginTop: 11,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 12,
  },
  endpoint: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  endpointDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
    marginTop: 4,
    backgroundColor: C.green,
  },
  endpointLine: {
    width: 1,
    height: 15,
    marginLeft: 4.5,
    backgroundColor: C.line,
    marginVertical: 4,
  },
  endpointTitle: { color: C.ink, fontSize: 10.5, fontWeight: "900" },
  endpointAddress: {
    color: C.muted,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 2,
  },
  timelineCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 17,
    marginTop: 11,
    padding: 12,
  },
  timelineStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    paddingBottom: 12,
  },
  timelineDot: {
    width: 19,
    height: 19,
    borderRadius: 99,
    backgroundColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotDone: { backgroundColor: C.green },
  timelineTitle: { color: C.ink, fontSize: 10.5, fontWeight: "900" },
  timelineBody: { color: C.muted, fontSize: 9.5, marginTop: 1 },
  cancelOrderButton: {
    marginTop: 2,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#F0C8C8",
    backgroundColor: "#301B1B",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelOrderButtonText: { color: C.red, fontSize: 10.5, fontWeight: "900" },
  sellerActionsCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 17,
    marginTop: 11,
    padding: 12,
    gap: 8,
  },
  actionButton: {
    minHeight: 45,
    backgroundColor: C.green,
    borderRadius: 14,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButtonText: {
    color: C.white,
    fontSize: 11.5,
    fontWeight: "900",
    flex: 1,
  },
  successNotice: {
    backgroundColor: C.greenSoft,
    borderRadius: 13,
    padding: 10,
    flexDirection: "row",
    gap: 7,
    alignItems: "flex-start",
  },
  successNoticeText: {
    color: C.greenDark,
    fontSize: 9.8,
    lineHeight: 14,
    flex: 1,
  },
  paymentSheet: { padding: 18, alignItems: "center" },
  paymentIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: C.greenSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  paymentBody: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 6,
  },
  paymentUrlCard: {
    width: "100%",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 15,
    padding: 12,
    marginTop: 13,
  },
  paymentUrl: { color: C.ink, fontSize: 10.5, lineHeight: 15 },
  errorToast: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 16,
    borderRadius: 14,
    backgroundColor: "#243028",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.17,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  errorToastText: { color: C.white, fontSize: 10.5, lineHeight: 15, flex: 1 },
  globalBusy: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(21,32,26,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
