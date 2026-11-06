'use client';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { afterTileEntrances } from '../useTileEntrance';

import { DndSwapContext } from './DndComponentsContext';

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>;

/**
 * Loads the drag-and-drop implementation (dnd-kit) in its own chunk, off the
 * critical path. Until it arrives the lineup renders plain tiles; the tile
 * menu and the selection tray are always available.
 *
 * Swapping the provider in remounts the whole lineup (new wrapper, new tile
 * and drop-zone types), so it waits for the tiles' entrance to finish and
 * flags its commit through `DndSwapContext`, which keeps the entrance from
 * replaying on the remounted tiles.
 */
const LineupDndBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [Provider, setProvider] = useState<ProviderComponent | null>(null);
  const swapping = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let cancelWait: (() => void) | undefined;

    import('./LineupDndProvider').then((mod) => {
      if (cancelled) return;

      cancelWait = afterTileEntrances(() => {
        swapping.current = true;
        setProvider(() => mod.default);
      });
    });

    return () => {
      cancelled = true;
      cancelWait?.();
    };
  }, []);

  // Children's layout effects run first, so the remounted grids see `true`.
  useLayoutEffect(() => {
    swapping.current = false;
  }, [Provider]);

  return (
    <DndSwapContext.Provider value={swapping}>
      {Provider ? <Provider>{children}</Provider> : children}
    </DndSwapContext.Provider>
  );
};

export default LineupDndBoundary;
