
"use client";

import { useState } from "react";

export default function Dashboard() {
  const [fan, setFan] = useState(false);
  const [pump, setPump] = useState(false);
  const [light, setLight] = useState(true);

  const sensors = [
    { name: "Temperature", value: "28°C", icon: "🌡️", status: "Normal" },
    { name: "Humidity", value: "65%", icon: "💧", status: "Normal" },
    { name: "Light Intensity", value: "720 lux", icon: "☀️", status: "Good" },
  ];

  const devices = [
    { name: "Cooling Fan", value: fan, setter: setFan, icon: "🌀" },
    { name: "Water Pump", value: pump, setter: setPump, icon: "💧" },
    { name: "Grow Light", value: light, setter: setLight, icon: "💡" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f8f4] text-gray-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-6 md:block">
          <h1 className="mb-10 text-2xl font-bold text-green-800">
            🌱 SmartAgri
          </h1>

          <nav className="space-y-3">
            {["Dashboard", "Monitoring", "Devices", "Automation", "Settings"].map(
              (item, index) => (
                <div
                  key={item}
                  className={`rounded-xl px-4 py-3 ${
                    index === 0
                      ? "bg-green-100 font-semibold text-green-800"
                      : "text-gray-600"
                  }`}
                >
                  {item}
                </div>
              )
            )}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-5 md:p-10">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Greenhouse / Overview</p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                Greenhouse Dashboard
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Monitor and manage your growing environment.
              </p>
            </div>

            <div className="rounded-full bg-white px-4 py-2 text-sm shadow-sm">
              🟢 System Online
            </div>
          </header>

          <section className="mb-8">
            <h3 className="mb-4 text-lg font-semibold">Environment Overview</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {sensors.map((sensor) => (
                <div
                  key={sensor.name}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-500">{sensor.name}</p>
                    <span className="text-2xl">{sensor.icon}</span>
                  </div>

                  <p className="mt-5 text-3xl font-bold">{sensor.value}</p>
                  <p className="mt-3 text-sm text-green-700">
                    ● {sensor.status}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-semibold">Device Controls</h3>

              <div className="space-y-4">
                {devices.map((device) => (
                  <div
                    key={device.name}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{device.icon}</span>
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-gray-500">
                          {device.value ? "Running" : "Stopped"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => device.setter(!device.value)}
                      className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition ${
                        device.value ? "bg-green-700" : "bg-gray-400"
                      }`}
                    >
                      {device.value ? "ON" : "OFF"}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">
                Greenhouse Status
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                Current system overview
              </p>

              <div className="space-y-5">
                {[
                  ["Sensors", "3", "green"],
                  ["Active Devices", String([fan, pump, light].filter(Boolean).length), "green"],
                  ["Automation", "Not connected", "gray"],
                ].map(([label, value, color]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between border-b border-gray-100 pb-4"
                  >
                    <span className="text-gray-600">{label}</span>
                    <span
                      className={`font-semibold ${
                        color === "green" ? "text-green-700" : "text-gray-500"
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-900">
                Your dashboard is ready for sensor and device integration.
                Current readings are sample data.
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
