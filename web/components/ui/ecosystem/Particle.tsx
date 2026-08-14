"use client";

import { motion } from "framer-motion";

interface ParticleProps {
  delay?: number;
}

export default function Particle({
  delay = 0,
}: ParticleProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.5, 1],
        opacity: [0.3, 1, 0.3],
      }}
      transition={{
        repeat: Infinity,
        duration: 2,
        delay,
      }}
      className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_18px_rgba(34,197,94,1)]"
    />
  );
}