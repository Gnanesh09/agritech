"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FadeLeftProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  className?: string;
}

export default function FadeLeft({
  children,
  delay = 0,
  duration = 0.7,
  distance = 60,
  once = true,
  className = "",
}: FadeLeftProps) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        x: -distance,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
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