'use client';

import { useEffect } from 'react';

import Main from '../../views/Main';
import { useCatalogReady } from '../AppIntlProvider';

import { useIsClient } from '@/hooks/useIsClient';
import { confirmLiveBundle } from '@/native/liveUpdate';
import { IS_NATIVE_APP } from '@/native/platform';
import { hideSplashWhenPainted } from '@/native/splash';

export default function Page() {
  // `Main` is client-only (the stores rehydrate from localStorage, so
  // server-rendering it would guarantee a hydration mismatch). It used to be a
  // `dynamic(..., { ssr: false })` import, which additionally made the browser
  // discover its chunk only *after* hydration — a full extra round trip before
  // anything painted. Importing it statically ships it with the initial bundle
  // and the mount gate keeps the server output empty.
  const isClient = useIsClient();
  // The document only inlines the shell i18n namespaces; the full catalog is
  // a preloaded ~20 KB fetch that finishes long before the JS bundle, so this
  // gate is a correctness backstop, not a real wait.
  const catalogReady = useCatalogReady();
  const ready = isClient && catalogReady;

  // The first screen (a modal or the board) hides the splash once it has
  // painted; this is the fallback for a launch that shows neither.
  useEffect(() => {
    if (!IS_NATIVE_APP || !ready) return undefined;

    // `Main` has mounted: this bundle works, so a live update stays
    // installed instead of being rolled back.
    confirmLiveBundle();

    const timer = window.setTimeout(() => void hideSplashWhenPainted(), 1500);

    return () => window.clearTimeout(timer);
  }, [ready]);

  return ready ? <Main /> : null;
}
