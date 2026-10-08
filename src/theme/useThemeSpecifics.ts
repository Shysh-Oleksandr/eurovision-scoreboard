import { useMemo } from 'react';

import { useScopedTheme } from './ThemeScope';
import { resolveThemeSpecificsForGeneralState } from './themeSpecifics';

/** Specifics of the theme the subtree renders in (see `ThemeScope`). */
const useThemeSpecifics = () => {
  const { themeYear, customTheme } = useScopedTheme();

  return useMemo(() => {
    return resolveThemeSpecificsForGeneralState({ themeYear, customTheme });
  }, [themeYear, customTheme]);
};

export default useThemeSpecifics;
