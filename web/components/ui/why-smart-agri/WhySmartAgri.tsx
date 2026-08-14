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
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-green-50/40 to-white py-32">

      <BackgroundGlow />

      <div className="relative z-10 mx-auto max-w-7xl px-6">

        {/* Heading */}

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
          className="mb-20 text-center"
        >

          <span className="font-semibold uppercase tracking-[4px] text-green-700">
            Why Smart Agri
          </span>

          <h2 className="mt-5 text-5xl font-extrabold text-slate-900">
            Farming,
            <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              {" "}Reimagined
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Traditional farming relies on manual effort and guesswork.
            Smart Agri uses AI, automation and real-time monitoring
            to make farming smarter, easier and more productive.
          </p>

        </motion.div>

        {/* Layout */}

        <div className="grid items-start gap-16 lg:grid-cols-2">

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