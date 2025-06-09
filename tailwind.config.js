const { createThemes } = require('tw-colors');

const { SUPPORTED_YEARS } = require('./src/data/data');
const { getThemeForYear } = require('./src/theme/themes');

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
      Object.fromEntries(
        SUPPORTED_YEARS.map((year) => [
          year.toString(),
          getThemeForYear(year.toString()).colors,
        ]),
      ),
      {
        produceThemeClass: (themeName) => `theme-${themeName}`,
      },
    ),
  ],
};
