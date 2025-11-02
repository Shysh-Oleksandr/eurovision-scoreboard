import { useGeneralStore } from '@/state/generalStore';
import { getThemeBackground } from '@/theme/themes';
import { useMemo } from 'react';

export const useShareBgImage = () => {
  const settings = useGeneralStore(
    (state) => state.settings,
  );
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customTheme = useGeneralStore((state) => state.customTheme);

  const backgroundImage = useMemo(() => {
    if (settings.shouldUseCustomBgImage && settings.customBgImage) {
      return settings.customBgImage;
    }

    if (customTheme?.backgroundImageUrl) {
      return customTheme.backgroundImageUrl;
    }

    return getThemeBackground(themeYear);
  }, [
    customTheme?.backgroundImageUrl,
    settings.shouldUseCustomBgImage,
    settings.customBgImage,
    themeYear,
  ]);

  return backgroundImage;
};
