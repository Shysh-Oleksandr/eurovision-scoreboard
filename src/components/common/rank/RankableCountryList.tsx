import React, { useMemo } from 'react';
import SortableList, { SortableItem } from 'react-easy-sort';

import { BaseCountry } from '../../../models';

import { DragGripIcon } from '@/assets/icons/DragGripIcon';
import { getFlagPath } from '@/helpers/getFlagPath';
import { cn } from '@/helpers/utils';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';

// Medal accent colours for the top 3 ranks (gold / silver / bronze). Not part of
// the primary token set, so kept as local constants.
const MEDAL_COLORS = ['#e4b800', '#b0bcd0', '#c08050'];

export interface RankableCountryListProps {
  countries: BaseCountry[];
  /** Current order, best first. This component is fully controlled. */
  orderedCodes: string[];
  /** Called with the new order (best first) after a drag. */
  onReorder: (orderedCodes: string[]) => void;
  layout?: 'list' | 'grid';
  /**
   * Optional trailing value rendered on the right of each row (e.g. generated
   * odds or points). Return `null`/`undefined` to render nothing.
   */
  valueFor?: (code: string, index: number) => React.ReactNode;
}

/**
 * Generic drag-to-rank list with a leaderboard treatment: rank number, flag,
 * name, an optional trailing value, and top-3 medal accents. Controlled — the
 * parent owns `orderedCodes` and seeding. Drag state is scoped via the
 * `.dragged-rank-row` class (see styles.css). Shared by the odds settings and
 * the voting-predefinition rank view.
 */
export const RankableCountryList: React.FC<RankableCountryListProps> = ({
  countries,
  orderedCodes,
  onReorder,
  layout = 'list',
  valueFor,
}) => {
  const shouldShowHeartFlagIcon = useGeneralStore(
    (state) => state.settings.shouldShowHeartFlagIcon,
  );

  const countryByCode = useMemo(() => {
    const map: Record<string, BaseCountry> = {};

    countries.forEach((c) => {
      map[c.code] = c;
    });

    return map;
  }, [countries]);

  const onSortEnd = (oldIndex: number, newIndex: number) => {
    const next = [...orderedCodes];
    const [removed] = next.splice(oldIndex, 1);

    next.splice(newIndex, 0, removed);
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

        const value = valueFor?.(code, index);
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
                'py-2.5 px-3',
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

              {value !== null && value !== undefined && (
                <span
                  className={cn(
                    'relative shrink-0 font-bold tabular-nums text-white/80',
                    isGrid ? 'text-[13px]' : 'text-[15px] pr-1',
                  )}
                >
                  {value}
                </span>
              )}
            </div>
          </SortableItem>
        );
      })}
    </SortableList>
  );
};

export default RankableCountryList;
