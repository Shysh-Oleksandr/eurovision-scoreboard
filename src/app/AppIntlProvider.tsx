'use client';

import { IntlErrorCode, NextIntlClientProvider } from 'next-intl';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { SupportedLocale } from '@/i18n/catalog';
import { catalogUrlFor } from '@/i18n/catalogUrl';
import { resolveNativeLocale, storeLocale } from '@/i18n/nativeLocale';
import { IS_NATIVE_APP } from '@/native/platform';

/**
 * Client-side i18n provider that keeps the full message catalog OUT of the
 * document. The server passes only a small shell subset (SHELL_NAMESPACES in
 * i18n/catalog.ts — everything that can render before the catalog arrives);
 * the full merged catalog is fetched as a hashed, immutably-cached static
 * JSON (preloaded from the document head, so it downloads alongside the JS
 * bundle and repeat visits serve it from disk cache). Passing explicit
 * `messages` also short-circuits next-intl's server-side auto-serialization,
 * which is what removed the ~70 KB catalog from every flight payload.
 *
 * On a locale switch (`POST /api/locale` + `router.refresh()`) new props
 * arrive and the effect refetches; until the new catalog lands the previous
 * locale+messages pair keeps rendering, so no mixed-locale or missing-key
 * frame ever paints.
 *
 * Native apps (IS_NATIVE_APP): the static export is rendered once in English
 * and has no server to ask, so the props only seed the first render. The
 * provider picks the locale itself (saved choice, else device language — see
 * i18n/nativeLocale.ts), fetches that bundled catalog, and switches locales
 * through `useSetAppLocale()` with the same no-mixed-frame guarantee.
 */
type Props = {
  locale: SupportedLocale;
  shellMessages: Record<string, unknown>;
  catalogUrl: string;
  children: React.ReactNode;
};

const CatalogReadyContext = createContext(false);

export const useCatalogReady = () => useContext(CatalogReadyContext);

/** Native apps only: switch and persist the UI locale on the client. */
const SetAppLocaleContext = createContext<(locale: SupportedLocale) => void>(
  () => {},
);

export const useSetAppLocale = () => useContext(SetAppLocaleContext);

export default function AppIntlProvider({
  locale,
  shellMessages,
  catalogUrl,
  children,
}: Props) {
  // Initialized from props only, so server render and hydration agree.
  const [state, setState] = useState({
    locale,
    messages: shellMessages,
    ready: false,
  });
  const readyRef = useRef(false);

  readyRef.current = state.ready;

  // Native: resolved after mount (storage and navigator are client-only),
  // so the first render still matches the static HTML.
  const [nativeLocale, setNativeLocale] = useState<SupportedLocale | null>(
    null,
  );

  useEffect(() => {
    if (IS_NATIVE_APP) setNativeLocale(resolveNativeLocale());
  }, []);

  const setAppLocale = useCallback((next: SupportedLocale) => {
    storeLocale(next);
    setNativeLocale(next);
  }, []);

  const targetLocale = IS_NATIVE_APP ? nativeLocale : locale;
  const targetUrl = IS_NATIVE_APP
    ? nativeLocale && catalogUrlFor(nativeLocale)
    : catalogUrl;

  useEffect(() => {
    if (!targetLocale || !targetUrl) return;

    let cancelled = false;

    const fetchCatalog = async (url: string) => {
      const res = await fetch(url, { cache: 'force-cache' });

      if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);

      return res.json();
    };

    const load = async () => {
      let catalog: Record<string, unknown> | null = null;

      try {
        catalog = await fetchCatalog(targetUrl);
      } catch (error) {
        let lastError: unknown = error;

        // Deploy race (document names a pruned hash) or a blocked static
        // path — the API route serves the current catalog uncached. The
        // native bundle has no API routes, and its catalogs ship with it.
        if (!IS_NATIVE_APP) {
          try {
            catalog = await fetchCatalog(`/api/messages/${targetLocale}`);
          } catch (fallbackError) {
            lastError = fallbackError;
          }
        }

        if (!catalog) {
          console.error(
            'i18n catalog failed to load; continuing with shell messages',
            lastError,
          );
        }
      }

      if (cancelled) return;

      if (catalog) {
        setState({ locale: targetLocale, messages: catalog, ready: true });
      } else {
        // Degraded: unblock the app with whatever we have rather than
        // holding the gate closed forever.
        setState((prev) => ({ ...prev, ready: true }));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [targetLocale, targetUrl]);

  // The static document says lang="en"; keep it truthful for screen readers
  // and hyphenation once the native locale is known.
  useEffect(() => {
    if (IS_NATIVE_APP) document.documentElement.lang = state.locale;
  }, [state.locale]);

  return (
    <NextIntlClientProvider
      locale={state.locale}
      messages={state.messages as never}
      // No dates are formatted; a fixed zone just keeps server and client
      // output identical (next-intl errors with ENVIRONMENT_FALLBACK otherwise).
      timeZone="UTC"
      onError={(error) => {
        // The shell subset is deliberately partial: swallow missing-message
        // noise until the full catalog is in (nothing outside the shell
        // renders before then — the main view is gated on useCatalogReady).
        if (!readyRef.current && error.code === IntlErrorCode.MISSING_MESSAGE)
          return;
        console.error(error);
      }}
    >
      <CatalogReadyContext.Provider value={state.ready}>
        <SetAppLocaleContext.Provider value={setAppLocale}>
          {children}
        </SetAppLocaleContext.Provider>
      </CatalogReadyContext.Provider>
    </NextIntlClientProvider>
  );
}
