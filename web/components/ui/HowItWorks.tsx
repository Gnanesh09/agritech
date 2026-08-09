"use client";

import { motion } from "framer-motion";

import {
  Thermometer,
  Cpu,
  Cloud,
  BrainCircuit,
  MonitorSmartphone,
  Zap,
} from "lucide-react";

const steps = [
  {
    icon: Thermometer,
    title: "Sensors",
    text: "Temperature, humidity, light and soil moisture are continuously monitored.",
  },
  {
    icon: Cpu,
    title: "ESP32 Edge Device",
    text: "The ESP32 collects sensor readings and securely sends them to the cloud.",
  },
  {
    icon: Cloud,
    title: "Cloud Platform",
    text: "Telemetry is stored, processed and made available in real time.",
  },
  {
    icon: BrainCircuit,
    title: "AI Engine",
    text: "AI analyzes environmental data and recommends intelligent actions.",
  },
  {
    icon: MonitorSmartphone,
    title: "Dashboard",
    text: "Monitor your farm anywhere using the web or mobile dashboard.",
  },
  {
    icon: Zap,
    title: "Automation",
    text: "Automatically control pumps, fans and lighting when conditions change.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-28 px-6">
      <div className="max-w-6xl mx-auto">

        <div className="text-center mb-20">

          <p className="uppercase tracking-[0.25em] text-green-600 font-semibold">
            HOW IT WORKS
          </p>

          <h2 className="text-5xl font-bold mt-4 text-zinc-900">
            One Intelligent Ecosystem
          </h2>

          <p className="mt-6 text-zinc-600 max-w-2xl mx-auto">
            From sensors in the field to AI-powered automation,
            every component works together to create a smarter farm.
          </p>

        </div>

        <div className="space-y-10">

          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex gap-6 items-start"
              >
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="text-green-600" size={30} />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-zinc-900">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-zinc-600 leading-7">
                    {step.text}
                  </p>
                </div>
              </motion.div>
            );
          })}

        </div>

      </div>
    </section>
  );
}