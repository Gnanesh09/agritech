"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ScaleInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  scale?: number;
  once?: boolean;
  className?: string;
}

export default function ScaleIn({
  children,
  delay = 0,
  duration = 0.6,
  scale = 0.94,
  once = true,
  className = "",
}: ScaleInProps) {
  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        scale,
      }}
      whileInView={{
        opacity: 1,
        scale: 1,
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