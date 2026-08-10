"use client";

import { animate } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
}

export default function AnimatedCounter({
  value,
  suffix = "",
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.8,
      onUpdate(latest) {
        setCount(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [value]);

  return (
  <span className="text-2xl font-extrabold tracking-tight text-slate-900">
    {count}
    <span className="ml-0.5 text-sm font-semibold text-slate-500">
      {suffix}
    </span>
  </span>
);
}