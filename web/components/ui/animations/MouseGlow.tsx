"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import { ReactNode } from "react";

interface MouseGlowProps {
  children: ReactNode;
  className?: string;
}

export default function MouseGlow({
  children,
  className = "",
}: MouseGlowProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(
    e: React.MouseEvent<HTMLDivElement>
  ) {
    const rect = e.currentTarget.getBoundingClientRect();

    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      className={`relative overflow-hidden rounded-3xl ${className}`}
    >
      {/* Spotlight */}

      <motion.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              300px circle at
              ${mouseX}px
              ${mouseY}px,
              rgba(34,197,94,0.18),
              transparent 70%
            )
          `,
        }}
      />

      {children}
    </motion.div>
  );
}