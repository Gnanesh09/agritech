"use client";

import { useEffect, useState } from "react";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Save,
  ShieldBan,
  Trash2,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import api from "../../../../lib/axios";

type Status = "AVAILABLE" | "LINKED" | "BLOCKED" | "RETIRED";

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  macAddress: string | null;
  chipId: string | null;
  status: Status;
  batchNumber: string | null;
  manufacturedAt: string | null;
  linkedAt: string | null;
  createdAt: string;

  deviceModel: {
    id: string;
    name: string;
    code: string;
    imageUrl: string | null;
  };

  owner: {
    id: string;
    username: string;
    email: string;
  } | null;
};

type Model = {
  id: string;
  name: string;
  code: string;
  status: string;
};

export default function DeviceDetailsPage() {
  const router = useRouter();

  const params = useParams();

  const id = typeof params.id === "string" ? params.id : "";

  const [device, setDevice] = useState<Device | null>(null);

  const [models, setModels] = useState<Model[]>([]);

  const [deviceCode, setDeviceCode] = useState("");

  const [serialNumber, setSerialNumber] = useState("");

  const [macAddress, setMacAddress] = useState("");

  const [chipId, setChipId] = useState("");

  const [deviceModelId, setDeviceModelId] = useState("");

  const [batchNumber, setBatchNumber] = useState("");

  const [manufacturedAt, setManufacturedAt] = useState("");

  const [status, setStatus] = useState<Status>("AVAILABLE");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [savingStatus, setSavingStatus] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }

    load();
  }, [id]);

  async function load() {
    try {
      setLoading(true);

      const [deviceResponse, modelsResponse] = await Promise.all([
        api.get(`/admin/devices/${id}`),

        api.get("/admin/devicemodel"),
      ]);

      const value = deviceResponse.data?.device;

      if (!value) {
        throw new Error("Device not found.");
      }

      setDevice(value);

      setDeviceCode(value.deviceCode);

      setSerialNumber(value.serialNumber);

      setMacAddress(value.macAddress ?? "");

      setChipId(value.chipId ?? "");

      setDeviceModelId(value.deviceModel?.id ?? "");

      setBatchNumber(value.batchNumber ?? "");

      setManufacturedAt(
        value.manufacturedAt ? toDateTimeLocal(value.manufacturedAt) : "",
      );

      setStatus(value.status);

      setModels(modelsResponse.data?.deviceModels ?? []);
    } catch (err: any) {
      console.error("Device:", err);

      setError(err?.response?.data?.message || "Failed to load device.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDevice() {
    try {
      setSaving(true);
      setError("");

      const response = await api.patch(`/admin/devices/${id}`, {
        deviceCode: deviceCode.trim(),

        serialNumber: serialNumber.trim(),

        macAddress: macAddress.trim() || null,

        chipId: chipId.trim() || null,

        deviceModelId,

        batchNumber: batchNumber.trim() || null,

        manufacturedAt: manufacturedAt
          ? new Date(manufacturedAt).toISOString()
          : null,
      });

      setDevice(response.data?.device ?? device);
    } catch (err: any) {
      console.error("Update device:", err);

      setError(err?.response?.data?.message || "Failed to update device.");
    } finally {
      setSaving(false);
    }
  }

  async function saveStatus() {
    try {
      setSavingStatus(true);
      setError("");

      const response = await api.patch(`/admin/devices/${id}/status`, {
        status,
      });

      setDevice((current) =>
        current
          ? {
              ...current,
              status,
            }
          : response.data?.device ?? current,
      );
    } catch (err: any) {
      console.error("Update status:", err);

      setError(err?.response?.data?.message || "Failed to update status.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function deleteDevice() {
    if (!device) {
      return;
    }

    if (device.status === "LINKED") {
      setError("Linked devices cannot be deleted.");
      return;
    }

    if (!window.confirm("Delete this physical device from inventory?")) {
      return;
    }

    try {
      setDeleting(true);

      await api.delete(`/admin/devices/${id}`);

      router.replace("/admin/dashboard/devices");
    } catch (err: any) {
      console.error("Delete device:", err);

      setError(err?.response?.data?.message || "Failed to delete device.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-2xl bg-white" />
        <div className="h-[560px] animate-pulse rounded-[28px] bg-white" />
      </div>
    );
  }

  if (!device) {
    return (
      <div className="rounded-[28px] bg-white px-6 py-16 text-center">
        <AlertTriangle size={26} className="mx-auto text-red-400" />

        <h1 className="mt-4 text-lg font-semibold">Device unavailable</h1>

        <p className="mt-2 text-[10px] text-[#959d94]">
          {error || "This device could not be loaded."}
        </p>

        <button
          type="button"
          onClick={() => router.push("/admin/dashboard/devices")}
          className="mt-5 rounded-full bg-[#202720] px-5 py-3 text-[9px] font-bold text-white"
        >
          Back to inventory
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/dashboard/devices")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9ba49a]">
              Physical device
            </p>

            <h1 className="mt-1 text-[27px] font-semibold tracking-[-0.06em]">
              {device.deviceCode}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={deleteDevice}
          disabled={deleting || device.status === "LINKED"}
          className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-3 text-[9px] font-bold text-red-600 disabled:opacity-30"
        >
          <Trash2 size={13} />
          Delete
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-semibold text-red-600">
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
        {/* SUMMARY */}

        <div className="rounded-[30px] bg-[#202720] p-6 text-white">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-[#dff37a]">
            {device.deviceModel.imageUrl ? (
              <img
                src={device.deviceModel.imageUrl}
                alt=""
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <Cpu size={24} className="text-[#202720]" />
            )}
          </div>

          <h2 className="mt-6 text-[27px] font-semibold tracking-[-0.06em]">
            {device.deviceModel.name}
          </h2>

          <p className="mt-1 text-[9px] uppercase tracking-[0.15em] text-white/35">
            {device.deviceModel.code}
          </p>

          <div className="mt-7">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/35">
              Inventory state
            </p>

            <div className="mt-2">
              <StatusBadge status={device.status} />
            </div>
          </div>

          <div className="mt-7 rounded-2xl bg-white/5 p-4">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/35">
              Current owner
            </p>

            {device.owner ? (
              <>
                <p className="mt-2 text-[11px] font-bold">
                  {device.owner.username}
                </p>

                <p className="mt-1 text-[8px] text-white/40">
                  {device.owner.email}
                </p>
              </>
            ) : (
              <p className="mt-2 text-[9px] text-white/40">Not assigned</p>
            )}
          </div>
        </div>

        {/* EDIT */}

        <div className="rounded-[28px] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[16px] font-semibold">
                Device configuration
              </h2>

              <p className="mt-1 text-[9px] text-[#9aa198]">
                Physical inventory metadata
              </p>
            </div>

            <button
              type="button"
              onClick={saveDevice}
              disabled={saving}
              className="flex items-center gap-2 rounded-full bg-[#202720] px-4 py-2.5 text-[9px] font-bold text-white disabled:opacity-50"
            >
              <Save size={12} />
              {saving ? "Saving" : "Save"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field
              label="Device code"
              value={deviceCode}
              onChange={setDeviceCode}
            />

            <Field
              label="Serial number"
              value={serialNumber}
              onChange={setSerialNumber}
            />

            <Field
              label="MAC address"
              value={macAddress}
              onChange={setMacAddress}
            />

            <Field label="Chip ID" value={chipId} onChange={setChipId} />

            <Field
              label="Batch number"
              value={batchNumber}
              onChange={setBatchNumber}
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
              Device model
            </label>

            <select
              value={deviceModelId}
              onChange={(e) => setDeviceModelId(e.target.value)}
              className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 text-[10px] outline-none"
            >
              {models
                .filter(
                  (model) =>
                    model.status === "ACTIVE" || model.id === deviceModelId,
                )
                .map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                    {" ("}
                    {model.code}
                    {")"}
                  </option>
                ))}
            </select>
          </div>

          {/* STATUS */}

          <div className="mt-7 border-t border-[#edf0eb] pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[12px] font-bold">Device lifecycle</h3>

                <p className="mt-1 text-[8px] text-[#9ba39a]">
                  Status changes are enforced by the backend.
                </p>
              </div>

              <ShieldBan size={17} className="text-[#8d958a]" />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              {(["AVAILABLE", "LINKED", "BLOCKED", "RETIRED"] as Status[]).map(
                (value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setStatus(value)}
                    className={`rounded-xl border px-3 py-3 text-[8px] font-bold ${
                      status === value
                        ? "border-[#202720] bg-[#202720] text-white"
                        : "border-[#e5e9e2] bg-[#fafbf9] text-[#7d857b]"
                    }`}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={saveStatus}
              disabled={savingStatus || status === device.status}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#eef3e8] py-3 text-[9px] font-bold text-[#55703d] disabled:opacity-40"
            >
              {savingStatus ? (
                "Updating..."
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  Apply status
                </>
              )}
            </button>
          </div>

          {/* INFORMATION */}

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            <Info label="Device ID" value={device.id} />

            <Info label="Created" value={formatDate(device.createdAt)} />

            <Info
              label="Linked"
              value={
                device.linkedAt ? formatDate(device.linkedAt) : "Not linked"
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 text-[10px] outline-none"
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f7f9f6] p-3">
      <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#9ca49a]">
        {label}
      </p>
      <p className="mt-1 truncate text-[9px] font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const styles = {
    AVAILABLE: "bg-[#e9f5da] text-[#648943]",
    LINKED: "bg-[#eaf0fb] text-[#55739e]",
    BLOCKED: "bg-[#fff0e9] text-[#a66648]",
    RETIRED: "bg-[#eeeeec] text-[#767d74]",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[8px] font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  const offset = date.getTimezoneOffset();

  const local = new Date(date.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
