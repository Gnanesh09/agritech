"use client";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  Check,
  Droplets,
  Leaf,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Sprout,
  Sun,
  Thermometer,
  Wifi,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchRack,
  fetchRacks,
  fetchTelemetry,
  renameRack,
} from "./api";
import { readDemoRacks, writeDemoRacks } from "./demo-store";
import type {
  Rack,
  RackConfiguration,
  RackFormValues,
  RackDevice,
  Telemetry,
} from "./types";

const statuses = ["All", "Growing", "Ready to harvest", "Needs attention"] as const;
type StatusFilter = (typeof statuses)[number];
type RackView = { rack: Rack; device?: RackDevice; telemetry?: Telemetry[]; issue?: string };

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

function todayInputDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateAfterDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function initialFormValues(): RackFormValues {
  return {
    name: "",
    cropName: "",
    seedVariety: "",
    seedSupplier: "",
    seedBatch: "",
    sowingDate: todayInputDate(),
    expectedHarvestDate: dateAfterDays(14),
    growingArea: 1,
    rackWidth: 120,
    rackDepth: 60,
    shelfCount: 3,
    rowsPerShelf: 2,
    trayWidth: 25,
    trayDepth: 50,
    minimumTemperature: 18,
    maximumTemperature: 25,
    minimumHumidity: 50,
    maximumHumidity: 70,
    growthStage: "Growing",
    growthNotes: "",
    actualTrayCount: 1,
    estimatedYieldKg: 0,
  };
}

function maxTrayCapacity(config: RackConfiguration) {
  if (config.trayWidth <= 0 || config.trayDepth <= 0) return 0;
  return (
    Math.floor(config.rackWidth / config.trayWidth) *
    Math.floor(config.rackDepth / config.trayDepth) *
    config.shelfCount
  );
}

function cycleList(rack: Rack) {
  return rack.rows.flatMap((row) =>
    row.trays.flatMap((tray) => (tray.currentCrop ? [tray.currentCrop] : [])),
  );
}

function statusFor(view: RackView): StatusFilter | "Healthy" {
  if (view.rack.isDemo) return "Healthy";
  if (view.issue || !isOnline(view.device?.lastSeenAt)) return "Needs attention";
  const readings = view.telemetry?.[0]?.data;
  const outOfRange = (view.device?.deviceModel.capabilities.sensors ?? []).some((sensor) => {
    const raw = readings?.[sensor.key];
    if (typeof raw !== "number" || !Number.isFinite(raw)) return false;
    return (sensor.min !== undefined && raw < sensor.min) || (sensor.max !== undefined && raw > sensor.max);
  });
  if (outOfRange) return "Needs attention";
  if (cycleList(view.rack).some((cycle) => cycle.status === "READY")) return "Ready to harvest";
  return cycleList(view.rack).length ? "Growing" : "Healthy";
}

