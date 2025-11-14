'use client';

import { useEffect } from 'react';

import { useActiveThemeSync } from '@/hooks/useActiveThemeSync';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useThemeSetup } from '@/hooks/useThemeSetup';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';

export default function AppBootstrap() {
  useFullscreen();
  useThemeSetup();
  useActiveThemeSync();

  const { handlePostLogin } = useAuthStore();
  const setInitialCountriesForYear = useCountriesStore(
    (state) => state.setInitialCountriesForYear,
  );

  // Initialize countries once on first load
  useEffect(() => {
    const initKey = 'countries_initialized';
    const hasBeenInitialized = localStorage.getItem(initKey);

    if (!hasBeenInitialized) {
      localStorage.setItem(initKey, 'true');
      setInitialCountriesForYear('2025', {
        force: true,
        isJuniorContest: false,
      });
    }
  }, [setInitialCountriesForYear]);

  useEffect(() => {
    const url = new URL(window.location.href);

    if (url.searchParams.has('provider')) {
      window.history.replaceState({}, '', url.origin + url.pathname);
      handlePostLogin(true);

      return;
    }

    handlePostLogin();
  }, [handlePostLogin]);

  return null;
}
