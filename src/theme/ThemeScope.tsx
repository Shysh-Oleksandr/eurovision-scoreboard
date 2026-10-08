'use client';
import React, { createContext, useContext, useMemo } from 'react';

import { useGeneralStore } from '@/state/generalStore';
import { CustomTheme } from '@/types/customTheme';

/**
 * A theme to render a subtree in, instead of the app's active one. Graphics
 * designs carry their own theme (`design.theme`) so a saved design keeps
 * looking the way it did when it was saved; `DesignStage` provides this
 * scope and the row components read the theme through `useScopedTheme()`.
 * Outside a scope the hook returns the active theme from the general store,
 * so nothing changes for the board and the rest of the app.
 */
export interface ThemeScopeValue {
  themeYear: string;
  customTheme: CustomTheme | null;
}

const ThemeScopeContext = createContext<ThemeScopeValue | null>(null);

export const ThemeScopeProvider: React.FC<{
  value: ThemeScopeValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  const memo = useMemo<ThemeScopeValue>(
    () => ({ themeYear: value.themeYear, customTheme: value.customTheme }),
    [value.themeYear, value.customTheme],
  );

  return (
    <ThemeScopeContext.Provider value={memo}>
      {children}
    </ThemeScopeContext.Provider>
  );
};

/** The theme the current subtree renders in (scoped, else the active one). */
export function useScopedTheme(): ThemeScopeValue & { scoped: boolean } {
  const scope = useContext(ThemeScopeContext);
  const themeYear = useGeneralStore((s) => s.themeYear);
  const customTheme = useGeneralStore((s) => s.customTheme);

  if (scope) return { ...scope, scoped: true };

  return { themeYear, customTheme, scoped: false };
}

/** True inside a `ThemeScopeProvider`. */
export function useIsThemeScoped(): boolean {
  return useContext(ThemeScopeContext) !== null;
}
