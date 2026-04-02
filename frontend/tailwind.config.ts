import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Surface layers ───────────────────────────────────────
        surface: {
          base:    "#050508",   // deepest bg — page body
          DEFAULT: "#0a0a0f",   // body bg  (used as surface/80 etc.)
          raised:  "#0f0f18",   // card / panel bg
          border:  "#1a1a2e",   // subtle separator
          hover:   "#13131e",   // hover bg on dark surfaces
        },
        // ── Brand — violet/indigo ────────────────────────────────
        brand: {
          50:      "#f5f3ff",
          100:     "#ede9fe",
          200:     "#ddd6fe",
          300:     "#c4b5fd",
          400:     "#a78bfa",
          500:     "#8b5cf6",
          600:     "#7c3aed",
          700:     "#6d28d9",
          800:     "#5b21b6",
          900:     "#4c1d95",
          DEFAULT: "#8b5cf6",
        },
        // ── Accent — cyan/teal ───────────────────────────────────
        accent: {
          light:   "#67e8f9",
          DEFAULT: "#22d3ee",
          dark:    "#06b6d4",
        },
        // ── Semantic states ──────────────────────────────────────
        success: { DEFAULT: "#10b981", light: "#34d399", muted: "rgba(16,185,129,0.12)" },
        warning: { DEFAULT: "#f59e0b", light: "#fbbf24", muted: "rgba(245,158,11,0.12)" },
        danger:  { DEFAULT: "#ef4444", light: "#f87171", muted: "rgba(239,68,68,0.12)"  },
        // ── Text scale ───────────────────────────────────────────
        ink: {
          primary:   "#f0f0ff",
          secondary: "#a0a0c0",
          tertiary:  "#60607a",
          disabled:  "#3e3e54",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },

      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem", letterSpacing: "0.025em" }],
      },

      letterSpacing: {
        widest: "0.15em",
      },

      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },

      boxShadow: {
        "glow-brand":  "0 0 24px rgba(139,92,246,0.22)",
        "glow-accent": "0 0 20px rgba(34,211,238,0.18)",
        "glow-sm":     "0 0 12px rgba(139,92,246,0.15)",
        "card":        "0 2px 16px rgba(0,0,0,0.35), 0 1px 3px rgba(0,0,0,0.25)",
        "card-hover":  "0 8px 40px rgba(0,0,0,0.50), 0 2px 8px rgba(0,0,0,0.35)",
        "nav":         "0 1px 0 rgba(26,26,46,0.8)",
      },

      backgroundImage: {
        "gradient-brand":   "linear-gradient(135deg, #8b5cf6 0%, #22d3ee 100%)",
        "gradient-brand-v": "linear-gradient(180deg, #8b5cf6 0%, #06b6d4 100%)",
        "gradient-surface": "linear-gradient(180deg, #0f0f18 0%, #050508 100%)",
        "gradient-radial":  "radial-gradient(ellipse at top, rgba(139,92,246,0.12) 0%, transparent 70%)",
      },

      animation: {
        "fade-in":    "fadeIn 0.35s ease forwards",
        "slide-up":   "slideUp 0.4s cubic-bezier(0,0,0.2,1) forwards",
        "slide-down": "slideDown 0.3s cubic-bezier(0,0,0.2,1) forwards",
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "shimmer":    "shimmer 1.8s linear infinite",
        "spin-slow":  "spin 2s linear infinite",
      },

      keyframes: {
        fadeIn:    { from: { opacity: "0" },                                        to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(10px)" },         to: { opacity: "1", transform: "translateY(0)" } },
        slideDown: { from: { opacity: "0", transform: "translateY(-8px)" },         to: { opacity: "1", transform: "translateY(0)" } },
        shimmer:   { from: { backgroundPosition: "-200% 0" },                       to:  { backgroundPosition: "200% 0" } },
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.0, 0.0, 0.2, 1)",
      },

      transitionDuration: {
        "250": "250ms",
      },

      screens: {
        xs: "480px",   // extra small — phones landscape
      },
    },
  },
  plugins: [],
};

export default config;
