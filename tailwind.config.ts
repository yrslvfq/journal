import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc8fc",
          400: "#36abf6",
          500: "#0c93e7",
          600: "#0075c6",
          700: "#015da1",
          800: "#064f84",
          900: "#0b426e",
          950: "#072a4a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "mesh-dark": "radial-gradient(at 40% 20%, hsla(220,70%,15%,1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(210,60%,12%,1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(215,50%,10%,1) 0px, transparent 50%)",
      },
      boxShadow: {
        "glow-sm": "0 0 20px -5px rgba(59, 130, 246, 0.15)",
        "glow": "0 0 30px -5px rgba(59, 130, 246, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
