import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Location from "expo-location";
import { apiRequest } from "../../lib/api";
import { MARKETPLACE_COLORS as C } from "../../theme/marketplace-colors";
import {
  getSelectedLocation,
  setSelectedLocation,
  type MarketplaceLocation,
} from "../../lib/marketplace-store";


// UI sections: top navigation, live GPS action, saved-address list, and error/loading states.
export default function MarketplaceLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<MarketplaceLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    () => getSelectedLocation()?.id ?? null,
  );

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await apiRequest("/user/marketplace/locations");
      const rows = (data?.locations ?? []).map((row: any) => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      })) as MarketplaceLocation[];

      setLocations(rows);
      const current = getSelectedLocation();
      const chosen = current ?? rows.find((row) => row.isDefault) ?? rows[0] ?? null;
      if (chosen) {
        setSelectedLocation(chosen);
        setSelectedId(chosen.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load saved locations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chooseLocation = async (location: MarketplaceLocation) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await apiRequest(`/user/marketplace/locations/${location.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: location.label,
          address: location.address,
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
          mapplsPin: location.mapplsPin ?? null,
          landmark: location.landmark ?? null,
          isDefault: true,
        }),
      });

      const chosen = { ...location, isDefault: true };
      setSelectedLocation(chosen);
      setSelectedId(chosen.id);
      setLocations((rows) =>
        rows.map((row) => ({ ...row, isDefault: row.id === chosen.id })),
      );
      router.back();
    } catch (e) {
      Alert.alert(
        "Location",
        e instanceof Error ? e.message : "Unable to select this location.",
      );
    } finally {
      setBusy(false);
    }
  };

  const useGps = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Allow location permission to use GPS.");
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      const reversed = await Location.reverseGeocodeAsync(coords).catch(() => []);
      const first = reversed[0];
      const address = first
        ? [first.name, first.street, first.subregion, first.city, first.region]
            .filter(Boolean)
            .join(", ")
        : `GPS location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`;

      const payload = {
        label: "Current location",
        address,
        ...coords,
        mapplsPin: null,
        landmark: null,
        isDefault: true,
      };
      const data = await apiRequest("/user/marketplace/locations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const created = data?.location ?? { id: `gps-${Date.now()}`, ...payload };
      const chosen = {
        ...created,
        latitude: Number(created.latitude),
        longitude: Number(created.longitude),
        isDefault: true,
      } as MarketplaceLocation;

      setSelectedLocation(chosen);
      setSelectedId(chosen.id);
      await load();
      router.back();
    } catch (e) {
      Alert.alert(
        "Use current location",
        e instanceof Error ? e.message : "Unable to use GPS right now.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-[#0a1102]" style={{ paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Airbnb-like compact top bar */}
      <View className="flex-row items-center gap-3 px-5 pb-5 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="h-11 w-11 items-center justify-center rounded-2xl border border-[#303146] bg-[#1A1A2E] active:opacity-70"
        >
          <Feather name="arrow-left" size={20} color={C.ink} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-[10px] font-black tracking-[2px] text-[#C8FF67]">
            MARKETPLACE · DELIVERY
          </Text>
          <Text className="mt-1 text-[25px] font-black tracking-tight text-[#F2F4EC]">
            Where to?
          </Text>
          <Text className="mt-0.5 text-xs text-[#9AA38F]">
            Choose where your fresh harvest should go.
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 24) + 20 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Prominent live GPS action */}
        <Pressable
          onPress={() => void useGps()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Use current GPS location"
          className={`flex-row items-center gap-3 rounded-[22px] border border-[#465B31] bg-[#1D2915] p-4 ${busy ? "opacity-70" : "active:opacity-80"}`}
        >
          <View className="h-[50px] w-[50px] items-center justify-center rounded-2xl bg-[#C8FF67]">
            <Feather name="crosshair" size={23} color={C.bg} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-[15px] font-extrabold text-[#F2F4EC]">
                {busy ? "Finding your location…" : "Use current location"}
              </Text>
              {!busy && (
                <View className="rounded-md bg-[#C8FF67]/15 px-1.5 py-1">
                  <Text className="text-[8px] font-black tracking-wider text-[#C8FF67]">
                    GPS
                  </Text>
                </View>
              )}
            </View>
            <Text className="mt-1 text-xs leading-[17px] text-[#A9B49B]">
              Find growers and fresh produce around you
            </Text>
          </View>
          {busy ? (
            <ActivityIndicator color={C.green} />
          ) : (
            <View className="h-8 w-8 items-center justify-center rounded-full bg-[#0a1102]/60">
              <Feather name="arrow-up-right" size={17} color={C.green} />
            </View>
          )}
        </Pressable>

        {/* Saved locations header */}
        <View className="mb-3 mt-7 flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-black tracking-tight text-[#F2F4EC]">
              Saved places
            </Text>
            <Text className="mt-1 text-xs text-[#9AA38F]">
              Tap a place to make it your default
            </Text>
          </View>
          <View className="min-w-8 items-center rounded-full border border-[#35412B] bg-[#1A1A2E] px-3 py-1.5">
            <Text className="text-xs font-extrabold text-[#C8FF67]">
              {locations.length}
            </Text>
          </View>
        </View>

        {loading ? (
          <View className="items-center justify-center rounded-[20px] border border-[#303146] bg-[#11150E] py-12">
            <ActivityIndicator color={C.green} size="large" />
            <Text className="mt-3 text-xs text-[#9AA38F]">Loading saved places…</Text>
          </View>
        ) : locations.length === 0 ? (
          <View className="items-center rounded-[22px] border border-dashed border-[#35412B] bg-[#11150E] px-6 py-10">
            <View className="mb-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#20251B]">
              <Feather name="map-pin" size={25} color={C.green} />
            </View>
            <Text className="text-center text-base font-extrabold text-[#F2F4EC]">
              No saved places yet
            </Text>
            <Text className="mt-2 max-w-[250px] text-center text-xs leading-[18px] text-[#9AA38F]">
              Use GPS above to set your delivery location and discover local growers.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {locations.map((item) => {
              const isActive = item.id === selectedId || item.isDefault;
              const isHome = item.label.toLowerCase().includes("home");

              return (
                <Pressable
                  key={item.id}
                  onPress={() => void chooseLocation(item)}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${item.label}${isActive ? ", current default" : ""}`}
                  className={`flex-row items-center gap-3 rounded-[20px] border p-3.5 ${isActive ? "border-[#C8FF67] bg-[#151D10]" : "border-[#303146] bg-[#141811]"} ${busy ? "opacity-70" : "active:opacity-80"}`}
                >
                  <View className={`h-12 w-12 items-center justify-center rounded-[15px] ${isActive ? "bg-[#C8FF67]" : "bg-[#20251B]"}`}>
                    <Feather
                      name={isHome ? "home" : "map-pin"}
                      size={19}
                      color={isActive ? C.bg : C.green}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text
                        className="flex-shrink text-sm font-extrabold text-[#F2F4EC]"
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {isActive && (
                        <View className="rounded-md bg-[#C8FF67]/15 px-1.5 py-1">
                          <Text className="text-[8px] font-black tracking-wider text-[#C8FF67]">
                            DEFAULT
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      className="mt-1.5 text-[11px] leading-[16px] text-[#9AA38F]"
                      numberOfLines={2}
                    >
                      {item.address}
                    </Text>
                  </View>
                  <Feather
                    name={isActive ? "check-circle" : "circle"}
                    size={20}
                    color={isActive ? C.green : "#606A55"}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        {!!error && (
          <View className="mt-4 flex-row items-start gap-2 rounded-2xl border border-[#633332] bg-[#2A1716] p-3">
            <Feather name="alert-circle" size={16} color={C.red} />
            <Text className="flex-1 text-xs leading-[17px] text-[#FFB7B7]">{error}</Text>
            <Pressable onPress={() => void load()} hitSlop={8}>
              <Text className="text-xs font-extrabold text-[#FF7373]">Retry</Text>
            </Pressable>
          </View>
        )}

        <View className="mt-6 flex-row items-start gap-2 rounded-2xl bg-[#11150E] px-3.5 py-3">
          <Feather name="info" size={15} color={C.muted} />
          <Text className="flex-1 text-[10px] leading-[16px] text-[#9AA38F]">
            Your selected place is used to show nearby harvests and determine delivery availability. You can change it any time.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
