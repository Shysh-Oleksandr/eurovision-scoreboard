import React, { useEffect, useMemo, useRef, useState } from 'react';
import SortableList, { SortableItem } from 'react-easy-sort';

import { BaseCountry } from '../../models';

import { DragGripIcon } from '@/assets/icons/DragGripIcon';
import { getFlagPath } from '@/helpers/getFlagPath';
import { cn } from '@/helpers/utils';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import {
  oddsToRankOrder,
  rankOrderToOdds,
} from '@/state/scoreboard/rankToOdds';
import { getHostingCountryLogo } from '@/theme/hosting';

// Medal accent colours for the top 3 ranks (gold / silver / bronze). Not part of
// the primary token set, so kept as local constants.
const MEDAL_COLORS = ['#e4b800', '#b0bcd0', '#c08050'];

interface CountryRankListProps {
  countries: BaseCountry[];
  dimension: 'jury' | 'televote';
  pointsSpread: number;
  layout?: 'list' | 'grid';
  /** Persist callback: receives the current order (best first). */
  onReorder: (orderedCodes: string[]) => void;
}

// Renders the sortable rank list (list rows or grid cards) with a leaderboard
// treatment: rank number, flag, name, generated odds, and top-3 medal accents.
// Drag state is scoped via the `.dragged-rank-row` class (see styles.css).
export const CountryRankList: React.FC<CountryRankListProps> = ({
  countries,
  dimension,
  pointsSpread,
  layout = 'list',
  onReorder,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const countryCodesKey = countries.map((c) => c.code).join(',');

  const [orderedCodes, setOrderedCodes] = useState<string[]>(() =>
    oddsToRankOrder(
      countries,
      useCountriesStore.getState().countryOdds,
      dimension,
    ),
  );

  // Reseed the order when the active dimension or the participating set changes.
  // Deliberately NOT dependent on countryOdds so our own writes don't reseed.
  // The ref starts at the initial key so the mount run is skipped — otherwise it
  // would create a second `orderedCodes` reference and trip the persist effect
  // below, overwriting odds just from opening rank view.
  const seededKeyRef = useRef(`${dimension}|${countryCodesKey}`);

  useEffect(() => {
    const key = `${dimension}|${countryCodesKey}`;

    if (seededKeyRef.current === key) return;
    seededKeyRef.current = key;

    setOrderedCodes(
      oddsToRankOrder(
        countries,
        useCountriesStore.getState().countryOdds,
        dimension,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension, countryCodesKey]);

  const countryByCode = useMemo(() => {
    const map: Record<string, BaseCountry> = {};

    countries.forEach((c) => {
      map[c.code] = c;
    });

    return map;
  }, [countries]);

  const generatedOdds = useMemo(
    () => rankOrderToOdds(orderedCodes, pointsSpread),
    [orderedCodes, pointsSpread],
  );

  // Persist odds ONLY on an actual drag — never on dimension switch or
  // points-spread changes — so passively opening/exploring rank view can't
  // overwrite the user's existing odds.
  const onSortEnd = (oldIndex: number, newIndex: number) => {
    const next = [...orderedCodes];
    const [removed] = next.splice(oldIndex, 1);

    next.splice(newIndex, 0, removed);
    setOrderedCodes(next);
    onReorder(next);
  };

  const isGrid = layout === 'grid';

  return (
    <SortableList
      onSortEnd={onSortEnd}
      className={
        isGrid
          ? 'grid grid-cols-2 sm:grid-cols-3 gap-2'
          : 'flex flex-col gap-1.5'
      }
      draggedItemClassName="dragged-rank-row"
    >
      {orderedCodes.map((code, index) => {
        const country = countryByCode[code];

        if (!country) return null;

        const { logo, isExisting } = getHostingCountryLogo(
          country,
          shouldShowHeartFlagIcon,
        );

        const odds = generatedOdds[code];
        const medal = index < 3 ? MEDAL_COLORS[index] : null;

        return (
          <SortableItem key={code}>
            <div
              className={cn(
                'relative flex items-center overflow-hidden cursor-grab rounded-lg border',
                'border-primary-700/50 bg-gradient-to-bl from-primary-800 to-primary-700/60',
                // No `transform` in the transition: react-easy-sort sets an inline
                // translate3d while dragging; animating transform would make drag lag.
                'transition-[box-shadow,background,border-color] duration-150',
                isGrid ? 'py-2.5 px-3' : 'py-2.5 px-3',
              )}
            >
              {/* Top-3 medal accent bar. */}
              {medal && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-[3px] pointer-events-none"
                  style={{ background: medal }}
                />
              )}

              <span className="relative shrink-0 text-white/30">
                <DragGripIcon className="sm:w-6 w-5 sm:h-6 h-5" />
              </span>

              <span
                className={cn(
                  'relative shrink-0 text-right font-extrabold tabular-nums text-white/70 mr-3',
                  isGrid ? 'min-w-[20px] sm:text-xl text-base' : 'w-8 text-xl',
                )}
                style={medal ? { color: medal } : undefined}
              >
                {index + 1}
              </span>

              <img
                src={logo}
                alt={country.name}
                loading="lazy"
                className={cn(
                  'relative shrink-0 rounded-sm pointer-events-none mr-3',
                  isExisting ? 'w-7 h-7' : 'w-9 h-6 object-cover',
                )}
                width={28}
                height={28}
                onError={(e) => {
                  e.currentTarget.src = getFlagPath('ww');
                }}
              />

              <span
                className={cn(
                  'relative flex-1 min-w-0 font-semibold truncate text-white',
                  isGrid ? 'text-[13px]' : 'text-[15px]',
                )}
              >
                {country.name}
              </span>

              <span
                className={cn(
                  'relative shrink-0 font-bold tabular-nums text-white/80',
                  isGrid ? 'text-[13px]' : 'text-[15px] pr-1',
                )}
              >
                {odds}
              </span>
            </div>
          </SortableItem>
        );
      })}
    </SortableList>
  );
};

export default CountryRankList;
