"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sprout,
  ChevronDown,
  Leaf,
  Sparkles,
  Check,
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";

export default function AddCropPage() {
  const router = useRouter();

  const [cropName, setCropName] = useState("");
  const [cropType, setCropType] = useState("");
  const [rack, setRack] = useState("");
  const [tray, setTray] = useState("");

  const isComplete =
    !!cropName.trim() && !!cropType && !!rack && !!tray;

  const container: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const item: Variants = {
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
      {/* Background glow */}
      <motion.div
        animate={{
          x: [0, 20, 0],
          y: [0, -15, 0],
          scale: [1, 1.1, 1],
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
          x: [0, -15, 0],
          y: [0, 15, 0],
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

            {/* Animated icon */}
            <motion.div
              variants={item}
              animate={{
                y: [0, -5, 0],
                rotate: [0, 2, -2, 0],
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
                  scale: [1, 1.2, 1],
                  opacity: [0.15, 0.3, 0.15],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-[18px] bg-[#7CFF6B] blur-xl"
              />

              <Sprout
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
                Add Crop
              </h1>
            </motion.div>
          </div>

          <motion.p
            variants={item}
            className="mt-3 max-w-[350px] text-[13px] leading-5 text-[#8DA99A]"
          >
            Add a crop and place it inside one of your growing trays.
          </motion.p>
        </motion.div>

        {/* Form */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >

          {/* Crop Name */}
          <motion.div
            variants={item}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 35px rgba(0,0,0,0.20)",
            }}
            className="rounded-[22px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.12)]"
          >
            <label className="flex items-center gap-2 text-[12px] font-semibold text-[#D8E8DE]">
              <Leaf size={14} className="text-[#7CFF6B]" />
              Crop name
            </label>

            <input
              type="text"
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              placeholder="Example: Pea Shoots"
              className="mt-2 w-full rounded-[15px] border border-[#1D4032] bg-[#102D22] px-3 py-3 text-[13px] text-[#F1F7F2] outline-none transition-all placeholder:text-[#668072] focus:border-[#7CFF6B] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.07)]"
            />
          </motion.div>

          {/* Crop Type */}
          <motion.div
            variants={item}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 35px rgba(0,0,0,0.20)",
            }}
            className="rounded-[22px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.12)]"
          >
            <label className="flex items-center gap-2 text-[12px] font-semibold text-[#D8E8DE]">
              <Sprout size={14} className="text-[#7CFF6B]" />
              Crop type
            </label>

            <div className="relative mt-2">
              <select
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                className="w-full appearance-none rounded-[15px] border border-[#1D4032] bg-[#102D22] px-3 py-3 pr-10 text-[13px] text-[#F1F7F2] outline-none transition-all focus:border-[#7CFF6B] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.07)]"
              >
                <option value="">Select crop type</option>
                <option value="microgreens">Microgreens</option>
                <option value="leafy-greens">Leafy Greens</option>
                <option value="herbs">Herbs</option>
                <option value="vegetables">Vegetables</option>
                <option value="other">Other</option>
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#789487]"
              />
            </div>
          </motion.div>

          {/* Rack */}
          <motion.div
            variants={item}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 35px rgba(0,0,0,0.20)",
            }}
            className="rounded-[22px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.12)]"
          >
            <label className="text-[12px] font-semibold text-[#D8E8DE]">
              Rack
            </label>

            <div className="relative mt-2">
              <select
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                className="w-full appearance-none rounded-[15px] border border-[#1D4032] bg-[#102D22] px-3 py-3 pr-10 text-[13px] text-[#F1F7F2] outline-none transition-all focus:border-[#7CFF6B] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.07)]"
              >
                <option value="">Select rack</option>
                <option value="rack-1">Rack 1</option>
                <option value="rack-2">Rack 2</option>
                <option value="rack-3">Rack 3</option>
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#789487]"
              />
            </div>
          </motion.div>

          {/* Tray */}
          <motion.div
            variants={item}
            whileHover={{
              y: -2,
              boxShadow: "0 14px 35px rgba(0,0,0,0.20)",
            }}
            className="rounded-[22px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_8px_25px_rgba(0,0,0,0.12)]"
          >
            <label className="text-[12px] font-semibold text-[#D8E8DE]">
              Tray
            </label>

            <div className="relative mt-2">
              <select
                value={tray}
                onChange={(e) => setTray(e.target.value)}
                className="w-full appearance-none rounded-[15px] border border-[#1D4032] bg-[#102D22] px-3 py-3 pr-10 text-[13px] text-[#F1F7F2] outline-none transition-all focus:border-[#7CFF6B] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.07)]"
              >
                <option value="">Select tray</option>
                <option value="tray-1">Tray 1</option>
                <option value="tray-2">Tray 2</option>
                <option value="tray-3">Tray 3</option>
              </select>

              <ChevronDown
                size={17}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#789487]"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Live Preview */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="relative mt-5 overflow-hidden rounded-[23px] border border-[#28513B] bg-[#102D22] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.16)]"
        >
          <motion.div
            animate={{ x: ["-120%", "180%"] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              repeatDelay: 4,
              ease: "easeInOut",
            }}
            className="pointer-events-none absolute inset-y-0 w-20 rotate-[18deg] bg-[#7CFF6B]/10 blur-xl"
          />

          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8DA99A]">
                Live Preview
              </p>

              <motion.div
                animate={{
                  scale: isComplete ? [1, 1.2, 1] : 1,
                }}
              >
                {isComplete ? (
                  <Check
                    size={17}
                    className="text-[#7CFF6B]"
                  />
                ) : (
                  <Sparkles
                    size={16}
                    className="text-[#7CFF6B]"
                  />
                )}
              </motion.div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${cropName}-${cropType}-${rack}-${tray}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="mt-3"
              >
                <p className="text-[16px] font-semibold capitalize text-[#F1F7F2]">
                  {cropName || "Your Crop"}
                </p>

                <p className="mt-1 text-[10px] capitalize text-[#8DA99A]">
                  {cropType
                    ? cropType.replace("-", " ")
                    : "Crop type not selected"}
                  {" · "}
                  {rack || "No rack"}
                  {" · "}
                  {tray || "No tray"}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Add Crop Button */}
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
                <Sprout size={16} />
                Add Crop
              </>
            ) : (
              "Complete the details"
            )}
          </span>
        </motion.button>

        {/* Footer hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#5F786A]"
        >
          <Sparkles size={12} />
          Your crop setup will appear here
        </motion.div>

      </div>
    </motion.main>
  );
}