"use client";

import { motion } from "framer-motion";

export default function BackgroundGlow() {
  return (
    <>
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [-20, 20, -20],
          y: [-10, 10, -10],
        }}
        transition={{
          repeat: Infinity,
          duration: 10,
        }}
        className="absolute left-0 top-20 h-72 w-72 rounded-full bg-green-200/40 blur-[120px]"
      />

      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          x: [20, -20, 20],
          y: [10, -10, 10],
        }}
        transition={{
          repeat: Infinity,
          duration: 12,
        }}
        className="absolute right-0 bottom-0 h-80 w-80 rounded-full bg-emerald-200/40 blur-[140px]"
      />
    </>
  );
}