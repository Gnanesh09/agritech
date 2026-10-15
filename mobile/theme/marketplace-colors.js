/**
 * Marketplace design tokens.
 * Keep this as the single color source: tailwind.config.js and React Native styles both import it.
 * To recolor the UI, change the named tokens here rather than editing individual screens.
 */
exports.MARKETPLACE_COLORS = {
  // These four tokens mirror the original Tailwind config names and values.
  primary: "#C8FF67",
  primaryDark1: "#0a1102",
  accent: "#F59E0B",
  card: "#1A1A2E",

  // Supporting semantic tokens for text, dividers, surfaces, and status states.
  bg: "#0a1102",
  ink: "#F2F4EC",
  muted: "#9AA38F",
  line: "#303146",
  soft: "#20251B",
  white: "#F5F7EF",
  black: "#0a1102",
  green: "#C8FF67",
  greenDark: "#0a1102",
  greenSoft: "rgba(200, 255, 103, 0.14)",
  lime: "#C8FF67",
  orange: "#F59E0B",
  red: "#FF7373",
  blue: "#86B3FF",
  danger: "#FF7373",
  success: "#C8FF67",
};

/** Build native-map rgba colors from a configured hex token, so changing primary updates the radius overlay too. */
exports.withAlpha = (hex, alpha) => {
  const raw = String(hex || "#000000").replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((part) => part + part).join("") : raw;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return `rgba(0, 0, 0, ${alpha})`;
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};
