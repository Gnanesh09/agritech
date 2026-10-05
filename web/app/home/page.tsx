"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  Bell, Leaf, Sun, Moon, MapPin, ChevronDown, ChevronRight,
  Wifi, Cloud, Thermometer, Droplets, Sprout, Box, Lightbulb,
  Wind, Clock, ArrowUpRight, Activity, Plus, Search,
  CircleCheck, Circle, Settings2, RefreshCw, AlertCircle,
  CalendarDays, MoreHorizontal, Zap, Gauge, Waves
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

const careTasks = [
  { title: "Watering", time: "07:00 AM – 07:30 AM", done: true },
  { title: "Nutrients", time: "08:00 AM – 08:30 AM", done: true },
  { title: "Inspect leaves", time: "09:00 AM – 09:15 AM", done: false },
];

function Trend({
  color,
  positive = true,
}: {
  color: string;
  positive?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 120 32"
      className="h-8 w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={
          positive
            ? "M0 27 C12 29 12 16 23 19 S37 26 49 17 S65 21 75 11 S91 19 102 8 S114 8 120 3"
            : "M0 8 C12 5 15 20 27 16 S43 7 54 19 S72 12 83 22 S102 15 120 26"
        }
        stroke={color}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SectionTitle({
  title,
  subtitle,
  dark,
  action,
}: {
  title: string;
  subtitle?: string;
  dark: boolean;
  action?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div>
        <h2
          className={`text-[17px] font-semibold ${
            dark ? "text-[#f1f8ef]" : "text-[#15221a]"
          }`}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={`mt-0.5 text-[10px] ${
              dark ? "text-[#a1b6a3]" : "text-[#858d82]"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <button className="shrink-0 text-xs font-semibold text-[#287a38]">
          {action}
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(false);
  const [gardenOpen, setGardenOpen] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [expandedActivity, setExpandedActivity] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState(3);
  const [selectedTray, setSelectedTray] = useState("T1");const [pumpOn, setPumpOn] = useState(false);
const [fanOn, setFanOn] = useState(false);
const [lightOn, setLightOn] = useState(false);
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

  const device =
    devices.find((d) => d.id === selectedId) ?? devices[0];

  const sensors = device?.deviceModel.capabilities?.sensors ?? [];
  const readings = device?.latest?.data ?? {};

  const online =
    !!device?.lastSeenAt &&
    Date.now() - new Date(device.lastSeenAt).getTime() < 120000;

  const page = dark ? "bg-[#03180d]" : "bg-[#f5f6f0]";
  const text = dark ? "text-[#f1f8ef]" : "text-[#15221a]";
  const muted = dark ? "text-[#a1b6a3]" : "text-[#858d82]";
  const card = dark
    ? "border border-[#17432b] bg-[#082b19]"
    : "border border-[#edf0e7] bg-white/90 shadow-[0_4px_16px_rgba(40,80,30,0.045)]";
  const soft = dark ? "bg-[#0d3922]" : "bg-[#f7f9f2]";
  const line = dark ? "border-[#17432b]" : "border-[#edf0e7]";

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    localStorage.setItem("agrigrow-theme", next ? "dark" : "light");
  }

  function getReading(key: string) {
    const sensor = sensors.find((s) => s.key === key);
    const raw = readings[key];

    if (!sensor || raw === null || raw === undefined) return "--";

    if (sensor.type === "number") {
      const number = Number(raw);
      return Number.isFinite(number)
        ? Number.isInteger(number)
          ? String(number)
          : number.toFixed(1)
        : "--";
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

  if (loading) {
    return (
      <main className={`${page} min-h-screen p-4pb-32`}>
        <div className="mx-auto max-w-[390px] animate-pulse space-y-3">
          <div className="h-12 rounded-xl bg-black/5" />
          <div className="h-36 rounded-2xl bg-black/5" />
          <div className="h-64 rounded-2xl bg-black/5" />
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${page} min-h-screen px-3 pb-8 pt-3 transition-colors duration-300`}
    >
      <div className="mx-auto w-full max-w-[390px] space-y-2.5">

        {/* HEADER */}
        <header className="flex h-[49px] items-center justify-between px-0.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#287a38] text-white">
              <Leaf size={22} fill="white" />
            </div>
            <div>
              <h1 className={`text-[25px] font-bold leading-5 ${text}`}>
                SmartAgri
              </h1>
              <p className="mt-1 text-[8px] tracking-[0.12em] text-[#287a38]">
                SMALL SPACE. FRESH GROWTH.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to night mode"}
              title={dark ? "Light mode" : "Night mode"}
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${card} ${text}`}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              aria-label="Notifications"
              className={`relative flex h-9 w-9 items-center justify-center rounded-xl ${card} ${text}`}
            >
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="h-9 w-9 overflow-hidden rounded-full bg-[#e2e7d9]">
              <img
                src="/images/Profile.png"
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* WEATHER CARD */}
        <section
          className={`relative h-[151px] overflow-hidden rounded-[20px] border ${
            dark
              ? "border-[#17432b] bg-gradient-to-br from-[#103b23] to-[#082b19]"
              : "border-[#edf0e7] bg-gradient-to-br from-white via-[#fbfcf4] to-[#e8f0d9]"
          } px-3.5 py-3`}
        >
          <div
            className={`relative z-10 flex items-center justify-between text-[11px] ${
              dark ? "text-[#f1f8ef]" : "text-[#15221a]"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <MapPin size={16} />
              <span>Karnataka, Bengaluru</span>
            </div>
            <div className="text-right leading-4">
              <p>Tue, 10 Sep 2024</p>
              <p>09:37 AM</p>
            </div>
          </div>

          <img
            src="images/Botanical leaves1.png"
            alt=""
            className="pointer-events-none absolute bottom-0 left-[10%] h-[120px] w-[64%] object-contain opacity-80"
          />

          <div className="relative z-10 mt-5 flex items-end justify-between">
            <div className={dark ? "text-[#f1f8ef]" : "text-[#15221a]"}>
              <Sun
                size={30}
                fill="#ffb900"
                className="mb-1 text-[#ffb900]"
              />
              <p className="text-[14px] font-semibold">Sunny</p>
              <p className="text-[11px]">H:46°C&nbsp; L:52°C</p>
            </div>
            <div
              className={`mb-3 mr-1 text-[36px] font-semibold leading-none tracking-tight ${
                dark ? "text-[#f1f8ef]" : "text-[#15221a]"
              }`}
            >
              24°C
            </div>
          </div>
        </section>

        {/* GARDEN SELECTOR */}
        <section className="relative">
          <button
            onClick={() => setGardenOpen(!gardenOpen)}
            className={`flex h-[46px] w-full items-center justify-between rounded-[17px] px-3 ${card}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e8f5d7] text-[#287a38]">
                <Sprout size={19} />
              </div>
              <span className={`text-[12px] font-medium ${text}`}>
                Spinach Garden 08
              </span>
            </div>
            <ChevronDown
              size={17}
              className={`${text} transition-transform ${
                gardenOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {gardenOpen && (
            <div className={`absolute left-0 right-0 top-[50px] z-30 rounded-xl p-2 ${card}`}>
              {devices.length ? (
                devices.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDevice(d.id)}
                    className={`w-full rounded-lg p-2.5 text-left text-xs ${
                      d.id === device?.id
                        ? "bg-[#e8f5d7] text-[#183b16]"
                        : text
                    }`}
                  >
                    {d.name || d.deviceModel.name}
                  </button>
                ))
              ) : (
                <p className={`p-2 text-xs ${muted}`}>
                  No devices registered.
                </p>
              )}
            </div>
          )}
        </section>

        {/* RACK CARD */}
        <section className={`rounded-[21px] p-3 ${card}`}>
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-[43px] w-[43px] items-center justify-center rounded-xl bg-[#edf5e3] text-[#398a34]">
                <Box size={27} fill="#398a34" stroke="white" />
              </div>
              <div>
                <h2 className={`text-[19px] font-semibold leading-5 ${text}`}>
                  {device?.name || "Rack 01"}
                </h2>
                <p className={`mt-1 text-[10px] ${muted}`}>
                  Grow room · rack master
                </p>
              </div>
            </div>

            <span
              className={`flex items-center gap-1 rounded-full px-2 py-1.5 text-[9px] font-medium ${
                online
                  ? "bg-[#e6f8bc] text-[#275e23]"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <Wifi size={13} />
              {online ? "Online · demo" : "Offline"}
            </span>
          </div>

          <div className={`mt-2 space-y-0.5 text-[10px] ${muted}`}>
            <p>12 trays · 3 layers · 4 trays per layer</p>
            <p>9 planted · 3 empty · each tray has its own crop</p>
          </div>

          {/* SENSOR CARDS */}
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {[
              {
                key: "temperature",
                name: "Temperature",
                icon: Thermometer,
                fallback: "°C",
                color: "#438c2d",
                graph: "#269b29",
              },
              {
                key: "humidity",
                name: "Humidity",
                icon: Droplets,
                fallback: "%",
                color: "#079df3",
                graph: "#00aaff",
              },
              {
                key: "light",
                name: "Light",
                icon: Sun,
                fallback: "klux",
                color: "#ffb900",
                graph: "#ffb900",
              },
            ].map(({ key, name, icon: Icon, fallback, color, graph }) => (
              <div
                key={key}
                className={`min-w-0 rounded-[14px] border p-2 ${
                  dark
                    ? "border-[#17432b] bg-[#0d3922]"
                    : "border-[#edf0e7] bg-[#fbfcf7]"
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon size={25} style={{ color }} strokeWidth={1.8} />
                  <p className={`whitespace-nowrap text-[16px] font-semibold tracking-tight ${text}`}>
                    {getReading(key)}
                    <span className="text-[9px] font-medium">
                      {getUnit(key, fallback)}
                    </span>
                  </p>
                </div>
                <p className={`mt-1 text-[10px] ${muted}`}>{name}</p>
                <Trend color={graph} />
              </div>
            ))}
          </div>

          {/* CLOUD STATUS */}
          <div className={`mt-2.5 flex items-center justify-between border-t pt-2.5 ${line}`}>
            <div className="flex min-w-0 items-center gap-1.5">
              <Cloud size={17} className={muted} />
              <span className={`truncate text-[9px] ${muted}`}>
                {device?.latest
                  ? `Updated ${new Date(
                      device.latest.recordedAt
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Waiting for sensor data"}
              </span>
            </div>
            <button className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-[#17652b]">
              History <ChevronRight size={14} />
            </button>
          </div>
        </section>

        {/* TRAYS */}
        <section className="pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout size={26} className="text-[#6a9e3e]" />
              <div>
                <h2 className={`text-[17px] font-semibold ${text}`}>
                  Your trays
                </h2>
                <p className={`text-[9px] ${muted}`}>
                  Select a tray to add or edit its crop.
                </p>
              </div>
            </div>
            <span className={`text-[10px] ${muted}`}>
              Top layer first
            </span>
          </div>

          {/* LAYER AND MODE SELECTOR */}
          <div className="mt-3 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-2">
              <select
                value={selectedLayer}
                onChange={(e) => setSelectedLayer(Number(e.target.value))}
                aria-label="Select layer"
                className={`w-[78px] bg-transparent text-[15px] font-semibold outline-none ${text}`}
              >
                {[1, 2, 3].map((layer) => (
                  <option key={layer} value={layer}>
                    Layer {layer}
                  </option>
                ))}
              </select>
              <span className={`text-[9px] ${muted}`}>
                4 trays · independent controls
              </span>
            </div>

            <div className={`flex shrink-0 rounded-full p-0.5 ${dark ? "bg-[#17432b]" : "bg-[#e9eddf]"}`}>
              <button
                onClick={() => setAutoMode(true)}
                className={`rounded-full px-2.5 py-1.5 text-[9px] font-semibold ${
                  autoMode
                    ? "bg-[#77ac35] text-white"
                    : dark
                      ? "text-[#c7d9c6]"
                      : "text-[#384b35]"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setAutoMode(false)}
                className={`rounded-full px-2.5 py-1.5 text-[9px] ${
                  !autoMode
                    ? "bg-[#77ac35] text-white"
                    : dark
                      ? "text-[#c7d9c6]"
                      : "text-[#384b35]"
                }`}
              >
                Manual · 15 min
              </button>
            </div>
          </div>

          {/* PLANT CARDS */}
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            {crops.map((crop) => (
              <button
                key={crop.tray}
                onClick={() => setSelectedTray(crop.tray)}
                className={`min-w-0 overflow-hidden rounded-[13px] border text-left transition ${
                  selectedTray === crop.tray
                    ? "border-[#8bbd56]"
                    : dark
                      ? "border-[#17432b]"
                      : "border-[#edf0e7]"
                } ${dark ? "bg-[#082b19]" : "bg-white/80"}`}
              >
                <div className="aspect-[1.2/0.82] overflow-hidden bg-[#e8f0d9]">
                  <img
                    src={crop.image}
                    alt={crop.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-2">
                  <p className={`text-[9px] ${muted}`}>
                    R1 · L{selectedLayer} · {crop.tray}
                  </p>
                  <p className={`mt-0.5 truncate text-[11px] font-semibold ${text}`}>
                    {crop.name}
                  </p>
                  <p className={`mt-0.5 whitespace-nowrap text-[9px] ${muted}`}>
                    Est. {crop.harvest}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ADDITIONAL CONTENT BELOW THE INITIAL SCREEN */}
        <section className="pt-4">
          <SectionTitle
            title="Growing environment"
            subtitle="A quick look at your growing conditions"
            dark={dark}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <div className={`rounded-[18px] p-3 ${card}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${muted}`}>Temperature</span>
                <Thermometer size={17} className="text-orange-500" />
              </div>
              <p className={`mt-2 text-2xl font-semibold ${text}`}>
                {getReading("temperature")}
                <span className="text-sm">
                  {getUnit("temperature", "°C")}
                </span>
              </p>
              <p className={`mt-1 text-[10px] ${muted}`}>
                Latest available reading
              </p>
            </div>

            <div className={`rounded-[18px] p-3 ${card}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs ${muted}`}>Humidity</span>
                <Droplets size={17} className="text-sky-500" />
              </div>
              <p className={`mt-2 text-2xl font-semibold ${text}`}>
                {getReading("humidity")}
                <span className="text-sm">
                  {getUnit("humidity", "%")}
                </span>
              </p>
              <p className={`mt-1 text-[10px] ${muted}`}>
                Latest available reading
              </p>
            </div>
          </div>
        </section>

        {/* CARE SCHEDULE */}
        <section className={`rounded-[20px] p-3.5 ${card}`}>
          <SectionTitle
            title="Care schedule"
            subtitle="Daily plant care checklist"
            dark={dark}
            action="View all"
          />

          <div className="space-y-0">
            {careTasks.map((task, index) => (
              <div
                key={task.title}
                className={`flex items-center gap-2.5 border-t py-3 first:border-0 ${line}`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  index === 0
                    ? "bg-[#e0f5fb] text-sky-500"
                    : index === 1
                      ? "bg-[#e8f5d7] text-[#287a38]"
                      : "bg-[#f0f5e8] text-[#287a38]"
                }`}>
                  {index === 0 ? (
                    <Droplets size={20} />
                  ) : index === 1 ? (
                    <Leaf size={19} />
                  ) : (
                    <Search size={19} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${text}`}>
                    {task.title}
                  </p>
                  <p className={`mt-1 text-[10px] ${muted}`}>
                    {task.time}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {task.done ? (
                    <CircleCheck
                      size={20}
                      className="fill-[#70aa38] text-white"
                    />
                  ) : (
                    <Circle size={20} className={muted} />
                  )}
                  <span className={`text-[10px] ${muted}`}>
                    {task.done ? "Completed" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DEVICE STATUS */}
        <section className={`rounded-[20px] p-3.5 ${card}`}>
          <SectionTitle
            title="Device status"
            subtitle="Connected hardware"
            dark={dark}
          />

          {devices.length === 0 ? (
            <div className={`rounded-xl p-4 text-center ${soft}`}>
              <AlertCircle size={22} className={`mx-auto ${muted}`} />
              <p className={`mt-2 text-xs ${muted}`}>
                No devices connected yet.
              </p>
            </div>
          ) : (
            devices.map((d) => {
              const isOnline =
                !!d.lastSeenAt &&
                Date.now() - new Date(d.lastSeenAt).getTime() < 120000;

              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 border-t py-3 first:border-0 ${line}`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${soft}`}>
                    <Wifi size={19} className={isOnline ? "text-[#398a34]" : muted} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-semibold ${text}`}>
                      {d.name || d.deviceModel.name}
                    </p>
                    <p className={`mt-1 text-[10px] ${muted}`}>
                      {d.deviceCode}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[9px] ${
                    isOnline
                      ? "bg-[#e6f8bc] text-[#275e23]"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              );
            })
          )}
        </section>

        {/* RECENT ACTIVITY */}
        <section className={`rounded-[20px] p-3.5 ${card}`}>
          <div className="flex items-center justify-between">
            <SectionTitle
              title="Recent activity"
              subtitle="Your growing space updates"
              dark={dark}
            />
            <button
              onClick={() => setExpandedActivity(!expandedActivity)}
              aria-label="Expand activity"
              className={`rounded-full p-2 ${soft} ${text}`}
            >
              <ChevronDown
                size={17}
                className={`transition-transform ${
                  expandedActivity ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${soft}`}>
              <Activity size={18} className="text-[#398a34]" />
            </div>
            <div className="flex-1">
              <p className={`text-xs font-semibold ${text}`}>
                Sensor monitoring
              </p>
              <p className={`mt-1 text-[10px] ${muted}`}>
                {device?.latest
                  ? `Last telemetry received at ${new Date(
                      device.latest.recordedAt
                    ).toLocaleString()}`
                  : "No recent telemetry is available."}
              </p>
            </div>
          </div>

          {expandedActivity && (
            <div className={`mt-3 border-t pt-3 ${line}`}>
              <p className={`text-[11px] ${muted}`}>
                Only the latest available telemetry is shown here. Historical
                activity will appear when the backend supports it.
              </p>
            </div>
          )}
        </section>

        
{/* QUICK CONTROLS */}
<motion.section
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45, ease: "easeOut" }}
  className={`rounded-[20px] p-3.5 ${card}`}
>
  <SectionTitle
    title="Quick controls"
    subtitle="Hardware control interface"
    dark={dark}
  />

  <div className="grid grid-cols-3 gap-2">
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
    ].map(({ name, icon: Icon, on, toggle }, index) => (
      <motion.button
        key={name}
        type="button"
        aria-label={`${name}: ${on ? "ON" : "OFF"}`}
        aria-pressed={on}
        onClick={toggle}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.08,
          duration: 0.35,
        }}
        whileHover={{ y: -3, scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        className={`relative overflow-hidden rounded-[15px] border p-3 text-center transition-colors duration-300 ${
          on
            ? dark
              ? "border-green-500/40 bg-green-500/10"
              : "border-green-300 bg-green-50"
            : dark
              ? "border-white/10"
              : "border-transparent"
        } ${soft}`}
      >
        {/* ACTIVE BACKGROUND GLOW */}
        <motion.div
          className="pointer-events-none absolute inset-0 bg-green-400/5"
          initial={false}
          animate={{
            opacity: on ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* ICON */}
        <motion.div
          className="relative mx-auto flex h-9 w-9 items-center justify-center rounded-xl"
          animate={{
            scale: on ? 1.08 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 15,
          }}
        >
          <Icon
            size={22}
            className={on ? "text-green-500" : "text-[#398a34]"}
          />
        </motion.div>

        {/* DEVICE NAME */}
        <p className={`relative mt-2 text-[10px] font-semibold ${text}`}>
          {name}
        </p>

        {/* STATUS */}
        <div className="relative mt-2 flex items-center justify-center gap-1.5">
          <motion.span
            className={`h-2 w-2 rounded-full ${
              on ? "bg-green-500" : "bg-gray-400"
            }`}
            animate={{
              scale: on ? [1, 1.2, 1] : 1,
              opacity: on ? [1, 0.65, 1] : 0.7,
            }}
            transition={{
              duration: 1.5,
              repeat: on ? Infinity : 0,
              ease: "easeInOut",
            }}
          />

          <motion.span
            key={on ? "on" : "off"}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`text-[10px] font-bold ${
              on ? "text-green-600" : muted
            }`}
          >
            {on ? "ON" : "OFF"}
          </motion.span>
        </div>
      </motion.button>
    ))}
  </div>

  <p className={`mt-3 text-[10px] ${muted}`}>
    Demo mode · Hardware not connected
  </p>
</motion.section>

      </div>
    </main>
  );
}