export type Theme = "light" | "dark";

const THEME_KEY = "smartagri-theme";
const THEME_EVENT = "smartagri-theme-change";

export function getSavedTheme(): Theme | null {
  try {
    const savedTheme = window.localStorage.getItem(THEME_KEY);
    return savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
  } catch {
    console.warn("Theme preference storage is unavailable.");
    return null;
  }
}

export function applyTheme(theme: Theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  if (persist) {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      console.warn("Theme preference could not be saved.");
    }
  }
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }));
}

export const themeChangeEvent = THEME_EVENT;
