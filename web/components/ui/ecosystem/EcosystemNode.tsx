"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface EcosystemNodeProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: string;
  delay?: number;
}

export default function EcosystemNode({
  icon,
  title,
  description,
  color,
  delay = 0,
}: EcosystemNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 40 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.7,
        delay,
      }}
      whileHover={{
        y: -10,
        scale: 1.05,
      }}
      className="group relative w-64 overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl"
    >
      {/* Glow */}
      <div
        className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${color} opacity-20 blur-3xl transition-all duration-500 group-hover:scale-150`}
      />

      {/* Shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent opacity-80" />

      <div
        className={`relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${color} text-white shadow-xl transition-all duration-500 group-hover:rotate-6 group-hover:scale-110`}
      >
        {icon}
      </div>

      <h3 className="relative z-10 text-xl font-bold text-slate-900">
        {title}
      </h3>

      <p className="relative z-10 mt-3 leading-7 text-slate-600">
        {description}
      </p>
    </motion.div>
  );
}