"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface Props {
  title: string;
  subtitle: string;
  delay?: number;
}

export default function FloatingNotification({
  title,
  subtitle,
  delay = 0,
}: Props) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 60,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{ once: true }}
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        opacity: { duration: 0.5, delay },
        x: { duration: 0.5, delay },
        y: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
      }}
      className="flex w-64 items-center gap-4 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="rounded-full bg-green-100 p-3">
        <CheckCircle2
          size={20}
          className="text-green-600"
        />
      </div>

      <div>

        <h4 className="font-semibold text-slate-900">
          {title}
        </h4>

        <p className="text-sm text-slate-500">
          {subtitle}
        </p>

      </div>

    </motion.div>
  );
}