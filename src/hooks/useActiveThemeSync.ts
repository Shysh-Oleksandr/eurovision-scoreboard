import { useEffect } from 'react';
import { useAuthStore } from '@/state/useAuthStore';
import { useGeneralStore } from '@/state/generalStore';
import { useThemeByIdQuery } from '@/api/themes';

/**
 * Syncs the user's active theme from their profile
 * Fetches and applies the theme when user logs in
 */
export function useActiveThemeSync() {
  const user = useAuthStore((state) => state.user);
  const applyCustomTheme = useGeneralStore((state) => state.applyCustomTheme);
  const currentCustomTheme = useGeneralStore((state) => state.customTheme);
  const suppressActiveThemeOnce = useGeneralStore(
    (state) => state.suppressActiveThemeOnce,
  );
  const setSuppressActiveThemeOnce = useGeneralStore(
    (state) => state.setSuppressActiveThemeOnce,
  );
  const blockedActiveThemeId = useGeneralStore(
    (state) => state.blockedActiveThemeId,
  );
  const setBlockedActiveThemeId = useGeneralStore(
    (state) => state.setBlockedActiveThemeId,
  );
  const suppressProfileActiveOnStatic = useGeneralStore(
    (state) => state.suppressProfileActiveOnStatic,
  );

  // Only fetch if user has an activeThemeId
  const shouldFetch = !!user?.activeThemeId;

  const { data: activeTheme } = useThemeByIdQuery(
    user?.activeThemeId || '',
    shouldFetch,
  );

  useEffect(() => {
    if (suppressActiveThemeOnce) {
      // We just switched to a static theme locally; skip one profile apply
      setSuppressActiveThemeOnce(false);
      return;
    }
    if (suppressProfileActiveOnStatic) {
      // While on static themes, ignore any profile active theme attempts
      return;
    }
    // If the user no longer has an active theme remotely, clear the block
    if (user && !user.activeThemeId && blockedActiveThemeId) {
      setBlockedActiveThemeId(null);
    }
    if (activeTheme && shouldFetch) {
      // Do not overwrite a locally present custom theme that differs from profile
      if (currentCustomTheme && currentCustomTheme._id !== activeTheme._id) {
        return;
      }
      if (blockedActiveThemeId && activeTheme._id === blockedActiveThemeId) {
        // Ignore outdated remote theme
        return;
      }
      // Apply the theme from the user's profile
      applyCustomTheme(activeTheme);
    }
  }, [
    activeTheme,
    user,
    shouldFetch,
    suppressActiveThemeOnce,
    setSuppressActiveThemeOnce,
    blockedActiveThemeId,
    setBlockedActiveThemeId,
    currentCustomTheme,
    suppressProfileActiveOnStatic,
  ]);
}
