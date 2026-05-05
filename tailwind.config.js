/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fantasy-bg': '#111827',
        'fantasy-panel': '#1F2937',
        'fantasy-panel-light': '#374151',
        'epic-red': '#F16F4F',
        tier: {
          daily: '#10B981',
          normal: '#F3F4F6',
          rare: '#3B82F6',
          epic: '#A855F7',
          legend: '#F97316'
        }
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        serif: ['"Noto Serif TC"', 'serif'],
      }
    },
  },
  plugins: [],
}
