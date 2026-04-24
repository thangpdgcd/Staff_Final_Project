/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8f4f0',
          100: '#efe5da',
          200: '#decab5',
          300: '#c9a687',
          400: '#b48564',
          500: '#8f6244',
          600: '#6f4e37',
          700: '#4b3621',
          800: '#362516',
          900: '#23170d',
        },
      },
    },
  },
  plugins: [],
}

