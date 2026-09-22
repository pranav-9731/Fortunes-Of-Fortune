import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B1311",
        surface: "#182623",
        "surface-solid": "#152220",
        hairline: "rgba(31,58,52,0.55)",
        gold: "#D4AF37",
        "gold-glow": "#E2C044",
        coral: "#E05A47",
        ink: "#F3F1E7",
        muted: "#93A69E",
        dim: "#5E726B",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        DEFAULT: "4px",
      },
    },
  },
  plugins: [],
};
export default config;
