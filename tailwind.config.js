import fluid, { extract, screens } from 'fluid-tailwind';
import { createThemes } from 'tw-colors';

import plugin from 'tailwindcss/plugin';

import { getThemeInterfaceVars } from './src/theme/oklch';
import { getThemeForYear, YEARS_WITH_THEME } from './src/theme/themes';

/**
 * Hue-derived interface palette (see src/design-system/tokens.css). The
 * `*-raw` variables hold bare OKLCH triplets so `<alpha-value>` can be appended
 * (`bg-p-800/50`).
 */
const oklchToken = (name) => `oklch(var(--${name}-raw) / <alpha-value>)`;

/**
 * tw-colors only understands plain colors and warns on anything else. Gradient
 * values (e.g. 2026 `panelInfo.inactiveBg`) are painted inline at runtime by
 * getSpecialBackgroundStyle, so the CSS variable only needs a solid fallback:
 * the gradient's first color stop.
 */
const toTwColorsColors = (colors) =>
  Object.fromEntries(
    Object.entries(colors).map(([key, value]) => {
      if (value && typeof value === 'object') {
        return [key, toTwColorsColors(value)];
      }
      if (typeof value === 'string' && /gradient\(/i.test(value)) {
        const firstStop = value.match(
          /#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)/i,
        );

        return [key, firstStop ? firstStop[0].toLowerCase() : 'transparent'];
      }

      return [key, value];
    }),
  );

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
      colors: {
        'p-950': oklchToken('p-950'),
        'p-900': oklchToken('p-900'),
        'p-800': oklchToken('p-800'),
        'p-750': oklchToken('p-750'),
        'p-700': oklchToken('p-700'),
        accent: oklchToken('accent'),
        'accent-2': oklchToken('accent-2'),
        // Text on an accent fill: white, or dark for light accents.
        'accent-ink': 'var(--accent-ink)',
        gold: oklchToken('gold'),
      },
      borderColor: {
        hair: 'var(--hair)',
        'hair-2': 'var(--hair-2)',
      },
      boxShadow: {
        card: '0 8px 22px rgba(0,0,0,.30)',
        contest: '0 10px 26px rgba(0,0,0,.36)',
        menu: '0 18px 44px rgba(0,0,0,.60)',
        act: 'inset 0 1px 0 rgba(255,255,255,.10), 0 3px 10px rgba(0,0,0,.30)',
      },
    },
  },
  plugins: [
    createThemes(
      Object.fromEntries(
        YEARS_WITH_THEME.map((year) => [
          year.toString(),
          toTwColorsColors(getThemeForYear(year.toString()).colors),
        ]),
      ),
      {
        produceThemeClass: (themeName) => `theme-${themeName}`,
      },
    ),
    fluid,
    // Per-theme interface tokens (`--prim-hue/-l/-c`, the hand-picked
    // `--accent-*` / `--accent-2-*` and their ink flags from
    // src/theme/interfaceAccents.ts) so
    // the OKLCH palette follows the active built-in theme with zero FOUC
    // (custom themes set them inline at runtime). `html` is part of the
    // selector so it outranks the `:root` defaults in tokens.css, which is
    // loaded later.
    plugin(({ addBase }) => {
      addBase(
        Object.fromEntries(
          YEARS_WITH_THEME.map((year) => [
            `html.theme-${year}, html[data-theme="${year}"]`,
            getThemeInterfaceVars(year.toString()),
          ]),
        ),
      );
    }),
  ],
};
