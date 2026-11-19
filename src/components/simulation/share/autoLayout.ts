import {
  ImageCustomizationSettings,
  ShareImageAspectRatio,
} from '@/state/generalStore';

export type ShareItemSize = ImageCustomizationSettings['itemSize'];

/** Row sizes from smallest to largest (the Row size stepper's order). */
export const SHARE_ITEM_SIZES: readonly ShareItemSize[] = [
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
];

export const SHARE_MAX_COLUMNS = 8;

export type AutoShareLayout = Pick<
  ImageCustomizationSettings,
  | 'layout'
  | 'itemSize'
  | 'shortCountryNames'
  | 'titleFontSize'
  | 'subtitleFontSize'
  | 'brandingFontSize'
  | 'verticalPadding'
  | 'horizontalPadding'
>;

/**
 * The results image's layout for a number of rows and a format: columns, row
 * size, short names, text sizes and paddings. The share modal always uses
 * these text sizes and paddings (the graphics editor changes them); columns
 * and row size are "Auto" until the user steps them.
 */
export const getAutoShareLayout = (
  count: number,
  aspectRatio: ShareImageAspectRatio,
): AutoShareLayout => {
  const isLandscape = aspectRatio === ShareImageAspectRatio.LANDSCAPE;
  const isSquare = aspectRatio === ShareImageAspectRatio.SQUARE;
  const isPortrait = aspectRatio === ShareImageAspectRatio.PORTRAIT;

  if (count <= 6) {
    return {
      layout: 1,
      itemSize: '2xl',
      shortCountryNames: false,
      titleFontSize: 42,
      subtitleFontSize: 26,
      brandingFontSize: 22,
      verticalPadding: isPortrait ? 40 : 20,
      horizontalPadding: isLandscape ? 130 : 100,
    };
  }

  if (count <= 12) {
    return {
      layout: isPortrait ? 1 : 2,
      itemSize: 'xl',
      shortCountryNames: false,
      titleFontSize: 48,
      subtitleFontSize: 28,
      brandingFontSize: 22,
      verticalPadding: isPortrait ? 64 : 40,
      horizontalPadding: isLandscape ? 88 : 50,
    };
  }

  if (count <= 16) {
    return {
      layout: 2,
      itemSize: 'xl',
      shortCountryNames: false,
      titleFontSize: 42,
      subtitleFontSize: 26,
      brandingFontSize: 20,
      verticalPadding: isPortrait ? 46 : 16,
      horizontalPadding: isLandscape ? 90 : 50,
    };
  }

  if (count <= 27) {
    return {
      layout: isLandscape ? 3 : 2,
      itemSize: 'lg',
      shortCountryNames: false,
      titleFontSize: 36,
      subtitleFontSize: 24,
      brandingFontSize: 20,
      verticalPadding: isPortrait ? 46 : 16,
      horizontalPadding: isLandscape ? 72 : 50,
    };
  }

  if (count <= 48) {
    return {
      layout: isLandscape ? 4 : isSquare ? 3 : 2,
      itemSize: count <= 32 ? 'lg' : 'md',
      shortCountryNames: count <= 32 && isSquare,
      titleFontSize: 34,
      subtitleFontSize: 22,
      brandingFontSize: 18,
      verticalPadding: 15,
      horizontalPadding: 64,
    };
  }

  if (count <= 65) {
    return {
      layout: isLandscape ? 5 : isSquare ? 4 : 3,
      itemSize: 'md',
      shortCountryNames: isSquare,
      titleFontSize: 32,
      subtitleFontSize: 20,
      brandingFontSize: 18,
      verticalPadding: 8,
      horizontalPadding: isPortrait ? 36 : 56,
    };
  }

  if (count <= 80) {
    return {
      layout: isLandscape ? 5 : isSquare ? 4 : 3,
      itemSize: 'sm',
      shortCountryNames: isSquare,
      titleFontSize: 32,
      subtitleFontSize: 20,
      brandingFontSize: 18,
      verticalPadding: isPortrait ? 10 : 2,
      horizontalPadding: isPortrait ? 36 : 40,
    };
  }

  if (count <= 100) {
    return {
      layout: isLandscape ? 6 : isSquare ? 5 : 4,
      itemSize: 'sm',
      shortCountryNames: isSquare,
      titleFontSize: 32,
      subtitleFontSize: 20,
      brandingFontSize: 18,
      verticalPadding: isPortrait ? 10 : 0,
      horizontalPadding: isPortrait ? 24 : 40,
    };
  }

  return {
    layout: isLandscape ? (count <= 112 ? 7 : 8) : 5,
    itemSize: 'sm',
    shortCountryNames: true,
    titleFontSize: 32,
    subtitleFontSize: 20,
    brandingFontSize: 18,
    verticalPadding: isPortrait ? 10 : 0,
    horizontalPadding: isPortrait ? 20 : 40,
  };
};
