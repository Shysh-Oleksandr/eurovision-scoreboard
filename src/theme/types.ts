import { Year } from '../config';

export interface ThemeColors {
  primary: {
    700: string;
    750: string;
    800: string;
    900: string;
    950: string;
  };
  appBgColor: string;
  countryItem: {
    bg: string;
    hoverBg: string;
    text: string;
    pointsBg: string;
    juryPointsText: string;
    televotePointsBg: string;
    televoteActiveBg: string;
    televotePointsText: string;
    televoteCountryText: string;
    televoteUnfinishedText: string;
    televoteFinishedBg: string;
    televoteOutline: string;
    juryLastPointsBg: string;
    televoteLastPointsBg: string;
    lastPointsText: string;
    douzePointsBg: string;
    douzePointsText: string;
    douzePointsBlock1: string;
    douzePointsBlock2: string;
    placeContainerBg: string;
    placeText: string;
  };
  panelInfo: {
    activeBg: string;
    activeText: string;
    inactiveText: string;
  };
}

export interface Theme {
  colors: ThemeColors;
}

export interface ThemeInfo {
  hostingCountryLogo: string;
}

export type ThemeRecord = Record<Year, Theme>;
export type ThemeInfoRecord = Record<Year, ThemeInfo>;
