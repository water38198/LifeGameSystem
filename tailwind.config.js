/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fantasy-bg': '#FAFAF7',
        'fantasy-panel': '#FFFFFF',
        'fantasy-panel-light': '#F5F4F0',
        'epic-red': '#F16F4F',
        tier: {
          daily: '#0891B2',
          normal: '#78716C',
          rare: '#3B82F6',
          epic: '#A855F7',
          legend: '#F97316'
        }
      },
      fontFamily: {
        sans: ['"Noto Sans TC"', 'sans-serif'],
        serif: ['"Noto Serif TC"', 'serif'],
      },
      boxShadow: {
        sketch: '4px 4px 0px 0px rgba(68,64,60,0.55)',
        'sketch-sm': '3px 3px 0px 0px rgba(68,64,60,0.4)',
      }
    },
  },
  plugins: [],
}
