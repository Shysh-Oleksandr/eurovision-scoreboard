import { normalizeFontAlias, resolveActiveFontAlias } from './fontAliases';
import { getThemeForYear } from './themes';
import { ThemeSpecifics } from './types';

import { CustomTheme } from '@/types/customTheme';

export const DEFAULT_THEME_SPECIFICS: ThemeSpecifics = {
  flagShape: 'big-rectangle',
  pointsContainerShape: 'triangle',
  boardAnimationMode: 'teleport',
  douzePointsAnimationMode: 'heartsGrid',
  uppercaseEntryName: true,
  juryActivePointsUnderline: true,
  isJuryPointsPanelRounded: false,
  usePointsCountUpAnimation: true,
  roundedCountryContainer: false,
};

const BOARD_ANIMATION_MODES = ['flip', 'teleport'] as const;
const DOUZE_POINTS_ANIMATION_MODES = ['parallelograms', 'heartsGrid'] as const;

const isBoardAnimationMode = (
  value: unknown,
): value is (typeof BOARD_ANIMATION_MODES)[number] => {
  return (
    typeof value === 'string' && BOARD_ANIMATION_MODES.includes(value as any)
  );
};

const isDouzePointsAnimationMode = (
  value: unknown,
): value is (typeof DOUZE_POINTS_ANIMATION_MODES)[number] => {
  return (
    typeof value === 'string' &&
    DOUZE_POINTS_ANIMATION_MODES.includes(value as any)
  );
};

const sanitizeThemeSpecifics = (
  specifics: Partial<ThemeSpecifics> | null | undefined,
): Partial<ThemeSpecifics> => {
  if (!specifics) {
    return {};
  }

  const sanitized: Partial<ThemeSpecifics> = {};

  if (specifics.flagShape) {
    sanitized.flagShape = specifics.flagShape;
  }

  if (specifics.pointsContainerShape) {
    sanitized.pointsContainerShape = specifics.pointsContainerShape;
  }

  if (isBoardAnimationMode(specifics.boardAnimationMode)) {
    sanitized.boardAnimationMode = specifics.boardAnimationMode;
  }

  if (isDouzePointsAnimationMode(specifics.douzePointsAnimationMode)) {
    sanitized.douzePointsAnimationMode = specifics.douzePointsAnimationMode;
  }

  if (typeof specifics.uppercaseEntryName === 'boolean') {
    sanitized.uppercaseEntryName = specifics.uppercaseEntryName;
  }

  if (typeof specifics.juryActivePointsUnderline === 'boolean') {
    sanitized.juryActivePointsUnderline = specifics.juryActivePointsUnderline;
  }

  if (typeof specifics.isJuryPointsPanelRounded === 'boolean') {
    sanitized.isJuryPointsPanelRounded = specifics.isJuryPointsPanelRounded;
  }

  if (typeof specifics.usePointsCountUpAnimation === 'boolean') {
    sanitized.usePointsCountUpAnimation = specifics.usePointsCountUpAnimation;
  }

  if (typeof specifics.roundedCountryContainer === 'boolean') {
    sanitized.roundedCountryContainer = specifics.roundedCountryContainer;
  }

  if (specifics.fontAlias) {
    sanitized.fontAlias = normalizeFontAlias(specifics.fontAlias);
  }

  return sanitized;
};

const mapLegacyCustomThemeSpecifics = (
  customTheme: CustomTheme | null,
): Partial<ThemeSpecifics> => {
  if (!customTheme) {
    return {};
  }

  return {
    flagShape: customTheme.flagShape,
    pointsContainerShape: customTheme.pointsContainerShape,
    boardAnimationMode: customTheme.boardAnimationMode,
    douzePointsAnimationMode: customTheme.douzePointsAnimationMode,
    uppercaseEntryName: customTheme.uppercaseEntryName,
    juryActivePointsUnderline: customTheme.juryActivePointsUnderline,
    isJuryPointsPanelRounded: customTheme.isJuryPointsPanelRounded,
    usePointsCountUpAnimation: customTheme.usePointsCountUpAnimation,
    roundedCountryContainer: customTheme.roundedCountryContainer,
    fontAlias: customTheme.fontAlias,
  };
};

export const resolveThemeSpecifics = (
  defaultThemeSpecifics: Partial<ThemeSpecifics> | undefined,
  customTheme: CustomTheme | null,
): ThemeSpecifics => {
  return {
    ...DEFAULT_THEME_SPECIFICS,
    ...sanitizeThemeSpecifics(defaultThemeSpecifics),
    ...sanitizeThemeSpecifics(mapLegacyCustomThemeSpecifics(customTheme)),
    ...sanitizeThemeSpecifics(customTheme?.themeSpecifics),
  };
};

export const resolveThemeSpecificsForGeneralState = ({
  themeYear,
  customTheme,
}: {
  themeYear: string;
  customTheme: CustomTheme | null;
}): ThemeSpecifics => {
  const baseThemeYear = customTheme?.baseThemeYear ?? themeYear;
  const baseTheme = getThemeForYear(baseThemeYear);

  return resolveThemeSpecifics(baseTheme.themeSpecifics, customTheme);
};

export const resolveThemeSpecificsForCustomTheme = (
  customTheme: CustomTheme,
): ThemeSpecifics => {
  const baseTheme = getThemeForYear(customTheme.baseThemeYear);

  return resolveThemeSpecifics(baseTheme.themeSpecifics, customTheme);
};

export const resolveThemeSpecificsForBaseThemeYear = (
  baseThemeYear: string,
): ThemeSpecifics => {
  const baseTheme = getThemeForYear(baseThemeYear);

  return resolveThemeSpecifics(baseTheme.themeSpecifics, null);
};

export const resolveActiveFontAliasForGeneralState = ({
  themeYear,
  customTheme,
  overrideThemeFont,
  overrideThemeFontAlias,
}: {
  themeYear: string;
  customTheme: CustomTheme | null;
  overrideThemeFont: boolean;
  overrideThemeFontAlias?: string | null;
}): string => {
  const specifics = resolveThemeSpecificsForGeneralState({
    themeYear,
    customTheme,
  });

  return resolveActiveFontAlias({
    overrideEnabled: overrideThemeFont,
    overrideAlias: overrideThemeFontAlias,
    themeAlias: specifics.fontAlias,
  });
};
