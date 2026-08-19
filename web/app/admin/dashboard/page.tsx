"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Plus,
  RefreshCw,
  ShieldAlert,
  Smartphone,
} from "lucide-react";

import api from "../../lib/axios";

type Stats = {
  total: number;
  available: number;
  linked: number;
  blocked: number;
  retired: number;
};

type Model = {
  id: string;
  name: string;
  code: string;
  status: "ACTIVE" | "INACTIVE" | "DISCONTINUED";
  imageUrl: string | null;
  deviceCount: number;
};

type Device = {
  id: string;
  deviceCode: string;
  serialNumber: string;
  status: "AVAILABLE" | "LINKED" | "BLOCKED" | "RETIRED";

  createdAt: string;

  deviceModel: {
    name: string;
    code: string;
    imageUrl: string | null;
  };

  owner: {
    username: string;
    email: string;
  } | null;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const [models, setModels] = useState<Model[]>([]);

  const [devices, setDevices] = useState<Device[]>([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load(manual = false) {
    try {
      if (manual) {
        setRefreshing(true);
      }

      setError("");

      const [statsResponse, modelsResponse, devicesResponse] =
        await Promise.all([
          api.get("/admin/devices/stats"),

          api.get("/admin/devicemodel"),

          api.get("/admin/devices?page=1&limit=6"),
        ]);

      setStats(statsResponse.data);

      setModels(modelsResponse.data?.deviceModels ?? []);

      setDevices(devicesResponse.data?.devices ?? []);
    } catch (err: any) {
      console.error("Dashboard error:", err);

      setError(
        err?.response?.data?.message || "Failed to load admin dashboard.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-44 animate-pulse rounded-[30px] bg-white" />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-[25px] bg-white"
            />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      name: "Total devices",
      value: stats?.total ?? 0,
      icon: Database,
    },

    {
      name: "Available",
      value: stats?.available ?? 0,
      icon: CheckCircle2,
    },

    {
      name: "Linked",
      value: stats?.linked ?? 0,
      icon: Smartphone,
    },

    {
      name: "Blocked",
      value: stats?.blocked ?? 0,
      icon: ShieldAlert,
    },
  ];

  return (
    <div className="space-y-5">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="overflow-hidden rounded-[30px] bg-[#202720] p-6 text-white lg:p-8">
        <div className="flex flex-col justify-between gap-7 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white/55">
              <Activity size={11} />
              Fleet control
            </div>

            <h1 className="mt-4 text-[38px] font-semibold leading-[0.98] tracking-[-0.07em] lg:text-[48px]">
              Good to see you,
              <br />
              Administrator.
            </h1>

            <p className="mt-4 max-w-lg text-[11px] leading-5 text-white/45">
              Monitor the hardware fleet, configure device models and control
              the lifecycle of every registered device.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-[9px] font-bold hover:bg-white/15 disabled:opacity-50"
            >
              <RefreshCw
                size={13}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              href="/admin/dashboard/devices/register"
              className="flex items-center gap-2 rounded-full bg-[#dff37a] px-4 py-3 text-[9px] font-black text-[#202720]"
            >
              <Plus size={13} />
              Register device
            </Link>
          </div>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-[10px] font-semibold text-red-600">
          <AlertTriangle size={15} />

          {error}
        </div>
      )}

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              key={card.name}
              className="rounded-[26px] border border-[#e7ebe4] bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3e7]">
                  <Icon size={18} className="text-[#6e894b]" />
                </div>

                <span className="text-[30px] font-semibold tracking-[-0.07em]">
                  {card.value}
                </span>
              </div>

              <p className="mt-5 text-[11px] font-bold">{card.name}</p>

              <p className="mt-1 text-[8px] text-[#9ca499]">
                Live inventory count
              </p>
            </div>
          );
        })}
      </section>

      {/* =====================================================
          MODELS
      ===================================================== */}

      <section className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <div className="rounded-[28px] bg-white p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-[#9ea79d]">
                Product definitions
              </p>

              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.05em]">
                Device models
              </h2>
            </div>

            <Link
              href="/admin/dashboard/models"
              className="text-[9px] font-bold text-[#6c864e]"
            >
              Manage
            </Link>
          </div>

          <div className="mt-5 space-y-2">
            {models.length === 0 ? (
              <div className="rounded-2xl bg-[#f8f9f6] p-6 text-center text-[10px] text-[#99a096]">
                No device models yet.
              </div>
            ) : (
              models.slice(0, 5).map((model) => (
                <Link
                  key={model.id}
                  href={`/admin/dashboard/models/${model.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-[#f7f9f5] p-3 transition hover:bg-[#eef3e8]"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                    {model.imageUrl ? (
                      <img
                        src={model.imageUrl}
                        alt=""
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Boxes size={17} className="text-[#8c9689]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[10px] font-bold">
                        {model.name}
                      </p>

                      <span className="rounded-full bg-[#eaf4da] px-2 py-0.5 text-[7px] font-bold text-[#678844]">
                        {model.status}
                      </span>
                    </div>

                    <p className="mt-1 text-[8px] text-[#9aa298]">
                      {model.code}
                      {" · "}
                      {model.deviceCount} devices
                    </p>
                  </div>

                  <ChevronRight size={14} className="text-[#9fa79e]" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* DEVICE STATUS */}

        <div className="rounded-[28px] bg-white p-5">
          <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-[#9ea79d]">
            Inventory health
          </p>

          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.05em]">
            Fleet status
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <HealthCard
              title="Available"
              value={stats?.available ?? 0}
              description="Ready for claim"
              icon={CheckCircle2}
              className="bg-[#f1f8e8]"
            />

            <HealthCard
              title="Linked"
              value={stats?.linked ?? 0}
              description="User-owned"
              icon={Smartphone}
              className="bg-[#edf3fb]"
            />

            <HealthCard
              title="Blocked"
              value={stats?.blocked ?? 0}
              description="Disabled"
              icon={ShieldAlert}
              className="bg-[#fff3ea]"
            />

            <HealthCard
              title="Retired"
              value={stats?.retired ?? 0}
              description="No longer active"
              icon={Cpu}
              className="bg-[#f0f0ee]"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          RECENT DEVICES
      ===================================================== */}

      <section className="rounded-[28px] bg-white p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.17em] text-[#9ea79d]">
              Latest inventory
            </p>

            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.05em]">
              Recently registered
            </h2>
          </div>

          <Link
            href="/admin/dashboard/devices"
            className="flex items-center gap-1 text-[9px] font-bold text-[#6d844f]"
          >
            Open devices
            <ChevronRight size={13} />
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#edf0eb] text-left">
                <th className="px-3 py-3 text-[8px] uppercase tracking-[0.14em] text-[#9da59b]">
                  Device
                </th>

                <th className="px-3 py-3 text-[8px] uppercase tracking-[0.14em] text-[#9da59b]">
                  Model
                </th>

                <th className="px-3 py-3 text-[8px] uppercase tracking-[0.14em] text-[#9da59b]">
                  Status
                </th>

                <th className="px-3 py-3 text-[8px] uppercase tracking-[0.14em] text-[#9da59b]">
                  Owner
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {devices.map((device) => (
                <tr
                  key={device.id}
                  className="border-b border-[#f0f2ee] last:border-0"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[#eef3e8]">
                        {device.deviceModel.imageUrl ? (
                          <img
                            src={device.deviceModel.imageUrl}
                            alt=""
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <Cpu size={14} className="text-[#7d8c78]" />
                        )}
                      </div>

                      <div>
                        <p className="text-[10px] font-bold">
                          {device.deviceCode}
                        </p>

                        <p className="mt-0.5 text-[8px] text-[#a0a79e]">
                          {device.serialNumber}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <p className="text-[10px] font-semibold">
                      {device.deviceModel.name}
                    </p>

                    <p className="mt-0.5 text-[8px] text-[#a0a79e]">
                      {device.deviceModel.code}
                    </p>
                  </td>

                  <td className="px-3 py-3">
                    <Status status={device.status} />
                  </td>

                  <td className="px-3 py-3">
                    {device.owner ? (
                      <div>
                        <p className="text-[10px] font-semibold">
                          {device.owner.username}
                        </p>

                        <p className="mt-0.5 text-[8px] text-[#9ca49a]">
                          {device.owner.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[9px] text-[#a1a89f]">
                        Unassigned
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/admin/dashboard/devices/${device.id}`}
                      className="inline-flex rounded-full bg-[#f3f5f1] p-2 transition hover:bg-[#dff37a]"
                    >
                      <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ============================================================
// HEALTH CARD
// ============================================================

function HealthCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: {
  title: string;
  value: number;
  description: string;
  icon: React.ElementType;
  className: string;
}) {
  return (
    <div className={`rounded-[22px] p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold">{title}</span>

        <Icon size={14} className="opacity-45" />
      </div>

      <p className="mt-5 text-[25px] font-semibold tracking-[-0.06em]">
        {value}
      </p>

      <p className="mt-0.5 text-[8px] opacity-55">{description}</p>
    </div>
  );
}

// ============================================================
// STATUS
// ============================================================

function Status({
  status,
}: {
  status: "AVAILABLE" | "LINKED" | "BLOCKED" | "RETIRED";
}) {
  const map = {
    AVAILABLE: "bg-[#eaf4d9] text-[#62833f]",

    LINKED: "bg-[#eaf0fb] text-[#55729e]",

    BLOCKED: "bg-[#fff0e9] text-[#a16547]",

    RETIRED: "bg-[#eeeeec] text-[#747a73]",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[7px] font-bold ${map[status]}`}
    >
      {status}
    </span>
  );
}
