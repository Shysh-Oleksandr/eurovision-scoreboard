/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        yellow: {
          300: '#fef700',
        },
        pink: {
          500: '#fd0184',
        },
        blue: {
          600: '#0041fd',
          700: '#0043fe',
          800: '#1940be',
          900: '#0c0e89',
          950: '#02035e',
        },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};
