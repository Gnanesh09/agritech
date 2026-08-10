"use client";

import { motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";

const messages = [
  "Analyzing greenhouse conditions...",
  "Temperature is within the optimal range.",
  "Soil moisture is slowly decreasing.",
  "Recommendation: Irrigation will start in 2 hours.",
];

export default function AIInsightCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7 }}
      className="mx-4 mt-5 overflow-hidden rounded-3xl border border-green-100 bg-white/80 shadow-xl backdrop-blur-xl"
    >
      {/* Header */}

      <div className="flex items-center gap-3 border-b border-green-100 px-5 py-4">

        <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-3 text-white">

          <Bot size={22} />

        </div>

        <div>

          <h3 className="font-bold text-slate-900">
            Smart Agri AI
          </h3>

          <p className="text-sm text-green-600">
            Live Analysis
          </p>

        </div>

      </div>

      {/* Messages */}

      <div className="space-y-4 p-5">

        {messages.map((msg, index) => (

          <motion.div
            key={msg}
            initial={{
              opacity: 0,
              x: -20,
            }}
            whileInView={{
              opacity: 1,
              x: 0,
            }}
            viewport={{ once: true }}
            transition={{
              delay: index * 0.5,
              duration: 0.5,
            }}
            className="flex items-start gap-3"
          >

            <Sparkles
              size={16}
              className="mt-1 text-green-600"
            />

            <p className="text-sm leading-6 text-slate-700">
              {msg}
            </p>

          </motion.div>

        ))}

      </div>

      {/* Footer */}

      <div className="border-t border-green-100 bg-green-50 px-5 py-4">

        <motion.button
          whileHover={{
            scale: 1.03,
          }}
          whileTap={{
            scale: 0.97,
          }}
          className="w-full rounded-2xl bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700"
        >
          View Full AI Report
        </motion.button>

      </div>

    </motion.div>
  );
}
