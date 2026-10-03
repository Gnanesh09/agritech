"use client";

import Image from "next/image";
import { ArrowRight, CloudSun, Droplets, Sprout } from "lucide-react";
import { FadeUp, Floating, ScaleIn } from "@/components/animations";

const highlights = [
  { value: "24/7", label: "Crop monitoring" },
  { value: "AI", label: "Field insights" },
  { value: "One", label: "Smart platform" },
];

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[#f7f8f2]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(ellipse_at_18%_0%,rgba(210,231,171,0.7),transparent_52%),radial-gradient(ellipse_at_88%_18%,rgba(177,212,185,0.48),transparent_45%)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 top-20 -z-10 h-72 w-72 rounded-full border border-green-900/10"
      />

      <div className="mx-auto grid min-h-[calc(100svh-6rem)] max-w-[1440px] items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-12 lg:py-20 xl:px-16">
        <div className="relative z-10 max-w-2xl pt-4 text-center lg:text-left">
          <FadeUp>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#174b36]/15 bg-white/70 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#236044] shadow-sm backdrop-blur-sm">
              <Sprout className="size-3.5" aria-hidden="true" />
              Smart agriculture, simplified
            </p>
          </FadeUp>

          <FadeUp className="mt-7" delay={0.08}>
            <h1 className="text-balance text-[2.7rem] font-semibold leading-[0.98] tracking-[-0.055em] text-[#12382a] sm:text-6xl lg:text-[clamp(3.7rem,5.4vw,5.5rem)]">
              Grow with clarity.
              <span className="block text-[#5d8e3e]">
                Farm with confidence.
              </span>
            </h1>
          </FadeUp>

          <FadeUp className="mt-6" delay={0.16}>
            <p className="mx-auto max-w-xl text-pretty text-base leading-7 text-[#496156] sm:text-lg sm:leading-8 lg:mx-0">
              Smart Agri brings crop monitoring, irrigation control,
              environmental analysis, and practical AI recommendations into
              one intelligent farming workspace.
            </p>
          </FadeUp>

          <FadeUp
            className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
            delay={0.24}
          >
            <a
              href="#contact"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-[#174b36] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(23,75,54,0.22)] transition-colors hover:bg-[#0e3928] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174b36]"
            >
              Start growing smarter
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </a>

            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-full border border-[#174b36]/20 bg-white/65 px-6 py-3.5 text-sm font-semibold text-[#174b36] shadow-sm transition-colors hover:border-[#174b36]/35 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#174b36]"
            >
              See how it works
            </a>
          </FadeUp>

          <FadeUp
            className="mt-10 grid grid-cols-3 border-t border-[#174b36]/15 pt-6 sm:mt-12"
            delay={0.32}
          >
            {highlights.map((highlight) => (
              <div
                className="border-r border-[#174b36]/15 px-2 first:pl-0 last:border-r-0 last:pr-0"
                key={highlight.label}
              >
                <p className="text-xl font-semibold tracking-[-0.04em] text-[#174b36] sm:text-2xl">
                  {highlight.value}
                </p>
                <p className="mt-1 text-xs font-medium text-[#617369] sm:text-sm">
                  {highlight.label}
                </p>
              </div>
            ))}
          </FadeUp>
        </div>

        <ScaleIn
          className="relative mx-auto w-full max-w-3xl lg:max-w-none"
          delay={0.12}
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-[#174b36] p-1 shadow-[0_28px_80px_rgba(20,61,43,0.22)] sm:rounded-[2.5rem] sm:p-1.5">
            <Image
              src="/hero-new.png"
              alt="A flourishing crop field supported by Smart Agri technology"
              width={1536}
              height={1024}
              priority
              sizes="(min-width: 1024px) 56vw, (min-width: 640px) 80vw, 100vw"
              className="aspect-[3/2] w-full rounded-[1.55rem] object-cover sm:rounded-[2rem]"
            />

            <div
              aria-hidden="true"
              className="absolute inset-3 rounded-[1.55rem] bg-gradient-to-t from-[#12382a]/45 via-transparent to-transparent sm:rounded-[2rem]"
            />

            <Floating
              className="absolute bottom-7 left-7 sm:bottom-10 sm:left-10"
              y={5}
              duration={6}
            >
              <div className="rounded-2xl border border-white/30 bg-white/90 px-3.5 py-3 shadow-xl backdrop-blur-md sm:px-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#174b36]">
                  <CloudSun className="size-4" aria-hidden="true" />
                  Field conditions
                </div>

                <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#173c2c]">
                  24°C{" "}
                  <span className="text-sm font-medium text-[#5a7266]">
                    Clear
                  </span>
                </p>
              </div>
            </Floating>

            <Floating
              className="absolute right-7 top-7 hidden sm:block sm:right-10 sm:top-10"
              y={-5}
              duration={6.5}
              delay={0.4}
            >
              <div className="rounded-2xl border border-white/30 bg-[#174b36]/90 px-4 py-3 text-white shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2 text-xs font-semibold text-green-100">
                  <Droplets className="size-4" aria-hidden="true" />
                  Soil moisture
                </div>

                <p className="mt-1 text-lg font-semibold tracking-[-0.03em]">
                  63%{" "}
                  <span className="text-sm font-medium text-green-100">
                    Optimal
                  </span>
                </p>
              </div>
            </Floating>
          </div>
        </ScaleIn>
      </div>
    </section>
  );
}