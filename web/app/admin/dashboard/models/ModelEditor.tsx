"use client";

import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Check,
  CirclePlus,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import api from "../../../lib/axios";

type CapabilityType = "number" | "boolean" | "string";

type Capability = {
  key: string;
  label?: string;
  type: CapabilityType;
  unit?: string;
  min?: number;
  max?: number;
};

type DeviceModel = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  version: string | null;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  imageUrl: string | null;

  capabilities: {
    sensors: Capability[];
    actuators: Capability[];
  };

  deviceCount?: number;
};

type ModelEditorProps = {
  mode: "create" | "edit";
};

function createCapability(actuator = false): Capability {
  return {
    key: "",
    label: "",
    type: actuator ? "boolean" : "number",
    unit: "",
  };
}

export default function ModelEditor({ mode }: ModelEditorProps) {
  const router = useRouter();
  const params = useParams();

  const modelId = typeof params?.id === "string" ? params.id : "";

  const isCreate = mode === "create";

  // ==========================================================
  // BASIC MODEL DATA
  // ==========================================================

  const [name, setName] = useState("");

  const [code, setCode] = useState("");

  const [description, setDescription] = useState("");

  const [version, setVersion] = useState("");

  const [imageUrl, setImageUrl] = useState("");

  const [status, setStatus] = useState<DeviceModel["status"]>("ACTIVE");

  // ==========================================================
  // CAPABILITIES
  // ==========================================================

  const [sensors, setSensors] = useState<Capability[]>([]);

  const [actuators, setActuators] = useState<Capability[]>([]);

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [loading, setLoading] = useState(!isCreate);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  // ==========================================================
  // LOAD EXISTING MODEL
  // ==========================================================

  useEffect(() => {
    if (isCreate) {
      setLoading(false);
      return;
    }

    if (!modelId) {
      setLoading(false);
      setError("Invalid device model ID.");
      return;
    }

    void loadModel();
  }, [isCreate, modelId]);

  async function loadModel() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/admin/devicemodel/${modelId}`);

      const model = response.data?.deviceModel as DeviceModel | undefined;

      if (!model) {
        throw new Error("Device model was not returned by the server.");
      }

      setName(model.name ?? "");

      setCode(model.code ?? "");

      setDescription(model.description ?? "");

      setVersion(model.version ?? "");

      setImageUrl(model.imageUrl ?? "");

      setStatus(model.status ?? "ACTIVE");

      setSensors(model.capabilities?.sensors ?? []);

      setActuators(model.capabilities?.actuators ?? []);
    } catch (err: any) {
      console.error("Load model error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load device model.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // CAPABILITY HELPERS
  // ==========================================================

  function updateCapability(
    group: "sensors" | "actuators",
    index: number,
    patch: Partial<Capability>,
  ) {
    if (group === "sensors") {
      setSensors((current) =>
        current.map((item, i) =>
          i === index
            ? {
                ...item,
                ...patch,
              }
            : item,
        ),
      );

      return;
    }

    setActuators((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  function addCapability(group: "sensors" | "actuators") {
    if (group === "sensors") {
      setSensors((current) => [...current, createCapability(false)]);

      return;
    }

    setActuators((current) => [...current, createCapability(true)]);
  }

  function removeCapability(group: "sensors" | "actuators", index: number) {
    if (group === "sensors") {
      setSensors((current) => current.filter((_, i) => i !== index));

      return;
    }

    setActuators((current) => current.filter((_, i) => i !== index));
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validateModel(): string | null {
    if (!name.trim()) {
      return "Model name is required.";
    }

    if (!code.trim()) {
      return "Model code is required.";
    }

    const allKeys = [...sensors, ...actuators]
      .map((item) => item.key.trim())
      .filter(Boolean);

    const uniqueKeys = new Set(allKeys);

    if (uniqueKeys.size !== allKeys.length) {
      return "Capability keys must be unique across sensors and actuators.";
    }

    const invalidSensor = sensors.find((item) => !item.key.trim());

    if (invalidSensor) {
      return "Every sensor must have a key.";
    }

    const invalidActuator = actuators.find((item) => !item.key.trim());

    if (invalidActuator) {
      return "Every actuator must have a key.";
    }

    return null;
  }

  function cleanCapability(item: Capability) {
    return {
      key: item.key.trim(),

      label: item.label?.trim() || undefined,

      type: item.type,

      unit: item.unit?.trim() || undefined,

      ...(item.type === "number" && item.min !== undefined
        ? {
            min: item.min,
          }
        : {}),

      ...(item.type === "number" && item.max !== undefined
        ? {
            max: item.max,
          }
        : {}),
    };
  }

  // ==========================================================
  // SAVE
  // ==========================================================

  async function saveModel() {
    const validation = validateModel();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: name.trim(),

        code: code.trim(),

        description: description.trim() || null,

        version: version.trim() || null,

        imageUrl: imageUrl.trim() || null,

        status,

        capabilities: {
          sensors: sensors
            .filter((item) => item.key.trim())
            .map(cleanCapability),

          actuators: actuators
            .filter((item) => item.key.trim())
            .map(cleanCapability),
        },
      };

      // --------------------------------------------------------
      // CREATE
      // --------------------------------------------------------

      if (isCreate) {
        const response = await api.post("/admin/devicemodel", payload);

        const created = response.data?.deviceModel;

        setSuccess("Device model created successfully.");

        if (created?.id) {
          router.replace(`/admin/dashboard/models/${created.id}`);
        }

        return;
      }

      // --------------------------------------------------------
      // UPDATE
      // --------------------------------------------------------

      await api.patch(`/admin/devicemodel/${modelId}`, payload);

      setSuccess("Device model updated successfully.");

      await loadModel();
    } catch (err: any) {
      console.error("Save model error:", err);

      setError(err?.response?.data?.message || "Failed to save device model.");
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  async function deleteModel() {
    if (isCreate || !modelId) {
      return;
    }

    if (!window.confirm("Delete this device model?")) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      await api.delete(`/admin/devicemodel/${modelId}`);

      router.replace("/admin/dashboard/models");
    } catch (err: any) {
      console.error("Delete model error:", err);

      setError(
        err?.response?.data?.message || "Failed to delete device model.",
      );
    } finally {
      setDeleting(false);
    }
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-52 animate-pulse rounded-2xl bg-white" />

        <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div className="h-[550px] animate-pulse rounded-[28px] bg-white" />
          <div className="h-[550px] animate-pulse rounded-[28px] bg-white" />
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="space-y-5">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/dashboard/models")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9ca59a]">
              Device catalog
            </p>

            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.06em]">
              {isCreate ? "Create model" : name || "Edit model"}
            </h1>

            <p className="mt-1 text-[9px] text-[#949d93]">
              {isCreate
                ? "Define a new hardware model and its capabilities."
                : `Editing ${code}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isCreate && (
            <button
              type="button"
              onClick={() => void deleteModel()}
              disabled={deleting}
              className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-3 text-[9px] font-bold text-red-600 disabled:opacity-40"
            >
              <Trash2 size={13} />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}

          <button
            type="button"
            onClick={() => void saveModel()}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-[#202720] px-5 py-3 text-[9px] font-bold text-white disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Save size={13} />
            )}

            {saving ? "Saving..." : isCreate ? "Create model" : "Save changes"}
          </button>
        </div>
      </header>

      {/* ======================================================
          MESSAGES
      ====================================================== */}

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-semibold text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl bg-[#edf6df] px-4 py-3 text-[10px] font-semibold text-[#5d7e3d]">
          {success}
        </div>
      )}

      {/* ======================================================
          MAIN
      ====================================================== */}

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        {/* ====================================================
            LEFT
        ==================================================== */}

        <div className="space-y-5">
          {/* BASIC */}

          <section className="rounded-[28px] bg-white p-5">
            <SectionTitle
              title="Basic information"
              description="Identity of this device family."
            />

            <div className="mt-5 space-y-3">
              <Field
                label="Model name"
                value={name}
                onChange={setName}
                placeholder="Humdie"
              />

              <Field
                label="Model code"
                value={code}
                onChange={setCode}
                placeholder="HUMDIE"
              />

              <Field
                label="Version"
                value={version}
                onChange={setVersion}
                placeholder="1.0.0"
              />

              <div>
                <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.14em] text-[#929b91]">
                  Status
                </label>

                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as DeviceModel["status"])
                  }
                  className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 text-[10px] font-medium outline-none"
                >
                  <option value="ACTIVE">Active</option>

                  <option value="INACTIVE">Inactive</option>

                  <option value="DISCONTINUED">Discontinued</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.14em] text-[#929b91]">
                  Description
                </label>

                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe this device model..."
                  className="w-full resize-none rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 py-3 text-[10px] outline-none"
                />
              </div>
            </div>
          </section>

          {/* IMAGE */}

          <section className="rounded-[28px] bg-white p-5">
            <SectionTitle
              title="Product image"
              description="Used on the admin inventory and user device screens."
            />

            <div className="mt-5 overflow-hidden rounded-2xl bg-[#edf2e8]">
              <div className="flex h-56 items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={name || "Device"}
                    className="h-full w-full object-contain p-8"
                  />
                ) : (
                  <ImageIcon size={38} className="text-[#acb5a8]" />
                )}
              </div>

              <div className="border-t border-black/5 p-3">
                <input
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  className="h-10 w-full rounded-xl bg-white px-3 text-[9px] outline-none"
                />
              </div>
            </div>
          </section>
        </div>

        {/* ====================================================
            RIGHT / CAPABILITIES
        ==================================================== */}

        <section className="rounded-[28px] bg-white p-5">
          <div className="flex items-start justify-between">
            <SectionTitle
              title="Capabilities"
              description="These definitions are what make your user frontend device-agnostic."
            />
          </div>

          {/* SENSORS */}

          <CapabilityGroup
            title="Sensors"
            subtitle="Values reported by the hardware."
            items={sensors}
            group="sensors"
            onAdd={() => addCapability("sensors")}
            onUpdate={updateCapability}
            onRemove={removeCapability}
          />

          {/* ACTUATORS */}

          <div className="mt-8">
            <CapabilityGroup
              title="Actuators"
              subtitle="Things this hardware can control."
              items={actuators}
              group="actuators"
              onAdd={() => addCapability("actuators")}
              onUpdate={updateCapability}
              onRemove={removeCapability}
            />
          </div>

          {/* INFO */}

          <div className="mt-7 rounded-2xl bg-[#f2f7e8] p-4">
            <p className="text-[9px] font-bold text-[#557238]">
              Generic device architecture
            </p>

            <p className="mt-2 text-[9px] leading-4 text-[#78856e]">
              The ESP32/device sends its JSON telemetry, the backend validates
              it against these capabilities, and Home/Monitor render the
              appropriate sensors and controls dynamically.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ============================================================
