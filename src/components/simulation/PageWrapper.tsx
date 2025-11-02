import React, { useMemo } from 'react';

import { useGeneralStore } from '../../state/generalStore';

interface PageWrapperProps {
  children: React.ReactNode;
}

export const PageWrapper = ({ children }: PageWrapperProps) => {
  const theme = useGeneralStore((state) => state.theme);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const shouldUseCustomBgImage = useGeneralStore(
    (state) => state.settings.shouldUseCustomBgImage,
  );
  const customBgImage = useGeneralStore(
    (state) => state.settings.customBgImage,
  );

  const backgroundImage = useMemo(() => {
    if (shouldUseCustomBgImage && customBgImage) {
      return customBgImage;
    }

    if (customTheme?.backgroundImageUrl) {
      return customTheme.backgroundImageUrl;
    }

    return theme.backgroundImage;
  }, [
    customBgImage,
    customTheme?.backgroundImageUrl,
    shouldUseCustomBgImage,
    theme.backgroundImage,
  ]);

  return (
    <div
      className={`w-full h-full theme-default`}
      id="main"
      style={{
        backgroundColor: theme.colors.appBgColor,
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {children}
    </div>
  );
};
