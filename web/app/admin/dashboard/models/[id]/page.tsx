"use client";

import { useEffect, useState } from "react";

import {
  ArrowLeft,
  Check,
  CirclePlus,
  Image as ImageIcon,
  RefreshCcw,
  Save,
  Trash2,
} from "lucide-react";

import { useParams, useRouter } from "next/navigation";

import api from "../../../../lib/axios";

type CapabilityType = "number" | "boolean" | "string";

type Capability = {
  key: string;
  label?: string;
  type: CapabilityType;
  unit?: string;
  min?: number;
  max?: number;
};

type Model = {
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
  deviceCount: number;
};

const emptyCapability = (): Capability => ({
  key: "",
  label: "",
  type: "number",
  unit: "",
});

export default function ModelEditorPage() {
  const router = useRouter();

  const params = useParams();

  const id = typeof params.id === "string" ? params.id : "";

  const [model, setModel] = useState<Model | null>(null);

  const [name, setName] = useState("");

  const [code, setCode] = useState("");

  const [description, setDescription] = useState("");

  const [version, setVersion] = useState("");

  const [imageUrl, setImageUrl] = useState("");

  const [status, setStatus] = useState<Model["status"]>("ACTIVE");

  const [sensors, setSensors] = useState<Capability[]>([]);

  const [actuators, setActuators] = useState<Capability[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const isNew = id === "new";

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }

    loadModel();
  }, [id]);

  async function loadModel() {
    try {
      setLoading(true);

      const response = await api.get(`/admin/devicemodel/${id}`);

      const value = response.data?.deviceModel;

      if (!value) {
        throw new Error("Device model not found.");
      }

      setModel(value);

      setName(value.name ?? "");

      setCode(value.code ?? "");

      setDescription(value.description ?? "");

      setVersion(value.version ?? "");

      setImageUrl(value.imageUrl ?? "");

      setStatus(value.status ?? "ACTIVE");

      setSensors(value.capabilities?.sensors ?? []);

      setActuators(value.capabilities?.actuators ?? []);
    } catch (err: any) {
      console.error("Load model:", err);

      setError(err?.response?.data?.message || "Failed to load model.");
    } finally {
      setLoading(false);
    }
  }

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
    } else {
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
  }

  function removeCapability(group: "sensors" | "actuators", index: number) {
    if (group === "sensors") {
      setSensors((current) => current.filter((_, i) => i !== index));
    } else {
      setActuators((current) => current.filter((_, i) => i !== index));
    }
  }

  function addCapability(group: "sensors" | "actuators") {
    if (group === "sensors") {
      setSensors((current) => [...current, emptyCapability()]);
    } else {
      setActuators((current) => [
        ...current,
        {
          ...emptyCapability(),
          type: "boolean",
        },
      ]);
    }
  }

  async function saveModel() {
    if (!name.trim()) {
      setError("Model name is required.");
      return;
    }

    if (!code.trim()) {
      setError("Model code is required.");
      return;
    }

    const duplicateKeys = [...sensors, ...actuators]
      .filter((item) => item.key.trim())
      .map((item) => item.key.trim());

    if (new Set(duplicateKeys).size !== duplicateKeys.length) {
      setError("Capability keys must be unique.");
      return;
    }

    const cleanCapabilities = {
      sensors: sensors.filter((item) => item.key.trim()).map(cleanCapability),

      actuators: actuators
        .filter((item) => item.key.trim())
        .map(cleanCapability),
    };

    try {
      setSaving(true);
      setError("");

      const body = {
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,
        version: version.trim() || null,
        imageUrl: imageUrl.trim() || null,
        status,
        capabilities: cleanCapabilities,
      };

      if (isNew) {
        const response = await api.post("/admin/devicemodel", body);

        const created = response.data?.deviceModel;

        router.replace(`/admin/dashboard/models/${created.id}`);

        return;
      }

      await api.patch(`/admin/devicemodel/${id}`, body);

      await loadModel();
    } catch (err: any) {
      console.error("Save model:", err);

      setError(err?.response?.data?.message || "Failed to save model.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteModel() {
    if (isNew || !model) {
      return;
    }

    if (model.deviceCount > 0) {
      setError("This model cannot be deleted while physical devices use it.");
      return;
    }

    try {
      await api.delete(`/admin/devicemodel/${id}`);

      router.replace("/admin/dashboard/models");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to delete model.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-2xl bg-white" />
        <div className="h-[600px] animate-pulse rounded-[28px] bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/dashboard/models")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white"
          >
            <ArrowLeft size={17} />
          </button>

          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9ba39a]">
              {isNew ? "New model" : "Device model"}
            </p>

            <h1 className="mt-1 text-[27px] font-semibold tracking-[-0.06em]">
              {isNew ? "Create model" : name || "Edit model"}
            </h1>
          </div>
        </div>

        <div className="flex gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={deleteModel}
              disabled={model?.deviceCount !== 0}
              className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-3 text-[9px] font-bold text-red-600 disabled:opacity-30"
            >
              <Trash2 size={13} />
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={saveModel}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-[#202720] px-5 py-3 text-[9px] font-bold text-white disabled:opacity-50"
          >
            {saving ? <RefreshIcon /> : <Save size={13} />}
            {saving ? "Saving" : "Save model"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-semibold text-red-600">
          {error}
        </div>
      )}

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.5fr]">
        <div className="space-y-5">
          {/* BASIC INFO */}

          <div className="rounded-[28px] bg-white p-5">
            <SectionTitle
              title="Basic information"
              description="Identity and presentation"
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
                  onChange={(e) => setStatus(e.target.value as Model["status"])}
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
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this device does..."
                  className="w-full resize-none rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 py-3 text-[10px] outline-none"
                />
              </div>
            </div>
          </div>

          {/* IMAGE */}

          <div className="rounded-[28px] bg-white p-5">
            <SectionTitle
              title="Product image"
              description="Shown to users on Home and Monitor"
            />

            <div className="mt-5 overflow-hidden rounded-2xl bg-[#edf2e8]">
              <div className="flex h-56 items-center justify-center">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-contain p-8"
                  />
                ) : (
                  <ImageIcon size={35} className="text-[#aab3a5]" />
                )}
              </div>

              <div className="border-t border-black/5 p-3">
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL"
                  className="h-10 w-full rounded-xl bg-white px-3 text-[9px] outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CAPABILITIES */}

        <div className="rounded-[28px] bg-white p-5">
          <div className="flex items-start justify-between">
            <SectionTitle
              title="Capabilities"
              description="These definitions drive the generic user UI"
            />
          </div>

          {/* SENSORS */}

          <CapabilityGroup
            title="Sensors"
            description="Data the physical device reports"
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
              description="Hardware the user can control"
              items={actuators}
              group="actuators"
              onAdd={() => addCapability("actuators")}
              onUpdate={updateCapability}
              onRemove={removeCapability}
            />
          </div>

          <div className="mt-7 rounded-2xl bg-[#f4f8ee] p-4">
            <div className="flex items-center gap-2 text-[#58733d]">
              <Check size={14} />

              <p className="text-[9px] font-bold">
                Dynamic-device architecture
              </p>
            </div>

            <p className="mt-2 text-[9px] leading-4 text-[#77836d]">
              Once saved, your Home and Monitor pages can render these sensors
              and controls without hardcoding the device model.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function CapabilityGroup({
  title,
  description,
  items,
  group,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  description: string;
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
    <div className="mt-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold">{title}</p>

          <p className="mt-0.5 text-[8px] text-[#9aa198]">{description}</p>
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
          <div className="rounded-2xl border border-dashed border-[#dfe5da] px-4 py-6 text-center">
            <p className="text-[9px] text-[#9aa198]">
              No {title.toLowerCase()}
              defined.
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={`${group}-${index}`}
              className="rounded-2xl bg-[#f7f9f6] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <SmallField
                  label="Key"
                  value={item.key}
                  onChange={(value) =>
                    onUpdate(group, index, {
                      key: value,
                    })
                  }
                  placeholder="temperature"
                />

                <SmallField
                  label="Label"
                  value={item.label ?? ""}
                  onChange={(value) =>
                    onUpdate(group, index, {
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
                    value={item.type}
                    onChange={(e) =>
                      onUpdate(group, index, {
                        type: e.target.value as CapabilityType,
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
                  value={item.unit ?? ""}
                  onChange={(value) =>
                    onUpdate(group, index, {
                      unit: value,
                    })
                  }
                  placeholder="°C"
                />

                {item.type === "number" && (
                  <>
                    <SmallField
                      label="Min"
                      value={item.min === undefined ? "" : String(item.min)}
                      onChange={(value) =>
                        onUpdate(group, index, {
                          min: value === "" ? undefined : Number(value),
                        })
                      }
                      placeholder="Optional"
                    />

                    <SmallField
                      label="Max"
                      value={item.max === undefined ? "" : String(item.max)}
                      onChange={(value) =>
                        onUpdate(group, index, {
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
                  onClick={() => onRemove(group, index)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-[8px] font-bold text-red-500"
                >
                  <Trash2 size={12} />
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

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

      <p className="mt-1 text-[9px] text-[#99a198]">{description}</p>
    </div>
  );
}

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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f9faf8] px-3 text-[10px] outline-none"
      />
    </div>
  );
}

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
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-[#dfe5da] bg-white px-2.5 text-[9px] outline-none"
      />
    </div>
  );
}

function cleanCapability(item: Capability) {
  return {
    key: item.key.trim(),
    label: item.label?.trim() || undefined,
    type: item.type,
    unit: item.unit?.trim() || undefined,
    ...(item.min !== undefined ? { min: item.min } : {}),
    ...(item.max !== undefined ? { max: item.max } : {}),
  };
}

function RefreshIcon() {
  return <RefreshCcw size={13} className="animate-spin" />;
}
