"use client";

import FeatureCard from "./FeatureCard";
import { FadeUp, Stagger, StaggerItem } from "@/components/animations";

import {
  Thermometer,
  BrainCircuit,
  Cpu,
  Cloud,
  Smartphone,
  Bell,
} from "lucide-react";

const features = [
  {
    icon: <Thermometer size={36} />,
    title: "Real-time Monitoring",
    description:
      "Monitor temperature, humidity, light intensity and soil moisture in real time.",
  },
  {
    icon: <BrainCircuit size={36} />,
    title: "AI Decision Engine",
    description:
      "Predict irrigation schedules, detect plant diseases and recommend optimal crop actions.",
  },
  {
    icon: <Cpu size={36} />,
    title: "Automation",
    description:
      "Automatically control pumps, fans and grow lights based on sensor readings.",
  },
  {
    icon: <Cloud size={36} />,
    title: "Cloud Platform",
    description:
      "Access analytics, historical records and live data securely from anywhere.",
  },
  {
    icon: <Smartphone size={36} />,
    title: "Mobile Dashboard",
    description:
      "Monitor and control your smart farm from any device at any time.",
  },
  {
    icon: <Bell size={36} />,
    title: "Notifications",
    description:
      "Receive instant alerts whenever important environmental changes occur.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-white px-6 py-20 sm:py-28"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#f7f8f2] to-transparent" />
      <div className="relative mx-auto max-w-7xl">
        <FadeUp className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d8e3e]">
            Powerful Features
          </p>

          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-[#12382a] sm:text-5xl">
            Everything needed to build
            <span className="block text-[#5d8e3e]">an autonomous farm.</span>
          </h2>
        </FadeUp>

        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
