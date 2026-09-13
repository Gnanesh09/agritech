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
      whileHover={{ y: -3 }}
      className="group relative w-full overflow-hidden rounded-[1.5rem] border border-[#174b36]/10 bg-white p-6 shadow-[0_12px_30px_rgba(20,61,43,0.08)] transition-shadow duration-300 hover:shadow-[0_18px_36px_rgba(20,61,43,0.12)] lg:w-64"
    >
      {/* Glow */}
      <div
        className={`absolute -right-12 -top-12 h-36 w-36 rounded-full ${color} opacity-10 blur-3xl`}
      />

      {/* Shine */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />

      <div
        className={`relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${color} text-white shadow-md`}
      >
        {icon}
      </div>

      <h3 className="relative z-10 text-lg font-semibold tracking-[-0.025em] text-[#173c2c]">
        {title}
      </h3>

      <p className="relative z-10 mt-2 text-sm leading-6 text-[#617369]">
        {description}
      </p>
    </motion.div>
  );
}
