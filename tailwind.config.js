/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        countryItem: {
          bg: 'var(--color-country-item-bg)',
          hoverBg: 'var(--color-country-item-hover-bg)',
          text: 'var(--color-country-item-text)',
          pointsBg: 'var(--color-country-item-points-bg)',
          televotePointsBg: 'var(--color-country-item-televote-points-bg)',
          televoteActiveBg: 'var(--color-country-item-televote-active-bg)',
          televoteText: 'var(--color-country-item-televote-text)',
          televoteUnfinishedText:
            'var(--color-country-item-televote-unfinished-text)',
          televoteFinishedBg: 'var(--color-country-item-televote-finished-bg)',
          televoteOutline: 'var(--color-country-item-televote-outline)',
          lastPointsBg: 'var(--color-country-item-last-points-bg)',
          lastPointsText: 'var(--color-country-item-last-points-text)',
          douzePointsBg: 'var(--color-country-item-douze-points-bg)',
          douzePointsText: 'var(--color-country-item-douze-points-text)',
          douzePointsBlock1: 'var(--color-country-item-douze-points-block1)',
          douzePointsBlock2: 'var(--color-country-item-douze-points-block2)',
        },
        panelInfo: {
          activeBg: 'var(--color-panel-info-active-bg)',
          activeText: 'var(--color-panel-info-active-text)',
        },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
};
