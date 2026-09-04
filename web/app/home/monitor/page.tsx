"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Plus, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";

import api from "../../lib/axios";

// ============================================================
// TYPES
// ============================================================

type DeviceCapability = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
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

// ============================================================
// PAGE
// ============================================================

export default function MonitorPage() {
  const router = useRouter();

  const [devices, setDevices] = useState<Device[]>([]);

  const [loading, setLoading] = useState(true);

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
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-6">
        <div className="mx-auto max-w-md">
          <div className="h-7 w-32 animate-pulse rounded-lg bg-[#e7e7e1]" />

          <div className="mt-2 h-4 w-56 animate-pulse rounded-lg bg-[#e7e7e1]" />

          <div className="mt-7 space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-[112px] animate-pulse rounded-[27px] bg-white"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-6">
      <div className="mx-auto max-w-md">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-[29px] font-semibold tracking-[-0.06em] text-[#202020]">
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

        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="mt-5 rounded-[18px] bg-[#fff0f0] px-4 py-3 text-[11px] text-red-600">
            {error}
          </div>
        )}

        {/* =====================================================
            DEVICE LIST
        ===================================================== */}

        <section className="mt-6 space-y-3">
          {devices.length === 0 ? (
            <div className="rounded-[30px] bg-white px-6 py-14 text-center shadow-[0_5px_25px_rgba(0,0,0,0.035)]">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand/30">
                <Wifi size={28} className="text-black" />
              </div>

              <h2 className="mt-5 text-[20px] font-semibold tracking-[-0.04em]">
                No devices yet
              </h2>

              <p className="mx-auto mt-2 max-w-[250px] text-[10px] leading-5 text-[#999991]">
                Add your first device and start monitoring its data.
              </p>

              {/* <button
                type="button"
                onClick={() => router.push("/home/devices/add")}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1c1c1c] px-5 py-3 text-[11px] font-semibold text-white"
              >
                <Plus size={14} />
                Add device
              </button> */}
            </div>
          ) : (
            devices.map((device) => (
              <button
                type="button"
                key={device.id}
                onClick={() => router.push(`/home/monitor/${device.id}`)}
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
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isRecentlySeen(device.lastSeenAt)
                          ? "bg-[#93fc32]"
                          : "bg-gray-400"
                      }`}
                    />

                    <span className="text-[9px] font-semibold capitalize text-[#67943e]">
                      {isRecentlySeen(device.lastSeenAt) ? "online" : "offline"}
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

        {/* =====================================================
            ADD DEVICE
        ===================================================== */}

        {devices.length > 0 && (
          <button
            type="button"
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
// HELPERS
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
