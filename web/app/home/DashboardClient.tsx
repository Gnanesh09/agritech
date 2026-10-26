"use client";

import { isAxiosError } from "axios";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleAlert,
  Cpu,
  Droplets,
  Layers3,
  Leaf,
  Plus,
  RefreshCw,
  Sprout,
  Sun,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import api from "../lib/axios";
import EnvironmentalChart from "./EnvironmentalChart";
import type {
  Device,
  HarvestCrop,
  Rack,
  SensorCapability,
  Telemetry,
  UserProfile,
} from "./dashboard-types";

type AlertItem = {
  id: string;
  title: string;
  detail: string;
  severity: "warning" | "critical";
};

type DevicesResponse = { devices: Omit<Device, "telemetry">[] };
type TelemetryResponse = { telemetry: Telemetry[] };
type RacksResponse = { racks: Rack[] };
type HarvestResponse = { crops: HarvestCrop[] };
type ProfileResponse = { user: UserProfile };

function errorMessage(error: unknown, fallback: string) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function formatSensorValue(value: unknown, unit = "") {
  if (value === null || value === undefined || value === "") return "--";
  const number = Number(value);
  const formatted = Number.isFinite(number)
    ? Number.isInteger(number)
      ? String(number)
      : number.toFixed(1)
    : String(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

function sensorLabel(sensor: SensorCapability) {
  return (sensor.label || sensor.key)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  const lastSeen = new Date(lastSeenAt).getTime();
  return Number.isFinite(lastSeen) && lastSeen <= Date.now() && Date.now() - lastSeen < 120_000;
}

function timeAgo(value: string | null) {
  if (!value) return "No check-in yet";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Time unavailable";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

function formatHarvestDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function buildAlerts(devices: Device[]): AlertItem[] {
  return devices.flatMap((device) => {
    const name = device.name || device.deviceModel.name;
    const latest = device.telemetry[0];
    const items: AlertItem[] = [];

    if (!isOnline(device.lastSeenAt)) {
      items.push({
        id: `${device.id}-connection`,
        title: device.lastSeenAt ? "Device connection lost" : "No device check-in",
        detail: `${name} · ${timeAgo(device.lastSeenAt)}`,
        severity: "warning",
      });
    }

    if (latest) {
      for (const sensor of device.deviceModel.capabilities.sensors) {
        if (sensor.type !== "number") continue;
        const value = Number(latest.data[sensor.key]);
        if (!Number.isFinite(value)) continue;
        if (
          (sensor.min !== undefined && value < sensor.min) ||
          (sensor.max !== undefined && value > sensor.max)
        ) {
          items.push({
            id: `${device.id}-${sensor.key}`,
            title: `${sensorLabel(sensor)} outside configured range`,
            detail: `${name} · ${formatSensorValue(value, sensor.unit)}`,
            severity: "critical",
          });
        }
      }
    }

    return items;
  });
}

function getActiveCrops(racks: Rack[], dueCrops: HarvestCrop[]) {
  const crops = new Map<string, HarvestCrop>();
  for (const rack of racks) {
    for (const row of rack.rows) {
      for (const tray of row.trays) {
        const crop = tray.currentCrop;
        if (!crop) continue;
        crops.set(crop.id, {
          ...crop,
          tray: {
            name: tray.name,
            row: {
              name: row.name,
              rack: { id: rack.id, name: rack.name },
            },
          },
        });
      }
    }
  }
  for (const crop of dueCrops) crops.set(crop.id, crop);

  return [...crops.values()].sort(
    (first, second) =>
      new Date(first.expectedHarvestDate).getTime() -
      new Date(second.expectedHarvestDate).getTime(),
  );
}

function MetricCard({
  icon,
  label,
  value,
  note,
  tone = "green",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  note: string;
  tone?: "green" | "gold";
}) {
  return (
    <article className="min-w-0 rounded-xl border border-[#e7e9df] bg-white p-4 shadow-[0_2px_12px_rgba(30,55,34,0.025)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="pt-1 text-xs text-[#788473]">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            tone === "gold" ? "bg-[#f7f0df] text-[#b39148]" : "bg-[#eff3e9] text-[#6f8d5e]"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-2 text-[29px] font-semibold leading-none tracking-[-0.055em] text-[#294532]">
        {value}
      </p>
      <div className="mt-4 flex items-center gap-1.5 border-t border-[#f0f1eb] pt-3 text-[10px] text-[#87927f]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#8aa56f]" />
        <span>{note}</span>
      </div>
    </article>
  );
}

function EmptyPanel({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[#e2e6da] bg-[#fafbf8] px-5 py-8 text-center">
      <Sprout size={25} className="text-[#829b70]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[#405642]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-[#899284]">{detail}</p>
      {action}
    </div>
  );
}

function CropIllustration({ label }: { label: string }) {
  return (
    <div className="relative flex h-[112px] items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#dfe8d3,#f0f1e4_52%,#c8d8b5)]">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(120deg,transparent_48%,rgba(255,255,255,.7)_49%,transparent_51%)] [background-size:28px_28px]" />
      <svg
        viewBox="0 0 240 112"
        className="relative h-full w-full"
        role="img"
        aria-label={`${label} crop illustration`}
      >
        <path d="M0 91c48-20 74-14 120 0s78 17 120-2v23H0z" fill="#829967" opacity=".28" />
        <g fill="#60854d">
          <ellipse cx="67" cy="66" rx="11" ry="25" transform="rotate(-35 67 66)" />
          <ellipse cx="91" cy="62" rx="11" ry="25" transform="rotate(35 91 62)" />
          <ellipse cx="120" cy="55" rx="12" ry="28" transform="rotate(-25 120 55)" />
          <ellipse cx="147" cy="63" rx="11" ry="25" transform="rotate(32 147 63)" />
          <ellipse cx="173" cy="69" rx="10" ry="22" transform="rotate(-28 173 69)" />
        </g>
        <g fill="#93aa73">
          <ellipse cx="62" cy="57" rx="7" ry="17" transform="rotate(-38 62 57)" />
          <ellipse cx="96" cy="55" rx="7" ry="17" transform="rotate(36 96 55)" />
          <ellipse cx="117" cy="45" rx="8" ry="19" transform="rotate(-28 117 45)" />
          <ellipse cx="151" cy="56" rx="7" ry="17" transform="rotate(32 151 56)" />
          <ellipse cx="178" cy="61" rx="7" ry="15" transform="rotate(-30 178 61)" />
        </g>
        <path d="M120 91V49M67 89V62m25 29V58m55 33V62m26 31V69" stroke="#557445" strokeWidth="2" />
      </svg>
      <span className="absolute bottom-2 right-2 rounded-md bg-white/80 px-2 py-1 text-[9px] font-medium text-[#64765a] backdrop-blur">
        Illustration
      </span>
    </div>
  );
}

function RackCard({
  rack,
  index,
  device,
}: {
  rack: Rack;
  index: number;
  device: Device | undefined;
}) {
  const crops = rack.rows.flatMap((row) =>
    row.trays.flatMap((tray) => (tray.currentCrop ? [tray.currentCrop] : [])),
  );
  const online = device ? isOnline(device.lastSeenAt) : false;
  const latestData = device?.telemetry[0]?.data;
  const sensors = device?.deviceModel.capabilities.sensors ?? [];
  const temperature = sensors.find((sensor) => sensor.key.toLowerCase().includes("temp"));
  const humidity = sensors.find((sensor) =>
    /humid|moist/.test(sensor.key.toLowerCase()),
  );

  return (
    <article className="overflow-hidden rounded-xl border border-[#e7e9df] bg-white">
      <CropIllustration label={crops[0]?.cropName || rack.name} />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#899584]">
              Rack {String(index + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-1 truncate text-sm font-semibold text-[#344a37]">
              {rack.name}
            </h3>
          </div>
          <span
            className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] ${
              online ? "bg-[#eff5e9] text-[#668451]" : "bg-[#f5f2e9] text-[#9b8553]"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-[#88a96d]" : "bg-[#c8a75b]"}`} />
            {device ? (online ? "Online" : "Needs attention") : "No device"}
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] text-[#7e8a78]">
          {crops.length
            ? crops.map((crop) => crop.cropName).filter(Boolean).slice(0, 2).join(", ")
            : "No active crop"}
        </p>
        <div className="mt-3 flex items-center gap-3 border-t border-[#eff0ea] pt-2.5 text-[10px] text-[#778673]">
          {temperature && (
            <span className="inline-flex items-center gap-1">
              <Thermometer size={12} />
              {formatSensorValue(latestData?.[temperature.key], temperature.unit)}
            </span>
          )}
          {humidity && (
            <span className="inline-flex items-center gap-1">
              <Droplets size={12} />
              {formatSensorValue(latestData?.[humidity.key], humidity.unit)}
            </span>
          )}
          {!temperature && !humidity && (
            <span>{rack.rows.reduce((total, row) => total + row.trays.length, 0)} trays</span>
          )}
          <Link
            href={device ? `/home/monitor/${device.id}` : "/home/monitor"}
            aria-label={`View ${rack.name}`}
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full text-[#7a9068] transition hover:bg-[#f2f5ed]"
          >
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function AlertList({
  alerts,
  unavailable,
}: {
  alerts: AlertItem[];
  unavailable: boolean;
}) {
  if (!alerts.length) {
    return (
      <EmptyPanel
        title={unavailable ? "Alert status unavailable" : "No active device alerts"}
        detail={
          unavailable
            ? "Device information could not be loaded, so alert status is unknown."
            : "When a device disconnects or a reading crosses its configured sensor limits, it will appear here."
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-[#eef0e9]">
      {alerts.slice(0, 4).map((alert) => (
        <li key={alert.id} className="flex items-center gap-3 py-3.5 first:pt-1">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              alert.severity === "critical"
                ? "bg-[#f8eee5] text-[#bb8051]"
                : "bg-[#f7f0e1] text-[#ad8c46]"
            }`}
          >
            {alert.severity === "critical" ? (
              <Thermometer size={17} />
            ) : (
              <WifiOff size={17} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-[#435446]">{alert.title}</p>
            <p className="mt-1 truncate text-[10px] text-[#8c9688]">{alert.detail}</p>
          </div>
          <CircleAlert size={15} className="shrink-0 text-[#a6ad9e]" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}

function HarvestList({
  crops,
  now,
  unavailable,
}: {
  crops: HarvestCrop[];
  now: number;
  unavailable: boolean;
}) {
  if (!crops.length) {
    return (
      <EmptyPanel
        title={unavailable ? "Harvest schedule unavailable" : "No harvests scheduled"}
        detail={
          unavailable
            ? "Rack data could not be loaded, so upcoming crop dates are unknown."
            : "Plant a crop in a rack tray to see its expected harvest date here."
        }
      />
    );
  }

  return (
    <ul className="divide-y divide-[#eef0e9]">
      {crops.slice(0, 4).map((crop) => {
        const ready =
          crop.status === "READY" ||
          new Date(crop.expectedHarvestDate).getTime() <= now;
        return (
          <li key={crop.id} className="flex items-center gap-3 py-3 first:pt-1">
            <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-[#e7e9df] bg-[#fafbf8] text-center">
              <CalendarDays size={13} className="text-[#839279]" />
              <span className="mt-0.5 text-[9px] font-semibold text-[#60725b]">
                {formatHarvestDate(crop.expectedHarvestDate)}
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[#435446]">{crop.cropName}</p>
              <p className="mt-1 truncate text-[10px] text-[#8c9688]">
                {crop.tray.row.rack.name} · {crop.tray.name}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[9px] ${
                ready ? "bg-[#eff5e9] text-[#668451]" : "bg-[#f4f5ef] text-[#7a8775]"
              }`}
            >
              {ready ? "Ready" : "Growing"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function DashboardClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [dueCrops, setDueCrops] = useState<HarvestCrop[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [greeting, setGreeting] = useState("Welcome");
  const [clockNow, setClockNow] = useState(0);

  const loadDashboard = useCallback(async (manual = false) => {
    setClockNow(Date.now());
    if (manual) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    setWarnings([]);

    const [devicesResult, racksResult, harvestResult, profileResult] =
      await Promise.allSettled([
        api.get<DevicesResponse>("/user/devices"),
        api.get<RacksResponse>("/user/racks"),
        api.get<HarvestResponse>("/user/crop-cycles/harvest-due"),
        api.get<ProfileResponse>("/user/profile"),
      ]);

    if (devicesResult.status === "rejected") {
      console.error("Dashboard devices request failed:", devicesResult.reason);
      setLoadError(
        errorMessage(devicesResult.reason, "Unable to load your devices. Please try again."),
      );
      setDevices([]);
      setRacks(racksResult.status === "fulfilled" ? racksResult.value.data.racks ?? [] : []);
      setDueCrops(
        harvestResult.status === "fulfilled" ? harvestResult.value.data.crops ?? [] : [],
      );
      setProfile(profileResult.status === "fulfilled" ? profileResult.value.data.user : null);
      const partialWarnings: string[] = [];
      if (racksResult.status === "rejected") {
        console.error("Dashboard racks request failed:", racksResult.reason);
        partialWarnings.push("Rack data could not be loaded.");
      }
      if (harvestResult.status === "rejected") {
        console.error("Dashboard harvest request failed:", harvestResult.reason);
        partialWarnings.push("Harvest data could not be loaded.");
      }
      if (profileResult.status === "rejected") {
        console.error("Dashboard profile request failed:", profileResult.reason);
      }
      setWarnings(partialWarnings);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const userDevices = devicesResult.value.data.devices ?? [];
    const telemetryResults = await Promise.allSettled(
      userDevices.map((device) =>
        api.get<TelemetryResponse>(`/user/devices/${device.id}/telemetry`),
      ),
    );
    const telemetryFailures = telemetryResults.reduce(
      (total, result) => total + Number(result.status === "rejected"),
      0,
    );
    telemetryResults.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Dashboard telemetry request failed for ${userDevices[index].deviceCode}:`,
          result.reason,
        );
      }
    });

    setDevices(
      userDevices.map((device, index) => ({
        ...device,
        telemetry:
          telemetryResults[index]?.status === "fulfilled"
            ? telemetryResults[index].value.data.telemetry ?? []
            : [],
      })),
    );
    setRacks(racksResult.status === "fulfilled" ? racksResult.value.data.racks ?? [] : []);
    setDueCrops(
      harvestResult.status === "fulfilled" ? harvestResult.value.data.crops ?? [] : [],
    );
    setProfile(profileResult.status === "fulfilled" ? profileResult.value.data.user : null);

    const partialWarnings: string[] = [];
    if (telemetryFailures > 0) {
      partialWarnings.push(
        `Sensor history could not be loaded for ${telemetryFailures} device${telemetryFailures === 1 ? "" : "s"}.`,
      );
    }
    if (racksResult.status === "rejected") {
      console.error("Dashboard racks request failed:", racksResult.reason);
      partialWarnings.push("Rack data could not be loaded.");
    }
    if (harvestResult.status === "rejected") {
      console.error("Dashboard harvest request failed:", harvestResult.reason);
      partialWarnings.push("Harvest data could not be loaded.");
    }
    if (profileResult.status === "rejected") {
      console.error("Dashboard profile request failed:", profileResult.reason);
      partialWarnings.push("Profile details are unavailable.");
    }
    setWarnings(partialWarnings);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const savedDevice = window.localStorage.getItem("selectedDeviceId");
    const syncPreferences = window.setTimeout(() => {
      if (savedDevice) setSelectedDeviceId(savedDevice);
      setGreeting(greetingForHour(new Date().getHours()));
    }, 0);
    const updateGreeting = () => {
      setGreeting(greetingForHour(new Date().getHours()));
    };

    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const refreshTimer = window.setInterval(() => void loadDashboard(true), 30_000);
    const greetingTimer = window.setInterval(updateGreeting, 60_000);

    return () => {
      window.clearTimeout(syncPreferences);
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshTimer);
      window.clearInterval(greetingTimer);
    };
  }, [loadDashboard]);

  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) ?? devices[0];
  const numericSensors = selectedDevice?.deviceModel.capabilities.sensors ?? [];
  const onlineCount = devices.filter((device) => isOnline(device.lastSeenAt)).length;
  const alerts = useMemo(() => buildAlerts(devices), [devices]);
  const activeCrops = useMemo(
    () => getActiveCrops(racks, dueCrops),
    [racks, dueCrops],
  );
  const rackDataUnavailable = warnings.includes("Rack data could not be loaded.");
  const alertStatusIncomplete =
    Boolean(loadError) ||
    warnings.some((warning) => warning.startsWith("Sensor history could not be loaded"));
  const growingZoneCount = racks.reduce(
    (total, rack) => total + (Number.isFinite(rack.rowCount) ? rack.rowCount : 0),
    0,
  );
  const userName = profile?.username?.trim() || "Grower";
  const avatar = userName.slice(0, 2).toUpperCase();

  function selectDevice(deviceId: string) {
    setSelectedDeviceId(deviceId);
    window.localStorage.setItem("selectedDeviceId", deviceId);
  }

  if (loading) {
    return (
      <main className="dashboard-root min-h-screen bg-[#f6f7f2] px-4 py-6 sm:px-7 lg:px-9">
        <div className="mx-auto max-w-[1440px] animate-pulse space-y-6">
          <div className="h-8 w-44 rounded-lg bg-[#e8ebe2]" />
          <div className="h-12 w-72 rounded-lg bg-[#e8ebe2]" />
          <div className="h-[220px] rounded-2xl bg-[#e8ebe2]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-36 rounded-xl bg-white" />
            ))}
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <div className="h-[360px] rounded-2xl bg-white" />
            <div className="h-[360px] rounded-2xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-root min-h-screen bg-[#f6f7f2] text-[#293c2d]">
      <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-[#e7e9df] bg-[#fcfcfa]/95 px-4 backdrop-blur sm:px-7 lg:px-9">
        <div className="flex items-center gap-2 text-[11px] text-[#849080]">
          <Leaf size={15} className="text-[#829576]" aria-hidden="true" />
          <span className="hidden sm:inline">Workspace</span>
          <span className="hidden text-[#c5c9be] sm:inline">›</span>
          <span className="font-medium text-[#405642]">Farm overview</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="hidden items-center gap-2 text-[10px] text-[#7d8979] sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[#85a66b]" />
            {loadError
              ? "Device status unavailable"
              : devices.length
                ? `${onlineCount} device${onlineCount === 1 ? "" : "s"} online`
                : "No devices connected"}
          </span>
          <span className="hidden items-center gap-1.5 text-[10px] text-[#929783] lg:flex">
            <Sun size={15} className="text-[#b89d58]" aria-hidden="true" />
            Weather not connected
          </span>
          <span className="h-6 border-l border-[#e7e9df]" />
          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#74836f] transition hover:bg-[#f0f3eb] disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
          <Bell size={17} className="hidden text-[#75836e] sm:block" aria-hidden="true" />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eadbc3] text-[10px] font-semibold text-[#775f42]">
            {avatar}
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-7 sm:px-7 sm:pt-8 lg:px-9 lg:pb-10">
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.23em] text-[#91a087]">
              Your farm, at a glance
            </p>
            <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.055em] text-[#23392b] sm:text-[34px]">
              {greeting}, {userName}
              <span className="ml-2 inline-block text-[#b89d58]" aria-hidden="true">
                ☼
              </span>
            </h1>
            <p className="mt-1.5 text-xs text-[#7f8b7c]">
              Here&apos;s what&apos;s growing in your workspace today.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/home/monitor"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#e1e5da] bg-white px-3.5 text-xs font-medium text-[#5f705b] transition hover:bg-[#f8faf5]"
            >
              <Cpu size={15} />
              View devices
            </Link>
            <Link
              href="/home/add"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#315b38] px-3.5 text-xs font-medium text-white transition hover:bg-[#264c2f]"
            >
              <Plus size={15} />
              Add growing area
            </Link>
          </div>
        </section>

        {loadError && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#edc9bc] bg-[#fff6f1] px-4 py-3 text-xs text-[#8c5140]"
          >
            <span className="inline-flex items-center gap-2">
              <CircleAlert size={16} />
              {loadError}
            </span>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        )}

        {warnings.length > 0 && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-[#eadfbe] bg-[#fffaf0] px-4 py-3 text-xs text-[#826e3d]"
          >
            {warnings.join(" ")}
          </div>
        )}

        <section
          aria-label="Greenhouse overview"
          className="dashboard-hero relative isolate min-h-[235px] overflow-hidden rounded-2xl border border-[#e2e7d8] bg-[#eef2e5] bg-cover bg-right"
          style={{ backgroundImage: "url('/greenhouse-hero.svg')" }}
        >
          <div className="dashboard-hero-overlay absolute inset-0 -z-10 bg-gradient-to-r from-[#eef2e5] via-[#eef2e5]/95 to-[#eef2e5]/5" />
          <div className="flex min-h-[235px] max-w-[660px] flex-col justify-center px-5 py-7 sm:px-8 sm:py-9">
            <p className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#78906d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#84a66c]" />
              Connected farming, better growing
            </p>
            <h2 className="mt-4 max-w-lg text-[25px] font-semibold leading-[1.2] tracking-[-0.045em] text-[#294532] sm:text-[31px]">
              A little more insight.
              <br />
              A lot more possibility.
            </h2>
            <p className="mt-3 max-w-sm text-xs leading-5 text-[#71816e]">
              Keep every rack, sensor, and harvest in view with the data your devices report.
            </p>
            <Link
              href="/home/monitor"
              className="mt-4 inline-flex w-fit items-center gap-2 text-[11px] font-semibold text-[#4e6e45] transition hover:text-[#294532]"
            >
              Explore your growing spaces <ArrowRight size={15} />
            </Link>
          </div>
          <span className="absolute bottom-3 right-3 rounded-md bg-white/80 px-2 py-1 text-[9px] text-[#697a60] backdrop-blur">
            Greenhouse illustration
          </span>
        </section>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-0.5 text-[10px] text-[#8a9585]">
          <span className="inline-flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${loadError ? "bg-[#c98b63]" : "bg-[#85a66b]"}`} />
            {loadError ? "API connection needs attention" : "Live workspace"}
            <span className="text-[#c4c9bd]">|</span>
            {refreshing ? "Refreshing data..." : "Authenticated API data"}
          </span>
          {selectedDevice && (
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Select device</span>
              <select
                value={selectedDevice.id}
                onChange={(event) => selectDevice(event.target.value)}
                className="max-w-[180px] rounded-md border border-transparent bg-transparent py-1 text-right text-[10px] text-[#70816c] outline-none hover:border-[#dfe5d9] focus:border-[#a6bb93]"
              >
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name || device.deviceModel.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} aria-hidden="true" />
            </label>
          )}
        </div>

        <section
          aria-label="Farm summary"
          className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <MetricCard
            icon={            <Layers3 size={19} />}
            label="Active microgreen racks"
            value={rackDataUnavailable ? "--" : String(racks.length).padStart(2, "0")}
            note={
              rackDataUnavailable
                ? "Rack data could not be loaded"
                : `${activeCrops.length} active crop${activeCrops.length === 1 ? "" : "s"}`
            }
          />
          <MetricCard
            icon={<Sprout size={19} />}
            label="Growing zones"
            value={rackDataUnavailable ? "--" : String(growingZoneCount).padStart(2, "0")}
            note={
              rackDataUnavailable
                ? "Rack data could not be loaded"
                : `${racks.length} active rack${racks.length === 1 ? "" : "s"} from your account`
            }
          />
          <MetricCard
            icon={<Wifi size={19} />}
            label="Devices online"
            value={loadError ? "--" : `${onlineCount} / ${devices.length}`}
            note={
              loadError
                ? "Device status could not be loaded"
                : devices.length === 0
                  ? "No linked devices"
                : devices.length - onlineCount
                  ? `${devices.length - onlineCount} need attention`
                  : "All connected devices are reporting"
            }
            tone={devices.length > onlineCount && !loadError ? "gold" : "green"}
          />
          <MetricCard
            icon={<CalendarDays size={19} />}
            label="Upcoming harvests"
            value={rackDataUnavailable ? "--" : String(activeCrops.length).padStart(2, "0")}
            note={
              rackDataUnavailable
                ? "Rack data could not be loaded"
                : `${activeCrops.filter((crop) => crop.status === "READY").length} ready to harvest`
            }
          />
        </section>

        <section className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <EnvironmentalChart
            sensors={numericSensors}
            telemetry={selectedDevice?.telemetry ?? []}
            deviceName={
              selectedDevice?.name || selectedDevice?.deviceModel.name || null
            }
          />

          <section className="rounded-2xl border border-[#e7e9df] bg-white p-5 shadow-[0_2px_12px_rgba(30,55,34,0.025)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#263b2c]">
                  Needs your attention
                </h2>
                <p className="mt-1 text-xs text-[#849080]">
                  {alerts.length} live device check{alerts.length === 1 ? "" : "s"}
                </p>
              </div>
              <Bell size={17} className="mt-0.5 text-[#819276]" aria-hidden="true" />
            </div>
            <div className="mt-4">
              <AlertList alerts={alerts} unavailable={alertStatusIncomplete} />
            </div>
            <div className="mt-4 rounded-xl border border-[#e8ecdE] bg-[#f5f7ee] p-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#e8eedb] text-[#7d9464]">
                  <Activity size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-medium text-[#58684e]">
                    Alert source
                  </p>
                  <p className="mt-1 text-[10px] leading-4 text-[#84907b]">
                    Derived from device check-ins and configured sensor limits. A separate alerts feed is not available in the documented API.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>

        <section className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <section className="rounded-2xl border border-[#e7e9df] bg-white p-5 shadow-[0_2px_12px_rgba(30,55,34,0.025)] sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#263b2c]">
                  Microgreen racks
                </h2>
                <p className="mt-1 text-xs text-[#849080]">
                  Crop cycles and device readings from your active racks
                </p>
              </div>
              <Link
                href="/home/monitor"
                className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#718665] hover:text-[#36573a]"
              >
                View all racks <ArrowRight size={13} />
              </Link>
            </div>
            {racks.length ? (
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {racks.slice(0, 3).map((rack, index) => (
                  <RackCard
                    key={rack.id}
                    rack={rack}
                    index={index}
                    device={devices.find((item) => item.id === rack.deviceId)}
                  />
                ))}
              </div>
            ) : (
              <EmptyPanel
                title={
                  loadError || rackDataUnavailable
                    ? "Rack data is unavailable"
                    : "No active racks yet"
                }
                detail={
                  loadError || rackDataUnavailable
                    ? "Retry the dashboard to fetch your rack information."
                    : "Connect a supported device to create a rack and see its crop cycles here."
                }
                action={
                  !loadError ? (
                    <Link
                      href="/home/add"
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#315b38] px-3.5 py-2 text-xs font-medium text-white"
                    >
                      <Plus size={14} /> Add a device
                    </Link>
                  ) : undefined
                }
              />
            )}
          </section>

          <section className="rounded-2xl border border-[#e7e9df] bg-white p-5 shadow-[0_2px_12px_rgba(30,55,34,0.025)] sm:p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-[#263b2c]">
                  Upcoming harvests
                </h2>
                <p className="mt-1 text-xs text-[#849080]">
                  Expected dates from active crop cycles
                </p>
              </div>
              <CalendarDays size={17} className="mt-0.5 text-[#819276]" aria-hidden="true" />
            </div>
            <HarvestList
              crops={activeCrops}
              now={clockNow}
              unavailable={rackDataUnavailable && activeCrops.length === 0}
            />
            <div className="mt-3 border-t border-[#eef0e9] pt-3 text-center">
              <Link
                href="/home/monitor"
                className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#718665] hover:text-[#36573a]"
              >
                View crop cycles <ArrowRight size={13} />
              </Link>
            </div>
          </section>
        </section>

        <footer className="mt-6 flex flex-col gap-2 border-t border-[#e6e9df] py-4 text-[10px] text-[#8a9585] sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-1.5">
            <Sprout size={13} />
            A more connected farm. A more confident grower.
          </span>
          <span>Dashboard readings and crop dates are provided by your authenticated API.</span>
        </footer>
      </div>
    </main>
  );
}
