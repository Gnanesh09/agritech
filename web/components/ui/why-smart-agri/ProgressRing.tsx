"use client";

import { motion } from "framer-motion";

interface ProgressRingProps {
  value: number;
}

export default function ProgressRing({
  value,
}: ProgressRingProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative flex items-center justify-center">

      <svg
        width="72"
        height="72"
        className="-rotate-90"
      >

        {/* Background */}

        <circle
          cx="36"
          cy="36"
          r={radius}
          stroke="#DCFCE7"
          strokeWidth="7"
          fill="transparent"
        />

        {/* Progress */}

        <motion.circle
          cx="36"
          cy="36"
          r={radius}
          stroke="#10B981"
          strokeWidth="7"
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{
            strokeDashoffset: circumference,
          }}
          whileInView={{
            strokeDashoffset:
              circumference -
              (value / 100) * circumference,
          }}
          viewport={{ once: true }}
          transition={{
            duration: 1.4,
            ease: "easeOut",
          }}
        />

      </svg>

      {/* Percentage */}

      <motion.div
        initial={{
          opacity: 0,
          scale: .8,
        }}
        whileInView={{
          opacity: 1,
          scale: 1,
        }}
        viewport={{ once: true }}
        transition={{
          delay: .4,
        }}
        className="absolute text-sm font-extrabold text-slate-900"
      >
        {value}%
      </motion.div>

    </div>
  );
}