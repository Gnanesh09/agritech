"use client";

import { motion } from "framer-motion";

export default function BackgroundGlow() {
  return (
    <>
      {/* Top Left Glow */}
      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.15, 0.28, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-green-300 blur-[140px]"
      />

      {/* Top Right Glow */}
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.12, 0.25, 0.12],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-emerald-300 blur-[130px]"
      />

      {/* Bottom Glow */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.08, 0.18, 0.08],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-0 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-green-200 blur-[180px]"
      />

      {/* Floating Orb 1 */}
      <motion.div
        animate={{
          y: [0, -25, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute left-1/4 top-36 h-5 w-5 rounded-full bg-green-400/40 blur-sm"
      />

      {/* Floating Orb 2 */}
      <motion.div
        animate={{
          y: [0, 20, 0],
          x: [0, -10, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute right-1/4 top-64 h-4 w-4 rounded-full bg-emerald-400/40 blur-sm"
      />

      {/* Floating Orb 3 */}
      <motion.div
        animate={{
          y: [0, -18, 0],
          x: [0, 12, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-24 left-1/3 h-6 w-6 rounded-full bg-green-300/30 blur-sm"
      />

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #16a34a 1px, transparent 1px),
            linear-gradient(to bottom, #16a34a 1px, transparent 1px)
          `,
          backgroundSize: "70px 70px",
        }}
      />
    </>
  );
}