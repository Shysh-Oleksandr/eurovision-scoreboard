import { useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useRef } from 'react';

import StatsFlag, { FlagSettings, useFlagSettings } from './StatsFlag';
import { StageRankings } from './statsRankings';

import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { Country } from '@/models';

export type SplitList = 'total' | 'jury' | 'televote';

interface SplitViewProps {
  rankings: StageRankings;
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
  /** The one list a narrow screen shows (the switch above the table). */
  show: SplitList;
}

const POINTS_TYPE: Record<SplitList, 'combined' | 'jury' | 'televote'> = {
  total: 'combined',
  jury: 'jury',
  televote: 'televote',
};

const Entry = ({
  country,
  points,
  list,
  flagSettings,
}: {
  country: Country | undefined;
  points: number;
  list: SplitList;
  flagSettings: FlagSettings;
}) =>
  country ? (
    <>
      <td
        data-g={list}
        data-code={country.code}
        className="dp-stats-split-name"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <StatsFlag country={country} settings={flagSettings} />
          <span className="dp-stats-name">{country.name}</span>
        </span>
      </td>
      <td
        data-g={list}
        data-code={country.code}
        className="dp-stats-num dp-stats-split-pts"
      >
        {toFixedIfDecimalFloat(points)}
      </td>
    </>
  ) : null;

/**
 * Three rankings side by side (total, jury, televote), sharing the place
 * column. Pointing at (or tapping) an entry lights it in all three, so its
 * jury and televote places are one glance away. Too narrow for three, the
 * view shows the list picked in the switch above it (CSS, `data-show`).
 */
const SplitView = ({ rankings, getPoints, show }: SplitViewProps) => {
  const t = useTranslations('simulation.finalStats');
  const flagSettings = useFlagSettings();
  const { hasSplit, byTotal, byJury, byTelevote } = rankings;
  const lists: { list: SplitList; countries: Country[] }[] = hasSplit
    ? [
        { list: 'total', countries: byTotal },
        { list: 'jury', countries: byJury },
        { list: 'televote', countries: byTelevote },
      ]
    : [{ list: 'total', countries: byTotal }];

  const tableRef = useRef<HTMLTableElement>(null);
  const litRef = useRef<string | null>(null);

  const light = useCallback((code: string | null) => {
    const table = tableRef.current;

    if (!table || litRef.current === code) return;
    if (litRef.current) {
      table
        .querySelectorAll(`[data-code="${litRef.current}"]`)
        .forEach((el) => el.classList.remove('is-hl'));
    }
    if (code) {
      table
        .querySelectorAll(`[data-code="${code}"]`)
        .forEach((el) => el.classList.add('is-hl'));
    }
    litRef.current = code;
  }, []);

  // Another stage: the rows hold other countries now.
  useEffect(() => {
    tableRef.current
      ?.querySelectorAll('.is-hl')
      .forEach((el) => el.classList.remove('is-hl'));
    litRef.current = null;
  }, [rankings]);

  const codeFromEvent = (event: React.SyntheticEvent) =>
    ((event.target as Element).closest('[data-code]') as HTMLElement | null)
      ?.dataset.code ?? null;

  return (
    <div className="dp-stats-scroll narrow-scrollbar h-full">
      <table
        ref={tableRef}
        data-show={hasSplit ? show : 'total'}
        className="dp-stats-table dp-stats-split"
        onPointerOver={(event) => {
          if (event.pointerType === 'mouse') light(codeFromEvent(event));
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === 'mouse') light(null);
        }}
        onClick={(event) => light(codeFromEvent(event))}
      >
        <thead>
          <tr>
            <th scope="col" className="dp-stats-num dp-stats-split-place">
              {t('place')}
            </th>
            {lists.map(({ list }) => (
              <th
                key={list}
                scope="colgroup"
                colSpan={2}
                data-g={list}
                className="dp-stats-split-group"
              >
                {list === 'total'
                  ? hasSplit
                    ? t('total')
                    : t('points')
                  : t(list)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {byTotal.map((leader, index) => (
            <tr key={leader.code}>
              <td className="dp-stats-num dp-stats-split-place">{index + 1}</td>
              {lists.map(({ list, countries }) => (
                <Entry
                  key={list}
                  list={list}
                  country={countries[index]}
                  points={
                    countries[index]
                      ? getPoints(countries[index], POINTS_TYPE[list])
                      : 0
                  }
                  flagSettings={flagSettings}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SplitView;
