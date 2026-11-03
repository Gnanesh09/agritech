"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, CircleAlert, Cpu, RefreshCw, Wifi, X } from "lucide-react";

import {
  type Device,
  getApiErrorMessage,
  getDevice,
  getDevices,
} from "@/app/lib/devices";

function isOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) return false;
  const timestamp = new Date(lastSeenAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= Date.now() && Date.now() - timestamp < 120_000;
}

function formatDate(value?: string | null) {
  if (!value) return "No check-in yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Time unavailable"
    : date.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function DevicesAndSensorsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const loadDevices = useCallback(async (manual = false) => {
    if (manual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      setDevices(await getDevices());
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load your devices. Please try again."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Fetching is intentionally initiated when this protected page mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDevices();
  }, [loadDevices]);

  async function openDetails(id: string) {
    setSelectedDevice(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      setSelectedDevice(await getDevice(id));
    } catch (requestError) {
      setDetailsError(getApiErrorMessage(requestError, "Unable to load device details."));
    } finally {
      setDetailsLoading(false);
    }
  }

  const onlineCount = devices.filter((device) => isOnline(device.lastSeenAt)).length;

  return (
    <main className="min-h-screen bg-[#f6f6f2] px-4 pb-32 pt-7 text-[#202020] sm:px-6 lg:pb-10">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium tracking-[0.16em] text-[#999991]">FARM OPERATIONS</p>
            <h1 className="mt-1 text-[29px] font-semibold tracking-[-0.06em]">Devices &amp; Sensors</h1>
            <p className="mt-1 text-xs text-[#777970]">Monitor equipment, connection status, and available sensors.</p>
          </div>
          <button type="button" onClick={() => void loadDevices(true)} disabled={refreshing} aria-label="Refresh devices" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.03)] disabled:opacity-50">
            <RefreshCw size={17} className={refreshing ? "animate-spin" : ""} />
          </button>
        </header>

        {error ? <div role="alert" className="mt-6 flex items-center gap-2 rounded-[20px] bg-[#fff0f0] px-4 py-3 text-xs text-red-600"><CircleAlert size={17} />{error}</div> : null}

        <section className="mt-7 grid grid-cols-2 gap-3 sm:max-w-md">
          <StatCard label="Registered" value={devices.length} />
          <StatCard label="Online" value={onlineCount} />
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-[21px] font-semibold tracking-[-0.045em]">Registered devices</h2>
            <p className="mt-1 text-[11px] text-[#999991]">Select a device to see its details and supported sensors.</p>
          </div>
          {loading ? <DeviceListSkeleton /> : devices.length === 0 ? <EmptyState /> : <div className="grid gap-3 md:grid-cols-2">{devices.map((device) => <DeviceCard key={device.id} device={device} onSelect={() => void openDetails(device.id)} />)}</div>}
        </section>
      </div>
      {detailsLoading || selectedDevice || detailsError ? <DeviceDetailsDrawer device={selectedDevice} loading={detailsLoading} error={detailsError} onClose={() => { setSelectedDevice(null); setDetailsError(""); }} /> : null}
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-[24px] bg-white p-4 shadow-[0_5px_25px_rgba(0,0,0,0.025)]"><p className="text-[11px] text-[#999991]">{label}</p><p className="mt-1 text-[27px] font-semibold tracking-[-0.055em]">{value}</p></div>;
}

function DeviceListSkeleton() {
  return <div className="grid gap-3 md:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-[28px] bg-white" />)}</div>;
}

function EmptyState() {
  return <div className="rounded-[30px] bg-white px-6 py-12 text-center shadow-[0_5px_25px_rgba(0,0,0,0.025)]"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e5ffad]"><Wifi size={25} /></div><h3 className="mt-4 text-lg font-semibold">No devices registered</h3><p className="mx-auto mt-2 max-w-[300px] text-xs leading-5 text-[#999991]">Use Add Device in Farm operations to connect your first ESP32 device.</p></div>;
}

