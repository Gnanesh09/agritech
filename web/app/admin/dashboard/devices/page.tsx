"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Filter,
  Plus,
  Search,
} from "lucide-react";

import api from "../../../lib/axios";

type Status = "AVAILABLE" | "LINKED" | "BLOCKED" | "RETIRED";

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  macAddress: string | null;
  chipId: string | null;
  status: Status;
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
  deviceCount: number;
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);

  const [models, setModels] = useState<Model[]>([]);

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [total, setTotal] = useState(0);

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState("ALL");

  const [modelId, setModelId] = useState("ALL");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    loadModels();
  }, []);

  useEffect(() => {
    loadDevices();
  }, [page, status, modelId]);

  async function loadModels() {
    try {
      const response = await api.get("/admin/devicemodel");

      setModels(response.data?.deviceModels ?? []);
    } catch (err) {
      console.error("Models:", err);
    }
  }

  async function loadDevices() {
    try {
      setLoading(true);
      setError("");

      const query = new URLSearchParams({
        page: String(page),
        limit: "12",
      });

      if (status !== "ALL") {
        query.set("status", status);
      }

      if (modelId !== "ALL") {
        query.set("deviceModelId", modelId);
      }

      if (search.trim()) {
        query.set("search", search.trim());
      }

      const response = await api.get(`/admin/devices?${query.toString()}`);

      setDevices(response.data?.devices ?? []);

      setTotal(response.data?.pagination?.total ?? 0);

      setTotalPages(response.data?.pagination?.totalPages ?? 1);
    } catch (err: any) {
      console.error("Devices:", err);

      setError(err?.response?.data?.message || "Failed to load devices.");
    } finally {
      setLoading(false);
    }
  }

  function searchNow() {
    setPage(1);
    loadDevices();
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-white p-5 lg:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#9ca59a]">
              Inventory
            </p>

            <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.06em]">
              Physical Devices
            </h1>

            <p className="mt-2 text-[10px] text-[#929b91]">
              {total} registered devices
            </p>
          </div>

          <Link
            href="/admin/dashboard/devices/register"
            className="flex items-center justify-center gap-2 rounded-full bg-[#202720] px-5 py-3 text-[9px] font-bold text-white"
          >
            <Plus size={13} />
            Register device
          </Link>
        </div>

        <div className="mt-6 grid gap-2 xl:grid-cols-[1.5fr_0.7fr_0.7fr_auto]">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa39a]"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  searchNow();
                }
              }}
              placeholder="Search device code, serial, MAC..."
              className="h-11 w-full rounded-xl border border-[#e4e9e2] bg-[#f8f9f7] pl-10 pr-4 text-[9px] outline-none"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#e4e9e2] bg-[#f8f9f7] px-3 text-[9px] font-semibold outline-none"
          >
            <option value="ALL">All status</option>
            <option value="AVAILABLE">Available</option>
            <option value="LINKED">Linked</option>
            <option value="BLOCKED">Blocked</option>
            <option value="RETIRED">Retired</option>
          </select>

          <select
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#e4e9e2] bg-[#f8f9f7] px-3 text-[9px] font-semibold outline-none"
          >
            <option value="ALL">All models</option>

            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={searchNow}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#dff37a] px-4 text-[9px] font-bold"
          >
            <Filter size={13} />
            Apply
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-semibold text-red-600">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] bg-white">
        {loading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-2xl bg-[#f5f7f3]"
              />
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef3e8]">
              <Cpu size={25} className="text-[#7c935c]" />
            </div>

            <h2 className="mt-4 text-base font-semibold">No devices found</h2>

            <p className="mt-2 text-[10px] text-[#9aa198]">
              Try another filter or register a device.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-[#edf0eb]">
              {devices.map((device) => (
                <Link
                  key={device.id}
                  href={`/admin/dashboard/devices/${device.id}`}
                  className="group flex items-center gap-3 p-4 transition hover:bg-[#fafbf9]"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#eef3e8]">
                    {device.deviceModel.imageUrl ? (
                      <img
                        src={device.deviceModel.imageUrl}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Cpu size={19} className="text-[#85927f]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-bold">
                        {device.deviceCode}
                      </p>

                      <StatusBadge status={device.status} />
                    </div>

                    <p className="mt-1 text-[9px] text-[#99a197]">
                      {device.deviceModel.name}
                      {" · "}
                      {device.serialNumber}
                    </p>
                  </div>

                  <div className="hidden min-w-[170px] sm:block">
                    {device.owner ? (
                      <>
                        <p className="text-[10px] font-semibold">
                          {device.owner.username}
                        </p>

                        <p className="mt-0.5 truncate text-[8px] text-[#9ca39a]">
                          {device.owner.email}
                        </p>
                      </>
                    ) : (
                      <span className="text-[9px] text-[#a2aaa0]">
                        Unassigned
                      </span>
                    )}
                  </div>

                  <ChevronRight
                    size={15}
                    className="text-[#a6aea4] transition group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-[#edf0eb] p-4">
              <p className="text-[9px] text-[#9ba39a]">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f4ee] disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f4ee] disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
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
      className={`rounded-full px-2 py-1 text-[7px] font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
