import { useEffect, useRef } from 'react';
import { useGeneralStore } from '@/state/generalStore';
import { useAuthStore } from '@/state/useAuthStore';
import { useClearActiveThemeMutation } from '@/api/themes';

/**
 * Syncs theme changes with user profile
 * Clears active theme from profile when user switches to a static theme
 */
export function useThemeProfileSync() {
  const customTheme = useGeneralStore((state) => state.customTheme);
  const user = useAuthStore((state) => state.user);
  const { mutateAsync: clearActiveTheme } = useClearActiveThemeMutation();
  const prevCustomThemeRef = useRef(customTheme);

  // TODO: not sure if we need this anymore; Seems redundant 
  // useEffect(() => {
  //   // Only clear if user is authenticated and we switched from custom to static
  //   if (
  //     user &&
  //     prevCustomThemeRef.current !== null &&
  //     customTheme === null
  //   ) {
  //     // User switched from custom theme to static theme
  //     clearActiveTheme().catch((err) => {
  //       console.error('Failed to clear active theme from profile:', err);
  //     });
  //   }

  //   prevCustomThemeRef.current = customTheme;
  // }, [customTheme, user, clearActiveTheme]);
}
