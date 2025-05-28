const { createThemes } = require('tw-colors');

const { themes } = require('./src/theme/themes');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [
    createThemes(
      {
        2023: {
          ...themes['2023'].colors,
        },
        2024: {
          ...themes['2024'].colors,
        },
      },
      {
        produceThemeClass: (themeName) => `theme-${themeName}`,
      },
    ),
  ],
};
