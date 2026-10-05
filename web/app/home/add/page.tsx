"use client";

import { motion } from "framer-motion";
import {
  Cpu,
  Layers3,
  Sprout,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";

const options = [
  {
    title: "Add Device",
    description: "Connect your ESP32 and smart hardware",
    icon: Cpu,
    route: "/home/add/device",
  },
  {
    title: "Add Rack",
    description: "Create a rack for your growing space",
    icon: Layers3,
    route: "/home/add/rack",
  },
  {
    title: "Add Crop",
    description: "Add a crop to one of your trays",
    icon: Sprout,
    route: "/home/add/crop",
  },
];

export default function AddPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071A13] px-4 pb-10 pt-6 text-[#F1F7F2]">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-[#35C759]/10 blur-3xl" />

      <div className="pointer-events-none absolute -right-24 top-[45%] h-72 w-72 rounded-full bg-[#7CFF6B]/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[430px]">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center gap-3">

            {/* Add icon */}
            <motion.div
              initial={{ scale: 0.7, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                duration: 0.5,
                type: "spring",
              }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#28513B] bg-[#0D251C]"
            >
              <Plus
                size={21}
                className="text-[#7CFF6B]"
                strokeWidth={2}
              />
            </motion.div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7CFF6B]">
                Smart Agriculture
              </p>

              <p className="mt-0.5 text-[11px] text-[#718C7D]">
                System configuration
              </p>
            </div>
          </div>

          <h1 className="text-[30px] font-bold tracking-tight text-[#F1F7F2]">
            Build your farm
          </h1>

          <p className="mt-2 max-w-[340px] text-[13px] leading-5 text-[#8DA99A]">
            Add devices, racks and crops to build your smart growing
            environment.
          </p>
        </motion.div>

        {/* Add options */}
        <div className="space-y-3">
          {options.map((option, index) => {
            const Icon = option.icon;

            return (
              <motion.button
                key={option.title}
                type="button"
                onClick={() => router.push(option.route)}
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  delay: 0.12 + index * 0.1,
                  duration: 0.45,
                }}
                whileHover={{
                  y: -3,
                }}
                whileTap={{
                  scale: 0.975,
                }}
                className="group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] border border-[#1D4032] bg-[#0D251C] p-4 text-left shadow-[0_12px_35px_rgba(0,0,0,0.16)] transition-all duration-300 hover:border-[#35C759]/40 hover:bg-[#102A20]"
              >
                {/* Hover glow */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#7CFF6B]/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                {/* Icon */}
                <motion.div
                  whileHover={{
                    scale: 1.06,
                    rotate: 2,
                  }}
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] border border-[#28513B] bg-[#102D22]"
                >
                  <Icon
                    size={25}
                    className="text-[#7CFF6B]"
                    strokeWidth={1.7}
                  />

                  {/* Status dot */}
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#7CFF6B] shadow-[0_0_8px_#7CFF6B]" />
                </motion.div>

                {/* Text */}
                <div className="relative min-w-0 flex-1">
                  <h2 className="text-[15px] font-semibold text-[#F1F7F2]">
                    {option.title}
                  </h2>

                  <p className="mt-1 text-[11px] leading-4 text-[#8DA99A]">
                    {option.description}
                  </p>
                </div>

                {/* Arrow */}
                <motion.div
                  whileHover={{
                    x: 3,
                  }}
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#1D4032] bg-[#102D22]"
                >
                  <ChevronRight
                    size={17}
                    className="text-[#7CFF6B]"
                    strokeWidth={1.8}
                  />
                </motion.div>
              </motion.button>
            );
          })}
        </div>

      </div>
    </main>
  );
}