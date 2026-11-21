import { useEffect, useMemo, useState } from 'react';

import {
  getThemeConfettiColors,
  loadFlagColors,
  RAINBOW_CONFETTI_COLORS,
} from './confettiColors';

import { getFlagPathForImageGeneration } from '@/helpers/getFlagPath';
import { useEntryColors } from '@/hooks/useEntryColors';
import { BaseCountry } from '@/models';
import type { WinnerConfettiColors } from '@/state/generalStore';

/**
 * The colours for a confetti shower, or null while a flag's colours are
 * still being read (the shower waits: a piece keeps the colour it was born
 * with). A custom entry's chosen colours are used as they are; a flag that
 * can't be read falls back to the theme's colours.
 */
export function useConfettiColors(
  mode: WinnerConfettiColors,
  country: BaseCountry | null,
): string[] | null {
  // Read from the entry as saved now: a line-up copy may predate them.
  const entryColors = useEntryColors(country?.code);
  const ownColors = mode === 'flag' ? entryColors : undefined;
  // The proxied URL on the website, so custom entries' uploaded flags can be
  // read too (getFlagPath.ts).
  const flagUrl =
    mode === 'flag' && country && !ownColors
      ? getFlagPathForImageGeneration(country)
      : null;
  const [flag, setFlag] = useState<{ url: string; colors: string[] } | null>(
    null,
  );

  useEffect(() => {
    if (!flagUrl) return undefined;

    let cancelled = false;

    void loadFlagColors(flagUrl).then((colors) => {
      if (!cancelled) setFlag({ url: flagUrl, colors });
    });

    return () => {
      cancelled = true;
    };
  }, [flagUrl]);

  return useMemo(() => {
    if (mode === 'rainbow') return RAINBOW_CONFETTI_COLORS;
    if (ownColors) return ownColors;
    if (flagUrl) {
      if (flag?.url !== flagUrl) return null;
      if (flag.colors.length > 0) return flag.colors;
    }

    return getThemeConfettiColors();
  }, [mode, ownColors, flagUrl, flag]);
}
