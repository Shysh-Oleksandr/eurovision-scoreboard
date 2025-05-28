import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';

import type { Year } from '../config';

import { themes } from './themes';
import type { Theme } from './types';

interface ThemeContextType {
  year: Year;
  theme: Theme;
  setYear: (year: Year) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [year, setYear] = useState<Year>('2024');
  const theme = themes[year];

  // Apply initial theme class
  useEffect(() => {
    document.documentElement.classList.add(`theme-${year}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSetYear = (newYear: Year) => {
    setYear(newYear);
    // Remove all theme classes
    document.documentElement.classList.remove('theme-2023', 'theme-2024');
    // Add the new theme class
    document.documentElement.classList.add(`theme-${newYear}`);
  };

  return (
    <ThemeContext.Provider value={{ year, theme, setYear: handleSetYear }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
