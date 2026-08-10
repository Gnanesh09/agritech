"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ReactNode } from "react";
import AnimatedCounter from "./AnimatedCounter";

interface SensorCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  unit: string;
  color: string;
  trend: string;
}

export default function SensorCard({
  icon,
  title,
  value,
  unit,
  color,
  trend,
}: SensorCardProps) {
  return (
    <motion.div
      whileHover={{
        y: -5,
        scale: 1.03,
      }}
      transition={{
        type: "spring",
        stiffness: 320,
      }}
      className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/75 p-3 shadow-xl backdrop-blur-2xl"
    >
      {/* Premium Glow */}
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full ${color} opacity-25 blur-3xl transition-all duration-500 group-hover:scale-150`}
      />

      {/* Light Reflection */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-80" />

      {/* Icon */}
      <div
        className={`relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${color} text-white shadow-lg transition-all duration-300 group-hover:rotate-6 group-hover:scale-110`}
      >
        {icon}
      </div>

      {/* Title */}
      <p className="relative z-10 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </p>

      {/* Animated Value */}
      <div className="relative z-10 mt-1">
        <AnimatedCounter
          value={Number(value)}
          suffix={unit}
        />
      </div>

      {/* Trend */}
      <div className="relative z-10 mt-2 flex items-center gap-1 text-[11px] font-semibold text-green-600">
        <ArrowUpRight size={13} strokeWidth={2.5} />
        <span>{trend}</span>
      </div>
    </motion.div>
  );
}