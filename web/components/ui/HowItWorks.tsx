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
      className="relative overflow-hidden bg-[#f7f8f2] py-20 sm:py-28"
    >
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-green-100 blur-3xl opacity-40" />
        <div className="absolute right-0 bottom-10 h-96 w-96 rounded-full bg-emerald-100 blur-3xl opacity-40" />
      </div>

      <div className="mx-auto max-w-6xl px-6">

        {/* Heading */}
        <FadeUp className="mx-auto mb-14 max-w-3xl text-center sm:mb-20">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d8e3e]">
            Process
          </span>

          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[#12382a] sm:text-5xl">
            How It Works
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#617369] sm:text-lg sm:leading-8">
            From collecting sensor data to making intelligent decisions,
            our autonomous ecosystem keeps your farm healthy with minimal effort.
          </p>
        </FadeUp>

        {/* Timeline */}
        <div className="relative mx-auto max-w-5xl">

          {/* Desktop Line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-[#174b36]/15 md:block" />

          {/* Mobile Line */}
          <div className="absolute left-6 top-0 h-full w-px bg-[#174b36]/15 md:hidden" />

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
              className={`relative mb-10 flex sm:mb-14 ${
                index % 2 === 0
                  ? "md:flex-row"
                  : "md:flex-row-reverse"
              }`}
            >

              {/* Mobile Circle */}
              <div className="absolute left-0 top-7 flex h-12 w-12 items-center justify-center rounded-full border border-[#174b36]/15 bg-[#e5efd8] shadow-sm md:hidden">
                <span className="font-semibold text-[#174b36]">
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
                  className="group rounded-[1.5rem] border border-[#174b36]/10 bg-white p-6 shadow-[0_16px_36px_rgba(20,61,43,0.08)] sm:p-8"
                >

                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5efd8] text-[#236044] transition-transform duration-300 group-hover:scale-110">

                    {step.icon}

                  </div>

                  <h3 className="mb-3 text-xl font-semibold tracking-[-0.025em] text-[#173c2c]">
                    {step.title}
                  </h3>

                  <p className="text-sm leading-7 text-[#617369] sm:text-base">
                    {step.description}
                  </p>

                </motion.div>

              </div>

              {/* Desktop Circle */}
              <div className="hidden md:flex md:w-2/12 justify-center">

                <motion.div
                  whileHover={{ scale: 1.08 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-[#174b36]/15 bg-[#e5efd8] shadow-sm"
                >
                  <span className="font-semibold text-[#174b36]">
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
