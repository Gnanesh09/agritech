"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  ChevronDown,
  Thermometer,
  Droplets,
  Wifi,
  SlidersHorizontal,
  Plus,
} from "lucide-react";

import api from "../lib/axios";

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

  latest?: {
    temperature: number | null;
    humidity: number | null;
    recordedAt: string;
  } | null;
};

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
};

const products: Product[] = [
  {
    id: 1,
    name: "Humide",
    price: 2499,
    image: "/products/humide.png",
  },
  {
    id: 2,
    name: "Soil Pro",
    price: 3999,
    image: "/products/soil-pro.png",
  },
  {
    id: 3,
    name: "Weather Mini",
    price: 2999,
    image: "/products/weather-mini.png",
  },
  {
    id: 4,
    name: "Farm Hub",
    price: 5499,
    image: "/products/farm-hub.png",
  },
  {
    id: 5,
    name: "Leaf Sense",
    price: 3299,
    image: "/products/leaf-sense.png",
  },
  {
    id: 6,
    name: "Climate Pro",
    price: 6999,
    image: "/products/climate-pro.png",
  },
];

export default function HomePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [showDevices, setShowDevices] = useState(false);

  const selectedDevice =
    devices.find((device) => device.id === selectedDeviceId) || devices[0];

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    try {
      setLoading(true);

      const response = await api.get("/user/devices");

      const userDevices = response.data.devices || [];

      const devicesWithTelemetry = await Promise.all(
        userDevices.map(async (device: Device) => {
          try {
            const telemetryResponse = await api.get(
              `/user/devices/${device.id}/telemetry`,
            );

            const telemetry = telemetryResponse.data.telemetry || [];

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

      const savedDevice = localStorage.getItem("selectedDeviceId");

      if (
        savedDevice &&
        devicesWithTelemetry.some((device) => device.id === savedDevice)
      ) {
        setSelectedDeviceId(savedDevice);
      } else if (devicesWithTelemetry.length > 0) {
        setSelectedDeviceId(devicesWithTelemetry[0].id);

        localStorage.setItem("selectedDeviceId", devicesWithTelemetry[0].id);
      }
    } catch (error) {
      console.error("Failed to load devices:", error);
    } finally {
      setLoading(false);
    }
  }

  function selectDevice(id: string) {
    setSelectedDeviceId(id);

    localStorage.setItem("selectedDeviceId", id);

    setShowDevices(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f6f6f2] px-4 pt-6">
        <div className="mx-auto max-w-md">
          <div className="h-16 animate-pulse rounded-3xl bg-white" />

          <div className="mt-5 h-[390px] animate-pulse rounded-[30px] bg-white" />

          <div className="mt-5 h-32 animate-pulse rounded-[28px] bg-white" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f6f2] px-4 pb-28 pt-5">
      <div className="mx-auto max-w-md">
        {/* =====================================================
                    HEADER
                ===================================================== */}

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}

            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-brand text-lg font-semibold text-[#202020]">
              G
            </div>

            <div>
              <p className="text-[11px] font-medium text-[#8b8b85]">
                Good Morning,
              </p>

              <h1 className="mt-0.5 text-[19px] font-semibold tracking-[-0.04em] text-[#202020]">
                Gnanesh 👋
              </h1>
            </div>
          </div>

          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_3px_15px_rgba(0,0,0,0.04)]">
            <Bell size={18} strokeWidth={1.8} />
          </button>
        </header>

        {/* =====================================================
                    PRIMARY DEVICE
                ===================================================== */}

        {selectedDevice ? (
          <section className="mt-6 overflow-hidden rounded-[30px] bg-white shadow-[0_5px_25px_rgba(0,0,0,0.045)]">
            {/* Top */}

            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold tracking-wide text-[#252525]">
                    {selectedDevice.deviceModel.code}
                  </span>

                  <span className="flex items-center gap-1 text-[10px] font-medium text-[#63a52d]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#79bd35]" />
                    Online
                  </span>
                </div>

                <p className="mt-1 text-[10px] text-[#aaa9a2]">
                  {selectedDevice.deviceCode}
                </p>
              </div>

              <button
                onClick={() => setShowDevices(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f5f2]"
              >
                <SlidersHorizontal size={16} strokeWidth={1.8} />
              </button>
            </div>

            {/* =================================================
                            DEVICE HERO
                        ================================================= */}

            <div className="relative mt-2 h-[245px] overflow-hidden px-5">
              {/* Main reading */}

              <div className="absolute left-5 top-7 z-10">
                <p className="text-[54px] font-light leading-none tracking-[-0.07em] text-[#171717]">
                  {selectedDevice.latest?.temperature != null
                    ? selectedDevice.latest.temperature.toFixed(1)
                    : "--"}

                  <span className="ml-1 text-[25px] align-top font-normal">
                    °C
                  </span>
                </p>

                <p className="mt-2 text-[11px] font-medium text-[#989790]">
                  Temperature
                </p>
              </div>

              {/* DEVICE IMAGE FROM DB */}

              {selectedDevice.deviceModel.imageUrl ? (
                <img
                  src={selectedDevice.deviceModel.imageUrl}
                  alt={selectedDevice.deviceModel.name}
                  className="absolute bottom-0 right-[-10px] h-[235px] w-[62%] object-contain object-bottom drop-shadow-[0_15px_20px_rgba(0,0,0,0.12)]"
                />
              ) : (
                <div className="absolute bottom-8 right-8 flex h-36 w-36 items-center justify-center rounded-full bg-[#f4f4f1]">
                  <Wifi size={35} className="text-gray-300" />
                </div>
              )}
            </div>

            {/* =================================================
                            DEVICE NAME
                        ================================================= */}

            <div className="px-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[22px] font-semibold tracking-[-0.045em] text-[#1b1b1b]">
                    {selectedDevice.name || selectedDevice.deviceModel.name}
                  </h2>

                  <p className="mt-1 text-[10px] text-[#aaa9a2]">
                    {selectedDevice.serialNumber}
                  </p>
                </div>

                <span className="rounded-full bg-[#eef8dc] px-3 py-1.5 text-[9px] font-semibold text-[#65a632]">
                  CONNECTED
                </span>
              </div>
            </div>
          </section>
        ) : (
          /* =================================================
                       EMPTY STATE
                    ================================================= */

          <section className="mt-6 rounded-[30px] bg-white px-6 py-14 text-center shadow-[0_5px_25px_rgba(0,0,0,0.045)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#eef2e6]">
              <Wifi size={30} className="text-[#83a45d]" />
            </div>

            <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.04em]">
              No device yet
            </h2>

            <p className="mx-auto mt-2 max-w-[260px] text-[11px] leading-5 text-[#999991]">
              Connect your first device and start monitoring your farm.
            </p>

            <button
              onClick={() => setShowDevices(true)}
              className="mt-5 rounded-full bg-[#1c1c1c] px-6 py-3 text-xs font-semibold text-white"
            >
              <span className="flex items-center gap-2">
                <Plus size={14} />
                Add device
              </span>
            </button>
          </section>
        )}

        {/* =====================================================
                    ENVIRONMENT
                ===================================================== */}

        {selectedDevice && (
          <section className="mt-4 rounded-[28px] bg-white p-4 shadow-[0_5px_25px_rgba(0,0,0,0.035)]">
            {/* Header */}

            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-[#30302e]">
                Environment
              </h3>

              <span className="text-[9px] text-[#a4a39d]">
                {selectedDevice.latest
                  ? formatTime(selectedDevice.latest.recordedAt)
                  : "No data"}
              </span>
            </div>

            {/* Status */}

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#83c83c]" />

                <span className="text-[20px] font-semibold tracking-[-0.04em] text-[#669c39]">
                  Good
                </span>
              </div>

              <span className="text-[10px] text-[#999]">Live monitoring</span>
            </div>

            {/* DATA */}

            <div className="mt-4 grid grid-cols-3 gap-2">
              {/* Temperature */}

              <div className="rounded-[18px] bg-brand/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium text-[#89917b]">
                    TEMP
                  </span>

                  <Thermometer size={13} className="text-[#7e9862]" />
                </div>

                <p className="mt-5 text-[21px] font-semibold tracking-[-0.04em] text-[#48553d]">
                  {selectedDevice.latest?.temperature != null
                    ? selectedDevice.latest.temperature.toFixed(1)
                    : "--"}
                </p>

                <p className="text-[9px] text-[#8b927e]">°C</p>
              </div>

              {/* Humidity */}

              <div className="rounded-[18px] bg-[#252525] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium text-white/45">
                    HUMIDITY
                  </span>

                  <Droplets size={13} className="text-white/60" />
                </div>

                <p className="mt-5 text-[21px] font-semibold tracking-[-0.04em] text-white">
                  {selectedDevice.latest?.humidity != null
                    ? selectedDevice.latest.humidity.toFixed(1)
                    : "--"}
                </p>

                <p className="text-[9px] text-white/35">%</p>
              </div>

              {/* Connection */}

              <div className="rounded-[18px] bg-brand p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium text-[#61702f]">
                    STATUS
                  </span>

                  <Wifi size={13} className="text-[#61702f]" />
                </div>

                <p className="mt-5 text-[16px] font-semibold tracking-[-0.04em] text-black">
                  LIVE
                </p>

                <p className="text-[9px] text-[#71813b]">Connected</p>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
                    CHANGE DEVICE
                ===================================================== */}

        {selectedDevice && (
          <button
            onClick={() => setShowDevices(true)}
            className="mt-3 flex w-full items-center justify-between rounded-[22px] bg-white px-4 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3df]">
                <Wifi size={15} className="text-[#6f9347]" />
              </div>

              <div className="text-left">
                <p className="text-[11px] font-semibold">Current device</p>

                <p className="mt-0.5 text-[9px] text-[#aaa9a2]">
                  Change the device shown on Home
                </p>
              </div>
            </div>

            <ChevronRight size={17} className="text-gray-400" />
          </button>
        )}

        {/* =====================================================
                    SHOP
                ===================================================== */}

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-[#aaa9a2]">
                Explore
              </p>

              <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.04em]">
                Shop devices
              </h2>
            </div>

            <button className="flex items-center gap-1 text-[10px] font-semibold text-[#777]">
              View all
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2.5">
            {products.map((product) => (
              <div
                key={product.id}
                className="overflow-hidden rounded-[20px] bg-white shadow-[0_4px_18px_rgba(0,0,0,0.035)]"
              >
                <div className="aspect-square bg-[#eeeeea]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-contain p-2"
                  />
                </div>

                <div className="p-2.5">
                  <p className="truncate text-[10px] font-semibold">
                    {product.name}
                  </p>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] font-bold">
                      ₹{product.price.toLocaleString("en-IN")}
                    </span>

                    <button className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1c1c1c] text-white">
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* =========================================================
                DEVICE SELECTOR
            ========================================================= */}

      {showDevices && (
        <div
          onClick={() => setShowDevices(false)}
          className="fixed inset-0 z-100  flex items-end justify-center bg-black/25 px-3 pb-3 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-[30px] bg-white"
          >
            <div className="flex items-center  justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-[15px] font-semibold">My devices</h3>

                <p className="mt-0.5 text-[9px] text-gray-400">
                  Choose your Home device
                </p>
              </div>

              <button
                onClick={() => setShowDevices(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100"
              >
                <ChevronDown size={15} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-3">
              {devices.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-semibold">No linked devices</p>

                  <p className="mt-1 text-xs text-gray-400">
                    Add a device to see it here.
                  </p>
                </div>
              ) : (
                devices.map((device) => (
                  <button
                    key={device.id}
                    onClick={() => selectDevice(device.id)}
                    className={`mb-2 flex w-full items-center gap-3 rounded-2xl p-3 text-left ${
                      selectedDevice?.id === device.id
                        ? "bg-brand"
                        : "bg-[#f7f7f5]"
                    }`}
                  >
                    <div className="h-12 w-12 overflow-hidden rounded-xl bg-white">
                      {device.deviceModel.imageUrl && (
                        <img
                          src={device.deviceModel.imageUrl}
                          alt=""
                          className="h-full w-full object-contain p-1"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">
                        {device.name || device.deviceModel.name}
                      </p>

                      <p className="mt-0.5 text-[9px] text-gray-700">
                        {device.deviceCode}
                      </p>
                    </div>

                    {selectedDevice?.id === device.id && (
                      <span className="text-[9px] font-semibold text-[#68963a]">
                        Selected
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ================================================================
   TIME FORMAT
================================================================ */

function formatTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();

  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return `${Math.floor(hours / 24)}d ago`;
}
