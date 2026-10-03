'use client';
import { useCallback, useEffect, useState } from 'react';

import {
  EMPTY_PICKS,
  LAB_STORAGE_KEY,
  LabPicks,
  loadPicks,
  savePicks,
} from './labModel';

/**
 * The lab's picks, persisted to localStorage and kept in sync across tabs, so
 * the in-app palette panel follows the lab live.
 */
export function usePalettePicks() {
  const [picks, setPicks] = useState<LabPicks>(EMPTY_PICKS);

  useEffect(() => {
    setPicks(loadPicks());

    const onStorage = (event: StorageEvent) => {
      if (event.key === LAB_STORAGE_KEY) setPicks(loadPicks());
    };

    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const updatePicks = useCallback((update: (prev: LabPicks) => LabPicks) => {
    setPicks((prev) => {
      const next = update(prev);

      savePicks(next);

      return next;
    });
  }, []);

  return [picks, updatePicks] as const;
}
