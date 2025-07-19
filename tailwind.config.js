import fluid, { extract, screens } from 'fluid-tailwind';
import { createThemes } from 'tw-colors';

import { getThemeForYear, YEARS_WITH_THEME } from './src/theme/themes';

/** @type {import('tailwindcss').Config} */
export default {
  content: {
    files: ['./src/**/*.{html,js,ts,jsx,tsx}'],
    extract,
  },
  theme: {
    screens,
    extend: {
      screens: {
        '2xs': '23rem', // 368px
        xs: '30rem', // 480px
        '2cols': '36rem', // 576px
      },
      willChange: {
        opacity: 'opacity',
        all: 'transform, opacity',
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
    fluid,
  ],
};
