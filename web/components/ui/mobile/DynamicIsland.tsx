"use client";

import { motion } from "framer-motion";

export default function DynamicIsland() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.6,
        type: "spring",
      }}
      className="absolute left-1/2 top-2 z-30 h-7 w-32 -translate-x-1/2 rounded-full bg-black shadow-md"
    />
  );
}