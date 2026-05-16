import { useEffect } from 'react';

import { ALL_THEMES } from '../data/data';
import { useGeneralStore, syncDocumentFont } from '../state/generalStore';
import { applyCustomTheme } from '../theme/themeUtils';

export const useThemeSetup = () => {
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const overrideThemeFont = useGeneralStore(
    (state) => state.settings.overrideThemeFont,
  );
  const overrideThemeFontAlias = useGeneralStore(
    (state) => state.settings.overrideThemeFontAlias,
  );

  useEffect(() => {
    // If there's a custom theme, apply it
    if (customTheme) {
      // Remove any static theme classes and data attribute first
      document.documentElement.classList.remove(
        ...ALL_THEMES.map((y) => `theme-${y}`),
      );
      // Attribute will be set by applyCustomTheme
      applyCustomTheme(customTheme);
      syncDocumentFont();

      return;
    }

    // Otherwise apply the static theme
    const themeClass = `theme-${themeYear}`;

    // Remove custom attribute if present
    if (document.documentElement.getAttribute('data-theme') === 'custom') {
      document.documentElement.removeAttribute('data-theme');
    }
    // Ensure all other theme classes are removed then add current
    document.documentElement.classList.remove(
      ...ALL_THEMES.map((y) => `theme-${y}`),
    );
    document.documentElement.classList.add(themeClass);
    // Also set data-theme to benefit selectors using [data-theme="YYYY"]
    document.documentElement.setAttribute('data-theme', themeYear);

    syncDocumentFont();

    return () => {
      document.documentElement.classList.remove(themeClass);
    };
  }, [themeYear, customTheme, overrideThemeFont, overrideThemeFontAlias]);
};
