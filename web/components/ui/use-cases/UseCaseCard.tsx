"use client";

import { Floating, MouseGlow } from "@/components/animations";
import { LucideIcon } from "lucide-react";

interface UseCaseCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  tags: string[];
  index: number;
}

export default function UseCaseCard({
  icon: Icon,
  title,
  description,
  gradient,
  tags,
  index,
}: UseCaseCardProps) {
  return (
    <MouseGlow
      className="group relative h-full rounded-[1.5rem] border border-[#174b36]/10 bg-[#fbfcf8] p-7 shadow-[0_12px_32px_rgba(20,61,43,0.06)] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(20,61,43,0.12)]"
    >
      {/* Background Glow */}
      <div
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-3xl transition-all duration-700 group-hover:scale-150`}
      />

      {/* Icon */}
      <Floating y={3} duration={4.5} delay={index * 0.15}>
        <div
          className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-[8deg] group-hover:scale-[1.08]`}
        >
          <Icon size={30} />
        </div>
      </Floating>

      {/* Content */}
      <div className="relative z-10 mt-8">
        <h3 className="text-xl font-semibold tracking-[-0.025em] text-[#173c2c]">
          {title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-[#617369]">
          {description}
        </p>
      </div>

      {/* Feature Tags */}
      <div className="relative z-10 mt-8 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#174b36]/10 bg-white px-3 py-1 text-xs font-semibold text-[#236044] transition-colors duration-300 group-hover:border-[#174b36]/20"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Bottom Accent */}
      <div
        className={`absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r ${gradient} transition-[width] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full`}
      />
    </MouseGlow>
  );
}
