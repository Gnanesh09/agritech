"use client";

import { isAxiosError } from "axios";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Cpu,
  Leaf,
  MapPin,
  Package,
  RefreshCw,
  ShoppingBag,
  Sprout,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import api from "../lib/axios";
import type {
  Device,
  HarvestCrop,
  Rack,
  SensorCapability,
  Telemetry,
} from "./dashboard-types";

type PageKey =
  | "microgreens"
  | "greenhouses"
  | "automations"
  | "alerts"
  | "agronomist"
  | "marketplace"
  | "intelligence"
  | "import-export";

type UserDevice = Omit<Device, "telemetry">;
type HistoryItem = {
  id: string;
  cropName: string;
  status: string;
  sowingDate: string;
  expectedHarvestDate: string;
  location?: { rackName: string; rowName: string; trayName: string };
};
type Automation = {
  id: string;
  name: string;
  status: string;
  trigger: { field?: string; operator?: string; value?: unknown };
  actions: Array<{ target?: string; value?: unknown }>;
  deviceId: string;
};
type Listing = {
  id: string;
  cropName: string;
  price: number | string;
  quantityAvailable: number;
  packSizeValue?: number;
  packSizeUnit?: string;
  seller?: { username?: string };
  sellerLocation?: { label?: string };
};

const pageDetails: Record<PageKey, { title: string; description: string }> = {
  microgreens: {
    title: "Microgreens",
    description: "Your active crops, rack capacity, and upcoming harvests.",
  },
  greenhouses: {
    title: "Greenhouses",
    description: "A growing-space overview based on the racks and devices linked to your account.",
  },
  automations: {
    title: "Automation",
    description: "Manage device rules that respond to your sensor readings.",
  },
  alerts: {
    title: "Alerts & Notifications",
    description: "Connection and sensor-range warnings derived from your latest device data.",
  },
  agronomist: {
    title: "AI Agronomist",
    description: "Farm readings and the current availability of agronomy assistance.",
  },
  marketplace: {
    title: "Marketplace",
    description: "Live listings and sellable harvests from the marketplace API.",
  },
  intelligence: {
    title: "Market Intelligence",
    description: "A factual snapshot of your farm data and documented market-data availability.",
  },
  "import-export": {
    title: "Import & Export",
    description: "Export your account data or see which import workflows are supported.",
  },
};

function messageFor(error: unknown) {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : "Request failed";
}

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;
  const timestamp = new Date(lastSeenAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now() && Date.now() - timestamp < 120_000;
}

function latestTelemetry(items: Telemetry[] | undefined) {
  return [...(items ?? [])].sort(
    (first, second) =>
      new Date(second.recordedAt).getTime() - new Date(first.recordedAt).getTime(),
  )[0];
}

