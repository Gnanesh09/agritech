import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import MapView, { Circle, Marker } from "react-native-maps";
import MarketplaceProductMapPin from "../../components/marketplace/MarketplaceProductMapPin";

// The single palette is owned by app/(tabs)/market.tsx and passed into this map.
export type MarketplacePalette = {
  bg: string; black: string; card: string; cardAlt: string; soft: string; line: string; lineStrong: string;
  ink: string; white: string; muted: string; mutedOnLight: string; primary: string; primaryDark1: string; green: string; lime: string;
  greenDark: string; greenSoft: string; primaryBorder: string; accent: string; orange: string; accentSoft: string;
  accentBorder: string; red: string; danger: string; dangerSoft: string; dangerBorder: string; blue: string;
  blueSoft: string; success: string; successBorder: string; toast: string;
};

export type MapListing = {
  id: string;
  cropName: string;
  price: number;
  imageUrl?: string | null;
  distanceKm?: number | null;
  seller?: { username?: string; location?: any; sellerLocation?: any };
  sellerLocation?: any;
  sellerLatitude?: number | string | null;
  sellerLongitude?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  location?: any;
};

type MapsViewProps = {
  colors: MarketplacePalette;
  center: { latitude: number; longitude: number };
  radiusKm: number;
  listings: MapListing[];
  onRecenter: () => void;
  onOpenListing: (listing: MapListing) => void;
};

// Use RGBA only where the native map needs a translucent range circle.
function withAlpha(hex: string, alpha: number) {
  const raw = String(hex || "#000000").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return `rgba(0, 0, 0, ${alpha})`;
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

// Accept the common API variants so one missing coordinate field doesn't crash the map.
function getListingCoordinates(listing: MapListing) {
  const raw: any = listing;
  const location = raw.sellerLocation ?? raw.location ?? raw.seller?.location ?? raw.seller?.sellerLocation;
  const coordinateArray = location?.coordinates ?? raw.coordinates;
  const latitude = Number(location?.latitude ?? location?.lat ?? raw.sellerLatitude ?? raw.latitude ?? coordinateArray?.[1]);
  const longitude = Number(location?.longitude ?? location?.lng ?? raw.sellerLongitude ?? raw.longitude ?? coordinateArray?.[0]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

/** Map canvas only. The parent keeps the search/actions/radius header fixed above it. */
export function MapsView({ colors: C, center, radiusKm, listings, onRecenter, onOpenListing }: MapsViewProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [trackMarkerViews, setTrackMarkerViews] = useState(true);
  const styles = useMemo(() => makeStyles(C), [C]);

  // Keep camera position in sync when the selected location or radius changes.
  const region = useMemo(() => ({
    latitude: Number(center.latitude),
    longitude: Number(center.longitude),
    latitudeDelta: Math.max(0.015, radiusKm / 90),
    longitudeDelta: Math.max(0.015, radiusKm / 90),
  }), [center.latitude, center.longitude, radiusKm]);

  useEffect(() => { mapRef.current?.animateToRegion(region, 380); }, [region]);

  // Android captures custom marker views after their contents have rendered, then freezes them.
  useEffect(() => {
    setTrackMarkerViews(true);
    const timer = setTimeout(() => setTrackMarkerViews(false), 1800);
    return () => clearTimeout(timer);
  }, [listings]);

  const mappedListings = useMemo(
    () => listings
      .map((listing) => ({ listing, coordinate: getListingCoordinates(listing) }))
      .filter((item): item is { listing: MapListing; coordinate: { latitude: number; longitude: number } } => Boolean(item.coordinate)),
    [listings],
  );

  // Dark native map styling is separate from the shared top header.
  const mapStyle = useMemo(() => [
    { elementType: "geometry", stylers: [{ color: C.bg }] },
    { elementType: "labels.text.fill", stylers: [{ color: C.muted }] },
    { elementType: "labels.text.stroke", stylers: [{ color: C.bg }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: C.line }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: C.card }] },
    { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: C.soft }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: C.line }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: C.bg }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: C.cardAlt }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: C.bg }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
    { featureType: "water", elementType: "geometry.fill", stylers: [{ color: C.bg }] },
  ], [C]);

  return (
    <View style={styles.canvas}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        userInterfaceStyle="dark"
        customMapStyle={mapStyle as any}
        initialRegion={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Search-radius coverage, drawn around the selected marketplace location. */}
        <Circle
          center={center}
          radius={radiusKm * 1000}
          fillColor={withAlpha(C.primary, 0.08)}
          strokeColor={withAlpha(C.primary, 0.42)}
          strokeWidth={1}
        />

        {/* Current selected location indicator. */}
        <Marker coordinate={center} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
          <View style={styles.userDotOuter}><View style={styles.userDotInner} /></View>
        </Marker>

        {/* One reusable product card at each seller's actual coordinate. */}
        {mappedListings.map(({ listing, coordinate }) => (
          <Marker
            key={listing.id}
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => onOpenListing(listing)}
            tracksViewChanges={trackMarkerViews}
            zIndex={1}
          >
            <MarketplaceProductMapPin
              cropName={listing.cropName}
              price={listing.price}
              imageUrl={listing.imageUrl}
              colors={C}
            />
          </Marker>
        ))}
      </MapView>

      {/* Floating recenter button stays inside the map canvas, never in the fixed header. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Center map on my location"
        onPress={onRecenter}
        style={({ pressed }) => [styles.recenterButton, { bottom: Math.max(insets.bottom, 12) + 10 }, pressed && styles.pressed]}
      >
        <Feather name="crosshair" size={20} color={C.ink} />
      </Pressable>

      {/* Helpful empty states: no listings versus listings without usable coordinates. */}
      {listings.length === 0 ? (
        <View style={styles.emptyNotice}>
          <Text style={styles.emptyTitle}>No harvests in this area yet</Text>
          <Text style={styles.emptyBody}>Increase your search radius or try another location.</Text>
        </View>
      ) : mappedListings.length === 0 ? (
        <View style={[styles.emptyNotice, styles.warningNotice]}>
          <Text style={styles.emptyTitle}>Products found, but no map pins yet</Text>
          <Text style={styles.emptyBody}>These listings need valid seller latitude and longitude to appear on the map.</Text>
        </View>
      ) : null}
    </View>
  );
}

// This file is also inside Expo Router's app/ directory, so redirect direct visits to the main page.
export default function MapsViewRoute() {
  const router = useRouter();
  useEffect(() => { router.replace("/market" as any); }, [router]);
  return null;
}

// Map-specific styles only. Shared search/actions/radius styles live in market.tsx.
function makeStyles(C: MarketplacePalette) {
  return StyleSheet.create({
    canvas: { flex: 1, minHeight: 0, width: "100%", overflow: "hidden", backgroundColor: C.bg },
    userDotOuter: { width: 27, height: 27, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: withAlpha(C.primary, 0.18) },
    userDotInner: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: C.white, backgroundColor: C.primary },
    recenterButton: { position: "absolute", right: 16, width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, elevation: 6 },
    pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
    emptyNotice: { position: "absolute", bottom: 18, left: 16, right: 16, borderRadius: 17, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, padding: 15 },
    warningNotice: { borderColor: C.accent },
    emptyTitle: { color: C.ink, fontSize: 13, fontWeight: "800" },
    emptyBody: { color: C.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  });
}
