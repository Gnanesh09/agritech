"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  ArrowUpRight,
  BrainCircuit,
  CloudRain,
  Droplets,
  Smartphone,
  Wheat,
} from "lucide-react";
import { useRef } from "react";

const nodes = [
  {
    icon: CloudRain,
    title: "Weather",
    description: "Tracks weather conditions in real time.",
    tag: "01",
  },
  {
    icon: Droplets,
    title: "Smart Irrigation",
    description: "Waters crops only when required.",
    tag: "02",
  },
  {
    icon: Smartphone,
    title: "Mobile App",
    description: "Monitor and control your farm remotely.",
    tag: "03",
  },
  {
    icon: BrainCircuit,
    title: "AI Intelligence",
    description: "Analyzes your farm and makes smart decisions.",
    tag: "04",
  },
];

function FeatureCard({
  node,
  index,
}: {
  node: (typeof nodes)[number];
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);

  const smoothX = useSpring(mouseX, {
    stiffness: 120,
    damping: 20,
  });

  const smoothY = useSpring(mouseY, {
    stiffness: 120,
    damping: 20,
  });

  const rotateX = useTransform(smoothY, [0, 100], [3, -3]);
  const rotateY = useTransform(smoothX, [0, 100], [-3, 3]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(50);
    mouseY.set(50);
  };

  const Icon = node.icon;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
      }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 900,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative min-h-[205px] overflow-hidden rounded-[1.7rem] border border-[#dfe6dc] bg-white/75 p-7 backdrop-blur-sm transition-[border,box-shadow,background-color,transform] duration-500 hover:border-[#a8c29a] hover:bg-white hover:shadow-[0_25px_60px_rgba(36,75,50,0.10)]"
    >
      {/* Cursor-following spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(
            180px circle at ${smoothX.get()}% ${smoothY.get()}%,
            rgba(185,212,141,0.24),
            transparent 70%
          )`,
        }}
      />

      {/* Soft decorative glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#b9d48d]/20 blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <motion.div
            whileHover={{
              scale: 1.08,
              rotate: -4,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 15,
            }}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4e7] text-[#5d8e3e] transition-colors duration-300 group-hover:bg-[#5d8e3e] group-hover:text-white"
          >
            <Icon size={21} strokeWidth={1.8} />
          </motion.div>

          <span className="text-xs font-medium text-[#a0aea4] transition-colors duration-300 group-hover:text-[#6b8f4e]">
            {node.tag}
          </span>
        </div>

        <div className="mt-7">
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#12382a]">
            {node.title}
          </h3>

          <p className="mt-2 max-w-xs text-sm leading-6 text-[#718078]">
            {node.description}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -5 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="absolute bottom-0 right-0"
        >
          <ArrowUpRight
            size={18}
            className="text-[#5d8e3e] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Ecosystem() {
  return (
    <section
      id="ecosystem"
      className="relative overflow-hidden bg-[#f7f8f2] py-24 sm:py-32"
    >
      {/* Section background glow */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -20, 25, 0],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute left-1/2 top-0 h-[550px] w-[750px] -translate-x-1/2 rounded-full bg-[#dcebcf]/40 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 flex flex-col justify-between gap-8 lg:mb-20 lg:flex-row lg:items-end"
        >
          <div className="max-w-2xl">
            <div className="mb-5 flex items-center gap-3">
              <motion.span
                animate={{
                  scale: [1, 1.35, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                }}
                className="h-2 w-2 rounded-full bg-[#5d8e3e]"
              />

              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#5d8e3e]">
                Smart Ecosystem
              </span>
            </div>

            <h2 className="text-4xl font-semibold tracking-[-0.05em] text-[#12382a] sm:text-5xl lg:text-6xl">
              Everything works
              <br />
              <span className="text-[#6b8f4e]">together.</span>
            </h2>
          </div>

          <p className="max-w-md text-base leading-7 text-[#617369] sm:text-lg">
            Smart Agri connects every part of your farm into one intelligent
            system — from real-time monitoring to automated decisions.
          </p>
        </motion.div>

        {/* Main layout */}
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Main Smart Agri card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-[2rem] bg-[#123d2b] p-8 sm:p-10 lg:col-span-5 lg:min-h-[430px]"
          >
            {/* Animated glow */}
            <motion.div
              animate={{
                x: [0, 35, -20, 0],
                y: [0, -25, 20, 0],
                scale: [1, 1.15, 0.95, 1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8caf68]/20 blur-3xl"
            />

            <div className="relative flex h-full flex-col justify-between">
              <div>
                <motion.div
                  animate={{
                    y: [0, -4, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#dcebcf] text-[#174b36]"
                >
                  <Wheat size={27} strokeWidth={1.8} />
                </motion.div>

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b9d48d]">
                  One connected system
                </span>

                <h3 className="mt-4 max-w-sm text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                  Your farm,
                  <br />
                  working smarter.
                </h3>

                <p className="mt-5 max-w-sm text-sm leading-6 text-green-50/65 sm:text-base">
                  Sensors, automation, AI and your mobile app work together to
                  help you manage your crops with less effort.
                </p>
              </div>

              <div className="mt-10 flex items-center gap-3 text-sm font-medium text-[#dcebcf]">
                <motion.span
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="h-2 w-2 rounded-full bg-[#b9d48d]"
                />

                Live intelligent system
              </div>
            </div>
          </motion.div>

          {/* Feature cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
            {nodes.map((node, index) => (
              <FeatureCard key={node.title} node={node} index={index} />
            ))}
          </div>
        </div>

        {/* Healthy Crops result */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          whileHover={{ y: -3 }}
          className="group relative mt-4 flex flex-col justify-between gap-6 overflow-hidden rounded-[1.7rem] border border-[#dfe6dc] bg-[#edf4e7] p-7 sm:flex-row sm:items-center sm:p-8"
        >
          {/* Hover glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#b9d48d]/30 blur-3xl opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

          <div className="relative z-10 flex items-center gap-5">
            <motion.div
              whileHover={{
                scale: 1.08,
                rotate: -5,
              }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5d8e3e] text-white"
            >
              <Wheat size={22} strokeWidth={1.8} />
            </motion.div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b8f4e]">
                The result
              </span>

              <h3 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-[#12382a]">
                Healthy Crops
              </h3>
            </div>
          </div>

          <p className="relative z-10 max-w-xl text-sm leading-6 text-[#617369] sm:text-right sm:text-base">
            Higher yield with less effort and water — powered by a system that
            continuously learns and responds.
          </p>
        </motion.div>
      </div>
    </section>
  );
}