/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sky: "#4A90D9",
        ink: "#1A1A1A",
        cream: "#FAFAF7",
        sand: "#EAE6DF",
        border: "#E8E4DC",
        muted: "#B0AA9E",
        sunset: "#E07A30",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        btn: "12px",
        chip: "20px",
      },
    },
  },
  plugins: [],
}
