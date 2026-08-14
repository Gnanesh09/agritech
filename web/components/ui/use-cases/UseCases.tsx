"use client";

import { motion } from "framer-motion";
import {
  Warehouse,
  Sprout,
  Leaf,
  Trees,
  Home,
  FlaskConical,
} from "lucide-react";

import UseCaseCard from "./UseCaseCard";
import BackgroundGlow from "./BackgroundGlow";

const useCases = [
  {
    icon: Warehouse,
    title: "Greenhouses",
    description:
      "Maintain the perfect growing environment with automated climate, irrigation and lighting control.",
    gradient: "from-green-500 to-emerald-500",
    tags: ["Climate Control", "Smart Irrigation"],
  },
  {
    icon: Sprout,
    title: "Hydroponics",
    description:
      "Monitor nutrient levels and environmental conditions for healthier and faster plant growth.",
    gradient: "from-emerald-500 to-teal-500",
    tags: ["Live Monitoring", "AI Automation"],
  },
  {
    icon: Leaf,
    title: "Vertical Farming",
    description:
      "Optimize indoor farming with AI-powered monitoring and automation across every growing level.",
    gradient: "from-lime-500 to-green-500",
    tags: ["Indoor Farming", "Energy Efficient"],
  },
  {
    icon: Trees,
    title: "Open Field Farms",
    description:
      "Track weather, soil moisture and crop conditions remotely across large agricultural fields.",
    gradient: "from-green-600 to-emerald-600",
    tags: ["Remote Access", "Weather Insights"],
  },
  {
    icon: Home,
    title: "Smart Terrace Gardens",
    description:
      "Grow vegetables, herbs and flowers on your rooftop with automated watering and AI-powered monitoring.",
    gradient: "from-emerald-400 to-green-500",
    tags: ["Auto Watering", "Perfect for Homes"],
  },
  {
    icon: FlaskConical,
    title: "Research Labs",
    description:
      "Collect precise environmental data for agricultural research and scientific experiments.",
    gradient: "from-cyan-500 to-emerald-500",
    tags: ["High Accuracy", "Data Logging"],
  },
];

export default function UseCases() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white py-32">
      <BackgroundGlow />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto mb-20 max-w-3xl text-center"
        >
          <span className="font-semibold uppercase tracking-[4px] text-green-700">
            Use Cases
          </span>

          <h2 className="mt-5 text-5xl font-extrabold text-slate-900">
            Built For Every
            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              {" "}Growing Environment
            </span>
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            Smart Agri adapts to different farming environments—from rooftop
            gardens to commercial greenhouses and research facilities—helping
            growers make better decisions with AI and automation.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((item, index) => (
            <UseCaseCard
              key={item.title}
              index={index}
              icon={item.icon}
              title={item.title}
              description={item.description}
              gradient={item.gradient}
              tags={item.tags}
            />
          ))}
        </div>
      </div>
    </section>
  );
}