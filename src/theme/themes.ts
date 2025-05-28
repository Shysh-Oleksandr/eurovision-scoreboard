import BlueBg2023 from '../data/bgImages/BlueBg2023.jpg';
import PurpleBg2024 from '../data/bgImages/PurpleBg2024.jpg';

import { ThemeRecord } from './types';

export const themes: ThemeRecord = {
  '2023': {
    colors: {
      primary: {
        800: '#1940be',
        900: '#0c0e89',
        950: '#02035e',
      },
      countryItem: {
        bg: '#fff',
        hoverBg: '#e0f2fe',
        text: '#1b1b1c',
        pointsBg: '#fd0184',
        televotePointsBg: '#0041fd',
        televoteActiveBg: '#0239d9',
        televoteText: '#fff',
        televoteUnfinishedText: '#1b1b1c',
        televoteFinishedBg: '#1b1c87',
        televoteOutline: '#3b82f6',
        lastPointsBg: '#fef700',
        lastPointsText: '#fd0184',
        douzePointsBg: '#fef700',
        douzePointsText: '#fd0184',
        douzePointsBlock1: '#0043fe',
        douzePointsBlock2: '#fd0184',
      },
      panelInfo: {
        activeBg: '#fef700',
        activeText: '#fd0184',
      },
    },
    backgroundImage: BlueBg2023,
  },
  '2024': {
    colors: {
      primary: {
        800: '#4e2c7c',
        900: '#37185f',
        950: '#27064e',
      },
      countryItem: {
        bg: '#622898',
        hoverBg: '#501f7f',
        text: '#fffbfd',
        pointsBg: '#c93ebe',
        televotePointsBg: '#9868d2',
        televoteActiveBg: '#9868d2',
        televoteText: '#fffbfd',
        televoteUnfinishedText: '#fffbfd',
        televoteFinishedBg: '#3b1162',
        televoteOutline: '#de84ef',
        lastPointsBg: '#2698bb',
        lastPointsText: '#fffbfd',
        douzePointsBg: '#de4ed2',
        douzePointsText: '#3d0887',
        douzePointsBlock1: '#710bb6',
        douzePointsBlock2: '#2698bb',
      },
      panelInfo: {
        activeBg: '#530b97',
        activeText: '#2798bb',
      },
    },
    backgroundImage: PurpleBg2024,
  },
};
