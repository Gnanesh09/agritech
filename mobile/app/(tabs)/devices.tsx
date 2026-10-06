import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Pressable,
  RefreshControl,
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

/* ============================================================================
   TYPES
============================================================================ */

type DeviceModel = {
  id: string;
  name: string;
  code: string;
  imageUrl: string | null;
  kind?: string;
  rackRowCount?: number | null;
  traysPerRow?: number;
};

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: string;
  linkedAt: string | null;
  lastSeenAt?: string | null;
  firmwareVersion?: string | null;
  name: string | null;
  deviceModel: DeviceModel;
};

type AddStep =
  "enter" | "checking" | "found" | "naming" | "linking" | "success";

/* ============================================================================
   HELPERS
============================================================================ */

function getDeviceDescription(device: Device) {
  if (device.deviceModel.kind === "RACK") {
    const rows = device.deviceModel.rackRowCount ?? 0;
    const trays = device.deviceModel.traysPerRow ?? 4;

    return `${rows}-layer growing system · ${rows * trays} trays`;
  }

  return "Smart growing device";
}

function getDeviceIcon(device: Device) {
  return device.deviceModel.kind === "RACK"
    ? "leaf-outline"
    : "hardware-chip-outline";
}

function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;

  const timestamp = new Date(lastSeenAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < 2 * 60 * 1000;
}

/* ============================================================================
   DEVICE CARD
============================================================================ */

