import { CSSProperties, useMemo } from 'react';

import {
  buildBackgroundColorLookup,
  extractSolidColorFromColorValue,
  getSpecialBackgroundStyle,
} from '../../../countryItem/utils/gradientUtils';

import { hslStringToHex, parseColor } from '@/helpers/colorConversion';
import { useGeneralStore } from '@/state/generalStore';

export interface LadderStyles {
  /** Track: the active place colour on top, the finished one below. */
  trackBackground: string;
  /** Inline backgrounds for tokens a theme may set to a gradient. */
  leaderName?: CSSProperties;
  lastName?: CSSProperties;
  accentTag?: CSSProperties;
}

/**
 * A theme token as a CSS colour: the tw-colors variable for plain colours,
 * the first stop for a gradient (the track needs one colour per end).
 */
const solidToken = (lookup: Record<string, string> | null, key: string) => {
  const value = lookup?.[`countryItem.${key}`];

  if (value && /gradient\(|rgba?\(/i.test(value)) {
    const solid = extractSolidColorFromColorValue(value);

    if (solid) return solid;
  }

  return `hsl(var(--twc-countryItem-${key}))`;
};

/** Relative luminance of a theme colour, or null when it isn't plain. */
const luminance = (lookup: Record<string, string> | null, key: string) => {
  const value = lookup?.[`countryItem.${key}`];
  const solid = value ? extractSolidColorFromColorValue(value) : undefined;
  const hex = solid ? hslStringToHex(parseColor(solid)) : '';
  const match = /^#([0-9a-f]{6})/i.exec(hex);

  if (!match) return null;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(match[1].slice(i, i + 2), 16) / 255;

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/**
 * Every ladder colour comes from the theme's board colours (DESIGN.md: the
 * Board Colour Rule). On the ESC Asia 2026 theme they reproduce the
 * broadcast; elsewhere the ladder takes the theme's own look.
 */
export const useLadderStyles = (): LadderStyles => {
  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const themeYear = useGeneralStore(
    (s) => s.customTheme?.baseThemeYear ?? s.themeYear,
  );

  return useMemo(() => {
    const lookup = buildBackgroundColorLookup(overrides, themeYear);
    const bottom = solidToken(lookup, 'televoteFinishedPlaceContainerBg');
    // The numerals are in the finished place colour all the way up. When
    // the active place colour is too light for them (a white "current"
    // badge), the top only lightens the finished colour a little.
    const textL = luminance(lookup, 'televoteFinishedPlaceText');
    const activeL = luminance(lookup, 'televoteActivePlaceContainerBg');
    const top =
      textL !== null && activeL !== null && contrast(textL, activeL) < 2
        ? `color-mix(in oklab, ${bottom} 70%, ${solidToken(
            lookup,
            'televoteFinishedPlaceText',
          )})`
        : solidToken(lookup, 'televoteActivePlaceContainerBg');

    return {
      trackBackground: `linear-gradient(180deg, ${top} 0%, ${bottom} 85%)`,
      leaderName: getSpecialBackgroundStyle(
        'bg-countryItem-televoteFinishedBg',
        overrides,
        themeYear,
      ),
      lastName: getSpecialBackgroundStyle(
        'bg-countryItem-televoteUnfinishedBg',
        overrides,
        themeYear,
      ),
      accentTag: getSpecialBackgroundStyle(
        'bg-countryItem-douzePointsBg',
        overrides,
        themeYear,
      ),
    };
  }, [overrides, themeYear]);
};
