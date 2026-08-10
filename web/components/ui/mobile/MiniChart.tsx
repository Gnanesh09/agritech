"use client";

import { motion } from "framer-motion";

export default function MiniChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 25 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mx-4 mt-5 rounded-3xl border border-green-100 bg-white/80 p-5 shadow-xl backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Weekly Health
          </p>

          <h3 className="text-xl font-bold text-slate-900">
            Plant Growth
          </h3>
        </div>

        <div className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
          +12%
        </div>
      </div>

      {/* Chart */}
      <div className="mt-8 h-36">
        <svg
          viewBox="0 0 200 100"
          className="h-full w-full overflow-visible"
        >
          {/* Grid */}
          <line
            x1="0"
            y1="85"
            x2="200"
            y2="85"
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          <line
            x1="0"
            y1="55"
            x2="200"
            y2="55"
            stroke="#f3f4f6"
            strokeWidth="1"
          />

          <line
            x1="0"
            y1="25"
            x2="200"
            y2="25"
            stroke="#f3f4f6"
            strokeWidth="1"
          />

          {/* Gradient */}
          <defs>
            <linearGradient
              id="lineGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* Animated Line */}
          <motion.path
            d="M10 72
               C35 62,50 48,70 52
               S105 28,125 34
               S155 55,190 18"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              ease: "easeOut",
            }}
          />

          {/* Points */}
          {[
            [10, 72],
            [70, 52],
            [125, 34],
            [190, 18],
          ].map(([x, y], i) => (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              fill="#16a34a"
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{
                delay: i * 0.2,
              }}
            />
          ))}
        </svg>
      </div>

      {/* Days */}
      <div className="mt-3 flex justify-between text-xs text-slate-500">
        <span>M</span>
        <span>T</span>
        <span>W</span>
        <span>T</span>
        <span>F</span>
        <span>S</span>
        <span>S</span>
      </div>
    </motion.div>
  );
}