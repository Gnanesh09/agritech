"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  Boxes,
  Cpu,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";

import { useState } from "react";

import { logoutServerAction } from "../../actions/auth";

import { toast } from "../../../components/ui/toast";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const router = useRouter();

  const [open, setOpen] = useState(false);

  async function logout() {
    try {
      await logoutServerAction();

      toast.add({
        title: "Signed out",
        description: "Admin session ended.",
        type: "success",
      });

      router.refresh();
      router.replace("/admin");
    } catch (error) {
      console.error("Admin logout:", error);
    }
  }

  const navigation = [
    {
      label: "Overview",
      href: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Device Models",
      href: "/admin/dashboard/models",
      icon: Boxes,
    },
    {
      label: "Devices",
      href: "/admin/dashboard/devices",
      icon: Cpu,
    },
    {
      label: "Settings",
      href: "/admin/dashboard/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7f3]">
      {/* MOBILE OVERLAY */}

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          flex w-[250px] flex-col
          border-r border-[#e5e9e2]
          bg-white
          transition-transform
          lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-20 items-center justify-between border-b border-[#edf0eb] px-5">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#9aa299]">
              ADMINISTRATION
            </p>

            <p className="mt-1 text-[25px] font-black tracking-[-0.07em]">
              agri<span className="text-[#89ad4d]">.</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full bg-[#f3f5f1] p-2 lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-[8px] font-bold uppercase tracking-[0.18em] text-[#a0a89e]">
            Manage
          </p>

          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin/dashboard"
                ? pathname === "/admin/dashboard"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  router.push(item.href);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-[11px] font-semibold transition ${
                  active
                    ? "bg-[#dff37a] text-[#202720]"
                    : "text-[#737b72] hover:bg-[#f2f5ef]"
                }`}
              >
                <Icon size={17} />

                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[#edf0eb] p-4">
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-[#f7f8f5] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#202720] text-white">
              <ShieldCheck size={16} />
            </div>

            <div>
              <p className="text-[10px] font-bold">Admin</p>

              <p className="mt-0.5 text-[8px] text-[#8f988d]">Authorized</p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-[10px] font-bold text-[#9a6666] hover:bg-red-50"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}

      <div className="lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#e5e9e2] bg-white/85 px-4 backdrop-blur-xl lg:px-7">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-[#f1f4ee] p-2.5 lg:hidden"
          >
            <Menu size={19} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden rounded-full bg-[#eef3e9] px-3 py-2 text-[9px] font-semibold text-[#6b8250] sm:block">
              Administration active
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dff37a] text-[10px] font-black">
              A
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-80px)] p-3 lg:p-6">
          <div className="mx-auto max-w-[1550px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
