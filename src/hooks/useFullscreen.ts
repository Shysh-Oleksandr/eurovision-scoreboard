import { useCallback, useEffect } from 'react';

import { useGeneralStore } from '../state/generalStore';

const getFullscreenElement = () =>
  document.fullscreenElement ||
  document.webkitFullscreenElement ||
  document.mozFullScreenElement ||
  document.msFullscreenElement;

const requestFullscreen = (element: HTMLElement) => {
  if (element.requestFullscreen) {
    return element.requestFullscreen();
  }
  if (element.webkitRequestFullscreen) {
    return element.webkitRequestFullscreen();
  }
  if (element.mozRequestFullScreen) {
    return element.mozRequestFullScreen();
  }
  if (element.msRequestFullscreen) {
    return element.msRequestFullscreen();
  }

  return Promise.reject(new Error('Fullscreen API is not supported.'));
};

const exitFullscreen = () => {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  }
  if (document.webkitExitFullscreen) {
    return document.webkitExitFullscreen();
  }

  if (document.mozCancelFullScreen) {
    return document.mozCancelFullScreen();
  }
  if (document.msExitFullscreen) {
    return document.msExitFullscreen();
  }

  return Promise.reject(new Error('Fullscreen API is not supported.'));
};

export const useFullscreen = () => {
  const enableFullscreen = useGeneralStore((state) => state.enableFullscreen);
  const setEnableFullscreen = useGeneralStore(
    (state) => state.setEnableFullscreen,
  );

  const handleFullscreenChange = useCallback(() => {
    if (!getFullscreenElement()) {
      setEnableFullscreen(false);
    }
  }, [setEnableFullscreen]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange,
      );
      document.removeEventListener(
        'mozfullscreenchange',
        handleFullscreenChange,
      );
      document.removeEventListener(
        'MSFullscreenChange',
        handleFullscreenChange,
      );
    };
  }, [handleFullscreenChange]);

  useEffect(() => {
    if (enableFullscreen) {
      if (!getFullscreenElement()) {
        requestFullscreen(document.documentElement).catch(() => {
          setEnableFullscreen(false);
        });
      }
    } else if (getFullscreenElement()) {
      exitFullscreen();
    }
  }, [enableFullscreen, setEnableFullscreen]);
};
