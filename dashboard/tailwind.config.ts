import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1A4F8A",
          green: "#2E7D32",
          gold: "#C9A84C",
        },
        transit: {
          city: "#0066CC",
          brt: "#E60026",
          serveece: "#FF8C00",
          intercity: "#6B21A8",
          walking: "#6B7280",
        },
        status: {
          ontime: "#16A34A",
          delayed: "#EAB308",
          cancelled: "#DC2626",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F8F9FA",
          tertiary: "#F1F3F5",
          dark: "#111827",
          "dark-2": "#1F2937",
          "dark-3": "#374151",
        },
        border: {
          DEFAULT: "#E5E7EB",
          dark: "#374151",
        },
        text: {
          primary: "#111827",
          secondary: "#6B7280",
          tertiary: "#9CA3AF",
          dark: "#F9FAFB",
          "dark-secondary": "#9CA3AF",
          "dark-tertiary": "#6B7280",
        },
      },
      fontFamily: {
        arabic: ['"IBM Plex Sans Arabic"', "sans-serif"],
        latin: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "16px" }],
        xs: ["13px", { lineHeight: "18px" }],
        sm: ["14px", { lineHeight: "20px" }],
        base: ["15px", { lineHeight: "22px" }],
        lg: ["16px", { lineHeight: "24px" }],
        xl: ["18px", { lineHeight: "26px" }],
        "2xl": ["20px", { lineHeight: "28px" }],
        "3xl": ["24px", { lineHeight: "30px" }],
        "4xl": ["28px", { lineHeight: "34px" }],
        "5xl": ["32px", { lineHeight: "38px" }],
        "6xl": ["40px", { lineHeight: "46px" }],
      },
      spacing: {
        18: "72px",
        68: "272px",
        88: "352px",
        128: "512px",
      },
      borderRadius: {
        input: "8px",
        card: "12px",
        modal: "16px",
        sheet: "24px",
        pill: "9999px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        md: "0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
        lg: "0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)",
        xl: "0 24px 64px rgba(0,0,0,0.16)",
      },
      keyframes: {
        "shimmer": {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;