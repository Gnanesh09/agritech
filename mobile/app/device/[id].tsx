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
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polyline } from "react-native-svg";

import { apiRequest } from "@/lib/api";

const SAPLING_IMAGE_URL =
  "https://ik.imagekit.io/tut1/06c2c329-119c-4264-a3cf-ad5ad857412a.png?updatedAt=1791036640714";
const EMPTY_TRAY_IMAGE_URL =
  "https://ik.imagekit.io/tut1/cab4ba2b-12cb-42dc-ab61-45aa20feb50a.png?updatedAt=1791036703172";

const LEMON = "#E7EF58";
const LEMON_BRIGHT = "#BFFF45";
const BG = "#000000";
const SURFACE = "#0D130D";
const SURFACE_2 = "#121812";
const BORDER = "rgba(255,255,255,0.06)";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Capability = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
  unit?: string;
  min?: number;
  max?: number;
};

type State = {
  actual: Record<string, unknown>;
  desired: Record<string, unknown>;
  modes: Record<string, unknown>;
  lastReportedAt: string | null;
};

type Crop = {
  id?: string;
  cropName: string;
  sowingDate?: string;
  estimatedGrowthDays?: number;
  expectedHarvestDate: string;
  status: "GROWING" | "READY";
};

type Tray = {
  id: string;
  slot: number;
  name: string;
  currentCrop?: Crop | null;
};

type Row = {
  id: string;
  rowNumber: number;
  name: string;
  fanTarget: string;
  lightTarget: string;
  temperatureSensorKey?: string | null;
  humiditySensorKey?: string | null;
  lightSensorKey?: string | null;
  trays?: Tray[];
};

type Rack = {
  id: string;
  deviceId: string;
  name: string;
  rowCount: number;
  traysPerRow: number;
  status: string;
  rows?: Row[];
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
    description?: string | null;
    version?: string | null;
    imageUrl: string | null;
    capabilities: {
      sensors: Capability[];
      actuators: Capability[];
    };
    kind?: string;
    rackRowCount?: number | null;
    traysPerRow?: number;
  };
  state: State | null;
  rack?: Rack | null;
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
  trigger?: Record<string, unknown>;
  actions?: unknown;
};

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  const time = new Date(lastSeenAt).getTime();
  return Number.isFinite(time) && Date.now() - time < 2 * 60 * 1000;
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "--";
  const number = Number(value);
  if (Number.isFinite(number)) {
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }
  return String(value);
}

function findValue(
  data: Record<string, unknown>,
  keys: Array<string | null | undefined>,
) {
  const direct = keys.find(
    (key) => key && data[key] !== undefined && data[key] !== null,
  );
  if (direct) return data[direct];

  const dataKeys = Object.keys(data);
  for (const wanted of keys) {
    if (!wanted) continue;
    const found = dataKeys.find(
      (key) => key.toLowerCase() === wanted.toLowerCase(),
    );
    if (found && data[found] !== undefined && data[found] !== null)
      return data[found];
  }

  return null;
}

function getBooleanState(state: State | null, target: string) {
  const desired = state?.desired?.[target];
  if (typeof desired === "boolean") return desired;

  const actual = state?.actual?.[target];
  if (typeof actual === "boolean") return actual;

  return false;
}

function getMode(state: State | null, target: string) {
  return state?.modes?.[target] === "MANUAL" ? "MANUAL" : "AUTO";
}

function sensorIcon(key: string): keyof typeof Ionicons.glyphMap {
  const value = key.toLowerCase();
  if (value.includes("humidity")) return "water-outline";
  if (value.includes("light")) return "sunny-outline";
  if (value.includes("soil")) return "leaf-outline";
  if (value.includes("pressure")) return "speedometer-outline";
  return "thermometer-outline";
}

function actuatorIcon(target: string) {
  const value = target.toLowerCase();
  if (value.includes("fan")) return "fan" as const;
  if (value.includes("light") || value.includes("led"))
    return "bulb-outline" as const;
  if (value.includes("pump")) return "water-outline" as const;
  return "flash-outline" as const;
}

function daysLeft(dateString: string) {
  const time = new Date(dateString).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.ceil((time - Date.now()) / 86_400_000));
}

