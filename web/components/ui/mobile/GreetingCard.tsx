"use client";

import { motion } from "framer-motion";
import {
  Leaf,
  Sun,
  Thermometer,
  Sparkles,
} from "lucide-react";

export default function GreetingCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.7,
      }}
      className="mx-4 mt-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-6 text-white shadow-2xl"
    >
      {/* Top Row */}

      <div className="flex items-center justify-between">

        <div>

          <p className="text-sm opacity-80">
            Good Morning 👋
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            USER
          </h2>

        </div>

        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            repeat: Infinity,
            duration: 4,
          }}
          className="rounded-full bg-white/20 p-3 backdrop-blur"
        >
          <Leaf size={26} />
        </motion.div>

      </div>

      {/* Health Card */}

      <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur">

        <div className="flex items-center gap-2">

          <Sparkles size={18} />

          <p className="text-sm font-medium">
            AI Health Score
          </p>

        </div>

        <div className="mt-3 flex items-end justify-between">

          <h3 className="text-5xl font-extrabold">
            98%
          </h3>

          <span className="rounded-full bg-green-400 px-4 py-1 text-sm font-semibold text-green-950">
            Excellent
          </span>

        </div>

      </div>

      {/* Bottom Info */}

      <div className="mt-6 flex justify-between">

        <div className="flex items-center gap-2">

          <Sun size={18} />

          <span>Sunny</span>

        </div>

        <div className="flex items-center gap-2">

          <Thermometer size={18} />

          <span>28°C</span>

        </div>

      </div>

    </motion.div>
  );
}