"use client";

import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Droplets,
  Fan,
  Leaf,
  Lightbulb,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Sprout,
  Sun,
  Thermometer,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchDeviceState,
  fetchRack,
  fetchTelemetry,
  harvestCropCycle,
  plantTrayCrop,
  renameRack,
  renameRackRow,
  renameRackTray,
  requestActuatorState,
  updateCropCycle,
} from "../api";
import { readDemoRacks, writeDemoRacks } from "../demo-store";
import type {
  CropCycle,
  DeviceState,
  Rack,
  RackDevice,
  RackRow,
  RackTray,
  Telemetry,
} from "../types";

type Range = "24 hours" | "7 days" | "30 days";
type SensorKind = "temperature" | "humidity" | "light" | "moisture";
type CommandFeedback = {
  status: "pending" | "success" | "failed" | "offline";
  message?: string;
};
type CropEditorState = { tray: RackTray; cycle?: CropCycle } | null;

const demoCycleDate = () => new Date().toISOString().slice(0, 10);

function messageFor(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = error.response;
    if (typeof response === "object" && response !== null && "data" in response) {
      const data = response.data;
      if (typeof data === "object" && data !== null && "message" in data && typeof data.message === "string") {
        return data.message;
      }
    }
  }
  return error instanceof Error ? error.message : "The request failed.";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function online(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  const elapsed = Date.now() - new Date(lastSeenAt).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 120_000;
}

function activeCycles(rack: Rack) {
  return rack.rows.flatMap((row) =>
    row.trays.flatMap((tray) => (tray.currentCrop ? [{ row, tray, cycle: tray.currentCrop }] : [])),
  );
}

function hasSupportedPhysicalLayout(rack: Rack) {
  return (
    (rack.rowCount === 3 || rack.rowCount === 4) &&
    rack.rows.length === rack.rowCount &&
    rack.traysPerRow === 4 &&
    rack.rows.every((row) => row.trays.length === 4)
  );
}

function sensorKey(device: RackDevice | undefined, row: RackRow | undefined, kind: SensorKind) {
  const configured =
    kind === "temperature"
      ? row?.temperatureSensorKey
      : kind === "humidity"
        ? row?.humiditySensorKey
        : kind === "light"
          ? row?.lightSensorKey
          : null;
  if (configured) return configured;
  const sensors = device?.deviceModel.capabilities.sensors ?? [];
  return sensors.find((sensor) => {
    const text = `${sensor.key} ${sensor.label ?? ""}`.toLowerCase();
    return kind === "temperature"
      ? text.includes("temperature") || text.includes("temp")
      : kind === "humidity"
        ? text.includes("humidity")
        : kind === "light"
          ? text.includes("light") || text.includes("lux")
          : text.includes("moisture");
  })?.key;
}

function latestValue(
  telemetry: Telemetry[],
  device: RackDevice | undefined,
  row: RackRow | undefined,
  kind: SensorKind,
) {
  const key = sensorKey(device, row, kind);
  const data = telemetry[0]?.data;
  if (!key || !data) return undefined;
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function unitFor(kind: SensorKind) {
  return kind === "temperature" ? "°C" : kind === "light" ? "lx" : "%";
}

function formatValue(value: number | undefined, kind: SensorKind) {
  if (value === undefined) return "—";
  const formatted =
    kind === "temperature" ? value.toFixed(1) : kind === "light" ? value.toLocaleString() : `${Math.round(value)}`;
  return `${formatted}${unitFor(kind)}`;
}

function samplesForRange(telemetry: Telemetry[], range: Range) {
  const duration =
    range === "24 hours"
      ? 24 * 60 * 60 * 1000
      : range === "7 days"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - duration;
  return telemetry
    .filter((item) => Number.isFinite(new Date(item.recordedAt).getTime()) && new Date(item.recordedAt).getTime() >= cutoff)
    .slice()
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "neutral" }) {
  const style =
    tone === "green"
      ? "bg-[#edf4e9] text-[#527648]"
      : tone === "amber"
        ? "bg-[#faf1df] text-[#9a6b22]"
        : tone === "red"
          ? "bg-[#fbeaea] text-[#a64242]"
          : "bg-[#f3f5ef] text-[#74806e]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${style}`}>{children}</span>;
}

function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Thermometer;
}) {
  return (
    <article className="rounded-xl border border-[#e5e9e0] bg-white p-4 shadow-[0_3px_18px_rgba(43,66,44,0.035)] sm:p-5">
      <div className="flex items-start justify-between gap-3"><p className="text-[11px] text-[#7b8875]">{label}</p><span className="rounded-lg bg-[#edf4e9] p-2 text-[#789565]"><Icon size={17} /></span></div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#294532] sm:text-[28px]">{value}</p>
      <p className="mt-1 text-[10px] text-[#899284]">{note}</p>
    </article>
  );
}

