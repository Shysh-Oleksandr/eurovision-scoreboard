import { useMemo } from 'react';

import { useGeneralStore } from '@/state/generalStore';
import { getThemeBackground } from '@/theme/themes';
import { useScopedTheme } from '@/theme/ThemeScope';

/**
 * The background image share images and designs use: the user's custom
 * background (active theme only), the custom theme's image, or the year
 * theme's. Inside a `ThemeScope` (a design with its own theme) the scoped
 * theme decides and the account-level custom background is ignored.
 */
export const useShareBgImage = () => {
  const settings = useGeneralStore((state) => state.settings);
  const { themeYear, customTheme, scoped } = useScopedTheme();

  const backgroundImage = useMemo(() => {
    if (!scoped && settings.shouldUseCustomBgImage && settings.customBgImage) {
      return settings.customBgImage;
    }

    if (customTheme?.backgroundImageUrl) {
      return customTheme.backgroundImageUrl;
    }

    return getThemeBackground(themeYear);
  }, [
    scoped,
    customTheme?.backgroundImageUrl,
    settings.shouldUseCustomBgImage,
    settings.customBgImage,
    themeYear,
  ]);

  return backgroundImage;
};
