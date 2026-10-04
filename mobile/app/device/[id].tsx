import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiRequest } from "@/lib/api";

type Capability = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
  unit?: string;
  min?: number;
  max?: number;
};

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
    capabilities: {
      sensors: Capability[];
      actuators: Capability[];
    };
    kind?: string;
    rackRowCount?: number | null;
    traysPerRow?: number;
  };
  state: {
    actual: Record<string, unknown>;
    desired: Record<string, unknown>;
    modes: Record<string, unknown>;
    lastReportedAt: string | null;
  } | null;
  rack?: {
    id: string;
    name: string;
    rowCount: number;
    traysPerRow: number;
    status: string;
    rows?: {
      id: string;
      rowNumber: number;
      name: string;
      fanTarget: string;
      lightTarget: string;
      trays?: {
        id: string;
        slot: number;
        name: string;
        currentCrop?: {
          cropName: string;
          status: "GROWING" | "READY";
          expectedHarvestDate: string;
        } | null;
      }[];
    }[];
  } | null;
};

type Telemetry = {
  id: string;
  data: Record<string, unknown>;
  recordedAt: string;
};

type Automation = {
  id: string;
  name: string;
  status?: string;
  trigger?: {
    field?: string;
  };
};

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;

  const time = new Date(lastSeenAt).getTime();

  return Number.isFinite(time) && Date.now() - time < 2 * 60 * 1000;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) {
    return "--";
  }

  const number = Number(value);

  if (Number.isFinite(number)) {
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  return String(value);
}

function sensorIcon(key: string): keyof typeof Ionicons.glyphMap {
  const value = key.toLowerCase();

  if (value.includes("humidity")) return "water-outline";
  if (value.includes("light")) return "sunny-outline";
  if (value.includes("soil")) return "leaf-outline";

  return "thermometer-outline";
}

function SensorRow({ sensor, value }: { sensor: Capability; value: unknown }) {
  return (
    <View className="flex-row items-center border-b border-white/[0.05] py-4">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#151B15]">
        <Ionicons name={sensorIcon(sensor.key)} size={19} color="#E7EF58" />
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[13px] text-zinc-500">
          {sensor.label || sensor.key}
        </Text>
      </View>

      <Text className="text-[17px] font-semibold text-white">
        {formatValue(value)}
        {sensor.unit ? ` ${sensor.unit}` : ""}
      </Text>
    </View>
  );
}

function ControlRow({
  actuator,
  enabled,
  onToggle,
  loading,
}: {
  actuator: Capability;
  enabled: boolean;
  onToggle: () => void;
  loading: boolean;
}) {
  const isFan = actuator.key.toLowerCase().includes("fan");
  const isLight = actuator.key.toLowerCase().includes("light");

  return (
    <View className="flex-row items-center border-b border-white/[0.05] py-4">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#151B15]">
        {isFan ? (
          <MaterialCommunityIcons name="fan" size={19} color="#E7EF58" />
        ) : (
          <Ionicons
            name={isLight ? "bulb-outline" : "flash-outline"}
            size={19}
            color="#E7EF58"
          />
        )}
      </View>

      <View className="ml-3 flex-1">
        <Text className="text-[14px] font-medium text-white">
          {actuator.label || actuator.key}
        </Text>

        <Text className="mt-0.5 text-[11px] text-zinc-600">
          {enabled ? "On" : "Off"}
        </Text>
      </View>

      <Pressable
        disabled={loading}
        onPress={onToggle}
        className={`h-8 w-14 justify-center rounded-full px-1 ${
          enabled ? "bg-[#E7EF58]" : "bg-[#2B312B]"
        }`}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#000000" />
        ) : (
          <View
            className={`h-6 w-6 rounded-full ${
              enabled ? "ml-auto bg-black" : "bg-[#858B85]"
            }`}
          />
        )}
      </Pressable>
    </View>
  );
}

