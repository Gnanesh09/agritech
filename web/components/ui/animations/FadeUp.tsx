"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  className?: string;
}

export default function FadeUp({
  children,
  delay = 0,
  duration = 0.7,
  distance = 40,
  once = true,
  className = "",
}: FadeUpProps) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: distance,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{ once }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}