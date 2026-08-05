export const THEME = {
  colors: {
    brand: {
      DEFAULT: "#FFFC00",
      dark: "#000000",
      muted: "#888888",
      light: "#FFFEF2",
      border: "#F5F4E6",
    },
    accent: {
      snapRed: "#FF0049",
      chatBlue: "#00A9FF",
      snapPurple: "#C924C2",
      emerald: "#00D27F",
    },
    surface: {
      DEFAULT: "#FFFFFF",
      hover: "#FAFAFA",
    },
  },
  boxShadow: {
    soft: "0 4px 14px rgba(0, 0, 0, 0.03)",
    card: "0 8px 30px rgba(0, 0, 0, 0.05)",
    "card-hover": "0 10px 40px rgba(255, 252, 0, 0.15)",
  },
  borderRadius: {
    xl: "1rem",
    "2xl": "1.5rem",
    "3xl": "2rem",
    full: "9999px",
  },
} as const;