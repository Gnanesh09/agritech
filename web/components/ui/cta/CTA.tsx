"use client";

import { motion } from "framer-motion";
import { ArrowRight, Leaf } from "lucide-react";

export default function CTA() {
  return (
    <section className="relative overflow-hidden bg-[#f7f8f2] py-20 sm:py-28">
      {/* Background */}
      <div className="absolute inset-0 bg-[#173c2c]" />

      {/* Glow */}
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-300/20 blur-[140px]" />

      {/* Floating Elements */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute left-20 top-24 h-6 w-6 rounded-full bg-[#b9d48d]/30"
      />

      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
        className="absolute right-24 bottom-24 h-10 w-10 rounded-full bg-[#b9d48d]/20"
      />

      <div className="relative mx-auto max-w-5xl px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 shadow-sm backdrop-blur-sm"
        >
          <Leaf className="h-4 w-4 text-[#b9d48d]" />
          <span className="text-sm font-medium text-white">
            Start Your Smart Farming Journey
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          viewport={{ once: true }}
          className="mt-6 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] text-white sm:text-6xl md:text-7xl"
        >
          Ready to Grow
          <br />
          <span className="text-[#b9d48d]">
            Smarter?
          </span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
          className="mx-auto mt-6 max-w-2xl text-base leading-7 text-green-50/75 sm:text-lg sm:leading-8"
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
          className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"
        >
          <a href="#home" className="group inline-flex items-center justify-center rounded-full bg-[#b9d48d] px-7 py-3.5 text-base font-semibold text-[#173c2c] shadow-lg transition-transform duration-300 hover:-translate-y-0.5">
            Get Started
            <ArrowRight className="ml-3 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </a>

          <a href="#contact" className="rounded-full border border-white/25 bg-white/5 px-7 py-3.5 text-base font-semibold text-white transition-colors duration-300 hover:bg-white/10">
            Contact Us
          </a>
        </motion.div>
      </div>
    </section>
  );
}
