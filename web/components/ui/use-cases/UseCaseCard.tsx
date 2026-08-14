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
      className="group relative rounded-[30px] border border-green-100 bg-white/80 p-8 shadow-xl backdrop-blur-xl transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2 hover:scale-[1.02] hover:shadow-[0_30px_60px_rgba(34,197,94,0.18)]"
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
        <h3 className="text-2xl font-bold text-slate-900">
          {title}
        </h3>

        <p className="mt-4 leading-7 text-slate-600">
          {description}
        </p>
      </div>

      {/* Feature Tags */}
      <div className="relative z-10 mt-8 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-green-100 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 transition-all duration-300 group-hover:border-green-200 group-hover:bg-green-100"
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
