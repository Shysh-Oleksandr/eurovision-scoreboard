import { useTranslations } from 'next-intl';
import React, { memo } from 'react';

import type { RevealColumn as RevealColumnModel } from './useRevealColumns';

import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { useGeneralStore } from '@/state/generalStore';

/** Beyond this the stack of jury flags is summarised as "+N". */
const MAX_VISIBLE_VOTERS = 4;

type Props = {
  column: RevealColumnModel;
  /** Ref for the column the board scrolls into view after an award. */
  columnRef?: (element: HTMLDivElement | null) => void;
};

const RevealColumn = ({ column, columnRef }: Props) => {
  const t = useTranslations('simulation.juryScaleReveal');
  const enableMinimalisticFlags = useGeneralStore(
    (state) => state.settings.enableMinimalisticFlags,
  );

  const {
    country,
    barPercent,
    awardedPoints,
    voters,
    isLeader,
    qualification,
  } = column;
  const hasAward = awardedPoints !== null && awardedPoints > 0;
  const visibleVoters = voters.slice(0, MAX_VISIBLE_VOTERS);
  const hiddenVotersCount = voters.length - visibleVoters.length;

  // Once a qualifying stage is decided the fill stops meaning "just scored" and
  // starts meaning "went through", so qualification wins over the award colour.
  const isHighlighted = qualification
    ? qualification === 'qualified'
    : hasAward;
  const isDimmed = qualification === 'eliminated';

  return (
    <div
      ref={columnRef}
      className="flex flex-col items-center flex-1 basis-0 min-w-[var(--reveal-col-min)] max-w-[var(--reveal-col-max)] gap-1"
    >
      {/* Reserved so revealing an award never shifts the bars below. The flags
          tuck into each other so a full stack still fits the reserved height. */}
      <div className="flex flex-col items-center justify-end gap-1 h-24 xs:h-28 w-full">
        {hasAward && (
          <>
            <div className="flex flex-col items-center">
              {visibleVoters.map((voter, index) => (
                <img
                  key={voter.code}
                  src={getFlagPath(voter, 'round', enableMinimalisticFlags)}
                  onError={(e) =>
                    handleFlagError(e.currentTarget, voter, 'round')
                  }
                  alt={`${voter.name} flag`}
                  width={20}
                  height={20}
                  loading="lazy"
                  className={`w-4 h-4 xs:w-5 xs:h-5 rounded-full object-cover shrink-0 ring-1 ring-black/25 ${
                    index > 0 ? '-mt-1.5' : ''
                  }`}
                />
              ))}
            </div>
            {hiddenVotersCount > 0 && (
              <span className="text-[0.6rem] xs:text-xs font-medium text-white/70 leading-none">
                {t('moreVoters', { count: hiddenVotersCount })}
              </span>
            )}
            <div
              className="min-w-[1.6rem] xs:min-w-[1.9rem] px-1 py-[3px] rounded-full text-center text-[0.7rem] xs:text-sm font-bold leading-none bg-countryItem-juryLastPointsBg text-countryItem-juryLastPointsText"
              aria-label={`${country.name} received ${awardedPoints} points`}
            >
              {awardedPoints}
            </div>
          </>
        )}
      </div>

      {/* The unfilled part is the entry colour dimmed over a dark scrim rather
          than a colour of its own, so the name keeps the contrast the theme
          designed for it whatever the fill height is. */}
      <div className="relative w-full h-[clamp(8.75rem,32vh,20rem)] rounded-t-md overflow-hidden bg-black/25">
        <div className="absolute inset-0 bg-countryItem-juryBg opacity-40" />
        <div
          className={`absolute inset-x-0 bottom-0 motion-safe:transition-[height,background-color,opacity] motion-safe:duration-500 motion-safe:ease-out ${
            isHighlighted
              ? 'bg-countryItem-juryLastPointsBg'
              : 'bg-countryItem-juryBg'
          } ${isDimmed ? 'opacity-40' : ''}`}
          style={{ height: `${barPercent}%` }}
        />
        <div className="absolute inset-0 flex flex-col justify-end items-center py-2">
          <span
            className={`[writing-mode:vertical-rl] rotate-180 max-h-full overflow-hidden whitespace-nowrap text-ellipsis uppercase font-bold text-[0.7rem] xs:text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
              isHighlighted && !isDimmed
                ? 'text-countryItem-juryLastPointsText'
                : 'text-countryItem-juryCountryText'
            }`}
          >
            {country.name}
          </span>
        </div>
        {/* Painted last: an inset ring on the track itself would sit under the
            fill layers and disappear as the bar grows. Uses the ring utility
            rather than a `var(--…)` box-shadow — tw-colors exposes its theme
            variables as bare HSL channels, so they can't be dropped into a
            shadow value directly. */}
        {isLeader && (
          <div className="absolute inset-0 pointer-events-none rounded-t-md ring-2 ring-inset ring-countryItem-televoteOutline" />
        )}
      </div>

      <img
        src={getFlagPath(country, 'round', enableMinimalisticFlags)}
        onError={(e) => handleFlagError(e.currentTarget, country, 'round')}
        alt={`${country.name} flag`}
        width={28}
        height={28}
        loading="lazy"
        className="w-5 h-5 xs:w-7 xs:h-7 rounded-full object-cover"
      />

      <div className="w-full flex justify-center">
        <div className="min-w-[1.6rem] xs:min-w-[1.9rem] px-1 py-[3px] rounded-full text-center text-[0.7rem] xs:text-sm font-bold leading-none bg-countryItem-juryPointsBg text-countryItem-juryPointsText">
          {country.points}
        </div>
      </div>
    </div>
  );
};

export default memo(RevealColumn);
