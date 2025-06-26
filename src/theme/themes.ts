import { Year } from '../config';

import { ThemeRecord } from './types';

// We only support 2023-2025 themes, with 2025 as fallback
export const themes = {
  '2022': {
    colors: {
      primary: {
        700: '#963678',
        750: '#7e3065',
        800: '#5f264d',
        900: '#34182b',
        950: '#2b1323',
      },
      gray: {
        500: '#a08895',
        600: '#7a576e',
        900: '#56344b',
      },
      appBgColor: '#34182b',
      animatedBorder: '#b34105',
      countryItem: {
        bg: '#46163f',
        hoverBg: '#451c40',
        text: '#f8f1fe',
        pointsBg: '#46163f',
        juryPointsText: '#f8f1fe',
        juryLastPointsBg: '#4f776c',
        lastPointsText: '#f8f1fe',
        televoteUnfinishedText: '#f8f1fe',
        televoteActiveBg: '#863c6e',
        televoteOutline: '#b33d8f',
        televoteFinishedBg: '#b34105',
        televotePointsBg: '#b34105',
        televotePointsText: '#f8f1fe',
        televoteCountryText: '#f8f1fe',
        televoteLastPointsBg: '#4f776c',
        douzePointsBg: '#b34105',
        douzePointsText: '#f8f1fe',
        douzePointsBlock1: '#5f264d',
        douzePointsBlock2: '#4f776c',
        placeContainerBg: '#b34105',
        placeText: '#f8f1fe',
      },
      panelInfo: {
        activeBg: '#4f776c',
        activeText: '#e5f9f3',
        inactiveText: '#e5f9f3',
        inactiveBg: '#2d4844',
      },
    },
  },
  '2023': {
    colors: {
      primary: {
        700: '#314fdb',
        750: '#1c47d2',
        800: '#173aad',
        900: '#0c0e89',
        950: '#02035e',
      },
      gray: {
        500: '#8889a0',
        600: '#4d578f',
        900: '#2f355b',
      },
      appBgColor: '#1f3496',
      animatedBorder: '#fd0184',
      countryItem: {
        bg: '#fff',
        hoverBg: '#e0f2fe',
        text: '#1b1b1c',
        pointsBg: '#fd0184',
        juryPointsText: '#0041fd',
        televotePointsBg: '#0041fd',
        televoteActiveBg: '#0239d9',
        televotePointsText: '#fff',
        televoteCountryText: '#fff',
        televoteUnfinishedText: '#1b1b1c',
        televoteFinishedBg: '#1b1c87',
        televoteOutline: '#3b82f6',
        juryLastPointsBg: '#fef700',
        televoteLastPointsBg: '#fef700',
        lastPointsText: '#fd0184',
        douzePointsBg: '#fef700',
        douzePointsText: '#fd0184',
        douzePointsBlock1: '#0043fe',
        douzePointsBlock2: '#fd0184',
        placeContainerBg: '#fd0184',
        placeText: '#fff',
      },
      panelInfo: {
        activeBg: '#fef700',
        activeText: '#fd0184',
        inactiveText: '#1940be',
        inactiveBg: '#02035e',
      },
    },
  },
  '2024': {
    colors: {
      primary: {
        700: '#8622e4',
        750: '#621fae',
        800: '#4e2c7c',
        900: '#37185f',
        950: '#27064e',
      },
      gray: {
        500: '#9b7eb4',
        600: '#6d5582',
        900: '#482e57',
      },
      appBgColor: '#4e2c7c',
      animatedBorder: '#c93ebe',
      countryItem: {
        bg: '#622898',
        hoverBg: '#501f7f',
        text: '#fffbfd',
        pointsBg: '#c93ebe',
        juryPointsText: '#9868d2',
        televotePointsBg: '#9868d2',
        televoteActiveBg: '#9868d2',
        televotePointsText: '#fffbfd',
        televoteCountryText: '#fffbfd',
        televoteUnfinishedText: '#fffbfd',
        televoteFinishedBg: '#3b1162',
        televoteOutline: '#de84ef',
        juryLastPointsBg: '#2698bb',
        televoteLastPointsBg: '#2698bb',
        lastPointsText: '#fffbfd',
        douzePointsBg: '#de4ed2',
        douzePointsText: '#3d0887',
        douzePointsBlock1: '#710bb6',
        douzePointsBlock2: '#2698bb',
        placeContainerBg: '#622898',
        placeText: '#fffbfd',
      },
      panelInfo: {
        activeBg: '#530b97',
        activeText: '#2798bb',
        inactiveText: '#4e2c7c',
        inactiveBg: '#27064e',
      },
    },
  },
  '2025': {
    colors: {
      primary: {
        700: '#9f47f2',
        750: '#6720b9',
        800: '#551a97',
        900: '#3f1371',
        950: '#320d4e',
      },
      gray: {
        500: '#a272b6',
        600: '#765086',
        900: '#4c2d5d',
      },
      appBgColor: '#3a0451',
      animatedBorder: '#fefefe',
      countryItem: {
        bg: '#6224b9',
        hoverBg: '#511b9c',
        text: '#fefefe',
        pointsBg: '#fefefe',
        juryPointsText: '#010002',
        televotePointsBg: '#fefefe',
        televoteActiveBg: '#8138e7',
        televotePointsText: '#010002',
        televoteCountryText: '#fefefe',
        televoteUnfinishedText: '#fefefe',
        televoteFinishedBg: '#bb01c5',
        televoteOutline: '#a088c2',
        juryLastPointsBg: '#bb01c5',
        televoteLastPointsBg: '#9e21de',
        lastPointsText: '#fefefe',
        douzePointsBg: '#05d9d9',
        douzePointsText: '#0e2986',
        douzePointsBlock1: '#710bb6',
        douzePointsBlock2: '#2698bb',
        placeContainerBg: '#7919ab',
        placeText: '#fffbfd',
      },
      panelInfo: {
        activeBg: '#530b97',
        activeText: '#c206cd',
        inactiveText: '#6426a9',
        inactiveBg: '#320d4e',
      },
    },
  },
} as ThemeRecord;

const yearsWithThemes = Object.keys(themes);

// Helper function to get theme for any year
export function getThemeForYear(year: Year) {
  if (yearsWithThemes.includes(year)) {
    return themes[year];
  }

  return themes['2025']; // Fallback to 2025 theme
}
