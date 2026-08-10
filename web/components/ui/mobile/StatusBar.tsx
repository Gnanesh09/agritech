"use client";

import {
  Wifi,
  Signal,
  BatteryFull,
} from "lucide-react";

export default function StatusBar() {
  return (
    <div className="flex items-center justify-between px-6 pt-2 text-[13px] font-semibold text-black">

      {/* Time */}

      <span className="tracking-tight">
        11:11
      </span>

      {/* Right */}

      <div className="flex items-center gap-3">

        <Signal
          size={15}
          strokeWidth={2.5}
        />

        <Wifi
          size={16}
          strokeWidth={3}
        />

        <div className="flex items-center">

          <BatteryFull
            size={12}
            strokeWidth={0.5}
          />

          <span className="-ml-5 text-[10px] font-bold">
            100
          </span>

        </div>

      </div>

    </div>
  );
}