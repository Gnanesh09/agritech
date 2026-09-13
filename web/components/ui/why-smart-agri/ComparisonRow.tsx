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
      className="group"
    >
      <div className="overflow-hidden rounded-2xl border border-[#174b36]/10 bg-white shadow-[0_10px_28px_rgba(20,61,43,0.06)] transition-shadow duration-300 hover:shadow-[0_18px_34px_rgba(20,61,43,0.12)]">

        <div className="grid grid-cols-[48px_1fr] items-center gap-x-3 gap-y-4 p-4 sm:grid-cols-[56px_1fr_auto_1fr] sm:gap-4 sm:p-5">

          {/* Icon */}

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5efd8] text-xl transition duration-300 group-hover:scale-110">
            {icon}
          </div>

          {/* Old */}

          <div>
            <div className="flex items-center gap-2">

              <XCircle
                size={18}
                className="text-red-500"
              />

              <span className="text-sm font-medium text-slate-500 line-through">
                {oldText}
              </span>

            </div>
          </div>

          {/* Arrow */}

          <div className="text-[#5d8e3e]">
            <ArrowRight size={24} />
          </div>

          {/* New */}

          <div>
            <div className="flex items-center gap-2">

              <CheckCircle2
                size={18}
                className="text-green-600"
              />

              <span className="text-sm font-semibold text-[#173c2c]">
                {newText}
              </span>

            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
