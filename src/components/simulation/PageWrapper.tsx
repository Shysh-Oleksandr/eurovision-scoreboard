import React from 'react';

import { useThemeSetup } from '../../hooks/useThemeSetup';
import { useGeneralStore } from '../../state/generalStore';

interface PageWrapperProps {
  children: React.ReactNode;
}

export const PageWrapper = ({ children }: PageWrapperProps) => {
  useThemeSetup();
  const themeYear = useGeneralStore((state) => state.themeYear);
  const theme = useGeneralStore((state) => state.theme);
  const shouldUseCustomBgImage = useGeneralStore(
    (state) => state.settings.shouldUseCustomBgImage,
  );
  const customBgImage = useGeneralStore(
    (state) => state.settings.customBgImage,
  );

  return (
    <div
      className={`w-full h-full theme-default theme-${themeYear}`}
      id="main"
      style={{
        backgroundColor: theme.colors.appBgColor,
        backgroundImage: `url(${
          shouldUseCustomBgImage && customBgImage
            ? customBgImage
            : theme.backgroundImage
        })`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {children}
    </div>
  );
};
