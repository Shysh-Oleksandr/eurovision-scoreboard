import { useMemo, type CSSProperties } from 'react';

import { useGeneralStore } from '@/state/generalStore';
import { getQualifiedPanelGlowStyle } from '@/theme/qualifiedCountriesPanelGlow';

export function useQualifiedCountriesPanelGlowStyle(
  enabled = true,
): CSSProperties | undefined {
  const themeYear = useGeneralStore(
    (s) => s.customTheme?.baseThemeYear ?? s.themeYear,
  );
  const customTheme = useGeneralStore((s) => s.customTheme);

  return useMemo(() => {
    if (!enabled) return undefined;

    return getQualifiedPanelGlowStyle(themeYear, customTheme);
  }, [enabled, themeYear, customTheme?.hue, customTheme?._id]);
}
