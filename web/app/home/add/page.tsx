"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";

import { useRouter } from "next/navigation";
import api from "../../lib/axios";

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

  /* ============================================================
       SUCCESS SOUND
    ============================================================ */

  useEffect(() => {
    audioRef.current = new Audio("/sounds/device-success2.mp3");

    audioRef.current.preload = "auto";
  }, []);

  /* ============================================================
       CHECK / CLAIM DEVICE
    ============================================================ */

  async function addDevice() {
    const code = deviceCode.trim().toUpperCase();

    if (!code) {
      setError("Enter your device code");
      return;
    }

    setError("");
    setStep("checking");

    try {
      /*
       * Your existing endpoint:
       *
       * POST /api/user/devices/claim
       */

      const response = await api.post("/user/devices/claim", {
        deviceCode: code,
      });

      const claimedDevice = response.data.device;

      setDevice(claimedDevice);

      /*
       * Give the user a small
       * "we found it" moment.
       */

      setStep("found");

      setTimeout(() => {
        setStep("naming");
      }, 1400);
    } catch (err: any) {
      console.error("Device claim failed:", err);

      setError(err?.response?.data?.message || "This device cannot be added.");

      setStep("code");
    }
  }

  /* ============================================================
       SAVE PERSONAL NAME
    ============================================================ */

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

      /*
       * UserDevice name.
       *
       * This does NOT change the
       * admin/device model name.
       */

      await api.patch(`/user/devices/${device.id}/name`, {
        name,
      });

      setStep("success");

      /*
       * Play success sound.
       */

      try {
        await audioRef.current?.play();
      } catch {
        /*
         * Browser may block autoplay.
         * The interaction that led here
         * normally allows it, but don't
         * let audio failure break flow.
         */
      }

      /*
       * Give the success screen time
       * to breathe.
       */

      setTimeout(() => {
        router.replace("/home");
      }, 2400);
    } catch (err: any) {
      console.error("Failed to save device name:", err);

      setError(
        err?.response?.data?.message || "Could not save the device name.",
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
      <main className="min-h-screen overflow-hidden bg-amber-50">
        <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5">
          {/* Background decoration */}

          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white opacity-50 blur-3xl" />

          <div className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-[#e8f3a7] opacity-50 blur-3xl" />

          {/* Header */}

          <header className="relative flex items-center pt-6">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
          </header>

          {/* Hero */}

          <section className="relative flex flex-1 flex-col justify-center pb-60">
            <div className="mb-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[17px] bg-brand">
                <Wifi size={80} strokeWidth={2} />
              </div>

              <h1 className="mt-2 text-[40px] font-semibold leading-[0.95] tracking-[-0.07em] text-[#181818]">
                Let's add
                <br />
                something
                <br />
                <span className="text-[#000000]">smart.</span>
              </h1>

              <p className="mt-5 max-w-[290px] text-[12px] leading-5 text-[#85857e]">
                Enter the device code printed on your device to connect it to
                your account.
              </p>
            </div>

            {/* CODE INPUT */}

            <div>
              <label className="mb-2 block text-[10px] font-semibold  tracking-[0.13em] text-[#999991]">
                Device code
              </label>

              <div className="relative">
                <input
                  autoFocus
                  value={deviceCode}
                  onChange={(event) => {
                    setDeviceCode(event.target.value.toUpperCase());
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      addDevice();
                    }
                  }}
                  placeholder="HUMIDE-000001"
                  disabled={step === "checking"}
                  className="h-[62px] w-full rounded-[21px] border border-[#e4e4de] bg-white px-5 pr-14 text-[16px] font-semibold tracking-[0.03em] text-[#202020] outline-none transition placeholder:text-[#c7c7c0] focus:border-[#9bb759] focus:ring-4 focus:ring-[#d9ed65]/20"
                />

                {deviceCode && (
                  <button
                    onClick={() => setDeviceCode("")}
                    className="absolute right-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#f1f1ed]"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* ERROR */}

              {error && (
                <div className="mt-3 rounded-[17px] bg-[#fff0f0] px-4 py-3 text-[11px] font-medium text-red-600">
                  {error}
                </div>
              )}

              {/* BUTTON */}

              <button
                onClick={addDevice}
                disabled={step === "checking" || !deviceCode.trim()}
                className="mt-4 flex h-[58px] w-full items-center justify-between rounded-full bg-[#3f29ff] px-5 text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-[13px] font-semibold">
                  {step === "checking"
                    ? "Checking device..."
                    : "Find my device"}
                </span>
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }
  if (step === "found") {
    return (
      <main className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center overflow-hidden bg-black">
        {/* subtle background glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          {/* Tick */}

          <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-brand shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
            <Check size={48} strokeWidth={3} className="text-[#202020]" />
          </div>

          {/* Text */}

          <h1 className="mt-8 text-[30px] font-bold uppercase tracking-[-0.04em] text-brand">
            Device found
          </h1>

          <p className="mt-1 text-[14px] font-semibold uppercase tracking-[0.08em] text-brand/60">
            Successfully
          </p>

          {/* Device code */}

          {device && (
            <p className="mt-5 rounded-full text-brand/10 px-4 py-2 text-[10px] font-semibold tracking-[0.12em] text-[#171717]/60">
              {device.deviceCode}
            </p>
          )}
        </div>
      </main>
    );
  }
  /* ============================================================
       NAME SCREEN
    ============================================================ */

  if (step === "naming") {
    return (
      <main className="min-h-screen bg-[#f6f6f2]">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-5">
          <header className="flex items-center pt-6">
            <button
              onClick={() => setStep("code")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            >
              <ArrowLeft size={18} />
            </button>
          </header>

          <section className="flex flex-1 flex-col justify-center pb-20">
            {/* Small device image */}

            <div className="mb-8 flex h-[150px] items-center justify-center">
              {device?.deviceModel.imageUrl && (
                <img
                  src={device.deviceModel.imageUrl}
                  alt=""
                  className="h-full w-full object-contain drop-shadow-[0_15px_15px_rgba(0,0,0,0.10)]"
                />
              )}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8e927f]">
              One last thing
            </p>

            <h1 className="mt-2 text-[38px] font-semibold leading-[0.95] tracking-[-0.07em]">
              Give it
              <br />a name.
            </h1>

            <p className="mt-4 text-[12px] leading-5 text-[#898982]">
              Choose a name that makes sense to you. This name is private to
              your account.
            </p>

            {/* NAME */}

            <input
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
              className="mt-7 h-[62px] w-full rounded-[21px] border border-[#e2e2dc] bg-white px-5 text-[16px] font-medium outline-none transition placeholder:text-[#c4c4bd] focus:border-[#9bb759] focus:ring-4 focus:ring-[#d9ed65]/20"
            />

            {error && (
              <p className="mt-3 text-[11px] font-medium text-red-500">
                {error}
              </p>
            )}

            <button
              onClick={saveName}
              disabled={saving || !deviceName.trim()}
              className="mt-4 flex h-[58px] w-full items-center justify-between rounded-full bg-[#1b1b1b] px-5 text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              <span className="text-[13px] font-semibold">
                {saving ? "Setting everything up..." : "Finish setup"}
              </span>

              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-black">
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowRight size={16} />
                )}
              </span>
            </button>
          </section>
        </div>
      </main>
    );
  }

  /* ============================================================
   DEVICE SUCCESS
============================================================ */

  if (step === "success") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f7f8f2] text-[#171717]">
        {/* Soft brand glow */}
        <div className="pointer-events-none absolute left-1/2 top-[8%] h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-brand/20 blur-[110px]" />

        <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-6 pb-8 pt-12">
          {/* Top */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 rounded-full border border-[#dfe5cf] bg-white/80 px-4 py-2 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-brand" />

              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#2204ca]">
                Successfully connected
              </span>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-1 flex-col items-center justify-center">
            {/* Success visual */}
            <div className="relative flex h-[270px] w-[270px] items-center justify-center">
              {/* Soft glow */}
              <div className="absolute h-[190px] w-[190px] rounded-full bg-brand/25 blur-[55px]" />

              {/* Outer ring */}
              <div className="absolute h-[235px] w-[235px] rounded-full border border-[#d8dfc2]" />

              {/* Inner ring */}
              <div className="absolute h-[195px] w-[195px] rounded-full border border-[#e2e7d5]" />

              {/* Main circle */}
              <div className="relative flex h-[145px] w-[145px] items-center justify-center rounded-full bg-brand shadow-[0_20px_50px_rgba(130,155,55,0.22)]">
                <div className="flex h-[112px] w-[112px] items-center justify-center rounded-full bg-[#171717]">
                  <Check size={52} strokeWidth={2.5} className="text-brand" />
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mt-2 text-center">
              <h1 className="text-[48px] font-semibold leading-[0.92] tracking-[-0.07em]">
                You're
                <br />
                <span className="">connected.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-[275px] text-[12px] leading-[1.7] text-[#92948d]">
                Your device has been connected successfully and is ready to use.
              </p>
            </div>
          </div>

          {/* Device card */}
          <div className="rounded-[24px] border border-black/[0.06] bg-white p-4 pb-10 shadow-[0_15px_45px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-4">
              {/* Device image */}
              <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[18px] bg-[#f3f5ec]">
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
                    className="text-[#829f3d]"
                  />
                )}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-[#1b1b1b]">
                  {device?.deviceModel.name}
                </p>

                <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#a2a49d]">
                  {device?.deviceCode}
                </p>
              </div>

              {/* Connected */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef4dc]">
                <Check size={16} strokeWidth={3} className="text-[#1215c7]" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex items-center justify-center">
            <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-[#b0b2aa]">
              Ready to use
            </span>
          </div>
        </div>
      </main>
    );
  }
}
