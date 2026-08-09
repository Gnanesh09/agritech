"use client";

import FeatureCard from "./FeatureCard";

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
      className="py-28 px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-green-400 font-semibold tracking-widest uppercase">
            Powerful Features
          </p>

          <h2 className="text-4xl md:text-5xl font-bold mt-4">
            Everything needed to build
            <br />
            an autonomous farm.
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}