"use client";

import { motion } from "framer-motion";
import ProgressRing from "./ProgressRing";
import {
  Droplets,
  Cpu,
  Leaf,
  Sparkles,
} from "lucide-react";

const stats = [
  {
    icon: <Leaf size={20} />,
    title: "Farm Efficiency",
    value: 98,
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: <Droplets size={20} />,
    title: "Water Saved",
    value: 42,
    color: "from-cyan-500 to-sky-500",
  },
  {
    icon: <Cpu size={20} />,
    title: "Automation",
    value: 100,
    color: "from-violet-500 to-fuchsia-500",
  },
  {
    icon: <Sparkles size={20} />,
    title: "AI Accuracy",
    value: 96,
    color: "from-amber-500 to-orange-500",
  },
];

export default function ComparisonCard() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 80,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{ once: true }}
      transition={{
        duration: .8,
      }}
      whileHover={{
        y: -8,
      }}
      className="sticky top-24"
    >
      <div className="relative overflow-hidden rounded-[32px] border border-green-100 bg-white/80 p-8 shadow-2xl backdrop-blur-xl">

        {/* Background Glow */}

        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-green-200/30 blur-[120px]" />

        <div className="relative z-10">

          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
            Live Statistics
          </span>

          <h3 className="mt-6 text-3xl font-extrabold text-slate-900">
            Smart Agri Impact
          </h3>

          <p className="mt-3 leading-7 text-slate-600">
            Real-time insights powered by AI,
            automation and sensor intelligence.
          </p>

          <div className="mt-10 space-y-6">

            {stats.map((item, index) => (

              <motion.div
                key={item.title}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{ once: true }}
                transition={{
                  delay: index * .15,
                }}
                className="flex items-center justify-between rounded-2xl border border-green-100 bg-white/80 p-4 shadow-md"
              >

                <div className="flex items-center gap-4">

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-lg`}
                  >
                    {item.icon}
                  </div>

                  <div>

                    <h4 className="font-bold text-slate-900">
                      {item.title}
                    </h4>

                    <p className="text-sm text-slate-500">
                      Live Performance
                    </p>

                  </div>

                </div>

                <ProgressRing
                  value={item.value}
                />

              </motion.div>

            ))}

          </div>

        </div>

      </div>
    </motion.div>
  );
}