'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { useSetAppLocale } from './AppIntlProvider';

import ThemeSoundVolumeHud from '@/components/floating/ThemeSoundVolumeHud';
import { useActiveContestSync } from '@/hooks/useActiveContestSync';
import { useActiveThemeSync } from '@/hooks/useActiveThemeSync';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useShareLinks } from '@/hooks/useShareLinks';
import { useStatusBarThemeColor } from '@/hooks/useStatusBarThemeColor';
import { useThemeSetup } from '@/hooks/useThemeSetup';
import { normalizeLocale } from '@/i18n/catalog';
import { getStoredLocale } from '@/i18n/nativeLocale';
import { installBackButtonHandler } from '@/native/backButton';
import { liveUpdateBoot, startLiveUpdateChecks } from '@/native/liveUpdate';
import { IS_NATIVE_APP } from '@/native/platform';
import { useCountriesStore } from '@/state/countriesStore';
import { NATIVE_LOGIN_EVENT, useAuthStore } from '@/state/useAuthStore';

// Dev-only palette tuning panel (`?palette`, see /dev/palette-lab). The branch
// is constant-false in production builds, so the chunk is compiled out.
const PaletteDevPanel =
  process.env.NODE_ENV === 'development'
    ? dynamic(() => import('@/components/dev/palette/PaletteDevPanel'), {
        ssr: false,
      })
    : null;

export default function AppBootstrap() {
  useFullscreen();
  useThemeSetup();
  useActiveThemeSync();
  useActiveContestSync();
  useShareLinks();
  useStatusBarThemeColor();

  const t = useTranslations('widgets.profile');
  const { handlePostLogin, user } = useAuthStore();
  const setInitialCountriesForYear = useCountriesStore(
    (state) => state.setInitialCountriesForYear,
  );
  const router = useRouter();
  const setAppLocale = useSetAppLocale();
  const hasSyncedPreferredLocaleRef = useRef(false);

  // Initialize countries once on first load
  useEffect(() => {
    const initKey = 'countries_initialized';
    const hasBeenInitialized = localStorage.getItem(initKey);

    if (!hasBeenInitialized) {
      localStorage.setItem(initKey, 'true');
      setInitialCountriesForYear('2026', {
        force: true,
        contestType: 'esc',
      });
    }
  }, [setInitialCountriesForYear]);

  useEffect(() => {
    const handleLogin = async () => {
      // A launch that switches to a downloaded live update reloads the
      // WebView; a session restore cut off mid-rotation would lose the new
      // refresh token.
      if (IS_NATIVE_APP) await liveUpdateBoot();

      const url = new URL(window.location.href);

      if (url.searchParams.has('provider')) {
        window.history.replaceState({}, '', url.origin + url.pathname);

        // The backend redirects with `error` when the provider's answer
        // failed verification; any earlier session still stands.
        if (url.searchParams.has('error')) {
          toast(t('error'), { type: 'error' });
          handlePostLogin();

          return;
        }

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
    if (!IS_NATIVE_APP) return;

    void installBackButtonHandler();
    startLiveUpdateChecks();
  }, []);

  // Native apps sign in without a redirect; the store reports the outcome.
  useEffect(() => {
    if (!IS_NATIVE_APP) return undefined;

    const onNativeLogin = (event: Event) => {
      const { success } = (event as CustomEvent<{ success: boolean }>).detail;

      toast(t(success ? 'success' : 'error'), {
        type: success ? 'success' : 'error',
      });
    };

    window.addEventListener(NATIVE_LOGIN_EVENT, onNativeLogin);

    return () => window.removeEventListener(NATIVE_LOGIN_EVENT, onNativeLogin);
  }, [t]);

  useEffect(() => {
    const preferred = user?.preferredLocale;

    // Only sync once per session and only when there's no explicit locale
    // cookie yet. This avoids fighting with user changes via LanguageSelector.
    if (hasSyncedPreferredLocaleRef.current || !preferred) {
      return;
    }

    if (typeof document === 'undefined') return;

    // Native: same rule, with the saved in-app choice standing in for the
    // cookie (IntlProvider writes a cookie on every render there, so its
    // presence means nothing).
    if (IS_NATIVE_APP) {
      hasSyncedPreferredLocaleRef.current = true;

      if (!getStoredLocale()) setAppLocale(normalizeLocale(preferred));

      return;
    }

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
  }, [user?.preferredLocale, router, setAppLocale]);

  return (
    <>
      <ThemeSoundVolumeHud />
      {PaletteDevPanel && <PaletteDevPanel />}
    </>
  );
}