function DeviceCard({ device, onSelect }: { device: Device; onSelect: () => void }) {
  const online = isOnline(device.lastSeenAt);
  const sensorCount = device.deviceModel.capabilities?.sensors?.length ?? 0;
  return <button type="button" onClick={onSelect} className="flex w-full items-center rounded-[28px] bg-white p-4 text-left shadow-[0_5px_25px_rgba(0,0,0,0.025)] transition hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:scale-[0.985]"><div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[#e5ffad]">{device.deviceModel.imageUrl ? <img src={device.deviceModel.imageUrl} alt="" className="h-full w-full object-contain p-2" /> : <Cpu size={22} />}</div><div className="min-w-0 flex-1 px-4"><h3 className="truncate text-[15px] font-semibold">{device.name || device.deviceModel.name}</h3><p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-[#999991]">{device.deviceCode}</p><p className="mt-2 text-[10px] text-[#777970]">{device.deviceModel.name}{sensorCount ? ` · ${sensorCount} sensor${sensorCount === 1 ? "" : "s"}` : ""}</p><span className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium ${online ? "text-[#647d45]" : "text-[#777970]"}`}><span className={`h-2 w-2 rounded-full ${online ? "bg-[#a6d94e]" : "bg-[#9ca3af]"}`} />{online ? "Online" : device.status || "Offline"}</span></div><ChevronRight size={18} className="shrink-0 text-[#c3c3bd]" /></button>;
}

function DeviceDetailsDrawer({ device, loading, error, onClose }: { device: Device | null; loading: boolean; error: string; onClose: () => void }) {
  const sensors = device?.deviceModel.capabilities?.sensors ?? [];
  return <div role="dialog" aria-modal="true" aria-labelledby="device-details-title" className="fixed inset-0 z-[60] flex justify-end bg-black/35"><button type="button" aria-label="Close device details" onClick={onClose} className="absolute inset-0 cursor-default" /><aside className="relative h-full w-full max-w-md overflow-y-auto bg-[#f6f6f2] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="device-details-title" className="text-xl font-semibold tracking-[-0.045em]">Device details</h2><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white" aria-label="Close"><X size={17} /></button></div>{loading ? <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white" /> : error ? <p role="alert" className="mt-6 rounded-xl bg-[#fff0f0] p-4 text-xs text-red-600">{error}</p> : device ? <div className="mt-6 rounded-[24px] bg-white p-5"><div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#e5ffad]">{device.deviceModel.imageUrl ? <img src={device.deviceModel.imageUrl} alt="" className="h-full w-full object-contain p-2" /> : <Cpu size={22} />}</div><h3 className="mt-4 text-lg font-semibold">{device.name || device.deviceModel.name}</h3><dl className="mt-6 space-y-4"><Detail label="Device code" value={device.deviceCode} /><Detail label="Model" value={device.deviceModel.name} /><Detail label="Status" value={isOnline(device.lastSeenAt) ? "Online" : device.status || "Offline"} /><Detail label="Last seen" value={formatDate(device.lastSeenAt)} />{device.serialNumber ? <Detail label="Serial number" value={device.serialNumber} /> : null}{device.firmwareVersion ? <Detail label="Firmware" value={device.firmwareVersion} /> : null}</dl><div className="mt-6"><h3 className="text-sm font-semibold">Available sensors</h3>{sensors.length ? <ul className="mt-3 space-y-2">{sensors.map((sensor) => <li key={sensor.key} className="rounded-xl bg-[#f6f6f2] px-3 py-2 text-xs text-[#4f514c]">{sensor.label || sensor.key}{sensor.unit ? ` (${sensor.unit})` : ""}</li>)}</ul> : <p className="mt-2 text-xs text-[#999991]">No sensor capabilities were returned for this device.</p>}</div></div> : null}</aside></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-5 border-b border-[#f0f0eb] pb-3"><dt className="text-xs text-[#999991]">{label}</dt><dd className="text-right text-xs font-medium text-[#30322f]">{value}</dd></div>;
}
