'use client';

import { IntlErrorCode, NextIntlClientProvider } from 'next-intl';
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import type { SupportedLocale } from '@/i18n/catalog';

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
 */
type Props = {
  locale: SupportedLocale;
  shellMessages: Record<string, unknown>;
  catalogUrl: string;
  children: React.ReactNode;
};

const CatalogReadyContext = createContext(false);

export const useCatalogReady = () => useContext(CatalogReadyContext);

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

  useEffect(() => {
    let cancelled = false;

    const fetchCatalog = async (url: string) => {
      const res = await fetch(url, { cache: 'force-cache' });

      if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);

      return res.json();
    };

    const load = async () => {
      let catalog: Record<string, unknown> | null = null;

      try {
        catalog = await fetchCatalog(catalogUrl);
      } catch {
        // Deploy race (document names a pruned hash) or a blocked static
        // path — the API route serves the current catalog uncached.
        try {
          catalog = await fetchCatalog(`/api/messages/${locale}`);
        } catch (error) {
          console.error(
            'i18n catalog failed to load; continuing with shell messages',
            error,
          );
        }
      }

      if (cancelled) return;

      if (catalog) {
        setState({ locale, messages: catalog, ready: true });
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
  }, [locale, catalogUrl]);

  return (
    <NextIntlClientProvider
      locale={state.locale}
      messages={state.messages as never}
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
        {children}
      </CatalogReadyContext.Provider>
    </NextIntlClientProvider>
  );
}