export default function DeviceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const deviceId = Array.isArray(id) ? id[0] : id;

  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);

  const [loading, setLoading] = useState(true);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadDevice = useCallback(async () => {
    if (!deviceId) return;

    try {
      setLoading(true);
      setError("");

      const [deviceResponse, telemetryResponse, automationResponse] =
        await Promise.all([
          apiRequest(`/user/devices/${deviceId}`),
          apiRequest(`/user/devices/${deviceId}/telemetry`),
          apiRequest(`/user/devices/${deviceId}/automations`),
        ]);

      setDevice(deviceResponse?.device ?? null);

      setTelemetry(
        Array.isArray(telemetryResponse?.telemetry)
          ? telemetryResponse.telemetry
          : [],
      );

      setAutomations(
        Array.isArray(automationResponse?.automations)
          ? automationResponse.automations
          : [],
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load this device.");
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    void loadDevice();
  }, [loadDevice]);

  const latestData = telemetry[0]?.data ?? {};

  const sensors = device?.deviceModel.capabilities?.sensors ?? [];
  const actuators = device?.deviceModel.capabilities?.actuators ?? [];

  const online = isOnline(device?.lastSeenAt ?? null);

  const rack = device?.rack ?? null;

  const occupied = useMemo(() => {
    if (!rack) return 0;

    return (
      rack.rows?.reduce(
        (total, row) =>
          total + (row.trays ?? []).filter((tray) => !!tray.currentCrop).length,
        0,
      ) ?? 0
    );
  }, [rack]);

  const totalTrays = rack ? rack.rowCount * rack.traysPerRow : 0;

  async function toggleActuator(actuator: Capability) {
    if (!device) return;

    const desired = device.state?.desired?.[actuator.key];
    const actual = device.state?.actual?.[actuator.key];

    const enabled =
      typeof desired === "boolean"
        ? desired
        : typeof actual === "boolean"
          ? actual
          : false;

    try {
      setCommandLoading(actuator.key);

      await apiRequest(`/user/devices/${device.id}/commands`, {
        method: "POST",
        body: JSON.stringify({
          target: actuator.key,
          action: "set",
          value: !enabled,
          mode: "MANUAL",
        }),
      });

      await loadDevice();
    } catch (err: any) {
      setError(err?.message || "Unable to control device.");
    } finally {
      setCommandLoading(null);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <StatusBar style="light" />

        <ActivityIndicator size="small" color="#E7EF58" />
      </View>
    );
  }

  if (!device) {
    return (
      <View className="flex-1 bg-black px-5">
        <StatusBar style="light" />

        <Pressable
          onPress={() => router.back()}
          className="mt-5 h-11 w-11 items-center justify-center rounded-full bg-[#151B15]"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>

        <View className="flex-1 items-center justify-center">
          <Text className="text-[20px] font-semibold text-white">
            Device not found
          </Text>

          <Text className="mt-2 text-center text-[14px] text-zinc-500">
            {error || "This device is unavailable."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
        }}
      >
        {/* HEADER */}
        <View
          className="px-5"
          style={{
            paddingTop: insets.top + 8,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-[#151B15]"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* HERO */}
        <View className="mt-5 items-center px-5">
          <View className="h-[250px] w-full items-center justify-center">
            {device.deviceModel.imageUrl ? (
              <Image
                source={{
                  uri: device.deviceModel.imageUrl,
                }}
                resizeMode="contain"
                className="h-full w-full"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-[28px] bg-[#E7EF58]">
                <Ionicons
                  name={rack ? "leaf-outline" : "hardware-chip-outline"}
                  size={40}
                  color="#000000"
                />
              </View>
            )}
          </View>

          <View className="mt-2 w-full">
            <View className="flex-row items-center">
              <Text className="flex-1 text-[30px] font-semibold tracking-[-1.2px] text-white">
                {device.name || device.deviceModel.name}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center">
              <View
                className={`h-2 w-2 rounded-full ${
                  online ? "bg-[#BFFF45]" : "bg-[#F0646B]"
                }`}
              />

              <Text
                className={`ml-2 text-[12px] font-medium ${
                  online ? "text-[#BFFF45]" : "text-[#F0646B]"
                }`}
              >
                {online ? "Online" : "Offline"}
              </Text>

              <Text className="ml-3 text-[12px] text-zinc-600">
                {device.deviceCode}
              </Text>
            </View>

            <Text className="mt-3 text-[14px] text-zinc-500">
              {device.deviceModel.name}
            </Text>
          </View>
        </View>

        {/* HERO STATS */}
        <View className="mt-7 px-5">
          <View className="flex-row overflow-hidden rounded-[22px] bg-[#101610]">
            {sensors.slice(0, 2).map((sensor) => (
              <View
                key={sensor.key}
                className="flex-1 border-r border-white/[0.05] px-4 py-5"
              >
                <Text className="text-[10px] uppercase tracking-[1px] text-zinc-600">
                  {sensor.label || sensor.key}
                </Text>

                <Text className="mt-2 text-[24px] font-semibold tracking-[-0.8px] text-white">
                  {formatValue(latestData[sensor.key])}
                  {sensor.unit ? ` ${sensor.unit}` : ""}
                </Text>
              </View>
            ))}

            {rack ? (
              <View className="flex-1 px-4 py-5">
                <Text className="text-[10px] uppercase tracking-[1px] text-zinc-600">
                  Occupied
                </Text>

                <Text className="mt-2 text-[24px] font-semibold tracking-[-0.8px] text-white">
                  {occupied}/{totalTrays}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* LIVE DATA */}
        {sensors.length > 0 ? (
          <View className="mt-10 px-5">
            <Text className="text-[11px] font-medium uppercase tracking-[1.7px] text-[#E7EF58]">
              Monitoring
            </Text>

            <Text className="mt-1 text-[27px] font-semibold tracking-[-1px] text-white">
              Live now
            </Text>

            <View className="mt-3">
              {sensors.map((sensor) => (
                <SensorRow
                  key={sensor.key}
                  sensor={sensor}
                  value={latestData[sensor.key]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* RACK */}
        {rack ? (
          <View className="mt-10 px-5">
            <Text className="text-[11px] font-medium uppercase tracking-[1.7px] text-[#E7EF58]">
              Growing system
            </Text>

            <Text className="mt-1 text-[27px] font-semibold tracking-[-1px] text-white">
              {rack.rowCount}-layer rack
            </Text>

            <View className="mt-4 flex-row items-center">
              <View className="flex-1">
                <Text className="text-[15px] font-medium text-white">
                  {totalTrays} trays
                </Text>

                <Text className="mt-1 text-[12px] text-zinc-600">
                  {occupied} occupied
                </Text>
              </View>

              <Text className="text-[14px] text-[#E7EF58]">{rack.status}</Text>
            </View>

            <View className="mt-4 overflow-hidden rounded-[20px] bg-[#0E140E]">
              {(rack.rows ?? []).map((row) => (
                <View
                  key={row.id}
                  className="flex-row items-center border-b border-white/[0.05] px-4 py-4"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-[#E7EF58]">
                    <Text className="font-bold text-black">
                      {row.rowNumber}
                    </Text>
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-medium text-white">
                      {row.name || `Layer ${row.rowNumber}`}
                    </Text>

                    <Text className="mt-1 text-[11px] text-zinc-600">
                      {
                        (row.trays ?? []).filter((tray) => !!tray.currentCrop)
                          .length
                      }
                      /{rack.traysPerRow} occupied
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={17} color="#555D56" />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* CONTROLS */}
        {actuators.length > 0 ? (
          <View className="mt-10 px-5">
            <Text className="text-[11px] font-medium uppercase tracking-[1.7px] text-[#E7EF58]">
              Control
            </Text>

            <Text className="mt-1 text-[27px] font-semibold tracking-[-1px] text-white">
              Device
            </Text>

            <View className="mt-3 overflow-hidden rounded-[20px] bg-[#0E140E]">
              {actuators
                .filter((item) => item.type === "boolean")
                .map((actuator) => {
                  const desired = device.state?.desired?.[actuator.key];

                  const actual = device.state?.actual?.[actuator.key];

                  const enabled =
                    typeof desired === "boolean"
                      ? desired
                      : typeof actual === "boolean"
                        ? actual
                        : false;

                  return (
                    <ControlRow
                      key={actuator.key}
                      actuator={actuator}
                      enabled={enabled}
                      loading={commandLoading === actuator.key}
                      onToggle={() => void toggleActuator(actuator)}
                    />
                  );
                })}
            </View>
          </View>
        ) : null}

        {/* AUTOMATIONS */}
        <View className="mt-10 px-5">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-[11px] font-medium uppercase tracking-[1.7px] text-[#E7EF58]">
                Automation
              </Text>

              <Text className="mt-1 text-[27px] font-semibold tracking-[-1px] text-white">
                Smart rules
              </Text>
            </View>
          </View>

          <View className="mt-3 overflow-hidden rounded-[20px] bg-[#0E140E]">
            {automations.length === 0 ? (
              <View className="px-4 py-5">
                <Text className="text-[14px] text-zinc-500">
                  No automations yet.
                </Text>
              </View>
            ) : (
              automations.map((automation) => (
                <View
                  key={automation.id}
                  className="flex-row items-center border-b border-white/[0.05] px-4 py-4"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#151B15]">
                    <Ionicons
                      name="sparkles-outline"
                      size={19}
                      color="#E7EF58"
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-medium text-white">
                      {automation.name}
                    </Text>

                    <Text className="mt-1 text-[11px] text-zinc-600">
                      {automation.trigger?.field || "Sensor rule"}
                    </Text>
                  </View>

                  <Text
                    className={`text-[11px] font-medium ${
                      automation.status === "PAUSED"
                        ? "text-zinc-600"
                        : "text-[#BFFF45]"
                    }`}
                  >
                    {automation.status || "ACTIVE"}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* DEVICE INFO */}
        <View className="mt-10 px-5">
          <Text className="text-[11px] font-medium uppercase tracking-[1.7px] text-[#E7EF58]">
            Device
          </Text>

          <Text className="mt-1 text-[27px] font-semibold tracking-[-1px] text-white">
            Information
          </Text>

          <View className="mt-3 overflow-hidden rounded-[20px] bg-[#0E140E]">
            <InfoRow label="Device code" value={device.deviceCode} />

            <InfoRow label="Serial number" value={device.serialNumber} />

            <InfoRow label="Firmware" value={device.firmwareVersion || "--"} />

            <InfoRow
              label="Connected"
              value={
                device.linkedAt
                  ? new Date(device.linkedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "--"
              }
              last
            />
          </View>
        </View>

        {error ? (
          <Text className="mx-5 mt-5 text-[12px] text-red-400">{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-4 ${
        last ? "" : "border-b border-white/[0.05]"
      }`}
    >
      <Text className="text-[13px] text-zinc-500">{label}</Text>

      <Text
        numberOfLines={1}
        className="ml-5 max-w-[55%] text-right text-[13px] font-medium text-white"
      >
        {value}
      </Text>
    </View>
  );
}
