"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FloatingProps {
  children: ReactNode;
  className?: string;
  y?: number;
  x?: number;
  rotate?: number;
  duration?: number;
  delay?: number;
}

export default function Floating({
  children,
  className = "",
  y = 20,
  x = 0,
  rotate = 0,
  duration = 6,
  delay = 0,
}: FloatingProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -y, 0],
        x: [0, x, 0],
        rotate: [0, rotate, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: "mirror",
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}