// CAPABILITY GROUP
// ============================================================

function CapabilityGroup({
  title,
  subtitle,
  items,
  group,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  subtitle: string;
  items: Capability[];
  group: "sensors" | "actuators";
  onAdd: () => void;
  onUpdate: (
    group: "sensors" | "actuators",
    index: number,
    patch: Partial<Capability>,
  ) => void;
  onRemove: (group: "sensors" | "actuators", index: number) => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold">{title}</h3>

          <p className="mt-1 text-[8px] text-[#9aa198]">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded-full bg-[#202720] px-3 py-2 text-[8px] font-bold text-white"
        >
          <CirclePlus size={12} />
          Add
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dfe5da] px-4 py-7 text-center">
            <p className="text-[9px] text-[#9aa198]">
              No {title.toLowerCase()} configured yet.
            </p>
          </div>
        ) : (
          items.map((capability, index) => (
            <CapabilityCard
              key={`${group}-${index}`}
              capability={capability}
              onUpdate={(patch) => onUpdate(group, index, patch)}
              onRemove={() => onRemove(group, index)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================
// CAPABILITY CARD
// ============================================================

function CapabilityCard({
  capability,
  onUpdate,
  onRemove,
}: {
  capability: Capability;
  onUpdate: (patch: Partial<Capability>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-2xl bg-[#f7f9f6] p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <SmallField
          label="Key"
          value={capability.key}
          onChange={(value) =>
            onUpdate({
              key: value,
            })
          }
          placeholder="temperature"
        />

        <SmallField
          label="Label"
          value={capability.label ?? ""}
          onChange={(value) =>
            onUpdate({
              label: value,
            })
          }
          placeholder="Temperature"
        />

        <div>
          <label className="mb-1 block text-[7px] font-bold uppercase tracking-[0.12em] text-[#929b91]">
            Type
          </label>

          <select
            value={capability.type}
            onChange={(event) =>
              onUpdate({
                type: event.target.value as CapabilityType,
              })
            }
            className="h-9 w-full rounded-lg border border-[#dfe5da] bg-white px-2 text-[9px] outline-none"
          >
            <option value="number">Number</option>

            <option value="boolean">Boolean</option>

            <option value="string">String</option>
          </select>
        </div>

        <SmallField
          label="Unit"
          value={capability.unit ?? ""}
          onChange={(value) =>
            onUpdate({
              unit: value,
            })
          }
          placeholder="°C / % / lux"
        />

        {capability.type === "number" && (
          <>
            <SmallField
              label="Min"
              value={capability.min === undefined ? "" : String(capability.min)}
              onChange={(value) =>
                onUpdate({
                  min: value === "" ? undefined : Number(value),
                })
              }
              placeholder="Optional"
            />

            <SmallField
              label="Max"
              value={capability.max === undefined ? "" : String(capability.max)}
              onChange={(value) =>
                onUpdate({
                  max: value === "" ? undefined : Number(value),
                })
              }
              placeholder="Optional"
            />
          </>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[8px] font-bold text-red-500"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[8px] font-bold uppercase tracking-[0.14em] text-[#929b91]">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 text-[10px] font-medium outline-none"
      />
    </div>
  );
}

// ============================================================
// SMALL FIELD
// ============================================================

function SmallField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[7px] font-bold uppercase tracking-[0.12em] text-[#929b91]">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[#dfe5da] bg-white px-2.5 text-[9px] outline-none"
      />
    </div>
  );
}

// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold">{title}</h2>

      <p className="mt-1 text-[9px] leading-4 text-[#99a198]">{description}</p>
    </div>
  );
}
