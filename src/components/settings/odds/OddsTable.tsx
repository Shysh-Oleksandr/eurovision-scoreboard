'use client';
import { ArrowDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import OddsField from './OddsField';
import { OddsChannel, OddsSort, sortCountryCodes } from './oddsFormat';

import StatsFlag, {
  useFlagSettings,
} from '@/components/simulation/finalStats/StatsFlag';
import { BaseCountry } from '@/models';
import { CountryOdds } from '@/state/countriesStore';

interface OddsTableProps {
  countries: BaseCountry[];
  countryOdds: CountryOdds;
  sort: OddsSort;
  onSortChange: (sort: OddsSort) => void;
  /** Bumped after Set all odds and Undo: the rows take the sort again. */
  resortKey: number;
  onCommit: (
    code: string,
    channel: OddsChannel,
    value: number | undefined,
  ) => void;
}

/**
 * Numbers: one row per country with its jury and televote odds under
 * labelled columns (the stats modal's tables: hairlines between rows, the
 * header stays on top). A header sorts when clicked; rows never move while
 * a value is being typed.
 */
const OddsTable: React.FC<OddsTableProps> = ({
  countries,
  countryOdds,
  sort,
  onSortChange,
  resortKey,
  onCommit,
}) => {
  const t = useTranslations();
  const locale = useLocale();
  const flagSettings = useFlagSettings();
  const tableRef = useRef<HTMLDivElement>(null);
  const oddsRef = useRef(countryOdds);

  oddsRef.current = countryOdds;

  const countryCodesKey = countries.map((c) => c.code).join(',');
  const [order, setOrder] = useState(() =>
    sortCountryCodes(countries, countryOdds, sort, locale),
  );

  useEffect(() => {
    setOrder(sortCountryCodes(countries, oddsRef.current, sort, locale));
    // The order is a snapshot: odds typed into the table don't re-sort it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, resortKey, countryCodesKey, locale]);

  const byCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c])),
    [countries],
  );

  const moveFocus = useCallback(
    (row: number, column: OddsChannel, delta: 1 | -1) => {
      const target = tableRef.current?.querySelector<HTMLInputElement>(
        `[data-odds-row="${row + delta}"][data-odds-col="${column}"]`,
      );

      target?.focus();
    },
    [],
  );

  const header = (key: OddsSort, label: string, swatch?: string) => {
    const on = sort === key;

    return (
      <div
        role="columnheader"
        aria-sort={on ? (key === 'name' ? 'ascending' : 'descending') : 'none'}
        className={key === 'name' ? 'min-w-0' : 'flex justify-end'}
      >
        <button
          type="button"
          onClick={() => onSortChange(key)}
          title={t('settings.odds.sortBy', { column: label })}
          className={`dp-odds-sort ${
            on ? 'is-on' : ''
          } inline-flex max-w-full items-center gap-1.5 rounded-md py-1 text-[12.5px] font-bold`}
        >
          {swatch && (
            <i
              aria-hidden="true"
              className={`dp-odds-swatch ${swatch} size-2 flex-none rounded-[2px]`}
            />
          )}
          <span className="truncate">{label}</span>
          {on && (
            <ArrowDown
              aria-hidden="true"
              className="size-3.5 flex-none"
              strokeWidth={2.6}
            />
          )}
        </button>
      </div>
    );
  };

  const juryLabel = t('simulation.finalStats.jury');
  const televoteLabel = t('simulation.finalStats.televote');

  return (
    <div
      ref={tableRef}
      role="table"
      aria-label={t('settings.general.odds')}
      className="dp-odds-table"
    >
      <div role="rowgroup" className="dp-odds-thead">
        <div role="row" className="dp-odds-grid items-center">
          {header('name', t('settings.odds.country'))}
          {header('jury', juryLabel, 'is-jury')}
          {header('televote', televoteLabel, 'is-televote')}
        </div>
      </div>
      <div role="rowgroup">
        {order.map((code, row) => {
          const country = byCode.get(code);

          if (!country) return null;
          const odds = countryOdds[code] || {};

          return (
            <div
              key={code}
              role="row"
              className="dp-odds-grid dp-odds-row items-center"
            >
              <div
                role="rowheader"
                className="flex min-w-0 items-center gap-[11px]"
              >
                <StatsFlag country={country} settings={flagSettings} />
                <span className="min-w-0 text-[14px] font-bold leading-[1.2] [overflow-wrap:anywhere]">
                  {country.name}
                </span>
              </div>
              <div role="cell">
                <OddsField
                  value={odds.juryOdds}
                  onCommit={(value) => onCommit(code, 'jury', value)}
                  ariaLabel={t('settings.odds.juryOddsOf', {
                    country: country.name,
                  })}
                  onMove={(delta) => moveFocus(row, 'jury', delta)}
                  row={row}
                  column="jury"
                />
              </div>
              <div role="cell">
                <OddsField
                  value={odds.televoteOdds}
                  onCommit={(value) => onCommit(code, 'televote', value)}
                  ariaLabel={t('settings.odds.televoteOddsOf', {
                    country: country.name,
                  })}
                  onMove={(delta) => moveFocus(row, 'televote', delta)}
                  row={row}
                  column="televote"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OddsTable;
