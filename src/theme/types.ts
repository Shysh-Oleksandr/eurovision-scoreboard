import { Year } from '../config';

export interface ThemeColors {
  primary: {
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
  };
  panelInfo: {
    activeBg: string;
    activeText: string;
    inactiveText: string;
  };
}

export interface Theme {
  colors: ThemeColors;
  hostingCountryLogo?: string;
}

export type ThemeRecord = Record<Year, Theme>;
