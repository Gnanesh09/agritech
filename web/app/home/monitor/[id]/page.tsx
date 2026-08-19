"use client";

import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  ChevronRight,
  Droplets,
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

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// PAGE
// ============================================================

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

  // ==========================================================
  // CAPABILITIES
  // ==========================================================

  const sensors: DeviceCapability[] =
    device?.deviceModel?.capabilities?.sensors ?? [];

  const actuators: DeviceCapability[] =
    device?.deviceModel?.capabilities?.actuators ?? [];

  // ==========================================================
  // LOAD DEVICE
  // ==========================================================

  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      setError("Invalid device ID.");
      return;
    }

    void loadDevice();
  }, [deviceId]);

  async function loadDevice() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/user/devices");

      const devices = response.data?.devices ?? [];

      const loadedDevice = devices.find((item: Device) => item.id === deviceId);

      if (!loadedDevice) {
        throw new Error("Device not found in your account.");
      }

      setDevice(loadedDevice);

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

  // ==========================================================
  // TELEMETRY
  // ==========================================================

  async function loadTelemetry() {
    try {
      setTelemetryLoading(true);

      const response = await api.get(`/user/devices/${deviceId}/telemetry`);

      setTelemetry(response.data?.telemetry ?? []);
    } catch (err) {
      console.error("Failed to load telemetry:", err);

      setTelemetry([]);
    } finally {
      setTelemetryLoading(false);
    }
  }

  // ==========================================================
  // STATE
  // ==========================================================

  async function loadState() {
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
    } catch (err) {
      console.error("Failed to load device state:", err);
    }
  }

  // ==========================================================
  // RENAME
  // ==========================================================

  function openRename() {
    if (!device) {
      return;
    }

    setNewName(device.name || device.deviceModel.name);

    setMenuOpen(false);
    setRenameOpen(true);
  }

  async function saveName() {
    if (!device) {
      return;
    }

    const name = newName.trim();

    if (!name) {
      return;
    }

    try {
      setSavingName(true);

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
  // REMOVE DEVICE
  // ==========================================================

  async function removeDevice() {
    if (!device) {
      return;
    }

    try {
      setDeleting(true);

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
  // SEND COMMAND
  // ==========================================================

  async function sendCommand(capability: DeviceCapability) {
    if (!device) {
      return;
    }

    const actual = device.state?.actual ?? {};

    const currentValue = actual[capability.key];

    let nextValue: unknown;

    if (capability.type === "boolean") {
      nextValue = !Boolean(currentValue);
    } else if (capability.type === "number") {
      if (typeof currentValue === "number") {
        nextValue = Math.min(
          currentValue + 10,
          capability.max ?? currentValue + 10,
        );
      } else {
        nextValue = capability.min ?? 0;
      }
    } else {
      nextValue = "";
    }

    try {
      setCommandLoading(capability.key);

      await api.post(`/user/devices/${device.id}/commands`, {
        target: capability.key,
        action: "set",
        value: nextValue,
        mode: "MANUAL",
      });

      await loadState();
    } catch (err) {
      console.error("Failed to send command:", err);

      setError(`Failed to control ${capability.label || capability.key}.`);
    } finally {
      setCommandLoading(null);
    }
  }

  // ==========================================================
  // GRAPH DATA
  // ==========================================================

  const graphData = useMemo(() => {
    return [...telemetry].reverse().map((item) => {
      const row: Record<string, unknown> = {
        time: new Date(item.recordedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      for (const sensor of sensors) {
        if (sensor.type === "number") {
          row[sensor.key] = item.data[sensor.key] ?? null;
        }
      }

      return row;
    });
  }, [telemetry, sensors]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-6">
        <div className="mx-auto max-w-md">
          <div className="h-10 w-10 animate-pulse rounded-full bg-white" />

          <div className="mt-6 h-[255px] animate-pulse rounded-[30px] bg-white" />

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="h-32 animate-pulse rounded-[21px] bg-white" />
            <div className="h-32 animate-pulse rounded-[21px] bg-white" />
          </div>

          <div className="mt-4 h-[250px] animate-pulse rounded-[28px] bg-white" />
        </div>
      </main>
    );
  }

  // ==========================================================
  // NO DEVICE
  // ==========================================================

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

  // ==========================================================
  // DETAILS
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-5">
      <div className="mx-auto max-w-md">
        {/* HEADER */}

        <header className="sticky top-0 z-30 -mx-4 bg-[#f6f6f2]/95 px-4 pb-3 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/home/monitor")}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_3px_15px_rgba(0,0,0,0.035)]"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#aaa9a2]">
                  Monitoring
                </p>

                <h1 className="max-w-[190px] truncate text-[18px] font-semibold tracking-[-0.04em] text-[#202020]">
                  {device.name || device.deviceModel.name}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_3px_15px_rgba(0,0,0,0.035)]"
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
        </header>

        {/* HERO */}

        <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_5px_25px_rgba(0,0,0,0.04)]">
          <div className="relative h-[255px] bg-[#eef1e7]">
            {device.deviceModel.imageUrl ? (
              <img
                src={device.deviceModel.imageUrl}
                alt={device.deviceModel.name}
                className="h-full w-full object-contain p-7 drop-shadow-[0_18px_20px_rgba(0,0,0,0.10)]"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Wifi size={40} className="text-[#b8bbb0]" />
              </div>
            )}

            <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur">
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

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-[24px] font-semibold tracking-[-0.055em] text-[#202020]">
                  {device.name || device.deviceModel.name}
                </h2>

                <p className="mt-1 text-[10px] text-[#aaa9a2]">
                  {device.deviceCode}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-[#eef3df] px-3 py-1.5 text-[9px] font-bold text-[#67943e]">
                {device.status}
              </span>
            </div>
          </div>
        </section>

        {/* SENSOR VALUES */}

        {sensors.length > 0 && (
          <section className="mt-4">
            <div
              className={`grid gap-3 ${
                sensors.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {sensors.map((sensor) => (
                <SensorCard
                  key={sensor.key}
                  sensor={sensor}
                  value={telemetry[0]?.data?.[sensor.key]}
                />
              ))}
            </div>
          </section>
        )}

        {/* ACTUATORS */}

        {actuators.length > 0 && (
          <section className="mt-4 rounded-[28px] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold">Controls</h3>

                <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                  Manual device controls
                </p>
              </div>

              <Zap size={16} className="text-[#73914f]" />
            </div>

            <div className="mt-4 space-y-2">
              {actuators.map((actuator) => {
                const actual = device.state?.actual?.[actuator.key];

                const mode = device.state?.modes?.[actuator.key] || "AUTO";

                const busy = commandLoading === actuator.key;

                return (
                  <div
                    key={actuator.key}
                    className="flex items-center justify-between rounded-[19px] bg-[#f7f7f4] p-3.5"
                  >
                    <div>
                      <p className="text-[12px] font-semibold">
                        {actuator.label || actuator.key}
                      </p>

                      <p className="mt-1 text-[9px] text-[#aaa9a2]">
                        {String(mode)}
                      </p>
                    </div>

                    {actuator.type === "boolean" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => sendCommand(actuator)}
                        className={`relative h-8 w-14 rounded-full transition ${
                          Boolean(actual) ? "bg-[#1d1d1d]" : "bg-[#deded8]"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                            Boolean(actual) ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => sendCommand(actuator)}
                        className="rounded-full bg-[#1c1c1c] px-4 py-2 text-[10px] font-semibold text-white disabled:opacity-40"
                      >
                        {busy ? "..." : "Set"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* GRAPHS */}

        {sensors
          .filter((sensor) => sensor.type === "number")
          .map((sensor) => (
            <section
              key={sensor.key}
              className="mt-4 rounded-[28px] bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-semibold tracking-[-0.02em]">
                    {sensor.label || sensor.key}
                  </h3>

                  <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                    Device history
                  </p>
                </div>

                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3df]">
                  <Thermometer size={15} className="text-[#73914f]" />
                </div>
              </div>

              <div className="mt-5 h-[210px]">
                {telemetryLoading ? (
                  <ChartLoading />
                ) : graphData.length === 0 ? (
                  <NoData />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={graphData}
                      margin={{
                        top: 10,
                        right: 4,
                        left: -25,
                        bottom: 0,
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
                        axisLine={false}
                        tickLine={false}
                      />

                      <YAxis
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
                          boxShadow: "0 5px 20px rgba(0,0,0,.08)",
                          fontSize: "11px",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey={sensor.key}
                        stroke="#789d50"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{
                          r: 4,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>
          ))}

        {/* TELEMETRY */}

        <section className="mt-4 overflow-hidden rounded-[28px] bg-white">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <h3 className="text-[14px] font-semibold">Telemetry</h3>

              <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                Latest device readings
              </p>
            </div>

            <span className="rounded-full bg-[#f1f1ed] px-2.5 py-1 text-[9px] font-semibold text-[#777770]">
              {telemetry.length}
            </span>
          </div>

          <div className="divide-y divide-[#f0f0ec]">
            {telemetry.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-xs font-medium text-[#888881]">
                  No telemetry yet
                </p>
              </div>
            ) : (
              telemetry.map((item) => (
                <TelemetryRow key={item.id} item={item} sensors={sensors} />
              ))
            )}
          </div>
        </section>

        {/* DEVICE INFO */}

        <section className="mt-4 rounded-[28px] bg-white p-4">
          <h3 className="text-[14px] font-semibold">Device information</h3>

          <div className="mt-4 space-y-3">
            <InfoRow label="Model" value={device.deviceModel.name} />

            <InfoRow label="Model code" value={device.deviceModel.code} />

            <InfoRow label="Device code" value={device.deviceCode} />

            <InfoRow label="Serial number" value={device.serialNumber} />

            <InfoRow
              label="Firmware"
              value={device.firmwareVersion || "Unknown"}
            />

            <InfoRow label="Status" value={device.status} />
          </div>
        </section>
      </div>

      {/* ACTION SHEET */}

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
              className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left"
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
              className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left"
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

      {/* RENAME */}

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

      {/* DELETE */}

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
// SENSOR CARD
// ============================================================

function SensorCard({
  sensor,
  value,
}: {
  sensor: DeviceCapability;
  value: unknown;
}) {
  const dark = sensor.key === "humidity";

  return (
    <div
      className={`rounded-[21px] p-4 ${dark ? "bg-[#252525]" : "bg-[#eef3df]"}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[9px] font-semibold tracking-wide ${
            dark ? "text-white/40" : "text-[#89917e]"
          }`}
        >
          {(sensor.label || sensor.key).toUpperCase()}
        </span>

        {dark ? (
          <Droplets size={16} className="text-white/60" />
        ) : (
          <Thermometer size={16} className="text-[#789354]" />
        )}
      </div>

      <p
        className={`mt-5 text-[29px] font-semibold tracking-[-0.06em] ${
          dark ? "text-white" : "text-[#4e5d42]"
        }`}
      >
        {formatSensorValue(value, sensor)}

        {sensor.unit && (
          <span
            className={`ml-1 text-sm font-normal ${
              dark ? "text-white/40" : "text-[#8f9688]"
            }`}
          >
            {sensor.unit}
          </span>
        )}
      </p>
    </div>
  );
}

// ============================================================
// TELEMETRY ROW
// ============================================================

function TelemetryRow({
  item,
  sensors,
}: {
  item: Telemetry;
  sensors: DeviceCapability[];
}) {
  return (
    <div className="px-4 py-3.5">
      <p className="text-[11px] font-semibold text-[#30302e]">
        {formatDate(item.recordedAt)}
      </p>

      <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
        {formatTime(item.recordedAt)}
      </p>

      <div className="mt-3 flex flex-wrap justify-end gap-x-5 gap-y-2">
        {sensors.map((sensor) => {
          const value = item.data[sensor.key];

          if (value === undefined || value === null) {
            return null;
          }

          return (
            <div key={sensor.key} className="text-right">
              <p className="text-[11px] font-semibold text-[#30302e]">
                {formatSensorValue(value, sensor)}

                {sensor.unit && (
                  <span className="ml-0.5 text-[8px] text-[#999991]">
                    {sensor.unit}
                  </span>
                )}
              </p>

              <p className="mt-0.5 text-[8px] text-[#aaa9a2]">
                {sensor.label || sensor.key}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// INFO
// ============================================================

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#f0f0ec] pb-3 last:border-0 last:pb-0">
      <span className="text-[10px] text-[#aaa9a2]">{label}</span>

      <span className="max-w-[210px] truncate text-right text-[10px] font-semibold text-[#3b3b38]">
        {value}
      </span>
    </div>
  );
}

// ============================================================
// LOADING
// ============================================================

function ChartLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#dfe5d3] border-t-[#789354]" />
    </div>
  );
}

// ============================================================
// NO DATA
// ============================================================

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
// VALUE
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

// ============================================================
// ONLINE
// ============================================================

function isRecentlySeen(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return Date.now() - timestamp < 2 * 60 * 1000;
}

// ============================================================
// DATE / TIME
// ============================================================

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
  });
}
