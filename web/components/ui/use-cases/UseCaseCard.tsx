import { LucideIcon } from "lucide-react";

interface UseCaseCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  tags: string[];
}

export default function UseCaseCard({
  icon: Icon,
  title,
  description,
  gradient,
  tags,
}: UseCaseCardProps) {
  return (
    <div className="group relative h-full overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-6 shadow-[0_14px_32px_rgba(0,0,0,0.12)] transition-[transform,background-color] duration-300 hover:-translate-y-1 hover:bg-white/[0.11] sm:p-7">
      {/* Background Glow */}
      <div
        className={`absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-3xl`}
      />

      {/* Icon */}
      <div className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
        <Icon size={24} />
      </div>

      {/* Content */}
      <div className="relative z-10 mt-8">
        <h3 className="text-xl font-semibold tracking-[-0.025em] text-white">
          {title}
        </h3>

        <p className="mt-3 text-sm leading-7 text-green-50/70">
          {description}
        </p>
      </div>

      {/* Feature Tags */}
      <div className="relative z-10 mt-8 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-green-50/80"
          >
            {tag}
          </span>
        ))}
      </div>

    </div>
  );
}