function HistoryChart({
  telemetry,
  device,
  row,
  kind,
  range,
}: {
  telemetry: Telemetry[];
  device?: RackDevice;
  row?: RackRow;
  kind: SensorKind;
  range: Range;
}) {
  const samples = samplesForRange(telemetry, range)
    .map((sample) => ({ ...sample, value: sample.data[sensorKey(device, row, kind) ?? ""] }))
    .filter((sample): sample is Telemetry & { value: number } => typeof sample.value === "number" && Number.isFinite(sample.value));
  if (!samples.length) {
    return <div className="flex h-[220px] items-center justify-center rounded-lg bg-[#fafbf8] px-5 text-center text-xs text-[#879284]">No {kind} history is available in this time range.</div>;
  }
  const values = samples.map((sample) => sample.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = samples.map((sample, index) => {
    const x = 26 + (index / Math.max(1, samples.length - 1)) * 668;
    const y = 185 - ((sample.value - min) / span) * 145;
    return `${x},${y}`;
  }).join(" ");
  const first = samples[0];
  const last = samples[samples.length - 1];
  return (
    <div className="min-w-0">
      <div className="mb-2 flex justify-between text-[10px] text-[#899284]"><span>{max.toFixed(kind === "temperature" ? 1 : 0)} {unitFor(kind)}</span><span>{min.toFixed(kind === "temperature" ? 1 : 0)} {unitFor(kind)}</span></div>
      <svg viewBox="0 0 720 220" role="img" aria-label={`${kind} history over ${range}`} className="h-[210px] w-full overflow-visible">
        {[40, 88, 136, 184].map((y) => <line key={y} x1="20" x2="700" y1={y} y2={y} stroke="#e9eee6" strokeDasharray="3 5" />)}
        <polygon points={`26,200 ${points} 694,200`} fill="#82b96e" opacity="0.13" />
        <polyline points={points} fill="none" stroke="#5d994a" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {samples.length === 1 ? <circle cx="26" cy="185" r="4" fill="#5d994a" /> : null}
      </svg>
      <div className="flex justify-between text-[10px] text-[#899284]"><span>{new Date(first.recordedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span><span>{new Date(last.recordedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
    </div>
  );
}

function CropEditor({
  editor,
  onClose,
  onSave,
}: {
  editor: NonNullable<CropEditorState>;
  onClose: () => void;
  onSave: (values: { cropName: string; sowingDate: string; estimatedGrowthDays: number; notes: string }) => Promise<void>;
}) {
  const [cropName, setCropName] = useState(editor.cycle?.cropName ?? "");
  const [sowingDate, setSowingDate] = useState(editor.cycle?.sowingDate.slice(0, 10) ?? demoCycleDate());
  const [growthDays, setGrowthDays] = useState(editor.cycle?.estimatedGrowthDays ?? 14);
  const [notes, setNotes] = useState(editor.cycle?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#172319]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-editor-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (!Number.isInteger(growthDays) || growthDays < 1 || growthDays > 365) {
            setError("Growth duration must be a whole number from 1 to 365 days.");
            return;
          }
          setSaving(true);
          void onSave({ cropName: cropName.trim(), sowingDate, estimatedGrowthDays: growthDays, notes }).then(onClose).catch((saveError: unknown) => setError(messageFor(saveError))).finally(() => setSaving(false));
        }}
        className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"
      >
        <div className="flex items-start justify-between"><div><h2 id="crop-editor-title" className="text-lg font-semibold text-[#294532]">{editor.cycle ? "Edit crop batch" : "Plant crop in tray"}</h2><p className="mt-1 text-xs text-[#7b8875]">{editor.tray.name}</p></div><button type="button" onClick={onClose} aria-label="Close form" className="rounded-lg p-2 text-[#71806e] hover:bg-[#f4f6f1]"><X size={18} /></button></div>
        <label className="mt-5 block text-xs text-[#667568]">Crop name<input required value={cropName} onChange={(event) => setCropName(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] px-3 text-sm text-[#294532]" /></label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-xs text-[#667568]">Sowing date<input type="date" required value={sowingDate} onChange={(event) => setSowingDate(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] px-3 text-sm text-[#294532]" /></label><label className="block text-xs text-[#667568]">Estimated growth (days)<input type="number" min={1} max={365} required value={growthDays} onChange={(event) => setGrowthDays(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] px-3 text-sm text-[#294532]" /></label></div>
        <label className="mt-4 block text-xs text-[#667568]">Growth notes<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#e2e8dc] p-3 text-sm text-[#294532]" /></label>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-[#e2e8dc] px-4 py-2.5 text-sm text-[#61715c]">Cancel</button><button type="submit" disabled={saving || !cropName.trim()} className="rounded-lg bg-[#315b38] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : editor.cycle ? "Save crop" : "Plant crop"}</button></div>
      </form>
    </div>
  );
}

function ActuatorRow({
  title,
  icon: Icon,
  value,
  feedback,
  isDemo,
  online: deviceOnline,
  onSet,
}: {
  title: string;
  icon: typeof Fan;
  value: unknown;
  feedback?: CommandFeedback;
  isDemo: boolean;
  online: boolean;
  onSet: (value: boolean) => void;
}) {
  const known = typeof value === "boolean";
  const status =
    feedback?.status === "pending"
      ? "Pending"
      : feedback?.status === "failed"
        ? "Failed"
        : !isDemo && (!deviceOnline || feedback?.status === "offline")
          ? "Offline"
          : isDemo || known
            ? value
              ? "ON"
              : "OFF"
            : "Unknown";
  const tone =
    status === "ON"
      ? "green"
      : status === "Pending"
        ? "amber"
        : status === "Offline" || status === "Failed"
          ? "red"
          : "neutral";
  const disabled = (!deviceOnline && !isDemo) || feedback?.status === "pending";
  return (
    <article className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-[#fafbf8] px-2.5 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon size={15} className="shrink-0 text-[#789565]" aria-hidden="true" />
        <span className="truncate text-[10px] font-medium text-[#52644f]">{title}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={tone}>
          {status === "Pending" ? <LoaderCircle size={10} className="animate-spin" /> : null}
          {status}
        </Badge>
        <button
          type="button"
          role="switch"
          aria-label={`${title} ${status}`}
          aria-checked={value === true}
          aria-disabled={disabled}
          disabled={disabled}
          onClick={() => onSet(!known || !value)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            value === true ? "bg-[#4b8447]" : "bg-[#c7cec2]"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
              value === true ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </article>
  );
}

export default function MicrogreensRackDetailPage() {
  const { rackId: routeRackId } = useParams<{ rackId: string }>();
  const rackId = routeRackId;
  const router = useRouter();
  const [rack, setRack] = useState<Rack | null>(null);
  const [device, setDevice] = useState<RackDevice>();
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [deviceState, setDeviceState] = useState<DeviceState>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [partialError, setPartialError] = useState("");
  const [range, setRange] = useState<Range>("24 hours");
  const [sensor, setSensor] = useState<SensorKind>("temperature");
  const [cropEditor, setCropEditor] = useState<CropEditorState>(null);
  const [commandFeedback, setCommandFeedback] = useState<Record<string, CommandFeedback>>({});
  const [actionMessage, setActionMessage] = useState("");

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");
    setPartialError("");
    setActionMessage("");
    try {
      if (rackId.startsWith("demo-rack-")) {
        const demoRack = readDemoRacks().find((item) => item.id === rackId);
        if (!demoRack) throw new Error("This browser demo rack no longer exists.");
        setRack(demoRack);
        setDevice(undefined);
        setTelemetry([]);
        setDeviceState(undefined);
      } else {
        const details = await fetchRack(rackId);
        setRack(details.rack);
        setDevice(details.device);
        const [telemetryResult, stateResult] = await Promise.allSettled([
          fetchTelemetry(details.device.id),
          fetchDeviceState(details.device.id),
        ]);
        if (telemetryResult.status === "fulfilled") setTelemetry(telemetryResult.value);
        else setTelemetry([]);
        if (stateResult.status === "fulfilled") setDeviceState(stateResult.value);
        else setDeviceState(details.device.state ?? undefined);
        const failed = [
          telemetryResult.status === "rejected" ? `Sensor history: ${messageFor(telemetryResult.reason)}` : "",
          stateResult.status === "rejected" ? `Actuator state: ${messageFor(stateResult.reason)}` : "",
        ].filter(Boolean);
        setPartialError(failed.join(" · "));
      }
    } catch (loadError) {
      setError(messageFor(loadError));
      setRack(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [rackId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const cycles = useMemo(() => rack ? activeCycles(rack) : [], [rack]);
  const firstCycle = cycles[0]?.cycle;
  const primaryRow = rack?.rows[0];
  const hasOnlineDevice = online(device?.lastSeenAt);
  const physicalLayoutValid = rack ? hasSupportedPhysicalLayout(rack) : false;

  async function persistDemo(updated: Rack) {
    const next = readDemoRacks().map((item) => item.id === updated.id ? updated : item);
    writeDemoRacks(next);
    setRack(updated);
    return updated;
  }

  async function saveCrop(values: { cropName: string; sowingDate: string; estimatedGrowthDays: number; notes: string }) {
    if (!rack || !cropEditor) return;
    if (!values.cropName || !Number.isInteger(values.estimatedGrowthDays) || values.estimatedGrowthDays < 1 || values.estimatedGrowthDays > 365) {
      throw new Error("Enter a crop name and a growth duration from 1 to 365 days.");
    }
    if (rack.isDemo) {
      const expectedHarvestDate = new Date(`${values.sowingDate}T00:00:00`);
      expectedHarvestDate.setDate(expectedHarvestDate.getDate() + values.estimatedGrowthDays);
      const updated: Rack = {
        ...rack,
        rows: rack.rows.map((row) => ({
          ...row,
          trays: row.trays.map((tray) => tray.id !== cropEditor.tray.id ? tray : {
            ...tray,
            currentCrop: {
              id: cropEditor.cycle?.id ?? `${tray.id}-cycle-${Date.now()}`,
              cropName: values.cropName,
              status: expectedHarvestDate.getTime() <= Date.now() ? "READY" : "GROWING",
              sowingDate: values.sowingDate,
              expectedHarvestDate: expectedHarvestDate.toISOString(),
              estimatedGrowthDays: values.estimatedGrowthDays,
              notes: values.notes || null,
            },
          }),
        })),
      };
      await persistDemo(updated);
    } else if (cropEditor.cycle) {
      await updateCropCycle(cropEditor.cycle.id, values);
      await load(true);
    } else {
      await plantTrayCrop(rack.id, cropEditor.tray.id, values);
      await load(true);
    }
    setActionMessage(`${values.cropName} ${cropEditor.cycle ? "updated" : "added to the tray"}.`);
  }

  async function controlActuator(target: string, value: boolean) {
    if (!rack) return;
    if (rack.isDemo) {
      try {
        const updated: Rack = {
          ...rack,
          demoActuators: { ...rack.demoActuators, [target]: value },
        };
        await persistDemo(updated);
        setCommandFeedback((current) => ({ ...current, [target]: { status: "success", message: `Simulation reports ${value ? "ON" : "OFF"}` } }));
      } catch (commandError) {
        setCommandFeedback((current) => ({ ...current, [target]: { status: "failed", message: messageFor(commandError) } }));
      }
      return;
    }
    if (!hasSupportedPhysicalLayout(rack)) {
      setCommandFeedback((current) => ({
        ...current,
        [target]: {
          status: "failed",
          message: "Controls are disabled because this rack does not match the supported 3- or 4-row, 4-tray layout.",
        },
      }));
      return;
    }
    if (!device || !hasOnlineDevice) {
      setCommandFeedback((current) => ({ ...current, [target]: { status: "offline", message: "Device is offline; command not sent." } }));
      return;
    }
    const actualNow = deviceState?.actual[target];
    if (actualNow === value) {
      setCommandFeedback((current) => ({ ...current, [target]: { status: "success", message: `Device already reports ${value ? "ON" : "OFF"}` } }));
      return;
    }
    const startedAt = Date.now();
    const previousReport = deviceState?.lastReportedAt ? new Date(deviceState.lastReportedAt).getTime() : 0;
    setCommandFeedback((current) => ({ ...current, [target]: { status: "pending", message: "Command queued; waiting for device state." } }));
    try {
      await requestActuatorState(device.id, target, value);
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        const reported = await fetchDeviceState(device.id);
        setDeviceState(reported);
        const reportTime = reported.lastReportedAt ? new Date(reported.lastReportedAt).getTime() : 0;
        if (reported.actual[target] === value && reportTime > Math.max(previousReport, startedAt)) {
          setCommandFeedback((current) => ({ ...current, [target]: { status: "success", message: `Device acknowledged ${value ? "ON" : "OFF"}` } }));
          return;
        }
      }
      throw new Error("No matching device acknowledgement was received within 15 seconds.");
    } catch (commandError) {
      setCommandFeedback((current) => ({ ...current, [target]: { status: "failed", message: messageFor(commandError) } }));
    }
  }

  async function controlAll(kind: "fan" | "light", value: boolean) {
    if (!rack || !window.confirm(`Request ${value ? "ON" : "OFF"} for every ${kind} in this rack? Each row will receive an independent command.`)) return;
    const targets = rack.rows.map((row) => kind === "fan" ? row.fanTarget : row.lightTarget).filter(Boolean);
    if (rack.isDemo) {
      try {
        const updated: Rack = {
          ...rack,
          demoActuators: {
            ...rack.demoActuators,
            ...Object.fromEntries(targets.map((target) => [target, value])),
          },
        };
        await persistDemo(updated);
        setCommandFeedback((current) => ({
          ...current,
          ...Object.fromEntries(targets.map((target) => [target, { status: "success" as const, message: `Simulation reports ${value ? "ON" : "OFF"}` }])),
        }));
      } catch (commandError) {
        setActionMessage(`Could not update simulated actuators: ${messageFor(commandError)}`);
      }
      return;
    }
    await Promise.all(targets.map((target) => controlActuator(target, value)));
  }

  async function saveRowName(row: RackRow) {
    if (!rack) return;
    const value = window.prompt("Row name", row.name);
    if (value === null || !value.trim()) return;
    try {
      if (rack.isDemo) {
        await persistDemo({ ...rack, rows: rack.rows.map((item) => item.id === row.id ? { ...item, name: value.trim() } : item) });
        return;
      }
      await renameRackRow(rack.id, row.id, value.trim());
      await load(true);
    } catch (editError) {
      setActionMessage(`Could not rename row: ${messageFor(editError)}`);
    }
  }

  async function saveTrayName(tray: RackTray) {
    if (!rack) return;
    const value = window.prompt("Tray name", tray.name);
    if (value === null || !value.trim()) return;
    try {
      if (rack.isDemo) {
        await persistDemo({ ...rack, rows: rack.rows.map((row) => ({ ...row, trays: row.trays.map((item) => item.id === tray.id ? { ...item, name: value.trim() } : item) })) });
        return;
      }
      await renameRackTray(rack.id, tray.id, value.trim());
      await load(true);
    } catch (editError) {
      setActionMessage(`Could not rename tray: ${messageFor(editError)}`);
    }
  }

  async function recordHarvest(cycle: CropCycle) {
    if (!rack || !window.confirm(`Record ${cycle.cropName} as harvested? The documented API records the harvest date but does not accept yield.`)) return;
    try {
      if (rack.isDemo) {
        await persistDemo({ ...rack, rows: rack.rows.map((row) => ({ ...row, trays: row.trays.map((tray) => tray.currentCrop?.id === cycle.id ? { ...tray, currentCrop: null } : tray) })) });
      } else {
        await harvestCropCycle(cycle.id);
        await load(true);
      }
      setActionMessage(`${cycle.cropName} harvest recorded${rack.isDemo ? " in this browser demo" : ""}.`);
    } catch (harvestError) {
      setActionMessage(`Could not record harvest: ${messageFor(harvestError)}`);
    }
  }

  async function editRack() {
    if (!rack) return;
    const name = window.prompt("Rack name", rack.name);
    if (name === null || !name.trim()) return;
    try {
      if (rack.isDemo) {
        await persistDemo({ ...rack, name: name.trim() });
      } else {
        await renameRack(rack.id, name.trim());
        await load(true);
      }
      setActionMessage("Rack name updated.");
    } catch (editError) {
      setActionMessage(`Could not update rack name: ${messageFor(editError)}`);
    }
  }

  async function deleteDemoRack() {
    if (!rack?.isDemo || !window.confirm(`Delete ${rack.name} from this browser only?`)) return;
    writeDemoRacks(readDemoRacks().filter((item) => item.id !== rack.id));
    router.push("/home/microgreens");
  }

  const metricCards = (["temperature", "humidity", "light", "moisture"] as const).map((kind) => ({
    kind,
    value: latestValue(telemetry, device, primaryRow, kind),
  }));
  const estimatedHarvest = cycles
    .map(({ cycle }) => cycle.expectedHarvestDate)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  return (
    <main className="dashboard-root min-h-screen bg-[#f6f7f1] px-4 pb-28 pt-5 text-[#2d4030] sm:px-7 lg:px-9 lg:pb-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-6 flex items-center justify-between border-b border-[#e5e9e0] pb-3 text-[11px] text-[#859181]">
          <div className="flex items-center gap-3"><Link href="/home/microgreens" className="inline-flex items-center gap-2 hover:text-[#48604a]"><ArrowLeft size={14} />All microgreens racks</Link><ChevronDown size={12} className="rotate-[-90deg]" /><span>Rack details</span></div>
          <button type="button" onClick={() => void load(true)} disabled={loading || refreshing} aria-label="Refresh rack details" className="rounded-lg p-2 text-[#71806e] hover:bg-white disabled:opacity-50"><RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /></button>
        </div>

        {loading ? <div role="status" className="rounded-xl border border-[#e5e9e0] bg-white p-12 text-center text-sm text-[#7b8875]"><LoaderCircle size={20} className="mx-auto mb-3 animate-spin" />Loading rack details…</div> : null}
        {!loading && error ? <div role="alert" className="rounded-xl border border-[#efcaca] bg-[#fff4f4] p-5 text-sm text-[#9b4141]"><div className="flex items-center gap-2 font-semibold"><AlertCircle size={17} />Rack details unavailable</div><p className="mt-2 text-xs">{error}</p><Link href="/home/microgreens" className="mt-4 inline-flex text-xs font-semibold underline">Return to racks</Link></div> : null}
        {!loading && !error && rack ? (
          <>
            <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#82917b]">Rack details · {device?.deviceCode ?? (rack.isDemo ? "Browser demo" : rack.id)}</p><h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#294532] sm:text-3xl">{rack.name}{cycles[0] ? ` — ${cycles[0].cycle.cropName}` : ""}</h1><p className="mt-2 text-xs text-[#7b8875]">{rack.demoConfiguration?.seedVariety || "Seed variety not provided"}{rack.demoConfiguration?.seedSupplier ? ` · ${rack.demoConfiguration.seedSupplier}` : ""}{rack.demoConfiguration?.seedBatch ? ` · Batch ${rack.demoConfiguration.seedBatch}` : ""}</p></div>
              <div className="flex items-center gap-2">
                <Badge tone={rack.isDemo ? "amber" : hasOnlineDevice ? "green" : "red"}><span className="h-1.5 w-1.5 rounded-full bg-current" />{rack.isDemo ? "Simulation enabled" : hasOnlineDevice ? "Device online" : "Device offline"}</Badge>
                <button type="button" onClick={() => void editRack()} className="inline-flex items-center gap-2 rounded-lg border border-[#e2e8dc] bg-white px-3 py-2.5 text-xs font-semibold text-[#52664b] hover:bg-[#f8faf5]"><Pencil size={14} />Edit rack</button>
              </div>
            </header>

            {partialError ? <div role="status" className="mb-5 rounded-lg border border-[#eadcb8] bg-[#fcf8ee] p-3 text-xs text-[#80652b]">Some live details are unavailable: {partialError}</div> : null}
            {actionMessage ? <p role="status" className="mb-4 rounded-lg bg-[#edf4e9] px-4 py-3 text-xs text-[#527648]">{actionMessage}</p> : null}
            {rack.isDemo ? <div className="mb-5 rounded-lg border border-[#eadcb8] bg-[#fcf8ee] p-3 text-xs leading-5 text-[#80652b]">This rack is browser-only demo data. Sensor values are not fabricated; device controls below change local simulation state only.</div> : null}

            <section aria-label="Current environmental readings" className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metricCards.map(({ kind, value }) => {
                const icon = kind === "temperature" ? Thermometer : kind === "humidity" || kind === "moisture" ? Droplets : Sun;
                const label = kind === "humidity" ? "Relative humidity" : kind === "light" ? "Light intensity" : kind === "moisture" ? "Medium moisture" : "Temperature";
                const note = kind === "moisture" ? "No moisture sensor configured" : rack.isDemo ? "Simulation sensor unavailable" : telemetry[0] ? `Reported ${new Date(telemetry[0].recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No sensor reading";
                return <StatCard key={kind} label={label} value={formatValue(value, kind)} note={note} icon={icon} />;
              })}
            </section>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
              <section className="rounded-xl border border-[#e5e9e0] bg-white p-4 shadow-[0_3px_18px_rgba(43,66,44,0.035)] sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#354c38]">Environmental history</h2><p className="mt-1 text-[10px] text-[#899284]">{rack.isDemo ? "Simulation · no environmental readings" : `Latest ${telemetry.length} readings · ${device?.deviceCode ?? "device"}`}</p></div><label className="text-[10px] text-[#74806e]"><span className="sr-only">History time range</span><select value={range} onChange={(event) => setRange(event.target.value as Range)} className="rounded-lg border border-[#e2e8dc] bg-white px-3 py-2"><option>24 hours</option><option>7 days</option><option>30 days</option></select></label></div>
                <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Environmental history sensor">
                  {(["temperature", "humidity", "moisture"] as const).map((kind) => <button key={kind} type="button" role="tab" aria-selected={sensor === kind} onClick={() => setSensor(kind)} className={`rounded-md px-3 py-2 text-[10px] ${sensor === kind ? "bg-[#edf4e9] font-semibold text-[#527648]" : "text-[#879284] hover:bg-[#f6f8f2]"}`}>{kind === "temperature" ? "Temperature" : kind === "humidity" ? "Humidity" : "Moisture"}</button>)}
                  <button type="button" role="tab" aria-selected={sensor === "light"} onClick={() => setSensor("light")} className={`rounded-md px-3 py-2 text-[10px] ${sensor === "light" ? "bg-[#edf4e9] font-semibold text-[#527648]" : "text-[#879284] hover:bg-[#f6f8f2]"}`}>Light</button>
                </div>
                <div className="mt-3"><HistoryChart telemetry={telemetry} device={device} row={primaryRow} kind={sensor} range={range} /></div>
                <p className="mt-4 border-t border-[#edf0e8] pt-3 text-[10px] text-[#899284]">{rack.isDemo ? "No simulated sensor samples are generated." : telemetry.length ? `Showing available samples from the backend's latest 50 records · observed ${formatDate(telemetry[0]?.recordedAt)}` : "No historical telemetry returned by the device API."}</p>
              </section>

              <section className="rounded-xl border border-[#e5e9e0] bg-white p-4 shadow-[0_3px_18px_rgba(43,66,44,0.035)] sm:p-5">
                <h2 className="text-sm font-semibold text-[#354c38]">Crop batch</h2><p className="mt-1 text-[10px] text-[#899284]">From sowing to harvest</p>
                {firstCycle ? (
                  <dl className="mt-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between gap-3"><dt className="text-[#82907d]">Growth stage</dt><dd><Badge tone={firstCycle.status === "READY" ? "green" : "neutral"}>{firstCycle.status.replaceAll("_", " ").toLowerCase()}</Badge></dd></div>
                    <DetailValue label="Sown on" value={formatDate(firstCycle.sowingDate)} />
                    <DetailValue label="Expected harvest" value={formatDate(estimatedHarvest)} />
                    <DetailValue label="Estimated yield" value={rack.demoConfiguration?.estimatedYieldKg ? `${rack.demoConfiguration.estimatedYieldKg} kg` : "Not configured"} />
                    <DetailValue label="Actual yield" value="Not recorded by API" />
                    <DetailValue label="Growing area" value={rack.demoConfiguration ? `${rack.demoConfiguration.growingArea} m²` : "Not provided by API"} />
                  </dl>
                ) : <p className="mt-5 rounded-lg bg-[#f6f8f2] p-4 text-xs text-[#879284]">No active crop batch is recorded in this rack.</p>}
                <p className="mt-4 rounded-lg bg-[#fcf8ee] p-3 text-[10px] leading-5 text-[#80652b]">The harvest endpoint accepts no yield value. Actual yield capture is not available until the backend adds a documented yield field.</p>
                {cycles.length ? <div className="mt-4 space-y-2">{cycles.slice(0, 3).map(({ cycle }) => <button key={cycle.id} type="button" onClick={() => void recordHarvest(cycle)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#e2e8dc] px-3 py-2.5 text-xs font-medium text-[#425c45] hover:bg-[#f6f8f2]"><Sprout size={14} />Record {cycle.cropName} harvest</button>)}</div> : null}
              </section>

                <section className="rounded-xl border border-[#e5e9e0] bg-white p-4 shadow-[0_3px_18px_rgba(43,66,44,0.035)] sm:p-5 xl:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#354c38]">Rack layout & tray management</h2><p className="mt-1 text-[10px] text-[#899284]">{rack.rows.length} configured rows · {rack.rows.reduce((total, row) => total + row.trays.length, 0)} trays returned by the API</p></div><Badge tone={rack.isDemo ? "amber" : "neutral"}>{rack.isDemo ? "Browser demo" : "Live rack layout"}</Badge></div>
                {!rack.isDemo ? <p className="mt-3 rounded-lg bg-[#f6f8f2] p-3 text-[10px] leading-5 text-[#788574]">The documented backend supports tray rename and crop planting/editing, but not adding or removing physical trays. The displayed layout is the rack configuration returned by your API.</p> : null}
                <div className="mt-4 space-y-4">
                  {rack.rows.map((row) => (
                    <section key={row.id} className="rounded-xl border border-[#e9ede5] p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf4e9] text-[10px] font-semibold text-[#668254]">{String(row.rowNumber).padStart(2, "0")}</span><h3 className="text-xs font-semibold text-[#3d5940]">{row.name}</h3></div><button type="button" onClick={() => void saveRowName(row)} aria-label={`Rename ${row.name}`} className="rounded-md p-2 text-[#81907a] hover:bg-[#f4f6f1]"><Pencil size={13} /></button></div>
                      {row.trays.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{row.trays.map((tray) => (
                        <article key={tray.id} className="min-w-0 rounded-lg bg-[#fafbf8] p-3">
                          <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-[11px] font-semibold text-[#405642]">{tray.name} <span className="font-normal text-[#98a092]">· #{tray.slot}</span></p><p className="mt-1 truncate text-[10px] text-[#899284]">{tray.currentCrop?.cropName ?? "Empty tray"}{tray.currentCrop ? ` · ${tray.currentCrop.status.toLowerCase()}` : ""}</p></div><button type="button" onClick={() => void saveTrayName(tray)} aria-label={`Rename ${tray.name}`} className="rounded-md p-1.5 text-[#82907c] hover:bg-white"><Pencil size={12} /></button></div>
                          {tray.currentCrop ? <p className="mt-2 text-[9px] text-[#899284]">Harvest {formatDate(tray.currentCrop.expectedHarvestDate)}</p> : null}
                          <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setCropEditor({ tray, cycle: tray.currentCrop ?? undefined })} className="rounded-md border border-[#e2e8dc] px-2.5 py-2 text-[10px] font-medium text-[#52664b]">{tray.currentCrop ? "Edit crop" : "Plant crop"}</button>{tray.currentCrop ? <button type="button" onClick={() => void recordHarvest(tray.currentCrop!)} className="rounded-md border border-[#e2e8dc] px-2.5 py-2 text-[10px] text-[#71806e]">Harvest</button> : null}</div>
                        </article>
                      ))}</div> : <p className="rounded-lg bg-[#fafbf8] p-4 text-xs text-[#899284]">No trays are configured for this row.</p>}
                    </section>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-[#e5e9e0] bg-white p-4 shadow-[0_3px_18px_rgba(43,66,44,0.035)] sm:p-5 xl:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#354c38]">Independent row controls</h2>
                    <p className="mt-1 text-[10px] text-[#899284]">Each row’s fan and grow light operate independently.</p>
                  </div>
                  {rack.isDemo ? (
                    <Badge tone="amber">Simulation mode · no hardware connected</Badge>
                  ) : (
                    <Badge tone={hasOnlineDevice ? "green" : "red"}>
                      <Wifi size={10} />
                      Live hardware · {hasOnlineDevice ? "Online" : "Offline"}
                    </Badge>
                  )}
                </div>
                {!rack.isDemo && !physicalLayoutValid ? (
                  <p role="alert" className="mt-3 rounded-lg border border-[#efcaca] bg-[#fff4f4] p-3 text-[10px] text-[#9b4141]">
                    This rack layout is not supported. A live rack must have 3 or 4 rows and exactly 4 trays per row; actuator controls are disabled.
                  </p>
                ) : null}
                {!rack.isDemo && !hasOnlineDevice ? (
                  <p className="mt-3 rounded-lg border border-[#efcaca] bg-[#fff4f4] p-3 text-[10px] text-[#9b4141]">
                    The device is offline. Controls are disabled; no command will be sent.
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-[#f7f9f4] p-2.5">
                  <span className="mr-auto px-1 text-[10px] font-medium text-[#74806e]">All rows</span>
                  <div className="flex items-center gap-1.5 rounded-md bg-white p-1">
                    <Fan size={13} className="ml-1 text-[#789565]" />
                    <span className="px-1 text-[10px] text-[#64715f]">Fans</span>
                    <button type="button" onClick={() => void controlAll("fan", true)} disabled={!rack.isDemo && (!hasOnlineDevice || !physicalLayoutValid)} className="rounded px-2 py-1.5 text-[10px] font-semibold text-[#52664b] hover:bg-[#edf4e9] disabled:opacity-45">ON</button>
                    <button type="button" onClick={() => void controlAll("fan", false)} disabled={!rack.isDemo && (!hasOnlineDevice || !physicalLayoutValid)} className="rounded px-2 py-1.5 text-[10px] font-semibold text-[#52664b] hover:bg-[#edf4e9] disabled:opacity-45">OFF</button>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md bg-white p-1">
                    <Lightbulb size={13} className="ml-1 text-[#789565]" />
                    <span className="px-1 text-[10px] text-[#64715f]">Lights</span>
                    <button type="button" onClick={() => void controlAll("light", true)} disabled={!rack.isDemo && (!hasOnlineDevice || !physicalLayoutValid)} className="rounded px-2 py-1.5 text-[10px] font-semibold text-[#52664b] hover:bg-[#edf4e9] disabled:opacity-45">ON</button>
                    <button type="button" onClick={() => void controlAll("light", false)} disabled={!rack.isDemo && (!hasOnlineDevice || !physicalLayoutValid)} className="rounded px-2 py-1.5 text-[10px] font-semibold text-[#52664b] hover:bg-[#edf4e9] disabled:opacity-45">OFF</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                  {rack.rows.map((row) => (
                    <section key={row.id} className="min-w-0 rounded-xl border border-[#e5e9e0] p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#edf4e9] text-[9px] font-semibold text-[#668254]">{String(row.rowNumber).padStart(2, "0")}</span>
                          <h3 className="truncate text-[11px] font-semibold text-[#3d5940]">{row.name}</h3>
                        </div>
                        <Badge tone={row.trays.length === 4 ? "neutral" : "amber"}>{row.trays.length} / 4 trays</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5" aria-label={`${row.name} trays`}>
                        {row.trays.map((tray) => (
                          <div key={tray.id} title={`${tray.name}${tray.currentCrop ? ` · ${tray.currentCrop.cropName}` : " · Empty"}`} className="min-w-0 rounded-md bg-[#f7f9f4] px-1.5 py-2 text-center">
                            <p className="truncate text-[9px] font-medium text-[#52644f]">T{tray.slot}</p>
                            <p className="mt-0.5 truncate text-[8px] text-[#899284]">{tray.currentCrop?.cropName ?? "Empty"}</p>
                          </div>
                        ))}
                        {Array.from({ length: Math.max(0, 4 - row.trays.length) }, (_, index) => (
                          <div key={`unconfigured-${row.id}-${index}`} className="rounded-md border border-dashed border-[#dfe5da] px-1.5 py-2 text-center text-[8px] text-[#9aa396]">Not configured</div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {([
                          { target: row.fanTarget, name: `Fan ${String(row.rowNumber).padStart(2, "0")}`, icon: Fan },
                          { target: row.lightTarget, name: `Grow light ${String(row.rowNumber).padStart(2, "0")}`, icon: Lightbulb },
                        ]).map(({ target, name, icon }) => (
                          <ActuatorRow
                            key={target}
                            title={name}
                            icon={icon}
                            value={rack.isDemo ? rack.demoActuators?.[target] ?? false : deviceState?.actual[target]}
                            feedback={commandFeedback[target]}
                            isDemo={Boolean(rack.isDemo)}
                            online={hasOnlineDevice}
                            onSet={(value) => void controlActuator(target, value)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
                {!rack.isDemo ? <p className="mt-4 text-[10px] leading-5 text-[#879284]">Commands use the unique actuator target for each row and the authenticated device command API. A state changes to ON or OFF only after the backend reports the matching actual device state.</p> : null}
              </section>

              <section className="rounded-xl border border-[#e5e9e0] bg-white p-4 shadow-[0_3px_18px_rgba(43,66,44,0.035)] sm:p-5 xl:col-span-2">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf4e9] text-[#6f8d5e]"><Leaf size={17} /></span><div><h2 className="text-sm font-semibold text-[#354c38]">Growing notes & configuration gaps</h2><p className="mt-1 text-[10px] text-[#899284]">Details are limited to data available from the documented API.</p></div></div>
                <p className="mt-4 text-xs leading-5 text-[#71806e]">{rack.demoConfiguration?.growthNotes || cycles.find(({ cycle }) => cycle.notes)?.cycle.notes || "No growth notes recorded."}</p>
                <div className="mt-4 rounded-lg bg-[#f6f8f2] p-3 text-[10px] leading-5 text-[#788574]">The API has no documented endpoints for rack create/delete or full rack dimensions and growing-range updates, tray add/remove for physical racks, historical sensor range parameters, or recorded yield. No demo sensor readings are generated.</div>
                {rack.isDemo ? <button type="button" onClick={() => void deleteDemoRack()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#efcaca] px-3 py-2 text-[10px] font-semibold text-[#a64242] hover:bg-[#fff4f4]"><Trash2 size={13} />Delete browser demo rack</button> : <p className="mt-4 text-[10px] text-[#899284]">Rack deletion is unavailable because the documented API has no rack delete endpoint.</p>}
              </section>
            </div>
          </>
        ) : null}
      </div>
      {cropEditor && rack ? <CropEditor editor={cropEditor} onClose={() => setCropEditor(null)} onSave={saveCrop} /> : null}
    </main>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><dt className="text-[#82907d]">{label}</dt><dd className="text-right font-medium text-[#547052]">{value}</dd></div>;
}
