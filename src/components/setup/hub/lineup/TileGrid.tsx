'use client';
import { useTranslations } from 'next-intl';
import React, { memo, useMemo, useRef } from 'react';

import { useDndComponents } from './dnd/DndComponentsContext';
import { useLineupModelContext } from './LineupProvider';
import { ListId } from './listIds';
import { useBoardRowLook } from './useBoardRowLook';
import { useTileEntrance } from './useTileEntrance';

interface TileGridProps {
  codes: string[];
  listId: ListId;
  /** Which minmax token drives the auto-fill grid. */
  variant: 'stage' | 'pool';
  matches: Set<string> | null;
  eager?: boolean;
  className?: string;
  /** Allocation draw: pin description per code (null = no pin). */
  pinnedFor?: (code: string) => string | null;
  /** Extra cell rendered after the tiles (e.g. the "+N from the draw" placeholder). */
  extra?: React.ReactNode;
  /** Stage lists: a change replays the tiles' entrance (see `useTileEntrance`). */
  replayKey?: number;
}

/** Auto-fill grid of country tiles for one list, filtered by the shared search. */
const TileGrid: React.FC<TileGridProps> = ({
  codes,
  listId,
  variant,
  matches,
  eager = false,
  className = '',
  pinnedFor,
  extra,
  replayKey = 0,
}) => {
  const t = useTranslations('setup.eventSetupModal');
  const { byCode } = useLineupModelContext();
  const { Tile } = useDndComponents();

  const visible = useMemo(
    () => (matches ? codes.filter((code) => matches.has(code)) : codes),
    [codes, matches],
  );

  // Stage lists draw their tiles as the theme's board rows.
  const isStage = listId.startsWith('stage:');
  const boardRowLook = useBoardRowLook();
  const gridRef = useRef<HTMLDivElement>(null);

  useTileEntrance(gridRef, codes, { enabled: isStage, replayKey });

  return (
    <div
      ref={gridRef}
      className={`${
        variant === 'stage' ? 'dp-tile-grid' : 'dp-pool-grid'
      } ${className}`}
    >
      {visible.length === 0 && !extra ? (
        <div className="dp-empty col-span-full rounded-[10px] px-4 py-[18px] text-center text-[12.5px] font-bold">
          {matches ? t('noMatches') : t('emptyDropHere')}
        </div>
      ) : (
        visible.map((code) => {
          const country = byCode.get(code);

          if (!country) return null;

          return (
            <Tile
              key={code}
              country={country}
              listId={listId}
              eager={eager}
              pinned={pinnedFor ? pinnedFor(code) : null}
              boardRow={isStage ? boardRowLook : null}
            />
          );
        })
      )}
      {!matches && extra}
    </div>
  );
};

export default memo(TileGrid);
