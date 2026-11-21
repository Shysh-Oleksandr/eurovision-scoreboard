'use client';

import { useTranslations } from 'next-intl';
import React, { useEffect, useMemo, useState } from 'react';

import WidgetResourceGroupBadges from '../WidgetResourceGroupBadges';

import EntryResultsChart from './EntryResultsChart';

import { api } from '@/api/client';
import {
  useContestGroupsQuery,
  useMyEntryStatsQuery,
  useUserEntryStatsQuery,
} from '@/api/contests';
import { TrophyIcon } from '@/assets/icons/TrophyIcon';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import ModalBottomCloseButton from '@/components/common/Modal/ModalBottomCloseButton';
import Tabs from '@/components/common/tabs/Tabs';
import { OfflineNotice } from '@/components/offline/OfflineNotice';
import {
  computeEntryStreaks,
  sortContestsNewestFirst,
} from '@/helpers/entryStats';
import { getFlagPath } from '@/helpers/getFlagPath';
import { toast } from '@/helpers/toast';
import { useIsOffline } from '@/state/connectivityStore';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { getHostingCountryLogo } from '@/theme/hosting';
import type { Contest } from '@/types/contest';
import type {
  EntryStatsHostedContest,
  EntryStatsResult,
} from '@/types/entryStats';

type ContestListTab = 'all' | 'hosted';

interface CountryStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a contest is loaded from this modal; use to close the picker too. */
  onContestLoaded?: () => void;
  entryCode: string | null;
  initialGroupId?: string | null;
  /** When set, shows public completed contests for that user instead of the current user's. */
  userId?: string;
  /** Override the overlay z-index when opened above a higher-stacked modal. */
  overlayClassName?: string;
}

