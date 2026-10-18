"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Wifi,
  X,
  Cpu,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "../../../lib/axios";

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: string;
  name: string | null;
  deviceModel: {
    id: string;
    name: string;
    code: string;
    imageUrl: string | null;
  };
};

type Step = "code" | "checking" | "found" | "naming" | "success";

export default function AddDevicePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("code");
  const [deviceCode, setDeviceCode] = useState("");
  const [device, setDevice] = useState<Device | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/device-success2.mp3");
    audioRef.current.preload = "auto";
  }, []);

  async function addDevice() {
    const code = deviceCode.trim().toUpperCase();

    if (!code) {
      setError("Enter your device code");
      return;
    }

    setError("");
    setStep("checking");

    try {
      const response = await api.post("/user/devices/claim", {
        deviceCode: code,
      });

      const claimedDevice = response.data.device;

      setDevice(claimedDevice);
      setStep("found");

      setTimeout(() => {
        setStep("naming");
      }, 1600);
    } catch (err: any) {
      console.error("Device claim failed:", err);

      setError(
        err?.response?.data?.message ||
          "This device cannot be added."
      );

      setStep("code");
    }
  }

  async function saveName() {
    if (!device) return;

    const name = deviceName.trim();

    if (!name) {
      setError("Give your device a name");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.patch(`/user/devices/${device.id}/name`, {
        name,
      });

      setStep("success");

      try {
        await audioRef.current?.play();
      } catch {}

      setTimeout(() => {
        router.replace("/home");
      }, 2800);
    } catch (err: any) {
      console.error("Failed to save device name:", err);

      setError(
        err?.response?.data?.message ||
          "Could not save the device name."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ============================================================
     CODE SCREEN
  ============================================================ */

  if (step === "code" || step === "checking") {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative min-h-screen overflow-hidden bg-[#071A13] px-5 text-[#F1F7F2] sm:px-8 lg:px-10"
      >
        {/* Ambient glow */}
        <motion.div
          animate={{
            x: [0, 25, 0],
            y: [0, -15, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[#35C759]/10 blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, -20, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="pointer-events-none absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-[#7CFF6B]/5 blur-3xl"
        />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col">

          {/* Back */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-6 lg:pt-8"
          >
            <motion.button
              type="button"
              onClick={() => router.back()}
              whileTap={{ scale: 0.9 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1D4032] bg-[#0D251C] text-[#B6CBBE]"
            >
              <ArrowLeft size={18} />
            </motion.button>
          </motion.header>

          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="flex flex-1 flex-col justify-center pb-24 lg:grid lg:grid-cols-2 lg:items-center lg:gap-20 lg:pb-12"
          >
            <div>
            {/* Icon */}
            <motion.div
              animate={{
                y: [0, -6, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative mb-7 flex h-16 w-16 items-center justify-center rounded-[20px] border border-[#315A42] bg-[#102D22] shadow-[0_12px_35px_rgba(53,199,89,0.12)]"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.15, 0.3, 0.15],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                }}
                className="absolute inset-0 rounded-[20px] bg-[#7CFF6B] blur-xl"
              />

              <Wifi
                size={28}
                className="relative z-10 text-[#7CFF6B]"
                strokeWidth={1.7}
              />
            </motion.div>

            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7CFF6B]">
              Device Setup
            </p>

            <h1 className="mt-3 text-[42px] font-semibold leading-[0.94] tracking-[-0.065em] text-[#F1F7F2]">
              Let's add
              <br />
              something
              <br />
              <span className="text-[#7CFF6B]">smart.</span>
            </h1>

            <p className="mt-5 max-w-[300px] text-[12px] leading-5 text-[#8DA99A]">
              Enter the device code printed on your smart agriculture
              device to connect it to your account.
            </p>
            </div>

            {/* Device code */}
            <div className="mt-9 lg:mt-0">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#668072]">
                Device code
              </label>

              <motion.div
                whileFocus={{ scale: 1.01 }}
                className="relative"
              >
                <input
                  autoFocus
                  value={deviceCode}
                  onChange={(event) => {
                    setDeviceCode(
                      event.target.value.toUpperCase()
                    );
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addDevice();
                    }
                  }}
                  placeholder="HUMIDE-000001"
                  disabled={step === "checking"}
                  className="h-[62px] w-full rounded-[20px] border border-[#1D4032] bg-[#0D251C] px-5 pr-14 text-[16px] font-semibold tracking-[0.03em] text-[#F1F7F2] outline-none transition-all placeholder:text-[#526D60] focus:border-[#7CFF6B] focus:bg-[#102D22] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.06)]"
                />

                {deviceCode && step !== "checking" && (
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={() => setDeviceCode("")}
                    className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#18382A] text-[#8DA99A]"
                  >
                    <X size={13} />
                  </motion.button>
                )}
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-3 rounded-[16px] border border-red-900/30 bg-red-950/30 px-4 py-3 text-[11px] font-medium text-red-300"
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Button */}
              <motion.button
                type="button"
                onClick={addDevice}
                disabled={
                  step === "checking" ||
                  !deviceCode.trim()
                }
                whileHover={
                  deviceCode.trim() && step !== "checking"
                    ? { scale: 1.015, y: -2 }
                    : undefined
                }
                whileTap={{ scale: 0.97 }}
                className="relative mt-4 flex h-[58px] w-full items-center justify-between overflow-hidden rounded-full bg-[#7CFF6B] px-5 text-[#071A13] shadow-[0_12px_30px_rgba(124,255,107,0.12)] transition disabled:cursor-not-allowed disabled:bg-[#183126] disabled:text-[#597264] disabled:shadow-none"
              >
                {step !== "checking" && deviceCode.trim() && (
                  <motion.div
                    animate={{ x: ["-120%", "180%"] }}
                    transition={{
                      duration: 2.8,
                      repeat: Infinity,
                      repeatDelay: 3,
                    }}
                    className="absolute inset-y-0 w-16 rotate-[18deg] bg-white/30 blur-md"
                  />
                )}

                <span className="relative z-10 text-[13px] font-bold">
                  {step === "checking"
                    ? "Checking device..."
                    : "Find my device"}
                </span>

                <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#071A13]/10">
                  {step === "checking" ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </span>
              </motion.button>
            </div>

            {/* Security info */}
            <div className="mt-5 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.12em] text-[#4F6D5D]">
              <ShieldCheck size={13} />
              Secure device pairing
            </div>
          </motion.section>
        </div>
      </motion.main>
    );
  }

  /* ============================================================
     DEVICE FOUND
  ============================================================ */

  if (step === "found") {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center overflow-hidden bg-[#050F0B]"
      >
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
          }}
          className="absolute h-[430px] w-[430px] rounded-full bg-[#7CFF6B] blur-[100px]"
        />

        <div className="relative flex flex-col items-center text-center">

          {/* Success ring */}
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 160,
              damping: 12,
            }}
            className="relative flex h-[130px] w-[130px] items-center justify-center rounded-full border border-[#7CFF6B]/20 bg-[#0D251C]"
          >
            <motion.div
              initial={{ scale: 0.6 }}
              animate={{ scale: [0.9, 1.08, 0.9] }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
              className="absolute h-[105px] w-[105px] rounded-full bg-[#7CFF6B]/10 blur-xl"
            />

            <div className="relative flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#7CFF6B] shadow-[0_0_50px_rgba(124,255,107,0.25)]">
              <Check
                size={43}
                strokeWidth={3}
                className="text-[#071A13]"
              />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-8 text-[30px] font-bold tracking-[-0.04em] text-[#F1F7F2]"
          >
            Device found
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7CFF6B]"
          >
            Successfully connected
          </motion.p>

          {device && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55 }}
              className="mt-6 rounded-full border border-[#28513B] bg-[#0D251C] px-5 py-2"
            >
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#8DA99A]">
                {device.deviceCode}
              </span>
            </motion.div>
          )}
        </div>
      </motion.main>
    );
  }

  /* ============================================================
     NAME DEVICE
  ============================================================ */

  if (step === "naming") {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative min-h-screen overflow-hidden bg-[#071A13] px-5 text-[#F1F7F2]"
      >
        <motion.div
          animate={{
            x: [0, 20, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="pointer-events-none absolute -right-28 -top-28 h-72 w-72 rounded-full bg-[#35C759]/10 blur-3xl"
        />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col">

          <header className="pt-6">
            <motion.button
              type="button"
              onClick={() => setStep("code")}
              whileTap={{ scale: 0.9 }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1D4032] bg-[#0D251C] text-[#B6CBBE]"
            >
              <ArrowLeft size={18} />
            </motion.button>
          </header>

          <section className="flex flex-1 flex-col justify-center pb-16">

            {/* Device image */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 14,
              }}
              className="mb-8 flex h-[170px] items-center justify-center"
            >
              {device?.deviceModel.imageUrl ? (
                <motion.img
                  animate={{
                    y: [0, -7, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  src={device.deviceModel.imageUrl}
                  alt={device.deviceModel.name}
                  className="h-full w-full object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,0.35)]"
                />
              ) : (
                <div className="relative flex h-32 w-32 items-center justify-center rounded-[32px] border border-[#315A42] bg-[#102D22]">
                  <Cpu
                    size={48}
                    className="text-[#7CFF6B]"
                    strokeWidth={1.5}
                  />
                </div>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#7CFF6B]"
            >
              One last thing
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.07em] text-[#F1F7F2]"
            >
              Give it
              <br />
              a name.
            </motion.h1>

            <p className="mt-4 text-[12px] leading-5 text-[#8DA99A]">
              Choose a name that makes sense to you.
              This name is private to your account.
            </p>

            {/* Name */}
            <motion.input
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              autoFocus
              value={deviceName}
              onChange={(event) => {
                setDeviceName(event.target.value);
                setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  saveName();
                }
              }}
              placeholder="My Greenhouse"
              maxLength={40}
              className="mt-7 h-[62px] w-full rounded-[20px] border border-[#1D4032] bg-[#0D251C] px-5 text-[16px] font-medium text-[#F1F7F2] outline-none transition-all placeholder:text-[#526D60] focus:border-[#7CFF6B] focus:bg-[#102D22] focus:shadow-[0_0_0_4px_rgba(124,255,107,0.06)]"
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 text-[11px] font-medium text-red-300"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Finish */}
            <motion.button
              type="button"
              onClick={saveName}
              disabled={saving || !deviceName.trim()}
              whileHover={
                deviceName.trim() && !saving
                  ? { scale: 1.015, y: -2 }
                  : undefined
              }
              whileTap={{ scale: 0.97 }}
              className="relative mt-4 flex h-[58px] w-full items-center justify-between overflow-hidden rounded-full bg-[#7CFF6B] px-5 text-[#071A13] shadow-[0_12px_30px_rgba(124,255,107,0.12)] transition disabled:cursor-not-allowed disabled:bg-[#183126] disabled:text-[#597264] disabled:shadow-none"
            >
              {!saving && deviceName.trim() && (
                <motion.div
                  animate={{ x: ["-120%", "180%"] }}
                  transition={{
                    duration: 2.8,
                    repeat: Infinity,
                    repeatDelay: 3,
                  }}
                  className="absolute inset-y-0 w-16 rotate-[18deg] bg-white/30 blur-md"
                />
              )}

              <span className="relative z-10 text-[13px] font-bold">
                {saving
                  ? "Setting everything up..."
                  : "Finish setup"}
              </span>

              <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[#071A13]/10">
                {saving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <ArrowRight size={16} />
                )}
              </span>
            </motion.button>
          </section>
        </div>
      </motion.main>
    );
  }

  /* ============================================================
     SUCCESS
  ============================================================ */

  if (step === "success") {
    return (
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative min-h-screen overflow-hidden bg-[#071A13] px-6 pb-8 pt-12 text-[#F1F7F2]"
      >
        {/* Glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.25, 0.12],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
          className="pointer-events-none absolute left-1/2 top-[7%] h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#7CFF6B] blur-[110px]"
        />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col">

          {/* Status */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center"
          >
            <div className="flex items-center gap-2 rounded-full border border-[#28513B] bg-[#0D251C] px-4 py-2">
              <motion.span
                animate={{
                  scale: [1, 1.3, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                }}
                className="h-2 w-2 rounded-full bg-[#7CFF6B]"
              />

              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7CFF6B]">
                Successfully connected
              </span>
            </div>
          </motion.div>

          {/* Main */}
          <div className="flex flex-1 flex-col items-center justify-center">

            {/* Success visual */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 130,
                damping: 13,
              }}
              className="relative flex h-[270px] w-[270px] items-center justify-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.15, 0.3, 0.15],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                }}
                className="absolute h-[190px] w-[190px] rounded-full bg-[#7CFF6B]/20 blur-[55px]"
              />

              <motion.div
                animate={{ rotate: 360 }}
                transition={{
                  duration: 18,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="absolute h-[235px] w-[235px] rounded-full border border-dashed border-[#315A42]"
              />

              <div className="absolute h-[195px] w-[195px] rounded-full border border-[#1D4032]" />

              <motion.div
                animate={{
                  boxShadow: [
                    "0 0 20px rgba(124,255,107,0.10)",
                    "0 0 50px rgba(124,255,107,0.25)",
                    "0 0 20px rgba(124,255,107,0.10)",
                  ],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                }}
                className="relative flex h-[145px] w-[145px] items-center justify-center rounded-full bg-[#7CFF6B]"
              >
                <div className="flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[#071A13]">
                  <Check
                    size={52}
                    strokeWidth={2.5}
                    className="text-[#7CFF6B]"
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Heading */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-2 text-center"
            >
              <h1 className="text-[48px] font-semibold leading-[0.92] tracking-[-0.07em] text-[#F1F7F2]">
                You're
                <br />
                <span className="text-[#7CFF6B]">
                  connected.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-[275px] text-[12px] leading-[1.7] text-[#789487]">
                Your device has been connected successfully
                and is ready to use.
              </p>
            </motion.div>
          </div>

          {/* Device card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-[24px] border border-[#1D4032] bg-[#0D251C] p-4 shadow-[0_15px_45px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-center gap-4">

              <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] border border-[#28513B] bg-[#102D22]">
                {device?.deviceModel.imageUrl ? (
                  <img
                    src={device.deviceModel.imageUrl}
                    alt={device.deviceModel.name}
                    className="h-11 w-11 object-contain"
                  />
                ) : (
                  <Wifi
                    size={22}
                    strokeWidth={1.7}
                    className="text-[#7CFF6B]"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[#F1F7F2]">
                  {device?.deviceModel.name}
                </p>

                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#668072]">
                  {device?.deviceCode}
                </p>
              </div>

              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7CFF6B]/10">
                <Check
                  size={16}
                  strokeWidth={3}
                  className="text-[#7CFF6B]"
                />
              </div>
            </div>
          </motion.div>

          <div className="mt-5 flex items-center justify-center gap-2">
            <Radio size={12} className="text-[#4F6D5D]" />

            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#4F6D5D]">
              Ready to use
            </span>
          </div>
        </div>
      </motion.main>
    );
  }

  return null;
}