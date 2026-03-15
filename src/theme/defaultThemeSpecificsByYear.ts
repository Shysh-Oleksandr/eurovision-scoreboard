import { ThemeSpecifics } from './types';

export const defaultThemeSpecificsByYear: Partial<
  Record<string, Partial<ThemeSpecifics>>
> = {
  '2025': {
    flagShape: 'big-rectangle',
    pointsContainerShape: 'triangle',
    boardAnimationMode: 'teleport',
    douzePointsAnimationMode: 'heartsGrid',
    uppercaseEntryName: true,
    juryActivePointsUnderline: true,
    isJuryPointsPanelRounded: false,
    usePointsCountUpAnimation: true,
  },
};
