/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050505",
        surface: "#0d0d10",
        surfaceHover: "#141418",
        surfaceElevated: "#1a1a20",
        border: "#222228",
        borderHover: "#33333e",
        foreground: "#f5f5f7",
        muted: "#8e8e93",
        subtle: "#48484a",
        accent: {
          DEFAULT: "#ffffff",
          hover: "#e5e5ea",
        },
        critical: {
          DEFAULT: "#ef4444",
          hover: "#dc2626",
          bg: "rgba(239, 68, 68, 0.1)",
          border: "rgba(239, 68, 68, 0.3)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Geist",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "GeistMono",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};