"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";

interface ComparisonRowProps {
  icon: string;
  oldText: string;
  newText: string;
  index: number;
}

export default function ComparisonRow({
  icon,
  oldText,
  newText,
  index,
}: ComparisonRowProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 35,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{ once: true }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
      }}
      whileHover={{
        y: -6,
      }}
      className="group"
    >
      <div className="overflow-hidden rounded-3xl border border-green-100 bg-white/80 shadow-lg backdrop-blur-xl transition-all duration-500 hover:shadow-2xl">

        <div className="grid grid-cols-[70px_1fr_auto_1fr] items-center gap-5 p-6">

          {/* Icon */}

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-50 text-2xl transition duration-500 group-hover:scale-110">
            {icon}
          </div>

          {/* Old */}

          <motion.div
            initial={{
              opacity: 0,
              x: -40,
            }}
            whileInView={{
              opacity: 1,
              x: 0,
            }}
            viewport={{ once: true }}
            transition={{
              delay: index * 0.12,
            }}
          >
            <div className="flex items-center gap-2">

              <XCircle
                size={18}
                className="text-red-500"
              />

              <span className="font-medium text-slate-500 line-through">
                {oldText}
              </span>

            </div>
          </motion.div>

          {/* Arrow */}

          <motion.div
            animate={{
              x: [0, 5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="text-green-600"
          >
            <ArrowRight size={24} />
          </motion.div>

          {/* New */}

          <motion.div
            initial={{
              opacity: 0,
              x: 40,
            }}
            whileInView={{
              opacity: 1,
              x: 0,
            }}
            viewport={{ once: true }}
            transition={{
              delay: index * 0.18,
            }}
          >
            <div className="flex items-center gap-2">

              <CheckCircle2
                size={18}
                className="text-green-600"
              />

              <span className="font-semibold text-slate-900">
                {newText}
              </span>

            </div>
          </motion.div>

        </div>

      </div>
    </motion.div>
  );
}