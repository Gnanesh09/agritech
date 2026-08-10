"use client";

import { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({
  children,
}: PhoneFrameProps) {
  return (
    <div className="relative">

      {/* Glow */}

      <div className="absolute inset-0 rounded-[60px] bg-green-300/20 blur-3xl" />

      {/* Phone */}

      <div
        className="
        relative
        h-[760px]
        w-[360px]
        rounded-[48px]
        border-[12px]
        border-black
        bg-black
        shadow-[0_40px_120px_rgba(0,0,0,.35)]
        "
      >

        {/* Screen */}

        <div
          className="
          relative
          h-full
          overflow-hidden
          rounded-[36px]
          bg-[#F8FBF8]
          "
        >

          {children}

        </div>

      </div>

    </div>
  );
}