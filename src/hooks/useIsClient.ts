'use client';

import { useEffect, useState } from 'react';

/**
 * `false` during SSR and on the hydration render, `true` from the first
 * committed effect onwards.
 *
 * Use this to keep a subtree client-only (the `dynamic(..., { ssr: false })`
 * guarantee) *without* putting it behind a lazy chunk: the code ships in the
 * initial bundle and downloads in parallel with it, instead of costing an
 * extra network round trip after hydration.
 */
export const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};
