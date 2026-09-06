import { useEffect } from 'react';

import { ensureFontFacesInjected } from './customFonts';

import type { CustomTheme } from '@/types/customTheme';
import type { ThemeFontSnapshot } from '@/types/font';

/**
 * Inject `@font-face` rules for a theme's custom fonts so previews (cards,
 * editor, picker rows) can render in them. Injection is idempotent and the
 * browser only fetches a face once text using it is painted.
 */
export function useCustomFontFaces(
  customFonts:
    | CustomTheme['customFonts']
    | ThemeFontSnapshot
    | null
    | undefined,
): void {
  const snapshots: ThemeFontSnapshot[] = [];

  if (customFonts && 'faces' in customFonts) {
    snapshots.push(customFonts);
  } else if (customFonts) {
    if (customFonts.ui) snapshots.push(customFonts.ui);
    if (customFonts.scoreboard) snapshots.push(customFonts.scoreboard);
  }

  const key = snapshots
    .map((s) => `${s._id}:${s.faces.map((f) => f.url).join(',')}`)
    .join('|');

  useEffect(() => {
    for (const snapshot of snapshots) {
      ensureFontFacesInjected(snapshot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
