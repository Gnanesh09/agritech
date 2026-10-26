"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  User,
  Radar,
  Plus,
  Sprout,
  ChartNoAxesCombined,
  Settings,
  Sun,
  Moon,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/home", icon: Home },
  { label: "Add Device", href: "/home/add", icon: Plus },
  { label: "Monitor", href: "/home/monitor", icon: Radar },
  { label: "Analytics", href: "/home/analytics", icon: ChartNoAxesCombined },
  { label: "Profile", href: "/home/profile", icon: User },
];

type Theme = "dark" | "light";

export default function BottomNav() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<Theme>("dark");
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("smartagri-theme");
    const initialTheme: Theme = savedTheme === "light" ? "light" : "dark";

    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
    setThemeLoaded(true);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("smartagri-theme", nextTheme);
  }

  const isActive = (href: string) =>
    href === "/home"
      ? pathname === "/home"
      : pathname === href || pathname.startsWith(`${href}/`);

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
          <button
            type="button"
            onClick={toggleTheme}
            disabled={!themeLoaded}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-all duration-200 hover:border-[var(--accent)]/30 hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]">
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--text-primary)]">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-secondary)]">
                {theme === "dark" ? "Botanical Fresh" : "Neon Forest"}
              </span>
            </span>
            <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_9px_var(--accent)]" />
          </button>

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