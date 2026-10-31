"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  Cpu,
  Globe2,
  Home,
  Layers3,
  Radar,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
  Sprout,
  User,
  Warehouse,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ThemeToggle from "../app/lib/ThemeToggle";

const navigation = [
  { label: "Dashboard", href: "/home", icon: Home },
  { label: "Add Device", href: "/home/add", icon: Plus },
  { label: "Monitor", href: "/home/monitor", icon: Radar },
  { label: "Analytics", href: "/home/analytics", icon: ChartNoAxesCombined },
  { label: "Profile", href: "/home/profile", icon: User },
];

const dashboardGroups: {
  label: string;
  items: { label: string; href: string; icon: LucideIcon }[];
}[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/home", icon: Home },
      { label: "Microgreens", href: "/home/microgreens", icon: Layers3 },
      { label: "Greenhouses", href: "/home/greenhouses", icon: Warehouse },
    ],
  },
  {
    label: "Farm operations",
    items: [
      { label: "Devices & Sensors", href: "/home/monitor", icon: Cpu },
      { label: "Automation", href: "/home/automations", icon: Activity },
      { label: "Alerts & Notifications", href: "/home/alerts", icon: Bell },
      { label: "AI Agronomist", href: "/home/ai-agronomist", icon: Sparkles },
    ],
  },
  {
    label: "Business",
    items: [
      { label: "Marketplace", href: "/home/marketplace", icon: ShoppingBag },
      { label: "Market Intelligence", href: "/home/analytics", icon: ChartNoAxesCombined },
      { label: "Import & Export", href: "/home/import-export", icon: Globe2 },
    ],
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/home"
      ? pathname === "/home"
      : pathname === href || pathname.startsWith(`${href}/`);

  if (pathname.startsWith("/home")) {
    return (
      <>
        <aside className="dashboard-sidebar fixed inset-y-0 left-0 z-40 hidden w-[250px] flex-col border-r-0 bg-[var(--dash-sidebar)] px-[18px] py-7 text-[var(--dash-text-secondary)] shadow-none lg:flex">
          <Link href="/home" className="mb-8 flex items-center gap-3 px-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--dash-sage)] text-[var(--dash-accent)]">
              <Sprout size={24} />
            </span>
            <span>
              <span className="block text-[18px] font-bold tracking-[-0.04em] text-[var(--dash-text-primary)]">
                smartagri
              </span>
              <span className="block text-[8px] font-semibold uppercase tracking-[0.22em] text-[var(--dash-text-secondary)]">
                Autonomous agriculture
              </span>
            </span>
          </Link>

          <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--dash-sage)] text-[var(--dash-accent)]">
              <Sprout size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-[var(--dash-text-primary)]">
                Your growing space
              </span>
              <span className="mt-0.5 block text-[10px] text-[var(--dash-text-secondary)]">
                Connected workspace
              </span>
            </span>
            <ChevronDown size={14} className="text-[var(--dash-text-secondary)]" />
          </div>

          <nav aria-label="Dashboard navigation" className="dashboard-nav-scroll min-h-0 flex-1 space-y-6 overflow-y-auto">
            {dashboardGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--dash-text-muted)]">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map(({ label, href, icon: Icon }) => {
                    const active = isActive(href);
                    const className = `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium transition ${
                      active
                        ? "bg-[var(--dash-sage)] text-[var(--dash-accent)]"
                        : "text-[var(--dash-text-secondary)] hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text-primary)]"
                    }`;
                    const content = (
                      <>
                        <Icon size={16} aria-hidden="true" />
                        <span>{label}</span>
                      </>
                    );
                    return (
                      <Link
                        key={label}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={className}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <Link
              href="/home/profile"
              aria-current={isActive("/home/profile") ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-medium transition ${
                isActive("/home/profile")
                  ? "bg-[var(--dash-sage)] text-[var(--dash-accent)]"
                  : "text-[var(--dash-text-secondary)] hover:bg-[var(--dash-surface-hover)] hover:text-[var(--dash-text-primary)]"
              }`}
            >
              <User size={16} aria-hidden="true" />
              Profile
            </Link>
          </nav>

          <div className="mt-5 border-t border-[var(--dash-border)] pt-4">
            <ThemeToggle />
            <div className="mt-3 rounded-xl bg-[var(--dash-surface-hover)] p-3">
              <p className="text-[11px] font-semibold text-[var(--dash-text-primary)]">Smart farming</p>
              <p className="mt-1 text-[10px] leading-4 text-[var(--dash-text-secondary)]">
                Monitor growing conditions from one place.
              </p>
            </div>
          </div>
        </aside>

        <nav
          aria-label="Mobile dashboard navigation"
          className="fixed bottom-3 left-3 right-3 z-50 lg:hidden"
        >
          <div className="flex h-[62px] items-center rounded-2xl border border-[var(--dash-border)] bg-[var(--dash-sidebar)]/95 p-1 shadow-[var(--dash-shadow)] backdrop-blur">
            <div className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto">
              {dashboardGroups.flatMap((group) => group.items).map(({ label, href, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    title={label}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-full min-w-[62px] shrink-0 flex-col items-center justify-center rounded-xl px-2 ${
                      active ? "bg-[var(--dash-sage)] text-[var(--dash-accent)]" : "text-[var(--dash-text-secondary)]"
                    }`}
                  >
                    <Icon size={17} />
                    <span className="mt-0.5 max-w-[74px] truncate text-[9px] font-medium">
                      {label === "Dashboard" ? "Home" : label}
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="ml-1 shrink-0 border-l border-[var(--dash-border)] pl-1">
              <ThemeToggle compact />
            </div>
          </div>
        </nav>
      </>
    );
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[var(--border)] bg-[var(--sidebar-bg)] px-5 py-7 transition-colors duration-200 lg:flex">
        <Link href="/home" className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)] shadow-[0_0_24px_color-mix(in_srgb,var(--accent)_10%,transparent)]">
            <Sprout size={25} />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              SmartAgri
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Farm Intelligence
            </p>
          </div>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Workspace
        </p>

        <nav className="flex flex-col gap-2">
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-200 ${active
                    ? "border-[var(--accent)]/25 bg-[var(--accent)]/10 text-[var(--accent)] shadow-[inset_0_0_20px_color-mix(in_srgb,var(--accent)_5%,transparent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
                  }`}
              >
                {active && (
                  <span className="absolute bottom-2 left-0 top-2 w-[3px] rounded-r-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
                )}
                <Icon
                  size={19}
                  className={active ? "drop-shadow-[0_0_7px_var(--accent)]" : ""}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <ThemeToggle />

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors">
            <div className="mb-2 flex items-center gap-2 text-[var(--accent)]">
              <Settings size={17} />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Smart farming
              </span>
            </div>
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Monitor your growing environment from one place.
            </p>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--border)]">
              <div className="h-full w-2/3 rounded-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)]" />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 lg:hidden">
        <div className="flex h-[68px] items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--sidebar-bg)]/95 p-1.5 shadow-[var(--card-shadow)] backdrop-blur-xl">
          {navigation
            .filter(({ href }) => href !== "/home/analytics")
            .map(({ label, href, icon: Icon }) => {
              const active = isActive(href);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full min-w-[62px] flex-col items-center justify-center rounded-full px-2 transition-all duration-200 ${active
                      ? "bg-[var(--accent)]/12 text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                    }`}
                >
                  <Icon
                    size={19}
                    className={active ? "drop-shadow-[0_0_7px_var(--accent)]" : ""}
                  />
                  <span className="mt-1 text-[10px] font-medium">
                    {label === "Dashboard"
                      ? "Home"
                      : label === "Add Device"
                        ? "Add"
                        : label}
                  </span>
                </Link>
              );
            })}
        </div>
      </nav>
    </>
  );
}