import { Year } from '../config';

export interface ThemeColors {
  primary: {
    800: string;
    900: string;
    950: string;
  };
  countryItem: {
    bg: string;
    hoverBg: string;
    text: string;
    pointsBg: string;
    televotePointsBg: string;
    televoteActiveBg: string;
    televoteText: string;
    televoteUnfinishedText: string;
    televoteFinishedBg: string;
    televoteOutline: string;
    lastPointsBg: string;
    lastPointsText: string;
    douzePointsBg: string;
    douzePointsText: string;
    douzePointsBlock1: string;
    douzePointsBlock2: string;
  };
  panelInfo: {
    activeBg: string;
    activeText: string;
  };
}

export interface Theme {
  colors: ThemeColors;
  backgroundImage: string;
}

export type ThemeRecord = Record<Year, Theme>;
