import React, { useCallback, useEffect, useMemo, useState } from "react";
// import DateTimePicker from "@react-native-community/datetimepicker"; // Make sure this is installed
import DateTimePicker, { useDefaultStyles } from "react-native-ui-datepicker";
import dayjs from "dayjs";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Animated,
  TextInput,
  View,
} from "react-native";

import { router, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiRequest } from "@/lib/api";
import {
  subscribeToCropHarvestEvents,
  type CropHarvestSocketMessage,
} from "@/lib/crop-harvest-socket";
import { useAuth } from "@/lib/auth-context";
import AppText from "@/components/ui/AppText";

/* ============================================================================
   IMAGE URLS

   Replace these with your actual vector/image URLs.
============================================================================ */

const SAPLING_IMAGE_URL =
  "https://ik.imagekit.io/tut1/06c2c329-119c-4264-a3cf-ad5ad857412a.png?updatedAt=1791036640714";

const EMPTY_TRAY_IMAGE_URL =
  "https://ik.imagekit.io/tut1/cab4ba2b-12cb-42dc-ab61-45aa20feb50a.png?updatedAt=1791036703172";

/* ============================================================================
   THEME
============================================================================ */

const THEME = {
  black: "#000000",

  primary: "#E7EF58",

  surface: "#0E150E",
  surface2: "#141A14",
  surface3: "#192119",

  white: "#FFFFFF",
  whiteSoft: "#D9DED8",

  muted: "#858D85",
  muted2: "#555D56",

  lemon: "#E7EF58",
  lemonBright: "#C8FF58",

  green: "#91D65F",
  greenSoft: "#172617",

  orange: "#D9B85A",
  orangeSoft: "#2B2515",

  red: "#F0646B",
  redSoft: "#291416",

  border: "rgba(255,255,255,0.075)",
};

/* ============================================================================
   TYPES
============================================================================ */

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
  sensors: DeviceCapability[];
  actuators: DeviceCapability[];
};

type DeviceState = {
  actual: Record<string, unknown>;
  desired: Record<string, unknown>;
  modes: Record<string, unknown>;
  lastReportedAt: string | null;
};

type CropCycle = {
  id: string;
  trayId?: string;
  cropName: string;
  sowingDate: string;
  estimatedGrowthDays: number;
  expectedHarvestDate: string;
  status: "GROWING" | "READY" | "HARVESTED" | "CANCELLED";
  harvestedAt?: string | null;
  notes?: string | null;
};

type HarvestPromptCrop = CropCycle & {
  timing?: {
    needsHarvestConfirmation?: boolean;
    isDue?: boolean;
    isOverdue?: boolean;
    overdueDays?: number;
    remainingMilliseconds?: number;
    remainingDays?: number;
  };
  tray?: {
    id?: string;
    name?: string;
    slot?: number;
    row?: {
      id?: string;
      name?: string;
      rowNumber?: number;
      rack?: { id?: string; name?: string };
    };
  };
};

type Tray = {
  id: string;
  slot: number;
  name: string;
  currentCrop?: CropCycle | null;
};

type RackRow = {
  id: string;
  rowNumber: number;
  name: string;

  fanTarget: string;
  lightTarget: string;

  temperatureSensorKey?: string | null;
  humiditySensorKey?: string | null;
  lightSensorKey?: string | null;

  controlConfig?: Record<string, unknown>;

  trays?: Tray[];
};

type Rack = {
  id: string;
  deviceId: string;
  name: string;

  rowCount: number;
  traysPerRow: number;

  status: string;

  rows?: RackRow[];

  createdAt?: string;
  updatedAt?: string;
};

type Telemetry = {
  id: string;
  data: Record<string, unknown>;
  recordedAt: string;
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

    capabilities: DeviceCapabilities;

    kind?: string;
    rackRowCount?: number | null;
    traysPerRow?: number;
  };

  state: DeviceState | null;

  rack?: Rack | null;

  latest?: Telemetry | null;
};

/* ============================================================================
   HELPERS
============================================================================ */

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  const timestamp = new Date(lastSeenAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < 2 * 60 * 1000;
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

function findValue(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }

  const dataKeys = Object.keys(data);

  for (const wanted of keys) {
    const found = dataKeys.find(
      (key) => key.toLowerCase() === wanted.toLowerCase(),
    );

    if (found && data[found] !== undefined && data[found] !== null) {
      return data[found];
    }
  }

  return null;
}

function getBooleanState(state: DeviceState | null, target: string) {
  if (!state || !target) {
    return false;
  }

  const desired = state.desired?.[target];

  if (typeof desired === "boolean") {
    return desired;
  }

  const actual = state.actual?.[target];

  if (typeof actual === "boolean") {
    return actual;
  }

  return false;
}

function getMode(state: DeviceState | null, target: string) {
  if (!state || !target) {
    return "AUTO";
  }

  return state.modes?.[target] === "MANUAL" ? "MANUAL" : "AUTO";
}

