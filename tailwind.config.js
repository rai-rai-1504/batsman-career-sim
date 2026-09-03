/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cricket: {
          bg: '#0B1220',
          surface: '#141B2D',
          card: '#1B243B',
          accent: '#00D4A5',
          gold: '#FFB020',
          danger: '#FF4757',
          text: '#F5F7FA',
          muted: '#8A93A6',
          border: '#23304E'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.5s ease-in-out 2',
      }
    },
  },
  plugins: [],
}
