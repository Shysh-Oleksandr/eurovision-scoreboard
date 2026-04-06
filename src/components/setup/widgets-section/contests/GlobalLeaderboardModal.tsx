'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { usePublicLeaderboardQuery } from '@/api/contests';
import Button from '@/components/common/Button';
import { Checkbox } from '@/components/common/Checkbox';
import CustomSelect, {
  type Option,
} from '@/components/common/customSelect/CustomSelect';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { EUROVISION_COUNTRIES } from '@/data/countries/common-countries';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import type { PublicLeaderboardRow } from '@/types/publicLeaderboard';

const FIRST_EUROVISION_YEAR = 1956;
const CUSTOM_YEAR_MIN = 0;
const CUSTOM_YEAR_MAX = 10000;

type SortKey = keyof PublicLeaderboardRow | 'country';

interface GlobalLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function buildPresetYears(currentCalendarYear: number): number[] {
  const out: number[] = [];

  for (let y = currentCalendarYear + 1; y >= FIRST_EUROVISION_YEAR; y = y - 1) {
    out.push(y);
  }

  return out;
}

/** Null/undefined always sort last; then apply asc/desc to defined values (so “—” never floats to the top on desc). */
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

export const GlobalLeaderboardModal: React.FC<GlobalLeaderboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const t = useTranslations('widgets.contests.leaderboard');
  const currentYear = new Date().getFullYear();
  const presetYears = useMemo(
    () => buildPresetYears(currentYear),
    [currentYear],
  );

  const [selected, setSelected] = useState<'global' | number>('global');
  const [sortKey, setSortKey] = useState<SortKey>('wins');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [onlyEurovisionCountries, setOnlyEurovisionCountries] = useState(false);

  const yearSelectOptions: Option[] = useMemo(() => {
    const opts: Option[] = [
      { label: t('globalOption'), value: 'global' },
      ...presetYears.map((y) => ({ label: String(y), value: String(y) })),
    ];

    if (selected !== 'global' && !presetYears.includes(selected)) {
      opts.push({ label: String(selected), value: String(selected) });
    }

    return opts;
  }, [presetYears, selected, t]);

  const queryYear = selected === 'global' ? 'global' : selected;

  const { data, isLoading, isError, error } = usePublicLeaderboardQuery({
    year: queryYear,
    enabled: isOpen,
  });

  const getAllCountries = useCountriesStore((s) => s.getAllCountries);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (s) => s.settings.shouldShowHeartFlagIcon,
  );

  const sortedRows = useMemo(() => {
    if (!data?.rows) return [];
    const rows = [...data.rows].filter((row) => {
      if (onlyEurovisionCountries) {
        return EUROVISION_COUNTRIES.some((c) => c.code === row.code);
      }

      return true;
    });

    rows.sort((a, b) => {
      if (sortKey === 'country') {
        const na =
          getAllCountries(true).find((c) => c.code === a.code)?.name ?? a.code;
        const nb =
          getAllCountries(true).find((c) => c.code === b.code)?.name ?? b.code;

        const cmp = na.localeCompare(nb);

        return sortDir === 'asc' ? cmp : -cmp;
      }

      return compareMetricValue(a[sortKey], b[sortKey], sortDir);
    });

    return rows;
  }, [data?.rows, sortKey, sortDir, getAllCountries, onlyEurovisionCountries]);

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

  const computedLabel = useMemo(() => {
    if (!data?.computedAt) return '';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.computedAt));
    } catch {
      return data.computedAt;
    }
  }, [data?.computedAt]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,960px)]"
      contentClassName="text-white sm:h-[75vh] h-[70vh] max-h-[70vh] narrow-scrollbar sm:!py-6 !py-4"
      overlayClassName="!z-[1003]"
      withBlur
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <div className="flex flex-col gap-4 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg sm:text-2xl font-bold text-white">
            {t('title')}
          </h2>
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-white/80 w-full sm:w-auto sm:min-w-0">
            <span className="shrink-0">{t('yearLabel')}</span>
            <CustomSelect
              id="leaderboard-year-scope"
              label=""
              className="w-full sm:w-[180px] sm:max-w-[180px]"
              options={yearSelectOptions}
              value={selected === 'global' ? 'global' : String(selected)}
              onChange={(v) => {
                if (v === 'global') setSelected('global');
                else setSelected(Number.parseInt(v, 10));
              }}
              withIndicator={false}
              emptyFilterContent={({ searchText, close }) => {
                const n = Number.parseInt(searchText.trim(), 10);

                if (
                  !Number.isInteger(n) ||
                  n < CUSTOM_YEAR_MIN ||
                  n > CUSTOM_YEAR_MAX
                ) {
                  return null;
                }

                return (
                  <div className="px-3 py-2">
                    <Button
                      variant="tertiary"
                      className="w-full !py-2.5 justify-center text-base"
                      onClick={() => {
                        setSelected(n);
                        close();
                      }}
                    >
                      {t('useYearButton', { year: n })}
                    </Button>
                  </div>
                );
              }}
            />
          </label>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <span className="loader" />
          </div>
        )}

        {isError && (
          <p className="text-red-300 text-sm">
            {(error as any)?.response?.data?.message ?? t('failedToLoad')}
          </p>
        )}

        {data && !isLoading && (
          <>
            <div className="flex items-center flex-wrap justify-between gap-2">
              <p className="text-white/70 text-sm">
                {t('contestCount', { count: data.contestCount })}
              </p>
              <Checkbox
                id="only-eurovision-countries"
                label={t('onlyEurovisionCountries')}
                checked={onlyEurovisionCountries}
                onChange={(e) => setOnlyEurovisionCountries(e.target.checked)}
              />
            </div>
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-left border-collapse text-[0.9rem] min-w-[720px]">
                <thead>
                  <tr className="text-white/70 border-b border-primary-800">
                    <th
                      className={`${headerClass} w-[40px] pointer-events-none`}
                    >
                      {t('rank')}
                    </th>
                    <th
                      className={headerClass}
                      onClick={() => toggleSort('country')}
                    >
                      {t('country')}{' '}
                      {sortKey === 'country'
                        ? sortDir === 'asc'
                          ? '↑'
                          : '↓'
                        : ''}
                    </th>
                    {(
                      [
                        ['wins', t('wins')],
                        ['finals', t('finals')],
                        ['participations', t('participations')],
                        ['winRate', t('winRate')],
                        ['podiums', t('top3')],
                        ['top5', t('top5')],
                        ['top10', t('top10')],
                        ['avgGrandFinalPoints', t('avgGfPoints')],
                        ['totalGrandFinalPoints', t('totalGfPoints')],
                      ] as const
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        className={headerClass}
                        onClick={() => toggleSort(key)}
                      >
                        {label}{' '}
                        {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, index) => {
                    const country =
                      getAllCountries(true).find((c) => c.code === row.code) ??
                      null;
                    const { logo, isExisting } = country
                      ? getHostingCountryLogo(country, shouldShowHeartFlagIcon)
                      : { logo: getFlagPath('ww'), isExisting: false };

                    return (
                      <tr
                        key={row.code}
                        className="border-b border-primary-800/60 align-middle"
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
                                isExisting ? 'w-7 h-7' : 'w-7 h-5 object-cover'
                              }`}
                              onError={(e) => {
                                e.currentTarget.src = getFlagPath('ww');
                              }}
                            />
                            <span className="truncate font-medium">
                              {country?.name ?? row.code}
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-2 tabular-nums">{row.wins}</td>
                        <td className="py-2 px-2 tabular-nums">{row.finals}</td>
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
                        <td className="py-2 px-2 tabular-nums">{row.top10}</td>
                        <td className="py-2 px-2 tabular-nums">
                          {formatAvg(row.avgGrandFinalPoints)}
                        </td>
                        <td className="py-2 px-2 tabular-nums">
                          {row.totalGrandFinalPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-white/50 text-xs pt-1 border-t border-primary-800/60">
              {t('computedAt', { time: computedLabel })}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};

export default GlobalLeaderboardModal;
