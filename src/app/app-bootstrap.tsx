'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import { useRouter } from 'next/navigation';

import { useActiveContestSync } from '@/hooks/useActiveContestSync';
import { useActiveThemeSync } from '@/hooks/useActiveThemeSync';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useThemeSetup } from '@/hooks/useThemeSetup';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';

export default function AppBootstrap() {
  useFullscreen();
  useThemeSetup();
  useActiveThemeSync();
  useActiveContestSync();

  const t = useTranslations('widgets.profile');
  const { handlePostLogin, user } = useAuthStore();
  const setInitialCountriesForYear = useCountriesStore(
    (state) => state.setInitialCountriesForYear,
  );
  const router = useRouter();
  const hasSyncedPreferredLocaleRef = useRef(false);

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
    const handleLogin = async () => {
      const url = new URL(window.location.href);

      if (url.searchParams.has('provider')) {
        window.history.replaceState({}, '', url.origin + url.pathname);
        const success = await handlePostLogin(true);

        if (success) {
          toast(t('success'), {
            type: 'success',
          });
        } else {
          toast(t('error'), {
            type: 'error',
          });
        }

        return;
      }

      handlePostLogin();
    };

    handleLogin();
  }, [handlePostLogin, t]);

  useEffect(() => {
    const preferred = user?.preferredLocale;

    // Only sync once per session and only when there's no explicit locale
    // cookie yet. This avoids fighting with user changes via LanguageSelector.
    if (hasSyncedPreferredLocaleRef.current || !preferred) {
      return;
    }

    if (typeof document === 'undefined') return;

    const hasLocaleCookie = document.cookie
      .split(';')
      .map((c) => c.trim())
      .some((c) => c.startsWith('locale='));

    if (hasLocaleCookie) {
      hasSyncedPreferredLocaleRef.current = true;

      return;
    }

    (async () => {
      try {
        await fetch('/api/locale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: preferred }),
        });
        hasSyncedPreferredLocaleRef.current = true;
        router.refresh();
      } catch (error) {
        console.error('Failed to sync preferred locale', error);
      }
    })();
  }, [user?.preferredLocale, router]);

  return null;
}
