"use client";

import { motion } from "framer-motion";
import { ArrowRight, Leaf } from "lucide-react";

export default function CTA() {
  return (
    <section className="relative overflow-hidden py-36">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-white to-emerald-100" />

      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-300/20 blur-[140px]" />

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute left-20 top-24 h-6 w-6 rounded-full bg-green-300/50"
      />

      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute right-24 bottom-24 h-10 w-10 rounded-full bg-emerald-300/40"
      />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-white px-5 py-2 shadow-sm"
        >
          <Leaf className="h-4 w-4 text-green-600" />
          <span className="font-medium text-green-700">
            Start Your Smart Farming Journey
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          viewport={{ once: true }}
          className="mt-8 text-5xl font-bold leading-tight text-gray-900 md:text-7xl"
        >
          Ready to Grow
          <br />
          <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            Smarter?
          </span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
          className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-gray-600"
        >
          Join the future of intelligent agriculture with AI, IoT,
          automation, and real-time monitoring. Build healthier crops,
          reduce waste, and farm smarter from anywhere.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-col justify-center gap-5 sm:flex-row"
        >
          <button className="group inline-flex items-center justify-center rounded-2xl bg-green-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-green-700 hover:shadow-green-300/40">
            Get Started
            <ArrowRight className="ml-3 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          <button className="rounded-2xl border border-gray-300 bg-white px-8 py-4 text-lg font-semibold text-gray-700 transition-all duration-300 hover:border-green-500 hover:text-green-700 hover:shadow-lg">
            Contact Us
          </button>
        </motion.div>
      </div>
    </section>
  );
}