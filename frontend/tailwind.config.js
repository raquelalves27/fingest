/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F1E17",
          soft: "#16281F",
          border: "#22392D",
        },
        paper: {
          DEFAULT: "#F7F5EF",
          soft: "#FBFAF6",
          border: "#E4E0D4",
        },
        emerald: {
          DEFAULT: "#1B6B4A",
          bright: "#22C58C",
          deep: "#0F4A32",
        },
        clay: {
          DEFAULT: "#C4622D",
          soft: "#E08150",
        },
        olive: {
          DEFAULT: "#8B8577",
          light: "#B5AF9E",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 30, 23, 0.06), 0 8px 24px rgba(15, 30, 23, 0.04)",
      },
    },
  },
  plugins: [],
};
