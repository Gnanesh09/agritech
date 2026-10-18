"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Layers3,
  Plus,
  Minus,
  Sparkles,
  MapPin,
  Boxes,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AddRackPage() {
  const router = useRouter();

  const [rackName, setRackName] = useState("");
  const [location, setLocation] = useState("");
  const [levels, setLevels] = useState(3);

  const isComplete = rackName.trim().length > 0;

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const item = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.98,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.45,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen overflow-hidden bg-[#071A13] px-4 pb-10 pt-6 text-[#F1F7F2] sm:px-6 lg:px-8"
    >
      {/* Ambient background */}
      <motion.div
        animate={{
          x: [0, 20, 0],
          y: [0, -15, 0],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#35C759]/10 blur-3xl"
      />

      <motion.div
        animate={{
          x: [0, -18, 0],
          y: [0, 14, 0],
        }}
        transition={{
          duration: 9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full bg-[#7CFF6B]/5 blur-3xl"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl">

        {/* Header */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mb-7"
        >
          <motion.button
            variants={item}
            type="button"
            onClick={() => router.back()}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className="mb-5 flex h-9 w-9 items-center justify-center rounded-full border border-[#1D4032] bg-[#0D251C] text-[#B6CBBE] shadow-[0_8px_25px_rgba(0,0,0,0.18)]"
          >
            <ArrowLeft size={18} />
          </motion.button>

          <div className="flex items-center gap-3">

            {/* Rack icon */}
            <motion.div
              variants={item}
              animate={{
                y: [0, -5, 0],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative flex h-14 w-14 items-center justify-center rounded-[18px] border border-[#315A42] bg-[#102D22] shadow-[0_10px_30px_rgba(53,199,89,0.10)]"
            >
              <motion.div
                animate={{
                  scale: [1, 1.18, 1],
                  opacity: [0.15, 0.3, 0.15],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-[18px] bg-[#7CFF6B] blur-xl"
              />

              <Layers3
                size={25}
                className="relative z-10 text-[#7CFF6B]"
                strokeWidth={1.8}
              />
            </motion.div>

            <motion.div variants={item}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#7CFF6B]">
                Growing Space
              </p>

              <h1 className="mt-1 text-[27px] font-bold tracking-tight text-[#F1F7F2]">
                Add Rack
              </h1>
            </motion.div>
          </div>

          <motion.p
            variants={item}
            className="mt-3 max-w-[350px] text-[13px] leading-5 text-[#8DA99A]"
          >
            Create a rack to organize your growing levels, trays, and crops.
          </motion.p>
        </motion.div>

        {/* Form */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >

          {/* Rack name */}
          <motion.div
            variants={item}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 35px rgba(0,0,0,0.20)",
            }}
            className="rounded-[22px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.12)]"
          >
            <label className="flex items-center gap-2 text-[12px] font-semibold text-[#D8E8DE]">
              <Boxes size={14} className="text-[#7CFF6B]" />
              Rack name
            </label>

            <input
              type="text"
              value={rackName}
              onChange={(e) => setRackName(e.target.value)}
              placeholder="Example: Rack 1"
              className="mt-2 w-full rounded-[15px] border border-[#1D4032] bg-[#102D22] px-3 py-3 text-[13px] text-[#F1F7F2] outline-none transition-all placeholder:text-[#668072] focus:border-[#7CFF6B] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.07)]"
            />
          </motion.div>

          {/* Location */}
          <motion.div
            variants={item}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 35px rgba(0,0,0,0.20)",
            }}
            className="rounded-[22px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.12)]"
          >
            <label className="flex items-center gap-2 text-[12px] font-semibold text-[#D8E8DE]">
              <MapPin size={14} className="text-[#7CFF6B]" />
              Location
            </label>

            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Example: Greenhouse A"
              className="mt-2 w-full rounded-[15px] border border-[#1D4032] bg-[#102D22] px-3 py-3 text-[13px] text-[#F1F7F2] outline-none transition-all placeholder:text-[#668072] focus:border-[#7CFF6B] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.07)]"
            />
          </motion.div>

          {/* Levels */}
          <motion.div
            variants={item}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 35px rgba(0,0,0,0.20)",
            }}
            className="rounded-[22px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.12)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-[12px] font-semibold text-[#D8E8DE]">
                  <Layers3 size={14} className="text-[#7CFF6B]" />
                  Rack levels
                </p>

                <p className="mt-1 text-[10px] text-[#668072]">
                  Number of growing levels
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-[14px] border border-[#1D4032] bg-[#102D22] p-1.5">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() =>
                    setLevels(Math.max(1, levels - 1))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#16382A] text-[#9EB5A6] transition-colors hover:bg-[#1D4834] hover:text-[#7CFF6B]"
                >
                  <Minus size={15} />
                </motion.button>

                <AnimatePresence mode="wait">
                  <motion.span
                    key={levels}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="w-6 text-center text-[16px] font-bold text-[#F1F7F2]"
                  >
                    {levels}
                  </motion.span>
                </AnimatePresence>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.85 }}
                  onClick={() =>
                    setLevels(Math.min(10, levels + 1))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#16382A] text-[#9EB5A6] transition-colors hover:bg-[#1D4834] hover:text-[#7CFF6B]"
                >
                  <Plus size={15} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Rack visual preview */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="relative mt-5 overflow-hidden rounded-[24px] border border-[#28513B] bg-[#102D22] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8DA99A]">
                Rack Preview
              </p>

              <AnimatePresence mode="wait">
                <motion.p
                  key={rackName || "rack"}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mt-1 text-[15px] font-semibold text-[#F1F7F2]"
                >
                  {rackName || "Your Rack"}
                </motion.p>
              </AnimatePresence>
            </div>

            <Sparkles
              size={17}
              className="text-[#7CFF6B]"
            />
          </div>

          {/* Rack visualization */}
          <div className="mt-5 flex justify-center">
            <div className="relative w-[210px]">

              {/* Rack frame */}
              <div className="absolute bottom-0 left-5 top-0 w-[3px] rounded-full bg-[#416B51]" />
              <div className="absolute bottom-0 right-5 top-0 w-[3px] rounded-full bg-[#416B51]" />

              <div className="space-y-2">
                {Array.from({ length: levels }).map((_, index) => (
                  <motion.div
                    key={levels - index}
                    initial={{
                      opacity: 0,
                      scaleX: 0.7,
                    }}
                    animate={{
                      opacity: 1,
                      scaleX: 1,
                    }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.06,
                    }}
                    className="relative mx-5 h-[31px] origin-center rounded-[8px] border border-[#315A42] bg-[#16382A]"
                  >
                    <div className="absolute inset-x-3 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-[#416B51]" />

                    <motion.div
                      animate={{
                        opacity: [0.35, 0.7, 0.35],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: index * 0.2,
                      }}
                      className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#7CFF6B]"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Bottom feet */}
              <div className="mx-3 mt-2 h-2 rounded-full bg-[#28513B]" />
            </div>
          </div>

          {/* Rack information */}
          <div className="mt-5 grid grid-cols-2 gap-3">

            <div className="rounded-[15px] border border-[#1D4032] bg-[#0D251C] p-3">
              <p className="text-[9px] uppercase tracking-[0.08em] text-[#668072]">
                Capacity
              </p>

              <p className="mt-1 text-[14px] font-semibold text-[#F1F7F2]">
                {levels * 3} trays
              </p>
            </div>

            <div className="rounded-[15px] border border-[#1D4032] bg-[#0D251C] p-3">
              <p className="text-[9px] uppercase tracking-[0.08em] text-[#668072]">
                Location
              </p>

              <p className="mt-1 truncate text-[14px] font-semibold text-[#F1F7F2]">
                {location || "Not set"}
              </p>
            </div>

          </div>
        </motion.div>

        {/* Status */}
        <motion.div
          layout
          className="mt-4 flex items-center gap-3 rounded-[18px] border border-[#1D4032] bg-[#0D251C] p-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#7CFF6B]/10">
            {isComplete ? (
              <Check size={17} className="text-[#7CFF6B]" />
            ) : (
              <Sparkles size={17} className="text-[#7CFF6B]" />
            )}
          </div>

          <div>
            <p className="text-[11px] font-semibold text-[#D8E8DE]">
              {isComplete
                ? "Rack ready to create"
                : "Rack setup in progress"}
            </p>

            <p className="mt-0.5 text-[9px] text-[#668072]">
              {isComplete
                ? "Your rack details are ready."
                : "Enter a rack name to continue."}
            </p>
          </div>
        </motion.div>

        {/* Create button */}
        <motion.button
          type="button"
          disabled={!isComplete}
          whileHover={
            isComplete
              ? {
                  scale: 1.015,
                  y: -2,
                }
              : undefined
          }
          whileTap={
            isComplete
              ? {
                  scale: 0.97,
                }
              : undefined
          }
          className="group relative mt-5 w-full overflow-hidden rounded-[17px] bg-[#7CFF6B] py-3.5 text-[13px] font-bold text-[#071A13] shadow-[0_10px_30px_rgba(124,255,107,0.15)] transition-all disabled:cursor-not-allowed disabled:bg-[#183126] disabled:text-[#597264] disabled:shadow-none"
        >
          {isComplete && (
            <motion.div
              animate={{ x: ["-120%", "180%"] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeInOut",
              }}
              className="absolute inset-y-0 w-16 rotate-[18deg] bg-white/30 blur-md"
            />
          )}

          <span className="relative z-10 flex items-center justify-center gap-2">
            {isComplete ? (
              <>
                <Layers3 size={16} />
                Create Rack
              </>
            ) : (
              "Enter Rack Name"
            )}
          </span>
        </motion.button>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#5F786A]"
        >
          <Sparkles size={12} />
          Your growing structure starts here
        </motion.div>

      </div>
    </motion.main>
  );
}