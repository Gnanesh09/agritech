
"use client";

// ==========================================================
// IMPORTS
// ==========================================================

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ChevronRight,
  CircleAlert,
  Plus,
  RefreshCw,
  Wifi,
  WifiOff,
  Thermometer,
  Droplets,
  Sun,
  Sprout,
} from "lucide-react";

import api from "../../lib/axios";

// ==========================================================
// TYPES
// ==========================================================

type Capability = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
  unit?: string;
};

type Device = {
  id: string;
  deviceCode: string;
  lastSeenAt: string | null;
  name: string | null;
  deviceModel: {
    name: string;
    imageUrl?: string | null;
    capabilities: {
      sensors: Capability[];
      actuators: Capability[];
    };
  };
};

type Telemetry = {
  id: string;
  data: Record<string, unknown>;
  recordedAt: string;
};

type Reading = {
  key: string;
  label: string;
  value: string;
  unit: string;
};

type DeviceSummary = {
  device: Device;
  readings: Reading[];
  telemetryAt: string | null;
};

// ==========================================================
// HELPERS
// ==========================================================

function isOnline(lastSeenAt: string | null) {
  if (!lastSeenAt) return false;

  const timestamp = new Date(lastSeenAt).getTime();

  return (
    Number.isFinite(timestamp) &&
    timestamp <= Date.now() &&
    Date.now() - timestamp < 2 * 60 * 1000
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "--";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "--";
  }

  if (typeof value === "boolean") {
    return value ? "On" : "Off";
  }

  if (typeof value === "string") return value;

  return "--";
}

