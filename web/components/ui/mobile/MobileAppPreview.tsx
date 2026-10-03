"use client";

import { FadeLeft, FadeUp, Floating, ScaleIn } from "@/components/animations";
import PhoneFrame from "./PhoneFrame";
import AppScreen from "./AppScreen";


export default function MobileAppPreview() {
  return (
    <section
      id="mobile-app"
      className="relative overflow-hidden bg-white py-20 sm:py-28"
    >
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Floating
          className="absolute left-0 top-20 h-96 w-96 rounded-full bg-green-100 blur-3xl opacity-50"
          x={12}
          y={16}
          duration={8}
        >
          <span aria-hidden="true" />
        </Floating>
        <Floating
          className="absolute right-0 bottom-10 h-[450px] w-[450px] rounded-full bg-emerald-100 blur-3xl opacity-40"
          x={-12}
          y={-16}
          duration={9}
        >
          <span aria-hidden="true" />
        </Floating>
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-20">

        {/* Left Content */}
        <FadeLeft
          distance={80}
          duration={0.8}
        >
          <FadeUp>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5d8e3e]">
              Mobile App
            </span>

            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-[#12382a] sm:text-5xl">
              Smart Agriculture.
              <br />
              Anywhere.
            </h2>
          </FadeUp>

          <p className="mt-5 max-w-xl text-base leading-7 text-[#617369] sm:text-lg sm:leading-8">
            Stay connected to your farm with a beautifully designed mobile
            experience. Monitor sensors, receive AI insights, and control your
            automation system from anywhere in the world.
          </p>

          <div className="mt-8 space-y-4">

            <Feature text="Real-time sensor monitoring" />

            <Feature text="AI-powered recommendations" />

            <Feature text="Remote pump & fan control" />

            <Feature text="Instant notifications" />

          </div>
        </FadeLeft>

        {/* Phone */}
        <ScaleIn className="flex justify-center" duration={0.8}>
          <PhoneFrame>
            <AppScreen />
          </PhoneFrame>
        </ScaleIn>

      </div>
    </section>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-4">

      <div className="h-3 w-3 rounded-full bg-green-600" />

      <p className="text-base text-[#496156]">{text}</p>

    </div>
  );
}
