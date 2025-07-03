import { createThemes } from 'tw-colors';

import { getThemeForYear, YEARS_WITH_THEME } from './src/theme/themes';

/** @type {import('tailwindcss').Config} */
export default {
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
