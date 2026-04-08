'use client';

import { Grid3x2, Share, Sheet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useState } from 'react';

import dynamic from 'next/dynamic';

import { useVotingPredefinition } from './useVotingPredefinition';
import { useVotingPresetsFlow } from './useVotingPresetsFlow';
import { VotingPredefinitionHeader } from './VotingPredefinitionHeader';
import { VotingPredefinitionPresetModals } from './VotingPredefinitionPresetModals';
import { VotingPredefinitionTable } from './VotingPredefinitionTable';
import { VotingPresetToolbar } from './VotingPresetToolbar';
import VotingTotalsShareTable from './VotingTotalsShareTable';

import { ArrowDown10 } from '@/assets/icons/ArrowDown10';
import { RestartIcon } from '@/assets/icons/RestartIcon';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import Tabs, { TabContent } from '@/components/common/tabs/Tabs';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { EventStage, StatsTableType } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import {
  buildCountriesOverrideForPodium,
  buildGetPoints,
  buildRankedCountriesForManualTotals,
} from '@/state/scoreboard/manualShareTotalsHelpers';
import type { ManualShareTotalsRow } from '@/state/scoreboard/types';

const ShareResultsModal = dynamic(
  () => import('@/components/simulation/share/ShareResultsModal'),
  { ssr: false },
);
const ShareStatsModal = dynamic(
  () => import('@/components/simulation/share/ShareStatsModal'),
  { ssr: false },
);

type VotingPredefinitionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  stage: EventStage;
  onSave: (votes: Partial<any>) => void;
  onLoaded?: () => void;
};

type CellKey = `${string}:${string}`; // participant:voter

enum PredefinitionTab {
  DETAILED = 'Detailed',
  TOTALS = 'Totals',
}

