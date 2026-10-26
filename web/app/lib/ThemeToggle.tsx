"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { applyTheme, getSavedTheme, themeChangeEvent } from "./theme";
import type { Theme } from "./theme";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncFromDocument = () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      setReady(true);
    };
    const onPreferenceChange = () => {
      if (!getSavedTheme()) {
        applyTheme(media.matches ? "dark" : "light", false);
        syncFromDocument();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === "smartagri-theme") syncFromDocument();
    };

    syncFromDocument();
    window.addEventListener(themeChangeEvent, syncFromDocument);
    window.addEventListener("storage", onStorage);
    media.addEventListener("change", onPreferenceChange);
    return () => {
      window.removeEventListener(themeChangeEvent, syncFromDocument);
      window.removeEventListener("storage", onStorage);
      media.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  function toggle() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className={
        compact
          ? `dashboard-theme-toggle inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--dash-border)] bg-[var(--dash-surface)] text-[var(--dash-text-secondary)] transition-colors hover:bg-[var(--dash-surface-hover)] disabled:opacity-60 ${ready ? "" : "invisible"}`
          : `dashboard-theme-toggle flex w-full items-center gap-3 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] p-3 text-left transition-colors hover:bg-[var(--dash-surface-hover)] disabled:opacity-60 ${ready ? "" : "invisible"}`
      }
    >
      {compact ? (
        theme === "dark" ? <Sun size={16} /> : <Moon size={16} />
      ) : (
        <>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dash-surface-hover)] text-[var(--dash-accent)]">
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </span>
          <span className="text-[11px] font-medium text-[var(--dash-text-primary)]">
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </span>
        </>
      )}
    </button>
  );
}
