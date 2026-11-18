'use client';
import React from 'react';

import { useGeneralStore } from '../../state/generalStore';

import BackgroundVideoLayer from './BackgroundVideoLayer';

import { useBackgroundVideo } from '@/theme/backgroundVideo/useBackgroundVideo';

interface PageWrapperProps {
  children: React.ReactNode;
}

export const PageWrapper = ({ children }: PageWrapperProps) => {
  const theme = useGeneralStore((state) => state.theme);
  const customTheme = useGeneralStore((state) => state.customTheme);
  const backgroundVideo = useBackgroundVideo();

  const backgroundImage =
    customTheme?.backgroundImageUrl || theme.backgroundImage;

  return (
    <div
      className={`w-full h-full theme-default safe-area-padding`}
      id="main"
      // With a background video, the layer behind paints the image (and
      // the video over it), so this wrapper stays see-through.
      style={
        backgroundVideo.src
          ? undefined
          : {
              backgroundColor: theme.colors.appBgColor,
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
      }
    >
      {backgroundVideo.src && (
        <BackgroundVideoLayer
          src={backgroundVideo.src}
          poster={backgroundImage}
          color={theme.colors.appBgColor}
          shouldPlay={backgroundVideo.shouldPlay}
          onFail={backgroundVideo.onFail}
        />
      )}
      {children}
    </div>
  );
};
