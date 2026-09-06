import { ALL_COUNTRIES } from '@/data/countries/common-countries';
import { getCustomFontFamilyCss } from '@/theme/customFonts';
import {
  FONT_OPTION_LABELS,
  FontAlias,
  getFontFamilyStackCss,
  normalizeFontAlias,
} from '@/theme/fontAliases';
import type { ThemeFontSnapshot } from '@/types/font';

/** What the editor holds for a font slot: a bundled alias or an uploaded font. */
export type FontSelection =
  | { kind: 'builtin'; alias: string }
  | { kind: 'custom'; font: ThemeFontSnapshot };

export const builtinSelection = (alias?: string | null): FontSelection => ({
  kind: 'builtin',
  alias: normalizeFontAlias(alias),
});

export const customSelection = (font: ThemeFontSnapshot): FontSelection => ({
  kind: 'custom',
  font,
});

export const isSameSelection = (a: FontSelection, b: FontSelection): boolean =>
  a.kind === 'builtin'
    ? b.kind === 'builtin' && a.alias === b.alias
    : b.kind === 'custom' && a.font._id === b.font._id;

/** `font-family` value that renders this selection (custom fonts fall back to Montserrat). */
export const selectionFamilyCss = (selection: FontSelection): string =>
  selection.kind === 'builtin'
    ? getFontFamilyStackCss(selection.alias)
    : getCustomFontFamilyCss(selection.font, 'montserrat');

export const selectionLabel = (selection: FontSelection): string =>
  selection.kind === 'builtin'
    ? FONT_OPTION_LABELS[selection.alias as FontAlias] ?? selection.alias
    : selection.font.name;

const DEFAULT_SAMPLE_COUNTRY_NAME = 'Sweden';

/** Display name for a profile country code; Sweden when the code is missing/unknown. */
export const countryNameForFontSample = (
  countryCode?: string | null,
): string => {
  if (!countryCode) return DEFAULT_SAMPLE_COUNTRY_NAME;

  const target = countryCode.toLowerCase();

  return (
    ALL_COUNTRIES.find((country) => country.code.toLowerCase() === target)
      ?.name ?? DEFAULT_SAMPLE_COUNTRY_NAME
  );
};

/** Text rendered in a font's own face wherever it is previewed. */
export const fontSampleText = (countryCode?: string | null): string =>
  `Douze points go to… ${countryNameForFontSample(countryCode)} 12`;
