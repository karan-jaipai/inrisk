/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e6f8ed",
          100: "#c2ecd3",
          500: "#0f863c",
          600: "#0d7534",
          700: "#0a5c28",
        },
        chart: {
          max: "#0f863c",
          min: "#0873d7",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

