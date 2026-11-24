'use client';
import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useRef } from 'react';

import StatsFlag, { useFlagSettings } from '../StatsFlag';
import StatsSegmented from '../StatsSegmented';

import type { VotesCountry } from './votesData';

import { BoardCap, BoardFlag } from '@/components/setup/hub/lineup/CountryTile';
import { useBoardRowLook } from '@/components/setup/hub/lineup/useBoardRowLook';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';

export type VotesPickerOrder = 'result' | 'az';

interface VotesPickerProps {
  entries: VotesCountry[];
  votersOnly: VotesCountry[];
  current: string;
  order: VotesPickerOrder;
  onOrderChange: (order: VotesPickerOrder) => void;
  onPick: (code: string) => void;
}

const byName = (a: VotesCountry, b: VotesCountry) =>
  a.name.localeCompare(b.name);

/**
 * Every country the graphic can put in the middle: the stage's entries as
 * the theme's board rows (by result, numbered with their place, or A to Z),
 * then the countries that only voted as quiet tiles. The one in the middle
 * now is ringed in the accent.
 */
const VotesPicker: React.FC<VotesPickerProps> = ({
  entries,
  votersOnly,
  current,
  order,
  onOrderChange,
  onPick,
}) => {
  const t = useTranslations('simulation.finalStats.votes');
  const look = useBoardRowLook();
  const flagSettings = useFlagSettings();
  const currentRef = useRef<HTMLButtonElement>(null);

  const sortedEntries = useMemo(
    () => (order === 'az' ? [...entries].sort(byName) : entries),
    [entries, order],
  );
  const sortedVoters = useMemo(
    () => [...votersOnly].sort(byName),
    [votersOnly],
  );

  // Opens with the current country in view and focused.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest' });
    currentRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="dp-votes-picker narrow-scrollbar">
      <div className="dp-votes-picker-head">
        <p className="dp-votes-picker-title">{t('pickTitle')}</p>
        <StatsSegmented
          value={order}
          options={[
            { value: 'result', label: t('orderResult') },
            { value: 'az', label: t('orderAZ') },
          ]}
          onChange={onOrderChange}
          ariaLabel={t('order')}
        />
      </div>

      <ul className="dp-votes-rows" aria-label={t('entries')}>
        {sortedEntries.map((entry) => {
          const isCurrent = entry.code === current;

          return (
            <li key={entry.code}>
              <button
                type="button"
                ref={isCurrent ? currentRef : undefined}
                aria-current={isCurrent || undefined}
                onClick={() => onPick(entry.code)}
                className={`dp-votes-row ${isCurrent ? 'is-current' : ''}`}
              >
                <span className="dp-votes-row-place">{entry.place}</span>
                <span
                  className={`dp-votes-row-board dp-scoreboard-font bg-countryItem-juryBg text-countryItem-juryCountryText ${
                    look.rounded ? 'rounded-full' : 'rounded-[3px]'
                  }`}
                  style={look.rowStyle}
                >
                  <BoardFlag country={entry.country} look={look} />
                  <span
                    className={`min-w-0 flex-1 truncate text-left font-bold ${
                      look.uppercase ? 'uppercase text-[12.5px]' : 'text-[13px]'
                    } ${look.flagShape === 'none' ? 'pl-3' : ''}`}
                  >
                    {entry.name}
                  </span>
                  <BoardCap look={look} widthClassName="w-[44px]">
                    <span className="text-[13px] font-bold tabular-nums">
                      {toFixedIfDecimalFloat(entry.points ?? 0)}
                    </span>
                  </BoardCap>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {sortedVoters.length > 0 && (
        <>
          <p className="dp-votes-picker-sub">{t('votingOnly')}</p>
          <ul className="dp-votes-tiles" aria-label={t('votingOnly')}>
            {sortedVoters.map((voter) => {
              const isCurrent = voter.code === current;

              return (
                <li key={voter.code}>
                  <button
                    type="button"
                    ref={isCurrent ? currentRef : undefined}
                    aria-current={isCurrent || undefined}
                    onClick={() => onPick(voter.code)}
                    className={`dp-votes-tile ${isCurrent ? 'is-current' : ''}`}
                  >
                    <StatsFlag
                      country={voter.country}
                      settings={flagSettings}
                    />
                    <span className="dp-votes-tile-name">{voter.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default VotesPicker;
