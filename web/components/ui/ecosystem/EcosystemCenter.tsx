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
      {/* Ambient Glow */}
      <motion.div
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.18, 0.35, 0.18],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute h-[340px] w-[340px] rounded-full bg-emerald-300 blur-[140px]"
      />

      {/* Outer Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 45,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute h-[270px] w-[270px] rounded-full border border-green-100/70"
      />

      {/* Inner Ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{
          duration: 60,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute h-[245px] w-[245px] rounded-full border border-emerald-100/60"
      />

      {/* Decorative Ring */}
      <div className="absolute h-[220px] w-[220px] rounded-full bg-gradient-to-br from-green-50 via-white to-emerald-50 shadow-inner" />

      {/* Main Hub */}
      <div className="relative z-20 flex h-[216px] w-[216px] flex-col items-center justify-center rounded-full border border-white/80 bg-white/95 shadow-[0_28px_70px_rgba(16,185,129,0.16)] backdrop-blur-xl">

        {/* Inner Gradient */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white via-green-50 to-emerald-50" />

        {/* Icon */}
        <motion.div
          whileHover={{
            rotate: 8,
            scale: 1.06,
          }}
          transition={{
            type: "spring",
            stiffness: 250,
          }}
          className="relative z-10 mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 text-white shadow-[0_12px_30px_rgba(16,185,129,0.45)]"
        >
          <Sprout size={42} />
        </motion.div>

        {/* Title */}
        <h3 className="relative z-10 text-[32px] font-extrabold tracking-tight text-slate-900">
          Smart Agri
        </h3>

        {/* Subtitle */}
        <p className="relative z-10 mt-2 text-sm font-medium text-slate-500">
          Growing Intelligence
        </p>

        {/* Live Badge */}
        <div className="relative z-10 mt-5 flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-5 py-2 shadow-sm">
          <motion.span
            animate={{
              scale: [1, 1.4, 1],
              opacity: [1, 0.4, 1],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="h-2.5 w-2.5 rounded-full bg-green-500"
          />

          <span className="text-xs font-bold tracking-[0.18em] text-green-700">
            LIVE SYSTEM
          </span>
        </div>
      </div>
    </motion.div>
  );
}