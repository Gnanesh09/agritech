"use client";

import { MouseGlow } from "@/components/animations";

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

export default function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <MouseGlow
      className="
        group
        rounded-3xl
        border
        border-green-100
        bg-white/80
        backdrop-blur-xl
        p-9
        transition-all
        duration-300
        hover:-translate-y-2
        hover:shadow-xl
        hover:shadow-green-100
        hover:border-green-200
      "
    >
      <div
        className="
          mb-6
          flex
          h-12 w-12
          items-center
          justify-center
          rounded-2xl bg-[#e5efd8] text-[#236044]
          transition-all
          duration-300
          group-hover:scale-110
          group-hover:bg-green-100
        "
      >
        {icon}
      </div>

      <h3 className="mb-3 text-xl font-semibold tracking-[-0.025em] text-[#173c2c]">
        {title}
      </h3>

      <p className="text-sm leading-7 text-[#617369] sm:text-base">
        {description}
      </p>
    </MouseGlow>
  );
}
