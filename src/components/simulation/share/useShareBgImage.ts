
import { useGeneralStore } from '@/state/generalStore';
import { getThemeBackground } from '@/theme/themes';
import { useMemo } from 'react';

export const useShareBgImage = () => {
  const settings = useGeneralStore((state) => state.settings);
  const themeYear = useGeneralStore((state) => state.themeYear);
 
  const backgroundImage = useMemo(() => {

    if (settings.shouldUseCustomBgImage && settings.customBgImage) {
      return settings.customBgImage;
    }

    return getThemeBackground(themeYear);
  }, [settings.shouldUseCustomBgImage, settings.customBgImage, themeYear]);

  return backgroundImage;
};
