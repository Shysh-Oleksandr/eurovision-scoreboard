'use client';

import { useEffect } from 'react';

import { useActiveThemeSync } from '@/hooks/useActiveThemeSync';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useThemeProfileSync } from '@/hooks/useThemeProfileSync';
import { useThemeSetup } from '@/hooks/useThemeSetup';
import { useAuthStore } from '@/state/useAuthStore';

export default function AppBootstrap() {
  useFullscreen();
  useThemeSetup();
  useActiveThemeSync();
  useThemeProfileSync();

  const { handlePostLogin } = useAuthStore();

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
