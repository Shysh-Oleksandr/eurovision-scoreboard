import { useMemo } from 'react';

import { getThemeBackground } from '@/theme/themes';
import { useScopedTheme } from '@/theme/ThemeScope';

/**
 * The background image share images and designs use: the custom theme's
 * image, or the year theme's. Inside a `ThemeScope` (a design with its own
 * theme) the scoped theme decides.
 */
export const useShareBgImage = () => {
  const { themeYear, customTheme } = useScopedTheme();

  const backgroundImage = useMemo(() => {
    if (customTheme?.backgroundImageUrl) {
      return customTheme.backgroundImageUrl;
    }

    return getThemeBackground(themeYear);
  }, [customTheme?.backgroundImageUrl, themeYear]);

  return backgroundImage;
};
