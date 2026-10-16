import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        karaoke: {
          highlight: "#22c55e",
          phonetic: "#38bdf8",
          translation: "#94a3b8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
