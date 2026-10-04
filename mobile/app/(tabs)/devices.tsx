import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiRequest } from "@/lib/api";

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: string;
  linkedAt: string | null;
  lastSeenAt: string | null;
  firmwareVersion: string | null;
  name: string | null;
  deviceModel: {
    id: string;
    name: string;
    code: string;
    imageUrl: string | null;
    capabilities?: {
      sensors?: unknown[];
      actuators?: unknown[];
    };
    kind?: string;
    rackRowCount?: number | null;
    traysPerRow?: number;
  };
};

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;

  const time = new Date(lastSeenAt).getTime();

  return Number.isFinite(time) && Date.now() - time < 2 * 60 * 1000;
}

function getDeviceTitle(device: Device) {
  return device.name || device.deviceModel.name;
}

function getDeviceSubtitle(device: Device) {
  if (device.deviceModel.kind === "RACK") {
    const rows = device.deviceModel.rackRowCount ?? 0;
    const trays = device.deviceModel.traysPerRow ?? 4;

    return `${rows}-layer growing system · ${rows * trays} trays`;
  }

  return device.deviceModel.name;
}

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const [deviceCode, setDeviceCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/user/devices");

      setDevices(Array.isArray(response?.devices) ? response.devices : []);
    } catch (err: any) {
      setError(err?.message || "Unable to load devices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const hasInput = useMemo(
    () => !!deviceCode.trim() || !!serialNumber.trim(),
    [deviceCode, serialNumber],
  );

  function openAddSheet() {
    setError("");
    setDeviceCode("");
    setSerialNumber("");
    setSheetOpen(true);
  }

  function requestCloseSheet() {
    if (adding) return;

    if (hasInput) {
      setConfirmCloseOpen(true);
      return;
    }

    setSheetOpen(false);
  }

  function closeWithoutSaving() {
    setConfirmCloseOpen(false);
    setSheetOpen(false);
    setDeviceCode("");
    setSerialNumber("");
    setError("");
  }

  async function addDevice() {
    const code = deviceCode.trim();
    const serial = serialNumber.trim();

    if (!code && !serial) {
      setError("Enter a device code or serial number.");
      return;
    }

    try {
      setAdding(true);
      setError("");

      const response = await apiRequest("/user/devices/claim", {
        method: "POST",
        body: JSON.stringify({
          ...(code ? { deviceCode: code } : {}),
          ...(serial ? { serialNumber: serial } : {}),
        }),
      });

      const id = response?.device?.id;

      setSheetOpen(false);
      setDeviceCode("");
      setSerialNumber("");

      await loadDevices();

      if (id) {
        router.push({
          pathname: "/device/[id]",
          params: { id },
        });
      }
    } catch (err: any) {
      setError(err?.message || "Unable to add this device.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <View className="px-5">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-[12px] font-medium uppercase tracking-[1.8px] text-[#E7EF58]">
                Devices
              </Text>

              <Text className="mt-1 text-[32px] font-semibold tracking-[-1.2px] text-white">
                Your devices
              </Text>
            </View>

            <Pressable
              onPress={openAddSheet}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#E7EF58] active:opacity-80"
            >
              <Ionicons name="add" size={24} color="#000000" />
            </Pressable>
          </View>

          {loading ? (
            <View className="items-center py-20">
              <ActivityIndicator size="small" color="#E7EF58" />
            </View>
          ) : devices.length === 0 ? (
            <View className="items-center px-8 py-24">
              <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-[#151B15]">
                <Ionicons
                  name="hardware-chip-outline"
                  size={28}
                  color="#E7EF58"
                />
              </View>

              <Text className="mt-5 text-center text-[22px] font-semibold tracking-[-0.6px] text-white">
                No devices yet
              </Text>

              <Text className="mt-2 text-center text-[14px] leading-5 text-zinc-500">
                Connect your first growing device to get started.
              </Text>

              <Pressable
                onPress={openAddSheet}
                className="mt-7 h-12 rounded-full bg-[#E7EF58] px-7 items-center justify-center"
              >
                <Text className="text-[14px] font-semibold text-black">
                  Add a device
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-7">
              {devices.map((device) => {
                const online = isOnline(device.lastSeenAt);

                return (
                  <Pressable
                    key={device.id}
                    onPress={() =>
                      router.push({
                        pathname: "/device/[id]",
                        params: { id: device.id },
                      })
                    }
                    className="mb-3 overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#0E140E] active:opacity-80"
                  >
                    <View className="flex-row items-center p-4">
                      <View className="h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[20px] bg-[#171D17]">
                        {device.deviceModel.imageUrl ? (
                          <Image
                            source={{
                              uri: device.deviceModel.imageUrl,
                            }}
                            resizeMode="contain"
                            className="h-[70px] w-[70px]"
                          />
                        ) : (
                          <Ionicons
                            name={
                              device.deviceModel.kind === "RACK"
                                ? "leaf-outline"
                                : "hardware-chip-outline"
                            }
                            size={30}
                            color="#E7EF58"
                          />
                        )}
                      </View>

                      <View className="ml-4 flex-1">
                        <View className="flex-row items-center">
                          <Text
                            numberOfLines={1}
                            className="flex-1 text-[18px] font-semibold tracking-[-0.4px] text-white"
                          >
                            {getDeviceTitle(device)}
                          </Text>

                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#555D56"
                          />
                        </View>

                        <Text className="mt-1 text-[12px] text-zinc-500">
                          {getDeviceSubtitle(device)}
                        </Text>

                        <View className="mt-3 flex-row items-center">
                          <View
                            className={`h-2 w-2 rounded-full ${
                              online ? "bg-[#BFFF45]" : "bg-[#F0646B]"
                            }`}
                          />

                          <Text
                            className={`ml-2 text-[11px] font-medium ${
                              online ? "text-[#BFFF45]" : "text-[#F0646B]"
                            }`}
                          >
                            {online ? "Online" : "Offline"}
                          </Text>

                          <Text className="ml-3 text-[11px] text-zinc-600">
                            {device.deviceCode}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {error && !sheetOpen ? (
            <Text className="mt-3 text-center text-[12px] text-red-400">
              {error}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* ADD DEVICE SHEET */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={requestCloseSheet}
      >
        <View className="flex-1 justify-end bg-black/70">
          <Pressable className="flex-1" onPress={requestCloseSheet} />

          <View
            className="rounded-t-[32px] bg-[#0B0F0B] px-5 pt-4"
            style={{
              paddingBottom: Math.max(insets.bottom + 18, 28),
            }}
          >
            <View className="mx-auto h-1.5 w-10 rounded-full bg-zinc-700" />

            <View className="mt-5 flex-row items-center justify-between">
              <View>
                <Text className="text-[28px] font-semibold tracking-[-1px] text-white">
                  Add a device
                </Text>

                <Text className="mt-1 text-[13px] text-zinc-500">
                  Connect a device to your account
                </Text>
              </View>

              <Pressable
                onPress={requestCloseSheet}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#171D17]"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text className="mb-2 mt-7 text-[13px] font-medium text-zinc-400">
              Device code
            </Text>

            <TextInput
              value={deviceCode}
              onChangeText={setDeviceCode}
              placeholder="e.g. AGRIRACK-1"
              placeholderTextColor="#555D56"
              autoCapitalize="characters"
              editable={!adding}
              className="h-14 rounded-2xl border border-white/[0.06] bg-[#151A15] px-4 text-[16px] text-white"
            />

            <View className="my-5 flex-row items-center">
              <View className="h-px flex-1 bg-white/[0.06]" />

              <Text className="mx-4 text-[11px] uppercase tracking-[1.5px] text-zinc-600">
                or
              </Text>

              <View className="h-px flex-1 bg-white/[0.06]" />
            </View>

            <Text className="mb-2 text-[13px] font-medium text-zinc-400">
              Serial number
            </Text>

            <TextInput
              value={serialNumber}
              onChangeText={setSerialNumber}
              placeholder="Enter serial number"
              placeholderTextColor="#555D56"
              autoCapitalize="characters"
              editable={!adding}
              className="h-14 rounded-2xl border border-white/[0.06] bg-[#151A15] px-4 text-[16px] text-white"
            />

            {error ? (
              <Text className="mt-3 text-[12px] text-red-400">{error}</Text>
            ) : null}

            <Pressable
              onPress={() => void addDevice()}
              disabled={adding}
              className="mt-6 h-14 items-center justify-center rounded-2xl bg-[#E7EF58] active:opacity-80"
            >
              {adding ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text className="text-[16px] font-semibold text-black">
                  Add device
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* CONFIRM CLOSE */}
      <Modal
        visible={confirmCloseOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCloseOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/75 px-7">
          <View className="w-full rounded-[28px] bg-[#111611] p-6">
            <Text className="text-[24px] font-semibold tracking-[-0.7px] text-white">
              Cancel adding device?
            </Text>

            <Text className="mt-2 text-[14px] leading-5 text-zinc-500">
              The information you entered will be discarded.
            </Text>

            <View className="mt-7 flex-row gap-3">
              <Pressable
                onPress={() => setConfirmCloseOpen(false)}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#1B211B]"
              >
                <Text className="text-[14px] font-semibold text-white">
                  Keep editing
                </Text>
              </Pressable>

              <Pressable
                onPress={closeWithoutSaving}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#E7EF58]"
              >
                <Text className="text-[14px] font-semibold text-black">
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
