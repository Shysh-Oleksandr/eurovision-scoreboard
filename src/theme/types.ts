import { Year } from '../config';

export type PointsContainerShape = 'triangle' | 'square' | 'transparent';
export type FlagShape =
  | 'big-rectangle'
  | 'small-rectangle'
  | 'square'
  | 'round'
  | 'round-border'
  | 'none';

export type ItemState =
  | 'jury'
  | 'televoteUnfinished'
  | 'televoteActive'
  | 'televoteFinished'
  | 'unqualified';

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
    juryCountryText: string;
    juryPointsBg: string;
    juryPointsText: string;
    juryLastPointsBg: string;
    juryLastPointsText: string;
    juryPlaceContainerBg: string;
    juryPlaceText: string;

    televoteUnfinishedBg: string;
    televoteUnfinishedText: string;
    televoteUnfinishedPointsBg: string;
    televoteUnfinishedPointsText: string;
    televoteLastPointsBg: string;
    televoteLastPointsText: string;
    televoteUnfinishedPlaceContainerBg: string;
    televoteUnfinishedPlaceText: string;

    televoteActiveBg: string;
    televoteActiveText: string;
    televoteActivePointsBg: string;
    televoteActivePointsText: string;
    televoteActiveLastPointsBg: string;
    televoteActiveLastPointsText: string;
    televoteOutline: string;
    televoteActivePlaceContainerBg: string;
    televoteActivePlaceText: string;

    televoteFinishedBg: string;
    televoteFinishedText: string;
    televoteFinishedPointsBg: string;
    televoteFinishedPointsText: string;
    televoteFinishedLastPointsBg: string;
    televoteFinishedLastPointsText: string;
    televoteFinishedPlaceContainerBg: string;
    televoteFinishedPlaceText: string;

    unqualifiedBg: string;
    unqualifiedText: string;
    unqualifiedPointsBg: string;
    unqualifiedPointsText: string;
    unqualifiedLastPointsBg: string;
    unqualifiedLastPointsText: string;
    unqualifiedPlaceContainerBg: string;
    unqualifiedPlaceText: string;

    douzePointsBg: string;
    douzePointsText: string;
    douzePointsBlock1: string;
    douzePointsBlock2: string;
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
  backgroundImage: string;
}

export type ThemeRecord = Record<string, Theme>;
