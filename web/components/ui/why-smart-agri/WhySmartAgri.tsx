"use client";

import { motion } from "framer-motion";
import ComparisonRow from "./ComparisonRow";
import ComparisonCard from "./ComparisonCard";
import BackgroundGlow from "./BackgroundGlow";

const comparisons = [
  {
    old: "Manual Farm Monitoring",
    new: "24/7 AI Monitoring",
    icon: "👨‍🌾",
  },
  {
    old: "Water Wastage",
    new: "Smart Irrigation",
    icon: "💧",
  },
  {
    old: "Late Disease Detection",
    new: "AI Early Detection",
    icon: "🩺",
  },
  {
    old: "High Labour Dependency",
    new: "Automated Actions",
    icon: "⚙️",
  },
  {
    old: "Visit Farm Every Day",
    new: "Monitor From Anywhere",
    icon: "📱",
  },
  {
    old: "Guess Based Decisions",
    new: "Data Driven Insights",
    icon: "📊",
  },
];

export default function WhySmartAgri() {
  return (
    <section className="relative overflow-hidden bg-[#f7f8f2] py-20 sm:py-28">

      <BackgroundGlow />

      <div className="relative z-10 mx-auto max-w-7xl px-6">

        {/* Heading */}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
          className="mx-auto mb-12 max-w-3xl text-center sm:mb-16"
        >

          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d8e3e]">
            Why Smart Agri
          </span>

          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.045em] text-[#12382a] sm:text-5xl">
            Farming,
            <span className="text-[#5d8e3e]">
              {" "}Reimagined
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#617369] sm:text-lg sm:leading-8">
            Traditional farming relies on manual effort and guesswork.
            Smart Agri uses AI, automation and real-time monitoring
            to make farming smarter, easier and more productive.
          </p>

        </motion.div>

        {/* Layout */}

        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">

          {/* Left */}

          <div className="space-y-6">

            {comparisons.map((item, index) => (

              <ComparisonRow
                key={index}
                index={index}
                icon={item.icon}
                oldText={item.old}
                newText={item.new}
              />

            ))}

          </div>

          {/* Right */}

          <ComparisonCard />

        </div>

      </div>

    </section>
  );
}
