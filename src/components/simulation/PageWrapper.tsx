'use client';
import React from 'react';

import { useGeneralStore } from '../../state/generalStore';

interface PageWrapperProps {
  children: React.ReactNode;
}

export const PageWrapper = ({ children }: PageWrapperProps) => {
  const theme = useGeneralStore((state) => state.theme);
  const customTheme = useGeneralStore((state) => state.customTheme);

  const backgroundImage =
    customTheme?.backgroundImageUrl || theme.backgroundImage;

  return (
    <div
      className={`w-full h-full theme-default safe-area-padding`}
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
