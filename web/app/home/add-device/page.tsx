"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert, Cpu, Loader2 } from "lucide-react";

import { toast } from "@/components/ui/toast";
import { type Device, type DeviceLookup, checkDeviceAvailability, claimDevice, getApiErrorMessage } from "@/app/lib/devices";

export default function AddDevicePage() {
  const [deviceCode, setDeviceCode] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [availableDevice, setAvailableDevice] = useState<Device | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const valid = Boolean(deviceCode.trim() || serialNumber.trim());
  const lookup = (): DeviceLookup => ({ deviceCode, serialNumber });

  function resetVerification() { setAvailableDevice(null); setError(""); }
  async function checkAvailability(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || checking || claiming) { setError("Enter a device code or serial number."); return; }
    setChecking(true); setError(""); setAvailableDevice(null);
    try {
      const response = await checkDeviceAvailability(lookup());
      if (!response.available) throw new Error("This device is not available.");
      setAvailableDevice(response.device);
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to check this device. Check your connection and try again.")); }
    finally { setChecking(false); }
  }
  async function claimAvailableDevice() {
    if (!availableDevice || checking || claiming) return;
    setClaiming(true); setError("");
    try {
      await claimDevice(lookup());
      toast.add({ title: "Device added", description: `${availableDevice.deviceCode} is now linked to your account.`, type: "success" });
      setAvailableDevice(null); setDeviceCode(""); setSerialNumber("");
    } catch (requestError) { setError(getApiErrorMessage(requestError, "Unable to add this device. Please verify it again.")); setAvailableDevice(null); }
    finally { setClaiming(false); }
  }

  return <main className="min-h-screen bg-[#f6f6f2] px-4 pb-32 pt-7 text-[#202020] sm:px-6 lg:pb-10"><div className="mx-auto w-full max-w-2xl"><header><p className="text-[10px] font-medium tracking-[0.16em] text-[#999991]">FARM OPERATIONS</p><h1 className="mt-1 text-[29px] font-semibold tracking-[-0.06em]">Add Device</h1><p className="mt-1 text-xs text-[#777970]">Connect a new ESP32 device to your farm.</p></header><section className="mt-7 rounded-[30px] bg-white p-5 shadow-[0_5px_25px_rgba(0,0,0,0.025)] sm:p-7"><div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#e5ffad]"><Cpu size={21} /></div><h2 className="mt-5 text-xl font-semibold tracking-[-0.045em]">Connect equipment</h2><p className="mt-1 text-xs leading-5 text-[#777970]">Enter the identifier printed on your device. Availability is verified before anything is linked to your account.</p><form onSubmit={checkAvailability} className="mt-6 space-y-4"><DeviceField id="device-code" label="Device Code" value={deviceCode} placeholder="AGRI-001" disabled={checking || claiming} onChange={(value) => { setDeviceCode(value.toUpperCase()); resetVerification(); }} /><DeviceField id="serial-number" label={<>Serial Number <span className="font-normal text-[#999991]">(optional)</span></>} value={serialNumber} placeholder="Use if supplied instead of device code" disabled={checking || claiming} onChange={(value) => { setSerialNumber(value.toUpperCase()); resetVerification(); }} />{error ? <p role="alert" className="flex items-center gap-2 rounded-xl bg-[#fff0f0] px-4 py-3 text-xs text-red-600"><CircleAlert size={15} />{error}</p> : null}{availableDevice ? <div className="rounded-2xl border border-[#dcebc2] bg-[#f4fae8] p-4"><div className="flex gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-[#647d45]" size={18} /><div><p className="text-sm font-semibold">Device available</p><p className="mt-1 text-xs text-[#647d45]">{availableDevice.deviceModel.name} · {availableDevice.deviceCode}</p></div></div><button type="button" onClick={() => void claimAvailableDevice()} disabled={claiming} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#1f2b1f] text-xs font-semibold text-white transition active:scale-[0.98] disabled:opacity-60">{claiming ? <><Loader2 size={15} className="animate-spin" />Claiming device...</> : "Claim Device"}</button></div> : <button type="submit" disabled={!valid || checking || claiming} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#e5ffad] text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50">{checking ? <><Loader2 size={15} className="animate-spin" />Checking availability...</> : "Check Availability"}</button>}</form></section></div></main>;
}

function DeviceField({ id, label, value, placeholder, disabled, onChange }: { id: string; label: React.ReactNode; value: string; placeholder: string; disabled: boolean; onChange: (value: string) => void }) {
  return <div><label htmlFor={id} className="mb-2 block text-[11px] font-semibold text-[#555750]">{label}</label><input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} className="h-12 w-full rounded-xl border border-[#deded8] bg-white px-4 text-sm outline-none transition focus:border-[#8aa56f] focus:ring-4 focus:ring-[#e5ffad]/50 disabled:opacity-60" /></div>;
}
