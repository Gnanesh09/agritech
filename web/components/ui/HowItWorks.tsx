"use client";

import { FadeUp } from "@/components/animations";
import { motion } from "framer-motion";
import {
  Sprout,
  BrainCircuit,
  Zap,
  Smartphone,
} from "lucide-react";

const steps = [
  {
    icon: <Sprout size={30} />,
    title: "Sensors Collect Data",
    description:
      "Temperature, humidity, soil moisture and light sensors continuously monitor your farm environment in real time.",
  },
  {
    icon: <BrainCircuit size={30} />,
    title: "AI Analyzes Everything",
    description:
      "Our AI studies sensor readings, detects patterns and predicts what your crops need before problems occur.",
  },
  {
    icon: <Zap size={30} />,
    title: "Automation Takes Action",
    description:
      "The system automatically controls pumps, fans and lighting whenever conditions require intervention.",
  },
  {
    icon: <Smartphone size={30} />,
    title: "Monitor Anywhere",
    description:
      "View live data, receive alerts and control your farm remotely from your mobile dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-white py-32"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-green-100 blur-3xl opacity-40" />
        <div className="absolute right-0 bottom-10 h-96 w-96 rounded-full bg-emerald-100 blur-3xl opacity-40" />
      </div>

      <div className="mx-auto max-w-7xl px-6">

        {/* Heading */}
        <FadeUp className="mb-24 text-center">
          <span className="font-semibold uppercase tracking-[4px] text-green-700">
            Process
          </span>

          <h2 className="mt-4 text-5xl font-extrabold text-slate-900">
            How It Works
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            From collecting sensor data to making intelligent decisions,
            our autonomous ecosystem keeps your farm healthy with minimal effort.
          </p>
        </FadeUp>

        {/* Timeline */}
        <div className="relative mx-auto max-w-5xl">

          {/* Desktop Line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-1 -translate-x-1/2 rounded-full bg-green-100 md:block" />

          {/* Mobile Line */}
          <div className="absolute left-6 top-0 h-full w-1 rounded-full bg-green-100 md:hidden" />

          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{
                opacity: 0,
                x: index % 2 === 0 ? -120 : 120,
              }}
              whileInView={{
                opacity: 1,
                x: 0,
              }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                delay: index * 0.15,
              }}
              className={`relative mb-20 flex ${
                index % 2 === 0
                  ? "md:flex-row"
                  : "md:flex-row-reverse"
              }`}
            >

              {/* Mobile Circle */}
              <div className="absolute left-0 top-8 flex h-12 w-12 items-center justify-center rounded-full border-4 border-green-200 bg-white shadow-lg md:hidden">
                <span className="font-bold text-green-700">
                  {index + 1}
                </span>
              </div>

              {/* Left / Right Card */}
              <div className="ml-20 w-full md:ml-0 md:w-5/12">

                <motion.div
                  whileHover={{
                    y: -8,
                    scale: 1.02,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                  }}
                  className="group rounded-3xl border border-green-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl"
                >

                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50 text-green-700 transition-all duration-500 group-hover:rotate-6 group-hover:scale-110">

                    {step.icon}

                  </div>

                  <h3 className="mb-4 text-2xl font-bold text-slate-900">
                    {step.title}
                  </h3>

                  <p className="leading-7 text-slate-600">
                    {step.description}
                  </p>

                </motion.div>

              </div>

              {/* Desktop Circle */}
              <div className="hidden md:flex md:w-2/12 justify-center">

                <motion.div
                  whileHover={{ scale: 1.15 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-green-200 bg-white shadow-lg"
                >
                  <span className="font-bold text-green-700">
                    {index + 1}
                  </span>
                </motion.div>

              </div>

              {/* Empty Side */}
              <div className="hidden md:block md:w-5/12" />

            </motion.div>
          ))}

        </div>

      </div>
    </section>
  );
}