function sensorLabel(sensor: SensorCapability) {
  return (sensor.label || sensor.key).replace(/[_-]+/g, " ");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function FieldNotice({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "warning" | "error";
}) {
  const style =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-[#e7e9df] bg-white text-[#64705f]";
  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-1 text-xs leading-5">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Sprout;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-[#e7e9df] bg-white p-5 shadow-[0_3px_18px_rgba(43,66,44,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-[#7b8875]">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eff3e9] text-[#668254]">
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[#294532]">{value}</p>
      <p className="mt-2 text-[11px] text-[#899284]">{detail}</p>
    </article>
  );
}

function Section({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e7e9df] bg-white p-5 shadow-[0_3px_18px_rgba(43,66,44,0.035)] sm:p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#354c38]">{title}</h2>
        {detail ? <p className="mt-1 text-xs text-[#899284]">{detail}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function WorkspacePage({ page }: { page: PageKey }) {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [dueCrops, setDueCrops] = useState<HarvestCrop[]>([]);
  const [telemetry, setTelemetry] = useState<Record<string, Telemetry[]>>({});
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [sellableCrops, setSellableCrops] = useState<Array<{ id: string; cropName: string; status: string }>>([]);
  const [locations, setLocations] = useState<Array<{ id: string; label: string; isDefault?: boolean }>>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setErrors([]);
    setActionMessage("");

    const failures: string[] = [];
    const request = async <T,>(label: string, operation: () => Promise<T>) => {
      try {
        return await operation();
      } catch (error) {
        failures.push(`${label}: ${messageFor(error)}`);
        return undefined;
      }
    };

    const needsDevices = ["greenhouses", "automations", "alerts", "agronomist", "intelligence", "import-export"].includes(page);
    const needsRacks = ["microgreens", "greenhouses", "agronomist", "intelligence", "import-export"].includes(page);
    const needsHistory = ["microgreens", "import-export"].includes(page);
    const needsDue = ["microgreens", "agronomist", "intelligence"].includes(page);
    const needsTelemetry = ["alerts", "agronomist", "intelligence"].includes(page);

    const [deviceResponse, rackResponse, historyResponse, dueResponse] = await Promise.all([
      needsDevices ? request("Devices", () => api.get<{ devices: UserDevice[] }>("/user/devices")) : undefined,
      needsRacks ? request("Racks", () => api.get<{ racks: Rack[] }>("/user/racks")) : undefined,
      needsHistory ? request("Crop history", () => api.get<{ history: HistoryItem[] }>("/user/crop-cycles/history", { params: { status: "ALL", limit: 100 } })) : undefined,
      needsDue ? request("Upcoming harvests", () => api.get<{ crops: HarvestCrop[] }>("/user/crop-cycles/harvest-due")) : undefined,
    ]);

    const deviceList = deviceResponse?.data?.devices ?? [];
    setDevices(deviceList);
    setRacks(rackResponse?.data?.racks ?? []);
    setHistory(historyResponse?.data?.history ?? []);
    setDueCrops(dueResponse?.data?.crops ?? []);

    if (needsTelemetry && deviceList.length) {
      const results = await Promise.all(
        deviceList.map(async (device) => {
          const response = await request(
            `Telemetry for ${device.name || device.deviceModel.name}`,
            () => api.get<{ telemetry: Telemetry[] }>(`/user/devices/${device.id}/telemetry`),
          );
          return [device.id, response?.data?.telemetry ?? []] as const;
        }),
      );
      setTelemetry(Object.fromEntries(results));
    } else {
      setTelemetry({});
    }

    if (page === "automations" && deviceList.length) {
      const results = await Promise.all(
        deviceList.map(async (device) => {
          const response = await request(
            `Automations for ${device.name || device.deviceModel.name}`,
            () => api.get<{ automations: Automation[] }>(`/user/devices/${device.id}/automations`),
          );
          return response?.data?.automations ?? [];
        }),
      );
      setAutomations(results.flat());
    } else if (page !== "automations") {
      setAutomations([]);
    }

    if (page === "marketplace") {
      const [listingResponse, mineResponse, cropsResponse, locationResponse] = await Promise.all([
        request("Marketplace listings", () => api.get<{ listings: Listing[] }>("/user/marketplace/listings", { params: { q: searchQuery || undefined, sort: "NEWEST" } })),
        request("Your listings", () => api.get<{ listings: Listing[] }>("/user/marketplace/my-listings")),
        request("Sellable crops", () => api.get<{ crops: Array<{ id: string; cropName: string; status: string }> }>("/user/marketplace/my-crops")),
        request("Marketplace locations", () => api.get<{ locations: Array<{ id: string; label: string; isDefault?: boolean }> }>("/user/marketplace/locations")),
      ]);
      setListings(listingResponse?.data?.listings ?? []);
      setMyListings(mineResponse?.data?.listings ?? []);
      setSellableCrops(cropsResponse?.data?.crops ?? []);
      setLocations(locationResponse?.data?.locations ?? []);
    } else {
      setListings([]);
      setMyListings([]);
      setSellableCrops([]);
      setLocations([]);
    }

    setErrors(failures);
    setLoading(false);
    setRefreshing(false);
  }, [page, searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const details = pageDetails[page];
  const cropCount = useMemo(
    () => racks.reduce((count, rack) => count + rack.rows.reduce(
      (rowCount, row) => rowCount + row.trays.filter((tray) => tray.currentCrop).length,
      0,
    ), 0),
    [racks],
  );

  async function updateAutomation(automation: Automation, enabled: boolean) {
    setActionMessage("");
    try {
      const response = await api.patch(`/user/automations/${automation.id}/status`, { enabled });
      const updated = response.data?.automation as Automation | undefined;
      setAutomations((current) =>
        current.map((item) => item.id === automation.id ? updated ?? { ...item, status: enabled ? "ACTIVE" : "PAUSED" } : item),
      );
      setActionMessage(`“${automation.name}” ${enabled ? "enabled" : "paused"}.`);
    } catch (error) {
      setActionMessage(`Could not update automation: ${messageFor(error)}`);
    }
  }

  async function deleteAutomation(automation: Automation) {
    setActionMessage("");
    try {
      await api.delete(`/user/automations/${automation.id}`);
      setAutomations((current) => current.filter((item) => item.id !== automation.id));
      setActionMessage(`“${automation.name}” deleted.`);
    } catch (error) {
      setActionMessage(`Could not delete automation: ${messageFor(error)}`);
    }
  }

  function exportCsv() {
    const quote = (value: unknown) => {
      const text = String(value ?? "");
      const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [
      ["record_type", "name", "status", "device_or_location", "date_or_code"],
      ...devices.map((device) => ["device", device.name || device.deviceModel.name, device.status, device.deviceCode, device.lastSeenAt]),
      ...racks.map((rack) => ["rack", rack.name, rack.status, rack.deviceId, `${rack.rowCount} rows`]),
      ...history.map((crop) => ["crop_cycle", crop.cropName, crop.status, crop.location?.rackName, crop.expectedHarvestDate]),
    ];
    const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `smartagri-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setActionMessage("Your account data export has been downloaded.");
  }

  const alerts = devices.flatMap((device) => {
    const label = device.name || device.deviceModel.name;
    const items: Array<{ id: string; title: string; detail: string; critical: boolean }> = [];
    if (!isOnline(device.lastSeenAt)) {
      items.push({
        id: `${device.id}-connection`,
        title: device.lastSeenAt ? "Device has stopped checking in" : "No device check-in recorded",
        detail: `${label} · ${device.lastSeenAt ? `Last seen ${formatDate(device.lastSeenAt)}` : "No last-seen time"}`,
        critical: false,
      });
    }
    const latest = latestTelemetry(telemetry[device.id]);
    if (latest) {
      for (const sensor of device.deviceModel.capabilities.sensors) {
        if (sensor.type !== "number") continue;
        const value = Number(latest.data[sensor.key]);
        if (!Number.isFinite(value)) continue;
        if ((sensor.min !== undefined && value < sensor.min) || (sensor.max !== undefined && value > sensor.max)) {
          items.push({
            id: `${device.id}-${sensor.key}`,
            title: `${sensorLabel(sensor)} is outside its configured range`,
            detail: `${label} · ${value}${sensor.unit ? ` ${sensor.unit}` : ""}`,
            critical: true,
          });
        }
      }
    }
    return items;
  });

  return (
    <main className="dashboard-root min-h-screen bg-[#f6f7f1] px-4 pb-28 pt-7 text-[#2d4030] sm:px-7 lg:px-10 lg:pb-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#82917b]">SmartAgri workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#294532]">{details.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#7b8875]">{details.description}</p>
          </div>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading || refreshing}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#dfe5d8] bg-white px-4 py-2.5 text-xs font-semibold text-[#52664b] transition hover:bg-[#f8faf5] disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {errors.length > 0 ? (
          <div className="mb-5 space-y-2">
            {errors.map((error) => <FieldNotice key={error} title="Some account data could not be loaded" tone="error">{error}</FieldNotice>)}
          </div>
        ) : null}
        {actionMessage ? <p role="status" className="mb-4 rounded-xl bg-[#eaf0e1] px-4 py-3 text-xs text-[#4e7047]">{actionMessage}</p> : null}
        {loading ? (
          <div role="status" className="rounded-2xl border border-[#e7e9df] bg-white p-10 text-center text-sm text-[#7b8875]">
            <RefreshCw size={18} className="mx-auto mb-3 animate-spin" />
            Loading your account data…
          </div>
        ) : (
          <div className="space-y-5">
            {page === "microgreens" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Active racks" value={racks.length} detail="From your linked rack records" icon={LayersIcon} />
                  <StatCard label="Growing trays" value={cropCount} detail="Trays with a current crop cycle" icon={Sprout} />
                  <StatCard label="Harvest ready" value={dueCrops.length} detail="From the harvest-due endpoint" icon={Leaf} />
                </div>
                <Section title="Growing racks" detail="Crop and tray details are loaded from your account.">
                  {racks.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{racks.map((rack) => (
                    <article key={rack.id} className="rounded-xl border border-[#edf0e8] p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="truncate text-sm font-semibold text-[#405642]">{rack.name}</h3>
                        <span className="rounded-full bg-[#eff3e9] px-2.5 py-1 text-[10px] text-[#647d45]">{rack.status}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#899284]">{rack.rowCount} rows · {rack.traysPerRow} trays per row</p>
                      <div className="mt-4 space-y-2">{rack.rows.flatMap((row) => row.trays.map((tray) => (
                        <div key={tray.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#fafbf8] px-3 py-2">
                          <span className="truncate text-xs text-[#687565]">{row.name} / {tray.name}</span>
                          <span className="truncate text-xs font-medium text-[#405642]">{tray.currentCrop?.cropName ?? "Empty tray"}</span>
                        </div>
                      )))}</div>
                    </article>
                  ))}</div> : <EmptyState title="No growing racks yet" detail="Racks appear here after they are linked to your account." /> }
                </Section>
                <Section title="Upcoming harvests" detail="Harvest dates reflect your recorded crop cycles.">
                  {dueCrops.length ? <div className="divide-y divide-[#edf0e8]">{dueCrops.map((crop) => (
                    <div key={crop.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                      <div><p className="text-sm font-medium text-[#405642]">{crop.cropName}</p><p className="mt-1 text-[11px] text-[#899284]">{crop.tray.row.rack.name} · {crop.tray.name}</p></div>
                      <span className="text-xs text-[#647d45]">{formatDate(crop.expectedHarvestDate)}</span>
                    </div>
                  ))}</div> : <EmptyState title="No harvests due" detail="There are no crops currently marked ready for harvest." /> }
                </Section>
              </>
            ) : null}

            {page === "greenhouses" ? (
              <>
                <FieldNotice title="Rack-based overview">
                  The documented API provides racks and devices, but no separate greenhouse records. These cards describe your linked grow racks, not distinct greenhouse structures.
                </FieldNotice>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Grow racks" value={racks.length} detail="Active racks returned by the API" icon={LayersIcon} />
                  <StatCard label="Linked devices" value={devices.length} detail="Devices in your account" icon={Cpu} />
                  <StatCard label="Online devices" value={devices.filter((device) => isOnline(device.lastSeenAt)).length} detail="Checked in within the last two minutes" icon={Wifi} />
                </div>
                <Section title="Growing spaces" detail="Racks are grouped by their linked device where available.">
                  {racks.length ? <div className="grid gap-4 md:grid-cols-2">{racks.map((rack) => {
                    const device = devices.find((item) => item.id === rack.deviceId);
                    return <article key={rack.id} className="rounded-xl border border-[#edf0e8] p-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff3e9] text-[#6f8d5e]"><Sprout size={19} /></span>
                        <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-[#405642]">{rack.name}</h3><p className="text-[11px] text-[#899284]">{device ? device.name || device.deviceModel.name : "No linked device details"}</p></div>
                      </div>
                      <p className="mt-4 text-xs text-[#72806d]">{rack.rows.length} rows · {rack.rows.reduce((n, row) => n + row.trays.length, 0)} trays</p>
                    </article>;
                  })}</div> : <EmptyState title="No rack records available" detail="The API returned no active racks for your account." /> }
                </Section>
              </>
            ) : null}

            {page === "automations" ? (
              <>
                <FieldNotice title="Rules are tied to individual devices">
                  Automation rules are read from and updated through the documented device automation endpoints.
                </FieldNotice>
                <Section title="Device automations" detail={`${automations.length} rule${automations.length === 1 ? "" : "s"} across ${devices.length} linked device${devices.length === 1 ? "" : "s"}.`}>
                  {automations.length ? <div className="space-y-3">{automations.map((automation) => {
                    const device = devices.find((item) => item.id === automation.deviceId);
                    const enabled = automation.status === "ACTIVE";
                    return <article key={automation.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#edf0e8] p-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2"><h3 className="truncate text-sm font-semibold text-[#405642]">{automation.name}</h3><span className={`rounded-full px-2.5 py-1 text-[10px] ${enabled ? "bg-[#eff3e9] text-[#647d45]" : "bg-[#f4f1e8] text-[#8b7953]"}`}>{enabled ? "Active" : "Paused"}</span></div>
                        <p className="mt-1 text-[11px] text-[#899284]">{device?.name || device?.deviceModel.name || "Device"} · when {automation.trigger?.field ?? "sensor"} {automation.trigger?.operator ?? "changes"} {String(automation.trigger?.value ?? "")}</p>
                        <p className="mt-1 text-[11px] text-[#899284]">Action: {automation.actions?.map((action) => `${action.target ?? "actuator"} → ${String(action.value ?? "")}`).join(", ") || "Not specified"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => void updateAutomation(automation, !enabled)} className="rounded-full border border-[#dfe5d8] px-3 py-2 text-[11px] font-semibold text-[#52664b] hover:bg-[#f8faf5]">{enabled ? "Pause" : "Enable"}</button>
                        <button type="button" onClick={() => void deleteAutomation(automation)} className="rounded-full border border-red-200 px-3 py-2 text-[11px] font-semibold text-red-700 hover:bg-red-50">Delete</button>
                      </div>
                    </article>;
                  })}</div> : <EmptyState title={devices.length ? "No automations configured" : "No linked devices"} detail={devices.length ? "No rules were returned for your devices." : "Link a device before managing its automations."} action={<Link className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#647d45]" href="/home/add">Add a device <ArrowRight size={14} /></Link>} /> }
                </Section>
              </>
            ) : null}

            {page === "alerts" ? (
              <>
                <FieldNotice title="Device-derived alerts only" tone="warning">
                  There is no standalone alerts feed in the documented API. These warnings are calculated from device check-in times and configured sensor min/max limits; they are not persisted or push notifications.
                </FieldNotice>
                <Section title="Current conditions" detail="A device is considered online when it checked in within the last two minutes.">
                  {alerts.length ? <div className="space-y-3">{alerts.map((alert) => <article key={alert.id} className={`flex gap-3 rounded-xl border p-4 ${alert.critical ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    <AlertTriangle size={17} className={`mt-0.5 shrink-0 ${alert.critical ? "text-red-600" : "text-amber-700"}`} />
                    <div><h3 className={`text-sm font-semibold ${alert.critical ? "text-red-800" : "text-amber-900"}`}>{alert.title}</h3><p className="mt-1 text-xs text-[#7b7462]">{alert.detail}</p></div>
                  </article>)}</div> : <EmptyState title={devices.length ? "No device warnings" : "No devices to monitor"} detail={devices.length ? "Your latest reported values are within the configured sensor ranges and devices are checking in." : "Link a device to see connection and sensor-range warnings."} /> }
                </Section>
              </>
            ) : null}

            {page === "agronomist" ? (
              <>
                <FieldNotice title="AI agronomy is not connected" tone="warning">
                  No AI agronomist endpoint appears in the supplied API documentation. This page does not generate or invent AI recommendations.
                </FieldNotice>
                <Section title="Your latest sensor readings" detail="Live account readings only; no recommendation is inferred from missing values.">
                  {devices.length ? <div className="grid gap-3 sm:grid-cols-2">{devices.flatMap((device) => {
                    const latest = latestTelemetry(telemetry[device.id]);
                    return device.deviceModel.capabilities.sensors.map((sensor) => {
                      const value = latest?.data?.[sensor.key];
                      return <div key={`${device.id}-${sensor.key}`} className="rounded-xl border border-[#edf0e8] p-4">
                        <p className="text-[11px] text-[#899284]">{device.name || device.deviceModel.name} · {sensorLabel(sensor)}</p>
                        <p className="mt-2 text-lg font-semibold text-[#405642]">{value === undefined || value === null ? "No reading" : `${String(value)}${sensor.unit ? ` ${sensor.unit}` : ""}`}</p>
                        <p className="mt-1 text-[10px] text-[#899284]">{latest ? `Reported ${formatDate(latest.recordedAt)}` : "No telemetry recorded"}</p>
                      </div>;
                    });
                  })}</div> : <EmptyState title="No farm readings yet" detail="Link a device to view the sensor data available to your account." action={<Link className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#647d45]" href="/home/add">Add a device <ArrowRight size={14} /></Link>} /> }
                </Section>
              </>
            ) : null}

            {page === "marketplace" ? (
              <>
                <form onSubmit={(event) => { event.preventDefault(); setSearchQuery(search.trim()); }} className="flex flex-wrap gap-2 rounded-2xl border border-[#e7e9df] bg-white p-3">
                  <label className="sr-only" htmlFor="marketplace-search">Search listings</label>
                  <input id="marketplace-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search crops or descriptions" className="min-w-[180px] flex-1 rounded-full border border-[#e7e9df] bg-[#fafbf8] px-4 py-2.5 text-sm outline-none focus:border-[#9bb38b]" />
                  <button type="submit" className="rounded-full bg-[#eaf0e1] px-5 py-2.5 text-xs font-semibold text-[#4e7047]">Search listings</button>
                </form>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Available listings" value={listings.length} detail="Live listings returned by the marketplace" icon={ShoppingBag} />
                  <StatCard label="Your listings" value={myListings.length} detail="Listings associated with your account" icon={Package} />
                  <StatCard label="Sellable crops" value={sellableCrops.length} detail="Crop cycles eligible for listing" icon={Leaf} />
                </div>
                <Section title="Marketplace listings" detail="Only active listings returned by the authenticated marketplace API are shown.">
                  {listings.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{listings.map((listing) => <article key={listing.id} className="rounded-xl border border-[#edf0e8] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff3e9] text-[#6f8d5e]"><Leaf size={19} /></div>
                    <h3 className="mt-3 text-sm font-semibold text-[#405642]">{listing.cropName}</h3>
                    <p className="mt-1 text-xs text-[#899284]">{listing.packSizeValue ? `${listing.packSizeValue} ${listing.packSizeUnit ?? ""} pack · ` : ""}{listing.quantityAvailable} available</p>
                    <p className="mt-3 text-lg font-semibold text-[#294532]">{Number.isFinite(Number(listing.price)) ? `₹${Number(listing.price).toFixed(2)}` : "Price unavailable"}</p>
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-[#899284]"><MapPin size={12} />{listing.sellerLocation?.label || "Seller location not listed"} · {listing.seller?.username || "Seller"}</p>
                  </article>)}</div> : <EmptyState title="No marketplace listings found" detail={searchQuery ? "Try another search term, or check back when sellers add listings." : "There are currently no active listings in the marketplace."} /> }
                </Section>
                <div className="grid gap-5 lg:grid-cols-2">
                  <Section title="Your sellable crops">
                    {sellableCrops.length ? <ul className="space-y-2">{sellableCrops.map((crop) => <li key={crop.id} className="flex justify-between gap-3 rounded-lg bg-[#fafbf8] px-3 py-2 text-xs"><span>{crop.cropName}</span><span className="text-[#899284]">{crop.status}</span></li>)}</ul> : <p className="text-xs text-[#899284]">No sellable crops returned for your account.</p>}
                  </Section>
                  <Section title="Your marketplace locations">
                    {locations.length ? <ul className="space-y-2">{locations.map((location) => <li key={location.id} className="flex justify-between gap-3 rounded-lg bg-[#fafbf8] px-3 py-2 text-xs"><span>{location.label}</span><span className="text-[#899284]">{location.isDefault ? "Default" : "Saved"}</span></li>)}</ul> : <p className="text-xs text-[#899284]">No saved marketplace locations returned.</p>}
                  </Section>
                </div>
              </>
            ) : null}

            {page === "intelligence" ? (
              <>
                <FieldNotice title="Market data is not available" tone="warning">
                  The documented API contains no market-price, demand, or market-trend endpoint. The snapshot below uses your actual device telemetry and crop records only; it is not market analysis.
                </FieldNotice>
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard label="Linked devices" value={devices.length} detail="Account device records" icon={Cpu} />
                  <StatCard label="Growing crops" value={cropCount} detail="Current crops across returned racks" icon={Sprout} />
                  <StatCard label="Harvest-ready" value={dueCrops.length} detail="Returned by the harvest-due endpoint" icon={Leaf} />
                </div>
                <Section title="Latest reported measurements" detail="Most recent telemetry values returned per linked device.">
                  {devices.some((device) => latestTelemetry(telemetry[device.id])) ? <div className="grid gap-3 sm:grid-cols-2">{devices.flatMap((device) => {
                    const latest = latestTelemetry(telemetry[device.id]);
                    if (!latest) return [];
                    return device.deviceModel.capabilities.sensors.map((sensor) => <div key={`${device.id}-${sensor.key}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#edf0e8] p-4">
                      <div className="min-w-0"><p className="truncate text-xs font-medium text-[#405642]">{sensorLabel(sensor)}</p><p className="mt-1 truncate text-[10px] text-[#899284]">{device.name || device.deviceModel.name}</p></div>
                      <p className="shrink-0 text-sm font-semibold text-[#294532]">{String(latest.data[sensor.key] ?? "—")}{sensor.unit ? ` ${sensor.unit}` : ""}</p>
                    </div>);
                  })}</div> : <EmptyState title="No telemetry available" detail="Device measurements will appear here when telemetry has been reported." /> }
                </Section>
              </>
            ) : null}

            {page === "import-export" ? (
              <>
                <FieldNotice title="Import API not documented" tone="warning">
                  No bulk import endpoint is available in the supplied API contract. Uploading a file here would not import it. Device linking and crop planting remain available through their existing workflows.
                </FieldNotice>
                <Section title="Export account data" detail="Downloads the account records loaded from the authenticated devices, racks, and crop-history endpoints.">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard label="Devices" value={devices.length} detail="User device records" icon={Cpu} />
                    <StatCard label="Racks" value={racks.length} detail="Active rack records" icon={LayersIcon} />
                    <StatCard label="Crop cycles" value={history.length} detail="Most recent 100 history records" icon={Leaf} />
                  </div>
                  <button type="button" onClick={exportCsv} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eaf0e1] px-5 py-3 text-xs font-semibold text-[#4e7047] transition hover:bg-[#e1ead5]">
                    <ArrowDownToLine size={15} /> Download account CSV
                  </button>
                  <p className="mt-3 text-[11px] text-[#899284]">The file includes device identifiers, rack dimensions, and crop status/date fields. It does not include credentials or tokens.</p>
                </Section>
                <Section title="Supported data entry">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Link href="/home/add" className="flex items-center justify-between rounded-xl border border-[#edf0e8] p-4 text-xs font-medium text-[#52664b] hover:bg-[#fafbf8]">Link a device <ArrowRight size={15} /></Link>
                    <Link href="/home/microgreens" className="flex items-center justify-between rounded-xl border border-[#edf0e8] p-4 text-xs font-medium text-[#52664b] hover:bg-[#fafbf8]">Review crop records <ArrowRight size={15} /></Link>
                  </div>
                </Section>
              </>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}

function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#e2e6da] bg-[#fafbf8] px-5 py-8 text-center">
      <Sprout size={22} className="mx-auto text-[#829b70]" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-[#405642]">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#899284]">{detail}</p>
      {action}
    </div>
  );
}

const LayersIcon = Sprout;
