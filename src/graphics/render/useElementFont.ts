'use client';
import React from 'react';

import { DesignFont, FontSlot } from '../model/design';

import { getCustomFontFamilyCss } from '@/theme/customFonts';
import { getFontFamilyStackCss } from '@/theme/fontAliases';
import { useCustomFontFaces } from '@/theme/useCustomFontFaces';

/**
 * Class + inline style that render an element in its font: the design
 * theme's UI font (inherited), its scoreboard font (`dp-scoreboard-font`),
 * or the element's own `font` (a bundled alias or a library font whose
 * `@font-face` rules are injected here).
 */
export function useElementFont(
  slot: FontSlot | undefined,
  font: DesignFont | undefined,
): { className: string; style: React.CSSProperties } {
  const custom =
    slot === 'custom' && font?.kind === 'custom' ? font.font : null;

  useCustomFontFaces(custom);

  if (slot === 'scoreboard')
    return { className: 'dp-scoreboard-font', style: {} };
  if (slot === 'custom' && font) {
    if (font.kind === 'builtin') {
      return {
        className: '',
        style: { fontFamily: getFontFamilyStackCss(font.alias) },
      };
    }

    return {
      className: '',
      style: {
        fontFamily: getCustomFontFamilyCss(font.font, 'montserrat'),
        fontSynthesis: 'none',
      },
    };
  }

  return { className: '', style: {} };
}

/** Human label for a design font. */
export const designFontLabel = (
  font: DesignFont,
  aliasLabels: Record<string, string>,
): string =>
  font.kind === 'builtin'
    ? aliasLabels[font.alias] ?? font.alias
    : font.font.name;
