"use client";

import { FadeLeft, FadeRight, FadeUp } from "@/components/animations";
import {
  Warehouse,
  Sprout,
  Leaf,
  Trees,
  Home,
  FlaskConical,
} from "lucide-react";

import UseCaseCard from "./UseCaseCard";

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
    <section className="relative overflow-hidden bg-[#173c2c] py-24 sm:py-32">
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="absolute bottom-16 right-10 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-300/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6">
        {/* Heading */}
        <FadeUp
        className="mx-auto mb-12 max-w-3xl text-center sm:mb-16"
          duration={0.8}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b9d48d]">
            Use Cases
          </span>

          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
            Built For Every
            <span className="text-[#b9d48d]">
              {" "}Growing Environment
            </span>
          </h2>

          <p className="mt-5 text-base leading-7 text-green-50/75 sm:text-lg sm:leading-8">
            Smart Agri adapts to different farming environments—from rooftop
            gardens to commercial greenhouses and research facilities—helping
            growers make better decisions with AI and automation.
          </p>
        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((item, index) => {
            const CardAnimation = index % 2 === 0 ? FadeLeft : FadeRight;

            return (
            <CardAnimation key={item.title} delay={index * 0.08} className="h-full">
              <UseCaseCard
                icon={item.icon}
                title={item.title}
                description={item.description}
                gradient={item.gradient}
                tags={item.tags}
              />
            </CardAnimation>
            );
          })}
        </div>
      </div>
    </section>
  );
}
