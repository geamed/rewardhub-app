/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D9488', // teal-600
          light: '#2DD4BF',  // teal-400
          dark: '#0F766E'   // teal-700
        },
        secondary: '#F59E0B', // amber-500
        accent: '#10B981', // emerald-500
      }
    }
  },
  plugins: [],
}