const VotingPredefinitionModal = ({
  isOpen,
  onClose,
  stage,
  onSave,
  onLoaded,
}: VotingPredefinitionModalProps) => {
  const [activeTab, setActiveTab] = useState(PredefinitionTab.DETAILED);
  const [shareResultsOpen, setShareResultsOpen] = useState(false);
  const [shareStatsOpen, setShareStatsOpen] = useState<StatsTableType | null>(
    null,
  );
  const [localTotals, setLocalTotals] = useState<
    Record<string, ManualShareTotalsRow>
  >({});
  const [isTotalsSortByName, setIsTotalsSortByName] = useState(false);

  const contestName = useGeneralStore((s) => s.settings.contestName);
  const contestYear = useGeneralStore((s) => s.settings.contestYear);

  const {
    pointsSystem,
    selectedType,
    setSelectedType,
    votes,
    setVotes,
    isSorting,
    setIsSorting,
    totalBadgeLabel,
    isTotalOrCombinedVoteType,
    votingCountries,
    voteTypeOptions,
    rankedCountries,
    randomizeAll,
    resetVotes,
    applyInputValue,
    getVoterValidity,
    getTotalPointsForCountry,
    getCellValue,
    validateAllBeforeSave,
  } = useVotingPredefinition({ stage });

  const t = useTranslations();
  const tSetup = useTranslations('setup.votingPredefinition');

  // local-only state for matrix cell editing (must be before useVotingPresetsFlow)
  const [editing, setEditing] = React.useState<Record<CellKey, string>>({});

  const clearDetailedCellEditing = useCallback(() => {
    setEditing({});
  }, []);

  const {
    openSavePresetCreate,
    openLoadPresetModal,
    savePresetModalProps,
    loadPresetModalProps,
  } = useVotingPresetsFlow({
    stage,
    contestName,
    contestYear,
    votingCountries,
    pointsSystem,
    votes,
    setVotes,
    localTotals,
    setLocalTotals,
    clearDetailedCellEditing,
  });

  const shouldShowHeartFlagIcon =
    (window as any)?.store?.general?.settings?.shouldShowHeartFlagIcon ?? false;

  const handleTotalsCellChange = useCallback(
    (
      countryCode: string,
      field: 'jury' | 'televote' | 'combined',
      value: number,
    ) => {
      setLocalTotals((prev) => ({
        ...prev,
        [countryCode]: {
          ...(prev[countryCode] || {}),
          [field]: value,
        },
      }));
    },
    [],
  );

  const totalsRankedCountries = useMemo(
    () => buildRankedCountriesForManualTotals(stage, localTotals),
    [stage, localTotals],
  );
  const totalsGetPoints = useMemo(
    () => buildGetPoints(stage.votingMode, localTotals),
    [stage.votingMode, localTotals],
  );
  const countriesOverrideForPodium = useMemo(
    () => buildCountriesOverrideForPodium(stage, localTotals),
    [stage, localTotals],
  );

  const shareTitleOverride = `${contestName} ${contestYear}`;
  const shareSubtitleOverride = stage.name;

  const getCellClassName = useCallback(
    (points: number) => {
      if (
        (!isTotalOrCombinedVoteType && points === 12) ||
        (isTotalOrCombinedVoteType && points >= 20)
      ) {
        return 'font-bold bg-primary-700/50';
      }

      if (
        (!isTotalOrCombinedVoteType && points === 10) ||
        (isTotalOrCombinedVoteType && points >= 17)
      ) {
        return 'font-semibold bg-primary-800/60';
      }

      if (
        (!isTotalOrCombinedVoteType && points === 8) ||
        (isTotalOrCombinedVoteType && points >= 15)
      ) {
        return 'font-semibold bg-primary-800/30';
      }

      return 'font-medium';
    },
    [isTotalOrCombinedVoteType],
  );

  const handleSave = () => {
    const { ok, errors } = validateAllBeforeSave();

    if (!ok) {
      const list = errors
        .slice(0, 5)
        .map((e) => `- ${e.label}: ${e.reasons.join('; ')}`)
        .join('\n');

      alert(
        `Please complete valid assignments for all voters before saving.\n\nIssues:\n${list}\n${
          errors.length > 5 ? '...' : ''
        }`,
      );

      return;
    }
    if (!votes) return;
    onClose();

    setTimeout(() => {
      onSave(votes);
    }, 300);
  };

  useEffectOnce(onLoaded);

  const tabs = useMemo(
    () => [
      { value: PredefinitionTab.DETAILED, label: tSetup('tabDetailed') },
      { value: PredefinitionTab.TOTALS, label: tSetup('tabTotals') },
    ],
    [tSetup],
  );

  const tabsWithContent = useMemo(
    () => [
      {
        value: PredefinitionTab.DETAILED,
        label: tSetup('tabDetailed'),
        content: (
          <>
            <VotingPredefinitionHeader
              stageName={stage.name}
              totalBadgeLabel={totalBadgeLabel}
              pointsSystem={pointsSystem as any}
              selectedType={selectedType}
              setSelectedType={setSelectedType}
              voteTypeOptions={voteTypeOptions}
              isSorting={isSorting}
              setIsSorting={(v) => setIsSorting(v)}
              onReset={() => {
                resetVotes();
                setEditing({});
              }}
              onRandomize={randomizeAll}
              onSavePreset={() => openSavePresetCreate('detailed')}
              onLoadPreset={() => openLoadPresetModal('detailed')}
            />

            <VotingPredefinitionTable
              rankedCountries={rankedCountries as any}
              votingCountries={votingCountries as any}
              shouldShowHeartFlagIcon={shouldShowHeartFlagIcon}
              isTotalOrCombinedVoteType={isTotalOrCombinedVoteType}
              getVoterValidity={getVoterValidity as any}
              getTotalPointsForCountry={getTotalPointsForCountry}
              getCellClassName={getCellClassName}
              getCellValue={getCellValue}
              isSameCountry={(participant, voter) => participant === voter}
              isTotalOrCombinedDisabled={(participant, voter) =>
                isTotalOrCombinedVoteType || participant === voter
              }
              valueForCell={(participant, voter) => {
                const key: CellKey = `${participant}:${voter}`;
                const displayValue = toFixedIfDecimalFloat(
                  getCellValue(participant, voter),
                );

                return (editing[key] ?? String(displayValue || '')) as string;
              }}
              onChangeCell={(participant, voter, val) => {
                const key: CellKey = `${participant}:${voter}`;

                setEditing((s) => ({ ...s, [key]: val }));
              }}
              onBlurCell={(participant, voter, val) => {
                const key: CellKey = `${participant}:${voter}`;
                const parsed = Number(val);
                const ok =
                  Number.isFinite(parsed) &&
                  (applyInputValue(participant, voter, val), true);

                setEditing((s) => {
                  const next = { ...s } as Record<CellKey, string>;

                  delete next[key];

                  return next;
                });

                if (!ok) {
                  // noop
                }
              }}
            />
          </>
        ),
      },
      {
        value: PredefinitionTab.TOTALS,
        label: tSetup('tabTotals'),
        content: (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="px-2 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2 items-center border-b w-full sm:w-auto sm:border-none border-solid border-primary-800 pb-2 sm:pb-0">
                  <h4 className="sm:text-lg text-base font-medium mr-1">
                    {t('simulation.header.share')}
                  </h4>
                  <Button
                    variant="tertiary"
                    className="gap-2 sm:!px-4 !px-2.5"
                    Icon={<Share className="w-5 h-5" />}
                    onClick={() => setShareResultsOpen(true)}
                  >
                    {tSetup('shareScoreboardResults')}
                  </Button>
                  <Button
                    variant="tertiary"
                    className="gap-2 sm:!px-4 !px-2.5"
                    Icon={<Grid3x2 className="w-5 h-5" />}
                    onClick={() => setShareStatsOpen(StatsTableType.SPLIT)}
                  >
                    {tSetup('shareSplit')}
                  </Button>
                  <Button
                    variant="tertiary"
                    className="gap-2 sm:!px-4 !px-2.5"
                    Icon={<Sheet className="w-5 h-5" />}
                    onClick={() => setShareStatsOpen(StatsTableType.SUMMARY)}
                  >
                    {tSetup('shareSummary')}
                  </Button>
                </div>
                <div className="flex gap-2 items-start flex-wrap">
                  <VotingPresetToolbar
                    wrapperClassName="flex flex-wrap gap-2 md:hidden"
                    onSavePreset={() => openSavePresetCreate('totals')}
                    onLoadPreset={() => openLoadPresetModal('totals')}
                  />
                  <Button
                    onClick={() => setIsTotalsSortByName(!isTotalsSortByName)}
                    className="!p-3"
                    aria-label={
                      isTotalsSortByName ? 'Sort by points' : 'Sort by name'
                    }
                    title={
                      isTotalsSortByName ? 'Sort by points' : 'Sort by name'
                    }
                    Icon={
                      isTotalsSortByName ? (
                        <SortAZIcon className="w-5 h-5" />
                      ) : (
                        <ArrowDown10 className="w-5 h-5" />
                      )
                    }
                  />
                  <Button
                    variant="primary"
                    onClick={() => setLocalTotals({})}
                    className="!p-3"
                    aria-label="Reset"
                    title="Reset"
                    Icon={<RestartIcon className="w-5 h-5" />}
                  />
                </div>
              </div>
              <VotingPresetToolbar
                wrapperClassName="md:flex flex-wrap gap-2 hidden"
                onSavePreset={() => openSavePresetCreate('totals')}
                onLoadPreset={() => openLoadPresetModal('totals')}
              />
            </div>
            <VotingTotalsShareTable
              stage={stage}
              manualRowByCode={localTotals}
              onCellChange={handleTotalsCellChange}
              sortByName={isTotalsSortByName}
            />
          </div>
        ),
      },
    ],
    [
      tSetup,
      stage,
      totalBadgeLabel,
      pointsSystem,
      selectedType,
      setSelectedType,
      voteTypeOptions,
      isSorting,
      randomizeAll,
      rankedCountries,
      votingCountries,
      shouldShowHeartFlagIcon,
      isTotalOrCombinedVoteType,
      getVoterValidity,
      getTotalPointsForCountry,
      getCellClassName,
      getCellValue,
      t,
      isTotalsSortByName,
      localTotals,
      handleTotalsCellChange,
      setIsSorting,
      resetVotes,
      openSavePresetCreate,
      openLoadPresetModal,
      editing,
      applyInputValue,
    ],
  );

  const isTotalsTab = activeTab === PredefinitionTab.TOTALS;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        overlayClassName="!z-[1000]"
        contentClassName="h-[75vh] !px-2 text-white flex flex-col"
        topContent={
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            setActiveTab={(v) => setActiveTab(v as PredefinitionTab)}
            containerClassName="!rounded-none"
          />
        }
        bottomContent={
          <div className="flex flex-col gap-2 bg-primary-900 md:p-4 xs:p-3 p-2 z-30">
            {isTotalsTab && (
              <p className="text-sm text-white/70">{tSetup('totalsHint')}</p>
            )}
            <div className="flex justify-end xs:gap-4 gap-2">
              <Button
                variant="secondary"
                className="md:text-base text-sm"
                onClick={onClose}
              >
                {t('common.close')}
              </Button>
              <Button
                className="w-full !text-base"
                onClick={handleSave}
                disabled={isTotalsTab}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        }
      >
        <TabContent
          tabs={tabsWithContent}
          activeTab={activeTab}
          preserveContent
        />

        {(shareResultsOpen || shareStatsOpen) && (
          <>
            <ShareResultsModal
              isOpen={shareResultsOpen}
              onClose={() => setShareResultsOpen(false)}
              onLoaded={() => {}}
              countriesOverride={countriesOverrideForPodium}
              titleOverride={shareTitleOverride}
              subtitleOverride={shareSubtitleOverride}
            />
            {shareStatsOpen && (
              <ShareStatsModal
                isOpen={!!shareStatsOpen}
                onClose={() => setShareStatsOpen(null)}
                onLoaded={() => {}}
                activeTab={shareStatsOpen}
                rankedCountries={totalsRankedCountries}
                selectedStageId={stage.id}
                selectedVoteType="Total"
                getCellPoints={() => ''}
                getCellClassName={() => ''}
                getPoints={totalsGetPoints}
                selectedStage={stage}
                aggregateOnly
              />
            )}
          </>
        )}
      </Modal>

      <VotingPredefinitionPresetModals
        saveProps={savePresetModalProps}
        loadProps={loadPresetModalProps}
      />
    </>
  );
};

export default VotingPredefinitionModal;
