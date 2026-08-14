"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface StaggerProps {
  children: ReactNode;
  className?: string;
  staggerChildren?: number;
  delayChildren?: number;
  once?: boolean;
}

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0,
    },
  },
};

export default function Stagger({
  children,
  className = "",
  staggerChildren = 0.15,
  delayChildren = 0,
  once = true,
}: StaggerProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once }}
    >
      {children}
    </motion.div>
  );
}