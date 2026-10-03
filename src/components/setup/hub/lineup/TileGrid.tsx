'use client';
import { useTranslations } from 'next-intl';
import React, { memo, useMemo } from 'react';

import { useDndComponents } from './dnd/DndComponentsContext';
import { useLineupModelContext } from './LineupProvider';
import { ListId } from './listIds';

interface TileGridProps {
  codes: string[];
  listId: ListId;
  /** Which minmax token drives the auto-fill grid. */
  variant: 'stage' | 'pool';
  matches: Set<string> | null;
  eager?: boolean;
  className?: string;
}

/** Auto-fill grid of country tiles for one list, filtered by the shared search. */
const TileGrid: React.FC<TileGridProps> = ({
  codes,
  listId,
  variant,
  matches,
  eager = false,
  className = '',
}) => {
  const t = useTranslations('setup.eventSetupModal');
  const { byCode } = useLineupModelContext();
  const { Tile } = useDndComponents();

  const visible = useMemo(
    () => (matches ? codes.filter((code) => matches.has(code)) : codes),
    [codes, matches],
  );

  return (
    <div
      className={`${
        variant === 'stage' ? 'dp-tile-grid' : 'dp-pool-grid'
      } ${className}`}
    >
      {visible.length === 0 ? (
        <div className="dp-empty col-span-full rounded-[10px] px-4 py-[18px] text-center text-[12.5px] font-bold">
          {matches ? t('noMatches') : t('emptyDropHere')}
        </div>
      ) : (
        visible.map((code) => {
          const country = byCode.get(code);

          if (!country) return null;

          return (
            <Tile key={code} country={country} listId={listId} eager={eager} />
          );
        })
      )}
    </div>
  );
};

export default memo(TileGrid);
