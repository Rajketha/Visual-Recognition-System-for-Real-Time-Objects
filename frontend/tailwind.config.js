/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#080b14',
        glassBg: 'rgba(255, 255, 255, 0.45)',
        accentColor: '#7c3aed'
      }
    },
  },
  plugins: [],
}
