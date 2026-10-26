"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudSun,
  Cpu,
  Droplets,
  ExternalLink,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  Thermometer,
  Wifi,
  Wind,
  X,
} from "lucide-react";

import api from "../lib/axios";

// ============================================================
// TYPES
// ============================================================

type CapabilityType = "number" | "boolean" | "string";

const CROP_OPTIONS = [
  "Spinach",
  "Broccoli",
  "Radish",
  "Pea shoots",
  "Mustard",
  "Sunflower",
  "Lettuce",
  "Coriander",
  "Fenugreek",
  "Wheatgrass",
] as const;

type CropName = (typeof CROP_OPTIONS)[number];

function defaultCropForDevice(device: Device, index: number): CropName {
  const identity = `${device.name || ""} ${device.deviceModel.name} ${device.deviceModel.code}`.toLowerCase();
  const match = CROP_OPTIONS.find((crop) => identity.includes(crop.toLowerCase()));
  return match || CROP_OPTIONS[index % CROP_OPTIONS.length];
}

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
  };
  state: DeviceState | null;
  latest?: Telemetry | null;
};

// ============================================================
// SMALL UI HELPERS
// ============================================================

function formatSensorValue(
  value: unknown,
  capability: DeviceCapability,
): string {
  if (value === null || value === undefined || value === "") return "--";

  if (capability.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  if (capability.type === "boolean") return value ? "ON" : "OFF";
  return String(value);
}

function isRecentlySeen(value: string | null): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time < 2 * 60 * 1000;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "No recent data";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Time unavailable";

  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function prettyLabel(capability: DeviceCapability): string {
  return (capability.label || capability.key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sensorIcon(key: string) {
  const normalized = key.toLowerCase();
  if (normalized.includes("temp")) return Thermometer;
  if (normalized.includes("humid") || normalized.includes("moist")) return Droplets;
  if (normalized.includes("light") || normalized.includes("lux")) return Sun;
  if (normalized.includes("wind")) return Wind;
  if (normalized.includes("rain")) return CloudSun;
  return Activity;
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function sensorRangePercent(value: unknown, capability: DeviceCapability) {
  if (capability.type !== "number" || capability.min == null || capability.max == null) {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number) || capability.max === capability.min) return 0;
  return Math.min(
    100,
    Math.max(0, ((number - capability.min) / (capability.max - capability.min)) * 100),
  );
}

function Gauge({ percent }: { percent: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="color-mix(in srgb, var(--accent) 18%, transparent)"
        strokeWidth="3.5"
      />
      <circle
        cx="22"
        cy="22"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

// ============================================================
// DEVICE IMAGES
// ============================================================

// Place your real board photo at:
// web/public/images/esp32-device.jpeg
// If the API supplies deviceModel.imageUrl, that image is preferred.
function DevicePhoto({
  imageUrl,
  deviceName,
}: {
  imageUrl: string | null;
  deviceName: string;
}) {
  // This dashboard uses a custom greenhouse illustration instead of the
  // previous device-board photo. Keep props for compatibility with callers.
  void imageUrl;

  return (
    <div className="relative z-10 flex w-full max-w-[330px] items-center justify-center">
      <svg viewBox="0 0 360 280" role="img" aria-label={`${deviceName} greenhouse illustration`} className="w-full drop-shadow-[0_24px_35px_rgba(35,100,40,0.18)]">
        <defs>
          <linearGradient id="glass-roof" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#7bcf87" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="greenhouse-frame" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5d8c62" />
            <stop offset="50%" stopColor="#c4d8b5" />
            <stop offset="100%" stopColor="#426a49" />
          </linearGradient>
        </defs>
        <ellipse cx="180" cy="244" rx="138" ry="18" fill="var(--accent)" opacity="0.12" />
        <path d="M48 111 L178 28 L312 111 L312 222 L48 222 Z" fill="url(#glass-roof)" stroke="url(#greenhouse-frame)" strokeWidth="5" strokeLinejoin="round" />
        <path d="M48 111 L178 111 L178 222 M178 28 L178 111 L312 111 M112 70 L112 222 M245 70 L245 222 M48 163 L312 163" fill="none" stroke="url(#greenhouse-frame)" strokeWidth="3" />
        <path d="M65 213 L295 213 L295 226 L65 226 Z" fill="#527b49" opacity="0.7" />
        <g stroke="#3d8d46" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M91 211 L91 168 M91 187 Q67 177 72 161 Q91 165 91 187 M91 198 Q115 183 117 168 Q96 172 91 198" />
          <path d="M142 211 L142 151 M142 174 Q117 163 120 146 Q141 149 142 174 M142 190 Q166 174 166 156 Q147 161 142 190" />
          <path d="M205 211 L205 158 M205 180 Q184 169 187 153 Q205 157 205 180 M205 195 Q228 180 229 163 Q209 167 205 195" />
          <path d="M264 211 L264 170 M264 188 Q244 178 247 163 Q265 166 264 188 M264 199 Q284 186 286 173 Q268 176 264 199" />
        </g>
        <g fill="#78c85d">
          <ellipse cx="78" cy="180" rx="8" ry="15" transform="rotate(-38 78 180)" />
          <ellipse cx="105" cy="186" rx="8" ry="15" transform="rotate(40 105 186)" />
          <ellipse cx="127" cy="164" rx="8" ry="15" transform="rotate(-38 127 164)" />
          <ellipse cx="156" cy="179" rx="8" ry="15" transform="rotate(40 156 179)" />
          <ellipse cx="193" cy="171" rx="8" ry="15" transform="rotate(-38 193 171)" />
          <ellipse cx="219" cy="185" rx="8" ry="15" transform="rotate(40 219 185)" />
          <ellipse cx="253" cy="183" rx="8" ry="15" transform="rotate(-38 253 183)" />
          <ellipse cx="280" cy="190" rx="8" ry="15" transform="rotate(40 280 190)" />
        </g>
        <rect x="166" y="131" width="26" height="91" rx="3" fill="url(#greenhouse-frame)" opacity="0.8" />
        <rect x="172" y="141" width="14" height="69" rx="2" fill="var(--surface)" opacity="0.8" />
        <circle cx="183" cy="178" r="2.5" fill="var(--accent)" />
        <g transform="translate(246 99)">
          <rect width="31" height="43" rx="5" fill="var(--surface)" stroke="var(--accent)" strokeOpacity="0.7" strokeWidth="2" />
          <path d="M9 22 L15 14 L21 22 M15 14 L15 29" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
        <g fill="#a8b79a">
          <ellipse cx="59" cy="230" rx="15" ry="5" />
          <ellipse cx="91" cy="235" rx="12" ry="4" />
          <ellipse cx="285" cy="234" rx="15" ry="5" />
          <ellipse cx="312" cy="227" rx="11" ry="4" />
        </g>
      </svg>
    </div>
  );
}

function DeviceThumbnail({
  imageUrl,
  deviceName,
}: {
  imageUrl: string | null;
  deviceName: string;
}) {
  // Collection cards use a consistent greenhouse illustration rather than
  // mixing unrelated ESP32 board photos with the greenhouse-focused dashboard.
  // Keep the props so existing call sites and device-model data remain intact.
  void imageUrl;
  const titleId = `greenhouse-${deviceName.replace(/[^a-zA-Z0-9]/g, "") || "device"}`;

  return (
    <svg
      viewBox="0 0 120 100"
      role="img"
      aria-label={`${deviceName} greenhouse illustration`}
      className="h-full w-full p-1.5"
    >
      <defs>
        <linearGradient id={`${titleId}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#69b875" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={`${titleId}-frame`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4c8052" />
          <stop offset="50%" stopColor="#a7c9a0" />
          <stop offset="100%" stopColor="#3b6844" />
        </linearGradient>
      </defs>
      <ellipse cx="60" cy="86" rx="43" ry="5" fill="var(--accent)" opacity="0.12" />
      <path
        d="M17 42 L60 12 L103 42 L103 82 L17 82 Z"
        fill={`url(#${titleId}-glass)`}
        stroke={`url(#${titleId}-frame)`}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M60 12 V82 M17 42 H103 M38 27 V82 M82 27 V82 M17 62 H103"
        fill="none"
        stroke={`url(#${titleId}-frame)`}
        strokeWidth="2"
        opacity="0.9"
      />
      <path d="M27 80 H93" stroke="#5e8d59" strokeWidth="3" strokeLinecap="round" />
      <g fill="#68b95c">
        <ellipse cx="32" cy="67" rx="5" ry="10" transform="rotate(-35 32 67)" />
        <ellipse cx="43" cy="72" rx="5" ry="10" transform="rotate(38 43 72)" />
        <ellipse cx="53" cy="63" rx="5" ry="10" transform="rotate(-32 53 63)" />
        <ellipse cx="66" cy="71" rx="5" ry="10" transform="rotate(36 66 71)" />
        <ellipse cx="77" cy="64" rx="5" ry="10" transform="rotate(-35 77 64)" />
        <ellipse cx="88" cy="72" rx="5" ry="10" transform="rotate(35 88 72)" />
      </g>
      <rect x="56" y="55" width="8" height="27" rx="2" fill="var(--surface)" stroke={`url(#${titleId}-frame)`} strokeWidth="1.5" />
      <circle cx="60" cy="67" r="1.5" fill="var(--accent)" />
      <circle cx="92" cy="35" r="3" fill="var(--accent)" opacity="0.9" />
    </svg>
  );
}

// ============================================================
// DASHBOARD
// ============================================================

export default function HomePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [greeting, setGreeting] = useState("Welcome back");
  const [cropAssignments, setCropAssignments] = useState<Record<string, CropName>>({});

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) || devices[0],
    [devices, selectedDeviceId],
  );

  const loadDevices = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setLoadError(null);

      const response = await api.get("/user/devices");
      const userDevices: Device[] = response.data?.devices || [];

      const devicesWithTelemetry = await Promise.all(
        userDevices.map(async (device) => {
          try {
            const telemetryResponse = await api.get(
              `/user/devices/${device.id}/telemetry`,
            );
            const telemetry: Telemetry[] =
              telemetryResponse.data?.telemetry || [];
            return {
              ...device,
              latest: telemetry.length ? telemetry[0] : null,
            };
          } catch {
            return { ...device, latest: null };
          }
        }),
      );

      setDevices(devicesWithTelemetry);

      const savedDevice =
        typeof window !== "undefined"
          ? localStorage.getItem("selectedDeviceId")
          : null;

      if (
        savedDevice &&
        devicesWithTelemetry.some((device) => device.id === savedDevice)
      ) {
        setSelectedDeviceId(savedDevice);
      } else if (devicesWithTelemetry.length) {
        setSelectedDeviceId(devicesWithTelemetry[0].id);
        localStorage.setItem("selectedDeviceId", devicesWithTelemetry[0].id);
      } else {
        setSelectedDeviceId(null);
        localStorage.removeItem("selectedDeviceId");
      }
    } catch (error) {
      console.error("Failed to load devices:", error);
      setLoadError("We couldn't load your devices. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("smartagri-rack-crops");
      if (saved) setCropAssignments(JSON.parse(saved) as Record<string, CropName>);
    } catch {
      // Ignore invalid local preferences and use default crop assignments.
    }
  }, []);

  function updateCropAssignment(deviceId: string, crop: CropName) {
    setCropAssignments((current) => {
      const next = { ...current, [deviceId]: crop };
      localStorage.setItem("smartagri-rack-crops", JSON.stringify(next));
      return next;
    });
  }

  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(greetingForHour(new Date().getHours()));
    };

    updateGreeting();
    // Refresh the greeting periodically so it stays correct if the dashboard
    // remains open across a morning/afternoon/evening boundary.
    const intervalId = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  function selectDevice(id: string) {
    setSelectedDeviceId(id);
    localStorage.setItem("selectedDeviceId", id);
    setShowDevices(false);
  }

  const sensors = selectedDevice?.deviceModel.capabilities?.sensors || [];
  const latestData = selectedDevice?.latest?.data || {};
  const online = isRecentlySeen(selectedDevice?.lastSeenAt || null);
  const numericPrimary =
    sensors.find((sensor) => sensor.key.toLowerCase() === "temperature") ||
    sensors.find((sensor) => sensor.type === "number");
  const visibleSensors = sensors.slice(0, 6);
  const onlineCount = devices.filter((device) =>
    isRecentlySeen(device.lastSeenAt),
  ).length;
  const healthLabel = selectedDevice
    ? online
      ? "Estate healthy"
      : "Attention needed"
    : "Awaiting setup";

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 py-6 text-[var(--text-primary)] sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_32%),linear-gradient(180deg,var(--app-bg),var(--app-bg))]" />
        <div className="relative mx-auto w-full max-w-[1600px] animate-pulse space-y-6">
          <div className="h-28 rounded-[32px] bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="h-[420px] rounded-[32px] bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
            <div className="h-[420px] rounded-[32px] bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
          </div>
          <div className="h-52 rounded-[32px] bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]" />
        </div>
      </main>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--app-bg)] px-4 pb-28 pt-5 text-[var(--text-primary)] sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--accent)_12%,transparent),transparent_34%),linear-gradient(180deg,var(--app-bg),var(--app-bg))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] [background-image:radial-gradient(rgba(182,255,59,0.65)_0.6px,transparent_0.6px)] [background-size:18px_18px]" />

      <div className="relative mx-auto w-full max-w-[1600px]">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[var(--accent)]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              <Sparkles size={13} />
              Growing operations
            </div>
            <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl">
              {greeting}.
              <span className="mt-1 block text-[var(--accent)]">Your farm, composed.</span>
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
              A quiet command view of climate, devices, and field health — designed for calm, precise growing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)] px-4 py-2.5 text-xs text-[var(--text-secondary)] backdrop-blur sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
              </span>
              {onlineCount} of {devices.length} devices live
            </div>
            <button
              type="button"
              onClick={() => void loadDevices(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] px-4 text-sm font-medium text-[var(--text-primary)] backdrop-blur transition hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)] disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/home/add"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-text)] shadow-[0_12px_30px_rgba(182,255,59,0.22)] transition hover:bg-[var(--accent-hover)]"
            >
              <Plus size={17} />
              Add device
            </Link>
          </div>
        </header>

        {loadError && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100 sm:flex-row sm:items-center sm:justify-between">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => void loadDevices()}
              className="inline-flex items-center gap-2 self-start font-semibold hover:underline"
            >
              Try again <ArrowRight size={15} />
            </button>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <section className="relative overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute -left-16 top-0 h-64 w-64 rounded-full bg-[var(--accent)]/12 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-[#35e86b]/16 blur-3xl" />

            <div className="relative flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Selected rack
                </p>
                {selectedDevice ? (
                  <>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[var(--text-primary)] sm:text-3xl">
                      {selectedDevice.name || selectedDevice.deviceModel.name}
                    </h2>
                    <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                      {selectedDevice.deviceCode} · {selectedDevice.deviceModel.code}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-[var(--text-primary)] sm:text-3xl">
                      Welcome to the estate
                    </h2>
                    <p className="mt-1.5 max-w-md text-sm text-[var(--text-secondary)]">
                      Connect your first device and this canvas becomes a living portrait of your growing rooms.
                    </p>
                  </>
                )}
              </div>

              {selectedDevice && (
                <button
                  type="button"
                  onClick={() => setShowDevices(true)}
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-3.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)]"
                >
                  <SlidersHorizontal size={15} />
                  Switch house
                  <ChevronDown size={14} />
                </button>
              )}
            </div>

            {selectedDevice ? (
              <div className="relative mt-8 grid min-h-[260px] items-center gap-6 sm:grid-cols-[minmax(0,0.95fr)_minmax(180px,1.05fr)]">
                <div className="z-10">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${online ? "bg-[var(--accent)] shadow-[0_0_12px_#b6ff3b]" : "bg-[#8a8578]"
                        }`}
                    />
                    <span className={`text-xs font-medium ${online ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
                      {online ? "Live and reporting" : "Not recently seen"}
                    </span>
                  </div>

                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent)]">
                    {numericPrimary ? prettyLabel(numericPrimary) : "Latest reading"}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-7xl font-semibold leading-none tracking-[-0.08em] text-[var(--text-primary)] sm:text-8xl">
                      {numericPrimary
                        ? formatSensorValue(latestData[numericPrimary.key], numericPrimary)
                        : "--"}
                    </span>
                    {numericPrimary?.unit && (
                      <span className="mb-2 text-lg font-medium text-[var(--accent)]">
                        {numericPrimary.unit}
                      </span>
                    )}
                  </div>
                  <p className="mt-5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                    <Clock3 size={13} />
                    Updated {formatTime(selectedDevice.latest?.recordedAt)}
                  </p>

                  <Link
                    href={`/home/monitor/${selectedDevice.id}`}
                    className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
                  >
                    Open house details
                    <ArrowUpRight size={16} />
                  </Link>
                </div>

                <div className="relative flex min-h-[220px] items-center justify-center">
                  <div className="absolute h-56 w-56 rounded-full border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] sm:h-64 sm:w-64" />
                  <div className="absolute h-40 w-40 rounded-full bg-[var(--accent)]/10 blur-xl sm:h-48 sm:w-48" />
                  <DevicePhoto
                    imageUrl={selectedDevice.deviceModel.imageUrl}
                    deviceName={selectedDevice.deviceModel.name}
                  />
                </div>
              </div>
            ) : (
              <div className="relative mt-8 flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--surface-hover)] px-5 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)]">
                  <Wifi size={29} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">No house connected yet</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
                  Add your ESP32 device to reveal live climate readings and a signature portrait of the room.
                </p>
                <Link
                  href="/home/add"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"
                >
                  <Plus size={16} />
                  Connect a device
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Live rack conditions
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  Rack environment
                </h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  The latest values from this rack
                </p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[var(--accent)]/10 text-[var(--accent)]">
                <Activity size={19} />
              </div>
            </div>

            {selectedDevice && visibleSensors.length > 0 ? (
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleSensors.map((sensor) => {
                  const Icon = sensorIcon(sensor.key);
                  const value = formatSensorValue(latestData[sensor.key], sensor);
                  const fill = sensorRangePercent(latestData[sensor.key], sensor);
                  return (
                    <div
                      key={sensor.key}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-hover)] p-4 transition hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)] hover:bg-[var(--surface-hover)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/12 text-[var(--accent)]">
                            <Icon size={17} />
                          </span>
                          <span className="truncate text-sm font-medium text-[var(--text-secondary)]">
                            {prettyLabel(sensor)}
                          </span>
                        </div>
                        {fill != null ? <Gauge percent={fill} /> : <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}
                      </div>
                      <div className="mt-4 flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold tracking-[-0.055em] text-[var(--text-primary)]">
                          {value}
                        </span>
                        {sensor.unit && (
                          <span className="text-sm text-[var(--accent)]">{sensor.unit}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-hover)] px-4 text-center">
                <Activity size={25} className="text-[var(--accent)]" />
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                  No sensor readings available
                </p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--text-secondary)]">
                  {selectedDevice
                    ? "This device has no configured sensors or hasn't reported telemetry yet."
                    : "Connect a device to start collecting environmental data."}
                </p>
              </div>
            )}

            {selectedDevice && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
                <span className="text-xs text-[var(--text-secondary)]">
                  {sensors.length} configured sensor{sensors.length === 1 ? "" : "s"}
                </span>
                <Link
                  href={`/home/monitor/${selectedDevice.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:text-[var(--text-primary)]"
                >
                  View rack readings <ChevronRight size={15} />
                </Link>
              </div>
            )}
          </section>
        </div>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Registered houses", value: devices.length, icon: Cpu },
            { label: "Currently live", value: onlineCount, icon: Wifi },
            { label: "Configured sensors", value: sensors.length, icon: Activity },
            { label: "Estate status", value: healthLabel, icon: ShieldCheck, compact: true },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-4 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-5 backdrop-blur"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--accent)_20%,transparent)] bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">{stat.label}</p>
                  <p className={`mt-1 font-semibold tracking-[-0.05em] text-[var(--text-primary)] ${stat.compact ? "text-lg" : "text-2xl"}`}>
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-9">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Rack collection
              </p>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-[-0.045em] text-[var(--text-primary)]">
                Growing racks
              </h2>
            </div>
            <Link
              href="/home/monitor"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:text-[var(--text-primary)]"
            >
              Manage racks <ArrowRight size={16} />
            </Link>
          </div>

          {devices.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {devices.slice(0, 6).map((device, deviceIndex) => {
                const deviceOnline = isRecentlySeen(device.lastSeenAt);
                const isSelected = selectedDevice?.id === device.id;
                return (
                  <article
                    key={device.id}
                    className={`rounded-[24px] border bg-[var(--surface)] p-4 backdrop-blur transition ${isSelected
                      ? "border-[color-mix(in_srgb,var(--accent)_50%,transparent)] shadow-[0_0_0_1px_rgba(182,255,59,0.18)]"
                      : "border-[var(--border)] hover:border-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--surface-hover)]">
                        <DeviceThumbnail
                          imageUrl={device.deviceModel.imageUrl}
                          deviceName={device.deviceModel.name}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            Rack {String(deviceIndex + 1).padStart(2, "0")}
                          </h3>
                          {isSelected && (
                            <span className="rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          {device.name || device.deviceModel.name} · {device.deviceCode}
                        </p>
                        <span className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium ${deviceOnline ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${deviceOnline ? "bg-[var(--accent)]" : "bg-[#8a8578]"}`} />
                          {deviceOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/60 p-3">
                      <label
                        htmlFor={`crop-${device.id}`}
                        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]"
                      >
                        Crop on this rack
                      </label>
                      <select
                        id={`crop-${device.id}`}
                        value={cropAssignments[device.id] || defaultCropForDevice(device, deviceIndex)}
                        onChange={(event) => updateCropAssignment(device.id, event.target.value as CropName)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                      >
                        {CROP_OPTIONS.map((crop) => (
                          <option key={crop} value={crop}>{crop}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                      <span className="text-xs text-[var(--text-secondary)]">
                        Updated {formatTime(device.latest?.recordedAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => selectDevice(device.id)}
                          className={`rounded-full px-3 py-2 text-xs font-semibold transition ${isSelected
                            ? "bg-[var(--accent)] text-[var(--accent-text)]"
                            : "border border-[var(--border)] text-[var(--text-primary)] hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
                            }`}
                        >
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1"><Check size={13} /> Selected</span>
                          ) : (
                            "Select"
                          )}
                        </button>
                        <Link
                          href={`/home/monitor/${device.id}`}
                          aria-label={`Open ${device.name || device.deviceModel.name}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] transition hover:bg-[var(--accent-hover)]"
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/12 text-[var(--accent)]">
                <Sprout size={23} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-[var(--text-primary)]">Your collection is empty</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[var(--text-secondary)]">
                Add your ESP32 or another supported device to begin composing the estate.
              </p>
              <Link
                href="/home/add"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"
              >
                <Plus size={16} /> Add your first device
              </Link>
            </div>
          )}
        </section>

        <footer className="mt-10 flex flex-col gap-2 border-t border-[var(--border)] py-6 text-xs text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <span>SmartAgri · Private climate atelier</span>
          <span className="inline-flex items-center gap-1.5">
            <CircleHelp size={13} />
            Readings reflect the latest telemetry received from your device.
          </span>
        </footer>
      </div>

      {showDevices && (
        <div
          role="presentation"
          onClick={() => setShowDevices(false)}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-[var(--overlay)] p-3 backdrop-blur-md sm:items-center sm:p-6"
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-selector-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--surface)] shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div>
                <h2 id="device-selector-title" className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  Switch signature house
                </h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Choose which device appears in your overview.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDevices(false)}
                aria-label="Close device selector"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)] text-[var(--text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-3 sm:p-4">
              {devices.length === 0 ? (
                <div className="py-10 text-center">
                  <Cpu size={27} className="mx-auto text-[var(--accent)]" />
                  <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">No linked devices</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Add a device to see it here.</p>
                </div>
              ) : (
                devices.map((device) => {
                  const active = selectedDevice?.id === device.id;
                  const deviceOnline = isRecentlySeen(device.lastSeenAt);
                  return (
                    <button
                      type="button"
                      key={device.id}
                      onClick={() => selectDevice(device.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${active
                        ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[var(--accent)]/10"
                        : "border-[var(--border)] bg-[var(--surface)] hover:bg-white/[0.06]"
                        }`}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--surface-hover)]">
                        <DeviceThumbnail
                          imageUrl={device.deviceModel.imageUrl}
                          deviceName={device.deviceModel.name}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {device.name || device.deviceModel.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                          {device.deviceCode} · {deviceOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                      {active && <Check size={18} className="shrink-0 text-[var(--accent)]" />}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-[var(--border)] p-4">
              <Link
                href="/home/monitor"
                className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[color-mix(in_srgb,var(--text-primary)_6%,transparent)]"
              >
                Manage all devices <ExternalLink size={15} />
              </Link>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
