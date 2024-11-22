/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tertiary: {
          300: 'var(--color-tertiary-300)',
        },
        secondary: {
          500: 'var(--color-secondary-500)',
        },
        primary: {
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};
