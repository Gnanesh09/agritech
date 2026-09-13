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
        h-full rounded-[1.5rem] border border-[#174b36]/10 bg-[#fbfcf8] p-7
        shadow-[0_12px_32px_rgba(20,61,43,0.06)] transition-[transform,box-shadow,border-color]
        duration-300 hover:-translate-y-1 hover:border-[#174b36]/25 hover:shadow-[0_20px_40px_rgba(20,61,43,0.12)]
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
