"use client";

import { FadeLeft, FadeUp, ScaleIn } from "@/components/animations";
import {
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Power,
} from "lucide-react";

const sensors = [
  {
    icon: <Thermometer size={26} />,
    title: "Temperature",
    value: "28°C",
    color: "text-red-300",
  },
  {
    icon: <Droplets size={26} />,
    title: "Humidity",
    value: "68%",
    color: "text-blue-300",
  },
  {
    icon: <Sun size={26} />,
    title: "Light",
    value: "842 Lux",
    color: "text-yellow-300",
  },
  {
    icon: <Wind size={26} />,
    title: "Fan Status",
    value: "Running",
    color: "text-green-300",
  },
];

export default function DashboardPreview() {
  return (
    <section
      id="dashboard"
      className="relative overflow-hidden bg-[#123d2b] py-20 sm:py-28"
    >
      {/* Soft background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-[#2d6b4c]/30 blur-3xl" />
        <div className="absolute left-[-10%] top-1/3 h-80 w-80 rounded-full bg-[#4f8a63]/10 blur-3xl" />
        <div className="absolute right-[-10%] bottom-0 h-96 w-96 rounded-full bg-[#4f8a63]/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6">
        {/* Section Heading */}
        <FadeUp className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b9d48d]">
            Live Dashboard
          </span>

          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
            Monitor Everything in{" "}
            <span className="text-[#b9d48d]">Real Time</span>
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-green-50/70 sm:text-lg sm:leading-8">
            Stay connected to your farm with live sensor readings,
            automation controls, and AI insights from anywhere.
          </p>
        </FadeUp>

        {/* Dashboard */}
        <FadeLeft className="mt-12 sm:mt-16">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.18)] backdrop-blur-sm sm:rounded-[2.5rem] sm:p-7">
            
            {/* Dashboard Header */}
            <div className="mb-10 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white sm:text-2xl">
                Smart Agriculture Dashboard
              </h3>

              <div className="flex items-center gap-2 text-sm font-semibold text-[#b9d48d]">
                <span className="h-3 w-3 rounded-full bg-green-400" />
                Live
              </div>
            </div>

            {/* Sensor Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {sensors.map((sensor, index) => (
                <ScaleIn
                  key={sensor.title}
                  delay={index * 0.15}
                  className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 shadow-none transition-all duration-300 hover:bg-white/[0.1]"
                >
                  <div className={`${sensor.color} mb-4`}>
                    {sensor.icon}
                  </div>

                  <p className="text-sm text-green-50/60">
                    {sensor.title}
                  </p>

                  <h4 className="mt-2 text-2xl font-semibold text-white">
                    {sensor.value}
                  </h4>
                </ScaleIn>
              ))}
            </div>

            {/* Bottom Controls */}
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              
              {/* AI Recommendation */}
              <ScaleIn
                className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-none transition-all duration-300 hover:bg-white/[0.1]"
                delay={0.15}
              >
                <h4 className="text-lg font-semibold text-white">
                  AI Recommendation
                </h4>

                <p className="mt-3 text-sm leading-7 text-green-50/65">
                  Soil moisture is decreasing. Irrigation is recommended
                  within the next 20 minutes.
                </p>
              </ScaleIn>

              {/* Automation */}
              <ScaleIn
                className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 text-green-50 shadow-none transition-all duration-300 hover:bg-white/[0.1]"
                delay={0.3}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">
                    Automation
                  </h4>

                  <Power className="text-[#b9d48d]" />
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-green-50/75">Pump</span>

                    <span className="font-semibold text-[#b9d48d]">
                      ON
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-green-50/75">Fan</span>

                    <span className="font-semibold text-green-50/50">
                      OFF
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-green-50/75">Grow Light</span>

                    <span className="font-semibold text-[#b9d48d]">
                      ON
                    </span>
                  </div>
                </div>
              </ScaleIn>
            </div>
          </div>
        </FadeLeft>
      </div>
    </section>
  );
}