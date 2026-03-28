'use client';

import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';
import { toast } from 'react-toastify';

import { api } from '@/api/client';
import { useMyEntryStatsQuery } from '@/api/contests';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import type { Contest } from '@/types/contest';

interface CountryStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a contest is loaded from this modal; use to close the picker too. */
  onContestLoaded?: () => void;
  entryCode: string | null;
}

const CountryStatsModal: React.FC<CountryStatsModalProps> = ({
  isOpen,
  onClose,
  onContestLoaded,
  entryCode,
}) => {
  const t = useTranslations('widgets.contests.entryStats');
  const tContests = useTranslations('widgets.contests');
  const setContestToLoad = useGeneralStore((s) => s.setContestToLoad);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (s) => s.settings.shouldShowHeartFlagIcon,
  );
  const getAllCountries = useCountriesStore((s) => s.getAllCountries);

  const { data, isLoading, isError, error } = useMyEntryStatsQuery(
    entryCode,
    isOpen && !!entryCode,
  );

  const entryCountry = useMemo(() => {
    if (!entryCode) return null;

    return getAllCountries(true).find((c) => c.code === entryCode) ?? null;
  }, [entryCode, getAllCountries]);

  const { logo: entryLogo, isExisting: entryIsExisting } = entryCountry
    ? getHostingCountryLogo(entryCountry, shouldShowHeartFlagIcon)
    : { logo: getFlagPath('ww'), isExisting: false };

  const resolveCountry = (code?: string) => {
    if (!code) return null;

    return getAllCountries(true).find((c) => c.code === code) ?? null;
  };

  const handleLoadContest = async (contestId: string) => {
    try {
      const [{ data: contest }, { data: snapshot }] = await Promise.all([
        api.get<Contest>(`/contests/${contestId}`),
        api.get(`/contests/${contestId}/snapshot`),
      ]);

      setContestToLoad({ contest, snapshot });
      onContestLoaded?.();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ?? tContests('failedToLoadContest'),
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      containerClassName="!w-[min(100%,800px)]"
      contentClassName="text-white sm:h-[75vh] h-[70vh] max-h-[70vh] narrow-scrollbar !py-4"
      overlayClassName="!z-[1003]"
      withBlur
      bottomContent={<ModalBottomCloseButton onClose={onClose} />}
    >
      <div className="flex flex-col gap-4 px-1">
        <div className="flex items-center gap-3">
          <img
            src={entryLogo}
            alt=""
            className={`flex-none rounded-sm ${
              entryIsExisting ? 'w-10 h-10' : 'w-10 h-8 object-cover'
            }`}
            onError={(e) => {
              e.currentTarget.src = getFlagPath('ww');
            }}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">
              {entryCountry?.name ?? entryCode ?? '—'}
            </h2>
          </div>
        </div>

        {isLoading && (
          <div className="flex justify-center py-8">
            <span className="loader" />
          </div>
        )}

        {isError && (
          <p className="text-red-300 text-sm">
            {(error as any)?.response?.data?.message ?? t('failedToLoadStats')}
          </p>
        )}

        {data && !isLoading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <Stat
                label={t('participations')}
                value={data.summary.participations}
              />
              <Stat label={t('victories')} value={data.summary.victories} />
              <Stat label={t('finals')} value={data.summary.finals} />
              <Stat label={t('nulPoints')} value={data.summary.nulPoints} />
              <Stat label={t('lastPlaces')} value={data.summary.lastPlaces} />
              <Stat
                label={t('bestResult')}
                value={
                  data.summary.bestResult
                    ? `#${data.summary.bestResult.rank} (${data.summary.bestResult.year})`
                    : '—'
                }
              />
            </div>

            {data.participations.length === 0 && (
              <p className="text-white/60 text-sm">{t('noParticipations')}</p>
            )}

            {data.participations.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-white/70 border-b border-primary-800">
                      <th className="py-2 pr-2 font-medium">{t('contest')}</th>
                      <th className="py-2 pr-2 font-medium">{t('year')}</th>
                      <th className="py-2 pr-2 font-medium">{t('winner')}</th>
                      <th className="py-2 pr-2 font-medium">{t('gfResult')}</th>
                      <th className="py-2 pr-0 font-medium w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.participations.map((row) => {
                      const winner = resolveCountry(row.winnerCode);
                      const wLogo = winner
                        ? getHostingCountryLogo(winner, shouldShowHeartFlagIcon)
                            .logo
                        : getFlagPath('ww');

                      return (
                        <tr
                          key={row.contestId}
                          className="border-b border-primary-800/60 align-middle"
                        >
                          <td className="py-2 pr-2 max-w-[140px] sm:max-w-[220px]">
                            <span
                              className="truncate block font-semibold text-base"
                              title={row.contestName}
                            >
                              {row.contestName}
                            </span>
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">
                            {row.year ?? '—'}
                          </td>
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <img
                                src={wLogo}
                                alt=""
                                className="w-6 h-4 object-cover overflow-visible rounded-sm flex-none"
                                onError={(e) => {
                                  e.currentTarget.src = getFlagPath('ww');
                                }}
                              />
                              <span className="truncate">
                                {winner?.name ?? row.winnerCode ?? '—'}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">
                            {row.status === 'NQ'
                              ? t('nonQualified')
                              : `#${row.gfRank} (${row.gfPoints ?? 0} ${t(
                                  'points',
                                )})`}
                          </td>
                          <td className="py-2 pr-0">
                            <Button
                              variant="tertiary"
                              className="!py-2 !px-2 !text-xs"
                              Icon={<TrophyIcon className="size-4" />}
                              onClick={() => handleLoadContest(row.contestId)}
                            >
                              {t('load')}
                            </Button>
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

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-primary-900 bg-gradient-to-bl from-[10%] from-primary-800 to-primary-800/60 rounded-lg px-3 py-2 border border-primary-800">
    <div className="text-white/60 text-sm mb-0.5">{label}</div>
    <div className="text-white text-lg font-semibold tabular-nums">{value}</div>
  </div>
);

export default CountryStatsModal;
