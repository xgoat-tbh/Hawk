/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090a0d",
        surface: "#111318",
        surfaceHover: "#161920",
        border: "#1f222a",
        accent: {
          DEFAULT: "#5865F2",
          hover: "#4752C4",
        },
        muted: "#88909e",
        foreground: "#f3f4f6",
      },
    },
  },
  plugins: [],
};
