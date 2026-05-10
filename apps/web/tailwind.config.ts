import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F7F4EE",
          2: "#FBF9F4",
          3: "#F2EDE3",
        },
        ink: {
          DEFAULT: "#1A1A1A",
          2: "#5C5648",
          3: "#9A9486",
          4: "#BDB6A6",
        },
        rule: {
          DEFAULT: "#E8E2D8",
          strong: "#D6CFC1",
        },
        accent: {
          DEFAULT: "#2A3D5F",
          soft: "#EAE8F0",
          ink: "#1B2A45",
        },
        positive: { DEFAULT: "#5C7A5A", soft: "#E8EFE5" },
        warning: { DEFAULT: "#A36B4A", soft: "#F5EAE0" },
        negative: { DEFAULT: "#8B3A3A", soft: "#F3E1E1" },
        // Optimus-style landing tokens (CSS-var backed; defined in globals.css)
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--secondary-foreground) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        destructive: "rgb(var(--destructive) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight: "-0.015em",
      },
      borderRadius: {
        DEFAULT: "6px",
        lg: "10px",
        xl: "14px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(26, 26, 26, 0.04), 0 4px 16px -8px rgba(26, 26, 26, 0.06)",
        lift: "0 1px 0 rgba(26, 26, 26, 0.06), 0 12px 32px -16px rgba(26, 26, 26, 0.10)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        in: "cubic-bezier(0.4, 0, 0.6, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
