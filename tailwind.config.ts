import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#F58220",
        accent: "#006F53",
        ink: "#06211A",
        background: "#F4F4F5",
        surface: "#FFFFFF",
      },
      boxShadow: {
        soft: "0 18px 45px -24px rgba(6, 33, 26, 0.22)",
        card: "0 14px 32px -24px rgba(6, 33, 26, 0.18)",
      },
      fontFamily: {
        sans: ["Aptos", "\"Segoe UI\"", "\"Helvetica Neue\"", "Arial", "sans-serif"],
        mono: ["\"IBM Plex Mono\"", "Consolas", "\"Courier New\"", "monospace"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top left, rgba(245,130,32,0.16), transparent 38%), radial-gradient(circle at top right, rgba(0,111,83,0.14), transparent 28%)",
      },
    },
  },
} satisfies Config;

export default config;
