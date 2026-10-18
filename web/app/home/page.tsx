"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "../../context/ThemeContext";
import {
  Bell, Leaf, Sun, Moon, MapPin, ChevronDown, ChevronRight, Camera, Maximize2,
  Wifi, Cloud, Thermometer, Droplets, Sprout, Box, Lightbulb,
  Wind, Clock, ArrowUpRight, Activity, Plus, Search,
  CircleCheck, Circle, Settings2, RefreshCw, AlertCircle,
  CalendarDays, MoreHorizontal, Zap, Gauge, Waves,
  AlertTriangle, CheckCircle2, Beaker
} from "lucide-react";
import api from "../lib/axios";
import { motion } from "framer-motion";

type Sensor = {
  key: string;
  label?: string;
  type: "number" | "boolean" | "string";
  unit?: string;
};

type Device = {
  id: string;
  deviceCode: string;
  name: string | null;
  status: string;
  lastSeenAt: string | null;
  deviceModel: {
    name: string;
    capabilities: {
      sensors: Sensor[];
    };
  };
  latest?: {
    data: Record<string, unknown>;
    recordedAt: string;
  } | null;
};

type DeviceSubTab = "all" | "sensor" | "camera";
type TaskFilterTab = "all" | "pending" | "completed";

const crops = [
  {
    name: "Pea shoots",
    tray: "T1",
    harvest: "11 Oct 2026",
    progress: 68,
    image: "/images/pea-shoots1.png",
    description: "Microgreens",
  },
  {
    name: "Sunflower",
    tray: "T2",
    harvest: "9 Oct 2026",
    progress: 75,
    image: "/images/sunflower.png",
    description: "Microgreens",
  },
  {
    name: "Broccoli",
    tray: "T3",
    harvest: "9 Oct 2026",
    progress: 55,
    image: "/images/broccoli.png",
    description: "Microgreens",
  },
];

const initialTasks = [
  {
    id: "task-1",
    title: "Watering",
    desc: "Water plants with 1 inch of water in the morning",
    time: "07:00 AM - 07:30 AM",
    done: true,
  },
  {
    id: "task-2",
    title: "Fertilizing",
    desc: "Apply organic fertilizer at base of plants. Quantity: 50g per plant",
    time: "07:30 AM - 10:00 AM",
    done: true,
  },
  {
    id: "task-3",
    title: "Pest Inspection",
    desc: "Check leaves for any signs of aphids or other pests",
    time: "10:00 AM - 11:00 AM",
    done: false,
  },
  {
    id: "task-4",
    title: "Soil Aeration",
    desc: "Loosen soil around the plants carefully without damaging roots",
    time: "11:00 AM - 12:00 PM",
    done: false,
  },
];

const defaultHardwareList = [
  { name: "JLNew H10: Soil Moisture Sensor", id: "#SM201", type: "Sensor", category: "sensor", status: "good" },
  { name: "HC T200 Wind Sensor", id: "#WS004", type: "Sensor", category: "sensor", status: "good" },
  {
    name: "ACE Temperature & Humidity Sensor",
    id: "#TH011",
    type: "Sensor",
    category: "sensor",
    status: "warning",
    alert: "Signal issue since 08:02 AM",
  },
  { name: "VG550 Camera", id: "#CM042", type: "Camera", category: "camera", status: "good" },
  { name: "Sanity PH Meter", id: "#PM225", type: "Sensor", category: "sensor", status: "good" },
  { name: "VG550 Camera", id: "#CM043", type: "Camera", category: "camera", status: "good" },
];