function formatHarvestCountdown(dateString: string, now = Date.now()) {
  const target = new Date(dateString).getTime();
  if (!Number.isFinite(target)) return "Date unavailable";

  const remaining = target - now;
  if (remaining <= 0) return "Ready to harvest";

  const totalMinutes = Math.ceil(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${Math.max(1, minutes)}m left`;
}

function formatHarvestDate(dateString: string) {
  const date = new Date(dateString);

  if (!Number.isFinite(date.getTime())) {
    return "--";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getSensorIcon(key: string): keyof typeof Ionicons.glyphMap {
  const value = key.toLowerCase();

  if (value.includes("humidity")) {
    return "water-outline";
  }

  if (value.includes("light")) {
    return "sunny-outline";
  }

  if (value.includes("soil")) {
    return "leaf-outline";
  }

  if (value.includes("pressure")) {
    return "speedometer-outline";
  }

  return "thermometer-outline";
}
function getActuatorIcon(key: string): keyof typeof Ionicons.glyphMap {
  const value = key.toLowerCase();

  if (value.includes("fan")) {
    return "options-outline";
  }

  if (value.includes("light") || value.includes("led")) {
    return "bulb-outline";
  }

  if (value.includes("pump")) {
    return "water-outline";
  }

  if (value.includes("motor")) {
    return "settings-outline";
  }

  return "flash-outline";
}
function formatSensor(value: unknown, sensor: DeviceCapability) {
  if (value === null || value === undefined) {
    return "--";
  }

  if (sensor.type === "number") {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "--";
    }

    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  return String(value);
}

/** Prevent a stalled network request from leaving the garden spinner on forever. */
function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error("The server is taking too long to respond. Pull to retry."),
        ),
      timeoutMs,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/* ============================================================================
   HOME
============================================================================ */

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const rackAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(rackAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(rackAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  const rackTranslateY = rackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  const rackScale = rackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });
  const { user } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const hasLoadedOnce = React.useRef(false);
  const hasSocketConnectedBefore = React.useRef(false);

  const [refreshing, setRefreshing] = useState(false);

  const [deviceSheetOpen, setDeviceSheetOpen] = useState(false);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [plantModalOpen, setPlantModalOpen] = useState(false);

  const [selectedTray, setSelectedTray] = useState<{
    rackId: string;
    tray: Tray;
    row: RackRow;
  } | null>(null);

  const [cropName, setCropName] = useState("");

  const [growthDays, setGrowthDays] = useState("7");

  const [planting, setPlanting] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const lastHarvestClockCheck = React.useRef(Date.now());
  const [harvestQueue, setHarvestQueue] = useState<HarvestPromptCrop[]>([]);
  const [harvestSaving, setHarvestSaving] = useState(false);

  const [controlLoading, setControlLoading] = useState<string | null>(null);

  const [error, setError] = useState("");

  /* --------------------------------------------------------------------------
     SCROLL / STATUS BAR
  -------------------------------------------------------------------------- */

  const [isScrolled, setIsScrolled] = useState(false);

  const handleScroll = useCallback((event: any) => {
    const y = event.nativeEvent.contentOffset.y;

    const next = y > 16;

    setIsScrolled((previous) => (previous === next ? previous : next));
  }, []);

  /* --------------------------------------------------------------------------
     CURRENT DEVICE
  -------------------------------------------------------------------------- */

  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ??
    devices[0] ??
    null;

  const isRack =
    selectedDevice?.deviceModel?.kind === "RACK" || !!selectedDevice?.rack;

  const rack = selectedDevice?.rack ?? null;

  const rows = rack?.rows ?? [];

  /* --------------------------------------------------------------------------
     RACK DATA
  -------------------------------------------------------------------------- */

  const allTrays = useMemo(
    () => rows.flatMap((row) => row.trays ?? []),
    [rows],
  );

  const totalTrays = rack ? rack.rowCount * rack.traysPerRow : 0;

  const occupiedTrays = allTrays.filter((tray) => !!tray.currentCrop).length;

  const growingTrays = allTrays.filter(
    (tray) => tray.currentCrop?.status === "GROWING",
  ).length;

  const readyTrays = allTrays.filter(
    (tray) => tray.currentCrop?.status === "READY",
  ).length;

  /* --------------------------------------------------------------------------
     SENSOR DATA
  -------------------------------------------------------------------------- */

  const latestData = selectedDevice?.latest?.data ?? {};

  const sensors = selectedDevice?.deviceModel?.capabilities?.sensors ?? [];

  const numericSensors = sensors.filter((sensor) => sensor.type === "number");

  const temperatureSensor = sensors.find((sensor) => {
    const key = sensor.key.toLowerCase();

    return key.includes("temperature") || key === "temp";
  });

  const humiditySensor = sensors.find((sensor) =>
    sensor.key.toLowerCase().includes("humidity"),
  );

  const temperatureValue = temperatureSensor
    ? findValue(latestData, [temperatureSensor.key, "temperature", "temp"])
    : findValue(latestData, ["temperature", "temp"]);

  const humidityValue = humiditySensor
    ? findValue(latestData, [humiditySensor.key, "humidity", "humid"])
    : findValue(latestData, ["humidity", "humid"]);

  /* --------------------------------------------------------------------------
     USER
  -------------------------------------------------------------------------- */

  const username = user?.username || "User";

  /* --------------------------------------------------------------------------
     LOAD DEVICES
  -------------------------------------------------------------------------- */

  const loadHome = useCallback(async (initial = false) => {
    // Only the first launch gets a full-screen loader. Background syncs never
    // replace the screen with a spinner.
    if (initial && !hasLoadedOnce.current) setLoading(true);

    try {
      setError("");
      const response = await withTimeout(apiRequest("/user/devices"));
      const loadedDevices = Array.isArray(response?.devices)
        ? (response.devices as Device[])
        : [];

      // Device list remains useful even if an individual telemetry request fails.
      const hydrated = await Promise.all(
        loadedDevices.map(async (device) => {
          try {
            const telemetryResponse = await withTimeout(
              apiRequest(`/user/devices/${device.id}/telemetry`),
              8000,
            );
            const telemetry = Array.isArray(telemetryResponse?.telemetry)
              ? telemetryResponse.telemetry
              : [];
            return {
              ...device,
              latest: telemetry.length ? telemetry[0] : null,
            };
          } catch {
            return { ...device, latest: device.latest ?? null };
          }
        }),
      );

      setDevices(hydrated);
      setSelectedDeviceId((currentId) =>
        currentId && hydrated.some((device) => device.id === currentId)
          ? currentId
          : (hydrated[0]?.id ?? null),
      );
    } catch (err: any) {
      console.error("[HOME]", err);
      setError(err?.message || "Unable to load your devices.");
    } finally {
      hasLoadedOnce.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // The previous screen version never called loadHome(true) on mount, so its
  // initial `loading=true` state could remain forever until an AppState event.
  useEffect(() => {
    void loadHome(true);
  }, [loadHome]);

  const refreshHarvestDue = useCallback(async () => {
    try {
      const response = await apiRequest("/user/crop-cycles/harvest-due");
      const dueCrops = (
        Array.isArray(response?.crops) ? response.crops : []
      ) as HarvestPromptCrop[];
      const needsReview = dueCrops.filter(
        (crop) => crop.timing?.needsHarvestConfirmation === true,
      );

      setHarvestQueue((current) => {
        const currentIds = new Set(current.map((crop) => crop.id));
        const next = needsReview.filter((crop) => !currentIds.has(crop.id));
        return next.length ? [...current, ...next] : current;
      });
    } catch (err) {
      // Harvest reminders must never block the dashboard if the tracking endpoint
      // is temporarily unavailable (for example, while a backend deploy is running).
      console.warn("[HARVEST_TRACKING] Unable to check due crops:", err);
    }
  }, []);

  const handleCropSocketMessage = useCallback(
    (message: CropHarvestSocketMessage) => {
      const eventType = String(
        message?.type ?? message?.event ?? message?.name ?? "",
      ).toLowerCase();
      const candidate =
        message?.cropCycle ??
        message?.cycle ??
        message?.payload?.cropCycle ??
        message?.payload?.cycle ??
        message?.payload ??
        message?.data?.cropCycle ??
        message?.data?.cycle ??
        (message?.data && typeof message.data === "object"
          ? message.data
          : null);

      const cycle =
        candidate && typeof candidate === "object"
          ? (candidate as Partial<CropCycle> & { tray?: { id?: string } })
          : null;
      const trayId = cycle?.trayId ?? cycle?.tray?.id;
      const isCropEvent = /crop|harvest|tray/.test(eventType);

      if (cycle?.id && cycle.status && trayId) {
        const normalizedCycle = cycle as CropCycle;
        const isFinished = ["HARVESTED", "CANCELLED"].includes(
          normalizedCycle.status,
        );

        setDevices((current) =>
          current.map((device) => {
            if (!device.rack) return device;
            return {
              ...device,
              rack: {
                ...device.rack,
                rows: (device.rack.rows ?? []).map((row) => ({
                  ...row,
                  trays: (row.trays ?? []).map((tray) =>
                    tray.id === trayId
                      ? {
                          ...tray,
                          currentCrop: isFinished ? null : normalizedCycle,
                        }
                      : tray,
                  ),
                })),
              },
            };
          }),
        );

        if (isFinished) {
          setHarvestQueue((current) =>
            current.filter((item) => item.id !== normalizedCycle.id),
          );
        } else {
          const expected = normalizedCycle.expectedHarvestDate
            ? new Date(normalizedCycle.expectedHarvestDate).getTime()
            : Number.NaN;
          if (
            normalizedCycle.status === "READY" ||
            (Number.isFinite(expected) && expected <= Date.now())
          ) {
            void refreshHarvestDue();
          }
        }
        return;
      }

      // Some server events contain only an ID. Quietly reconcile the data without
      // ever showing the initial loading screen again.
      if (isCropEvent) {
        void loadHome(false);
        void refreshHarvestDue();
      }
    },
    [loadHome, refreshHarvestDue],
  );

  useEffect(() => {
    let isFirstConnect = true;
    const unsubscribe = subscribeToCropHarvestEvents(
      handleCropSocketMessage,
      (connected) => {
        if (connected) {
          if (!isFirstConnect && hasSocketConnectedBefore.current) {
            // The socket was offline; silently recover events missed while disconnected.
            void loadHome(false);
            void refreshHarvestDue();
          }
          hasSocketConnectedBefore.current = true;
          isFirstConnect = false;
        }
      },
    );
    return unsubscribe;
  }, [handleCropSocketMessage, loadHome, refreshHarvestDue]);

  useFocusEffect(
    React.useCallback(() => {
      if (!loading) void refreshHarvestDue();
      return undefined;
    }, [loading, refreshHarvestDue]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // Re-check only the due queue. Device/crop changes arrive over WebSocket;
        // never put the whole screen back into its loading state on resume.
        void refreshHarvestDue();
      }
    });
    return () => subscription.remove();
  }, [refreshHarvestDue]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const previous = lastHarvestClockCheck.current;
      lastHarvestClockCheck.current = now;
      setClockNow(now);

      // Trigger the due-crop API only when a crop crosses its expected harvest
      // timestamp. This avoids polling the backend every minute for overdue crops.
      const crossedHarvestTime = devices.some((device) =>
        (device.rack?.rows ?? []).some((row) =>
          (row.trays ?? []).some((tray) => {
            const crop = tray.currentCrop;
            if (!crop) return false;
            const target = new Date(crop.expectedHarvestDate).getTime();
            return (
              Number.isFinite(target) && target > previous && target <= now
            );
          }),
        ),
      );
      if (crossedHarvestTime) void refreshHarvestDue();
    }, 30_000);
    return () => clearInterval(timer);
  }, [devices, refreshHarvestDue]);

  /* --------------------------------------------------------------------------
     REFRESH
  -------------------------------------------------------------------------- */

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadHome(false);
  }, [loadHome]);

  /* --------------------------------------------------------------------------
     ROW EXPAND
  -------------------------------------------------------------------------- */
  const [sowingDate, setSowingDate] = useState<Date>(new Date());
  const [dateOption, setDateOption] = useState<"today" | "custom">("today");
  const [showDatePicker, setShowDatePicker] = useState(false);

  function toggleRow(rowId: string) {
    setExpandedRows((previous) => {
      const next = new Set(previous);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });
  }

  /* --------------------------------------------------------------------------
     ADD CROP
  -------------------------------------------------------------------------- */
  function openPlantCrop(row: RackRow, tray: Tray) {
    if (!rack) return;

    setSelectedTray({
      rackId: rack.id,
      row,
      tray,
    });

    setCropName("");
    setGrowthDays("7");
    setError("");
    // Reset date states when opening
    setSowingDate(new Date());
    setDateOption("today");
    setShowDatePicker(false);

    setPlantModalOpen(true);
  }
  const defaultStyles = useDefaultStyles();
  async function plantCrop() {
    if (!selectedTray) return;

    if (!cropName.trim()) {
      setError("Please enter a crop name.");
      return;
    }

    const days = Number(growthDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError("Growth days must be between 1 and 365.");
      return;
    }

    try {
      setPlanting(true);
      setError("");

      await apiRequest(
        `/user/racks/${selectedTray.rackId}/trays/${selectedTray.tray.id}/crop`,
        {
          method: "POST",
          body: JSON.stringify({
            cropName: cropName.trim(),
            sowingDate: sowingDate.toISOString(), // <-- Sends the selected date
            estimatedGrowthDays: days,
          }),
        },
      );

      setPlantModalOpen(false);
      setSelectedTray(null);
      await loadHome(false);
      await refreshHarvestDue();
    } catch (err: any) {
      setError(err?.message || "Unable to add crop.");
    } finally {
      setPlanting(false);
    }
  }

  function promptHarvestForTray(crop: CropCycle, tray: Tray, row: RackRow) {
    const rackName = rack?.name ?? "Your growing rack";
    const isDue = new Date(crop.expectedHarvestDate).getTime() <= Date.now();
    const item: HarvestPromptCrop = {
      ...crop,
      timing: {
        needsHarvestConfirmation: true,
        isDue,
        isOverdue:
          isDue && new Date(crop.expectedHarvestDate).getTime() < Date.now(),
      },
      tray: {
        id: tray.id,
        name: tray.name,
        slot: tray.slot,
        row: {
          id: row.id,
          name: row.name,
          rowNumber: row.rowNumber,
          rack: { name: rackName },
        },
      },
    };
    setHarvestQueue((current) => [
      item,
      ...current.filter((entry) => entry.id !== crop.id),
    ]);
  }

  async function answerHarvestCheck(harvested: boolean) {
    const crop = harvestQueue[0];
    if (!crop || harvestSaving) return;

    try {
      setHarvestSaving(true);
      await apiRequest(`/user/crop-cycles/${crop.id}/harvest-status`, {
        method: "POST",
        body: JSON.stringify({ harvested }),
      });
      setHarvestQueue((current) =>
        current.filter((item) => item.id !== crop.id),
      );
      await loadHome(false);
      await refreshHarvestDue();
    } catch (err: any) {
      Alert.alert(
        harvested ? "Could not confirm harvest" : "Could not save check-in",
        err?.message || "Please try again.",
      );
    } finally {
      setHarvestSaving(false);
    }
  }

  /* --------------------------------------------------------------------------
     DEVICE COMMAND
  -------------------------------------------------------------------------- */

  async function sendCommand(
    target: string,
    value: boolean | number | string,
    mode: "AUTO" | "MANUAL",
  ) {
    if (!selectedDevice || !target) {
      return;
    }

    const loadingKey = `${target}-${mode}`;

    try {
      setControlLoading(loadingKey);

      setError("");

      await apiRequest(`/user/devices/${selectedDevice.id}/commands`, {
        method: "POST",
        body: JSON.stringify({
          target,
          action: "set",
          value,
          mode,
        }),
      });

      await loadHome(false);
    } catch (err: any) {
      Alert.alert("Control failed", err?.message || "Unable to send command.");
    } finally {
      setControlLoading(null);
    }
  }

  /* --------------------------------------------------------------------------
     ROW MODE
  -------------------------------------------------------------------------- */

  async function setRowMode(row: RackRow, mode: "AUTO" | "MANUAL") {
    if (!selectedDevice) {
      return;
    }

    const targets = [row.fanTarget, row.lightTarget].filter(Boolean);

    if (!targets.length) {
      return;
    }

    try {
      setControlLoading(`${row.id}-${mode}`);

      await Promise.all(
        targets.map((target) =>
          apiRequest(`/user/devices/${selectedDevice.id}/commands`, {
            method: "POST",
            body: JSON.stringify({
              target,
              action: "set",
              value: getBooleanState(selectedDevice.state, target),
              mode,
            }),
          }),
        ),
      );

      await loadHome(false);
    } catch (err: any) {
      Alert.alert("Control failed", err?.message || "Unable to change mode.");
    } finally {
      setControlLoading(null);
    }
  }

  /* --------------------------------------------------------------------------
     LOADING
  -------------------------------------------------------------------------- */

  if (loading) {
    return (
      <View className="flex-1 bg-black">
        <View
          className="bg-primary"
          style={{
            height: insets.top,
          }}
        />

        <StatusBar style="dark" />

        <View className="flex-1 items-center justify-center">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#E7EF58]">
            <ActivityIndicator size="small" color="#000000" />
          </View>

          <AppText className="mt-4 text-[15px] text-zinc-500">
            Loading your garden
          </AppText>
        </View>
      </View>
    );
  }

  /* --------------------------------------------------------------------------
     MAIN
  -------------------------------------------------------------------------- */

  return (
    <View className="flex-1 bg-black">
      {/* DYNAMIC TOP SAFE AREA */}

      <View
        style={{
          height: insets.top,
        }}
        className={isScrolled ? "bg-black" : "bg-primary"}
      />

      <StatusBar style={isScrolled ? "light" : "dark"} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={THEME.lemon}
            colors={[THEME.lemon]}
          />
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120,
        }}
      >
        {/* ================================================================
            HERO
        ================================================================ */}

        {selectedDevice ? (
          <View className="overflow-hidden rounded-b-[30px] border-b border-white/[0.08]">
            <View className="relative h-[500px] overflow-hidden">
              {/* PRIMARY */}
              <View className="absolute inset-0 bg-black" />

              <LinearGradient
                colors={[
                  "#C8FF67", // 0% - Solid primary
                  "#C8FF67", // 20% - Solid primary until here
                  "rgba(200, 255, 103, 0.60)", // 40% - Start fading
                  "rgba(200, 255, 103, 0.20)", // 70% - Mostly faded
                  "transparent", // 100% - Fully transparent at the bottom
                ]}
                locations={[0, 0.2, 0.4, 0.7, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                className="absolute inset-0"
              />
              {/* GREETING */}

              <View className="absolute left-5 right-5 top-5 z-30 flex-row items-center justify-between">
                <AppText
                  className="text-[20px] tracking-[-0.5px] text-black"
                  weight="medium"
                >
                  Hi, {username}
                </AppText>

                <Pressable
                  onPress={() => router.push("/profile")}
                  className="h-10 w-10 items-center justify-center rounded-full bg-black/20"
                >
                  <AppText
                    className="text-[15px] text-[#E7EF58]"
                    weight="semibold"
                  >
                    {username.charAt(0).toUpperCase()}
                  </AppText>
                </Pressable>
              </View>

              {/* DEVICE IMAGE */}

              {selectedDevice.deviceModel.imageUrl ? (
                <Animated.View
                  style={{
                    transform: [
                      { translateY: rackTranslateY },
                      { scale: rackScale },
                    ],
                  }}
                  className={`absolute left-2 right-2 z-10 ${
                    isRack
                      ? "bottom-[70px] h-[320px]"
                      : "bottom-[86px] h-[330px]"
                  }`}
                >
                  <Image
                    source={{
                      uri: selectedDevice.deviceModel.imageUrl,
                    }}
                    resizeMode="contain"
                    className="h-full w-full"
                  />
                </Animated.View>
              ) : (
                <View className="absolute bottom-[160px] left-0 right-0 z-10 items-center">
                  <View className="h-20 w-20 items-center justify-center rounded-[27px] bg-[#BFFF45]">
                    <Ionicons
                      name={isRack ? "leaf-outline" : "hardware-chip-outline"}
                      size={34}
                      color="#000000"
                    />
                  </View>
                </View>
              )}

              {/* DEVICE NAME + STATUS */}

              <View className="absolute bottom-[92px] left-4 right-4 z-30">
                <Pressable
                  onPress={() => setDeviceSheetOpen(true)}
                  className="flex-row items-center justify-between rounded-[17px] bg-primaryDark1 px-4 py-3 mb-1"
                >
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center">
                      <AppText
                        numberOfLines={1}
                        className="max-w-[230px] text-[19px] tracking-[-0.5px] text-white"
                        weight="semibold"
                      >
                        {selectedDevice.name || selectedDevice.deviceModel.name}
                      </AppText>

                      <Ionicons
                        name="chevron-down"
                        size={15}
                        color="#C8FF58"
                        style={{
                          marginLeft: 6,
                        }}
                      />
                    </View>

                    <View className="mt-1 flex-row items-center">
                      <AppText className="text-[11px] text-white/45">
                        {selectedDevice.deviceCode}
                      </AppText>

                      <View
                        className={`ml-3 h-2 w-2 rounded-full ${
                          isOnline(selectedDevice.lastSeenAt)
                            ? "bg-[#C8FF58]"
                            : "bg-[#F0646B]"
                        }`}
                      />

                      <AppText
                        className={`ml-1.5 text-[11px] ${
                          isOnline(selectedDevice.lastSeenAt)
                            ? "text-[#C8FF58]"
                            : "text-[#F0646B]"
                        }`}
                      >
                        {isOnline(selectedDevice.lastSeenAt)
                          ? "Online"
                          : "Offline"}
                      </AppText>
                    </View>
                  </View>

                  <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                    <Ionicons
                      name="swap-vertical-outline"
                      size={17}
                      color="#FFFFFF"
                    />
                  </View>
                </Pressable>
              </View>

              {/* STATS OVER IMAGE */}

              <View className="absolute bottom-3 left-3 right-3 z-40 rounded-[20px] bg-black/85 p-2">
                {isRack ? (
                  <View className="flex-row">
                    <HeroStat
                      value={
                        temperatureValue === null
                          ? "--"
                          : `${formatValue(temperatureValue)}°`
                      }
                      label="Temperature"
                    />

                    <HeroStat
                      value={
                        humidityValue === null
                          ? "--"
                          : `${formatValue(humidityValue)}%`
                      }
                      label="Humidity"
                    />

                    <HeroStat value={String(occupiedTrays)} label="Occupied" />
                  </View>
                ) : (
                  <GenericHeroStats
                    sensors={numericSensors}
                    data={latestData}
                  />
                )}
              </View>
            </View>
          </View>
        ) : (
          <EmptyDevice />
        )}

        {/* ================================================================
            RACK
        ================================================================ */}

        {isRack && rack ? (
          <View className="mt-8 px-5">
            <View className="flex-row items-end justify-between">
              <View>
                <AppText
                  className="mt-1 text-[29px] tracking-[-1px] text-white"
                  weight="semibold"
                >
                  Your Trays
                </AppText>
              </View>

              <AppText className="pb-1 text-[14px] text-zinc-500">
                {rows.length} {rows.length === 1 ? "row" : "rows"}
              </AppText>
            </View>

            <View className="mt-4">
              {rows.map((row) => (
                <ExpandableRow
                  key={row.id}
                  row={row}
                  expanded={expandedRows.has(row.id)}
                  deviceState={selectedDevice.state}
                  controlLoading={controlLoading}
                  onToggle={() => toggleRow(row.id)}
                  onAddCrop={(tray) => openPlantCrop(row, tray)}
                  onHarvestCrop={(crop, tray) =>
                    promptHarvestForTray(crop, tray, row)
                  }
                  now={clockNow}
                  onToggleActuator={(target, value) =>
                    sendCommand(target, value, "MANUAL")
                  }
                  onSetMode={(mode) => setRowMode(row, mode)}
                />
              ))}
            </View>

            {/* RACK SUMMARY */}

            {/* <View className="mt-5 rounded-[20px] border border-white/[0.05] bg-[#0C120C] px-4 py-4">
              <View className="flex-row">
                <MiniValue
                  value={`${occupiedTrays}/${totalTrays}`}
                  label="Occupied"
                />

                <MiniDivider />

                <MiniValue value={String(growingTrays)} label="Growing" />

                <MiniDivider />

                <MiniValue value={String(readyTrays)} label="Ready" />
              </View>
            </View> */}
          </View>
        ) : null}

        {/* ================================================================
            GENERIC DEVICE
        ================================================================ */}

        {!isRack && selectedDevice ? (
          <View className="mt-8 px-5">
            <AppText
              className="text-[12px] uppercase tracking-[1.7px] text-[#E7EF58]"
              weight="medium"
            >
              Device
            </AppText>

            <AppText
              className="mt-1 text-[29px] tracking-[-1px] text-white"
              weight="semibold"
            >
              Controls
            </AppText>

            <View className="mt-4">
              <GenericControls
                device={selectedDevice}
                controlLoading={controlLoading}
                onCommand={(target, value, mode) =>
                  sendCommand(target, value, mode)
                }
              />
            </View>

            {numericSensors.length > 0 ? (
              <View className="mt-9">
                <AppText
                  className="text-[12px] uppercase tracking-[1.7px] text-[#E7EF58]"
                  weight="medium"
                >
                  Monitoring
                </AppText>

                <AppText
                  className="mt-1 text-[29px] tracking-[-1px] text-white"
                  weight="semibold"
                >
                  Live data
                </AppText>

                <View className="mt-4 flex-row flex-wrap justify-between">
                  {numericSensors.map((sensor) => (
                    <View
                      key={sensor.key}
                      className="mb-3 w-[48.3%] rounded-2xl border border-white/[0.06] bg-[#111611] px-4 py-4"
                    >
                      <View className="flex-row items-center justify-between">
                        <AppText
                          className="flex-1 text-[10px] uppercase tracking-[1px] text-zinc-500"
                          weight="medium"
                        >
                          {sensor.label || sensor.key}
                        </AppText>

                        <Ionicons
                          name={getSensorIcon(sensor.key)}
                          size={16}
                          color="#C8FF58"
                        />
                      </View>

                      <AppText
                        className="mt-5 text-[25px] tracking-[-0.8px] text-white"
                        weight="semibold"
                      >
                        {formatSensor(latestData[sensor.key], sensor)}
                        {sensor.unit ? ` ${sensor.unit}` : ""}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ================================================================
            ERROR
        ================================================================ */}

        {error ? (
          <View className="mx-5 mt-6 rounded-2xl border border-red-500/10 bg-red-500/10 px-4 py-3">
            <View className="flex-row items-start">
              <Ionicons name="alert-circle-outline" size={18} color="#F0646B" />

              <AppText className="ml-2 flex-1 text-[13px] leading-5 text-red-300">
                {error}
              </AppText>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* ================================================================
          DEVICE SWITCHER
      ================================================================ */}

      <DeviceSelector
        visible={deviceSheetOpen}
        devices={devices}
        selectedId={selectedDevice?.id ?? null}
        onClose={() => setDeviceSheetOpen(false)}
        onSelect={(id) => {
          setSelectedDeviceId(id);

          setDeviceSheetOpen(false);

          setExpandedRows(new Set());
        }}
      />

      {/* ================================================================
          ADD CROP
      ================================================================ */}

      <Modal
        visible={plantModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => !planting && setPlantModalOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/70">
          <Pressable
            className="flex-1"
            onPress={() => !planting && setPlantModalOpen(false)}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              className="rounded-t-[30px] bg-[#0C0F0C] px-6 pt-5"
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom + 18, 28),
              }}
            >
              <View className="mx-auto h-1.5 w-10 rounded-full bg-zinc-700" />

              <AppText
                className="mt-6 text-[30px] tracking-[-1px] text-white"
                weight="semibold"
              >
                Add a crop
              </AppText>

              {selectedTray ? (
                <AppText className="mt-2 text-[14px] text-zinc-500">
                  Layer {selectedTray.row.rowNumber}
                  {" · "}
                  Tray {selectedTray.tray.slot}
                </AppText>
              ) : null}

              <AppText className="mb-2 mt-7 text-[13px] text-zinc-400">
                Crop name
              </AppText>

              <TextInput
                value={cropName}
                onChangeText={setCropName}
                placeholder="e.g. Basil"
                placeholderTextColor="#555D56"
                editable={!planting}
                className="h-14 rounded-2xl border border-white/[0.06] bg-[#151915] px-4 text-[16px] text-white"
              />

              <AppText className="mb-2 mt-5 text-[13px] text-zinc-400">
                Estimated growth
              </AppText>

              <View className="flex-row items-center">
                <TextInput
                  value={growthDays}
                  onChangeText={setGrowthDays}
                  keyboardType="number-pad"
                  editable={!planting}
                  className="h-14 w-24 rounded-2xl border border-white/[0.06] bg-[#151915] px-4 text-[17px] text-white"
                />
                <AppText className="ml-3 text-[14px] text-zinc-500">
                  days
                </AppText>
              </View>

              {/* --- SOWING DATE SECTION --- */}
              <AppText className="mb-2 mt-5 text-[13px] text-zinc-400">
                Sowing date
              </AppText>

              <View className="flex-row items-center space-x-3">
                {/* Today Option */}
                <Pressable
                  onPress={() => {
                    setDateOption("today");
                    setSowingDate(new Date());
                  }}
                  className={`h-12 flex-1 items-center justify-center rounded-xl border ${
                    dateOption === "today"
                      ? "border-primary bg-primary/20"
                      : "border-white/[0.06] bg-[#151915]"
                  }`}
                >
                  <AppText
                    className={`text-[15px] ${
                      dateOption === "today" ? "text-primary" : "text-zinc-400"
                    }`}
                    weight="medium"
                  >
                    Today
                  </AppText>
                </Pressable>

                {/* Select Custom Date Option */}
                <Pressable
                  onPress={() => setDateOption("custom")}
                  className={`h-12 flex-1 items-center justify-center rounded-xl border ${
                    dateOption === "custom"
                      ? "border-primary bg-primary/20"
                      : "border-white/[0.06] bg-[#151915]"
                  }`}
                >
                  <AppText
                    className={`text-[15px] ${
                      dateOption === "custom" ? "text-primary" : "text-zinc-400"
                    }`}
                    weight="medium"
                  >
                    {dateOption === "custom"
                      ? sowingDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : "Select date..."}
                  </AppText>
                </Pressable>
              </View>

              {/* --- MODERN INLINE DARK CALENDAR --- */}
              {/* --- SHADCN-STYLE INLINE DARK CALENDAR --- */}
              {/* --- SHADCN-STYLE INLINE DARK CALENDAR (v3 Fix) --- */}
              {dateOption === "custom" && (
                <View className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-[#09090b] p-2">
                  <DateTimePicker
                    mode="single"
                    date={sowingDate}
                    onChange={(params) => {
                      if (params.date) {
                        // Fix 1: Properly convert the DateType to a JS Date using dayjs
                        setSowingDate(dayjs(params.date).toDate());
                      }
                    }}
                    // Fix 2: v3.x moved all styles into a single 'styles' prop
                    styles={
                      {
                        ...defaultStyles,
                        headerText: {
                          color: "#fafafa",
                          fontWeight: "600",
                          fontSize: 14,
                        },
                        weekDaysText: {
                          color: "#a1a1aa",
                          fontWeight: "400",
                          fontSize: 13,
                        },
                        dayText: { color: "#a1a1aa", fontWeight: "400" },
                        selectedDay: { backgroundColor: "#fafafa" },
                        selectedDayText: {
                          color: "#09090b",
                          fontWeight: "600",
                        },
                        todayContainer: {
                          backgroundColor: "#27272a",
                          borderWidth: 0,
                        },
                        todayText: { color: "#fafafa", fontWeight: "600" },
                      } as any
                    } // 'as any' bypasses strict TS checking for exact key names
                  />
                </View>
              )}
              <Pressable
                onPress={() => void plantCrop()}
                disabled={planting}
                className="mt-7 h-14 items-center justify-center rounded-2xl bg-primary active:opacity-80"
              >
                {planting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <AppText className="text-[16px] text-black" weight="semibold">
                    Add to tray
                  </AppText>
                )}
              </Pressable>

              <Pressable
                onPress={() => setPlantModalOpen(false)}
                disabled={planting}
                className="mt-3 items-center py-3"
              >
                <AppText className="text-[15px] text-zinc-500" weight="medium">
                  Cancel
                </AppText>
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Harvest check-in: queued one at a time so multiple due trays never stack alerts. */}
      <Modal
        visible={harvestQueue.length > 0 && !plantModalOpen && !deviceSheetOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View className="flex-1 justify-end bg-black/75">
          <View className="flex-1" />
          {harvestQueue[0] ? (
            <View
              className="overflow-hidden rounded-t-[30px] border border-white/[0.08] bg-[#0B100B] px-5 pt-5"
              style={{ paddingBottom: Math.max(insets.bottom + 16, 28) }}
            >
              <View className="mx-auto h-1.5 w-10 rounded-full bg-zinc-700" />
              <View className="mt-5 flex-row items-center justify-between">
                <View className="flex-row items-center gap-2 rounded-full bg-[#252A12] px-3 py-1.5">
                  <View className="h-1.5 w-1.5 rounded-full bg-[#E7EF58]" />
                  <AppText
                    weight="semibold"
                    className="text-[10px] uppercase tracking-[1px] text-[#E7EF58]"
                  >
                    Harvest check-in
                  </AppText>
                </View>
                <AppText className="text-[11px] text-zinc-500">
                  {harvestQueue.length > 1
                    ? `${harvestQueue.length} crops to review`
                    : "One quick check"}
                </AppText>
              </View>

              <View className="mt-5 flex-row items-center gap-4 rounded-[22px] border border-white/[0.06] bg-[#121812] p-4">
                <View className="h-[86px] w-[86px] items-center justify-center overflow-hidden rounded-[18px] bg-[#1A2318]">
                  <Image
                    source={{ uri: SAPLING_IMAGE_URL }}
                    resizeMode="contain"
                    className="h-full w-full"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <AppText
                    weight="semibold"
                    className="text-[21px] leading-7 text-white"
                  >
                    {harvestQueue[0].cropName}
                  </AppText>
                  <AppText className="mt-1 text-[12px] text-zinc-400">
                    {harvestQueue[0].tray?.row?.rack?.name ??
                      "Your growing rack"}
                  </AppText>
                  <AppText className="mt-1 text-[11px] text-zinc-500">
                    {harvestQueue[0].tray?.row?.rowNumber
                      ? `Layer ${harvestQueue[0].tray.row.rowNumber} · `
                      : ""}
                    {harvestQueue[0].tray?.name ??
                      (harvestQueue[0].tray?.slot
                        ? `Tray ${harvestQueue[0].tray.slot}`
                        : "Your tray")}
                  </AppText>
                </View>
              </View>

              <AppText
                weight="semibold"
                className="mt-5 text-[22px] leading-7 text-white"
              >
                Have you harvested it?
              </AppText>
              <AppText className="mt-2 text-[13px] leading-5 text-zinc-400">
                This crop was expected to be ready on{" "}
                {formatHarvestDate(harvestQueue[0].expectedHarvestDate)}.
                Confirm its status so your growing timeline stays accurate.
              </AppText>

              {harvestQueue[0].timing?.isOverdue ? (
                <View className="mt-4 flex-row items-center gap-2 rounded-[14px] border border-[#51451E] bg-[#211E11] px-3 py-3">
                  <Ionicons name="time-outline" size={17} color="#E7EF58" />
                  <AppText className="flex-1 text-[11px] leading-4 text-[#D8D3B5]">
                    Your harvest date has passed. If it needs more time, choose
                    “Not yet” and we’ll check again tomorrow.
                  </AppText>
                </View>
              ) : null}

              <Pressable
                onPress={() => void answerHarvestCheck(true)}
                disabled={harvestSaving}
                className="mt-5 min-h-[54px] flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 active:opacity-80"
                accessibilityRole="button"
              >
                {harvestSaving ? (
                  <ActivityIndicator size="small" color="#080A06" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#080A06"
                  />
                )}
                <AppText weight="semibold" className="text-[14px] text-black">
                  {harvestSaving ? "Saving…" : "Yes, harvested"}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => void answerHarvestCheck(false)}
                disabled={harvestSaving}
                className="mt-2 min-h-[50px] flex-row items-center justify-center gap-2 rounded-full border border-white/[0.1] bg-[#171D17] px-4 active:opacity-80"
                accessibilityRole="button"
              >
                <Ionicons name="time-outline" size={17} color="#D9DED8" />
                <AppText weight="medium" className="text-[13px] text-white">
                  Not yet · Remind me tomorrow
                </AppText>
              </Pressable>
              <AppText className="mt-3 text-center text-[10px] leading-4 text-zinc-600">
                You can still update harvest status from this tray at any time.
              </AppText>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

/* ============================================================================
   HERO STAT
============================================================================ */

function HeroStat({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <View className="flex-1 px-1">
      <View
        className={`items-center rounded-[14px] py-3 ${
          accent ? "bg-[#BFFF45]" : "bg-[#182118]"
        }`}
      >
        <AppText
          className={`text-[21px] tracking-[-0.8px] ${
            accent ? "text-black" : "text-white"
          }`}
          weight="semibold"
        >
          {value}
        </AppText>

        <AppText
          className={`mt-1 text-[10px] ${
            accent ? "text-black/50" : "text-zinc-500"
          }`}
        >
          {label}
        </AppText>
      </View>
    </View>
  );
}

/* ============================================================================
   GENERIC HERO STATS
============================================================================ */

function GenericHeroStats({
  sensors,
  data,
}: {
  sensors: DeviceCapability[];
  data: Record<string, unknown>;
}) {
  const visible = sensors.slice(0, 3);

  if (!visible.length) {
    return (
      <View className="items-center py-3">
        <AppText className="text-[13px] text-zinc-500">No sensor data</AppText>
      </View>
    );
  }

  return (
    <View className="flex-row">
      {visible.map((sensor, index) => (
        <HeroStat
          key={sensor.key}
          accent={index === 0}
          value={`${formatSensor(data[sensor.key], sensor)}${
            sensor.unit ? ` ${sensor.unit}` : ""
          }`}
          label={sensor.label || sensor.key}
        />
      ))}
    </View>
  );
}

/* ============================================================================
   EXPANDABLE ROW
============================================================================ */

function ExpandableRow({
  row,
  expanded,
  deviceState,
  controlLoading,
  onToggle,
  onAddCrop,
  onHarvestCrop,
  now,
  onToggleActuator,
  onSetMode,
}: {
  row: RackRow;
  expanded: boolean;
  deviceState: DeviceState | null;
  controlLoading: string | null;
  onToggle: () => void;
  onAddCrop: (tray: Tray) => void;
  onHarvestCrop: (crop: CropCycle, tray: Tray) => void;
  now: number;
  onToggleActuator: (target: string, value: boolean) => void;
  onSetMode: (mode: "AUTO" | "MANUAL") => void;
}) {
  const trays = [...(row.trays ?? [])]
    .sort((a, b) => a.slot - b.slot)
    .slice(0, 4);

  const fanOn = getBooleanState(deviceState, row.fanTarget);

  const lightOn = getBooleanState(deviceState, row.lightTarget);

  const fanMode = getMode(deviceState, row.fanTarget);

  const lightMode = getMode(deviceState, row.lightTarget);

  const rowMode = fanMode === lightMode ? fanMode : "AUTO";

  const modeLoading =
    controlLoading === `${row.id}-AUTO` ||
    controlLoading === `${row.id}-MANUAL`;

  return (
    <View
      className={`mb-3 overflow-hidden rounded-[21px] border ${
        expanded
          ? "border-[#2A371E] bg-[#071107]"
          : "border-white/[0.05] bg-[#071107]"
      }`}
    >
      {/* ROW HEADER */}

      <Pressable
        onPress={onToggle}
        className="flex-row items-center justify-between px-5 py-5 active:bg-[#0B170B]"
      >
        <View className="flex-row items-center">
          <View className="ml-3">
            <AppText className="text-[19px] text-[#cccccc]" weight="medium">
              Layer {row.rowNumber}
            </AppText>

            <AppText className="mt-1 text-[12px] text-zinc-600">
              {trays.length} trays
            </AppText>
          </View>
        </View>

        <View className="flex-row items-center">
          <AppText className="mr-3 text-[11px] text-zinc-600">
            {rowMode.toLowerCase()}
          </AppText>

          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#656D65"
          />
        </View>
      </Pressable>

      {expanded ? (
        <View className="px-3 pb-4">
          {/* TRAYS */}

          <View className="flex-row flex-wrap justify-between">
            {trays.map((tray) => (
              <TrayCard
                key={tray.id}
                tray={tray}
                onAdd={() => onAddCrop(tray)}
                now={now}
                onHarvest={
                  tray.currentCrop
                    ? () => onHarvestCrop(tray.currentCrop!, tray)
                    : undefined
                }
              />
            ))}
          </View>

          {/* CONTROLS */}

          <AppText
            className="mb-3 mt-2 px-1 text-[19px] text-white"
            weight="medium"
          >
            Controls
          </AppText>

          {/* MODE */}

          <View className="flex-row gap-2 px-1">
            <Pressable
              onPress={() => onSetMode("AUTO")}
              disabled={modeLoading}
              className={`rounded-[9px] px-5 py-2.5 ${
                rowMode === "AUTO"
                  ? "bg-[#BFFF45]"
                  : "border border-[#26351D] bg-[#101810]"
              }`}
            >
              <AppText
                className={`text-[12px] ${
                  rowMode === "AUTO" ? "text-black" : "text-white"
                }`}
                weight="medium"
              >
                auto
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => onSetMode("MANUAL")}
              disabled={modeLoading}
              className={`rounded-[9px] px-5 py-2.5 ${
                rowMode === "MANUAL"
                  ? "bg-[#BFFF45]"
                  : "border border-[#26351D] bg-[#101810]"
              }`}
            >
              <AppText
                className={`text-[12px] ${
                  rowMode === "MANUAL" ? "text-black" : "text-white"
                }`}
                weight="medium"
              >
                manual
              </AppText>
            </Pressable>
          </View>

          {/* FAN */}

          <ControlRow
            icon="fan"
            title="Fan"
            target={row.fanTarget}
            enabled={fanOn}
            loading={controlLoading?.startsWith(`${row.fanTarget}-`) ?? false}
            onPress={() => onToggleActuator(row.fanTarget, !fanOn)}
          />

          {/* LIGHT */}

          <ControlRow
            icon="bulb-outline"
            title="Light"
            target={row.lightTarget}
            enabled={lightOn}
            loading={controlLoading?.startsWith(`${row.lightTarget}-`) ?? false}
            onPress={() => onToggleActuator(row.lightTarget, !lightOn)}
          />
        </View>
      ) : null}
    </View>
  );
}

/* ============================================================================
   TRAY CARD
============================================================================ */

function TrayCard({
  tray,
  onAdd,
  onHarvest,
  now,
}: {
  tray: Tray;
  onAdd: () => void;
  onHarvest?: () => void;
  now: number;
}) {
  const crop = tray.currentCrop;
  const due = Boolean(
    crop &&
    (crop.status === "READY" ||
      new Date(crop.expectedHarvestDate).getTime() <= now),
  );
  const countdown = crop
    ? formatHarvestCountdown(crop.expectedHarvestDate, now)
    : null;

  return (
    <View
      className={`mb-3 w-[48.3%] overflow-hidden rounded-[18px] border ${due ? "border-[#596323]" : "border-white/[0.07]"} bg-[#141914]`}
    >
      <View className="h-[126px] bg-[#161C16]">
        <Image
          source={{ uri: crop ? SAPLING_IMAGE_URL : EMPTY_TRAY_IMAGE_URL }}
          resizeMode="contain"
          className="h-full w-full"
        />
        {crop ? (
          <View
            className={`absolute right-2 top-2 rounded-full px-2.5 py-1 ${due ? "bg-[#E7EF58]" : "bg-[#293419]"}`}
          >
            <AppText
              weight="semibold"
              className={`text-[9px] ${due ? "text-black" : "text-[#C8FF58]"}`}
            >
              {due ? "HARVEST DUE" : countdown}
            </AppText>
          </View>
        ) : null}
      </View>

      {crop ? (
        <View className="px-3 pb-3.5 pt-2.5">
          <AppText className="text-[10px] text-zinc-600">
            Tray {tray.slot}
          </AppText>
          <AppText
            weight="semibold"
            numberOfLines={1}
            className="mt-1 text-[16px] text-white"
          >
            {crop.cropName}
          </AppText>
          <View className="mt-2.5 flex-row items-start gap-1.5">
            <Ionicons
              name={due ? "alert-circle-outline" : "leaf-outline"}
              size={13}
              color={due ? "#E7EF58" : "#BFFF45"}
              style={{ marginTop: 1 }}
            />
            <AppText
              className={`flex-1 text-[10px] leading-4 ${due ? "text-[#E7EF58]" : "text-zinc-500"}`}
            >
              {due
                ? "Please confirm whether this crop has been harvested."
                : `Expected ${formatHarvestDate(crop.expectedHarvestDate)} · ${countdown}`}
            </AppText>
          </View>
          {due && onHarvest ? (
            <Pressable
              onPress={onHarvest}
              accessibilityRole="button"
              accessibilityLabel={`Confirm harvest for ${crop.cropName}`}
              className="mt-3 min-h-[38px] flex-row items-center justify-center gap-1.5 rounded-full bg-[#c7faaa] px-2 active:opacity-80"
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={15}
                color="#090B08"
              />
              <AppText weight="semibold" className="text-[10px] text-black">
                Confirm harvest
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add a crop to ${tray.name}`}
          className="items-center px-3 pb-4 pt-3 active:opacity-70"
        >
          <View className="flex-row items-center gap-1.5 rounded-full bg-[#29361D] px-4 py-2">
            <Ionicons name="add" size={14} color="#C8FF58" />
            <AppText weight="medium" className="text-[11px] text-[#C8FF58]">
              Add a crop
            </AppText>
          </View>
        </Pressable>
      )}
    </View>
  );
}

/* ============================================================================
   CONTROL ROW
============================================================================ */

function ControlRow({
  icon,
  title,
  target,
  enabled,
  loading,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap | "fan";
  title: string;
  target: string;
  enabled: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <View className="mt-2 flex-row items-center justify-between rounded-[12px] border border-[#243219] bg-[#091008] px-3.5 py-2.5">
      <View className="flex-row items-center">
        {icon === "fan" ? (
          <MaterialCommunityIcons name="fan" size={21} color="#BFFF45" />
        ) : (
          <Ionicons name={icon} size={21} color="#BFFF45" />
        )}

        <AppText className="ml-3 text-[15px] text-white">{title}</AppText>
      </View>

      <Pressable
        onPress={onPress}
        disabled={!target || loading}
        className={`h-7 w-12 justify-center rounded-full px-1 ${
          enabled ? "bg-[#BFFF45]" : "bg-[#2B312B]"
        } ${!target ? "opacity-30" : ""}`}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={enabled ? "#000000" : "#8A918A"}
          />
        ) : (
          <View
            className={`h-5 w-5 rounded-full ${
              enabled ? "ml-auto bg-black" : "bg-[#858B85]"
            }`}
          />
        )}
      </Pressable>
    </View>
  );
}

/* ============================================================================
   GENERIC CONTROLS
============================================================================ */

function GenericControls({
  device,
  controlLoading,
  onCommand,
}: {
  device: Device;
  controlLoading: string | null;
  onCommand: (
    target: string,
    value: boolean | number | string,
    mode: "AUTO" | "MANUAL",
  ) => void;
}) {
  const actuators = device.deviceModel.capabilities?.actuators ?? [];

  if (!actuators.length) {
    return (
      <View className="rounded-2xl border border-white/[0.06] bg-[#101610] px-5 py-5">
        <AppText className="text-[14px] text-zinc-500">
          No controllable outputs on this device.
        </AppText>
      </View>
    );
  }

  return (
    <View>
      {actuators.map((actuator) => {
        const desired = device.state?.desired?.[actuator.key];

        const actual = device.state?.actual?.[actuator.key];

        if (actuator.type === "boolean") {
          const enabled =
            typeof desired === "boolean"
              ? desired
              : typeof actual === "boolean"
                ? actual
                : false;

          const loading = controlLoading === `${actuator.key}-MANUAL`;

          return (
            <View
              key={actuator.key}
              className="mb-2 flex-row items-center justify-between rounded-[13px] border border-[#243219] bg-[#091008] px-4 py-3"
            >
              <View className="flex-row items-center">
                <Ionicons
                  name={getActuatorIcon(actuator.key)}
                  size={20}
                  color="#BFFF45"
                />

                <View className="ml-3">
                  <AppText className="text-[15px] text-white">
                    {actuator.label || actuator.key}
                  </AppText>

                  <AppText className="mt-0.5 text-[10px] text-zinc-600">
                    Manual
                  </AppText>
                </View>
              </View>

              <Pressable
                onPress={() => onCommand(actuator.key, !enabled, "MANUAL")}
                disabled={loading}
                className={`h-7 w-12 justify-center rounded-full px-1 ${
                  enabled ? "bg-[#BFFF45]" : "bg-[#2B312B]"
                }`}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <View
                    className={`h-5 w-5 rounded-full ${
                      enabled ? "ml-auto bg-black" : "bg-[#858B85]"
                    }`}
                  />
                )}
              </Pressable>
            </View>
          );
        }

        if (actuator.type === "number") {
          const current =
            typeof desired === "number"
              ? desired
              : typeof actual === "number"
                ? actual
                : (actuator.min ?? 0);

          const min = actuator.min ?? 0;

          const max = actuator.max ?? 100;

          const step = Math.max(1, Math.round((max - min) / 20));

          const loading = controlLoading === `${actuator.key}-MANUAL`;

          return (
            <View
              key={actuator.key}
              className="mb-2 rounded-[13px] border border-[#243219] bg-[#091008] px-4 py-3"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons
                    name="speedometer-outline"
                    size={20}
                    color="#BFFF45"
                  />

                  <AppText className="ml-3 text-[15px] text-white">
                    {actuator.label || actuator.key}
                  </AppText>
                </View>

                <AppText
                  className="text-[15px] text-[#C8FF58]"
                  weight="semibold"
                >
                  {formatValue(current)}
                  {actuator.unit ? ` ${actuator.unit}` : ""}
                </AppText>
              </View>

              <View className="mt-3 flex-row gap-2">
                <Pressable
                  disabled={loading}
                  onPress={() =>
                    onCommand(
                      actuator.key,
                      Math.max(min, current - step),
                      "MANUAL",
                    )
                  }
                  className="h-10 flex-1 items-center justify-center rounded-xl bg-[#182118]"
                >
                  <AppText className="text-[20px] text-white">−</AppText>
                </Pressable>

                <Pressable
                  disabled={loading}
                  onPress={() =>
                    onCommand(
                      actuator.key,
                      Math.min(max, current + step),
                      "MANUAL",
                    )
                  }
                  className="h-10 flex-1 items-center justify-center rounded-xl bg-[#BFFF45]"
                >
                  <AppText className="text-[20px] text-black" weight="semibold">
                    +
                  </AppText>
                </Pressable>
              </View>
            </View>
          );
        }

        return (
          <View
            key={actuator.key}
            className="mb-2 rounded-[13px] border border-white/[0.06] bg-[#101610] px-4 py-4"
          >
            <AppText className="text-[15px] text-white">
              {actuator.label || actuator.key}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/* ============================================================================
   DEVICE SELECTOR
============================================================================ */

function DeviceSelector({
  visible,
  devices,
  selectedId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  devices: Device[];
  selectedId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />

        <View
          className="max-h-[76%] rounded-t-[29px] bg-[#0B0F0B] px-5 pt-4"
          style={{
            paddingBottom: Math.max(insets.bottom + 18, 28),
          }}
        >
          <View className="mx-auto h-1.5 w-10 rounded-full bg-zinc-700" />

          <View className="mt-5 flex-row items-center justify-between">
            <View>
              <AppText
                className="text-[27px] tracking-[-0.9px] text-white"
                weight="semibold"
              >
                Devices
              </AppText>

              <AppText className="mt-1 text-[13px] text-zinc-500">
                Select what appears on Home
              </AppText>
            </View>

            <Pressable
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-[#171C17]"
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-5">
            {devices.map((device) => {
              const selected = device.id === selectedId;

              const rack = device.deviceModel.kind === "RACK";

              return (
                <Pressable
                  key={device.id}
                  onPress={() => onSelect(device.id)}
                  className={`mb-3 overflow-hidden rounded-[19px] border ${
                    selected
                      ? "border-[#E7EF58] bg-primary"
                      : "border-white/[0.06] bg-[#121712]"
                  }`}
                >
                  <View className="flex-row items-center px-4 py-4">
                    <View
                      className={`h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ${
                        selected ? "bg-black/10" : "bg-[#1A211A]"
                      }`}
                    >
                      {device.deviceModel.imageUrl ? (
                        <Image
                          source={{
                            uri: device.deviceModel.imageUrl,
                          }}
                          resizeMode="contain"
                          className="h-12 w-12"
                        />
                      ) : (
                        <Ionicons
                          name={rack ? "leaf-outline" : "hardware-chip-outline"}
                          size={23}
                          color="#707870"
                        />
                      )}
                    </View>

                    <View className="ml-3 flex-1">
                      <AppText
                        numberOfLines={1}
                        className={`text-[16px] ${
                          selected ? "text-black" : "text-white"
                        }`}
                        weight="semibold"
                      >
                        {device.name || device.deviceModel.name}
                      </AppText>

                      <AppText
                        className={`mt-1 text-[12px] ${
                          selected ? "text-black/50" : "text-zinc-500"
                        }`}
                      >
                        {device.deviceCode}
                      </AppText>

                      <View className="mt-2 flex-row items-center">
                        <View
                          className={`h-1.5 w-1.5 rounded-full ${
                            isOnline(device.lastSeenAt)
                              ? "bg-[#BFFF45]"
                              : "bg-[#F0646B]"
                          }`}
                        />

                        <AppText
                          className={`ml-1.5 text-[11px] ${
                            selected ? "text-black/50" : "text-zinc-500"
                          }`}
                        >
                          {rack ? "Rack" : "Device"} ·{" "}
                          {isOnline(device.lastSeenAt) ? "Online" : "Offline"}
                        </AppText>
                      </View>
                    </View>

                    {selected ? (
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-black/10">
                        <Ionicons name="checkmark" size={17} color="#000000" />
                      </View>
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={17}
                        color="#555D56"
                      />
                    )}
                  </View>

                  {selected ? (
                    <View className="border-t border-black/10 px-4 py-2.5">
                      <AppText
                        className="text-[10px] uppercase tracking-[1px] text-black/45"
                        weight="semibold"
                      >
                        Currently selected
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ============================================================================
   EMPTY STATE
============================================================================ */

function EmptyDevice() {
  return (
    <View className="items-center bg-[#0E140E] px-6 py-14">
      <View className="h-16 w-16 items-center justify-center rounded-[24px] bg-[#E7EF58]">
        <Ionicons name="hardware-chip-outline" size={30} color="#000000" />
      </View>

      <AppText
        className="mt-5 text-[24px] tracking-[-0.7px] text-white"
        weight="semibold"
      >
        No device connected
      </AppText>

      <AppText className="mt-2 max-w-[280px] text-center text-[14px] leading-5 text-zinc-500">
        Connect an AgriTech device to start monitoring and controlling it.
      </AppText>
    </View>
  );
}

/* ============================================================================
   RACK SUMMARY
============================================================================ */

function MiniValue({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1">
      <AppText
        className="text-[20px] tracking-[-0.5px] text-white"
        weight="semibold"
      >
        {value}
      </AppText>

      <AppText className="mt-1 text-[11px] text-zinc-500">{label}</AppText>
    </View>
  );
}

function MiniDivider() {
  return <View className="mx-4 w-px bg-white/[0.07]" />;
}
