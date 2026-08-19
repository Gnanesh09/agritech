"use client";

import { useEffect, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Cpu,
  KeyRound,
  Loader2,
} from "lucide-react";

import { useRouter } from "next/navigation";

import api from "../../../../lib/axios";

type Model = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  imageUrl: string | null;
};

export default function RegisterDevicePage() {
  const router = useRouter();

  const [models, setModels] = useState<Model[]>([]);

  const [deviceCode, setDeviceCode] = useState("");

  const [serialNumber, setSerialNumber] = useState("");

  const [macAddress, setMacAddress] = useState("");

  const [chipId, setChipId] = useState("");

  const [deviceModelId, setDeviceModelId] = useState("");

  const [batchNumber, setBatchNumber] = useState("");

  const [manufacturedAt, setManufacturedAt] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [result, setResult] = useState<{
    device: any;
    deviceToken: string;
  } | null>(null);

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels() {
    try {
      const response = await api.get("/admin/devicemodel");

      const values = response.data?.deviceModels ?? [];

      setModels(values.filter((model: Model) => model.status === "ACTIVE"));
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Unable to load active device models.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    if (!deviceCode.trim() || !serialNumber.trim() || !deviceModelId) {
      setError("Device code, serial number and model are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await api.post("/admin/devices/register", {
        deviceCode: deviceCode.trim(),

        serialNumber: serialNumber.trim(),

        macAddress: macAddress.trim() || null,

        chipId: chipId.trim() || null,

        deviceModelId,

        batchNumber: batchNumber.trim() || null,

        manufacturedAt: manufacturedAt || null,
      });

      setResult({
        device: response.data.device,
        deviceToken: response.data.deviceToken,
      });
    } catch (err: any) {
      console.error("Register device:", err);

      setError(err?.response?.data?.message || "Failed to register device.");
    } finally {
      setSaving(false);
    }
  }

  function copyToken() {
    if (!result) {
      return;
    }

    navigator.clipboard.writeText(result.deviceToken);
  }

  if (loading) {
    return <div className="h-96 animate-pulse rounded-[28px] bg-white" />;
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl">
        <section className="overflow-hidden rounded-[32px] bg-[#202720] p-7 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#dff37a] text-[#202720]">
            <CheckCircle2 size={30} />
          </div>

          <p className="mt-6 text-[8px] font-bold uppercase tracking-[0.22em] text-white/40">
            Registration complete
          </p>

          <h1 className="mt-2 text-[35px] font-semibold tracking-[-0.07em]">
            Device registered.
          </h1>

          <p className="mt-3 max-w-lg text-[10px] leading-5 text-white/45">
            The hardware has been added to your inventory and a device
            credential has been generated.
          </p>

          <div className="mt-7 rounded-2xl bg-white/10 p-4">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/40">
              Device
            </p>

            <p className="mt-2 text-[14px] font-bold">
              {result.device.deviceCode}
            </p>

            <p className="mt-1 text-[9px] text-white/45">
              {result.device.serialNumber}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-[#dff37a]/30 bg-[#dff37a]/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound size={14} className="text-[#dff37a]" />

                <p className="text-[9px] font-bold text-[#dff37a]">
                  DEVICE TOKEN
                </p>
              </div>

              <button
                type="button"
                onClick={copyToken}
                className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[8px] font-bold"
              >
                <Copy size={12} />
                Copy
              </button>
            </div>

            <p className="mt-4 break-all font-mono text-[10px] leading-5 text-white">
              {result.deviceToken}
            </p>

            <p className="mt-4 text-[8px] leading-4 text-white/40">
              Save this credential now. The raw device token is returned by the
              registration API for the device credential created at
              registration.
            </p>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() =>
                router.push(`/admin/dashboard/devices/${result.device.id}`)
              }
              className="flex-1 rounded-full bg-[#dff37a] py-3.5 text-[9px] font-bold text-[#202720]"
            >
              Open device
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/dashboard/devices")}
              className="flex-1 rounded-full bg-white/10 py-3.5 text-[9px] font-bold text-white"
            >
              Inventory
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/dashboard/devices")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <ArrowLeft size={17} />
        </button>

        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9ca59a]">
            Inventory
          </p>

          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.06em]">
            Register device
          </h1>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-semibold text-red-600">
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[28px] bg-[#202720] p-6 text-white">
          <Cpu size={27} className="text-[#dff37a]" />

          <h2 className="mt-6 text-[27px] font-semibold tracking-[-0.06em]">
            Add physical hardware
          </h2>

          <p className="mt-3 text-[10px] leading-5 text-white/45">
            This creates the physical device inventory record, links it to a
            model and generates its device credential.
          </p>

          <div className="mt-7 rounded-2xl bg-white/5 p-4">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/35">
              Lifecycle
            </p>

            <div className="mt-3 flex items-center gap-2 text-[9px]">
              <span className="rounded-full bg-[#dff37a] px-2.5 py-1 font-bold text-[#202720]">
                AVAILABLE
              </span>

              <span className="text-white/30">→</span>

              <span className="text-white/50">LINKED</span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Device code *"
              value={deviceCode}
              onChange={setDeviceCode}
              placeholder="HUMDIE-000002"
            />

            <Field
              label="Serial number *"
              value={serialNumber}
              onChange={setSerialNumber}
              placeholder="SN-000002"
            />

            <Field
              label="MAC address"
              value={macAddress}
              onChange={setMacAddress}
              placeholder="AA:BB:CC:DD:EE:FF"
            />

            <Field
              label="Chip ID"
              value={chipId}
              onChange={setChipId}
              placeholder="ESP32-..."
            />

            <Field
              label="Batch number"
              value={batchNumber}
              onChange={setBatchNumber}
              placeholder="BATCH-001"
            />

            <Field
              label="Manufactured at"
              type="datetime-local"
              value={manufacturedAt}
              onChange={setManufacturedAt}
            />
          </div>

          <div className="mt-3">
            <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.14em] text-[#929b91]">
              Device model *
            </label>

            <select
              value={deviceModelId}
              onChange={(e) => setDeviceModelId(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 text-[10px] font-medium outline-none"
            >
              <option value="">Select active model</option>

              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                  {" ("}
                  {model.code}
                  {")"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={register}
            disabled={saving}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#202720] py-4 text-[10px] font-bold text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}

            {saving ? "Registering..." : "Register device"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.14em] text-[#929b91]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 text-[10px] outline-none"
      />
    </div>
  );
}
