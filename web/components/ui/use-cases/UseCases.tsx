"use client";

import { FadeUp, Stagger, StaggerItem } from "@/components/animations";
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
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <BackgroundGlow />

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Heading */}
        <FadeUp
        className="mx-auto mb-12 max-w-3xl text-center sm:mb-16"
          duration={0.8}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d8e3e]">
            Use Cases
          </span>

          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[#12382a] sm:text-5xl">
            Built For Every
            <span className="text-[#5d8e3e]">
              {" "}Growing Environment
            </span>
          </h2>

          <p className="mt-5 text-base leading-7 text-[#617369] sm:text-lg sm:leading-8">
            Smart Agri adapts to different farming environments—from rooftop
            gardens to commercial greenhouses and research facilities—helping
            growers make better decisions with AI and automation.
          </p>
        </FadeUp>

        {/* Cards */}
        <Stagger
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5"
          staggerChildren={0.1}
        >
          {useCases.map((item, index) => (
            <StaggerItem key={item.title}>
              <UseCaseCard
                index={index}
                icon={item.icon}
                title={item.title}
                description={item.description}
                gradient={item.gradient}
                tags={item.tags}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