export default function HomePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);

  // In-card Filter States & Dropdowns
  const [deviceSubTab, setDeviceSubTab] = useState<DeviceSubTab>("all");
  const [taskFilter, setTaskFilter] = useState<TaskFilterTab>("all");
  const [gardenOpen, setGardenOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<"PL-02J" | "PL-70T">("PL-02J");

  // Rack & Hardware Controls
  const [autoMode, setAutoMode] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState(1);
  const [selectedTray, setSelectedTray] = useState("T1");
  const [pumpOn, setPumpOn] = useState(false);
  const [fanOn, setFanOn] = useState(false);
  const [lightOn, setLightOn] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);

  // Camera
  const cameraPanelRef = useRef<HTMLDivElement | null>(null);
  const [cameraIndex, setCameraIndex] = useState(0);
  const cameraSources = (
    process.env.NEXT_PUBLIC_GREENHOUSE_CAMERA_URLS ||
    process.env.NEXT_PUBLIC_GREENHOUSE_CAMERA_URL ||
    "/images/greenhouse-camera.jpg"
  )
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const currentCamera =
    cameraSources[cameraIndex % Math.max(cameraSources.length, 1)];

  useEffect(() => {
    setDark(localStorage.getItem("agrigrow-theme") === "dark");

    async function loadDevices() {
      try {
        const response = await api.get("/user/devices");
        const list: Device[] = response.data.devices ?? [];

        const enriched = await Promise.all(
          list.map(async (device) => {
            try {
              const result = await api.get(
                `/user/devices/${device.id}/telemetry`
              );
              return {
                ...device,
                latest: result.data.telemetry?.[0] ?? null,
              };
            } catch {
              return { ...device, latest: null };
            }
          })
        );

        setDevices(enriched);

        const saved = localStorage.getItem("selectedDeviceId");
        const id = enriched.some((d) => d.id === saved)
          ? saved!
          : enriched[0]?.id ?? null;

        setSelectedId(id);
        if (id) localStorage.setItem("selectedDeviceId", id);
      } catch (error) {
        console.error("Failed to load devices", error);
      } finally {
        setLoading(false);
      }
    }

    loadDevices();
  }, []);

  const device = devices.find((d) => d.id === selectedId) ?? devices[0];
  const sensors = device?.deviceModel.capabilities?.sensors ?? [];
  const readings = device?.latest?.data ?? {};

  const online =
    !!device?.lastSeenAt &&
    Date.now() - new Date(device.lastSeenAt).getTime() < 120000;

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("agrigrow-theme", next ? "dark" : "light");
  }

  function getReading(key: string, fallback: string) {
    const sensor = sensors.find((s) => s.key === key);
    const raw = readings[key];

    if (!sensor || raw === null || raw === undefined) return fallback;

    if (sensor.type === "number") {
      const number = Number(raw);
      return Number.isFinite(number)
        ? Number.isInteger(number)
          ? String(number)
          : number.toFixed(1)
        : fallback;
    }
    return String(raw);
  }

  function getUnit(key: string, fallback: string) {
    return sensors.find((s) => s.key === key)?.unit ?? fallback;
  }

  function selectDevice(id: string) {
    setSelectedId(id);
    localStorage.setItem("selectedDeviceId", id);
    setGardenOpen(false);
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  const combinedHardware = [
    ...devices.map((d) => {
      const isDevOnline =
        !!d.lastSeenAt &&
        Date.now() - new Date(d.lastSeenAt).getTime() < 120000;
      return {
        name: d.name || d.deviceModel.name,
        id: `#${d.deviceCode}`,
        type: "Sensor",
        category: "sensor",
        status: isDevOnline ? "good" : "warning",
        alert: isDevOnline ? undefined : "Device offline",
      };
    }),
    ...defaultHardwareList,
  ];

  const sensorCount = combinedHardware.filter(
    (item) => item.category === "sensor"
  ).length;
  const cameraCount = combinedHardware.filter(
    (item) => item.category === "camera"
  ).length;

  const filteredHardware = combinedHardware.filter((item) => {
    if (deviceSubTab === "all") return true;
    return item.category === deviceSubTab;
  });

  const completedTasksCount = tasks.filter((t) => t.done).length;
  const taskProgressPercent = tasks.length
    ? Math.round((completedTasksCount / tasks.length) * 100)
    : 0;

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === "pending") return !t.done;
    if (taskFilter === "completed") return t.done;
    return true;
  });

  // Theme styling classes
  const outerBg = dark ? "bg-[#0b110d] text-[#f1f5f2]" : "bg-[#dce0d9] text-[#1a1d1a]";
  const shellBg = dark ? "bg-[#121c16] border-[#1f3327]" : "bg-[#f3f5f2] border-white/60";
  const cardBg = dark
    ? "bg-[#18261e] border border-[#243b2e] text-[#f1f5f2]"
    : "bg-white border border-[#eaeeea] text-[#1a1d1a] shadow-[0_4px_20px_rgba(20,30,20,0.03)]";
  const subCardBg = dark ? "bg-[#121e17] border border-[#22382b]" : "bg-[#f8faf7] border border-[#edf1ec]";
  const mutedText = dark ? "text-[#8fa696]" : "text-[#7c857e]";

  if (loading) {
    return (
      <main className={`${outerBg} min-h-screen p-3 sm:p-5 lg:p-6`}>
        <div className={`mx-auto max-w-[1600px] rounded-[28px] p-4 sm:p-6 ${shellBg} animate-pulse`}>
          <div className="h-12 w-full rounded-2xl bg-black/5 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-5">
            <div className="h-80 rounded-3xl bg-black/5 md:col-span-2 xl:col-span-6" />
            <div className="h-80 rounded-3xl bg-black/5 xl:col-span-3" />
            <div className="h-80 rounded-3xl bg-black/5 xl:col-span-3" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`${outerBg} min-h-screen p-2 sm:p-4 lg:p-6 transition-colors duration-300 font-sans`}>
      <div className={`mx-auto max-w-[1600px] rounded-[24px] sm:rounded-[32px] border ${shellBg} p-3.5 sm:p-6 lg:p-8 shadow-xl flex flex-col gap-5 sm:gap-6`}>

        {/* TOP HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-[#29d665] text-white shadow-md shadow-[#29d665]/25 shrink-0">
              <Leaf size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl lg:text-[26px] font-semibold tracking-tight leading-tight">
                Greenhouse Monitoring
              </h1>
              <p className={`text-[11px] sm:text-xs ${mutedText}`}>
                Spinach Garden 08 · {online ? "Online" : "Demo mode"}
              </p>
            </div>
          </div>

          {/* Right Controls: Alerts, Sector Dropdown, Add Rack, Theme Toggle */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Alert Pill */}
            <div className="relative">
              <button
                onClick={() => setAlertsOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full bg-[#262926] text-white px-3 sm:px-3.5 py-2 text-xs font-medium shadow-sm transition hover:bg-black"
              >
                <Bell size={14} />
                <span>3 Alert</span>
                <ArrowUpRight size={14} className="opacity-75" />
              </button>

              {alertsOpen && (
                <div className={`absolute right-0 mt-2 w-72 rounded-2xl p-3 z-40 shadow-xl ${cardBg}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold">Active Alerts (3)</span>
                    <button onClick={() => setAlertsOpen(false)} className={`text-[11px] ${mutedText}`}>
                      Close
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>ACE Temp Sensor: Signal issue since 08:02 AM</span>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
                      <Droplets size={14} className="shrink-0 mt-0.5" />
                      <span>Humidity at {getReading("humidity", "82")}% — ensure airflow</span>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                      <Beaker size={14} className="shrink-0 mt-0.5" />
                      <span>pH Level at 7.6 — add acidic compost</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sector / Device Dropdown */}
            <div className="relative">
              <button
                onClick={() => setGardenOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-3.5 py-2 text-xs font-medium transition ${cardBg}`}
              >
                <span className={`hidden sm:inline ${mutedText}`}>Sector:</span>
                <span className="font-semibold truncate max-w-[120px] sm:max-w-[160px]">
                  Spinach Garden 08
                </span>
                <ChevronDown
                  size={15}
                  className={`transition-transform ${gardenOpen ? "rotate-180" : ""}`}
                />
              </button>

              {gardenOpen && (
                <div className={`absolute right-0 mt-2 w-60 rounded-2xl p-2 z-40 shadow-xl ${cardBg}`}>
                  <p className={`px-2.5 py-1 text-[10px] font-semibold uppercase ${mutedText}`}>
                    Select Growing Sector
                  </p>
                  {devices.length > 0 ? (
                    devices.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => selectDevice(d.id)}
                        className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${d.id === device?.id
                          ? "bg-[#29d665]/15 text-[#188c40] dark:text-[#29d665] font-semibold"
                          : "hover:bg-black/5 dark:hover:bg-white/5"
                          }`}
                      >
                        <span className="truncate">Spinach Garden 08 ({d.name || d.deviceModel.name})</span>
                        <span className="text-[10px] opacity-70">{d.deviceCode}</span>
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={() => setGardenOpen(false)}
                      className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold bg-[#29d665]/15 text-[#188c40] dark:text-[#29d665]"
                    >
                      Spinach Garden 08
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Add Rack Link */}
            <Link
              href="/home/add/rack"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#29d665] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#22bd58]"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Add rack</span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className={`flex h-9 w-9 items-center justify-center rounded-full transition ${cardBg}`}
            >
              {dark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        {/* =============================================================== */}
        {/* MAIN 3-COLUMN BENTO GRID                                        */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">

          {/* LEFT COLUMN: WEATHER/MAP CARD + 6 SENSOR CARDS (6 Cols on XL) */}
          <div className="md:col-span-2 xl:col-span-6 flex flex-col gap-4 sm:gap-5">

            {/* WEATHER & SECTOR MAP CARD */}
            <div className={`relative overflow-hidden rounded-[24px] sm:rounded-[26px] p-4 sm:p-6 min-h-[260px] sm:min-h-[295px] flex flex-col justify-between ${cardBg}`}>
              {/* Background Map Vector Shapes & Streets */}
              <svg
                viewBox="0 0 600 320"
                className="pointer-events-none absolute inset-0 h-full w-full"
                preserveAspectRatio="xMidYMid slice"
              >
                {/* Subtle Map Polygons */}
                <path
                  d="M270 0 L370 0 L345 110 L250 90 Z"
                  className={dark ? "fill-white/[0.02]" : "fill-black/[0.025]"}
                />
                <path
                  d="M385 0 L520 0 L490 125 L360 110 Z"
                  className={dark ? "fill-white/[0.025]" : "fill-black/[0.03]"}
                />
                <path
                  d="M240 110 L345 125 L320 260 L205 240 Z"
                  className={dark ? "fill-white/[0.03]" : "fill-black/[0.035]"}
                />
                {/* Map Grid Lines */}
                <path
                  d="M240 0 L290 95 L430 70 L530 150 L600 130"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  className="text-gray-300/60 dark:text-emerald-700/25"
                />
                <path
                  d="M190 320 L290 95 L350 240 L490 220 L580 320"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  className="text-gray-300/60 dark:text-emerald-700/25"
                />
              </svg>

              {/* Top Row: Location & Date/Time */}
              <div className="relative z-10 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium ${mutedText}`}>
                    <MapPin size={15} />
                    <span>Karnataka, Bengaluru</span>
                  </div>
                  <div className="mt-2 text-4xl sm:text-5xl font-semibold tracking-tight">
                    {getReading("temperature", "24")}
                    {getUnit("temperature", "°C")}
                  </div>
                </div>

                <div className={`flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 text-right text-xs sm:text-sm ${mutedText}`}>
                  <span>Tue, 10 September 2024</span>
                  <span className="font-medium">09:37 AM</span>
                </div>
              </div>

              {/* Middle Weather Condition */}
              <div className="relative z-10 my-2.5">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20 text-amber-500 mb-1">
                  <Sun size={18} fill="currentColor" />
                </div>
                <p className="text-sm font-semibold">Sunny</p>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  H:46°C &nbsp; L:52°C
                </p>
              </div>

              {/* Bottom Row: Spinach Garden 08 Box + Connecting Line + Plot Blocks */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mt-3">

                {/* Info Box: Always titled "Spinach Garden 08" */}
                <div
                  className={`relative z-20 rounded-2xl p-3.5 sm:p-4 min-w-[195px] sm:w-[215px] backdrop-blur-md shadow-sm ${subCardBg}`}
                >
                  <p className="text-sm font-semibold">Spinach Garden 08</p>
                  <div className="mt-2.5 flex items-center justify-between pr-4 text-xs">
                    <div>
                      <p className={`text-[11px] ${mutedText}`}>ID</p>
                      <p className="font-semibold mt-0.5">{selectedPlot}</p>
                    </div>
                    <div>
                      <p className={`text-[11px] ${mutedText}`}>Area</p>
                      <p className="font-semibold mt-0.5">
                        {selectedPlot === "PL-02J" ? "200 m²" : "150 m²"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* SVG CONNECTOR LINE between Spinach Garden 08 Box and Active Plot Dot */}
                <svg
                  viewBox="0 0 600 130"
                  className="pointer-events-none hidden sm:block absolute inset-x-0 bottom-0 h-[130px] w-full z-30"
                  preserveAspectRatio="none"
                >
                  <path
                    d={
                      selectedPlot === "PL-02J"
                        ? "M 205 88 L 355 88 L 432 62"
                        : "M 205 88 L 440 88 L 542 68"
                    }
                    fill="none"
                    stroke={dark ? "#ffffff" : "#1a1d1a"}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300 opacity-85"
                  />
                  {/* Origin Anchor Dot on Spinach Garden 08 Card Edge */}
                  <circle
                    cx="205"
                    cy="88"
                    r="3"
                    fill={dark ? "#29d665" : "#1a1d1a"}
                  />
                </svg>

                {/* Mobile Connector Line (Visible on small screens) */}
                <svg
                  viewBox="0 0 300 40"
                  className="pointer-events-none sm:hidden h-7 w-full -my-2 z-20"
                  preserveAspectRatio="none"
                >
                  <path
                    d={
                      selectedPlot === "PL-02J"
                        ? "M 90 2 L 185 38"
                        : "M 90 2 L 255 38"
                    }
                    fill="none"
                    stroke={dark ? "#ffffff" : "#1a1d1a"}
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                </svg>

                {/* Plot Blocks Visual (PL-02J & PL-70T) */}
                <div className="relative z-20 flex items-end gap-3 self-end sm:self-auto pr-1">
                  {/* Plot 1: PL-02J */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlot("PL-02J")}
                    className={`relative h-24 w-20 sm:h-28 sm:w-24 -rotate-[8deg] rounded-2xl p-2.5 flex flex-col items-center justify-center transition-all duration-300 ${selectedPlot === "PL-02J"
                      ? "bg-[#262926] text-white shadow-xl scale-105"
                      : "bg-[#e3e6e2] text-[#262926] dark:bg-[#25362c] dark:text-white opacity-80 hover:opacity-100"
                      }`}
                  >
                    <span className="text-[10px] font-semibold tracking-wider opacity-90">
                      PL-02J
                    </span>
                    <span
                      className={`mt-2 h-2.5 w-2.5 rounded-full transition-all ${selectedPlot === "PL-02J"
                        ? "bg-white ring-4 ring-white/25"
                        : "bg-current opacity-60"
                        }`}
                    />
                  </button>

                  {/* Plot 2: PL-70T */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlot("PL-70T")}
                    className={`relative h-20 w-16 sm:h-24 sm:w-20 -rotate-[8deg] rounded-2xl p-2.5 flex flex-col items-center justify-center transition-all duration-300 ${selectedPlot === "PL-70T"
                      ? "bg-[#262926] text-white shadow-xl scale-105"
                      : "bg-[#e3e6e2] text-[#262926] dark:bg-[#25362c] dark:text-white opacity-80 hover:opacity-100"
                      }`}
                  >
                    <span className="text-[10px] font-semibold tracking-wider opacity-85">
                      PL-70T
                    </span>
                    <span
                      className={`mt-2 h-2.5 w-2.5 rounded-full transition-all ${selectedPlot === "PL-70T"
                        ? "bg-white ring-4 ring-white/25"
                        : "bg-current opacity-60"
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* 6 SENSOR METRIC CARDS (Responsive 2 cols on mobile, 3 cols on sm+) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 flex-1">
              {/* 1. Plant Health */}
              <motion.div
                whileHover={{ y: -3 }}
                className="rounded-[22px] sm:rounded-[24px] bg-[#29d665] p-4 sm:p-5 text-white shadow-md shadow-[#29d665]/15 flex flex-col justify-between min-h-[150px] sm:min-h-[165px]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Sprout size={16} />
                    <span>Plant Health</span>
                  </div>
                  <ArrowUpRight size={15} className="opacity-80" />
                </div>
                <div className="my-2 flex flex-wrap items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">94%</span>
                  <span className="rounded-full bg-white text-[#188c40] px-2 py-0.5 text-[10px] font-bold">
                    Good
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-white/90 leading-snug">
                  Your plants are thriving and showing excellent health
                </p>
              </motion.div>

              {/* 2. Wind */}
              <motion.div
                whileHover={{ y: -3 }}
                className={`rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col justify-between min-h-[150px] sm:min-h-[165px] ${cardBg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Wind size={16} className={mutedText} />
                    <span>Wind</span>
                  </div>
                  <ArrowUpRight size={15} className={mutedText} />
                </div>
                <div className="my-2 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    {getReading("wind", "2")}
                  </span>
                  <span className={`text-base sm:text-lg font-medium ${mutedText}`}>
                    {getUnit("wind", "m/s")}
                  </span>
                </div>
                <p className={`text-[10px] sm:text-[11px] leading-snug ${mutedText}`}>
                  Make sure there is still adequate airflow
                </p>
              </motion.div>

              {/* 3. Temperature */}
              <motion.div
                whileHover={{ y: -3 }}
                className={`rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col justify-between min-h-[150px] sm:min-h-[165px] ${cardBg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Thermometer size={16} className={mutedText} />
                    <span>Temperature</span>
                  </div>
                  <ArrowUpRight size={15} className={mutedText} />
                </div>
                <div className="my-2 flex items-baseline gap-0.5">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    {getReading("temperature", "19")}
                  </span>
                  <span className={`text-lg sm:text-xl font-medium ${mutedText}`}>
                    {getUnit("temperature", "°C")}
                  </span>
                </div>
                <p className={`text-[10px] sm:text-[11px] leading-snug ${mutedText}`}>
                  Maintain consistent between 15°C and 20°C
                </p>
              </motion.div>

              {/* 4. pH Level */}
              <motion.div
                whileHover={{ y: -3 }}
                className={`rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col justify-between min-h-[150px] sm:min-h-[165px] ${cardBg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Beaker size={16} className={mutedText} />
                    <span>pH Level</span>
                  </div>
                  <ArrowUpRight size={15} className={mutedText} />
                </div>
                <div className="my-2">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    {getReading("ph", "7.6")}
                  </span>
                </div>
                <p className={`text-[10px] sm:text-[11px] leading-snug ${mutedText}`}>
                  Add acidic compost to balance the pH
                </p>
              </motion.div>

              {/* 5. Humidity */}
              <motion.div
                whileHover={{ y: -3 }}
                className={`rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col justify-between min-h-[150px] sm:min-h-[165px] ${cardBg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Droplets size={16} className={mutedText} />
                    <span>Humidity</span>
                  </div>
                  <ArrowUpRight size={15} className={mutedText} />
                </div>
                <div className="my-2 flex items-baseline gap-0.5">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    {getReading("humidity", "82")}
                  </span>
                  <span className={`text-lg sm:text-xl font-medium ${mutedText}`}>
                    {getUnit("humidity", "%")}
                  </span>
                </div>
                <p className={`text-[10px] sm:text-[11px] leading-snug ${mutedText}`}>
                  Ensure ventilation is sufficient to prevent mold growth
                </p>
              </motion.div>

              {/* 6. Soil Moisture */}
              <motion.div
                whileHover={{ y: -3 }}
                className={`rounded-[22px] sm:rounded-[24px] p-4 sm:p-5 flex flex-col justify-between min-h-[150px] sm:min-h-[165px] ${cardBg}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Waves size={16} className={mutedText} />
                    <span>Soil Moisture</span>
                  </div>
                  <ArrowUpRight size={15} className={mutedText} />
                </div>
                <div className="my-2 flex items-baseline gap-0.5">
                  <span className="text-3xl sm:text-4xl font-semibold tracking-tight">
                    {getReading("moisture", "65")}
                  </span>
                  <span className={`text-lg sm:text-xl font-medium ${mutedText}`}>
                    {getUnit("moisture", "%")}
                  </span>
                </div>
                <p className={`text-[10px] sm:text-[11px] leading-snug ${mutedText}`}>
                  Keep monitoring to ensure it remains consistent
                </p>
              </motion.div>
            </div>
          </div>

          {/* MIDDLE COLUMN: DEVICE LIST (3 Cols on XL) */}
          <div className={`md:col-span-1 xl:col-span-3 rounded-[24px] sm:rounded-[26px] p-4 sm:p-5 flex flex-col justify-between ${cardBg}`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold">Device</h2>
                <button
                  onClick={() => setDeviceSubTab("all")}
                  title="Show all devices"
                  className={`p-1.5 rounded-xl transition ${subCardBg}`}
                >
                  <ArrowUpRight size={16} className={mutedText} />
                </button>
              </div>

              {/* Sensor / Camera Counter Filter */}
              <div className="flex items-center gap-6 mb-4 pb-3 border-b border-black/5 dark:border-white/10">
                <button
                  onClick={() => setDeviceSubTab(deviceSubTab === "sensor" ? "all" : "sensor")}
                  className="text-left group"
                >
                  <p className={`text-xs ${mutedText} group-hover:text-current`}>Sensor</p>
                  <p className={`text-sm font-bold mt-0.5 ${deviceSubTab === "sensor" ? "text-[#29d665]" : ""}`}>
                    {sensorCount}
                  </p>
                </button>

                <button
                  onClick={() => setDeviceSubTab(deviceSubTab === "camera" ? "all" : "camera")}
                  className="text-left group"
                >
                  <p className={`text-xs ${mutedText} group-hover:text-current`}>Camera</p>
                  <p className={`text-sm font-bold mt-0.5 ${deviceSubTab === "camera" ? "text-[#29d665]" : ""}`}>
                    {cameraCount}
                  </p>
                </button>
              </div>

              {/* Hardware Items */}
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {filteredHardware.map((item, idx) => (
                  <div
                    key={`${item.id}-${idx}`}
                    className={`rounded-2xl p-3.5 transition hover:border-[#29d665]/50 ${subCardBg}`}
                  >
                    <span
                      className={`inline-block h-2 w-2 rounded-full mb-2 ${item.status === "warning" ? "bg-amber-400" : "bg-[#29d665]"
                        }`}
                    />
                    <p className="text-xs sm:text-sm font-semibold leading-snug">
                      {item.name}
                    </p>
                    <p className={`text-[11px] mt-1 ${mutedText}`}>
                      {item.id} &nbsp;•&nbsp; {item.type}
                    </p>
                    {item.alert && (
                      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>{item.alert}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: CAMERA PREVIEW + TASKS (3 Cols on XL) */}
          <div className="md:col-span-1 xl:col-span-3 flex flex-col gap-4 sm:gap-5">

            {/* GREENHOUSE CAMERA CARD */}
            <div
              ref={cameraPanelRef}
              className="relative overflow-hidden rounded-[24px] sm:rounded-[26px] aspect-[4/3] bg-[#0c1a12] shadow-md group"
            >
              <img
                key={currentCamera}
                src={currentCamera}
                alt={`Camera ${cameraIndex + 1}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/70 via-black/20 to-black/40 p-4 text-center text-white">
                <Camera size={26} className="mb-1.5 opacity-60" />
                <span className="text-xs font-medium opacity-75">
                  Greenhouse Live Feed
                </span>
              </div>

              {/* Top Overlay */}
              <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between text-white z-10">
                <div className="flex items-center gap-2 rounded-full bg-black/45 backdrop-blur-md px-3 py-1 text-xs font-medium">
                  <span className="h-2 w-2 rounded-full bg-[#29d665] animate-pulse" />
                  <span>Camera {cameraIndex + 1}</span>
                </div>
                <button
                  type="button"
                  onClick={() => cameraPanelRef.current?.requestFullscreen?.()}
                  aria-label="Fullscreen camera"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-white hover:bg-black/70 transition"
                >
                  <ArrowUpRight size={15} />
                </button>
              </div>

              {/* Bottom Controls */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-1.5 rounded-2xl bg-black/45 backdrop-blur-md px-3 py-2 text-white z-10">
                <span className="text-xs font-medium px-1">
                  {cameraIndex + 1}/{Math.max(cameraSources.length, 5)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCameraIndex(
                        (prev) =>
                          (prev - 1 + cameraSources.length) %
                          cameraSources.length
                      )
                    }
                    aria-label="Previous camera"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/30 transition"
                  >
                    <ChevronDown size={15} className="rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = currentCamera;
                      link.download = `greenhouse-camera-${cameraIndex + 1}.jpg`;
                      link.click();
                    }}
                    aria-label="Capture snapshot"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/30 transition"
                  >
                    <Camera size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraPanelRef.current?.requestFullscreen?.()}
                    aria-label="Fullscreen"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/30 transition"
                  >
                    <Maximize2 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCameraIndex(
                        (prev) => (prev + 1) % cameraSources.length
                      )
                    }
                    aria-label="Next camera"
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 hover:bg-white/30 transition"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* TASK CHECKLIST CARD */}
            <div className={`flex-1 rounded-[24px] sm:rounded-[26px] p-4 sm:p-5 flex flex-col ${cardBg}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-semibold">Task</h2>
                <button
                  onClick={() =>
                    setTaskFilter(
                      taskFilter === "all"
                        ? "pending"
                        : taskFilter === "pending"
                          ? "completed"
                          : "all"
                    )
                  }
                  className={`p-1.5 rounded-xl transition ${subCardBg}`}
                  title="Filter tasks"
                >
                  <ArrowUpRight size={16} className={mutedText} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                  role="progressbar"
                  aria-valuenow={taskProgressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-[#29d665] transition-all duration-300"
                    style={{ width: `${taskProgressPercent}%` }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-semibold">{taskProgressPercent}%</span>
                  <span className={mutedText}>
                    {completedTasksCount}/{tasks.length} Task Completed
                  </span>
                </div>
              </div>

              {/* Task Items */}
              <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
                {filteredTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`w-full text-left flex items-start justify-between gap-3 border-t pt-3 first:border-0 first:pt-0 transition ${dark ? "border-white/10" : "border-black/5"
                      }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs sm:text-sm font-semibold ${task.done ? "line-through opacity-65" : ""
                          }`}
                      >
                        {task.title}
                      </p>
                      <p className={`mt-1 text-[11px] leading-relaxed ${mutedText}`}>
                        {task.desc}
                      </p>
                      <p className={`mt-1 text-[10px] font-medium ${mutedText}`}>
                        {task.time}
                      </p>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {task.done ? (
                        <CheckCircle2
                          size={20}
                          className="fill-[#29d665] text-white"
                        />
                      ) : (
                        <Circle size={20} className={mutedText} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* =============================================================== */}
        {/* LOWER SECTION: YOUR TRAYS & HARDWARE QUICK CONTROLS             */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5">

          {/* YOUR TRAYS & LAYER SELECTOR (8 Cols on XL) */}
          <section className={`xl:col-span-8 rounded-[24px] sm:rounded-[26px] p-4 sm:p-6 ${cardBg}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#29d665]/15 text-[#188c40] dark:text-[#29d665]">
                  <Sprout size={22} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">
                    Your trays · {device?.name || "Rack 01"}
                  </h2>
                  <p className={`text-xs ${mutedText}`}>
                    12 trays · 3 layers · Select a tray to manage its crop
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedLayer}
                  onChange={(e) => setSelectedLayer(Number(e.target.value))}
                  aria-label="Select layer"
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold outline-none ${subCardBg}`}
                >
                  {[1, 2, 3].map((layer) => (
                    <option key={layer} value={layer}>
                      Layer {layer}
                    </option>
                  ))}
                </select>

                <div className={`inline-flex rounded-full p-0.5 ${subCardBg}`}>
                  <button
                    onClick={() => setAutoMode(true)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${autoMode ? "bg-[#29d665] text-white" : mutedText
                      }`}
                  >
                    Auto
                  </button>
                  <button
                    onClick={() => setAutoMode(false)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${!autoMode ? "bg-[#29d665] text-white" : mutedText
                      }`}
                  >
                    Manual · 15m
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {crops.map((crop) => (
                <button
                  key={crop.tray}
                  onClick={() => setSelectedTray(crop.tray)}
                  className={`overflow-hidden rounded-2xl border text-left transition ${selectedTray === crop.tray
                    ? "border-[#29d665] ring-2 ring-[#29d665]/20"
                    : "border-transparent"
                    } ${subCardBg}`}
                >
                  <div className="aspect-[1.2/0.85] overflow-hidden bg-[#e8f0d9]">
                    <img
                      src={crop.image}
                      alt={crop.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <p className={`text-[10px] ${mutedText}`}>
                      R1 · L{selectedLayer} · {crop.tray}
                    </p>
                    <p className="mt-0.5 truncate text-xs sm:text-sm font-semibold">
                      {crop.name}
                    </p>
                    <p className={`mt-0.5 text-[10px] ${mutedText}`}>
                      Est. {crop.harvest}
                    </p>
                  </div>
                </button>
              ))}

              <Link
                href="/home/add/crop"
                className={`flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center transition hover:border-[#29d665] ${subCardBg}`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#29d665]/15 text-[#29d665]">
                  <Plus size={20} />
                </span>
                <span className="mt-2.5 text-xs sm:text-sm font-semibold">
                  Add a crop
                </span>
                <span className={`mt-0.5 text-[11px] ${mutedText}`}>
                  Tap to plant
                </span>
              </Link>
            </div>
          </section>

          {/* QUICK HARDWARE CONTROLS (4 Cols on XL) */}
          <section className={`xl:col-span-4 rounded-[24px] sm:rounded-[26px] p-4 sm:p-6 flex flex-col justify-between ${cardBg}`}>
            <div>
              <h2 className="text-base sm:text-lg font-semibold">Quick controls</h2>
              <p className={`text-xs mt-0.5 ${mutedText}`}>
                Hardware control interface
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  {
                    name: "Water pump",
                    icon: Droplets,
                    on: pumpOn,
                    toggle: () => setPumpOn((prev) => !prev),
                  },
                  {
                    name: "Fan",
                    icon: Wind,
                    on: fanOn,
                    toggle: () => setFanOn((prev) => !prev),
                  },
                  {
                    name: "Lighting",
                    icon: Lightbulb,
                    on: lightOn,
                    toggle: () => setLightOn((prev) => !prev),
                  },
                ].map(({ name, icon: Icon, on, toggle }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={toggle}
                    aria-pressed={on}
                    className={`rounded-2xl border p-3.5 text-center transition ${on
                      ? "border-[#29d665] bg-[#29d665]/10"
                      : `border-transparent ${subCardBg}`
                      }`}
                  >
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#29d665]/15 text-[#29d665]">
                      <Icon size={20} />
                    </div>
                    <p className="mt-2.5 text-xs font-semibold truncate">{name}</p>
                    <div className="mt-1.5 flex items-center justify-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${on ? "bg-[#29d665]" : "bg-gray-400"
                          }`}
                      />
                      <span
                        className={`text-[10px] font-bold ${on ? "text-[#29d665]" : mutedText
                          }`}
                      >
                        {on ? "ON" : "OFF"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`mt-4 flex items-center justify-between border-t pt-3 text-[11px] border-black/5 dark:border-white/10 ${mutedText}`}>
              <span className="flex items-center gap-1.5">
                <Cloud size={14} />
                {device?.latest
                  ? `Updated ${new Date(
                    device.latest.recordedAt
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                  : "Demo mode · Waiting for sensor data"}
              </span>
              <span>{online ? "Online" : "Offline"}</span>
            </div>
          </section>
        </div>

      </div>
    </main>
  );
}