"use client";

import { motion } from "framer-motion";
import { Sprout } from "lucide-react";

export default function EcosystemCenter() {
  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.82,
        y: 30,
      }}
      whileInView={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      viewport={{ once: true }}
      transition={{
        duration: 0.9,
        ease: "easeOut",
      }}
      className="relative flex items-center justify-center"
    >
      <div className="absolute h-[300px] w-[300px] rounded-full bg-[#dceacb]/70 blur-3xl" />

      {/* Outer Ring */}
      <div className="absolute h-[270px] w-[270px] rounded-full border border-[#174b36]/10" />

      {/* Inner Ring */}
      <div className="absolute h-[245px] w-[245px] rounded-full border border-[#174b36]/10" />

      {/* Decorative Ring */}
      <div className="absolute h-[220px] w-[220px] rounded-full bg-[#f7f8f2] shadow-inner" />

      {/* Main Hub */}
      <div className="relative z-20 flex h-[216px] w-[216px] flex-col items-center justify-center rounded-full border border-[#174b36]/10 bg-white shadow-[0_24px_56px_rgba(20,61,43,0.14)]">

        {/* Inner Gradient */}
        <div className="absolute inset-2 rounded-full bg-[#f7f8f2]" />

        {/* Icon */}
        <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#174b36] text-white shadow-[0_12px_30px_rgba(20,61,43,0.25)]">
          <Sprout size={42} />
        </div>

        {/* Title */}
        <h3 className="relative z-10 text-[28px] font-semibold tracking-[-0.04em] text-[#173c2c]">
          Smart Agri
        </h3>

        {/* Subtitle */}
        <p className="relative z-10 mt-2 text-sm font-medium text-[#617369]">
          Growing Intelligence
        </p>

        {/* Live Badge */}
        <div className="relative z-10 mt-5 flex items-center gap-2 rounded-full border border-[#174b36]/10 bg-[#e5efd8] px-5 py-2 shadow-sm">
          <span className="h-2.5 w-2.5 rounded-full bg-[#5d8e3e]" />

          <span className="text-xs font-bold tracking-[0.18em] text-[#236044]">
            LIVE SYSTEM
          </span>
        </div>
      </div>
    </motion.div>
  );
}
