"use client";

import {
  BrainCircuit,
  Activity,
  Bot,
  Zap,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";

const cards = [
  {
    icon: <Activity size={34} />,
    title: "Time-Series Analysis",
    desc: "Continuously detects abnormal sensor patterns before crops are affected.",
  },
  {
    icon: <BrainCircuit size={34} />,
    title: "Growth Intelligence",
    desc: "Predicts crop growth stage using environmental sensor data.",
  },
  {
    icon: <Bot size={34} />,
    title: "AI Decision Engine",
    desc: "Transforms raw sensor values into simple recommendations farmers understand.",
  },
  {
    icon: <Zap size={34} />,
    title: "Smart Automation",
    desc: "Automatically controls irrigation, lighting and ventilation when needed.",
  },
];

export default function AIDecisionLayer() {
  return (
    <section className="relative overflow-hidden py-32 bg-[#FAFBF7]">

      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">

        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-green-200/30 blur-3xl" />

        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-emerald-100/40 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-100/20 blur-[120px]" />

      </div>

      <div className="max-w-7xl mx-auto px-6">

        <motion.div
          initial={{
            opacity: 0,
            x: -120,
          }}
          whileInView={{
            opacity: 1,
            x: 0,
          }}
          viewport={{ once: true }}
          transition={{ duration: .7 }}
          className="text-center mb-20"
        >

          <span className="uppercase tracking-[4px] text-green-700 font-semibold">
            Artificial Intelligence
          </span>

          <h2 className="mt-4 text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
            The Intelligence Behind Every Decision
          </h2>

          <p className="mt-6 max-w-3xl mx-auto text-lg text-slate-600 leading-8">
            Our autonomous decision engine analyzes environmental conditions,
            predicts plant requirements and automatically recommends or executes
            actions before problems become visible.
          </p>

        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">

          {cards.map((card, index) => (

            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 70 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
  duration: 0.9,
  delay: index * 0.18,
  type: "spring",
  stiffness: 80,
  damping: 18,
}}
              className="
              group
              relative
              overflow-hidden
              rounded-3xl
              border
              border-white/60
              bg-white/70
              backdrop-blur-xl
              p-8
              shadow-lg
              transition-all
              duration-500
              hover:-translate-y-4
              hover:shadow-2xl
              "
            >

              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">

                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-green-200 blur-3xl" />

              </div>

              <div
                className="
                w-16
                h-16
                rounded-2xl
                bg-gradient-to-br
                from-green-100
                to-emerald-50
                text-green-700
                flex
                items-center
                justify-center
                mb-6
                transition-all
                duration-500
                group-hover:rotate-6
                group-hover:scale-110
                "
              >
                {card.icon}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-4">
                {card.title}
              </h3>

              <p className="text-slate-600 leading-7">
                {card.desc}
              </p>

            </motion.div>

          ))}

        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: .5 }}
          className="mt-24"
        >

          <div className="flex flex-wrap justify-center items-center gap-5">

            <FlowItem title="Sensors" />

            <ArrowRight className="hidden md:block text-green-500 animate-pulse" />

            <FlowItem title="AI Models" />

            <ArrowRight className="hidden md:block text-green-500 animate-pulse" />

            <FlowItem title="Decision Engine" />

            <ArrowRight className="hidden md:block text-green-500 animate-pulse" />

            <FlowItem title="Automation" />

          </div>

        </motion.div>

      </div>

    </section>
  );
}

function FlowItem({ title }: { title: string }) {
  return (
    <div
      className="
      rounded-full
      border
      border-green-100
      bg-white/80
      backdrop-blur-xl
      px-8
      py-5
      shadow-lg
      font-semibold
      text-slate-800
      transition-all
      duration-300
      hover:scale-105
      hover:shadow-xl
      "
    >
      {title}
    </div>
  );
}