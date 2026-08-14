"use client";

import { motion } from "framer-motion";

const line = {
  fill: "none",
  stroke: "url(#greenGradient)",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  filter: "url(#glow)",
};

export default function AnimatedConnections() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 850"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Premium Gradient */}
        <linearGradient id="greenGradient">
          <stop offset="0%" stopColor="#D1FAE5" stopOpacity="0" />
          <stop offset="18%" stopColor="#86EFAC" stopOpacity=".7" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="1" />
          <stop offset="82%" stopColor="#86EFAC" stopOpacity=".7" />
          <stop offset="100%" stopColor="#D1FAE5" stopOpacity="0" />
        </linearGradient>

        {/* Soft Glow */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* TOP */}

      <motion.path
        d="M600 110
           C600 170,
             600 220,
             600 285"
        {...line}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
      />

      {/* LEFT */}

      <motion.path
        d="
        M170 340
        C290 340,
          390 340,
          470 360

        S540 390,
         548 398
      "
        {...line}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: 1,
          delay: .2,
        }}
      />

      {/* RIGHT */}

      <motion.path
        d="
        M1030 340
        C910 340,
          810 340,
          730 360

        S660 390,
         652 398
      "
        {...line}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: 1,
          delay: .35,
        }}
      />

      {/* BOTTOM LEFT */}

      <motion.path
        d="
        M300 690

        C390 690,
          450 640,
          505 565

        S555 500,
         565 470
      "
        {...line}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: 1,
          delay: .5,
        }}
      />

      {/* BOTTOM RIGHT */}

      <motion.path
        d="
        M900 690

        C810 690,
          750 640,
          695 565

        S645 500,
         635 470
      "
        {...line}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{
          duration: 1,
          delay: .65,
        }}
      />
    </svg>
  );
}