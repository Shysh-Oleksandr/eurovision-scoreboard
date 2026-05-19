'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { useMyLeaderboardQuery } from '@/api/contests';
import { Checkbox } from '@/components/common/Checkbox';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { Input } from '@/components/Input';
import SearchInputIcon from '@/components/setup/SearchInputIcon';
import { EUROVISION_COUNTRIES } from '@/data/countries/common-countries';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import type { MyLeaderboardRow } from '@/types/publicLeaderboard';

type SortKey = keyof MyLeaderboardRow | 'country' | 'qualRate';

/** Null/undefined always sort last; then apply asc/desc to defined values. */
function compareMetricValue(
  a: unknown,
  b: unknown,
  sortDir: 'asc' | 'desc',
): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;

  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let cmp = 0;

  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b));
  }

  return sortDir === 'asc' ? cmp : -cmp;
}

interface MyLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntry: (entryCode: string) => void;
}

export const MyLeaderboardModal: React.FC<MyLeaderboardModalProps> = ({
  isOpen,
  onClose,
  onSelectEntry,
}) => {
  const t = useTranslations('widgets.contests.myLeaderboard');
  const tLb = useTranslations('widgets.contests.leaderboard');

  const [sortKey, setSortKey] = useState<SortKey>('wins');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [search, setSearch] = useState('');
  const [onlyEurovisionCountries, setOnlyEurovisionCountries] = useState(false);

  const { data, isLoading, isError, error } = useMyLeaderboardQuery(isOpen);

  const getAllCountries = useCountriesStore((s) => s.getAllCountries);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (s) => s.settings.shouldShowHeartFlagIcon,
  );

  const customEntryFallback = t('customEntryName');

  const customEntriesMap = useMemo(() => {
    const map = new Map<string, { name: string; flag: string }>();

    for (const ce of data?.customEntries ?? []) {
      map.set(ce.code, { name: ce.name, flag: ce.flag });
    }

    return map;
  }, [data?.customEntries]);

  const resolveEntry = (code: string) => {
    const localCountry = getAllCountries(true).find((c) => c.code === code);

    if (localCountry) {
      return {
        name: localCountry.name,
        ...getHostingCountryLogo(localCountry, shouldShowHeartFlagIcon),
      };
    }

    const apiEntry = customEntriesMap.get(code);

    if (apiEntry) {
      return {
        name: apiEntry.name,
        logo: apiEntry.flag || getFlagPath('ww'),
        isExisting: false,
      };
    }

    return {
      name: code.startsWith('custom-') ? customEntryFallback : code,
      logo: getFlagPath('ww'),
      isExisting: false,
    };
  };

  const sortedRows = useMemo(() => {
    if (!data?.rows) return [];

    const needle = search.trim().toLowerCase();

    const rows = [...data.rows]
      .filter((row) => {
        if (onlyEurovisionCountries) {
          return EUROVISION_COUNTRIES.some((c) => c.code === row.code);
        }

        return true;
      })
      .filter((row) => {
        if (!needle) return true;
        const { name } = resolveEntry(row.code);

        return name.toLowerCase().includes(needle);
      });

    rows.sort((a, b) => {
      if (sortKey === 'country') {
        const cmp = resolveEntry(a.code).name.localeCompare(
          resolveEntry(b.code).name,
        );

        return sortDir === 'asc' ? cmp : -cmp;
      }

      if (sortKey === 'qualRate') {
        const ra = a.participations > 0 ? a.finals / a.participations : 0;
        const rb = b.participations > 0 ? b.finals / b.participations : 0;

        return compareMetricValue(ra, rb, sortDir);
      }

      return compareMetricValue(a[sortKey], b[sortKey], sortDir);
    });

    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    data?.rows,
    sortKey,
    sortDir,
    search,
    onlyEurovisionCountries,
    getAllCountries,
    customEntriesMap,
    customEntryFallback,
    shouldShowHeartFlagIcon,
  ]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'country' ? 'asc' : 'desc');
    }
  };

  const headerClass =
    'py-2 px-2 font-medium text-left whitespace-nowrap cursor-pointer transition-colors duration-200 select-none hover:text-white';

  const formatWinRate = (v: number | null) => {
    if (v === null) return '—';

    return `${(v * 100).toFixed(1)}%`;
  };

  const formatAvg = (v: number | null) => {
    if (v === null) return '—';

    return v.toFixed(1);
  };

  const formatQualRate = (row: MyLeaderboardRow) => {
    if (row.participations === 0) return '—';

    return `${((row.finals / row.participations) * 100).toFixed(1)}%`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,960px)]"
      contentClassName="text-white sm:h-[75vh] h-[70vh] max-h-[70vh] narrow-scrollbar sm:!py-6 !py-4"
      overlayClassName="!z-[1002]"
      withBlur
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <div className="flex flex-col gap-4 px-1">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold text-white">
            {t('title')}
          </h2>
          <p className="text-sm text-white/60 mt-1">{t('subtitle')}</p>
        </div>

        <div className="relative">
          <Input
            className="text-sm pr-10"
            name="myLeaderboardSearch"
            id="myLeaderboardSearch"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <SearchInputIcon
            showClearIcon={search.length > 0}
            onClick={() => search.length > 0 && setSearch('')}
          />
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <span className="loader" />
          </div>
        )}

        {isError && (
          <p className="text-red-300 text-sm">
            {(error as any)?.response?.data?.message ?? tLb('failedToLoad')}
          </p>
        )}

        {data && !isLoading && data.contestCount === 0 && (
          <p className="text-white/60 text-sm text-center py-6">
            {t('noData')}
          </p>
        )}

        {data && !isLoading && data.contestCount > 0 && (
          <>
            <div className="flex items-center flex-wrap justify-between gap-2">
              <p className="text-white/70 text-sm">
                {tLb('contestCount', { count: data.contestCount })}
              </p>
              <Checkbox
                id="my-leaderboard-only-eurovision"
                label={tLb('onlyEurovisionCountries')}
                checked={onlyEurovisionCountries}
                onChange={(e) => setOnlyEurovisionCountries(e.target.checked)}
              />
            </div>

            {sortedRows.length === 0 &&
              (search.trim() || onlyEurovisionCountries) && (
                <p className="text-white/60 text-sm text-center py-6">
                  {t('noEntriesMatch')}
                </p>
              )}

            {sortedRows.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left border-collapse text-[0.9rem] min-w-[720px]">
                  <thead>
                    <tr className="text-white/70 border-b border-primary-800">
                      <th
                        className={`${headerClass} w-[40px] pointer-events-none`}
                      >
                        {tLb('rank')}
                      </th>
                      <th
                        className={headerClass}
                        onClick={() => toggleSort('country')}
                      >
                        {tLb('country')}{' '}
                        {sortKey === 'country'
                          ? sortDir === 'asc'
                            ? '↑'
                            : '↓'
                          : ''}
                      </th>
                      {(
                        [
                          ['wins', tLb('wins')],
                          ['finals', tLb('finals')],
                          ['participations', tLb('participations')],
                          ['winRate', tLb('winRate')],
                          ['podiums', tLb('top3')],
                          ['top5', tLb('top5')],
                          ['top10', tLb('top10')],
                          ['avgGrandFinalPoints', tLb('avgGfPoints')],
                          ['totalGrandFinalPoints', tLb('totalGfPoints')],
                          ['qualRate', tLb('qualRate')],
                          ['qualifyingStreak', tLb('qualStreak')],
                        ] as const
                      ).map(([key, label]) => (
                        <th
                          key={key}
                          className={headerClass}
                          onClick={() => toggleSort(key)}
                        >
                          {label}{' '}
                          {sortKey === key
                            ? sortDir === 'asc'
                              ? '↑'
                              : '↓'
                            : ''}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => {
                      const { name, logo, isExisting } = resolveEntry(row.code);

                      return (
                        <tr
                          key={row.code}
                          className="border-b border-primary-800/60 align-middle cursor-pointer hover:bg-primary-800/40 transition-colors duration-150"
                          onClick={() => onSelectEntry(row.code)}
                        >
                          <td className="py-2 px-2 tabular-nums text-center">
                            {index + 1}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2 min-w-0 max-w-[200px] min-h-[24.5px]">
                              <img
                                src={logo}
                                alt=""
                                className={`flex-none rounded-sm ${
                                  isExisting
                                    ? 'w-7 h-7'
                                    : 'w-7 h-5 object-cover'
                                }`}
                                onError={(e) => {
                                  e.currentTarget.src = getFlagPath('ww');
                                }}
                              />
                              <span className="truncate font-medium">
                                {name}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-2 tabular-nums">{row.wins}</td>
                          <td className="py-2 px-2 tabular-nums">
                            {row.finals}
                          </td>
                          <td className="py-2 px-2 tabular-nums">
                            {row.participations}
                          </td>
                          <td className="py-2 px-2 tabular-nums">
                            {formatWinRate(row.winRate)}
                          </td>
                          <td className="py-2 px-2 tabular-nums">
                            {row.podiums}
                          </td>
                          <td className="py-2 px-2 tabular-nums">{row.top5}</td>
                          <td className="py-2 px-2 tabular-nums">
                            {row.top10}
                          </td>
                          <td className="py-2 px-2 tabular-nums">
                            {formatAvg(row.avgGrandFinalPoints)}
                          </td>
                          <td className="py-2 px-2 tabular-nums">
                            {row.totalGrandFinalPoints}
                          </td>
                          <td className="py-2 px-2 tabular-nums">
                            {formatQualRate(row)}
                          </td>
                          <td className="py-2 px-2 tabular-nums">
                            {row.qualifyingStreak}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default MyLeaderboardModal;
