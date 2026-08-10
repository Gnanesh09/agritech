"use client";

import { useEffect, useState } from "react";
import api from "../lib/axios";
import {
  Thermometer,
  Droplets,
  Wifi,
  Plus,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: string;
  linkedAt: string | null;

  deviceModel: {
    id: string;
    name: string;
    code: string;
  };
};

type Telemetry = {
  id: string;
  temperature: number | null;
  humidity: number | null;
  recordedAt: string;
};

type DeviceData = Device & {
  latest: Telemetry | null;
};

export default function HomePage() {
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deviceCode, setDeviceCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [devices, setDevices] = useState<DeviceData[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  async function claimDevice() {
    if (!deviceCode.trim()) {
      setClaimError("Enter your device code");
      return;
    }

    try {
      setClaiming(true);
      setClaimError("");

      await api.post("/user/devices/claim", {
        deviceCode: deviceCode.trim(),
      });

      setDeviceCode("");
      setShowAddDevice(false);

      // Reload devices + telemetry
      await loadDevices();
    } catch (error: any) {
      console.error("Failed to claim device:", error);

      setClaimError(error?.response?.data?.message || "Failed to link device");
    } finally {
      setClaiming(false);
    }
  }
  async function loadDevices() {
    try {
      setLoading(true);
      setError(null);

      // ---------------------------------------------
      // Get devices belonging to logged-in user
      // ---------------------------------------------

      const devicesResponse = await api.get("/user/devices");

      const userDevices: Device[] = devicesResponse.data.devices;

      // ---------------------------------------------
      // Get latest telemetry for every device
      // ---------------------------------------------

      const devicesWithTelemetry = await Promise.all(
        userDevices.map(async (device) => {
          try {
            const response = await api.get(
              `/user/devices/${device.id}/telemetry`,
            );

            const telemetry: Telemetry[] = response.data.telemetry;

            return {
              ...device,

              latest: telemetry.length > 0 ? telemetry[0] : null,
            };
          } catch {
            return {
              ...device,
              latest: null,
            };
          }
        }),
      );

      setDevices(devicesWithTelemetry);
    } catch (error: any) {
      console.error("Failed to load devices:", error);

      setError(error?.response?.data?.message || "Failed to load your devices");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();
  }, []);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f5f7] px-5 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200" />

          <div className="mt-8 grid gap-4">
            <div className="h-48 animate-pulse rounded-3xl bg-white" />

            <div className="h-48 animate-pulse rounded-3xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (error) {
    return (
      <main className="min-h-screen bg-[#f5f5f7] px-5 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>

          <p className="mt-2 text-gray-500">{error}</p>

          <button
            onClick={loadDevices}
            className="mt-6 flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-medium text-white"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </main>
    );
  }

  // =====================================================
  // HOME
  // =====================================================

  return (
    <main className="min-h-screen bg-[#f5f5f7] px-5 pb-28 pt-8">
      <div className="mx-auto max-w-4xl">
        {/* HEADER */}

        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">Your dashboard</p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
              My Devices
            </h1>
          </div>

          <button
            onClick={loadDevices}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <RefreshCw size={18} className="text-gray-600" />
          </button>
        </div>

        {/* =================================================
                    NO DEVICES
                ================================================= */}

        {devices.length === 0 ? (
          <div className="mt-8 rounded-[28px] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Wifi size={28} className="text-gray-500" />
            </div>

            <h2 className="mt-5 text-xl font-semibold">No devices linked</h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
              Link your Humdie device to start monitoring temperature and
              humidity.
            </p>

            <button
              onClick={() => {
                setClaimError("");
                setShowAddDevice(true);
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-black px-6 py-3 text-sm font-medium text-white"
            >
              <Plus size={17} />
              Add Device
            </button>
          </div>
        ) : (
          <>
            {/* DEVICE COUNT */}

            <div className="mt-7 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">
                {devices.length} {devices.length === 1 ? "device" : "devices"}
              </p>

              <button
                onClick={loadDevices}
                className="text-sm font-medium text-blue-600"
              >
                Refresh
              </button>
            </div>

            {/* DEVICE CARDS */}

            <div className="mt-3 grid gap-4">
              {devices.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}
            </div>
          </>
        )}
      </div>
      {showAddDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Add Device
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the device code printed on your Humdie device.
                </p>
              </div>

              <button
                onClick={() => setShowAddDevice(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                ✕
              </button>
            </div>

            <div className="mt-6">
              <label className="text-sm font-medium text-gray-700">
                Device Code
              </label>

              <input
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="e.g. HUMIDE-000001"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </div>

            {claimError && (
              <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {claimError}
              </div>
            )}

            <button
              onClick={claimDevice}
              disabled={claiming}
              className="mt-5 w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {claiming ? "Linking..." : "Link Device"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================
// DEVICE CARD
// ============================================================

function DeviceCard({ device }: { device: DeviceData }) {
  const isLinked = device.status === "LINKED";

  const temperature = device.latest?.temperature;

  const humidity = device.latest?.humidity;

  return (
    <div className="rounded-[28px] bg-white p-5 shadow-sm">
      {/* TOP */}

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {device.deviceCode}
            </h2>

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isLinked ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          </div>

          <p className="mt-1 text-sm text-gray-500">
            {device.deviceModel.name}
          </p>
        </div>

        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          {isLinked ? "Connected" : device.status}
        </span>
      </div>

      {/* SENSOR VALUES */}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-[#f7f7f8] p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Thermometer size={17} />

            <span className="text-xs font-medium">Temperature</span>
          </div>

          <p className="mt-2 text-2xl font-semibold">
            {temperature !== null && temperature !== undefined
              ? `${temperature.toFixed(1)}°C`
              : "--"}
          </p>
        </div>

        <div className="rounded-2xl bg-[#f7f7f8] p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Droplets size={17} />

            <span className="text-xs font-medium">Humidity</span>
          </div>

          <p className="mt-2 text-2xl font-semibold">
            {humidity !== null && humidity !== undefined
              ? `${humidity.toFixed(1)}%`
              : "--"}
          </p>
        </div>
      </div>

      {/* FOOTER */}

      <div className="mt-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Last reading</span>

          <span>
            {device.latest ? formatTime(device.latest.recordedAt) : "No data"}
          </span>
        </div>

        <button className="flex items-center gap-1 text-sm font-medium text-blue-600">
          View
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// TIME FORMAT
// ============================================================

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
