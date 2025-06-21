/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundSize: { '200%': '200% 200%' },
      keyframes: {
        'gradient-x': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'pulse-scale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%':    { transform: 'scale(1.05)' },
        },
      },
      animation: {
        'gradient-x': 'gradient-x 5s ease infinite',
        'pulse-scale': 'pulse-scale 2s ease infinite',
      },
      colors: {
        'primary': {
          DEFAULT: '#3c50e0',
        },
        'primary-purple': {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
      },
    },
  },
  plugins: [],
}
