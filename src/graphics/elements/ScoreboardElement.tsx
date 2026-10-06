'use client';
import React, { useMemo } from 'react';

import {
  ItemSize,
  ScoreboardElement as ScoreboardElementModel,
} from '../model/design';
import { useDesignData } from '../render/DesignDataContext';

import ShareCountryItem from '@/components/simulation/share/ShareCountryItem';
import { useReorderCountries } from '@/hooks/useReorderCountries';

const COLUMN_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
};

/** Column gap per row size (matches the original share image). */
const GAP_CLASS: Record<ItemSize, string> = {
  sm: 'gap-x-2',
  md: 'gap-x-3',
  lg: 'gap-x-5',
  xl: 'gap-x-5',
  '2xl': 'gap-x-5',
};

/**
 * The share-image country grid: rows are the real `ShareCountryItem`, filled
 * column by column (`useReorderCountries`) so rank order reads top-to-bottom
 * in each column.
 */
const ScoreboardElement: React.FC<{ el: ScoreboardElementModel }> = ({
  el,
}) => {
  const { countries: ranked, isVotingOver, runningOrder } = useDesignData();
  // Running order: the stage's draw order, unknown codes last (still ranked).
  const countries = useMemo(() => {
    if (el.rowOrder !== 'runningOrder' || !runningOrder?.length) return ranked;
    const pos = new Map(runningOrder.map((code, i) => [code, i]));

    return [...ranked].sort(
      (a, b) =>
        (pos.get(a.code) ?? Number.MAX_SAFE_INTEGER) -
        (pos.get(b.code) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [ranked, runningOrder, el.rowOrder]);
  const limited = useMemo(
    () => (el.limit > 0 ? countries.slice(0, el.limit) : countries),
    [countries, el.limit],
  );
  const reordered = useReorderCountries(limited, el.columns);
  const uniform = el.statusMode === 'uniform';
  // Rank by object identity so two manual rows with the same country code
  // keep their own ranks (and React keys).
  const rankOf = useMemo(
    () => new Map(countries.map((c, i) => [c, i])),
    [countries],
  );

  return (
    <div
      className={`grid my-4 relative w-full ${
        COLUMN_CLASS[el.columns] ?? 'grid-cols-2'
      } ${GAP_CLASS[el.itemSize]}`}
      style={{
        paddingTop: `${el.paddingY}px`,
        paddingBottom: `${el.paddingY}px`,
      }}
    >
      {reordered.map((country) => (
        <ShareCountryItem
          key={`${country.code}-${rankOf.get(country) ?? 0}`}
          country={country}
          index={rankOf.get(country) ?? 0}
          showPoints={el.showPoints}
          showRankings={el.showRankings}
          size={el.itemSize}
          shortCountryNames={el.shortNames}
          isVotingOver={uniform ? false : isVotingOver}
          withConsistentCountryStatus={uniform}
        />
      ))}
    </div>
  );
};

export default ScoreboardElement;
