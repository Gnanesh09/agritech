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
    color: "text-red-500",
  },
  {
    icon: <Droplets size={26} />,
    title: "Humidity",
    value: "68%",
    color: "text-blue-500",
  },
  {
    icon: <Sun size={26} />,
    title: "Light",
    value: "842 Lux",
    color: "text-yellow-500",
  },
  {
    icon: <Wind size={26} />,
    title: "Fan Status",
    value: "Running",
    color: "text-green-500",
  },
];

export default function DashboardPreview() {
  return (
    <section
      id="dashboard"
      className="relative overflow-hidden bg-white py-20 sm:py-28"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">

        <div className="absolute left-20 top-20 h-80 w-80 rounded-full bg-green-100 blur-3xl opacity-40" />

        <div className="absolute right-20 bottom-10 h-96 w-96 rounded-full bg-emerald-100 blur-3xl opacity-40" />

      </div>

      <div className="mx-auto max-w-7xl px-6">

        <FadeUp className="mx-auto max-w-3xl text-center">

          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d8e3e]">
            Live Dashboard
          </span>

          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[#12382a] sm:text-5xl">
            Monitor Everything in Real Time
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#617369] sm:text-lg sm:leading-8">
            Stay connected to your farm with live sensor readings,
            automation controls, and AI insights from anywhere.
          </p>

        </FadeUp>

        <FadeLeft className="mt-12 sm:mt-16">
        <div className="rounded-[2rem] border border-[#174b36]/10 bg-[#173c2c] p-4 shadow-[0_28px_70px_rgba(20,61,43,0.2)] sm:rounded-[2.5rem] sm:p-7">

          {/* Dashboard Header */}

          <div className="mb-10 flex items-center justify-between">

            <h3 className="text-lg font-semibold text-white sm:text-2xl">
              Smart Agriculture Dashboard
            </h3>

            <div className="flex items-center gap-2 text-sm font-semibold text-[#b9d48d]">

              <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>

              Live

            </div>

          </div>

          {/* Sensor Cards */}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {sensors.map((sensor, index) => (

              <ScaleIn
                key={sensor.title}
                delay={index * 0.15}
                className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 shadow-none transition-transform duration-300 hover:scale-[1.02]"
              >

                <div className={`${sensor.color} mb-4`}>
                  {sensor.icon}
                </div>

                <p className="text-sm text-green-50/65">
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

            <ScaleIn
              className="rounded-2xl border border-white/10 bg-white/[0.08] p-6 shadow-none transition-transform duration-300 hover:scale-[1.01]"
              delay={0.15}
            >

              <h4 className="text-lg font-semibold text-white">
                AI Recommendation
              </h4>

              <p className="mt-3 text-sm leading-7 text-green-50/70">
                Soil moisture is decreasing. Irrigation is recommended
                within the next 20 minutes.
              </p>

            </ScaleIn>

            <ScaleIn
              className="rounded-2xl border border-white/10 bg-white/[0.08] p-6 text-green-50 shadow-none transition-transform duration-300 hover:scale-[1.01]"
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

                  <span>Pump</span>

                  <span className="font-semibold text-[#b9d48d]">
                    ON
                  </span>

                </div>

                <div className="flex justify-between">

                  <span>Fan</span>

                  <span className="font-semibold text-green-50/55">
                    OFF
                  </span>

                </div>

                <div className="flex justify-between">

                  <span>Grow Light</span>

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
