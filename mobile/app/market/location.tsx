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
  Keyboard,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, FontAwesome, Ionicons } from "@expo/vector-icons";
import MapView, { type Region } from "react-native-maps";
import * as Location from "expo-location";
import AppText from "@/components/ui/AppText";
import { apiRequest } from "../../lib/api";
import { StatusBar } from "expo-status-bar";

type SavedLocation = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  mapplsPin?: string | null;
  landmark?: string | null;
  isDefault: boolean;
};

type Coordinates = { latitude: number; longitude: number };
type AddressDraft = Coordinates & {
  address: string;
  mapplsPin?: string | null;
};

const COLORS = {
  ink: "#F5F7F2",
  subtext: "#A2AA9C",
  muted: "#858D80",
  outline: "#343A32",
  white: "#10130F",
  page: "#0B0D0B",
  pink: "#C8FF67",
  pinkPale: "#252D1E",
  green: "#A5D65A",
  greenPale: "#29391D",
  divider: "#292E28",
  selected: "#29391D",
};

// Map's neutral fallback viewport only; the app never treats this as the user's location.
const FALLBACK_REGION: Region = {
  latitude: 12.9716,
  longitude: 77.5946,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

function formatAddress(
  parts:
    | Location.LocationGeocodedAddress[]
    | Location.LocationGeocodedAddress
    | null
    | undefined,
) {
  const p = Array.isArray(parts) ? parts[0] : parts;
  if (!p) return "";
  const values = [
    p.name,
    p.street,
    p.district,
    p.subregion,
    p.city,
    p.region,
    p.postalCode,
    p.country,
  ].filter((value): value is string => Boolean(value?.trim()));
  return [...new Set(values)].join(", ").slice(0, 500);
}

function distanceMeters(from: Coordinates | null, to: Coordinates) {
  if (!from) return null;
  const r = 6371000;
  const rad = (n: number) => (n * Math.PI) / 180;
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.latitude)) *
      Math.cos(rad(to.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(2 * r * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function distanceLabel(meters: number | null) {
  if (meters === null) return "";
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return "Something went wrong. Please try again.";
}

function normaliseLocation(row: any): SavedLocation {
  return {
    id: String(row.id),
    label: String(row.label ?? "Address"),
    address: String(row.address ?? ""),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    mapplsPin: row.mapplsPin ?? null,
    landmark: row.landmark ?? null,
    isDefault: Boolean(row.isDefault),
  };
}

function RoundIconButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="h-[32px] w-[32px] items-center justify-center rounded-full border border-[#343A32] bg-[#10130F]"
    >
      <Feather name={icon} size={20} color={COLORS.ink} />
    </Pressable>
  );
}

export default function MarketplaceLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [currentCoordinates, setCurrentCoordinates] =
    useState<Coordinates | null>(null);

  const [mapVisible, setMapVisible] = useState(false);
  const [mapSearch, setMapSearch] = useState("");
  const [mapBusy, setMapBusy] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(FALLBACK_REGION);

  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("Home");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [mapplsPin, setMapplsPin] = useState("");
  const [makeDefault, setMakeDefault] = useState(true);
  const [coords, setCoords] = useState<Coordinates | null>(null);

  const loadLocations = useCallback(async () => {
    setLoading(true);
    setPageError("");
    try {
      const response = await apiRequest("/user/marketplace/locations");
      const rows = (response?.locations ?? []).map(
        normaliseLocation,
      ) as SavedLocation[];
      setLocations(rows);
    } catch (error) {
      setPageError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLocations();
    }, [loadLocations]),
  );

  useEffect(() => {
    // A best-effort location read is used only to show approximate distance labels.
    // The app will ask for permission when the user taps a location action.
    let cancelled = false;
    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted || cancelled) return;
        const position = await Location.getLastKnownPositionAsync();
        if (!cancelled && position) {
          setCurrentCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch {
        // Saved addresses work normally when location permission is unavailable.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleLocations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return locations;
    return locations.filter((item) =>
      `${item.label} ${item.address} ${item.landmark ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [locations, search]);

  const showError = (title: string, error: unknown) => {
    Alert.alert(title, getErrorMessage(error));
  };

  const getCurrentPosition = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error(
        "Location permission is needed to use your current location. You can also search for an address on the map.",
      );
    }
    const result = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const point = {
      latitude: result.coords.latitude,
      longitude: result.coords.longitude,
    };
    setCurrentCoordinates(point);
    return point;
  }, []);

  const openAddressForm = useCallback(
    (draft: AddressDraft, existing?: SavedLocation) => {
      setEditingId(existing?.id ?? null);
      setLabel(existing?.label ?? "Home");
      setAddress(draft.address || existing?.address || "");
      setLandmark(existing?.landmark ?? "");
      setMapplsPin(draft.mapplsPin ?? existing?.mapplsPin ?? "");
      setCoords({ latitude: draft.latitude, longitude: draft.longitude });
      setMakeDefault(existing ? existing.isDefault : true);
      setFormVisible(true);
    },
    [locations.length],
  );

  const openMap = async (preferCurrent = false, initialSearch = "") => {
    setMapBusy(true);
    setMapSearch(initialSearch);
    try {
      let startingPoint: Coordinates | null = null;
      if (preferCurrent) {
        startingPoint = await getCurrentPosition();
      } else {
        const defaultLocation =
          locations.find((item) => item.isDefault) ?? locations[0];
        if (
          defaultLocation &&
          Number.isFinite(defaultLocation.latitude) &&
          Number.isFinite(defaultLocation.longitude)
        ) {
          startingPoint = {
            latitude: defaultLocation.latitude,
            longitude: defaultLocation.longitude,
          };
        } else if (currentCoordinates) {
          startingPoint = currentCoordinates;
        }
      }

      const base = startingPoint ?? {
        latitude: FALLBACK_REGION.latitude,
        longitude: FALLBACK_REGION.longitude,
      };
      const region = {
        ...base,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };
      setMapRegion(region);
      setMapVisible(true);
      if (initialSearch.trim()) {
        try {
          const results = await Location.geocodeAsync(initialSearch.trim());
          if (results.length > 0) {
            const found = {
              latitude: results[0].latitude,
              longitude: results[0].longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            };
            setMapRegion(found);
            mapRef.current?.animateToRegion(found, 450);
          } else {
            Alert.alert(
              "Address not found",
              "Try a nearby street, area, or landmark on the map.",
            );
          }
        } catch {
          Alert.alert(
            "Address search unavailable",
            "Move the map to choose the address manually.",
          );
        }
      }
    } catch (error) {
      showError("Couldn't get your location", error);
    } finally {
      setMapBusy(false);
    }
  };

  const reverseAddress = async (point: Coordinates) => {
    try {
      const results = await Location.reverseGeocodeAsync(point);
      const formatted = formatAddress(results);
      return (
        formatted ||
        `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
      );
    } catch {
      return `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
    }
  };

  const confirmMapLocation = async () => {
    setMapBusy(true);
    try {
      const point = {
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      };
      const resolvedAddress = await reverseAddress(point);
      setMapVisible(false);
      openAddressForm({ ...point, address: resolvedAddress });
    } catch (error) {
      showError("Couldn't select this location", error);
    } finally {
      setMapBusy(false);
    }
  };

  const searchMapAddress = async () => {
    const query = mapSearch.trim();
    if (!query) return;
    Keyboard.dismiss();
    setMapBusy(true);
    try {
      const results = await Location.geocodeAsync(query);
      if (!results.length) {
        throw new Error(
          "No matching address found. Try a nearby street, area, or landmark.",
        );
      }
      const point = {
        latitude: results[0].latitude,
        longitude: results[0].longitude,
      };
      const nextRegion = {
        ...point,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      };
      setMapRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 450);
    } catch (error) {
      showError("Address not found", error);
    } finally {
      setMapBusy(false);
    }
  };

  const useCurrentLocation = async () => {
    setLoadingCurrent(true);
    try {
      const point = await getCurrentPosition();
      await openMapAtPoint(point);
    } catch (error) {
      showError("Couldn't use current location", error);
    } finally {
      setLoadingCurrent(false);
    }
  };

  const openMapAtPoint = async (point: Coordinates) => {
    setMapBusy(true);
    try {
      const region = {
        ...point,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
      setMapRegion(region);
      setMapSearch("");
      setMapVisible(true);
    } finally {
      setMapBusy(false);
    }
  };

  const makeDefaultLocation = async (
    item: SavedLocation,
    returnAfterSelect = false,
  ) => {
    if (item.isDefault) {
      if (returnAfterSelect) router.back();
      return;
    }
    try {
      await apiRequest(`/user/marketplace/locations/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isDefault: true }),
      });
      setLocations((current) =>
        current.map((row) => ({ ...row, isDefault: row.id === item.id })),
      );
      if (returnAfterSelect) router.back();
    } catch (error) {
      showError("Couldn't select address", error);
    }
  };

  const editLocation = (item: SavedLocation) => {
    openAddressForm(
      {
        latitude: item.latitude,
        longitude: item.longitude,
        address: item.address,
        mapplsPin: item.mapplsPin,
      },
      item,
    );
  };

  const deleteLocation = (item: SavedLocation) => {
    Alert.alert(
      "Remove address?",
      `Remove ${item.label} from your saved addresses?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await apiRequest(`/user/marketplace/locations/${item.id}`, {
                method: "DELETE",
              });
              setLocations((current) =>
                current.filter((row) => row.id !== item.id),
              );
              void loadLocations();
            } catch (error) {
              showError("Couldn't remove address", error);
            }
          },
        },
      ],
    );
  };

  const openAddressMenu = (item: SavedLocation) => {
    Alert.alert(item.label, "Manage this saved address", [
      { text: "Edit address", onPress: () => editLocation(item) },
      ...(!item.isDefault
        ? [
            {
              text: "Set as default",
              onPress: () => void makeDefaultLocation(item),
            },
          ]
        : []),
      {
        text: "Remove address",
        style: "destructive",
        onPress: () => deleteLocation(item),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const saveAddress = async () => {
    if (!label.trim()) {
      Alert.alert("Add a label", "Enter a name such as Home, Work, or Other.");
      return;
    }
    if (!address.trim()) {
      Alert.alert(
        "Address required",
        "Choose a location on the map or enter an address.",
      );
      return;
    }
    if (!coords) {
      Alert.alert(
        "Select a map location",
        "Choose the address on the map so delivery has accurate coordinates.",
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        address: address.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        mapplsPin: mapplsPin.trim() || null,
        landmark: landmark.trim() || null,
        isDefault: makeDefault || locations.length === 0,
      };

      if (editingId) {
        await apiRequest(`/user/marketplace/locations/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/user/marketplace/locations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setFormVisible(false);
      await loadLocations();
      Alert.alert("Address saved", "Your delivery address has been saved.");
    } catch (error) {
      showError("Couldn't save address", error);
    } finally {
      setSaving(false);
    }
  };

  const shareAddress = async (item: SavedLocation) => {
    const message = `My delivery address (${item.label}): ${item.address}${item.landmark ? `\nLandmark: ${item.landmark}` : ""}`;
    try {
      await Share.share({ message, title: "Share delivery address" });
    } catch (error) {
      showError("Couldn't share address", error);
    }
  };

  const requestAddressFromFriend = async () => {
    const message =
      "Hi! Could you share your delivery address and a nearby landmark with me?";
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message, title: "Request an address" });
      }
    } catch {
      try {
        await Share.share({ message, title: "Request an address" });
      } catch (error) {
        showError("Couldn't open sharing", error);
      }
    }
  };

  const renderLocation = (item: SavedLocation) => {
    const metres = distanceMeters(currentCoordinates, item);
    const isSelected = item.isDefault;
    const isHome = item.label.toLowerCase() === "home";

    return (
      <View key={item.id}>
        <Pressable
          onPress={() => void makeDefaultLocation(item, true)}
          className="flex-row items-center gap-2 px-2 py-3"
          accessibilityRole="button"
          accessibilityLabel={`Select ${item.label} address`}
        >
          <View className="w-[30px] items-center justify-center">
            {isHome ? (
              <Feather name="home" size={22} color={COLORS.ink} />
            ) : (
              <Ionicons name="location-outline" size={24} color={COLORS.ink} />
            )}
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <AppText className="text-[15px] font-semibold text-[#F5F7F2]">
                {item.label}
              </AppText>
              {metres !== null ? (
                <AppText className="text-[11px] font-semibold text-[#858D80]">
                  • {distanceLabel(metres)}
                </AppText>
              ) : null}
              {isSelected ? (
                <View className="rounded-[5px] border border-[#536344] bg-[#29391D] px-1.5 py-0.5">
                  <AppText className="text-[10px] font-semibold text-[#A5D65A]">
                    Selected
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              className="mt-1 text-[12px] leading-[17px] text-[#A2AA9C]"
              numberOfLines={2}
            >
              {item.address}
            </AppText>
            {item.landmark ? (
              <AppText
                className="mt-1 text-[10px] text-[#858D80]"
                numberOfLines={1}
              >
                Landmark: {item.landmark}
              </AppText>
            ) : null}
          </View>

          <View className="flex-row items-center gap-0.5">
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                void shareAddress(item);
              }}
              className="h-8 w-8 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel={`Share ${item.label} address`}
            >
              <Feather name="upload" size={20} color={COLORS.subtext} />
            </Pressable>
            <Pressable
              onPress={(event) => {
                event.stopPropagation?.();
                openAddressMenu(item);
              }}
              className="h-8 w-7 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel={`More options for ${item.label}`}
            >
              <Feather name="more-vertical" size={20} color={COLORS.subtext} />
            </Pressable>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#0B0D0B]">
      <StatusBar style="light" backgroundColor="#0B0D0B" />

      {/* White header and search area */}
      <View className="bg-[#10130F]" style={{ paddingTop: insets.top + 10 }}>
        <View className="flex-row items-center gap-3 px-4 pb-3 pt-1">
          <RoundIconButton
            icon="chevron-left"
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          />
          <AppText className="min-w-0 flex-1 text-[19px] font-bold leading-6 text-[#F5F7F2]">
            Select Location
          </AppText>
        </View>

        <View className="px-4 pb-4 pt-2">
          <View className="h-[44px] flex-row items-center rounded-[10px] border border-[#343A32] bg-[#10130F] px-4">
            <Feather name="search" size={22} color={COLORS.subtext} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search Address"
              placeholderTextColor="#858D80"
              returnKeyType="search"
              autoCapitalize="none"
              onSubmitEditing={() => {
                Keyboard.dismiss();
                if (search.trim() && visibleLocations.length === 0) {
                  setMapSearch(search.trim());
                  void openMap(false, search.trim());
                }
              }}
              className="ml-3 min-w-0 flex-1 py-0 text-[16px] text-[#F5F7F2]"
              style={{ fontFamily: "Poppins_500Medium" }}
              accessibilityLabel="Search saved addresses"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} hitSlop={10}>
                <Feather name="x-circle" size={20} color={COLORS.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 20) + 24,
        }}
      >
        <View className="px-3 pt-4">
          {/* Current location / add address card */}
          <View className="overflow-hidden rounded-[12px] border border-[#343A32] bg-[#10130F]">
            <Pressable
              onPress={() => void useCurrentLocation()}
              disabled={loadingCurrent}
              className="min-h-[45px] flex-row items-center gap-3 px-4"
            >
              {loadingCurrent ? (
                <ActivityIndicator size="small" color={COLORS.pink} />
              ) : (
                <Ionicons name="locate-outline" size={23} color={COLORS.pink} />
              )}
              <AppText className="flex-1 text-[16px] font-semibold text-[#C8FF67]">
                Use my Current Location
              </AppText>
            </Pressable>

            <View className="h-px bg-[#343A32]" />

            <Pressable
              onPress={() => void openMap(false)}
              disabled={mapBusy}
              className="min-h-[45px] flex-row items-center gap-3 px-4"
            >
              <Feather name="plus" size={27} color={COLORS.pink} />
              <AppText className="flex-1 text-[16px] font-semibold text-[#C8FF67]">
                Add New Address
              </AppText>
              <Feather name="chevron-right" size={22} color={COLORS.subtext} />
            </Pressable>
          </View>

          {/* Request address from a friend */}
          <Pressable
            onPress={() => void requestAddressFromFriend()}
            className="mt-3 min-h-[46px] flex-row items-center gap-3 rounded-[12px] border border-[#343A32] bg-[#10130F] px-4"
          >
            <FontAwesome name="whatsapp" size={24} color="#A5D65A" />
            <AppText className="min-w-0 flex-1 text-[15px] font-semibold text-[#F5F7F2]">
              Request address from friend
            </AppText>
            <Feather name="chevron-right" size={22} color={COLORS.subtext} />
          </Pressable>

          {/* Saved addresses */}
          <View className="mb-3 mt-8 flex-row items-center justify-between gap-3 px-2">
            <AppText className="text-[18px] font-bold text-[#F5F7F2]">
              Saved Addresses
            </AppText>
            {locations.length > 0 ? (
              <AppText className="text-[12px] text-[#858D80]">
                {locations.length} saved
              </AppText>
            ) : null}
          </View>

          {loading ? (
            <View className="items-center rounded-[12px] border border-[#343A32] bg-[#10130F] py-6">
              <ActivityIndicator size="small" color={COLORS.pink} />
              <AppText className="mt-2 text-[12px] text-[#A2AA9C]">
                Loading saved addresses…
              </AppText>
            </View>
          ) : pageError ? (
            <View className="rounded-[12px] border border-[#343A32] bg-[#10130F] p-4">
              <AppText className="text-[14px] leading-5 text-[#A2AA9C]">
                {pageError}
              </AppText>
              <Pressable
                onPress={() => void loadLocations()}
                className="mt-4 self-start rounded-full bg-[#252D1E] px-4 py-2.5"
              >
                <AppText className="text-[13px] font-semibold text-[#C8FF67]">
                  Try again
                </AppText>
              </Pressable>
            </View>
          ) : visibleLocations.length === 0 ? (
            <View className="items-center rounded-[12px] border border-[#343A32] bg-[#10130F] px-4 py-6">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#252D1E]">
                <Feather name="map-pin" size={25} color={COLORS.pink} />
              </View>
              <AppText className="mt-3 text-[14px] font-semibold text-[#F5F7F2]">
                {search ? "No matching addresses" : "No saved addresses yet"}
              </AppText>
              <AppText className="mt-1 text-center text-[11px] leading-4 text-[#A2AA9C]">
                {search
                  ? "Try another name or search for the address on the map."
                  : "Add a delivery address to make checkout faster."}
              </AppText>
              {search ? (
                <Pressable
                  onPress={() => {
                    void openMap(false, search.trim());
                  }}
                  className="mt-4 rounded-full bg-[#252D1E] px-4 py-2.5"
                >
                  <AppText className="text-[13px] font-semibold text-[#C8FF67]">
                    Find on map
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className="overflow-hidden rounded-[12px] border border-[#343A32] bg-[#10130F] px-2">
              {visibleLocations.map((item, index) => (
                <React.Fragment key={item.id}>
                  {index > 0 ? (
                    <View className="ml-4 h-px border-t border-dashed border-[#343A32]" />
                  ) : null}
                  {renderLocation(item)}
                </React.Fragment>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Full-screen map location picker */}
      <Modal
        visible={mapVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMapVisible(false)}
      >
        <View className="flex-1 bg-[#0B0D0B]">
          <StatusBar
            style="light"
            backgroundColor="transparent"
            translucent={true}
          />
          <View className="flex-row items-center gap-3 bg-[#10130F] px-5 pb-3 ">
            <Pressable
              onPress={() => setMapVisible(false)}
              className="h-11 w-11 items-center justify-center rounded-full border border-[#343A32] bg-[#171E12]"
            >
              <Feather name="arrow-left" size={22} color={COLORS.ink} />
            </Pressable>
            <AppText className="flex-1 text-[19px] font-bold text-[#F5F7F2]">
              Choose on map
            </AppText>
            <Pressable
              onPress={async () => {
                setMapBusy(true);
                try {
                  const point = await getCurrentPosition();
                  const region = {
                    ...point,
                    latitudeDelta: 0.006,
                    longitudeDelta: 0.006,
                  };
                  setMapRegion(region);
                  mapRef.current?.animateToRegion(region, 400);
                } catch (error) {
                  showError("Couldn't get your location", error);
                } finally {
                  setMapBusy(false);
                }
              }}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#252D1E]"
              accessibilityLabel="Center map on current location"
            >
              <Ionicons name="locate" size={21} color={COLORS.pink} />
            </Pressable>
          </View>

          <View className="mx-5 mb-3 h-[54px] flex-row items-center rounded-[14px] border border-[#343A32] bg-[#171E12] px-4">
            <Feather name="search" size={19} color={COLORS.subtext} />
            <TextInput
              value={mapSearch}
              onChangeText={setMapSearch}
              placeholder="Search street, area or landmark"
              placeholderTextColor="#858D80"
              returnKeyType="search"
              onSubmitEditing={() => void searchMapAddress()}
              className="ml-3 min-w-0 flex-1 py-0 text-[14px] text-[#F5F7F2]"
              style={{ fontFamily: "Poppins_400Regular" }}
            />
            <Pressable onPress={() => void searchMapAddress()} className="p-2">
              <Feather name="arrow-right" size={19} color={COLORS.pink} />
            </Pressable>
          </View>

          <View className="flex-1">
            <MapView
              key={String(mapVisible)}
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={mapRegion}
              onRegionChangeComplete={(region) => setMapRegion(region)}
              showsUserLocation
              showsMyLocationButton={false}
              toolbarEnabled={false}
              loadingEnabled
            />

            {/* Fixed center pin: move the map beneath this pin to select an exact point. */}
            <View
              pointerEvents="none"
              className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center"
            >
              <View
                className="items-center"
                style={{ transform: [{ translateY: -18 }] }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-full border-[3px] border-[#10130F] bg-[#C8FF67]"
                  style={{ elevation: 7 }}
                >
                  <Ionicons name="location" size={23} color="#10130F" />
                </View>
                <View className="-mt-1 h-3 w-3 rotate-45 bg-[#C8FF67]" />
              </View>
            </View>

            <View
              pointerEvents="none"
              className="absolute left-4 right-4 top-4 rounded-[12px] bg-[#171E12]/95 px-4 py-3"
              style={{ elevation: 3 }}
            >
              <AppText className="text-[12px] font-semibold text-[#F5F7F2]">
                Move the map to place the pin
              </AppText>
              <AppText className="mt-0.5 text-[10px] leading-4 text-[#A2AA9C]">
                Choose the exact building or entrance for deliveries.
              </AppText>
            </View>
          </View>

          <View
            className="border-t border-[#292E28] bg-[#10130F] px-5 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom, 14) }}
          >
            <AppText className="text-[11px] font-semibold uppercase tracking-[0.7px] text-[#858D80]">
              Pinned coordinates
            </AppText>
            <AppText className="mt-1 text-[12px] text-[#A2AA9C]">
              {mapRegion.latitude.toFixed(6)}, {mapRegion.longitude.toFixed(6)}
            </AppText>
            <Pressable
              onPress={() => void confirmMapLocation()}
              disabled={mapBusy}
              className={`mt-4 min-h-[54px] flex-row items-center justify-center gap-2 rounded-[15px] ${mapBusy ? "bg-[#607C31]" : "bg-[#C8FF67]"}`}
            >
              {mapBusy ? (
                <ActivityIndicator color="#10130F" />
              ) : (
                <Feather name="map-pin" size={17} color="#10130F" />
              )}
              <AppText className="text-[15px] font-bold text-black">
                {mapBusy ? "Finding address…" : "Use this location"}
              </AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Address details form */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormVisible(false)}
      >
        <View
          className="flex-1 bg-[#0B0D0B]"
          style={{ paddingTop: insets.top + 6 }}
        >
          <View className="flex-row items-center gap-3 border-b border-[#292E28] bg-[#10130F] px-5 pb-4 pt-2">
            <Pressable
              onPress={() => setFormVisible(false)}
              className="h-10 w-10 items-center justify-center rounded-full border border-[#343A32]"
            >
              <Feather name="x" size={20} color={COLORS.ink} />
            </Pressable>
            <AppText className="flex-1 text-[19px] font-bold text-[#F5F7F2]">
              {editingId ? "Edit address" : "Add new address"}
            </AppText>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 20,
              paddingBottom: Math.max(insets.bottom, 16) + 20,
            }}
          >
            <View className="rounded-[18px] border border-[#343A32] bg-[#10130F] p-4">
              <View className="mb-3 flex-row items-start gap-2">
                <Feather name="map-pin" size={17} color={COLORS.pink} />
                <View className="min-w-0 flex-1">
                  <AppText className="text-[12px] font-semibold text-[#F5F7F2]">
                    Selected map location
                  </AppText>
                  <AppText className="mt-1 text-[12px] leading-[19px] text-[#A2AA9C]">
                    {address || "No address selected"}
                  </AppText>
                  {coords ? (
                    <AppText className="mt-1 text-[10px] text-[#858D80]">
                      {coords.latitude.toFixed(6)},{" "}
                      {coords.longitude.toFixed(6)}
                    </AppText>
                  ) : null}
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setFormVisible(false);
                  if (coords) {
                    void openMapAtPoint(coords);
                  } else {
                    void openMap(false);
                  }
                }}
                className="self-start rounded-full bg-[#252D1E] px-3 py-2"
              >
                <AppText className="text-[12px] font-semibold text-[#C8FF67]">
                  Change map location
                </AppText>
              </Pressable>
            </View>

            <AppText className="mb-2 mt-5 text-[13px] font-semibold text-[#F5F7F2]">
              Save address as
            </AppText>
            <View className="mb-4 flex-row gap-2">
              {["Home", "Work", "Other"].map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setLabel(preset)}
                  className={`rounded-full border px-5 py-2.5 ${label === preset ? "border-[#C8FF67] bg-[#252D1E]" : "border-[#343A32] bg-[#10130F]"}`}
                >
                  <AppText
                    className={`text-[13px] font-semibold ${label === preset ? "text-[#C8FF67]" : "text-[#A2AA9C]"}`}
                  >
                    {preset}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <View className="rounded-[18px] border border-[#343A32] bg-[#10130F] p-4">
              <AppText className="mb-1.5 text-[12px] font-semibold text-[#A2AA9C]">
                Address label
              </AppText>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="e.g. Home, Work, Apartment"
                placeholderTextColor="#858D80"
                className="mb-4 rounded-[11px] border border-[#343A32] px-3.5 py-3 text-[14px] text-[#F5F7F2]"
                style={{ fontFamily: "Poppins_400Regular" }}
              />

              <AppText className="mb-1.5 text-[12px] font-semibold text-[#A2AA9C]">
                Full address
              </AppText>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="House number, street, area"
                placeholderTextColor="#858D80"
                multiline
                textAlignVertical="top"
                className="mb-4 min-h-[88px] rounded-[11px] border border-[#343A32] px-3.5 py-3 text-[14px] leading-5 text-[#F5F7F2]"
                style={{ fontFamily: "Poppins_400Regular" }}
              />

              <AppText className="mb-1.5 text-[12px] font-semibold text-[#A2AA9C]">
                Landmark (optional)
              </AppText>
              <TextInput
                value={landmark}
                onChangeText={setLandmark}
                placeholder="Nearby shop, gate or landmark"
                placeholderTextColor="#858D80"
                className="mb-4 rounded-[11px] border border-[#343A32] px-3.5 py-3 text-[14px] text-[#F5F7F2]"
                style={{ fontFamily: "Poppins_400Regular" }}
              />

              <AppText className="mb-1.5 text-[12px] font-semibold text-[#A2AA9C]">
                Mappls PIN (optional)
              </AppText>
              <TextInput
                value={mapplsPin}
                onChangeText={setMapplsPin}
                placeholder="Enter Mappls PIN if available"
                placeholderTextColor="#858D80"
                className="rounded-[11px] border border-[#343A32] px-3.5 py-3 text-[14px] text-[#F5F7F2]"
                style={{ fontFamily: "Poppins_400Regular" }}
              />
            </View>

            <Pressable
              onPress={() => {
                const editingCurrentDefault = locations.some(
                  (item) => item.id === editingId && item.isDefault,
                );
                if (editingCurrentDefault && makeDefault) return;
                setMakeDefault((value) => !value);
              }}
              className="mt-4 flex-row items-center gap-3 rounded-[14px] border border-[#343A32] bg-[#10130F] px-4 py-3.5"
            >
              <View
                className={`h-5 w-5 items-center justify-center rounded-[5px] border ${makeDefault ? "border-[#A5D65A] bg-[#A5D65A]" : "border-[#AAB4C4] bg-[#10130F]"}`}
              >
                {makeDefault ? (
                  <Feather name="check" size={13} color="#10130F" />
                ) : null}
              </View>
              <AppText className="flex-1 text-[13px] font-medium text-[#F5F7F2]">
                Set as my default address
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => void saveAddress()}
              disabled={saving}
              className={`mt-5 min-h-[54px] flex-row items-center justify-center gap-2 rounded-[15px] ${saving ? "bg-[#607C31]" : "bg-[#C8FF67]"}`}
            >
              {saving ? (
                <ActivityIndicator color="#10130F" />
              ) : (
                <Feather name="check-circle" size={17} color="#10130F" />
              )}
              <AppText className="text-[15px] font-bold text-black">
                {saving
                  ? "Saving address…"
                  : editingId
                    ? "Save changes"
                    : "Save address"}
              </AppText>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
