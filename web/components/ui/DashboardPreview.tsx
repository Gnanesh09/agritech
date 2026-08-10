"use client";

import { motion } from "framer-motion";
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
      className="relative overflow-hidden bg-[#F8FBF8] py-32"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">

        <div className="absolute left-20 top-20 h-80 w-80 rounded-full bg-green-100 blur-3xl opacity-40" />

        <div className="absolute right-20 bottom-10 h-96 w-96 rounded-full bg-emerald-100 blur-3xl opacity-40" />

      </div>

      <div className="mx-auto max-w-7xl px-6">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .7 }}
          className="text-center"
        >

          <span className="uppercase tracking-[4px] text-green-700 font-semibold">
            Live Dashboard
          </span>

          <h2 className="mt-4 text-5xl font-extrabold text-slate-900">
            Monitor Everything in Real Time
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-600 leading-8">
            Stay connected to your farm with live sensor readings,
            automation controls, and AI insights from anywhere.
          </p>

        </motion.div>

        <div className="mt-20 rounded-[36px] border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur-xl">

          {/* Dashboard Header */}

          <div className="mb-10 flex items-center justify-between">

            <h3 className="text-2xl font-bold text-slate-900">
              Smart Agriculture Dashboard
            </h3>

            <div className="flex items-center gap-2 text-green-600 font-semibold">

              <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>

              Live

            </div>

          </div>

          {/* Sensor Cards */}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">

            {sensors.map((sensor, index) => (

              <motion.div
                key={sensor.title}
                initial={{
                  opacity: 0,
                  y: 40,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{ once: true }}
                transition={{
                  delay: index * .15,
                }}
                whileHover={{
                  scale: 1.04,
                }}
                className="rounded-3xl border border-green-100 bg-white p-6 shadow-lg"
              >

                <div className={`${sensor.color} mb-4`}>
                  {sensor.icon}
                </div>

                <p className="text-gray-500">
                  {sensor.title}
                </p>

                <h4 className="mt-2 text-3xl font-bold text-slate-900">
                  {sensor.value}
                </h4>

              </motion.div>

            ))}

          </div>

          {/* Bottom Controls */}

          <div className="mt-10 grid gap-6 lg:grid-cols-2">

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-3xl border border-green-100 bg-white p-8 shadow-lg"
            >

              <h4 className="text-xl font-bold">
                AI Recommendation
              </h4>

              <p className="mt-4 text-slate-600 leading-7">
                Soil moisture is decreasing. Irrigation is recommended
                within the next 20 minutes.
              </p>

            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="rounded-3xl border border-green-100 bg-white p-8 shadow-lg"
            >

              <div className="flex items-center justify-between">

                <h4 className="text-xl font-bold">
                  Automation
                </h4>

                <Power className="text-green-600" />

              </div>

              <div className="mt-6 space-y-4">

                <div className="flex justify-between">

                  <span>Pump</span>

                  <span className="font-semibold text-green-600">
                    ON
                  </span>

                </div>

                <div className="flex justify-between">

                  <span>Fan</span>

                  <span className="font-semibold text-gray-500">
                    OFF
                  </span>

                </div>

                <div className="flex justify-between">

                  <span>Grow Light</span>

                  <span className="font-semibold text-green-600">
                    ON
                  </span>

                </div>

              </div>

            </motion.div>

          </div>

        </div>

      </div>

    </section>
  );
}