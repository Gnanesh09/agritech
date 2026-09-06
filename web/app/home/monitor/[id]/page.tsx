"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CircleGauge,
  Droplets,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Thermometer,
  Trash2,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useParams, useRouter } from "next/navigation";

import api from "../../../lib/axios";

type CapabilityType = "number" | "boolean" | "string";
type Mode = "AUTO" | "MANUAL";

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
};

type Telemetry = {
  id: string;
  data: Record<string, unknown>;
  recordedAt: string;
};

export default function DeviceDetailsPage() {
  const router = useRouter();
  const params = useParams();

  const rawId = params?.id;
  const deviceId =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0] ?? ""
      : "";

  const [device, setDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [loading, setLoading] = useState(true);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [error, setError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [modeLoading, setModeLoading] = useState<string | null>(null);

  // UI state is optimistic while the ESP32 is processing a command.
  const [localActuatorState, setLocalActuatorState] = useState<
    Record<string, boolean>
  >({});
  const [localActuatorMode, setLocalActuatorMode] = useState<
    Record<string, Mode>
  >({});

  // Prevent stale state responses from undoing a recent UI click.
  const pendingUntil = useRef<Record<string, number>>({});

  const sensors = device?.deviceModel?.capabilities?.sensors ?? [];

  const actuators = device?.deviceModel?.capabilities?.actuators ?? [];

  async function loadTelemetry() {
    if (!deviceId) return;

    try {
      setTelemetryLoading(true);

      const response = await api.get(`/user/devices/${deviceId}/telemetry`);

      setTelemetry(response.data?.telemetry ?? []);
    } catch (err) {
      console.error("Failed to load telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  }

  async function loadState() {
    if (!deviceId) return;

    try {
      const response = await api.get(`/user/devices/${deviceId}/state`);

      const state = response.data?.state ?? null;

      setDevice((current) =>
        current
          ? {
              ...current,
              state,
            }
          : current,
      );

      if (!state) return;

      const booleanActuators =
        device?.deviceModel?.capabilities?.actuators?.filter(
          (actuator) => actuator.type === "boolean",
        ) ?? [];

      const now = Date.now();
      const nextState: Record<string, boolean> = {};
      const nextModes: Record<string, Mode> = {};

      for (const actuator of booleanActuators) {
        if ((pendingUntil.current[actuator.key] ?? 0) > now) {
          continue;
        }

        if (actuator.key in (state.actual ?? {})) {
          nextState[actuator.key] = Boolean(state.actual[actuator.key]);
        }

        nextModes[actuator.key] =
          state.modes?.[actuator.key] === "MANUAL" ? "MANUAL" : "AUTO";
      }

      if (Object.keys(nextState).length) {
        setLocalActuatorState((current) => ({
          ...current,
          ...nextState,
        }));
      }

      if (Object.keys(nextModes).length) {
        setLocalActuatorMode((current) => ({
          ...current,
          ...nextModes,
        }));
      }
    } catch (err) {
      console.error("Failed to load device state:", err);
    }
  }

  async function loadDevice() {
    if (!deviceId) {
      setError("Invalid device ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await api.get("/user/devices");

      const devices = response.data?.devices ?? [];

      const found = devices.find((item: Device) => item.id === deviceId);

      if (!found) {
        throw new Error("Device not found in your account.");
      }

      setDevice(found);

      const foundActuators = found.deviceModel?.capabilities?.actuators ?? [];

      const initialState: Record<string, boolean> = {};
      const initialModes: Record<string, Mode> = {};

      for (const actuator of foundActuators) {
        if (actuator.type === "boolean") {
          initialState[actuator.key] = Boolean(
            found.state?.actual?.[actuator.key],
          );

          initialModes[actuator.key] =
            found.state?.modes?.[actuator.key] === "MANUAL" ? "MANUAL" : "AUTO";
        }
      }

      setLocalActuatorState(initialState);
      setLocalActuatorMode(initialModes);

      await Promise.all([loadTelemetry(), loadState()]);
    } catch (err: any) {
      console.error("Failed to load device:", err);

      setDevice(null);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load this device.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDevice();
    // deviceId is the only route dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  // Refresh telemetry and real device state continuously.
  // This keeps the UI current after ESP32 polling/ACKs.
  useEffect(() => {
    if (!deviceId || !device) return;

    const timer = window.setInterval(() => {
      void loadTelemetry();
      void loadState();
    }, 2500);

    return () => {
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, device?.id]);

  // ==========================================================
  // RENAME
  // ==========================================================

  function openRename() {
    if (!device) return;

    setNewName(device.name || device.deviceModel.name);
    setMenuOpen(false);
    setRenameOpen(true);
  }

  async function saveName() {
    if (!device) return;

    const name = newName.trim();
    if (!name) return;

    try {
      setSavingName(true);
      setError("");

      await api.patch(`/user/devices/${device.id}/name`, { name });

      setDevice((current) =>
        current
          ? {
              ...current,
              name,
            }
          : current,
      );

      setRenameOpen(false);
    } catch (err) {
      console.error("Failed to rename device:", err);
      setError("Failed to rename device.");
    } finally {
      setSavingName(false);
    }
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async function removeDevice() {
    if (!device) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(`/user/devices/${device.id}`);

      router.replace("/home/monitor");
    } catch (err) {
      console.error("Failed to remove device:", err);
      setError("Failed to remove device.");
    } finally {
      setDeleting(false);
    }
  }

  // ==========================================================
  // MODE CONTROL
  // ==========================================================
  //
  // AUTO switch ON  = AUTO
  // AUTO switch OFF = MANUAL
  //
  // Changing mode does NOT change the actuator value.
  // ==========================================================

  async function changeActuatorMode(
    actuator: DeviceCapability,
    nextMode: Mode,
  ) {
    if (!device) return;

    if (modeLoading === actuator.key) {
      return;
    }

    const previousMode = localActuatorMode[actuator.key] ?? "AUTO";

    const currentActual =
      actuator.type === "boolean"
        ? Boolean(
            localActuatorState[actuator.key] ??
              device.state?.actual?.[actuator.key],
          )
        : device.state?.actual?.[actuator.key];

    // Immediate UI response.
    setLocalActuatorMode((current) => ({
      ...current,
      [actuator.key]: nextMode,
    }));

    pendingUntil.current[actuator.key] = Date.now() + 6000;

    setModeLoading(actuator.key);
    setError("");

    try {
      await api.post(`/user/devices/${device.id}/commands`, {
        target: actuator.key,
        action: "set",
        value: currentActual,
        mode: nextMode,
      });

      window.setTimeout(() => {
        delete pendingUntil.current[actuator.key];
        void loadState();
      }, 2300);
    } catch (err) {
      console.error("Failed to change mode:", err);

      delete pendingUntil.current[actuator.key];

      setLocalActuatorMode((current) => ({
        ...current,
        [actuator.key]: previousMode,
      }));

      setError(`Failed to change ${actuator.label || actuator.key} mode.`);
    } finally {
      setModeLoading(null);
    }
  }

  // ==========================================================
  // MANUAL ACTUATOR CONTROL
  // ==========================================================

  async function sendCommand(actuator: DeviceCapability) {
    if (!device) return;

    const mode = localActuatorMode[actuator.key] ?? "AUTO";

    // AUTO means sensor automation owns it.
    if (mode !== "MANUAL") {
      return;
    }

    if (commandLoading === actuator.key) {
      return;
    }

    if (actuator.type !== "boolean") {
      return;
    }

    const previousValue =
      localActuatorState[actuator.key] ??
      Boolean(device.state?.actual?.[actuator.key]);

    const nextValue = !previousValue;

    // Immediate UI movement.
    setLocalActuatorState((current) => ({
      ...current,
      [actuator.key]: nextValue,
    }));

    pendingUntil.current[actuator.key] = Date.now() + 6000;

    setCommandLoading(actuator.key);
    setError("");

    try {
      await api.post(`/user/devices/${device.id}/commands`, {
        target: actuator.key,
        action: "set",
        value: nextValue,
        mode: "MANUAL",
      });

      window.setTimeout(() => {
        delete pendingUntil.current[actuator.key];
        void loadState();
      }, 2300);
    } catch (err) {
      console.error("Failed to control actuator:", err);

      delete pendingUntil.current[actuator.key];

      setLocalActuatorState((current) => ({
        ...current,
        [actuator.key]: previousValue,
      }));

      setError(`Failed to control ${actuator.label || actuator.key}.`);
    } finally {
      setCommandLoading(null);
    }
  }

  // ==========================================================
  // LATEST VALUES
  // ==========================================================

  const latest = telemetry[0] ?? null;

  const latestValues = useMemo(() => {
    const result: Record<string, unknown> = {};

    for (const sensor of sensors) {
      result[sensor.key] = latest?.data?.[sensor.key] ?? null;
    }

    return result;
  }, [latest, sensors]);

  // ==========================================================
  // GRAPH DATA
  // ==========================================================

  const graphData = useMemo(() => {
    return [...telemetry].reverse().map((item) => {
      const row: Record<string, unknown> = {
        time: formatChartTime(item.recordedAt),
      };

      for (const sensor of sensors) {
        const value = item.data?.[sensor.key];

        if (sensor.type === "number") {
          const numeric = Number(value);

          row[sensor.key] = Number.isFinite(numeric) ? numeric : null;
        } else if (sensor.type === "boolean") {
          row[sensor.key] = typeof value === "boolean" ? (value ? 1 : 0) : null;
        }
      }

      return row;
    });
  }, [telemetry, sensors]);

  const numericSensors = sensors.filter((sensor) => sensor.type === "number");

  const booleanSensors = sensors.filter((sensor) => sensor.type === "boolean");

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-6">
        <div className="mx-auto max-w-6xl">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white" />
          <div className="mt-5 h-[280px] animate-pulse rounded-[30px] bg-white" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-[24px] bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!device) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-6">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() => router.push("/home/monitor")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="mt-10 rounded-[30px] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0f0]">
              <Wifi size={25} className="text-red-400" />
            </div>

            <h1 className="mt-5 text-xl font-semibold">Device unavailable</h1>

            <p className="mt-2 text-sm text-gray-400">
              {error || "This device could not be loaded."}
            </p>

            <button
              type="button"
              onClick={() => router.push("/home/monitor")}
              className="mt-6 rounded-full bg-black px-5 py-3 text-xs font-semibold text-white"
            >
              Back to devices
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f6f2] px-3 pb-28 pt-4 sm:px-5">
      <div className="mx-auto max-w-6xl">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="sticky top-0 z-30 -mx-3 mb-4 border-b border-[#ecece7] bg-[#f6f6f2]/95 px-3 pb-3 pt-1 backdrop-blur-md sm:-mx-5 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/home/monitor")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
                aria-label="Back to devices"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#aaa9a2]">
                  Monitoring
                </p>

                <h1 className="truncate text-[18px] font-semibold tracking-[-0.04em] text-[#202020] sm:text-[21px]">
                  {device.name || device.deviceModel.name}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
              aria-label="Device actions"
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
        </header>

        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-[30px] bg-white shadow-sm">
            <div className="relative h-[245px] bg-[#eef1e7] sm:h-[300px]">
              {device.deviceModel.imageUrl ? (
                <img
                  src={device.deviceModel.imageUrl}
                  alt={device.deviceModel.name}
                  className="h-full w-full object-contain p-7"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <CircleGauge size={50} className="text-[#b8bbb0]" />
                </div>
              )}

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isRecentlySeen(device.lastSeenAt)
                      ? "bg-[#78b63d]"
                      : "bg-gray-400"
                  }`}
                />

                <span className="text-[9px] font-bold text-[#63923b]">
                  {isRecentlySeen(device.lastSeenAt) ? "LIVE" : "OFFLINE"}
                </span>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-[24px] font-semibold tracking-[-0.055em] text-[#202020] sm:text-[30px]">
                    {device.name || device.deviceModel.name}
                  </h2>

                  <p className="mt-1 text-[10px] text-[#aaa9a2]">
                    {device.deviceCode}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#eef3df] px-3 py-1.5 text-[9px] font-bold text-[#67943e]">
                    {device.status}
                  </span>

                  <span className="rounded-full bg-[#f1f1ed] px-3 py-1.5 text-[9px] font-semibold text-[#777770]">
                    {device.deviceModel.code}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {sensors.slice(0, 2).map((sensor) => (
              <QuickValueCard
                key={sensor.key}
                sensor={sensor}
                value={latestValues[sensor.key]}
              />
            ))}

            <div className="rounded-[26px] bg-[#202720] p-4 text-white sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/40">
                    Connection
                  </p>

                  <p className="mt-2 text-[20px] font-semibold tracking-[-0.04em]">
                    {isRecentlySeen(device.lastSeenAt) ? "Online" : "Offline"}
                  </p>

                  <p className="mt-1 text-[9px] text-white/40">
                    {device.lastSeenAt
                      ? `Last seen ${formatRelativeTime(device.lastSeenAt)}`
                      : "No recent signal"}
                  </p>
                </div>

                <Wifi size={17} className="text-[#dff37a]" />
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================
            SENSOR OVERVIEW
        ==================================================== */}

        {sensors.length > 0 && (
          <section className="mt-4">
            <div className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#aaa9a2]">
                Current readings
              </p>

              <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">
                Sensor overview
              </h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sensors.map((sensor) => (
                <SensorCard
                  key={sensor.key}
                  sensor={sensor}
                  value={latestValues[sensor.key]}
                />
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            CONTROLS
        ==================================================== */}

        {actuators.length > 0 && (
          <section className="mt-4 rounded-[28px] bg-white p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#aaa9a2]">
                  Device control
                </p>

                <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">
                  Controls
                </h3>

                <p className="mt-1 text-[10px] text-[#aaa9a2]">
                  Auto/Manual mode is independent from the actuator state.
                </p>
              </div>

              <Zap size={17} className="text-[#73914f]" />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {actuators.map((actuator) => {
                const mode = localActuatorMode[actuator.key] ?? "AUTO";

                const isAuto = mode === "AUTO";

                const actual =
                  actuator.type === "boolean"
                    ? localActuatorState[actuator.key] ??
                      Boolean(device.state?.actual?.[actuator.key])
                    : device.state?.actual?.[actuator.key];

                const modeBusy = modeLoading === actuator.key;

                const commandBusy = commandLoading === actuator.key;

                return (
                  <div
                    key={actuator.key}
                    className="rounded-[22px] border border-[#ecece7] bg-[#f8f8f5] p-4"
                  >
                    {/* Mode */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold">
                          {actuator.label || actuator.key}
                        </p>

                        <p className="mt-1 text-[9px] text-[#aaa9a2]">
                          {isAuto
                            ? "Automatic control enabled"
                            : "Manual control enabled"}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={modeBusy}
                        onClick={() =>
                          void changeActuatorMode(
                            actuator,
                            isAuto ? "MANUAL" : "AUTO",
                          )
                        }
                        className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                          isAuto ? "bg-[#202720]" : "bg-[#d6d7d0]"
                        } ${modeBusy ? "opacity-50" : ""}`}
                        aria-label={
                          isAuto ? "Switch to manual" : "Switch to automatic"
                        }
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                            isAuto ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* State */}
                    <div className="mt-3 flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1.5 text-[9px] font-bold tracking-[0.08em] ${
                          isAuto
                            ? "bg-[#e8f0d9] text-[#63833f]"
                            : "bg-[#ecece8] text-[#66675f]"
                        }`}
                      >
                        {mode}
                      </span>

                      <span className="text-[9px] text-[#999991]">
                        Current:{" "}
                        <span className="font-semibold text-[#44443f]">
                          {actuator.type === "boolean"
                            ? actual
                              ? "ON"
                              : "OFF"
                            : String(actual ?? "--")}
                        </span>
                      </span>
                    </div>

                    {/* Manual state control */}
                    {actuator.type === "boolean" && (
                      <div className="mt-3 border-t border-[#e9e9e4] pt-3">
                        <button
                          type="button"
                          disabled={isAuto || commandBusy}
                          onClick={() => void sendCommand(actuator)}
                          className={`relative h-12 w-full overflow-hidden rounded-2xl transition ${
                            isAuto
                              ? "cursor-not-allowed bg-[#eaeae5]"
                              : actual
                              ? "bg-[#202720]"
                              : "bg-[#d9dad4]"
                          } ${commandBusy ? "opacity-60" : ""}`}
                        >
                          <span
                            className={`absolute top-1 h-10 w-10 rounded-full bg-white shadow transition ${
                              actual ? "left-[calc(100%-44px)]" : "left-1"
                            }`}
                          />

                          <span
                            className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold tracking-[0.08em] ${
                              isAuto
                                ? "text-[#999b93]"
                                : actual
                                ? "text-white"
                                : "text-[#666860]"
                            }`}
                          >
                            {isAuto
                              ? "AUTOMATIC MODE"
                              : actual
                              ? "FAN ON"
                              : "FAN OFF"}
                          </span>
                        </button>

                        <p className="mt-2 text-center text-[9px] text-[#aaa9a2]">
                          {isAuto
                            ? "Disable AUTO to control it manually."
                            : "Manual control is active."}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ====================================================
            NUMERIC GRAPHS
        ==================================================== */}

        {numericSensors.length > 0 && (
          <section className="mt-4">
            <div className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#aaa9a2]">
                Telemetry history
              </p>

              <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">
                Sensor trends
              </h3>

              <p className="mt-1 text-[10px] text-[#aaa9a2]">
                Every numeric sensor is shown in its own responsive graph.
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {numericSensors.map((sensor) => (
                <section
                  key={sensor.key}
                  className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="truncate text-[14px] font-semibold">
                        {sensor.label || sensor.key}
                      </h4>

                      <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                        {sensor.unit
                          ? `Unit: ${sensor.unit}`
                          : "Numeric telemetry"}
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eef3df]">
                      {sensor.key.toLowerCase().includes("humidity") ? (
                        <Droplets size={15} className="text-[#73914f]" />
                      ) : (
                        <Thermometer size={15} className="text-[#73914f]" />
                      )}
                    </div>
                  </div>

                  <div className="mt-4 h-[270px] w-full min-w-0 sm:h-[300px]">
                    {telemetryLoading ? (
                      <ChartLoading />
                    ) : graphData.length === 0 ? (
                      <NoData />
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={graphData}
                          margin={{
                            top: 8,
                            right: 14,
                            left: -12,
                            bottom: 4,
                          }}
                        >
                          <CartesianGrid
                            vertical={false}
                            stroke="#eeeeea"
                            strokeDasharray="3 3"
                          />

                          <XAxis
                            dataKey="time"
                            tick={{
                              fontSize: 8,
                              fill: "#aaa9a2",
                            }}
                            minTickGap={24}
                            axisLine={false}
                            tickLine={false}
                          />

                          <YAxis
                            domain={["auto", "auto"]}
                            tick={{
                              fontSize: 8,
                              fill: "#aaa9a2",
                            }}
                            axisLine={false}
                            tickLine={false}
                          />

                          <Tooltip
                            contentStyle={{
                              borderRadius: "14px",
                              border: "none",
                              boxShadow: "0 8px 30px rgba(0,0,0,.08)",
                              fontSize: "11px",
                            }}
                          />

                          <Line
                            type="monotone"
                            dataKey={sensor.key}
                            name={sensor.label || sensor.key}
                            stroke="#789d50"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{
                              r: 4,
                            }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </section>
        )}

        {/* ====================================================
            BOOLEAN GRAPH
        ==================================================== */}

        {booleanSensors.length > 0 && graphData.length > 0 && (
          <section className="mt-4 rounded-[28px] bg-white p-4 sm:p-5">
            <div className="mb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#aaa9a2]">
                Digital telemetry
              </p>

              <h3 className="mt-1 text-[18px] font-semibold tracking-[-0.03em]">
                Binary sensor history
              </h3>

              <p className="mt-1 text-[10px] text-[#aaa9a2]">
                ON = 1 · OFF = 0
              </p>
            </div>

            <div className="h-[270px] w-full min-w-0 sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={graphData}
                  margin={{
                    top: 8,
                    right: 14,
                    left: -12,
                    bottom: 4,
                  }}
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#eeeeea"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="time"
                    tick={{
                      fontSize: 8,
                      fill: "#aaa9a2",
                    }}
                    minTickGap={24}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 1]}
                    tickFormatter={(value) => (value === 1 ? "ON" : "OFF")}
                    tick={{
                      fontSize: 8,
                      fill: "#aaa9a2",
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <Tooltip
                    contentStyle={{
                      borderRadius: "14px",
                      border: "none",
                      boxShadow: "0 8px 30px rgba(0,0,0,.08)",
                      fontSize: "11px",
                    }}
                  />

                  {booleanSensors.map((sensor) => (
                    <Line
                      key={sensor.key}
                      type="stepAfter"
                      dataKey={sensor.key}
                      name={sensor.label || sensor.key}
                      stroke="#789d50"
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ====================================================
            TELEMETRY LOG
        ==================================================== */}

        <section className="mt-4 overflow-hidden rounded-[28px] bg-white">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#aaa9a2]">
                Raw history
              </p>

              <h3 className="mt-1 text-[16px] font-semibold">
                Recent telemetry
              </h3>
            </div>

            <span className="rounded-full bg-[#f1f1ed] px-2.5 py-1 text-[9px] font-semibold text-[#777770]">
              {telemetry.length}
            </span>
          </div>

          {telemetry.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-xs font-medium text-[#888881]">
                No telemetry data yet
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto border-t border-[#f0f0ec]">
              <div className="divide-y divide-[#f0f0ec]">
                {telemetry.map((item) => (
                  <TelemetryCompactRow
                    key={item.id}
                    item={item}
                    sensors={sensors}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ====================================================
            DEVICE INFORMATION
        ==================================================== */}

        <section className="mt-4 rounded-[28px] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#aaa9a2]">
                Device
              </p>

              <h3 className="mt-1 text-[16px] font-semibold">Information</h3>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCard label="Model" value={device.deviceModel.name} />

            <InfoCard label="Model code" value={device.deviceModel.code} />

            <InfoCard label="Device code" value={device.deviceCode} />

            <InfoCard label="Serial number" value={device.serialNumber} />

            <InfoCard
              label="Firmware"
              value={device.firmwareVersion || "Unknown"}
            />

            <InfoCard label="Status" value={device.status} />
          </div>
        </section>
      </div>

      {/* ======================================================
          ACTION SHEET
      ====================================================== */}

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/25 px-3 pb-3 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[30px] bg-white p-2 shadow-2xl"
          >
            <div className="mx-auto mb-3 mt-2 h-1 w-10 rounded-full bg-[#deded9]" />

            <div className="px-4 pb-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#aaa9a2]">
                Device actions
              </p>

              <p className="mt-1 truncate text-[17px] font-semibold">
                {device.name || device.deviceModel.name}
              </p>
            </div>

            <button
              type="button"
              onClick={openRename}
              className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left hover:bg-[#f8f8f5]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3df]">
                <Pencil size={16} className="text-[#6c9145]" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">Edit device name</p>

                <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                  Change the name only on your account
                </p>
              </div>

              <ChevronRight size={16} className="text-[#b5b5af]" />
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setDeleteOpen(true);
              }}
              className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left hover:bg-red-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff0f0]">
                <Trash2 size={16} className="text-red-500" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-red-600">
                  Remove device
                </p>

                <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                  Disconnect it from your account
                </p>
              </div>

              <ChevronRight size={16} className="text-red-300" />
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="mt-1 w-full rounded-[22px] py-4 text-[12px] font-semibold text-[#777770]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ======================================================
          RENAME MODAL
      ====================================================== */}

      {renameOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/30 px-3 pb-3 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#aaa9a2]">
                  Personalize
                </p>

                <h3 className="mt-1 text-[20px] font-semibold">
                  Rename device
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f3ef]"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-2 text-[10px] leading-4 text-[#999991]">
              This name belongs to you. Other users and admins won't see your
              personal device name.
            </p>

            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={50}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void saveName();
                }
              }}
              className="mt-5 h-[58px] w-full rounded-[19px] border border-[#e2e2dc] bg-[#f8f8f5] px-4 text-[14px] font-medium outline-none focus:border-[#94ad62] focus:ring-4 focus:ring-[#d9ed65]/20"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                className="flex-1 rounded-full bg-[#f0f0ec] py-3.5 text-[11px] font-semibold text-[#66665f]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveName()}
                disabled={savingName || !newName.trim()}
                className="flex-1 rounded-full bg-[#1c1c1c] py-3.5 text-[11px] font-semibold text-white disabled:opacity-40"
              >
                {savingName ? "Saving..." : "Save name"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          DELETE MODAL
      ====================================================== */}

      {deleteOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[30px] bg-white p-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f0]">
              <Trash2 size={22} className="text-red-500" />
            </div>

            <h3 className="mt-5 text-center text-[20px] font-semibold">
              Remove this device?
            </h3>

            <p className="mx-auto mt-2 max-w-[270px] text-center text-[11px] leading-5 text-[#999991]">
              This will remove the device from your account. The physical device
              and its registration will not be deleted.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="flex-1 rounded-full bg-[#f0f0ec] py-3.5 text-[11px] font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void removeDevice()}
                disabled={deleting}
                className="flex-1 rounded-full bg-[#e84b4b] py-3.5 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                {deleting ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================
// QUICK VALUE
// ============================================================

function QuickValueCard({
  sensor,
  value,
}: {
  sensor: DeviceCapability;
  value: unknown;
}) {
  return (
    <div className="rounded-[26px] bg-white p-4 shadow-[0_5px_25px_rgba(0,0,0,0.035)] sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#aaa9a2]">
          {sensor.label || sensor.key}
        </span>

        {sensor.key.toLowerCase().includes("humidity") ? (
          <Droplets size={16} className="text-[#789354]" />
        ) : sensor.key.toLowerCase().includes("light") ? (
          <Lightbulb size={16} className="text-[#789354]" />
        ) : (
          <Thermometer size={16} className="text-[#789354]" />
        )}
      </div>

      <p className="mt-5 text-[27px] font-semibold tracking-[-0.06em] text-[#35412e]">
        {formatSensorValue(value, sensor)}

        {sensor.unit && (
          <span className="ml-1 text-sm font-normal text-[#8f9688]">
            {sensor.unit}
          </span>
        )}
      </p>
    </div>
  );
}

// ============================================================
// SENSOR CARD
// ============================================================

function SensorCard({
  sensor,
  value,
}: {
  sensor: DeviceCapability;
  value: unknown;
}) {
  const isHumidity = sensor.key.toLowerCase().includes("humidity");

  const isLight = sensor.key.toLowerCase().includes("light");

  return (
    <div
      className={`rounded-[24px] p-4 ${
        isHumidity ? "bg-[#252525] text-white" : "bg-white"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[9px] font-semibold uppercase tracking-wide ${
            isHumidity ? "text-white/40" : "text-[#89917e]"
          }`}
        >
          {sensor.label || sensor.key}
        </span>

        {isLight ? (
          <Lightbulb
            size={16}
            className={isHumidity ? "text-white/60" : "text-[#789354]"}
          />
        ) : isHumidity ? (
          <Droplets size={16} className="text-white/60" />
        ) : (
          <Thermometer size={16} className="text-[#789354]" />
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p
          className={`text-[29px] font-semibold tracking-[-0.06em] ${
            isHumidity ? "text-white" : "text-[#4e5d42]"
          }`}
        >
          {formatSensorValue(value, sensor)}

          {sensor.unit && (
            <span
              className={`ml-1 text-sm font-normal ${
                isHumidity ? "text-white/40" : "text-[#8f9688]"
              }`}
            >
              {sensor.unit}
            </span>
          )}
        </p>

        {sensor.type === "boolean" && (
          <span
            className={`rounded-full px-2.5 py-1 text-[8px] font-bold ${
              Boolean(value)
                ? "bg-[#dff37a] text-[#202720]"
                : isHumidity
                ? "bg-white/10 text-white/50"
                : "bg-[#f1f1ed] text-[#777770]"
            }`}
          >
            {Boolean(value) ? "ON" : "OFF"}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TELEMETRY ROW
// ============================================================

function TelemetryCompactRow({
  item,
  sensors,
}: {
  item: Telemetry;
  sensors: DeviceCapability[];
}) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="shrink-0">
          <p className="text-[11px] font-semibold text-[#30302e]">
            {formatDate(item.recordedAt)}
          </p>

          <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
            {formatTime(item.recordedAt)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-2 sm:flex sm:flex-wrap sm:justify-end">
          {sensors.map((sensor) => {
            const value = item.data?.[sensor.key];

            if (value === undefined || value === null) {
              return null;
            }

            return (
              <div key={sensor.key} className="min-w-[72px] sm:text-right">
                <p className="text-[11px] font-semibold text-[#30302e]">
                  {formatSensorValue(value, sensor)}

                  {sensor.unit && (
                    <span className="ml-0.5 text-[8px] text-[#999991]">
                      {sensor.unit}
                    </span>
                  )}
                </p>

                <p className="mt-0.5 truncate text-[8px] text-[#aaa9a2]">
                  {sensor.label || sensor.key}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INFO CARD
// ============================================================

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#f8f8f5] p-3.5">
      <p className="text-[9px] text-[#aaa9a2]">{label}</p>

      <p className="mt-1.5 truncate text-[11px] font-semibold text-[#3b3b38]">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// CHART HELPERS
// ============================================================

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#dfe5d3] border-t-[#789354]" />
    </div>
  );
}

function NoData() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2f2ee]">
        <Wifi size={16} className="text-[#aaa9a2]" />
      </div>

      <p className="mt-3 text-[10px] font-medium text-[#999991]">
        No telemetry data yet
      </p>
    </div>
  );
}

// ============================================================
// FORMAT
// ============================================================

function formatSensorValue(
  value: unknown,
  capability: DeviceCapability,
): string {
  if (value === null || value === undefined) {
    return "--";
  }

  if (capability.type === "number") {
    const number = Number(value);

    if (Number.isNaN(number)) {
      return "--";
    }

    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  if (capability.type === "boolean") {
    return value ? "ON" : "OFF";
  }

  return String(value);
}

function isRecentlySeen(value: string | null): boolean {
  if (!value) return false;

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < 2 * 60 * 1000;
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "unknown";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  return `${Math.floor(minutes / 60)}h ago`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatChartTime(date: string) {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
