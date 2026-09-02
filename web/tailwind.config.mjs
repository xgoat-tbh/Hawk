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
        background: "#08090A",
        surface: {
          0: "#08090A",
          1: "#0D0E10",
          2: "#121417",
          3: "#17191C",
          4: "#1D2024",
          5: "#25282C",
        },
        border: {
          subtle: "#1C1F23",
          DEFAULT: "#24272B",
          strong: "#2B2F34",
          focus: "#3E434A",
        },
        text: {
          primary: "#F1F2F3",
          secondary: "#D5D7DA",
          tertiary: "#A9ADB2",
          muted: "#7E8389",
        },
        // Restrained semantic accents
        success: {
          DEFAULT: "#22c55e",
          soft: "rgba(34, 197, 94, 0.12)",
          border: "rgba(34, 197, 94, 0.28)",
          text: "#4ade80",
        },
        warning: {
          DEFAULT: "#f59e0b",
          soft: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.28)",
          text: "#fbbf24",
        },
        critical: {
          DEFAULT: "#ef4444",
          soft: "rgba(239, 68, 68, 0.12)",
          border: "rgba(239, 68, 68, 0.28)",
          text: "#f87171",
        },
        info: {
          DEFAULT: "#3b82f6",
          soft: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.28)",
          text: "#60a5fa",
        },
        feature: {
          DEFAULT: "#8b5cf6",
          soft: "rgba(139, 92, 246, 0.12)",
          border: "rgba(139, 92, 246, 0.28)",
          text: "#a78bfa",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
      boxShadow: {
        'clay-button': '0 2px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
        'clay-button-pressed': '0 1px 2px rgba(0,0,0,0.5), inset 0 1px 2px rgba(0,0,0,0.4)',
        'clay-input': 'inset 0 1px 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.02)',
        'panel-soft': '0 4px 20px rgba(0,0,0,0.45)',
        'popover-soft': '0 12px 36px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)',
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