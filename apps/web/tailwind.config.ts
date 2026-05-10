import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        envelope: {
          bg: "#0b0c10",
          surface: "#13151c",
          border: "#2a2d36",
          accent: "#9ad0ff",
          good: "#9af0c1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
