"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import {
  FadeUp,
  MagneticButton,
  RevealText,
  StaggerContainer,
  StaggerItem,
} from "@/components/ui/motion";

export default function Hero() {
  const shouldReduceMotion = useReducedMotion();

  const floatTransition = {
    duration: 5,
    repeat: Infinity,
    repeatType: "mirror" as const,
    ease: "easeInOut" as const,
  };

  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-green-50/70 via-white to-white">
      {/* Static gradient layers preserve the light theme without adding render cost. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[30rem] bg-[radial-gradient(ellipse_at_top,rgba(187,247,208,0.55),transparent_68%)]"
      />
      <motion.div
        aria-hidden="true"
        animate={shouldReduceMotion ? undefined : { x: [0, 18, 0], y: [0, -14, 0] }}
        transition={{ ...floatTransition, duration: 8 }}
        className="pointer-events-none absolute -left-24 top-8 -z-10 h-72 w-72 rounded-full bg-green-200/40 blur-3xl"
      />
      <motion.div
        aria-hidden="true"
        animate={shouldReduceMotion ? undefined : { x: [0, -16, 0], y: [0, 12, 0] }}
        transition={{ ...floatTransition, duration: 9 }}
        className="pointer-events-none absolute -right-20 bottom-0 -z-10 h-96 w-96 rounded-full bg-lime-200/35 blur-3xl"
      />

      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-14 px-6 py-20 sm:py-24 lg:flex-row lg:gap-20 lg:py-28">
        <div className="relative z-10 flex-1 text-center lg:text-left">
          <StaggerContainer className="flex flex-col items-center lg:items-start" stagger={0.1}>
            <StaggerItem>
              <span className="inline-flex rounded-full border border-green-200/80 bg-white/80 px-4 py-2 text-sm font-semibold tracking-tight text-green-700 shadow-sm backdrop-blur-sm">
                🌱 AI Powered Smart Agriculture
              </span>
            </StaggerItem>

            <StaggerItem className="mt-7 sm:mt-8">
              <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.03] tracking-[-0.045em] text-gray-950 sm:text-6xl lg:text-7xl">
                <RevealText className="block">Autonomous</RevealText>
                <RevealText className="block">Intelligence</RevealText>
                <RevealText className="block">for Agriculture</RevealText>
              </h1>
            </StaggerItem>

            <StaggerItem className="mt-6 sm:mt-7">
              <p className="max-w-xl text-base leading-7 text-gray-600 sm:text-lg sm:leading-8">
                Monitor crops, automate irrigation, analyze environmental conditions and receive AI
                recommendations from one intelligent cloud platform.
              </p>
            </StaggerItem>

            <StaggerItem className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-4 lg:justify-start">
              <MagneticButton
                className="rounded-full bg-green-700 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(21,128,61,0.24)] outline-none ring-offset-2 hover:bg-green-800 hover:shadow-[0_16px_34px_rgba(21,128,61,0.32)] focus-visible:ring-2 focus-visible:ring-green-700 sm:px-8 sm:py-4"
                type="button"
              >
                Get Started
              </MagneticButton>
              <MagneticButton
                className="rounded-full border border-green-200 bg-white/75 px-7 py-3.5 text-sm font-semibold text-green-800 shadow-sm outline-none ring-offset-2 hover:border-green-300 hover:bg-green-50 hover:shadow-[0_12px_24px_rgba(21,128,61,0.10)] focus-visible:ring-2 focus-visible:ring-green-700 sm:px-8 sm:py-4"
                type="button"
              >
                Learn More
              </MagneticButton>
            </StaggerItem>

            <StaggerItem className="mt-10 grid w-full max-w-md grid-cols-3 gap-3 border-t border-green-100 pt-7 sm:mt-12 sm:gap-6 lg:max-w-lg">
              <HeroStat label="Monitoring" value="24/7" />
              <HeroStat label="Recommendations" value="AI" />
              <HeroStat label="Dashboard" value="Cloud" />
            </StaggerItem>
          </StaggerContainer>
        </div>

        <FadeUp className="relative flex-1" delay={0.15}>
          <motion.div
            animate={shouldReduceMotion ? undefined : { y: [0, -8, 0] }}
            transition={{ ...floatTransition, duration: 6 }}
            className="relative overflow-hidden rounded-[2rem] border border-green-100/80 bg-white p-1.5 shadow-[0_24px_70px_rgba(20,83,45,0.16)] sm:rounded-[2.25rem]"
          >
            <div className="absolute inset-x-0 top-0 z-10 h-1/3 bg-gradient-to-b from-white/30 to-transparent" />
            <Image
              src="/hero.png"
              alt="Smart Agriculture"
              width={900}
              height={700}
              priority
              className="relative aspect-[9/7] w-full rounded-[1.6rem] object-cover sm:rounded-[1.9rem]"
            />

            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, -5, 0] }}
              transition={{ ...floatTransition, duration: 4.5 }}
              className="absolute left-5 top-5 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-sm font-semibold text-gray-700 shadow-lg backdrop-blur-md sm:left-7 sm:top-7 sm:px-4"
            >
              🌡️ 24°C
            </motion.div>
            <motion.div
              animate={shouldReduceMotion ? undefined : { y: [0, 5, 0] }}
              transition={{ ...floatTransition, duration: 5.5 }}
              className="absolute bottom-5 right-5 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-sm font-semibold text-gray-700 shadow-lg backdrop-blur-md sm:bottom-7 sm:right-7 sm:px-4"
            >
              💧 Humidity 63%
            </motion.div>
          </motion.div>
        </FadeUp>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-gray-500 sm:text-sm">{label}</p>
    </div>
  );
}