function DeviceCard({
  device,
  onPress,
}: {
  device: Device;
  onPress: () => void;
}) {
  const online = isOnline(device.lastSeenAt);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-[24px] border border-white/[0.06] bg-[#0E140E] active:opacity-80"
    >
      <View className="flex-row items-center p-4">
        <View className="h-[78px] w-[78px] items-center justify-center overflow-hidden rounded-[20px] bg-[#171D17]">
          {device.deviceModel.imageUrl ? (
            <Image
              source={{
                uri: device.deviceModel.imageUrl,
              }}
              resizeMode="contain"
              className="h-[72px] w-[72px]"
            />
          ) : (
            <Ionicons name={getDeviceIcon(device)} size={31} color="#E7EF58" />
          )}
        </View>

        <View className="ml-4 flex-1">
          <View className="flex-row items-center">
            <Text
              numberOfLines={1}
              className="flex-1 text-[18px] font-semibold tracking-[-0.4px] text-white"
            >
              {device.name || device.deviceModel.name}
            </Text>

            <Ionicons name="chevron-forward" size={18} color="#555D56" />
          </View>

          <Text numberOfLines={1} className="mt-1 text-[12px] text-zinc-500">
            {getDeviceDescription(device)}
          </Text>

          <View className="mt-3 flex-row items-center">
            <View
              className={`h-2 w-2 rounded-full ${
                online ? "bg-emerald-400" : "bg-red-400"
              }`}
            />

            <Text
              className={`ml-2 text-[11px] font-medium ${
                online ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {online ? "Online" : "Offline"}
            </Text>

            <Text
              numberOfLines={1}
              className="ml-3 flex-1 text-[11px] text-zinc-600"
            >
              {device.deviceCode}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/* ============================================================================
   MAIN
============================================================================ */

export default function DevicesScreen() {
  const insets = useSafeAreaInsets();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* --------------------------------------------------------------------------
     ADD DEVICE
  -------------------------------------------------------------------------- */

  const [addOpen, setAddOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const [step, setStep] = useState<AddStep>("enter");

  const [deviceCode, setDeviceCode] = useState("");
  const [foundDevice, setFoundDevice] = useState<Device | null>(null);
  const [deviceName, setDeviceName] = useState("");

  const [addError, setAddError] = useState("");

  /* --------------------------------------------------------------------------
     ANIMATION
  -------------------------------------------------------------------------- */

  const foundScale = useRef(new Animated.Value(0.92)).current;
  const foundOpacity = useRef(new Animated.Value(0)).current;

  const successScale = useRef(new Animated.Value(0.72)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  /* --------------------------------------------------------------------------
     LOAD DEVICES
  -------------------------------------------------------------------------- */

  const loadDevices = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const response = await apiRequest("/user/devices");

      setDevices(Array.isArray(response?.devices) ? response.devices : []);
    } catch (error) {
      console.error("[DEVICES]", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices(true);
  }, [loadDevices]);

  /* --------------------------------------------------------------------------
     REFRESH
  -------------------------------------------------------------------------- */

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadDevices(false);
  }, [loadDevices]);

  /* --------------------------------------------------------------------------
     DERIVED
  -------------------------------------------------------------------------- */

  const hasEnteredSomething = useMemo(
    () => deviceCode.trim().length > 0 || deviceName.trim().length > 0,
    [deviceCode, deviceName],
  );

  /* --------------------------------------------------------------------------
     OPEN ADD SHEET
  -------------------------------------------------------------------------- */

  function openAddDevice() {
    setStep("enter");
    setDeviceCode("");
    setFoundDevice(null);
    setDeviceName("");
    setAddError("");
    setConfirmCloseOpen(false);

    setAddOpen(true);
  }

  /* --------------------------------------------------------------------------
     RESET
  -------------------------------------------------------------------------- */

  function resetAddFlow() {
    setStep("enter");
    setDeviceCode("");
    setFoundDevice(null);
    setDeviceName("");
    setAddError("");
    setConfirmCloseOpen(false);
  }

  /* --------------------------------------------------------------------------
     CLOSE
  -------------------------------------------------------------------------- */

  function requestCloseAdd() {
    if (step === "checking" || step === "linking") {
      return;
    }

    if (hasEnteredSomething || foundDevice) {
      setConfirmCloseOpen(true);
      return;
    }

    setAddOpen(false);
    resetAddFlow();
  }

  function discardAndClose() {
    setConfirmCloseOpen(false);
    setAddOpen(false);
    resetAddFlow();
  }

  /* --------------------------------------------------------------------------
     CHECK DEVICE
  -------------------------------------------------------------------------- */

  async function checkDevice() {
    const code = deviceCode.trim().toUpperCase();

    if (!code) {
      setAddError("Enter the device ID.");
      return;
    }

    try {
      setAddError("");
      setStep("checking");

      const response = await apiRequest("/user/devices/check", {
        method: "POST",
        body: JSON.stringify({
          deviceCode: code,
        }),
      });

      const device = response?.device as Device | undefined;

      if (!device?.id) {
        throw new Error("Device information was not returned.");
      }

      setFoundDevice(device);

      foundScale.setValue(0.92);
      foundOpacity.setValue(0);

      Animated.parallel([
        Animated.spring(foundScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 14,
          stiffness: 160,
        }),
        Animated.timing(foundOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();

      setStep("found");
    } catch (error: any) {
      //   console.error("[DEVICE CHECK]", error);

      setAddError(
        error?.message || "We couldn't find an available device with that ID.",
      );

      setStep("enter");
    }
  }

  /* --------------------------------------------------------------------------
     GO TO NAME
  -------------------------------------------------------------------------- */

  function continueToNaming() {
    if (!foundDevice) {
      return;
    }

    setDeviceName(foundDevice.deviceModel.name || "");

    setAddError("");
    setStep("naming");
  }

  /* --------------------------------------------------------------------------
     LINK DEVICE
  -------------------------------------------------------------------------- */

  async function linkDevice() {
    if (!foundDevice) {
      return;
    }

    const cleanName = deviceName.trim();

    if (!cleanName) {
      setAddError("Give your device a name.");
      return;
    }

    if (cleanName.length > 50) {
      setAddError("Device name cannot exceed 50 characters.");
      return;
    }

    try {
      setAddError("");
      setStep("linking");

      /*
       * This is the authoritative claim.
       * The backend checks AVAILABLE again.
       */

      const response = await apiRequest("/user/devices/claim", {
        method: "POST",
        body: JSON.stringify({
          deviceCode: foundDevice.deviceCode,
        }),
      });

      const linkedDevice = response?.device;

      if (!linkedDevice?.id) {
        throw new Error("The device was linked, but its ID was not returned.");
      }

      /*
       * Save user's private device name.
       */

      await apiRequest(`/user/devices/${linkedDevice.id}/name`, {
        method: "PATCH",
        body: JSON.stringify({
          name: cleanName,
        }),
      });

      setDeviceName(cleanName);

      await loadDevices(false);

      successScale.setValue(0.72);
      successOpacity.setValue(0);

      setStep("success");

      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 11,
          stiffness: 180,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        setAddOpen(false);

        resetAddFlow();

        router.push({
          pathname: "/device/[id]",
          params: {
            id: linkedDevice.id,
          },
        });
      }, 1200);
    } catch (error: any) {
      console.error("[DEVICE LINK]", error);

      setAddError(error?.message || "We couldn't link this device.");

      setStep("naming");
    }
  }

  /* --------------------------------------------------------------------------
     LOADING
  -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <View className="flex-1 bg-black">
        <StatusBar style="light" />

        <View
          className="flex-1 items-center justify-center"
          style={{
            paddingTop: insets.top,
          }}
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary">
            <ActivityIndicator size="small" color="#000000" />
          </View>

          <Text className="mt-4 text-[14px] text-zinc-600">
            Loading devices
          </Text>
        </View>
      </View>
    );
  }

  /* --------------------------------------------------------------------------
     MAIN
  -------------------------------------------------------------------------- */

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#E7EF58"
            colors={["#E7EF58"]}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <View className="px-5">
          {/* HEADER */}

          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-[12px] font-medium uppercase tracking-[1.8px] text-primary">
                Devices
              </Text>

              <Text className="mt-1 text-[32px] font-semibold tracking-[-1.3px] text-white">
                Your devices
              </Text>

              <Text className="mt-1 text-[13px] text-zinc-600">
                {devices.length} {devices.length === 1 ? "device" : "devices"}{" "}
                connected
              </Text>
            </View>

            <Pressable
              onPress={openAddDevice}
              className="h-11 w-11 items-center justify-center rounded-full bg-primary active:opacity-80"
            >
              <Ionicons name="add" size={24} color="#000000" />
            </Pressable>
          </View>

          {/* DEVICE LIST */}

          {devices.length > 0 ? (
            <View className="mt-7">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onPress={() =>
                    router.push({
                      pathname: "/device/[id]",
                      params: {
                        id: device.id,
                      },
                    })
                  }
                />
              ))}
            </View>
          ) : (
            <View className="items-center px-8 py-24">
              <View className="h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-[#151B15]">
                <Ionicons
                  name="hardware-chip-outline"
                  size={31}
                  color="#E7EF58"
                />
              </View>

              <Text className="mt-5 text-center text-[23px] font-semibold tracking-[-0.7px] text-white">
                No devices yet
              </Text>

              <Text className="mt-2 text-center text-[14px] leading-5 text-zinc-500">
                Connect your first growing device to start managing it.
              </Text>

              <Pressable
                onPress={openAddDevice}
                className="mt-7 h-12 items-center justify-center rounded-full bg-primary px-7 active:opacity-80"
              >
                <Text className="text-[14px] font-semibold text-black">
                  Add a device
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ======================================================================
          ADD DEVICE SHEET
      ====================================================================== */}

      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={requestCloseAdd}
      >
        <View className="flex-1 justify-end bg-black/75">
          <Pressable className="flex-1" onPress={requestCloseAdd} />

          <View
            className="rounded-t-[32px] bg-[#0A0E0A] px-5 pt-4"
            style={{
              paddingBottom: Math.max(insets.bottom + 18, 28),
            }}
          >
            {/* HANDLE */}

            <View className="mx-auto h-1.5 w-10 rounded-full bg-zinc-700" />

            {/* ==================================================================
                ENTER
            ================================================================== */}

            {step === "enter" ? (
              <View>
                <View className="mt-5 flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-[28px] font-semibold tracking-[-1px] text-white">
                      Add a device
                    </Text>

                    <Text className="mt-1 text-[13px] leading-5 text-zinc-500">
                      Enter the ID printed on your device to check availability.
                    </Text>
                  </View>

                  <Pressable
                    onPress={requestCloseAdd}
                    className="h-10 w-10 items-center justify-center rounded-full bg-[#171D17]"
                  >
                    <Ionicons name="close" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>

                <Text className="mb-2 mt-8 text-[13px] font-medium text-zinc-400">
                  Device ID
                </Text>

                <TextInput
                  value={deviceCode}
                  onChangeText={(value) => setDeviceCode(value.toUpperCase())}
                  placeholder="AGRIRACK-001"
                  placeholderTextColor="#555D56"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable
                  returnKeyType="done"
                  onSubmitEditing={() => void checkDevice()}
                  className="h-14 rounded-2xl border border-white/[0.06] bg-[#151A15] px-4 text-[16px] font-medium tracking-[0.3px] text-white"
                />

                {addError ? (
                  <View className="mt-3 flex-row items-start">
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color="#F87171"
                    />

                    <Text className="ml-2 flex-1 text-[12px] leading-5 text-red-400">
                      {addError}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={() => void checkDevice()}
                  className="mt-6 h-14 items-center justify-center rounded-2xl bg-primary active:opacity-80"
                >
                  <Text className="text-[16px] font-semibold text-black">
                    Check device
                  </Text>
                </Pressable>

                <Text className="mt-4 text-center text-[11px] leading-4 text-zinc-700">
                  Your device ID is usually printed on the device label.
                </Text>
              </View>
            ) : null}

            {/* ==================================================================
                CHECKING
            ================================================================== */}

            {step === "checking" ? (
              <View className="items-center pb-3 pt-14">
                <View className="h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-primary">
                  <ActivityIndicator size="small" color="#000000" />
                </View>

                <Text className="mt-7 text-[25px] font-semibold tracking-[-0.8px] text-white">
                  Checking device
                </Text>

                <Text className="mt-2 text-center text-[14px] leading-5 text-zinc-500">
                  We're checking whether this device is available.
                </Text>

                <Text className="mt-5 text-[12px] font-medium tracking-[1px] text-primary">
                  {deviceCode}
                </Text>

                <Pressable onPress={requestCloseAdd} className="mt-8 px-5 py-3">
                  <Text className="text-[14px] text-zinc-600">Cancel</Text>
                </Pressable>
              </View>
            ) : null}

            {/* ==================================================================
                FOUND
            ================================================================== */}

            {step === "found" && foundDevice ? (
              <Animated.View
                style={{
                  opacity: foundOpacity,
                  transform: [
                    {
                      scale: foundScale,
                    },
                  ],
                }}
              >
                <View className="mt-5 flex-row items-center justify-between">
                  <View>
                    <Text className="text-[28px] font-semibold tracking-[-1px] text-white">
                      Device found
                    </Text>

                    <Text className="mt-1 text-[13px] text-zinc-500">
                      This device is ready to be connected.
                    </Text>
                  </View>

                  <Pressable
                    onPress={requestCloseAdd}
                    className="h-10 w-10 items-center justify-center rounded-full bg-[#171D17]"
                  >
                    <Ionicons name="close" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* DEVICE PREVIEW */}

                <View className="mt-7 overflow-hidden rounded-[26px] border border-white/[0.06] bg-[#111711]">
                  <View className="h-[200px] items-center justify-center bg-[#171D17]">
                    {foundDevice.deviceModel.imageUrl ? (
                      <Image
                        source={{
                          uri: foundDevice.deviceModel.imageUrl,
                        }}
                        resizeMode="contain"
                        className="h-[180px] w-[90%]"
                      />
                    ) : (
                      <Ionicons
                        name={getDeviceIcon(foundDevice)}
                        size={60}
                        color="#E7EF58"
                      />
                    )}
                  </View>

                  <View className="px-5 py-5">
                    <View className="flex-row items-center">
                      <Text className="flex-1 text-[23px] font-semibold tracking-[-0.7px] text-white">
                        {foundDevice.deviceModel.name}
                      </Text>

                      <View className="flex-row items-center rounded-full bg-emerald-500/10 px-3 py-2">
                        <View className="h-2 w-2 rounded-full bg-emerald-400" />

                        <Text className="ml-2 text-[10px] font-medium text-emerald-400">
                          Available
                        </Text>
                      </View>
                    </View>

                    <Text className="mt-1 text-[12px] text-zinc-600">
                      {foundDevice.deviceCode}
                    </Text>

                    <Text className="mt-4 text-[13px] text-zinc-500">
                      {getDeviceDescription(foundDevice)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={continueToNaming}
                  className="mt-6 h-14 items-center justify-center rounded-2xl bg-primary active:opacity-80"
                >
                  <Text className="text-[16px] font-semibold text-black">
                    Continue
                  </Text>
                </Pressable>
              </Animated.View>
            ) : null}

            {/* ==================================================================
                NAMING
            ================================================================== */}

            {step === "naming" && foundDevice ? (
              <View>
                <View className="mt-5 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-[28px] font-semibold tracking-[-1px] text-white">
                      Name your device
                    </Text>

                    <Text className="mt-1 text-[13px] leading-5 text-zinc-500">
                      Give it a name you'll recognize easily.
                    </Text>
                  </View>

                  <Pressable
                    onPress={requestCloseAdd}
                    className="h-10 w-10 items-center justify-center rounded-full bg-[#171D17]"
                  >
                    <Ionicons name="close" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>

                {/* SMALL DEVICE SUMMARY */}

                <View className="mt-7 flex-row items-center rounded-[22px] bg-[#111711] px-4 py-4">
                  <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-[17px] bg-[#171D17]">
                    {foundDevice.deviceModel.imageUrl ? (
                      <Image
                        source={{
                          uri: foundDevice.deviceModel.imageUrl,
                        }}
                        resizeMode="contain"
                        className="h-14 w-14"
                      />
                    ) : (
                      <Ionicons
                        name={getDeviceIcon(foundDevice)}
                        size={27}
                        color="#E7EF58"
                      />
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[16px] font-semibold text-white"
                    >
                      {foundDevice.deviceModel.name}
                    </Text>

                    <Text className="mt-1 text-[11px] text-zinc-600">
                      {foundDevice.deviceCode}
                    </Text>
                  </View>
                </View>

                <Text className="mb-2 mt-7 text-[13px] font-medium text-zinc-400">
                  Your device name
                </Text>

                <TextInput
                  value={deviceName}
                  onChangeText={setDeviceName}
                  placeholder="My Grow Rack"
                  placeholderTextColor="#555D56"
                  maxLength={50}
                  autoFocus
                  className="h-14 rounded-2xl border border-white/[0.06] bg-[#151A15] px-4 text-[16px] text-white"
                />

                <View className="mt-2 flex-row justify-between">
                  <Text className="text-[11px] text-zinc-700">
                    This name is only visible to you.
                  </Text>

                  <Text className="text-[11px] text-zinc-700">
                    {deviceName.length}/50
                  </Text>
                </View>

                {addError ? (
                  <Text className="mt-3 text-[12px] text-red-400">
                    {addError}
                  </Text>
                ) : null}

                <Pressable
                  onPress={() => void linkDevice()}
                  disabled={!deviceName.trim()}
                  className={`mt-6 h-14 items-center justify-center rounded-2xl ${
                    deviceName.trim()
                      ? "bg-primary active:opacity-80"
                      : "bg-[#202620]"
                  }`}
                >
                  <Text
                    className={`text-[16px] font-semibold ${
                      deviceName.trim() ? "text-black" : "text-zinc-600"
                    }`}
                  >
                    Add device
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* ==================================================================
                LINKING
            ================================================================== */}

            {step === "linking" ? (
              <View className="items-center pb-4 pt-14">
                <View className="h-[76px] w-[76px] items-center justify-center rounded-[24px] bg-primary">
                  <ActivityIndicator size="small" color="#000000" />
                </View>

                <Text className="mt-7 text-[25px] font-semibold tracking-[-0.8px] text-white">
                  Adding your device
                </Text>

                <Text className="mt-2 text-center text-[14px] leading-5 text-zinc-500">
                  Connecting {deviceName}
                  {"\n"}to your account.
                </Text>
              </View>
            ) : null}

            {/* ==================================================================
                SUCCESS
            ================================================================== */}

            {step === "success" && foundDevice ? (
              <Animated.View
                style={{
                  opacity: successOpacity,
                  transform: [
                    {
                      scale: successScale,
                    },
                  ],
                }}
                className="items-center pb-4 pt-10"
              >
                {/* GREEN SUCCESS ICON */}

                <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-emerald-500/10">
                  <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-emerald-500">
                    <Ionicons name="checkmark" size={38} color="#FFFFFF" />
                  </View>
                </View>

                <Text className="mt-7 text-center text-[29px] font-semibold tracking-[-1px] text-white">
                  Device added
                </Text>

                <Text className="mt-2 text-center text-[14px] leading-5 text-zinc-500">
                  {deviceName} is ready to use.
                </Text>

                <View className="mt-7 w-full flex-row items-center rounded-[22px] bg-[#111711] px-4 py-4">
                  <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-[17px] bg-[#171D17]">
                    {foundDevice.deviceModel.imageUrl ? (
                      <Image
                        source={{
                          uri: foundDevice.deviceModel.imageUrl,
                        }}
                        resizeMode="contain"
                        className="h-14 w-14"
                      />
                    ) : (
                      <Ionicons
                        name={getDeviceIcon(foundDevice)}
                        size={28}
                        color="#E7EF58"
                      />
                    )}
                  </View>

                  <View className="ml-3 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[16px] font-semibold text-white"
                    >
                      {deviceName}
                    </Text>

                    <Text className="mt-1 text-[11px] text-zinc-600">
                      {foundDevice.deviceCode}
                    </Text>
                  </View>

                  <View className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10">
                    <Ionicons name="checkmark" size={15} color="#34D399" />
                  </View>
                </View>

                <Text className="mt-5 text-[11px] text-zinc-700">
                  Opening your device…
                </Text>
              </Animated.View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ======================================================================
          CLOSE CONFIRMATION
      ====================================================================== */}

      <Modal
        visible={confirmCloseOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmCloseOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/80 px-7">
          <View className="w-full rounded-[28px] bg-[#111611] p-6">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#1B211B]">
              <Ionicons name="close-outline" size={22} color="#FFFFFF" />
            </View>

            <Text className="mt-5 text-[24px] font-semibold tracking-[-0.7px] text-white">
              Cancel adding device?
            </Text>

            <Text className="mt-2 text-[14px] leading-5 text-zinc-500">
              Anything you've entered will be discarded.
            </Text>

            <View className="mt-7 flex-row gap-3">
              <Pressable
                onPress={() => setConfirmCloseOpen(false)}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#1B211B] active:opacity-80"
              >
                <Text className="text-[14px] font-semibold text-white">
                  Keep editing
                </Text>
              </Pressable>

              <Pressable
                onPress={discardAndClose}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-primary active:opacity-80"
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
