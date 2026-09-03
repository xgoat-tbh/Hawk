/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Soft dark neutral foundation
        background: "#08090a",
        surface: {
          0: "#08090a", // Deepest background
          1: "#0d0e10", // Primary content background
          2: "#121417", // Elevated panels & section headers
          3: "#17191c", // Interactive controls, rows, inputs
          4: "#1d2024", // Hover / selected state
          5: "#25282c", // Floating drawers, popovers, modals
        },
        border: {
          subtle: "#17191c",
          DEFAULT: "#1f2226",
          strong: "#2a2d33",
          focus: "#3d424a",
        },
        text: {
          primary: "#ededed",
          secondary: "#c8ccd0",
          tertiary: "#949aa2",
          muted: "#6e747c",
        },
        // Restrained semantic accents
        success: {
          DEFAULT: "#22c55e",
          soft: "rgba(34, 197, 94, 0.10)",
          border: "rgba(34, 197, 94, 0.22)",
          text: "#4ade80",
        },
        warning: {
          DEFAULT: "#f59e0b",
          soft: "rgba(245, 158, 11, 0.10)",
          border: "rgba(245, 158, 11, 0.22)",
          text: "#fbbf24",
        },
        critical: {
          DEFAULT: "#ef4444",
          soft: "rgba(239, 68, 68, 0.10)",
          border: "rgba(239, 68, 68, 0.22)",
          text: "#f87171",
        },
        info: {
          DEFAULT: "#3b82f6",
          soft: "rgba(59, 130, 246, 0.10)",
          border: "rgba(59, 130, 246, 0.22)",
          text: "#60a5fa",
        },
        // Authentic Discord theme preview tokens
        discord: {
          chat: "#313338",
          sidebar: "#2b2d31",
          dark: "#1e1f22",
          embed: "#2b2d31",
          text: "#dbdee1",
          muted: "#949ba4",
          tag: "#5865f2",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        'tactile-btn': '0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'tactile-btn-pressed': '0 0 1px rgba(0,0,0,0.6), inset 0 1px 2px rgba(0,0,0,0.45)',
        'tactile-input': 'inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.02)',
        'popover-clean': '0 10px 30px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05)',
        'drawer-clean': '-10px 0 35px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Geist",
          "Inter",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        mono: [
          "GeistMono",
          "Fira Code",
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