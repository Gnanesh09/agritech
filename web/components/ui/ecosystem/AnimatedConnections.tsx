const line = {
  fill: "none",
  stroke: "#8aac68",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  opacity: 0.55,
};

export default function AnimatedConnections() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 850" preserveAspectRatio="none" aria-hidden="true">
      <path d="M600 110 C600 170,600 220,600 285" {...line} />
      <path d="M170 340 C290 340,390 340,470 360 S540 390,548 398" {...line} />
      <path d="M1030 340 C910 340,810 340,730 360 S660 390,652 398" {...line} />
      <path d="M300 690 C390 690,450 640,505 565 S555 500,565 470" {...line} />
      <path d="M900 690 C810 690,750 640,695 565 S645 500,635 470" {...line} />
    </svg>
  );
}
