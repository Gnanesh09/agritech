"use client";

import {
  BrainCircuit,
  Activity,
  Bot,
  Zap,
  ArrowRight,
} from "lucide-react";
import { FadeLeft, FadeRight, FadeUp, ScaleIn } from "@/components/animations";

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
    <section className="relative overflow-hidden bg-[#173c2c] py-20 sm:py-28">

      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">

        <div className="absolute top-20 left-10 h-72 w-72 rounded-full bg-lime-300/10 blur-3xl" />

        <div className="absolute bottom-20 right-10 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-300/10 blur-[120px]" />

      </div>

      <div className="mx-auto max-w-7xl px-6">

        <FadeUp className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">

          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b9d48d]">
            Artificial Intelligence
          </span>

          <h2 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl">
            The Intelligence Behind Every Decision
          </h2>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-green-50/75 sm:text-lg sm:leading-8">
            Our autonomous decision engine analyzes environmental conditions,
            predicts plant requirements and automatically recommends or executes
            actions before problems become visible.
          </p>

        </FadeUp>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {cards.map((card, index) => {
            const CardAnimation = index < 2 ? FadeLeft : FadeRight;

            return (

            <CardAnimation
              key={card.title}
              delay={index * 0.18}
              className="
              group
              relative
              overflow-hidden
              rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-6
              shadow-[0_14px_32px_rgba(0,0,0,0.12)] backdrop-blur-sm
              transition-[transform,background-color] duration-300 hover:-translate-y-1 hover:bg-white/[0.11]
              "
            >

              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">

                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-green-200 blur-3xl" />

              </div>

              <div
                className="
                h-12 w-12 rounded-2xl bg-[#dceacb] text-[#236044]
                flex
                items-center
                justify-center
                mb-5
                transition-all
                duration-500
                group-hover:rotate-6
                group-hover:scale-110
                "
              >
                {card.icon}
              </div>

              <h3 className="mb-3 text-lg font-semibold text-white">
                {card.title}
              </h3>

              <p className="text-sm leading-7 text-green-50/70">
                {card.desc}
              </p>

            </CardAnimation>

            );
          })}

        </div>

        <ScaleIn className="mt-12 sm:mt-16" delay={0.5}>

          <div className="flex flex-wrap justify-center items-center gap-5">

            <FlowItem title="Sensors" />

            <ArrowRight className="hidden md:block text-[#b9d48d]" />

            <FlowItem title="AI Models" />

            <ArrowRight className="hidden md:block text-green-500 animate-pulse" />

            <FlowItem title="Decision Engine" />

            <ArrowRight className="hidden md:block text-green-500 animate-pulse" />

            <FlowItem title="Automation" />

          </div>

        </ScaleIn>

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
      border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white
      backdrop-blur-sm transition-colors duration-300 hover:bg-white/15
      "
    >
      {title}
    </div>
  );
}
