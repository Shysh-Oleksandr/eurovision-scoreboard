import { useMemo } from 'react';

import { useGeneralStore } from '@/state/generalStore';

import { resolveThemeSpecificsForGeneralState } from './themeSpecifics';

const useThemeSpecifics = () => {
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customTheme = useGeneralStore((state) => state.customTheme);

  return useMemo(() => {
    return resolveThemeSpecificsForGeneralState({ themeYear, customTheme });
  }, [themeYear, customTheme]);
};

export default useThemeSpecifics;
