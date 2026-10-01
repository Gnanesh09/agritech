import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import { useAuth } from "../../lib/auth-context";
import { apiRequest } from "../../lib/api";

/* =========================================================
   TYPES
========================================================= */

type CapabilityType = "number" | "boolean" | "string";

type DeviceCapability = {
  key: string;
  label?: string;
  type: CapabilityType;
  unit?: string;
  min?: number;
  max?: number;
};

type DeviceCapabilities = {
  sensors?: DeviceCapability[];
  actuators?: DeviceCapability[];
};

type DeviceState = {
  actual?: Record<string, any>;
  desired?: Record<string, any>;
  modes?: Record<string, any>;
  lastReportedAt?: string | null;
};

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: string;
  linkedAt?: string | null;
  lastSeenAt?: string | null;
  firmwareVersion?: string | null;
  name?: string | null;

  deviceModel: {
    id: string;
    name: string;
    code: string;
    imageUrl?: string | null;
    capabilities?: DeviceCapabilities;
  };

  state?: DeviceState | null;
};

/* =========================================================
   HOME
========================================================= */

export default function HomeScreen() {
  const { user, accessToken } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     LOAD DEVICES + STATE
  ======================================================= */

  const loadHome = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    try {
      setError("");

      /*
       * GET /api/user/devices
       */
      const deviceResponse = await apiRequest("/user/devices", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const loadedDevices: Device[] = deviceResponse?.devices ?? [];

      /*
       * GET /api/user/devices/:id/state
       *
       * State is loaded separately because your backend
       * exposes it through the command controller.
       */
      const devicesWithState = await Promise.all(
        loadedDevices.map(async (device) => {
          try {
            const stateResponse = await apiRequest(
              `/user/devices/${device.id}/state`,
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );

            return {
              ...device,
              state: stateResponse?.state ?? null,
            };
          } catch (stateError) {
            console.log(`Failed to load state for ${device.id}:`, stateError);

            return {
              ...device,
              state: null,
            };
          }
        }),
      );

      setDevices(devicesWithState);
    } catch (err: any) {
      console.log("Home loading error:", err);

      setError(err?.message || "Unable to load your devices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = () => {
    setRefreshing(true);
    loadHome();
  };

  /* =======================================================
     DEVICE STATS
  ======================================================= */

  const connectedDevices = useMemo(() => {
    return devices.filter(
      (device) => device.status === "LINKED" || device.status === "ONLINE",
    );
  }, [devices]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#070A08]">
        <ActivityIndicator size="small" color="#C8FF67" />
      </View>
    );
  }

  /* =======================================================
     HOME UI
  ======================================================= */

  return (
    <View className="flex-1 bg-[#070A08]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#C8FF67"
          />
        }
        contentContainerStyle={{
          paddingTop: 58,
          paddingBottom: 130,
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View className="flex-row items-center justify-between px-5">
          <View className="flex-1">
            <Text className="text-[13px] text-[#707B74]">Welcome back</Text>

            <Text
              numberOfLines={1}
              className="mt-1 text-[27px] font-semibold tracking-[-0.8px] text-white"
            >
              {user?.username || "Home"}
            </Text>
          </View>

          {/* Profile button */}
          <Pressable
            onPress={() => router.push("/profile")}
            className="h-[45px] w-[45px] items-center justify-center rounded-full bg-[#C8FF67]"
          >
            <Text className="text-[17px] font-bold text-[#0A0E09]">
              {user?.username?.slice(0, 1).toUpperCase() || "U"}
            </Text>
          </Pressable>
        </View>

        {/* =================================================
            SYSTEM STATUS
        ================================================= */}

        <View className="mx-5 mt-7 flex-row items-center justify-between rounded-[21px] border border-[#273029] bg-[#101610] px-5 py-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-[9px] w-[9px] rounded-full bg-[#63F394]" />

            <View>
              <Text className="text-[14px] font-medium text-[#E6ECE7]">
                Everything looks good
              </Text>

              <Text className="mt-1 text-[11px] text-[#69756D]">
                {connectedDevices.length} of {devices.length} devices connected
              </Text>
            </View>
          </View>

          <View className="rounded-full bg-[#17231A] px-3 py-1.5">
            <Text className="text-[11px] font-semibold text-[#A4FFBA]">
              {connectedDevices.length}/{devices.length}
            </Text>
          </View>
        </View>

        {/* =================================================
            ERROR
        ================================================= */}

        {error ? (
          <View className="mx-5 mt-4 rounded-[16px] border border-[#422727] bg-[#1A1010] px-4 py-3">
            <Text className="text-[12px] leading-5 text-[#FF8181]">
              {error}
            </Text>
          </View>
        ) : null}

        {/* =================================================
            SECTION HEADER
        ================================================= */}

        <View className="mt-8 flex-row items-center justify-between px-5">
          <Text className="text-[12px] font-semibold uppercase tracking-[1px] text-[#657169]">
            Your devices
          </Text>

          <Text className="text-[11px] text-[#566159]">
            {devices.length} {devices.length === 1 ? "device" : "devices"}
          </Text>
        </View>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {devices.length === 0 ? (
          <EmptyDevices />
        ) : (
          <View className="mt-3">
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                device={device}
                accessToken={accessToken}
                onRefresh={loadHome}
              />
            ))}
          </View>
        )}

        {/* =================================================
            ADD DEVICE
        ================================================= */}

        <Pressable
          onPress={() => {}}
          className="mx-5 mt-4 flex-row items-center rounded-[21px] border border-[#273029] bg-[#0E1410] px-5 py-5"
        >
          <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-[#C8FF67]">
            <Ionicons name="add" size={24} color="#0A0E09" />
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-[14px] font-semibold text-[#E7ECE8]">
              Add a device
            </Text>

            <Text className="mt-1 text-[11px] text-[#68746C]">
              Connect another device to your home
            </Text>
          </View>

          <Text className="text-[23px] text-[#515D55]">›</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/* =========================================================
   DEVICE CARD
========================================================= */

function DeviceCard({
  device,
  accessToken,
  onRefresh,
}: {
  device: Device;
  accessToken: string | null;
  onRefresh: () => void;
}) {
  const capabilities = device.deviceModel?.capabilities;

  const sensors = capabilities?.sensors ?? [];

  const actuators = capabilities?.actuators ?? [];

  const actual = device.state?.actual ?? {};

  const desired = device.state?.desired ?? {};

  const online = device.status === "LINKED" || device.status === "ONLINE";

  /*
   * Only show the first 2 sensors on Home.
   * The detailed device page can show all of them.
   */
  const visibleSensors = sensors.slice(0, 2);

  return (
    <View className="mx-5 mb-4 overflow-hidden rounded-[25px] border border-[#29332C] bg-[#101610]">
      {/* ================================================
          DEVICE HEADER
      ================================================= */}

      <View className="px-5 pb-4 pt-5">
        <View className="flex-row items-center">
          {/* Device icon */}
          <View className="h-[47px] w-[47px] items-center justify-center rounded-[15px] bg-[#19231C]">
            <Ionicons name="hardware-chip-outline" size={23} color="#C8FF67" />
          </View>

          {/* Name */}
          <View className="ml-3 flex-1">
            <Text
              numberOfLines={1}
              className="text-[16px] font-semibold text-[#E9EEE9]"
            >
              {device.name || device.deviceModel?.name || "Device"}
            </Text>

            <Text numberOfLines={1} className="mt-1 text-[11px] text-[#69756D]">
              {device.deviceModel?.code || device.deviceCode}
            </Text>
          </View>

          {/* Online status */}
          <View className="flex-row items-center rounded-full bg-[#17231A] px-3 py-1.5">
            <View
              className={`mr-1.5 h-[6px] w-[6px] rounded-full ${
                online ? "bg-[#63F394]" : "bg-[#626A64]"
              }`}
            />

            <Text className="text-[10px] font-medium text-[#9CA69F]">
              {online ? "Online" : "Offline"}
            </Text>
          </View>
        </View>

        {/* ================================================
            SENSORS
        ================================================= */}

        {visibleSensors.length > 0 ? (
          <View className="mt-5 flex-row gap-3">
            {visibleSensors.map((sensor) => {
              const value = actual[sensor.key];

              return (
                <SensorCard key={sensor.key} sensor={sensor} value={value} />
              );
            })}
          </View>
        ) : (
          <View className="mt-5 rounded-[17px] bg-[#171F19] px-4 py-4">
            <Text className="text-[11px] text-[#68746C]">
              No sensor data available
            </Text>
          </View>
        )}

        {/* ================================================
            ACTUATORS
        ================================================= */}

        {actuators.length > 0 ? (
          <View className="mt-4">
            {actuators.slice(0, 3).map((actuator) => (
              <ActuatorRow
                key={actuator.key}
                deviceId={device.id}
                actuator={actuator}
                value={desired[actuator.key] ?? actual[actuator.key]}
                accessToken={accessToken}
                onRefresh={onRefresh}
              />
            ))}
          </View>
        ) : null}

        {/* ================================================
            DEVICE FOOTER
        ================================================= */}

        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-[10px] text-[#58645C]">
            {device.state?.lastReportedAt
              ? `Updated ${formatTime(device.state.lastReportedAt)}`
              : device.lastSeenAt
                ? `Last seen ${formatTime(device.lastSeenAt)}`
                : "No recent activity"}
          </Text>

          <Text className="text-[20px] text-[#4D5951]">›</Text>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   SENSOR CARD
========================================================= */

function SensorCard({
  sensor,
  value,
}: {
  sensor: DeviceCapability;
  value: any;
}) {
  return (
    <View className="flex-1 rounded-[18px] bg-[#171F19] px-4 py-4">
      <Text
        numberOfLines={1}
        className="text-[10px] uppercase tracking-[0.6px] text-[#657169]"
      >
        {sensor.label || prettify(sensor.key)}
      </Text>

      <View className="mt-2 flex-row items-end">
        <Text className="text-[24px] font-semibold tracking-[-0.6px] text-[#F0F4F0]">
          {formatValue(value)}
        </Text>

        {sensor.unit ? (
          <Text className="mb-1 ml-1 text-[11px] text-[#758078]">
            {sensor.unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* =========================================================
   ACTUATOR ROW
========================================================= */

function ActuatorRow({
  deviceId,
  actuator,
  value,
  accessToken,
  onRefresh,
}: {
  deviceId: string;
  actuator: DeviceCapability;
  value: any;
  accessToken: string | null;
  onRefresh: () => void;
}) {
  const [busy, setBusy] = useState(false);

  /*
   * Boolean actuators can be controlled directly
   * from the Home screen.
   */
  if (actuator.type !== "boolean") {
    return (
      <View className="mb-2 flex-row items-center rounded-[17px] bg-[#171F19] px-4 py-3.5">
        <View className="flex-1">
          <Text className="text-[13px] font-medium text-[#DEE5DF]">
            {actuator.label || prettify(actuator.key)}
          </Text>

          <Text className="mt-1 text-[10px] text-[#657169]">
            {formatValue(value)}
            {actuator.unit ? ` ${actuator.unit}` : ""}
          </Text>
        </View>

        <Text className="text-[11px] text-[#59665D]">Control</Text>
      </View>
    );
  }

  const enabled = value === true;

  const toggle = async () => {
    if (busy || !accessToken) {
      return;
    }

    try {
      setBusy(true);

      /*
       * POST /api/user/devices/:id/commands
       */
      await apiRequest(`/user/devices/${deviceId}/commands`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: actuator.key,
          action: "set",
          value: !enabled,
          mode: "MANUAL",
        }),
      });

      /*
       * Backend updates desired state when
       * the command is created.
       */
      onRefresh();
    } catch (error) {
      console.log("Device command error:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="mb-2 flex-row items-center rounded-[17px] bg-[#171F19] px-4 py-3.5">
      <View className="flex-1">
        <Text className="text-[13px] font-medium text-[#DEE5DF]">
          {actuator.label || prettify(actuator.key)}
        </Text>

        <Text className="mt-1 text-[10px] text-[#657169]">Manual control</Text>
      </View>

      {busy ? (
        <ActivityIndicator size="small" color="#C8FF67" />
      ) : (
        <Switch
          value={enabled}
          onValueChange={toggle}
          disabled={busy}
          trackColor={{
            false: "#303831",
            true: "#709E3B",
          }}
          thumbColor={enabled ? "#D8FF9A" : "#858D87"}
          ios_backgroundColor="#303831"
        />
      )}
    </View>
  );
}

/* =========================================================
   EMPTY DEVICES
========================================================= */

function EmptyDevices() {
  return (
    <View className="mx-5 mt-3 items-center rounded-[24px] border border-[#273029] bg-[#0E1410] px-6 py-10">
      <View className="h-[58px] w-[58px] items-center justify-center rounded-[19px] bg-[#18231B]">
        <Ionicons name="hardware-chip-outline" size={27} color="#C8FF67" />
      </View>

      <Text className="mt-4 text-[16px] font-semibold text-[#E8EEE9]">
        No devices yet
      </Text>

      <Text className="mt-2 max-w-[280px] text-center text-[12px] leading-5 text-[#68746C]">
        Connect your first device to start monitoring and controlling it.
      </Text>

      <Pressable
        onPress={() => {}}
        className="mt-5 h-[43px] items-center justify-center rounded-[14px] bg-[#C8FF67] px-5"
      >
        <Text className="text-[12px] font-semibold text-[#0A0E09]">
          Add device
        </Text>
      </Pressable>
    </View>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function prettify(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: any) {
  if (value === undefined || value === null) {
    return "--";
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return String(value);
    }

    return value.toFixed(1);
  }

  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  return String(value);
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
