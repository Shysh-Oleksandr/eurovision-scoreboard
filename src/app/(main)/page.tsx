'use client';

import Main from '../../views/Main';

import { useIsClient } from '@/hooks/useIsClient';

export default function Page() {
  // `Main` is client-only (the stores rehydrate from localStorage, so
  // server-rendering it would guarantee a hydration mismatch). It used to be a
  // `dynamic(..., { ssr: false })` import, which additionally made the browser
  // discover its chunk only *after* hydration — a full extra round trip before
  // anything painted. Importing it statically ships it with the initial bundle
  // and the mount gate keeps the server output empty.
  const isClient = useIsClient();

  return isClient ? <Main /> : null;
}