const CountryStatsModal: React.FC<CountryStatsModalProps> = ({
  isOpen,
  onClose,
  onContestLoaded,
  entryCode,
  initialGroupId = null,
  userId,
  overlayClassName = '!z-[1003]',
}) => {
  const isUserScope = !!userId;
  const t = useTranslations('widgets.contests.entryStats');
  const tContests = useTranslations('widgets.contests');
  const tGroups = useTranslations('widgets.contests.groups');
  const tLb = useTranslations('widgets.contests.leaderboard');

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    isUserScope ? null : initialGroupId,
  );
  const [listTab, setListTab] = useState<ContestListTab>('all');

  const setContestToLoad = useGeneralStore((s) => s.setContestToLoad);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (s) => s.settings.shouldShowHeartFlagIcon,
  );
  const shouldUse2026WhiteHeartFlags = useGeneralStore(
    (s) => s.settings.shouldUse2026WhiteHeartFlags,
  );
  const getAllCountries = useCountriesStore((s) => s.getAllCountries);

  const { data: contestGroups = [] } = useContestGroupsQuery(
    isOpen && !isUserScope,
  );
  const myEntryStatsQuery = useMyEntryStatsQuery(entryCode, {
    enabled: isOpen && !!entryCode && !isUserScope,
    groupId: selectedGroupId,
  });
  const userEntryStatsQuery = useUserEntryStatsQuery(
    userId ?? null,
    entryCode,
    {
      enabled: isOpen && !!entryCode && isUserScope,
    },
  );
  const { data, isLoading, isError, error } = isUserScope
    ? userEntryStatsQuery
    : myEntryStatsQuery;
  const offline = useIsOffline();

  useEffect(() => {
    if (!isOpen) return;
    setSelectedGroupId(isUserScope ? null : initialGroupId);
    setListTab('all');
  }, [isOpen, entryCode, initialGroupId, isUserScope]);

  useEffect(() => {
    if (
      selectedGroupId &&
      !contestGroups.some((g) => g._id === selectedGroupId)
    ) {
      setSelectedGroupId(null);
    }
  }, [contestGroups, selectedGroupId]);

  const customEntryFallback = t('customEntryName');

  const customEntriesMap = useMemo(() => {
    const map = new Map<string, { name: string; flag: string }>();

    for (const ce of data?.customEntriesUsed ?? []) {
      map.set(ce.code, { name: ce.name, flag: ce.flag });
    }

    return map;
  }, [data?.customEntriesUsed]);

  const resolveEntry = (code: string | null | undefined) => {
    if (!code) return { name: '—', logo: getFlagPath('ww'), isExisting: false };

    const localCountry = getAllCountries(true).find((c) => c.code === code);

    if (localCountry) {
      return {
        name: localCountry.name,
        ...getHostingCountryLogo(
          localCountry,
          shouldShowHeartFlagIcon,
          shouldUse2026WhiteHeartFlags,
        ),
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

  const {
    name: entryName,
    logo: entryLogo,
    isExisting: entryIsExisting,
  } = resolveEntry(entryCode);

  const sortedParticipations = useMemo(
    () => sortContestsNewestFirst(data?.participations ?? []),
    [data?.participations],
  );

  // Older backends don't send hosted contests yet.
  const sortedHosted = useMemo(
    () => sortContestsNewestFirst(data?.hostedContests ?? []),
    [data?.hostedContests],
  );

  const streaks = useMemo(
    () => computeEntryStreaks(sortedParticipations, entryCode ?? ''),
    [sortedParticipations, entryCode],
  );

  const chronologicalParticipations = useMemo(
    () => [...sortedParticipations].reverse(),
    [sortedParticipations],
  );

  const activeListTab: ContestListTab =
    sortedHosted.length > 0 ? listTab : 'all';
  const listedContests: EntryStatsHostedContest[] =
    activeListTab === 'hosted' ? sortedHosted : sortedParticipations;
  const homeWins = sortedHosted.filter(
    (c) => !!entryCode && c.winnerCode === entryCode,
  ).length;

  const formatResult = (result: EntryStatsResult | null | undefined) => {
    if (!result) return '—';

    return result.year !== undefined
      ? `#${result.rank} (${result.year})`
      : `#${result.rank}`;
  };

  const inARow = (count: number) =>
    count >= 2 ? t('mostInARow', { count }) : undefined;

  const formatAverage = (value: number | null | undefined) =>
    typeof value === 'number' ? value.toFixed(1) : '—';

  const semiCell = (row: EntryStatsHostedContest) => {
    if (row.semi) {
      return (
        <span className="flex items-baseline gap-1.5 min-w-0">
          <span className="flex-none">#{row.semi.rank}</span>
          <span className="truncate text-white/55" title={row.semi.stageName}>
            {row.semi.stageName}
          </span>
        </span>
      );
    }

    return row.preQualified ? t('preQualified') : '—';
  };

  const resultLabel = (row: EntryStatsHostedContest) => {
    if (row.status === 'NOT_COMPETING') return t('notCompeting');
    if (row.status === 'NQ') return t('nonQualified');

    return `#${row.gfRank} (${row.gfPoints ?? 0} ${t('points')})`;
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
      fullScreenOnPhone
      contentClassName="text-white sm:h-[75vh] h-[70vh] max-h-[70vh] narrow-scrollbar !py-4"
      overlayClassName={overlayClassName}
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
              {entryName}
            </h2>
          </div>
        </div>

        {!isUserScope && contestGroups.length > 0 && (
          <WidgetResourceGroupBadges
            groups={contestGroups}
            selectedGroupId={selectedGroupId}
            onSelectAll={() => setSelectedGroupId(null)}
            onSelectGroup={setSelectedGroupId}
            allLabel={tGroups('all')}
            readOnly
          />
        )}

        {offline && !data && <OfflineNotice className="py-8" />}

        {isLoading && !offline && (
          <div className="flex justify-center py-8">
            <span className="loader" />
          </div>
        )}

        {isError && !offline && (
          <p className="text-red-300 text-sm">
            {(error as any)?.response?.data?.message ?? t('failedToLoadStats')}
          </p>
        )}

        {data && !isLoading && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
              <Stat
                label={t('participations')}
                value={data.summary.participations}
              />
              <Stat
                label={t('finals')}
                value={data.summary.finals}
                detail={
                  data.summary.preQualified > 0
                    ? t('preQualifiedCount', {
                        count: data.summary.preQualified,
                      })
                    : undefined
                }
              />
              <Stat
                label={t('qualRate')}
                value={
                  data.summary.semiFinals > 0
                    ? `${(
                        (data.summary.qualifiedFromSemis /
                          data.summary.semiFinals) *
                        100
                      ).toFixed(1)}%`
                    : '—'
                }
                detail={
                  data.summary.semiFinals > 0
                    ? t('semisQualified', {
                        qualified: data.summary.qualifiedFromSemis,
                        total: data.summary.semiFinals,
                      })
                    : undefined
                }
              />
              <Stat
                label={t('qualStreak')}
                value={streaks.currentQualifying}
                detail={
                  streaks.longestQualifying > streaks.currentQualifying
                    ? inARow(streaks.longestQualifying)
                    : undefined
                }
              />
              <Stat
                label={t('victories')}
                value={data.summary.victories}
                detail={inARow(streaks.longestWins)}
              />
              <Stat
                label={tLb('top10')}
                value={data.summary.top10}
                detail={inARow(streaks.longestTop10)}
              />
              <Stat
                label={t('bestResult')}
                value={formatResult(data.summary.bestResult)}
              />
              <Stat
                label={t('averagePlace')}
                value={formatAverage(data.summary.averageRank)}
              />
              <Stat
                label={t('worstResult')}
                value={formatResult(data.summary.worstResult)}
              />
              <Stat label={t('lastPlaces')} value={data.summary.lastPlaces} />
              <Stat label={t('nulPoints')} value={data.summary.nulPoints} />
              <Stat
                label={t('mostNqsInARow')}
                value={streaks.longestNonQualifying}
              />
              {typeof data.summary.averageJuryRank === 'number' && (
                <>
                  <Stat label={t('juryWins')} value={data.summary.juryWins} />
                  <Stat
                    label={t('televoteWins')}
                    value={data.summary.televoteWins}
                  />
                  <Stat
                    label={t('averageJuryPlace')}
                    value={formatAverage(data.summary.averageJuryRank)}
                  />
                  <Stat
                    label={t('averageTelevotePlace')}
                    value={formatAverage(data.summary.averageTelevoteRank)}
                  />
                </>
              )}
            </div>

            {entryCode &&
              chronologicalParticipations.length >= 2 &&
              data.summary.finals > 0 && (
                <section className="rounded-[10px] bg-primary-800 border border-white/10 px-3 pt-2.5 pb-1.5">
                  <h3 className="text-[15px] font-bold text-white mb-1">
                    {t('resultsOverTime')}
                  </h3>
                  <EntryResultsChart
                    rows={chronologicalParticipations}
                    entryCode={entryCode}
                  />
                </section>
              )}

            {sortedHosted.length > 0 && (
              <div className="flex flex-col gap-2">
                <Tabs
                  tabs={[
                    {
                      value: 'all',
                      label: (
                        <TabLabel
                          text={t('allContestsTab')}
                          count={sortedParticipations.length}
                        />
                      ),
                    },
                    {
                      value: 'hosted',
                      label: (
                        <TabLabel
                          text={t('hostedTab')}
                          count={sortedHosted.length}
                        />
                      ),
                    },
                  ]}
                  activeTab={activeListTab}
                  setActiveTab={(tab) => setListTab(tab as ContestListTab)}
                  containerClassName="!w-auto self-start !p-[3px]"
                  overlayClassName="!inset-y-[2px]"
                  buttonClassName="!py-[7px] !px-[14px] !text-[13px]"
                />
                {activeListTab === 'hosted' && (
                  <p className="text-white/70 text-[13px] font-semibold">
                    {t('homeWins', { count: homeWins })}
                  </p>
                )}
              </div>
            )}

            {listedContests.length === 0 && (
              <p className="text-white/60 text-sm">{t('noParticipations')}</p>
            )}

            {listedContests.length > 0 && (
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-white/70 border-b border-primary-800">
                      <th className="py-2 pr-2 font-medium">{t('contest')}</th>
                      <th className="py-2 pr-2 font-medium">{t('year')}</th>
                      <th className="py-2 pr-2 font-medium">{t('winner')}</th>
                      <th className="py-2 pr-2 font-medium">
                        {t('semiFinal')}
                      </th>
                      <th className="py-2 pr-2 font-medium">{t('gfResult')}</th>
                      <th className="py-2 pr-0 font-medium w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {listedContests.map((row) => {
                      const { name: winnerName, logo: wLogo } = resolveEntry(
                        row.winnerCode,
                      );

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
                              <span className="truncate">{winnerName}</span>
                            </div>
                          </td>
                          <td className="py-2 pr-2 max-w-[160px] whitespace-nowrap">
                            {semiCell(row)}
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">
                            {resultLabel(row)}
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

const Stat = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) => (
  <div className="bg-primary-800 rounded-[10px] px-3 py-2 border border-white/10">
    <div className="text-white/60 text-sm mb-0.5">{label}</div>
    <div className="text-white text-lg font-semibold tabular-nums">{value}</div>
    {detail && (
      <div className="text-white/55 text-[12px] font-semibold">{detail}</div>
    )}
  </div>
);

const TabLabel = ({ text, count }: { text: string; count: number }) => (
  <>
    {text} <span className="opacity-60 tabular-nums">{count}</span>
  </>
);

export default CountryStatsModal;