function formatDate(dateString?: string | null) {
  if (!dateString) return "--";
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return "--";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shortDate(dateString: string) {
  const date = new Date(dateString);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function getNumericSensors(device: Device) {
  return (device.deviceModel.capabilities?.sensors ?? []).filter(
    (sensor) => sensor.type === "number",
  );
}

function filterTelemetry(
  data: Telemetry[],
  range: "24H" | "7D" | "30D" | "ALL",
) {
  if (range === "ALL") return data;
  const multiplier = range === "24H" ? 1 : range === "7D" ? 7 : 30;
  const cutoff = Date.now() - multiplier * 86_400_000;
  return data.filter((item) => new Date(item.recordedAt).getTime() >= cutoff);
}

function Chart({ data, sensorKey }: { data: Telemetry[]; sensorKey: string }) {
  const values = data
    .map((item) => Number(item.data[sensorKey]))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return (
      <View className="h-[140px] items-center justify-center rounded-[18px] bg-[#101610]">
        <Text className="text-[12px] text-zinc-600">Not enough data yet</Text>
      </View>
    );
  }

  const width = 320;
  const height = 112;
  const pad = 8;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 1);

  const points = values
    .slice()
    .reverse()
    .map((value, index, list) => {
      const x =
        pad + (index / Math.max(list.length - 1, 1)) * (width - pad * 2);
      const y = pad + ((max - value) / spread) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <View className="overflow-hidden rounded-[18px] bg-[#101610] px-3 pt-3">
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polyline
          points={points}
          fill="none"
          stroke={LEMON}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function QuickStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View
      className={`flex-1 px-2 py-4 ${accent ? "bg-[#BFFF45]" : "bg-[#151B15]"}`}
    >
      <Text
        className={`text-center text-[10px] uppercase tracking-[1px] ${accent ? "text-black/50" : "text-zinc-600"}`}
      >
        {label}
      </Text>
      <Text
        className={`mt-2 text-center text-[22px] font-semibold tracking-[-0.8px] ${accent ? "text-black" : "text-white"}`}
      >
        {value}
      </Text>
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
      className={`flex-row items-center justify-between px-4 py-4 ${last ? "" : "border-b border-white/[0.05]"}`}
    >
      <Text className="text-[13px] text-zinc-500">{label}</Text>
      <Text
        numberOfLines={1}
        className="ml-6 max-w-[58%] text-right text-[13px] font-medium text-white"
      >
        {value}
      </Text>
    </View>
  );
}

function TrayCard({ tray }: { tray: Tray }) {
  const crop = tray.currentCrop;
  const remaining = crop ? daysLeft(crop.expectedHarvestDate) : null;

  return (
    <View className="mb-3 w-[48.4%] overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#121812]">
      <View className="h-[112px] bg-[#171D17]">
        <Image
          source={{ uri: crop ? SAPLING_IMAGE_URL : EMPTY_TRAY_IMAGE_URL }}
          resizeMode="contain"
          className="h-full w-full"
        />

        {crop ? (
          <View className="absolute right-2 top-2 rounded-full bg-[#27331C] px-2 py-1">
            <Text className="text-[9px] font-semibold text-[#C8FF58]">
              {crop.status === "READY"
                ? "Ready"
                : remaining === null
                  ? ""
                  : `${remaining}d`}
            </Text>
          </View>
        ) : null}
      </View>

      <View className="px-3 pb-3 pt-2.5">
        <Text className="text-[9px] uppercase tracking-[0.8px] text-zinc-600">
          Tray {tray.slot}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-1 text-[16px] font-semibold text-white"
        >
          {crop?.cropName || "Empty"}
        </Text>
        <Text numberOfLines={1} className="mt-2 text-[10px] text-zinc-500">
          {crop
            ? crop.status === "READY"
              ? "Ready to harvest"
              : `Harvest ${shortDate(crop.expectedHarvestDate)}`
            : "No crop planted"}
        </Text>
      </View>
    </View>
  );
}

function ActuatorIcon({
  target,
  size = 20,
}: {
  target: string;
  size?: number;
}) {
  const icon = actuatorIcon(target);
  if (icon === "fan") {
    return (
      <MaterialCommunityIcons name="fan" size={size} color={LEMON_BRIGHT} />
    );
  }
  return <Ionicons name={icon} size={size} color={LEMON_BRIGHT} />;
}

function LayerCard({
  row,
  device,
  latestData,
  commandLoading,
  onCommand,
}: {
  row: Row;
  device: Device;
  latestData: Record<string, unknown>;
  commandLoading: string | null;
  onCommand: (target: string, value: boolean, mode: "AUTO" | "MANUAL") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  const fanMode = getMode(device.state, row.fanTarget);
  const lightMode = getMode(device.state, row.lightTarget);
  const rowMode = fanMode === lightMode ? fanMode : "AUTO";
  const fanOn = getBooleanState(device.state, row.fanTarget);
  const lightOn = getBooleanState(device.state, row.lightTarget);
  const controlsDisabled = rowMode === "AUTO";

  const trays = [...(row.trays ?? [])]
    .sort((a, b) => a.slot - b.slot)
    .slice(0, 4);

  const temperature = findValue(latestData, [
    row.temperatureSensorKey,
    "temperature",
    "temp",
  ]);
  const humidity = findValue(latestData, [
    row.humiditySensorKey,
    "humidity",
    "humid",
  ]);
  const light = findValue(latestData, [row.lightSensorKey, "light", "lux"]);

  function toggleExpanded() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = !expanded;
    setExpanded(next);

    Animated.parallel([
      Animated.timing(rotation, {
        toValue: next ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(reveal, {
        toValue: next ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View
      className={`mb-3 overflow-hidden rounded-[22px] border ${expanded ? "border-[#27341D]" : "border-white/[0.06]"} bg-[#081008]`}
    >
      <Pressable
        onPress={toggleExpanded}
        onPressIn={() =>
          Animated.spring(pressScale, {
            toValue: 0.985,
            useNativeDriver: true,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(pressScale, {
            toValue: 1,
            useNativeDriver: true,
          }).start()
        }
      >
        <Animated.View
          style={{ transform: [{ scale: pressScale }] }}
          className="flex-row items-center px-4 py-4"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#BFFF45]">
            <Text className="text-[14px] font-bold text-black">
              {row.rowNumber}
            </Text>
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-[17px] font-semibold text-[#C8FF58]">
              {row.name || `Layer ${row.rowNumber}`}
            </Text>
            <Text className="mt-1 text-[11px] text-zinc-600">
              {trays.filter((tray) => !!tray.currentCrop).length}/{trays.length}{" "}
              occupied · {rowMode.toLowerCase()}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={20} color="#687168" />
          </Animated.View>
        </Animated.View>
      </Pressable>

      {expanded ? (
        <Animated.View
          style={{
            opacity: reveal,
            transform: [
              {
                translateY: reveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          }}
          className="px-3 pb-4"
        >
          <View className="mb-4 flex-row gap-2">
            <View className="flex-1 rounded-[16px] bg-[#121812] px-3 py-3">
              <Text className="text-[9px] uppercase tracking-[0.8px] text-zinc-600">
                Temp
              </Text>
              <Text className="mt-1 text-[18px] font-semibold text-white">
                {formatValue(temperature)}°
              </Text>
            </View>
            <View className="flex-1 rounded-[16px] bg-[#121812] px-3 py-3">
              <Text className="text-[9px] uppercase tracking-[0.8px] text-zinc-600">
                Humidity
              </Text>
              <Text className="mt-1 text-[18px] font-semibold text-white">
                {formatValue(humidity)}%
              </Text>
            </View>
            <View className="flex-1 rounded-[16px] bg-[#121812] px-3 py-3">
              <Text className="text-[9px] uppercase tracking-[0.8px] text-zinc-600">
                Light
              </Text>
              <Text className="mt-1 text-[18px] font-semibold text-white">
                {formatValue(light)}
              </Text>
            </View>
          </View>

          <Text className="mb-3 px-1 text-[11px] font-medium uppercase tracking-[1.4px] text-[#E7EF58]">
            Trays
          </Text>

          <View className="flex-row flex-wrap justify-between">
            {trays.map((tray) => (
              <TrayCard key={tray.id} tray={tray} />
            ))}
          </View>

          <Text className="mb-3 mt-2 px-1 text-[11px] font-medium uppercase tracking-[1.4px] text-[#E7EF58]">
            Controls
          </Text>

          <View className="mb-3 rounded-[18px] bg-[#121812] p-2">
            <View className="flex-row gap-2">
              <Pressable
                disabled={commandLoading !== null}
                onPress={() => onCommand(row.fanTarget, fanOn, "AUTO")}
                className={`flex-1 items-center justify-center rounded-[14px] py-3 ${rowMode === "AUTO" ? "bg-[#E7EF58]" : "bg-[#1B231B]"}`}
              >
                <Text
                  className={`text-[12px] font-semibold ${rowMode === "AUTO" ? "text-black" : "text-zinc-400"}`}
                >
                  AUTO
                </Text>
              </Pressable>
              <Pressable
                disabled={commandLoading !== null}
                onPress={() => onCommand(row.fanTarget, fanOn, "MANUAL")}
                className={`flex-1 items-center justify-center rounded-[14px] py-3 ${rowMode === "MANUAL" ? "bg-[#E7EF58]" : "bg-[#1B231B]"}`}
              >
                <Text
                  className={`text-[12px] font-semibold ${rowMode === "MANUAL" ? "text-black" : "text-zinc-400"}`}
                >
                  MANUAL
                </Text>
              </Pressable>
            </View>
          </View>

          <View
            className={`mb-2 flex-row items-center justify-between rounded-[16px] border border-white/[0.05] bg-[#101610] px-4 py-3 ${controlsDisabled ? "opacity-50" : ""}`}
          >
            <View className="flex-row items-center">
              <ActuatorIcon target={row.fanTarget} size={20} />
              <View className="ml-3">
                <Text className="text-[14px] font-medium text-white">Fan</Text>
                <Text className="mt-0.5 text-[10px] text-zinc-600">
                  {controlsDisabled
                    ? "Managed automatically"
                    : fanOn
                      ? "Running"
                      : "Off"}
                </Text>
              </View>
            </View>

            <Pressable
              disabled={controlsDisabled || commandLoading === row.fanTarget}
              onPress={() => onCommand(row.fanTarget, !fanOn, "MANUAL")}
              className={`h-8 w-14 justify-center rounded-full px-1 ${fanOn ? "bg-[#BFFF45]" : "bg-[#2B312B]"}`}
            >
              {commandLoading === row.fanTarget ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <View
                  className={`h-6 w-6 rounded-full ${fanOn ? "ml-auto bg-black" : "bg-[#858B85]"}`}
                />
              )}
            </Pressable>
          </View>

          <View
            className={`flex-row items-center justify-between rounded-[16px] border border-white/[0.05] bg-[#101610] px-4 py-3 ${controlsDisabled ? "opacity-50" : ""}`}
          >
            <View className="flex-row items-center">
              <ActuatorIcon target={row.lightTarget} size={20} />
              <View className="ml-3">
                <Text className="text-[14px] font-medium text-white">
                  Light
                </Text>
                <Text className="mt-0.5 text-[10px] text-zinc-600">
                  {controlsDisabled
                    ? "Managed automatically"
                    : lightOn
                      ? "On"
                      : "Off"}
                </Text>
              </View>
            </View>

            <Pressable
              disabled={controlsDisabled || commandLoading === row.lightTarget}
              onPress={() => onCommand(row.lightTarget, !lightOn, "MANUAL")}
              className={`h-8 w-14 justify-center rounded-full px-1 ${lightOn ? "bg-[#BFFF45]" : "bg-[#2B312B]"}`}
            >
              {commandLoading === row.lightTarget ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <View
                  className={`h-6 w-6 rounded-full ${lightOn ? "ml-auto bg-black" : "bg-[#858B85]"}`}
                />
              )}
            </Pressable>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function DeviceDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const deviceId = Array.isArray(id) ? id[0] : id;

  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [range, setRange] = useState<"24H" | "7D" | "30D" | "ALL">("24H");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [commandLoading, setCommandLoading] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const heroFloat = useRef(new Animated.Value(0)).current;

  const load = useCallback(
    async (showLoading = true) => {
      if (!deviceId) return;

      try {
        if (showLoading) setLoading(true);
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
        setError(err?.message || "Unable to load device.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deviceId],
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: 1,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 0,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [heroFloat]);

  const latestData = telemetry[0]?.data ?? {};
  const numericSensors = useMemo(
    () => (device ? getNumericSensors(device) : []),
    [device],
  );
  const chartTelemetry = useMemo(
    () => filterTelemetry(telemetry, range),
    [telemetry, range],
  );

  const rack = device?.rack ?? null;
  const rows = rack?.rows ?? [];

  const occupied = useMemo(
    () =>
      rows.reduce(
        (total, row) =>
          total + (row.trays ?? []).filter((tray) => !!tray.currentCrop).length,
        0,
      ),
    [rows],
  );

  const totalTrays = rack ? rack.rowCount * rack.traysPerRow : 0;
  const growing = useMemo(
    () =>
      rows.reduce(
        (total, row) =>
          total +
          (row.trays ?? []).filter(
            (tray) => tray.currentCrop?.status === "GROWING",
          ).length,
        0,
      ),
    [rows],
  );
  const ready = useMemo(
    () =>
      rows.reduce(
        (total, row) =>
          total +
          (row.trays ?? []).filter(
            (tray) => tray.currentCrop?.status === "READY",
          ).length,
        0,
      ),
    [rows],
  );

  async function sendCommand(
    target: string,
    value: boolean,
    mode: "AUTO" | "MANUAL",
  ) {
    if (!device || !target) return;

    try {
      setCommandLoading(target);

      await apiRequest(`/user/devices/${device.id}/commands`, {
        method: "POST",
        body: JSON.stringify({
          target,
          action: "set",
          value,
          mode,
        }),
      });

      await load(false);
    } catch (err: any) {
      setError(err?.message || "Unable to control device.");
    } finally {
      setCommandLoading(null);
    }
  }

  function openEdit() {
    setDeviceName(device.name || device.deviceModel.name);
    setError("");
    setEditOpen(true);
  }

  async function saveDeviceName() {
    if (!device) return;

    const cleanName = deviceName.trim();

    if (!cleanName) {
      setError("Device name cannot be empty.");
      return;
    }

    try {
      setSavingName(true);
      setError("");

      const response = await apiRequest(`/user/devices/${device.id}/name`, {
        method: "PATCH",
        body: JSON.stringify({ name: cleanName }),
      });

      if (response?.device?.name) {
        setDevice((current) =>
          current ? { ...current, name: response.device.name } : current,
        );
      } else {
        setDevice((current) =>
          current ? { ...current, name: cleanName } : current,
        );
      }

      setEditOpen(false);
    } catch (err: any) {
      setError(err?.message || "Unable to rename device.");
    } finally {
      setSavingName(false);
    }
  }

  async function disconnectDevice() {
    if (!device) return;

    try {
      setDisconnecting(true);
      setError("");

      await apiRequest(`/user/devices/${device.id}`, {
        method: "DELETE",
      });

      setDisconnectOpen(false);
      setEditOpen(false);
      router.replace("/(tabs)/devices");
    } catch (err: any) {
      setError(err?.message || "Unable to disconnect device.");
      setDisconnectOpen(false);
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <StatusBar style="light" />
        <ActivityIndicator size="small" color={LEMON} />
      </View>
    );
  }

  if (!device) {
    return (
      <View
        className="flex-1 bg-black px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        <StatusBar style="light" />
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-[#151B15]"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[21px] font-semibold text-white">
            Device unavailable
          </Text>
          <Text className="mt-2 text-center text-[13px] leading-5 text-zinc-600">
            {error || "This device could not be loaded."}
          </Text>
        </View>
      </View>
    );
  }

  const online = isOnline(device.lastSeenAt);
  const heroTranslate = heroFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });
  const heroScale = heroFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.018],
  });

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(false);
            }}
            tintColor={LEMON}
            colors={[LEMON]}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 50 }}
      >
        <View style={{ paddingTop: insets.top + 8 }} className="px-5">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#151B15]"
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </Pressable>

            <View className="flex-row items-center gap-2">
              <View className="flex-row items-center rounded-full bg-[#151B15] px-3 py-2">
                <View
                  className={`h-2 w-2 rounded-full ${online ? "bg-[#BFFF45]" : "bg-[#F0646B]"}`}
                />
                <Text
                  className={`ml-2 text-[11px] font-semibold ${online ? "text-[#BFFF45]" : "text-[#F0646B]"}`}
                >
                  {online ? "Online" : "Offline"}
                </Text>
              </View>

              <Pressable
                onPress={openEdit}
                className="flex-row items-center rounded-full bg-[#E7EF58] px-3.5 py-2.5 active:opacity-80"
              >
                <Ionicons name="create-outline" size={15} color="#000000" />
                <Text className="ml-1.5 text-[12px] font-semibold text-black">
                  Edit
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* DEVICE HERO */}
        <View className="mt-5 px-5">
          <Animated.View
            style={{
              transform: [{ translateY: heroTranslate }, { scale: heroScale }],
            }}
            className="h-[285px] w-full items-center justify-center"
          >
            {device.deviceModel.imageUrl ? (
              <Image
                source={{ uri: device.deviceModel.imageUrl }}
                resizeMode="contain"
                className="h-full w-full"
              />
            ) : (
              <View className="h-28 w-28 items-center justify-center rounded-[30px] bg-[#E7EF58]">
                <Ionicons
                  name={rack ? "leaf-outline" : "hardware-chip-outline"}
                  size={48}
                  color="#000000"
                />
              </View>
            )}
          </Animated.View>

          <Text className="mt-2 text-[34px] font-semibold tracking-[-1.5px] text-white">
            {device.name || device.deviceModel.name}
          </Text>

          <View className="mt-2 flex-row items-center">
            <Text className="text-[12px] text-zinc-500">
              {device.deviceCode}
            </Text>
            <View className="mx-2 h-1 w-1 rounded-full bg-zinc-700" />
            <Text className="text-[12px] text-zinc-500">
              {device.deviceModel.name}
            </Text>
          </View>

          {device.deviceModel.description ? (
            <Text className="mt-3 text-[14px] leading-5 text-zinc-500">
              {device.deviceModel.description}
            </Text>
          ) : null}
        </View>

        {/* SUMMARY */}
        <View className="mt-6 px-5">
          <View className="overflow-hidden rounded-[22px] border border-white/[0.05] bg-[#111711]">
            <View className="flex-row">
              <QuickStat
                accent
                label="Temperature"
                value={`${formatValue(findValue(latestData, [numericSensors.find((x) => x.key.toLowerCase().includes("temperature"))?.key, "temperature", "temp"]))}°`}
              />
              <QuickStat
                label="Humidity"
                value={`${formatValue(findValue(latestData, [numericSensors.find((x) => x.key.toLowerCase().includes("humidity"))?.key, "humidity", "humid"]))}%`}
              />
              {rack ? (
                <QuickStat
                  label="Occupied"
                  value={`${occupied}/${totalTrays}`}
                />
              ) : (
                <QuickStat label="Readings" value={String(telemetry.length)} />
              )}
            </View>
          </View>
        </View>

        {/* LIVE */}
        {numericSensors.length > 0 ? (
          <View className="mt-10 px-5">
            <Text className="text-[11px] font-medium uppercase tracking-[1.6px] text-[#E7EF58]">
              Monitoring
            </Text>
            <Text className="mt-1 text-[29px] font-semibold tracking-[-1px] text-white">
              Live conditions
            </Text>

            <View className="mt-4 flex-row flex-wrap justify-between">
              {numericSensors.map((sensor) => (
                <View
                  key={sensor.key}
                  className="mb-3 w-[48.3%] rounded-[19px] border border-white/[0.05] bg-[#111711] px-4 py-4"
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      numberOfLines={1}
                      className="flex-1 text-[10px] uppercase tracking-[1px] text-zinc-600"
                    >
                      {sensor.label || sensor.key}
                    </Text>
                    <Ionicons
                      name={sensorIcon(sensor.key)}
                      size={17}
                      color={LEMON_BRIGHT}
                    />
                  </View>
                  <Text className="mt-5 text-[26px] font-semibold tracking-[-0.9px] text-white">
                    {formatValue(latestData[sensor.key])}
                    {sensor.unit ? ` ${sensor.unit}` : ""}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* HISTORY */}
        {numericSensors.length > 0 ? (
          <View className="mt-10 px-5">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-[11px] font-medium uppercase tracking-[1.6px] text-[#E7EF58]">
                  History
                </Text>
                <Text className="mt-1 text-[29px] font-semibold tracking-[-1px] text-white">
                  Sensor trends
                </Text>
              </View>
              <Text className="text-[11px] text-zinc-600">
                {chartTelemetry.length} points
              </Text>
            </View>

            <View className="mt-4 flex-row rounded-full bg-[#111711] p-1">
              {(["24H", "7D", "30D", "ALL"] as const).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setRange(item)}
                  className={`flex-1 items-center rounded-full py-2.5 ${range === item ? "bg-[#E7EF58]" : "bg-transparent"}`}
                >
                  <Text
                    className={`text-[10px] font-semibold ${range === item ? "text-black" : "text-zinc-500"}`}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-5">
              {numericSensors.map((sensor) => {
                const values = chartTelemetry
                  .map((item) => Number(item.data[sensor.key]))
                  .filter(Number.isFinite);
                if (!values.length) return null;
                const current = values[values.length - 1];
                const min = Math.min(...values);
                const max = Math.max(...values);

                return (
                  <View
                    key={sensor.key}
                    className="mb-4 rounded-[22px] border border-white/[0.05] bg-[#0D130D] p-4"
                  >
                    <View className="flex-row items-end justify-between">
                      <View className="flex-row items-center">
                        <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#171E17]">
                          <Ionicons
                            name={sensorIcon(sensor.key)}
                            size={17}
                            color={LEMON_BRIGHT}
                          />
                        </View>
                        <View className="ml-3">
                          <Text className="text-[13px] font-medium text-white">
                            {sensor.label || sensor.key}
                          </Text>
                          <Text className="mt-0.5 text-[10px] text-zinc-600">
                            Min {formatValue(min)} · Max {formatValue(max)}
                          </Text>
                        </View>
                      </View>
                      <Text className="text-[21px] font-semibold text-white">
                        {formatValue(current)}
                        {sensor.unit ? ` ${sensor.unit}` : ""}
                      </Text>
                    </View>

                    <View className="mt-4">
                      <Chart data={chartTelemetry} sensorKey={sensor.key} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* RACK */}
        {rack ? (
          <View className="mt-10 px-5">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-[11px] font-medium uppercase tracking-[1.6px] text-[#E7EF58]">
                  Growing system
                </Text>
                <Text className="mt-1 text-[29px] font-semibold tracking-[-1px] text-white">
                  {rack.name}
                </Text>
              </View>
              <Text className="pb-1 text-[12px] text-zinc-600">
                {rack.rowCount} layers
              </Text>
            </View>

            <View className="mt-4 flex-row gap-2">
              <View className="flex-1 rounded-[17px] bg-[#111711] px-4 py-4">
                <Text className="text-[9px] uppercase tracking-[1px] text-zinc-600">
                  Occupied
                </Text>
                <Text className="mt-1 text-[22px] font-semibold text-white">
                  {occupied}/{totalTrays}
                </Text>
              </View>
              <View className="flex-1 rounded-[17px] bg-[#111711] px-4 py-4">
                <Text className="text-[9px] uppercase tracking-[1px] text-zinc-600">
                  Growing
                </Text>
                <Text className="mt-1 text-[22px] font-semibold text-white">
                  {growing}
                </Text>
              </View>
              <View className="flex-1 rounded-[17px] bg-[#111711] px-4 py-4">
                <Text className="text-[9px] uppercase tracking-[1px] text-zinc-600">
                  Ready
                </Text>
                <Text className="mt-1 text-[22px] font-semibold text-white">
                  {ready}
                </Text>
              </View>
            </View>

            <View className="mt-4">
              {rows.map((row) => (
                <LayerCard
                  key={row.id}
                  row={row}
                  device={device}
                  latestData={latestData}
                  commandLoading={commandLoading}
                  onCommand={sendCommand}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* AUTOMATIONS */}
        <View className="mt-10 px-5">
          <Text className="text-[11px] font-medium uppercase tracking-[1.6px] text-[#E7EF58]">
            Automation
          </Text>
          <View className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.05] bg-[#0D130D]">
            {automations.length === 0 ? (
              <View className="px-4 py-5">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#171E17]">
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color={LEMON_BRIGHT}
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-medium text-white">
                      No automations yet
                    </Text>
                    <Text className="mt-1 text-[11px] text-zinc-600">
                      This device is not running any smart rules.
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              automations.map((automation, index) => (
                <View
                  key={automation.id}
                  className={`flex-row items-center px-4 py-4 ${index < automations.length - 1 ? "border-b border-white/[0.05]" : ""}`}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#171E17]">
                    <Ionicons
                      name="sparkles-outline"
                      size={18}
                      color={LEMON_BRIGHT}
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-[14px] font-medium text-white">
                      {automation.name}
                    </Text>
                    <Text className="mt-1 text-[10px] text-zinc-600">
                      {String(automation.trigger?.field || "Sensor rule")}
                    </Text>
                  </View>
                  <Text
                    className={`text-[10px] font-semibold ${automation.status === "PAUSED" ? "text-zinc-600" : "text-[#BFFF45]"}`}
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
          <Text className="text-[11px] font-medium uppercase tracking-[1.6px] text-[#E7EF58]">
            Hardware
          </Text>
          <Text className="mt-1 text-[29px] font-semibold tracking-[-1px] text-white">
            Device details
          </Text>

          <View className="mt-4 overflow-hidden rounded-[22px] border border-white/[0.05] bg-[#0D130D]">
            <InfoRow label="Device code" value={device.deviceCode} />
            <InfoRow label="Serial number" value={device.serialNumber} />
            <InfoRow label="Status" value={device.status} />
            <InfoRow label="Firmware" value={device.firmwareVersion || "--"} />
            <InfoRow label="Model" value={device.deviceModel.code} />
            <InfoRow
              label="Model version"
              value={device.deviceModel.version || "--"}
            />
            <InfoRow label="Connected" value={formatDate(device.linkedAt)} />
            <InfoRow label="Last seen" value={formatDate(device.lastSeenAt)} />
            <InfoRow
              label="Last telemetry"
              value={telemetry[0] ? formatDate(telemetry[0].recordedAt) : "--"}
            />
            {rack ? (
              <InfoRow
                label="Rack layout"
                value={`${rack.rowCount} × ${rack.traysPerRow} trays`}
                last
              />
            ) : (
              <InfoRow
                label="Sensors"
                value={String(device.deviceModel.capabilities.sensors.length)}
                last
              />
            )}
          </View>
        </View>

        {/* CAPABILITIES */}
        <View className="mt-10 px-5">
          <Text className="text-[11px] font-medium uppercase tracking-[1.6px] text-[#E7EF58]">
            Capabilities
          </Text>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {device.deviceModel.capabilities.sensors.map((sensor) => (
              <View
                key={`sensor-${sensor.key}`}
                className="rounded-full border border-white/[0.06] bg-[#111711] px-3.5 py-2.5"
              >
                <Text className="text-[11px] text-zinc-400">
                  {sensor.label || sensor.key}
                </Text>
              </View>
            ))}
            {device.deviceModel.capabilities.actuators.map((actuator) => (
              <View
                key={`actuator-${actuator.key}`}
                className="flex-row items-center rounded-full border border-white/[0.06] bg-[#111711] px-3.5 py-2.5"
              >
                <ActuatorIcon target={actuator.key} size={13} />
                <Text className="ml-1.5 text-[11px] text-zinc-400">
                  {actuator.label || actuator.key}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {error ? (
          <Text className="mx-5 mt-6 text-center text-[12px] text-red-400">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      {/* EDIT DEVICE */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !savingName && setEditOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/75">
          <Pressable
            className="flex-1"
            onPress={() => !savingName && setEditOpen(false)}
          />

          <View
            className="rounded-t-[32px] bg-[#0B0F0B] px-5 pt-4"
            style={{ paddingBottom: Math.max(insets.bottom + 18, 28) }}
          >
            <View className="mx-auto h-1.5 w-10 rounded-full bg-zinc-700" />

            <View className="mt-5 flex-row items-center justify-between">
              <View>
                <Text className="text-[28px] font-semibold tracking-[-1px] text-white">
                  Edit device
                </Text>
                <Text className="mt-1 text-[13px] text-zinc-500">
                  Manage this device
                </Text>
              </View>

              <Pressable
                disabled={savingName}
                onPress={() => setEditOpen(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#171D17]"
              >
                <Ionicons name="close" size={19} color="#FFFFFF" />
              </Pressable>
            </View>

            <Text className="mb-2 mt-7 text-[13px] font-medium text-zinc-400">
              Device name
            </Text>

            <TextInput
              value={deviceName}
              onChangeText={setDeviceName}
              placeholder="Device name"
              placeholderTextColor="#555D56"
              maxLength={50}
              editable={!savingName}
              className="h-14 rounded-2xl border border-white/[0.06] bg-[#151A15] px-4 text-[16px] text-white"
            />

            {error ? (
              <Text className="mt-3 text-[12px] text-red-400">{error}</Text>
            ) : null}

            <Pressable
              disabled={savingName}
              onPress={() => void saveDeviceName()}
              className="mt-5 h-14 items-center justify-center rounded-2xl bg-[#E7EF58] active:opacity-80"
            >
              {savingName ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text className="text-[16px] font-semibold text-black">
                  Save changes
                </Text>
              )}
            </Pressable>

            <Pressable
              disabled={savingName}
              onPress={() => setDisconnectOpen(true)}
              className="mt-4 flex-row items-center justify-center py-3"
            >
              <Ionicons name="unlink-outline" size={17} color="#F0646B" />
              <Text className="ml-2 text-[14px] font-medium text-[#F0646B]">
                Disconnect device
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* DISCONNECT CONFIRMATION */}
      <Modal
        visible={disconnectOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !disconnecting && setDisconnectOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/80 px-7">
          <View className="w-full rounded-[28px] bg-[#111611] p-6">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#291416]">
              <Ionicons name="unlink-outline" size={20} color="#F0646B" />
            </View>

            <Text className="mt-5 text-[24px] font-semibold tracking-[-0.7px] text-white">
              Disconnect device?
            </Text>

            <Text className="mt-2 text-[14px] leading-5 text-zinc-500">
              This will remove the device from your account. Your physical
              device will not be deleted.
            </Text>

            <View className="mt-7 flex-row gap-3">
              <Pressable
                disabled={disconnecting}
                onPress={() => setDisconnectOpen(false)}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#1B211B]"
              >
                <Text className="text-[14px] font-semibold text-white">
                  Keep device
                </Text>
              </Pressable>

              <Pressable
                disabled={disconnecting}
                onPress={() => void disconnectDevice()}
                className="h-12 flex-1 items-center justify-center rounded-2xl bg-[#F0646B]"
              >
                {disconnecting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Text className="text-[14px] font-semibold text-black">
                    Disconnect
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
