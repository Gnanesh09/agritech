
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        primary: "#C8FF67",
        primaryDark1: "#0a1102",
        accent: "#F59E0B",
        card: "#1A1A2E",
      },

      fontFamily: {
        sans: ["Poppins_400Regular"],
        medium: ["Poppins_500Medium"],
        bold: ["Poppins_700Bold"],
        semiBold: ["Poppins_600SemiBold"],
        extraBold: ["Poppins_800ExtraBold"],
      },
    },
  },

  plugins: [],
};
