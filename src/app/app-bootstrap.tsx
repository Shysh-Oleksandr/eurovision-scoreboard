'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { toast } from 'react-toastify';

import { useRouter } from 'next/navigation';

import { useActiveThemeSync } from '@/hooks/useActiveThemeSync';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useThemeSetup } from '@/hooks/useThemeSetup';
import { useCountriesStore } from '@/state/countriesStore';
import { useAuthStore } from '@/state/useAuthStore';

export default function AppBootstrap() {
  useFullscreen();
  useThemeSetup();
  useActiveThemeSync();

  const t = useTranslations('widgets.profile');

  const { handlePostLogin, user } = useAuthStore();
  const setInitialCountriesForYear = useCountriesStore(
    (state) => state.setInitialCountriesForYear,
  );
  const locale = useLocale();
  const router = useRouter();

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

    if (!preferred || preferred === locale) return;

    (async () => {
      try {
        await fetch('/api/locale', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ locale: preferred }),
        });
        router.refresh();
      } catch (error) {
        console.error('Failed to sync preferred locale', error);
      }
    })();
  }, [user?.preferredLocale, locale, router]);

  return null;
}
