"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  Droplets,
  MoreHorizontal,
  Pencil,
  Plus,
  Thermometer,
  Trash2,
  Wifi,
  X,
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

import { useRouter } from "next/navigation";
import api from "../../lib/axios";

// ============================================================
// TYPES
// ============================================================

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: string;
  linkedAt: string | null;
  name: string | null;

  deviceModel: {
    id: string;
    name: string;
    code: string;
    imageUrl: string | null;
  };
};

type Telemetry = {
  id: string;
  temperature: number | null;
  humidity: number | null;
  recordedAt: string;
};

// ============================================================
// PAGE
// ============================================================

export default function MonitorPage() {
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>([]);

  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);

  const [loading, setLoading] = useState(true);

  const [telemetryLoading, setTelemetryLoading] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);

  const [renameOpen, setRenameOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const [newName, setNewName] = useState("");

  const [savingName, setSavingName] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  // ==========================================================
  // LOAD DEVICES
  // ==========================================================

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/user/devices");

      setDevices(response.data.devices || []);
    } catch (error) {
      console.error("Failed to load devices:", error);

      setError("Unable to load your devices.");
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // OPEN DEVICE
  // ==========================================================

  async function openDevice(device: Device) {
    setSelectedDevice(device);

    setMenuOpen(false);

    await loadTelemetry(device.id);
  }

  // ==========================================================
  // LOAD TELEMETRY
  // ==========================================================

  async function loadTelemetry(deviceId: string) {
    try {
      setTelemetryLoading(true);

      const response = await api.get(`/user/devices/${deviceId}/telemetry`);

      setTelemetry(response.data.telemetry || []);
    } catch (error) {
      console.error("Failed to load telemetry:", error);

      setTelemetry([]);
    } finally {
      setTelemetryLoading(false);
    }
  }

  // ==========================================================
  // CLOSE DETAILS
  // ==========================================================

  function closeDetails() {
    setSelectedDevice(null);
    setTelemetry([]);
    setMenuOpen(false);
  }

  // ==========================================================
  // OPEN RENAME
  // ==========================================================

  function openRename() {
    if (!selectedDevice) return;

    setNewName(selectedDevice.name || selectedDevice.deviceModel.name);

    setMenuOpen(false);
    setRenameOpen(true);
  }

  // ==========================================================
  // SAVE NAME
  // ==========================================================

  async function saveName() {
    if (!selectedDevice) return;

    const name = newName.trim();

    if (!name) return;

    try {
      setSavingName(true);

      /*
       * User-side name.
       *
       * This updates UserDevice,
       * NOT DeviceModel.
       */

      await api.patch(`/user/devices/${selectedDevice.id}/name`, {
        name,
      });

      const updatedDevice = {
        ...selectedDevice,
        name,
      };

      setSelectedDevice(updatedDevice);

      setDevices((current) =>
        current.map((device) =>
          device.id === selectedDevice.id ? updatedDevice : device,
        ),
      );

      setRenameOpen(false);
    } catch (error) {
      console.error("Failed to rename device:", error);
    } finally {
      setSavingName(false);
    }
  }

  // ==========================================================
  // REMOVE DEVICE
  // ==========================================================

  async function removeDevice() {
    if (!selectedDevice) return;

    try {
      setDeleting(true);

      /*
       * This should remove the
       * UserDevice relationship.
       *
       * It must NOT delete the
       * physical Device.
       */

      await api.delete(`/user/devices/${selectedDevice.id}`);

      setDevices((current) =>
        current.filter((device) => device.id !== selectedDevice.id),
      );

      setSelectedDevice(null);
      setTelemetry([]);
      setDeleteOpen(false);
    } catch (error) {
      console.error("Failed to remove device:", error);
    } finally {
      setDeleting(false);
    }
  }

  // ==========================================================
  // GRAPH DATA
  // ==========================================================

  const graphData = useMemo(() => {
    /*
     * Backend normally returns newest first.
     * Graph needs oldest -> newest.
     */

    return [...telemetry].reverse().map((item) => ({
      time: new Date(item.recordedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),

      temperature: item.temperature,

      humidity: item.humidity,
    }));
  }, [telemetry]);

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pt-6 pb-28">
        <div className="mx-auto max-w-md">
          <div className="h-6 w-28 animate-pulse rounded-lg bg-[#e7e7e1]" />

          <div className="mt-2 h-4 w-52 animate-pulse rounded-lg bg-[#e7e7e1]" />

          <div className="mt-7 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[118px] animate-pulse rounded-[28px] bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ============================================================
  // DEVICE DETAILS
  // ============================================================

  if (selectedDevice) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-5">
        <div className="mx-auto max-w-md">
          {/* ==================================================
                        FIXED TOP ACTION HEADER
                    ================================================== */}

          <header className="sticky top-0 z-30 -mx-4 bg-[#f6f6f2]/95 px-4 pb-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDetails}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_3px_15px_rgba(0,0,0,0.035)]"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#aaa9a2]">
                    Monitoring
                  </p>

                  <h1 className="max-w-[190px] truncate text-[18px] font-semibold tracking-[-0.04em] text-[#202020]">
                    {selectedDevice.name || selectedDevice.deviceModel.name}
                  </h1>
                </div>
              </div>

              {/* IMPORTANT:
                                Always accessible without scrolling.
                            */}

              <button
                onClick={() => setMenuOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_3px_15px_rgba(0,0,0,0.035)]"
              >
                <MoreHorizontal size={19} />
              </button>
            </div>
          </header>

          {/* ==================================================
                        DEVICE HERO
                    ================================================== */}

          <section className="overflow-hidden rounded-[30px] bg-white shadow-[0_5px_25px_rgba(0,0,0,0.04)]">
            {/* IMAGE */}

            <div className="relative h-[255px] bg-[#eef1e7]">
              {selectedDevice.deviceModel.imageUrl ? (
                <img
                  src={selectedDevice.deviceModel.imageUrl}
                  alt={selectedDevice.deviceModel.name}
                  className="h-full w-full object-contain p-7 drop-shadow-[0_18px_20px_rgba(0,0,0,0.10)]"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Wifi size={40} className="text-[#b8bbb0]" />
                </div>
              )}

              {/* LIVE */}

              <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[#78b63d]" />

                <span className="text-[9px] font-bold text-[#63923b]">
                  LIVE
                </span>
              </div>
            </div>

            {/* DEVICE INFORMATION */}

            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[24px] font-semibold tracking-[-0.055em] text-[#202020]">
                    {selectedDevice.name || selectedDevice.deviceModel.name}
                  </h2>

                  <p className="mt-1 text-[10px] text-[#aaa9a2]">
                    {selectedDevice.deviceCode}
                  </p>
                </div>

                <span className="shrink-0 rounded-full bg-[#eef3df] px-3 py-1.5 text-[9px] font-bold text-[#67943e]">
                  CONNECTED
                </span>
              </div>

              {/* MAIN VALUES */}

              <div className="mt-5 grid grid-cols-2 gap-3">
                {/* TEMP */}

                <div className="rounded-[21px] bg-[#eef3df] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold tracking-wide text-[#89917e]">
                      TEMPERATURE
                    </span>

                    <Thermometer size={16} className="text-[#789354]" />
                  </div>

                  <p className="mt-5 text-[29px] font-semibold tracking-[-0.06em] text-[#4e5d42]">
                    {getTemperature(telemetry)}

                    <span className="ml-1 text-sm font-normal text-[#8f9688]">
                      °C
                    </span>
                  </p>
                </div>

                {/* HUMIDITY */}

                <div className="rounded-[21px] bg-[#252525] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold tracking-wide text-white/40">
                      HUMIDITY
                    </span>

                    <Droplets size={16} className="text-white/60" />
                  </div>

                  <p className="mt-5 text-[29px] font-semibold tracking-[-0.06em] text-white">
                    {getHumidity(telemetry)}

                    <span className="ml-1 text-sm font-normal text-white/40">
                      %
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
                        TEMPERATURE GRAPH
                    ================================================== */}

          <section className="mt-4 rounded-[28px] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em]">
                  Temperature
                </h3>

                <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                  Device temperature history
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
                      dataKey="temperature"
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

          {/* ==================================================
                        HUMIDITY GRAPH
                    ================================================== */}

          <section className="mt-4 rounded-[28px] bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em]">
                  Humidity
                </h3>

                <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                  Device humidity history
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#252525]">
                <Droplets size={15} className="text-white/70" />
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
                      dataKey="humidity"
                      stroke="#2f2f2f"
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

          {/* ==================================================
                        TELEMETRY LOGS
                    ================================================== */}

          <section className="mt-4 overflow-hidden rounded-[28px] bg-white">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <h3 className="text-[14px] font-semibold tracking-[-0.02em]">
                  Telemetry
                </h3>

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
                  <TelemetryRow key={item.id} item={item} />
                ))
              )}
            </div>
          </section>

          {/* ==================================================
                        DEVICE INFO
                    ================================================== */}

          <section className="mt-4 rounded-[28px] bg-white p-4">
            <h3 className="text-[14px] font-semibold">Device information</h3>

            <div className="mt-4 space-y-3">
              <InfoRow label="Model" value={selectedDevice.deviceModel.name} />

              <InfoRow
                label="Model code"
                value={selectedDevice.deviceModel.code}
              />

              <InfoRow label="Device code" value={selectedDevice.deviceCode} />

              <InfoRow
                label="Serial number"
                value={selectedDevice.serialNumber}
              />

              <InfoRow label="Status" value={selectedDevice.status} />
            </div>
          </section>
        </div>

        {/* ======================================================
                    DEVICE ACTION SHEET
                ====================================================== */}

        {menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-100 flex items-end justify-center bg-black/25 px-3 pb-3 backdrop-blur-sm"
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

                <p className="mt-1 truncate text-[17px] font-semibold tracking-[-0.04em]">
                  {selectedDevice.name || selectedDevice.deviceModel.name}
                </p>
              </div>

              {/* EDIT */}

              <button
                onClick={openRename}
                className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left transition active:bg-[#f6f6f2]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef3df]">
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

              {/* REMOVE */}

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left transition active:bg-[#fff5f5]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0f0]">
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
          <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-3 pb-3 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[30px] bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#aaa9a2]">
                    Personalize
                  </p>

                  <h3 className="mt-1 text-[20px] font-semibold tracking-[-0.04em]">
                    Rename device
                  </h3>
                </div>

                <button
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
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    saveName();
                  }
                }}
                maxLength={50}
                className="mt-5 h-[58px] w-full rounded-[19px] border border-[#e2e2dc] bg-[#f8f8f5] px-4 text-[14px] font-medium outline-none focus:border-[#94ad62] focus:ring-4 focus:ring-[#d9ed65]/20"
              />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setRenameOpen(false)}
                  className="flex-1 rounded-full bg-[#f0f0ec] py-3.5 text-[11px] font-semibold text-[#66665f]"
                >
                  Cancel
                </button>

                <button
                  onClick={saveName}
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
                    DELETE CONFIRMATION
                ====================================================== */}

        {deleteOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 px-5 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[30px] bg-white p-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0f0]">
                <Trash2 size={22} className="text-red-500" />
              </div>

              <h3 className="mt-5 text-center text-[20px] font-semibold tracking-[-0.04em]">
                Remove this device?
              </h3>

              <p className="mx-auto mt-2 max-w-[270px] text-center text-[11px] leading-5 text-[#999991]">
                This will remove the device from your account. The physical
                device and its registration will not be deleted.
              </p>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setDeleteOpen(false)}
                  className="flex-1 rounded-full bg-[#f0f0ec] py-3.5 text-[11px] font-semibold"
                >
                  Cancel
                </button>

                <button
                  onClick={removeDevice}
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
  // DEVICE LIST
  // ============================================================

  return (
    <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-6">
      <div className="mx-auto max-w-md">
        {/* HEADER */}

        <header className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#aaa9a2]">
              Monitoring
            </p>

            <h1 className="mt-1 text-[29px] font-semibold tracking-[-0.06em] text-[#202020]">
              My devices
            </h1>

            <p className="mt-1 text-[10px] text-[#999991]">
              Everything connected to your account
            </p>
          </div>

          <span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-[#777770] shadow-[0_3px_12px_rgba(0,0,0,0.03)]">
            {devices.length}
          </span>
        </header>

        {/* ERROR */}

        {error && (
          <div className="mt-5 rounded-[18px] bg-[#fff0f0] px-4 py-3 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* DEVICES */}

        <section className="mt-6 space-y-3">
          {devices.length === 0 ? (
            <div className="rounded-[30px] bg-white px-6 py-14 text-center shadow-[0_5px_25px_rgba(0,0,0,0.035)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eef3df]">
                <Wifi size={28} className="text-[#789354]" />
              </div>

              <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.04em]">
                No devices yet
              </h2>

              <p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-5 text-[#999991]">
                Add your first device and start monitoring its data.
              </p>

              <button
                onClick={() => router.push("/home/devices/add")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1c1c1c] px-5 py-3 text-[11px] font-semibold text-white"
              >
                <Plus size={14} />
                Add device
              </button>
            </div>
          ) : (
            devices.map((device) => (
              <button
                key={device.id}
                onClick={() => openDevice(device)}
                className="group flex w-full items-center rounded-[27px] bg-white p-3 text-left shadow-[0_5px_20px_rgba(0,0,0,0.035)] transition active:scale-[0.985]"
              >
                {/* IMAGE */}

                <div className="flex h-[80px] w-[80px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-brand/30">
                  {device.deviceModel.imageUrl ? (
                    <img
                      src={device.deviceModel.imageUrl}
                      alt={device.deviceModel.name}
                      className="h-full w-full object-contain p-1 drop-shadow-[0_8px_10px_rgba(0,0,0,0.08)]"
                    />
                  ) : (
                    <Wifi size={25} className="text-[#b5b8ad]" />
                  )}
                </div>

                {/* DETAILS */}

                <div className="min-w-0 flex-1 px-4">
                  <h2 className="truncate text-[16px] font-semibold tracking-[-0.035em] text-[#202020]">
                    {device.name || device.deviceModel.name}
                  </h2>

                  <p className="mt-1 truncate text-[9px] text-[#aaa9a2]">
                    {device.deviceCode}
                  </p>

                  <div className="mt-4 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#93fc32]" />

                    <span className="text-[9px] font-semibold capitalize text-[#67943e]">
                      {device.status.toLowerCase()}
                    </span>
                  </div>
                </div>

                <ChevronRight
                  size={17}
                  className="mr-2 shrink-0 text-[#c3c3bd]"
                />
              </button>
            ))
          )}
        </section>

        {/* ADD DEVICE */}

        {devices.length > 0 && (
          <button
            onClick={() => router.push("/home/devices/add")}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-[#deded8] bg-transparent py-3.5 text-[11px] font-semibold text-[#696963]"
          >
            <Plus size={14} />
            Add another device
          </button>
        )}
      </div>
    </main>
  );
}

// ============================================================
// TELEMETRY ROW
// ============================================================

function TelemetryRow({ item }: { item: Telemetry }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-[11px] font-semibold text-[#30302e]">
          {formatDate(item.recordedAt)}
        </p>

        <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
          {formatTime(item.recordedAt)}
        </p>
      </div>

      <div className="flex items-center gap-5">
        <div className="text-right">
          <p className="text-[11px] font-semibold text-[#30302e]">
            {item.temperature ?? "--"}
            <span className="ml-0.5 text-[8px] text-[#999991]">°C</span>
          </p>

          <p className="mt-0.5 text-[8px] text-[#aaa9a2]">Temperature</p>
        </div>

        <div className="text-right">
          <p className="text-[11px] font-semibold text-[#30302e]">
            {item.humidity ?? "--"}
            <span className="ml-0.5 text-[8px] text-[#999991]">%</span>
          </p>

          <p className="mt-0.5 text-[8px] text-[#aaa9a2]">Humidity</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// INFO ROW
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
// CHART LOADING
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
// HELPERS
// ============================================================

function getTemperature(telemetry: Telemetry[]) {
  const value = telemetry[0]?.temperature;

  return value !== null && value !== undefined ? value.toFixed(1) : "--";
}

function getHumidity(telemetry: Telemetry[]) {
  const value = telemetry[0]?.humidity;

  return value !== null && value !== undefined ? value.toFixed(1) : "--";
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
  });
}
