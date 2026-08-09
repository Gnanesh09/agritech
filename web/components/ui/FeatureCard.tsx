"use client";

import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{
        y: -8,
      }}
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
        hover:shadow-xl
        hover:shadow-green-100
      "
    >
      <div
        className="
          mb-6
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-2xl
          bg-green-50
          text-green-600
          transition-transform
          duration-300
          group-hover:scale-110
        "
      >
        {icon}
      </div>

      <h3 className="mb-4 text-2xl font-bold text-zinc-900">
        {title}
      </h3>

      <p className="text-base leading-8 text-zinc-600">
        {description}
      </p>
    </motion.div>
  );
}