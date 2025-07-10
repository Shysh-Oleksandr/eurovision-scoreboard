import { useEffect } from 'react';

import { useGeneralStore } from '../state/generalStore';

export const useThemeSetup = () => {
  const themeYear = useGeneralStore((state) => state.themeYear);

  useEffect(() => {
    const themeClass = `theme-${themeYear}`;

    document.documentElement.classList.add(themeClass);

    return () => {
      document.documentElement.classList.remove(themeClass);
    };
  }, [themeYear]);
};
