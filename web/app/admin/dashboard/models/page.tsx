"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  Boxes,
  ChevronRight,
  Grid2X2,
  List,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import api from "../../../lib/axios";

type ModelStatus = "ACTIVE" | "INACTIVE" | "DISCONTINUED";

type DeviceModel = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  version: string | null;
  status: ModelStatus;
  imageUrl: string | null;
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
};

export default function ModelsPage() {
  const [models, setModels] = useState<DeviceModel[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<"ALL" | ModelStatus>("ALL");

  const [view, setView] = useState<"GRID" | "LIST">("GRID");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [error, setError] = useState("");

  useEffect(() => {
    loadModels();
  }, []);

  async function loadModels(manual = false) {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await api.get("/admin/devicemodel");

      setModels(response.data?.deviceModels ?? []);
    } catch (err: any) {
      console.error("Load models:", err);

      setError(err?.response?.data?.message || "Failed to load device models.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const filteredModels = useMemo(() => {
    const value = search.trim().toLowerCase();

    return models.filter((model) => {
      const matchesSearch =
        !value ||
        model.name.toLowerCase().includes(value) ||
        model.code.toLowerCase().includes(value);

      const matchesStatus = status === "ALL" || model.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [models, search, status]);

  async function deleteModel(id: string) {
    try {
      setDeleteId(id);

      await api.delete(`/admin/devicemodel/${id}`);

      setModels((current) => current.filter((model) => model.id !== id));
    } catch (err: any) {
      console.error("Delete model:", err);

      setError(err?.response?.data?.message || "Unable to delete this model.");
    } finally {
      setDeleteId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 w-60 animate-pulse rounded-2xl bg-white" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-[28px] bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-white p-5 lg:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9ca59a]">
              Catalog
            </p>

            <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.06em]">
              Device Models
            </h1>

            <p className="mt-2 max-w-xl text-[10px] leading-5 text-[#929b91]">
              Define the hardware types your platform supports, including
              images, versions and dynamic capabilities.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadModels(true)}
              className="flex items-center gap-2 rounded-full border border-[#e3e8e0] bg-[#fafbf9] px-4 py-3 text-[9px] font-bold"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              href="/admin/dashboard/models/new"
              className="flex items-center gap-2 rounded-full bg-[#202720] px-4 py-3 text-[9px] font-bold text-white"
            >
              <Plus size={13} />
              New model
            </Link>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-semibold text-red-600">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca49b]"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="h-12 w-full rounded-2xl border border-[#e6eae4] bg-[#f8f9f7] pl-11 pr-4 text-[10px] outline-none focus:border-[#91a66d]"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="h-12 rounded-2xl border border-[#e6eae4] bg-[#f8f9f7] px-4 text-[10px] font-semibold outline-none"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>

            <button
              type="button"
              onClick={() => setView(view === "GRID" ? "LIST" : "GRID")}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1f4ee]"
            >
              {view === "GRID" ? <List size={16} /> : <Grid2X2 size={16} />}
            </button>
          </div>
        </div>
      </section>

      {filteredModels.length === 0 ? (
        <div className="rounded-[28px] bg-white px-6 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef3e8]">
            <Boxes size={25} className="text-[#789154]" />
          </div>

          <h2 className="mt-4 text-lg font-semibold">No models found</h2>

          <p className="mx-auto mt-2 max-w-sm text-[10px] leading-5 text-[#99a198]">
            Create your first device model and define its capabilities.
          </p>

          <Link
            href="/admin/dashboard/models/new"
            className="mt-5 inline-flex rounded-full bg-[#202720] px-5 py-3 text-[10px] font-bold text-white"
          >
            Create model
          </Link>
        </div>
      ) : view === "GRID" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="overflow-hidden rounded-[28px] bg-white"
            >
              <div className="relative h-48 bg-[#edf2e8]">
                {model.imageUrl ? (
                  <img
                    src={model.imageUrl}
                    alt={model.name}
                    className="h-full w-full object-contain p-8"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Boxes size={45} className="text-[#b0b8aa]" />
                  </div>
                )}

                <div className="absolute left-4 top-4">
                  <StatusBadge status={model.status} />
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[17px] font-semibold">
                      {model.name}
                    </h2>

                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9ca49b]">
                      {model.code}
                    </p>
                  </div>

                  <span className="rounded-full bg-[#f1f4ee] px-2.5 py-1 text-[8px] font-bold text-[#6f7d6a]">
                    {model.deviceCount} devices
                  </span>
                </div>

                <p className="mt-4 line-clamp-2 min-h-[32px] text-[10px] leading-4 text-[#9aa198]">
                  {model.description || "No description added."}
                </p>

                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/admin/dashboard/models/${model.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#202720] py-3 text-[9px] font-bold text-white"
                  >
                    Manage
                    <ChevronRight size={12} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => deleteModel(model.id)}
                    disabled={deleteId === model.id || model.deviceCount > 0}
                    title={
                      model.deviceCount > 0
                        ? "Model cannot be deleted while devices use it"
                        : "Delete model"
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[28px] bg-white">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="flex items-center gap-4 border-b border-[#edf0eb] p-4 last:border-0"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#edf2e8]">
                {model.imageUrl ? (
                  <img
                    src={model.imageUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <Boxes size={20} className="text-[#8b9788]" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold">{model.name}</p>
                <p className="mt-1 text-[9px] text-[#99a198]">
                  {model.code}
                  {" · "}
                  {model.deviceCount}
                  {" devices"}
                </p>
              </div>

              <StatusBadge status={model.status} />

              <Link
                href={`/admin/dashboard/models/${model.id}`}
                className="rounded-full bg-[#f1f4ee] p-2"
              >
                <ChevronRight size={14} />
              </Link>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ModelStatus }) {
  const styles = {
    ACTIVE: "bg-[#e9f5da] text-[#658743]",
    INACTIVE: "bg-[#f0f0ed] text-[#767d75]",
    DISCONTINUED: "bg-[#fff0e9] text-[#a66648]",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[7px] font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