function isOnline(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false;
  const elapsed = Date.now() - new Date(lastSeenAt).getTime();
  return Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 120_000;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function sensorValue(view: RackView, type: "temperature" | "humidity" | "light") {
  const latest = view.telemetry?.[0];
  if (!latest) return undefined;
  const keys = view.rack.rows.flatMap((row) => {
    const rowKey =
      type === "temperature"
        ? row.temperatureSensorKey
        : type === "humidity"
          ? row.humiditySensorKey
          : row.lightSensorKey;
    return rowKey ? [rowKey] : [];
  });
  const capabilities = view.device?.deviceModel.capabilities.sensors ?? [];
  const matched = capabilities.find((sensor) => {
    const label = `${sensor.key} ${sensor.label ?? ""}`.toLowerCase();
    return type === "temperature"
      ? label.includes("temperature") || label.includes("temp")
      : type === "humidity"
        ? label.includes("humidity")
        : label.includes("light") || label.includes("lux");
  });
  const key = keys[0] ?? matched?.key;
  if (!key) return undefined;
  const raw = latest.data[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : undefined;
}

function displayMetric(view: RackView, type: "temperature" | "humidity" | "light") {
  const value = sensorValue(view, type);
  if (value === undefined) return "—";
  if (type === "temperature") return `${value.toFixed(1)}°C`;
  if (type === "humidity") return `${Math.round(value)}%`;
  return `${value.toLocaleString()} lx`;
}

function createDemoRack(
  values: RackFormValues,
  existingId?: string,
  existingActuators?: Record<string, boolean>,
): Rack {
  const shelves = Math.floor(values.shelfCount);
  const rowsPerShelf = Math.floor(values.rowsPerShelf);
  const rowCount = shelves * rowsPerShelf;
  const totalTrays = Math.floor(values.actualTrayCount);
  const id = existingId ?? `demo-rack-${crypto.randomUUID()}`;
  let trayIndex = 0;
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const rowId = `${id}-row-${index + 1}`;
    const traysForRow = Math.floor(totalTrays / rowCount) + (index < totalTrays % rowCount ? 1 : 0);
    return {
      id: rowId,
      rowNumber: index + 1,
      name: `Row ${String(index + 1).padStart(2, "0")}`,
      fanTarget: `${rowId}-fan`,
      lightTarget: `${rowId}-light`,
      temperatureSensorKey: null,
      humiditySensorKey: null,
      lightSensorKey: null,
      trays: Array.from({ length: traysForRow }, (_, slotIndex) => {
        trayIndex += 1;
        const trayId = `${rowId}-tray-${slotIndex + 1}`;
        const days = Math.max(
          1,
          Math.ceil(
            (new Date(`${values.expectedHarvestDate}T00:00:00`).getTime() -
              new Date(`${values.sowingDate}T00:00:00`).getTime()) /
              86_400_000,
          ),
        );
        return {
          id: trayId,
          slot: slotIndex + 1,
          name: `Tray ${String(trayIndex).padStart(2, "0")}`,
          currentCrop: values.cropName
            ? {
                id: `${trayId}-cycle`,
                cropName: values.cropName,
                status:
                  values.growthStage === "Ready to harvest"
                    ? "READY"
                    : values.growthStage === "Germinating"
                      ? "GERMINATING"
                      : "GROWING",
                sowingDate: values.sowingDate,
                expectedHarvestDate: values.expectedHarvestDate,
                estimatedGrowthDays: days,
                notes: values.growthNotes || null,
              }
            : null,
        };
      }),
    };
  });
  const { name, ...demoConfiguration } = values;
  void name;
  return {
    id,
    deviceId: "",
    name: values.name.trim(),
    rowCount,
    traysPerRow: Math.ceil(totalTrays / rowCount),
    status: "ACTIVE",
    rows,
    demoConfiguration,
    demoActuators: existingActuators,
    isDemo: true,
  };
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "green" | "amber" | "red" | "neutral" }) {
  const color =
    tone === "green"
      ? "bg-[#edf4e9] text-[#527648]"
      : tone === "amber"
        ? "bg-[#faf1df] text-[#9a6b22]"
        : tone === "red"
          ? "bg-[#fbeaea] text-[#a64242]"
          : "bg-[#f3f5ef] text-[#74806e]";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${color}`}>{children}</span>;
}

function NumberField({
  label,
  value,
  min = 0,
  step = "1",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0 text-xs text-[#667568]">
      {label}
      <input
        type="number"
        min={min}
        step={step}
        required
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] bg-white px-3 text-sm text-[#294532] outline-none focus:border-[#77936a]"
      />
    </label>
  );
}

function RackForm({
  initial,
  editing,
  onClose,
  onSave,
}: {
  initial: RackFormValues;
  editing: boolean;
  onClose: () => void;
  onSave: (values: RackFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const capacity = maxTrayCapacity(values);
  const rowCount = Math.max(0, Math.floor(values.shelfCount) * Math.floor(values.rowsPerShelf));
  function update<K extends keyof RackFormValues>(key: K, value: RackFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!values.name.trim()) {
      setError("Enter a rack name.");
      return;
    }
    if (values.maximumTemperature < values.minimumTemperature) {
      setError("Maximum temperature must be at least the minimum.");
      return;
    }
    if (values.maximumHumidity < values.minimumHumidity) {
      setError("Maximum humidity must be at least the minimum.");
      return;
    }
    if (!Number.isInteger(values.shelfCount) || !Number.isInteger(values.rowsPerShelf) || rowCount < 1) {
      setError("Enter a positive whole number of shelves and rows per shelf.");
      return;
    }
    if (capacity < 1 || values.actualTrayCount < 0 || values.actualTrayCount > capacity) {
      setError(`Tray count must be between 0 and the calculated capacity of ${capacity}.`);
      return;
    }
    setSaving(true);
    try {
      await onSave(values);
      onClose();
    } catch (saveError) {
      setError(messageFor(saveError));
    } finally {
      setSaving(false);
    }
  }

  const textFields: Array<[keyof RackFormValues, string]> = [
    ["name", "Rack name"],
    ["cropName", "Crop name"],
    ["seedVariety", "Seed variety"],
    ["seedSupplier", "Seed supplier"],
    ["seedBatch", "Seed batch"],
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#172319]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="rack-form-title" className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e7e9df] bg-white px-5 py-4 sm:px-7">
          <div>
            <h2 id="rack-form-title" className="text-lg font-semibold text-[#294532]">{editing ? "Edit demo rack" : "Add a rack"}</h2>
            <p className="mt-1 text-xs text-[#7b8875]">Browser demo only · these settings are not sent to your backend.</p>
          </div>
          <button type="button" aria-label="Close form" onClick={onClose} className="rounded-lg p-2 text-[#71806e] hover:bg-[#f4f6f1]"><X size={18} /></button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-6 p-5 sm:p-7">
          <div className="rounded-xl border border-[#e8d9ad] bg-[#fcf8ec] p-3 text-xs leading-5 text-[#80652b]">
            The documented API has no rack create or full-configuration endpoint. This rack is stored in this browser and is visibly marked as demo data.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {textFields.map(([key, label]) => (
              <label key={key} className="block text-xs text-[#667568]">
                {label}
                <input
                  required={key === "name"}
                  value={String(values[key])}
                  onChange={(event) => update(key, event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] px-3 text-sm text-[#294532] outline-none focus:border-[#77936a]"
                />
              </label>
            ))}
            <label className="block text-xs text-[#667568]">Sowing date<input type="date" required value={values.sowingDate} onChange={(event) => update("sowingDate", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] px-3 text-sm text-[#294532]" /></label>
            <label className="block text-xs text-[#667568]">Expected harvest<input type="date" required value={values.expectedHarvestDate} onChange={(event) => update("expectedHarvestDate", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] px-3 text-sm text-[#294532]" /></label>
            <NumberField label="Growing area (m²)" min={0.1} step="0.1" value={values.growingArea} onChange={(value) => update("growingArea", value)} />
            <label className="block text-xs text-[#667568]">Growth stage<select value={values.growthStage} onChange={(event) => update("growthStage", event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] bg-white px-3 text-sm text-[#294532]"><option>Germinating</option><option>Growing</option><option>Ready to harvest</option></select></label>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#3d5940]">Rack layout</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField label="Rack width (cm)" min={1} value={values.rackWidth} onChange={(value) => update("rackWidth", value)} />
              <NumberField label="Rack depth (cm)" min={1} value={values.rackDepth} onChange={(value) => update("rackDepth", value)} />
              <NumberField label="Shelves" min={1} value={values.shelfCount} onChange={(value) => update("shelfCount", value)} />
              <NumberField label="Rows per shelf" min={1} value={values.rowsPerShelf} onChange={(value) => update("rowsPerShelf", value)} />
              <NumberField label="Tray width (cm)" min={1} value={values.trayWidth} onChange={(value) => update("trayWidth", value)} />
              <NumberField label="Tray depth (cm)" min={1} value={values.trayDepth} onChange={(value) => update("trayDepth", value)} />
              <NumberField label="Actual tray count" min={0} value={values.actualTrayCount} onChange={(value) => update("actualTrayCount", value)} />
              <div className="rounded-lg bg-[#f4f7f0] px-3 py-2 text-xs text-[#65775e]"><p>Calculated maximum capacity</p><p className="mt-1 text-base font-semibold text-[#365b3d]">{capacity} trays</p><p>{rowCount} rows · based on usable rack and tray dimensions</p></div>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[#3d5940]">Growing conditions</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <NumberField label="Minimum temperature (°C)" value={values.minimumTemperature} onChange={(value) => update("minimumTemperature", value)} />
              <NumberField label="Maximum temperature (°C)" value={values.maximumTemperature} onChange={(value) => update("maximumTemperature", value)} />
              <NumberField label="Minimum humidity (%)" value={values.minimumHumidity} onChange={(value) => update("minimumHumidity", value)} />
              <NumberField label="Maximum humidity (%)" value={values.maximumHumidity} onChange={(value) => update("maximumHumidity", value)} />
              <NumberField label="Estimated yield (kg)" min={0} step="0.1" value={values.estimatedYieldKg} onChange={(value) => update("estimatedYieldKg", value)} />
            </div>
          </div>
          <label className="block text-xs text-[#667568]">Growth notes<textarea rows={3} value={values.growthNotes} onChange={(event) => update("growthNotes", event.target.value)} className="mt-1.5 w-full rounded-lg border border-[#e2e8dc] p-3 text-sm text-[#294532] outline-none focus:border-[#77936a]" /></label>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-[#e2e8dc] px-4 py-2.5 text-sm text-[#61715c]">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#315b38] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#264c2f] disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{editing ? "Save demo rack" : "Create demo rack"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SimpleRackForm({
  rack,
  onClose,
  onSave,
}: {
  rack: Rack;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(rack.name);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#172319]/45 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-title"
        onSubmit={(event) => {
          event.preventDefault();
          setSaving(true);
          void onSave(name.trim()).then(onClose).catch((saveError: unknown) => setError(messageFor(saveError))).finally(() => setSaving(false));
        }}
        className="w-full max-w-xl rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"
      >
        <div className="flex items-start justify-between"><div><h2 id="rename-title" className="text-lg font-semibold text-[#294532]">Edit rack</h2><p className="mt-1 text-xs text-[#7b8875]">The backend supports updating the rack name only.</p></div><button type="button" onClick={onClose} aria-label="Close form" className="rounded-lg p-2 text-[#71806e] hover:bg-[#f4f6f1]"><X size={18} /></button></div>
        <label className="mt-5 block text-xs text-[#667568]">Rack name<input required maxLength={50} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 h-11 w-full rounded-lg border border-[#e2e8dc] px-3 text-sm text-[#294532]" /></label>
        <p className="mt-3 rounded-lg bg-[#f6f7f2] p-3 text-xs leading-5 text-[#788574]">Seed supplier, rack dimensions, shelf layout, tray count, and growing limits are not editable through the documented API.</p>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-[#e2e8dc] px-4 py-2.5 text-sm text-[#61715c]">Cancel</button><button type="submit" disabled={saving || !name.trim()} className="rounded-lg bg-[#315b38] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save rack name"}</button></div>
      </form>
    </div>
  );
}

function RackCard({
  view,
  onOpen,
  onEdit,
}: {
  view: RackView;
  onOpen: () => void;
  onEdit: () => void;
}) {
  const cycles = cycleList(view.rack);
  const crop = cycles[0];
  const status = statusFor(view);
  const needsAttention = status === "Needs attention";
  const ready = cycles.some((cycle) => cycle.status === "READY");
  const imageTone = crop?.cropName.toLowerCase().includes("radish")
    ? "from-[#582e42] via-[#466c43] to-[#192c24]"
    : crop?.cropName.toLowerCase().includes("sunflower")
      ? "from-[#8c7947] via-[#598144] to-[#233328]"
      : "from-[#245338] via-[#456f40] to-[#16291e]";
  const cropCount = view.rack.rows.reduce((total, row) => total + row.trays.length, 0);
  return (
    <article className="overflow-hidden rounded-xl border border-[#e5e9e0] bg-white shadow-[0_3px_18px_rgba(43,66,44,0.04)]">
      <button type="button" onClick={onOpen} className={`relative flex h-40 w-full items-end overflow-hidden bg-gradient-to-br ${imageTone} p-5 text-left sm:h-44`}>
        <div aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:radial-gradient(ellipse_at_18%_40%,#dce8c8_0%,transparent_13%),radial-gradient(ellipse_at_43%_22%,#dce8c8_0%,transparent_15%),radial-gradient(ellipse_at_67%_48%,#dce8c8_0%,transparent_18%),radial-gradient(ellipse_at_82%_20%,#dce8c8_0%,transparent_13%)]" />
        <Sprout className="absolute right-8 top-6 h-24 w-24 rotate-[-12deg] text-white/20" strokeWidth={0.8} aria-hidden="true" />
        <span className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          {view.rack.isDemo ? <Badge tone="amber">Browser demo</Badge> : null}
          <Badge tone={needsAttention ? "red" : "green"}><span className="h-1.5 w-1.5 rounded-full bg-current" />{needsAttention ? "Needs attention" : "Healthy"}</Badge>
        </span>
        <span className="relative text-xl font-semibold text-white drop-shadow">{view.rack.name}</span>
      </button>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-[#2c4331]">{crop?.cropName ?? view.rack.demoConfiguration?.cropName ?? "Microgreens"}</h2>
            <p className="mt-1 truncate text-[11px] text-[#879284]">{view.rack.demoConfiguration?.seedVariety || "Variety not provided"}{view.rack.demoConfiguration?.seedBatch ? ` · ${view.rack.demoConfiguration.seedBatch}` : ""}</p>
          </div>
          <button type="button" onClick={onEdit} aria-label={`Edit ${view.rack.name}`} className="rounded-lg p-2 text-[#7c8b77] hover:bg-[#f4f6f1]"><Pencil size={15} /></button>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-[#edf0e8]">
          <Metric icon={Thermometer} title="Temperature" value={displayMetric(view, "temperature")} />
          <Metric icon={Droplets} title="Humidity" value={displayMetric(view, "humidity")} />
          <Metric icon={Sun} title="Light (lux)" value={displayMetric(view, "light")} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#edf0e8] pt-3 text-[10px] text-[#7b8875]">
          <span className="inline-flex items-center gap-1.5">
            <Wifi size={13} className={view.rack.isDemo ? "text-[#ad852f]" : isOnline(view.device?.lastSeenAt) ? "text-[#79a16b]" : "text-[#c7775b]"} />
            {view.rack.isDemo ? "Simulation" : isOnline(view.device?.lastSeenAt) ? view.device?.deviceCode : "Offline"}
          </span>
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 font-medium text-[#74866d] hover:text-[#315b38]">View rack <ArrowRight size={13} /></button>
        </div>
        <div className={`mt-3 flex items-center justify-between rounded-md px-3 py-2 text-[10px] ${ready ? "bg-[#edf4e9] text-[#58794b]" : "bg-[#f6f8f2] text-[#7a8874]"}`}>
          <span>{ready ? "Ready to harvest" : cycles.length ? "Growing" : "No active crop"}</span>
          <span>{cropCount} {cropCount === 1 ? "tray" : "trays"} · Harvest {formatDate(crop?.expectedHarvestDate)}</span>
        </div>
      </div>
    </article>
  );
}

function Metric({ icon: Icon, title, value }: { icon: typeof Thermometer; title: string; value: string }) {
  return <div className="min-w-0 px-3 first:pl-0 last:pr-0"><Icon size={15} className="mb-2 text-[#8da47e]" /><p className="truncate text-base font-semibold text-[#39533b]">{value}</p><p className="mt-1 truncate text-[9px] text-[#899284]">{title}</p></div>;
}

export default function MicrogreensClient() {
  const router = useRouter();
  const [views, setViews] = useState<RackView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [formMode, setFormMode] = useState<"create" | Rack | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [apiRacks, demoRacks] = await Promise.all([fetchRacks(), Promise.resolve(readDemoRacks())]);
      const apiViews = await Promise.all(apiRacks.map(async (rack): Promise<RackView> => {
        if (!rack || typeof rack.id !== "string" || typeof rack.deviceId !== "string" || !Array.isArray(rack.rows)) {
          return { rack, issue: "Rack data returned by the API is incomplete." };
        }
        try {
          const [details, telemetry] = await Promise.all([
            fetchRack(rack.id),
            fetchTelemetry(rack.deviceId),
          ]);
          return { rack: details.rack, device: details.device, telemetry };
        } catch (rackError) {
          return { rack, issue: `Device or sensor details could not be loaded: ${messageFor(rackError)}` };
        }
      }));
      setViews([...demoRacks.map((rack) => ({ rack })), ...apiViews]);
    } catch (loadError) {
      setError(messageFor(loadError));
      setViews(readDemoRacks().map((rack) => ({ rack })));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return views.filter((view) => {
      const cycles = cycleList(view.rack);
      const status = statusFor(view);
      const matchesStatus =
        filter === "All" ||
        (filter === "Growing" && cycles.some((cycle) => cycle.status !== "READY")) ||
        (filter === "Ready to harvest" && cycles.some((cycle) => cycle.status === "READY")) ||
        (filter === "Needs attention" && status === "Needs attention");
      const searchable = [
        view.rack.name,
        view.rack.demoConfiguration?.cropName,
        view.rack.demoConfiguration?.seedVariety,
        view.rack.demoConfiguration?.seedSupplier,
        view.rack.demoConfiguration?.seedBatch,
        ...cycles.map((cycle) => cycle.cropName),
        ...view.rack.rows.flatMap((row) => row.trays.map((tray) => tray.name)),
      ].filter(Boolean).join(" ").toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  }, [filter, search, views]);

  async function saveRack(values: RackFormValues) {
    if (formMode === "create") {
      const rack = createDemoRack(values);
      const demoRacks = [...readDemoRacks(), rack];
      writeDemoRacks(demoRacks);
      setViews((current) => [{ rack }, ...current]);
      return;
    }
    if (!formMode) return;
    if (formMode.isDemo) {
      const updated = createDemoRack(values, formMode.id, formMode.demoActuators);
      const next = readDemoRacks().map((rack) => rack.id === formMode.id ? updated : rack);
      writeDemoRacks(next);
      setViews((current) => current.map((view) => view.rack.id === updated.id ? { rack: updated } : view));
      return;
    }
    await renameRack(formMode.id, values.name.trim());
    await load(true);
  }

  function openForm(view: RackView) {
    setFormMode(view.rack);
  }

  return (
    <main className="dashboard-root min-h-screen bg-[#f6f7f1] px-4 pb-28 pt-5 text-[#2d4030] sm:px-7 lg:px-9 lg:pb-10">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-8 flex min-h-12 items-center justify-between border-b border-[#e5e9e0] pb-3 text-[11px] text-[#859181]">
          <div className="flex items-center gap-3"><span>Workspace</span><ArrowDownRight size={13} /><span className="font-medium text-[#48604a]">Microgreens</span></div>
          <span className="hidden items-center gap-2 sm:flex"><Sun size={15} className="text-[#c29b3d]" /> Growing workspace</span>
        </div>
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#82917b]">Indoor growing</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-[#294532] sm:text-[34px]">Microgreens racks</h1>
            <p className="mt-2 text-xs text-[#7b8875]">Every rack has its own rhythm. Keep each one in balance.</p>
          </div>
          <button type="button" onClick={() => setFormMode("create")} className="inline-flex items-center gap-2 rounded-lg bg-[#315b38] px-4 py-3 text-xs font-semibold text-white shadow-sm hover:bg-[#264c2f]"><Plus size={15} />Add rack</button>
        </header>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#96a18e]" />
            <span className="sr-only">Search racks, crops, or varieties</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search racks, crops, or varieties…" className="h-11 w-full rounded-lg border border-[#e3e8df] bg-white pl-10 pr-3 text-xs text-[#354b38] outline-none placeholder:text-[#9aa396] focus:border-[#91a885]" />
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {statuses.map((status) => (
              <button key={status} type="button" onClick={() => setFilter(status)} aria-pressed={filter === status} className={`rounded-md px-3 py-2 text-[10px] transition ${filter === status ? "bg-[#e8f1e4] font-semibold text-[#486c41]" : "text-[#788574] hover:bg-white"}`}>{status}</button>
            ))}
            <span className="ml-auto pl-2 text-[11px] text-[#768270] sm:ml-3">{filtered.length} {filtered.length === 1 ? "rack" : "racks"}</span>
          </div>
        </div>

        {error ? <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-[#efcaca] bg-[#fff4f4] p-3 text-xs text-[#9b4141]"><AlertCircle size={16} className="mt-0.5 shrink-0" /><span>Could not load racks: {error}</span><button type="button" onClick={() => void load(true)} className="ml-auto shrink-0 font-semibold underline">Retry</button></div> : null}
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-[#eadcb8] bg-[#fcf8ee] p-3 text-[10px] leading-5 text-[#80652b]"><AlertCircle size={14} className="mt-0.5 shrink-0" /><p>Rack creation and full setup are browser demo only because the documented backend does not provide those endpoints. Existing rack data, crop records, sensors, and device controls are loaded from your account API.</p></div>

        {loading ? (
          <div role="status" className="rounded-xl border border-[#e5e9e0] bg-white p-12 text-center text-sm text-[#7b8875]"><LoaderCircle size={20} className="mx-auto mb-3 animate-spin" />Loading your racks…</div>
        ) : filtered.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((view) => <RackCard key={view.rack.id} view={view} onOpen={() => router.push(`/home/microgreens/${encodeURIComponent(view.rack.id)}`)} onEdit={() => openForm(view)} />)}
          </div>
        ) : (
          <section className="rounded-xl border border-dashed border-[#dbe3d6] bg-white px-5 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#edf4e9] text-[#6f8d5e]"><Leaf size={22} /></span>
            <h2 className="mt-4 text-base font-semibold text-[#354c38]">{views.length ? "No racks match these filters" : "No racks linked to your account"}</h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#899284]">{views.length ? "Try another search or status filter." : "When you link a rack device, it will appear here. You can also create a clearly labelled browser demo rack."}</p>
            {!views.length ? <button type="button" onClick={() => setFormMode("create")} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#315b38] px-4 py-2.5 text-xs font-semibold text-white"><Plus size={14} />Create demo rack</button> : null}
          </section>
        )}
        {refreshing ? <p role="status" className="mt-4 text-center text-xs text-[#7b8875]">Refreshing rack data…</p> : null}
        <div className="sr-only" aria-live="polite">{filtered.length} racks shown</div>
      </div>
      {formMode ? (
        typeof formMode === "string" || formMode.isDemo ? (
          <RackForm
            editing={formMode !== "create"}
            initial={formMode === "create" ? initialFormValues() : { ...initialFormValues(), ...formMode.demoConfiguration, name: formMode.name }}
            onClose={() => setFormMode(null)}
            onSave={saveRack}
          />
        ) : (
          <SimpleRackForm
            rack={formMode}
            onClose={() => setFormMode(null)}
            onSave={async (name) => {
              if (!name || name.length > 50) throw new Error("Rack name must be between 1 and 50 characters.");
              await renameRack(formMode.id, name);
              await load(true);
            }}
          />
        )
      ) : null}
    </main>
  );
}
