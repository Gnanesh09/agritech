"use client";

import { motion } from "framer-motion";
import PhoneFrame from "./PhoneFrame";
import AppScreen from "./AppScreen";


export default function MobileAppPreview() {
  return (
    <section
      id="mobile-app"
      className="relative overflow-hidden bg-white py-36"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-0 top-20 h-96 w-96 rounded-full bg-green-100 blur-3xl opacity-50" />
        <div className="absolute right-0 bottom-10 h-[450px] w-[450px] rounded-full bg-emerald-100 blur-3xl opacity-40" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-20 px-6 lg:grid-cols-2">

        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -80 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="font-semibold uppercase tracking-[4px] text-green-700">
            Mobile App
          </span>

          <h2 className="mt-5 text-5xl font-extrabold leading-tight text-slate-900">
            Smart Agriculture.
            <br />
            Anywhere.
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Stay connected to your farm with a beautifully designed mobile
            experience. Monitor sensors, receive AI insights, and control your
            automation system from anywhere in the world.
          </p>

          <div className="mt-10 space-y-5">

            <Feature text="Real-time sensor monitoring" />

            <Feature text="AI-powered recommendations" />

            <Feature text="Remote pump & fan control" />

            <Feature text="Instant notifications" />

          </div>
        </motion.div>

        {/* Phone */}
        <motion.div
  initial={{ opacity: 0, x: 80 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}

  animate={{
    y: [0, -12, 0],
  }}

  transition={{
    x: {
      duration: 0.8,
    },
    opacity: {
      duration: 0.8,
    },
    y: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  }}

  className="flex justify-center"
>
          <PhoneFrame>
            <AppScreen />
          </PhoneFrame>
        </motion.div>

      </div>
    </section>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">

      <div className="h-3 w-3 rounded-full bg-green-600" />

      <p className="text-lg text-slate-700">{text}</p>

    </div>
  );
}