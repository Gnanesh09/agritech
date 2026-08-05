import type { Config } from "tailwindcss";
import { THEME } from "./app/constants/theme";
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: THEME.colors,
      boxShadow: THEME.boxShadow,
      borderRadius: THEME.borderRadius,
    },
  },
  plugins: [],
};

export default config;