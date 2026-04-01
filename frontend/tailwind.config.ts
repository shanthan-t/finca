import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        finca: {
          night: "#ffffff",
          surface: "#f5f5f5",
          glass: "rgba(255, 255, 255, 0.78)",
          mist: "#111111",
          mint: "#111111",
          lime: "#111111",
          cyan: "#4b5563",
          gold: "#111111",
          ember: "#dc2626",
          emerald: "#16a34a"
        }
      },
      fontFamily: {
        body: ["var(--font-mono)", "monospace"],
        display: ["var(--font-mono)", "monospace"],
        mono: ["var(--font-mono)", "monospace"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(17, 17, 17, 0.08), 0 24px 72px rgba(17, 17, 17, 0.12)",
        "glow-green": "0 0 0 1px rgba(22, 163, 74, 0.18), 0 22px 64px rgba(22, 163, 74, 0.18)",
        "glow-red": "0 0 0 1px rgba(220, 38, 38, 0.2), 0 22px 64px rgba(220, 38, 38, 0.18)",
        glass: "0 18px 60px rgba(17, 17, 17, 0.08)",
        stage: "0 30px 90px rgba(148, 163, 184, 0.2)"
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top, rgba(255,255,255,0.88), transparent 38%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.7), transparent 24%), linear-gradient(180deg, #f8fafc, #eef2f7)",
        "mesh-grid":
          "linear-gradient(rgba(17,17,17,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(17,17,17,0.05) 1px, transparent 1px)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        "pulse-soft": "pulse-soft 2.8s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