function formatTime(value: string | null) {
  if (!value) return "No telemetry yet";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown time";

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sensorIcon(label: string) {
  const name = label.toLowerCase();

  if (name.includes("temp")) return Thermometer;
  if (name.includes("humid")) return Droplets;
  if (name.includes("light") || name.includes("ldr")) return Sun;

  return Activity;
}

// ==========================================================
// DASHBOARD PAGE
// ==========================================================

export default function DashboardPage() {
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>([]);
  const [summaries, setSummaries] = useState<DeviceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD DASHBOARD DATA
  // ==========================================================

  const loadDashboard = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await api.get("/user/devices");
      const deviceList: Device[] = response.data?.devices ?? [];

      setDevices(deviceList);

      const results = await Promise.all(
        deviceList.map(async (device): Promise<DeviceSummary> => {
          try {
            const telemetryResponse = await api.get(
              `/user/devices/${device.id}/telemetry`,
            );

            const telemetry: Telemetry[] =
              telemetryResponse.data?.telemetry ?? [];

            const latest = telemetry[0];
            const data = latest?.data ?? {};

            const readings = device.deviceModel.capabilities.sensors.map(
              (sensor) => ({
                key: sensor.key,
                label: sensor.label || sensor.key,
                value: formatValue(data[sensor.key]),
                unit: sensor.unit || "",
              }),
            );

            return {
              device,
              readings,
              telemetryAt: latest?.recordedAt ?? null,
            };
          } catch (err) {
            console.error(
              `Failed to load telemetry for ${device.deviceCode}`,
              err,
            );

            return {
              device,
              readings: [],
              telemetryAt: null,
            };
          }
        }),
      );

      setSummaries(results);
    } catch (err) {
      console.error("Dashboard loading failed:", err);
      setError("Unable to load your devices. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    void loadDashboard();

    const interval = window.setInterval(() => {
      void loadDashboard(true);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [loadDashboard]);

  // ==========================================================
  // DEVICE COUNTS
  // ==========================================================

  const onlineCount = devices.filter((device) =>
    isOnline(device.lastSeenAt),
  ).length;

  const offlineCount = devices.length - onlineCount;

  const reportedReadings = summaries.reduce(
    (total, summary) =>
      total +
      summary.readings.filter((reading) => reading.value !== "--").length,
    0,
  );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pb-32 pt-7 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-[#e7e7e1]" />
          <div className="mt-3 h-4 w-64 animate-pulse rounded-lg bg-[#e7e7e1]" />

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-[28px] bg-white"
              />
            ))}
          </div>

          <div className="mt-7 space-y-4">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-44 animate-pulse rounded-[30px] bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // MAIN DASHBOARD
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#f6f6f2] px-4 pb-32 pt-7 text-[#202020] sm:px-6">
      <div className="mx-auto w-full max-w-5xl">

        {/* ==========================================================
            HEADER
        ========================================================== */}

        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium tracking-[0.16em] text-[#999991]">
              SMART AGRICULTURE
            </p>

            <h1 className="mt-1 text-[29px] font-semibold tracking-[-0.06em]">
              Good growing.
            </h1>

            <p className="mt-1 text-xs text-[#999991]">
              Your greenhouse at a glance
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard"
            className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_3px_12px_rgba(0,0,0,0.03)] transition active:scale-95"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </header>

        {/* ==========================================================
            ERROR MESSAGE
        ========================================================== */}

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-[20px] bg-[#fff0f0] px-4 py-3 text-xs text-red-600">
            <CircleAlert size={17} />
            {error}
          </div>
        )}

        {/* ==========================================================
            OVERVIEW CARDS
        ========================================================== */}

        <section className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <OverviewCard
            label="My devices"
            value={devices.length}
            icon={<Sprout size={19} />}
          />

          <OverviewCard
            label="Online"
            value={onlineCount}
            icon={<Wifi size={19} />}
          />

          <div className="col-span-2 sm:col-span-1">
            <OverviewCard
              label="Offline"
              value={offlineCount}
              icon={<WifiOff size={19} />}
            />
          </div>
        </section>

        {/* ==========================================================
            SENSOR SUMMARY
        ========================================================== */}

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-[21px] font-semibold tracking-[-0.045em]">
              Environment
            </h2>

            <p className="mt-1 text-[11px] text-[#999991]">
              Latest reported sensor values
            </p>
          </div>

          {reportedReadings === 0 ? (
            <div className="rounded-[28px] bg-white px-5 py-7 shadow-[0_5px_25px_rgba(0,0,0,0.025)]">
              <Activity size={23} className="text-[#9b9d91]" />

              <p className="mt-3 text-sm font-semibold">
                No sensor readings available
              </p>

              <p className="mt-1 text-xs leading-5 text-[#999991]">
                When your devices report telemetry, the available readings
                will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {summaries.flatMap((summary) =>
                summary.readings
                  .filter((reading) => reading.value !== "--")
                  .map((reading) => {
                    const Icon = sensorIcon(reading.label);

                    return (
                      <button
                        key={`${summary.device.id}-${reading.key}`}
                        type="button"
                        onClick={() =>
                          router.push(`/home/monitor/${summary.device.id}`)
                        }
                        className="min-w-0 rounded-[27px] bg-white p-4 text-left shadow-[0_5px_25px_rgba(0,0,0,0.025)] transition active:scale-[0.98]"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#e5ffad]">
                          <Icon size={19} className="text-[#242b18]" />
                        </div>

                        <p className="mt-4 truncate text-[11px] text-[#999991]">
                          {reading.label}
                        </p>

                        <p className="mt-1 break-words text-[24px] font-semibold tracking-[-0.05em]">
                          {reading.value}
                          {reading.unit ? (
                            <span className="ml-1 text-xs font-medium tracking-normal text-[#777970]">
                              {reading.unit}
                            </span>
                          ) : null}
                        </p>

                        <p className="mt-2 truncate text-[10px] text-[#999991]">
                          {summary.device.name ||
                            summary.device.deviceModel.name}
                        </p>
                      </button>
                    );
                  }),
              )}
            </div>
          )}
        </section>

        {/* ==========================================================
            MY DEVICES
        ========================================================== */}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[21px] font-semibold tracking-[-0.045em]">
                My devices
              </h2>

              <p className="mt-1 text-[11px] text-[#999991]">
                Everything connected to your account
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/home/monitor")}
              className="pb-1 text-[11px] font-semibold text-[#647d45]"
            >
              View all
            </button>
          </div>

          {devices.length === 0 ? (
            <div className="rounded-[30px] bg-white px-6 py-12 text-center shadow-[0_5px_25px_rgba(0,0,0,0.025)]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e5ffad]">
                <Wifi size={25} />
              </div>

              <h3 className="mt-4 text-lg font-semibold">
                No devices yet
              </h3>

              <p className="mx-auto mt-2 max-w-[250px] text-xs leading-5 text-[#999991]">
                Add your first device to start monitoring your growing
                environment.
              </p>

              <button
                type="button"
                onClick={() => router.push("/home/add")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#e5ffad] px-5 py-3 text-xs font-semibold text-[#202020]"
              >
                <Plus size={15} />
                Add device
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const online = isOnline(device.lastSeenAt);

                return (
                  <button
                    key={device.id}
                    type="button"
                    onClick={() =>
                      router.push(`/home/monitor/${device.id}`)
                    }
                    className="flex w-full items-center rounded-[30px] bg-white p-3.5 text-left shadow-[0_5px_25px_rgba(0,0,0,0.025)] transition active:scale-[0.985]"
                  >
                    {/* DEVICE IMAGE */}

                    <div className="flex h-[82px] w-[82px] shrink-0 items-center justify-center overflow-hidden rounded-[23px] bg-[#e5ffad]">
                      {device.deviceModel.imageUrl ? (
                        <img
                          src={device.deviceModel.imageUrl}
                          alt={device.deviceModel.name}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <Wifi size={25} className="text-[#7e9563]" />
                      )}
                    </div>

                    {/* DEVICE DETAILS */}

                    <div className="min-w-0 flex-1 px-4">
                      <h3 className="truncate text-[16px] font-semibold tracking-[-0.04em]">
                        {device.name || device.deviceModel.name}
                      </h3>

                      <p className="mt-1 truncate text-[10px] text-[#999991]">
                        {device.deviceCode}
                      </p>

                      <div className="mt-4 flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${online ? "bg-[#a6d94e]" : "bg-[#9ca3af]"
                            }`}
                        />

                        <span className="text-[10px] font-medium text-[#647d45]">
                          {online ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>

                    {/* NAVIGATION */}

                    <ChevronRight
                      size={18}
                      className="mr-1 shrink-0 text-[#c3c3bd]"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {/* ==========================================================
              ADD DEVICE BUTTON
          ========================================================== */}

          {devices.length > 0 && (
            <button
              type="button"
              onClick={() => router.push("/home/add")}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-[#deded8] py-4 text-xs font-semibold text-[#696963] transition hover:bg-white active:scale-[0.99]"
            >
              <Plus size={16} />
              Add another device
            </button>
          )}
        </section>

        {/* ==========================================================
            FOOTER
        ========================================================== */}

        <p className="mt-7 text-center text-[10px] text-[#aaa9a2]">
          Refreshes every 30 seconds while this page is open
        </p>
      </div>
    </main>
  );
}

// ==========================================================
// OVERVIEW CARD COMPONENT
// ==========================================================

function OverviewCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[27px] bg-white p-4 shadow-[0_5px_25px_rgba(0,0,0,0.025)] sm:p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#e5ffad] text-[#242b18]">
        {icon}
      </div>

      <p className="mt-4 text-[11px] text-[#999991]">{label}</p>

      <p className="mt-1 text-[27px] font-semibold tracking-[-0.055em]">
        {value}
      </p>
    </div>
  );
}
