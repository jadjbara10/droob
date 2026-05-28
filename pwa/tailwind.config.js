/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        droob: {
          primary: "#1B5E20",
          secondary: "#FFC107",
          accent: "#D32F2F",
          bg: "#F5F5F5",
          text: "#212121",
        },
      },
      fontFamily: {
        arabic: ["Tajawal", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};