'use client';
import React, { useEffect, useState } from 'react';

type ProviderComponent = React.ComponentType<{ children: React.ReactNode }>;

/**
 * Loads the drag-and-drop implementation (dnd-kit) in its own chunk, off the
 * critical path. Until it arrives the lineup renders plain tiles; the tile
 * menu and the selection tray are always available.
 */
const LineupDndBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [Provider, setProvider] = useState<ProviderComponent | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('./LineupDndProvider').then((mod) => {
      if (!cancelled) setProvider(() => mod.default);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!Provider) return <>{children}</>;

  return <Provider>{children}</Provider>;
};

export default LineupDndBoundary;
