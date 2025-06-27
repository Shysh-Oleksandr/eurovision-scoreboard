import { Year } from '../config';

export interface ThemeColors {
  primary: {
    700: string;
    750: string;
    800: string;
    900: string;
    950: string;
  };
  gray: {
    500: string;
    600: string;
    900: string;
  };
  appBgColor: string;
  animatedBorder: string;
  countryItem: {
    juryBg: string;
    juryHoverBg: string;
    juryCountryText: string;
    juryPointsBg: string;
    juryPointsText: string;
    juryLastPointsBg: string;
    juryLastPointsText: string;

    televoteUnfinishedBg: string;
    televoteUnfinishedText: string;
    televoteUnfinishedPointsBg: string;
    televoteUnfinishedPointsText: string;
    televoteActiveBg: string;
    televoteActiveText: string;
    televoteActivePointsBg: string;
    televoteActivePointsText: string;
    televoteOutline: string;
    televoteFinishedBg: string;
    televoteFinishedText: string;
    televoteFinishedPointsBg: string;
    televoteFinishedPointsText: string;
    televoteLastPointsBg: string;
    televoteLastPointsText: string;
    unqualifiedBg: string;
    unqualifiedText: string;

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
    inactiveBg: string;
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
