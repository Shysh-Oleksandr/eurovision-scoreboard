const { createThemes } = require('tw-colors');

const { getThemeForYear, YEARS_WITH_THEME } = require('./src/theme/themes');

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
        YEARS_WITH_THEME.map((year) => [
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
