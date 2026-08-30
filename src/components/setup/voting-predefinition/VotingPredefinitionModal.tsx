'use client';

import {
  AlertTriangle,
  Check,
  Columns2,
  Dices,
  Download,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  List,
  MoreHorizontal,
  RotateCcw,
  Save,
  Share2,
  Shuffle,
  Sparkles,
  Table,
  Trophy,
  Upload,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import dynamic from 'next/dynamic';

import { TotalsPredefinitionView } from './TotalsPredefinitionView';
import { useVotingPredefinition } from './useVotingPredefinition';
import type { VoteSpreadsheetActionResult } from './useVotingPredefinition';
import { useVotingPresetsFlow } from './useVotingPresetsFlow';
import { VoteSpreadsheetFormatTooltipContent } from './VoteSpreadsheetButtons';
import {
  VotingBarButton,
  VotingBarIconButton,
  VotingSegmentedControl,
} from './VotingBarControls';
import {
  VotingBarMenu,
  VotingMenuLabel,
  VotingMenuRow,
  VotingMenuSeparator,
} from './VotingBarMenu';
import { VotingCallout } from './VotingCallout';
import {
  VotingPredefinitionHeader,
  type PredefinitionMode,
} from './VotingPredefinitionHeader';
import { VotingPredefinitionPresetModals } from './VotingPredefinitionPresetModals';
import { VotingPredefinitionTable } from './VotingPredefinitionTable';
import { VotingRankView } from './VotingRankView';

import { ArrowDown10 } from '@/assets/icons/ArrowDown10';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import Modal from '@/components/common/Modal/Modal';
import { Tooltip } from '@/components/common/Tooltip';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useConfirmModalClose } from '@/hooks/useConfirmModalClose';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { EventStage, StageVotingType, StatsTableType } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import {
  buildCountriesOverrideForPodium,
  buildGetPoints,
  buildRankedCountriesForManualTotals,
} from '@/state/scoreboard/manualShareTotalsHelpers';
import type { ManualShareTotalsRow } from '@/state/scoreboard/types';
import {
  buildCountriesOverrideForPodiumFromVotes,
  buildGetCellPointsFromVotes,
  buildGetPointsFromVotes,
  buildRankedCountriesFromVotes,
} from '@/state/scoreboard/votesShareHelpers';

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

/** How many offending voters the "can't save yet" callout names before eliding. */
const MAX_LISTED_INVALID_VOTERS = 6;

const VotingPredefinitionModal = ({
  isOpen,
  onClose,
  stage,
  onSave,
  onLoaded,
}: VotingPredefinitionModalProps) => {
  const [activeMode, setActiveMode] = useState<PredefinitionMode>('detailed');
  const [shareResultsOpen, setShareResultsOpen] = useState(false);
  const [shareStatsOpen, setShareStatsOpen] = useState<StatsTableType | null>(
    null,
  );
  const [localTotals, setLocalTotals] = useState<
    Record<string, ManualShareTotalsRow>
  >({});
  const [isTotalsSortByName, setIsTotalsSortByName] = useState(false);
  const [showTotalsHelp, setShowTotalsHelp] = useState(true);

  const contestName = useGeneralStore((s) => s.settings.contestName);
  const contestYear = useGeneralStore((s) => s.settings.contestYear);
  const rankLayout = useGeneralStore((s) => s.settings.votingRankLayout);
  const setSettings = useGeneralStore((s) => s.setSettings);
  const shouldShowHeartFlagIcon = useGeneralStore(
    (s) => s.settings.shouldShowHeartFlagIcon,
  );

  const {
    displayPointsSystem,
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
    rankTarget,
    rankOrder,
    showRankPoints,
    getRankTotals,
    enterRankMode,
    reorderRank,
    randomizeRankPoints,
    randomizeRankOrder,
    totalsStatus,
    totalsAdjustments,
    getTotalsChannelBudgets,
    generateFromTotals,
    markTotalsStale,
    resetTotalsGeneration,
    getTotalsFromVotes,
    markTotalsSynced,
    pointsSystem,
    importVotesFromSpreadsheet,
    exportVotesToSpreadsheet,
  } = useVotingPredefinition({ stage });

  const t = useTranslations();
  const tSetup = useTranslations('setup.votingPredefinition');
  const tSpreadsheet = useTranslations('setup.votingPredefinition.spreadsheet');
  const { confirm } = useConfirmation();

  const { onClickOutside } = useConfirmModalClose({
    onClose,
    confirmKey: 'close-voting-predefinition',
    title: tSetup('confirmCloseTitle'),
    description: tSetup('confirmCloseDescription'),
  });

  // local-only state for matrix cell editing (must be before useVotingPresetsFlow)
  const [editing, setEditing] = React.useState<Record<CellKey, string>>({});

  const clearDetailedCellEditing = useCallback(() => {
    setEditing({});
  }, []);

  const showSpreadsheetResultToast = useCallback(
    (result: VoteSpreadsheetActionResult) => {
      if (result.ok) {
        if (result.appliedCells > 0) {
          if (result.invalidVoters.length > 0) {
            toast.warning(
              tSpreadsheet('successWithInvalidVoters', {
                count: result.appliedCells,
                voters: result.invalidVoters.slice(0, 5).join(', '),
              }),
            );
          } else {
            toast.success(
              tSpreadsheet('importSuccess', { count: result.appliedCells }),
            );
          }
        } else {
          toast.success(tSpreadsheet('exportSuccess'));
        }

        if (result.unmatched.length > 0) {
          toast.warning(
            tSpreadsheet('unmatchedCountries', {
              countries: result.unmatched.slice(0, 5).join(', '),
            }),
          );
        }

        if (result.skippedSections.length > 0) {
          toast.info(
            tSpreadsheet('sectionSkipped', {
              sections: result.skippedSections.join(', '),
            }),
          );
        }

        return;
      }

      switch (result.reason) {
        case 'empty-file':
          toast.error(tSpreadsheet('emptyFile'));
          break;
        case 'no-sections':
          toast.error(tSpreadsheet('noSections'));
          break;
        case 'no-assignments':
          toast.error(tSpreadsheet('noAssignments'));
          break;
        case 'multiple-points-blocked':
          toast.error(tSpreadsheet('multiplePointsBlocked'));
          break;
        case 'export-unavailable':
          toast.error(tSpreadsheet('exportUnavailable'));
          break;
        default:
          break;
      }

      if (result.unmatched?.length) {
        toast.warning(
          tSpreadsheet('unmatchedCountries', {
            countries: result.unmatched.slice(0, 5).join(', '),
          }),
        );
      }
    },
    [tSpreadsheet],
  );

  const handleImportSpreadsheet = useCallback(
    async (file: File) => {
      const result = await importVotesFromSpreadsheet(file);

      clearDetailedCellEditing();
      showSpreadsheetResultToast(result);
    },
    [
      clearDetailedCellEditing,
      importVotesFromSpreadsheet,
      showSpreadsheetResultToast,
    ],
  );

  const handleExportSpreadsheet = useCallback(async () => {
    const safeName = `${contestName}-${stage.name}-votes`
      .replace(/[^\w.-]+/g, '-')
      .replace(/-+/g, '-');
    const result = await exportVotesToSpreadsheet(safeName);

    showSpreadsheetResultToast(result);
  }, [
    contestName,
    exportVotesToSpreadsheet,
    showSpreadsheetResultToast,
    stage.name,
  ]);

  // The overflow menu drives spreadsheet import, so the file input lives here
  // rather than inside a visible button.
  const importInputRef = useRef<HTMLInputElement>(null);

  const [isSpreadsheetDragOver, setIsSpreadsheetDragOver] = useState(false);

  const isSpreadsheetFile = useCallback((file: File) => {
    const name = file.name.toLowerCase();

    return (
      name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')
    );
  }, []);

  const handleSpreadsheetDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (activeMode !== 'detailed') return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      setIsSpreadsheetDragOver(true);
    },
    [activeMode],
  );

  const handleSpreadsheetDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
      setIsSpreadsheetDragOver(false);
    },
    [],
  );

  const handleSpreadsheetDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsSpreadsheetDragOver(false);

      if (activeMode !== 'detailed') return;

      const file = event.dataTransfer.files?.[0];

      if (!file || !isSpreadsheetFile(file)) {
        toast.error(tSpreadsheet('invalidDropFile'));

        return;
      }

      void handleImportSpreadsheet(file);
    },
    [activeMode, handleImportSpreadsheet, isSpreadsheetFile, tSpreadsheet],
  );

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

  const handleTotalsCellChange = useCallback(
    (
      countryCode: string,
      field: 'jury' | 'televote' | 'combined',
      value: number | undefined,
    ) => {
      setLocalTotals((prev) => {
        const nextRow = { ...(prev[countryCode] || {}) };

        // `undefined` means "blank" — drop the key entirely so the generator
        // treats it as unpinned rather than as a pinned target of 0.
        if (value === undefined) {
          delete nextRow[field];
        } else {
          nextRow[field] = value;
        }

        const next = { ...prev };

        if (Object.keys(nextRow).length === 0) {
          delete next[countryCode];
        } else {
          next[countryCode] = nextRow;
        }

        return next;
      });
      markTotalsStale();
    },
    [markTotalsStale],
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

  // The same three adapters, but sourced from the real per-voter matrix. Used by
  // Detailed/Rank sharing, and always by the breakdown grid.
  const votesRankedCountries = useMemo(
    () => buildRankedCountriesFromVotes(stage, votes, stage.votingMode),
    [stage, votes],
  );
  const votesGetPoints = useMemo(
    () => buildGetPointsFromVotes(stage.votingMode, votes),
    [stage.votingMode, votes],
  );
  const votesCountriesOverrideForPodium = useMemo(
    () =>
      buildCountriesOverrideForPodiumFromVotes(stage, votes, stage.votingMode),
    [stage, votes],
  );
  const votesGetCellPoints = useMemo(
    () => buildGetCellPointsFromVotes(stage.votingMode, votes),
    [stage.votingMode, votes],
  );

  // Whether the matrix holds anything at all — the breakdown grid is meaningless
  // without it, so its share option stays disabled until there are votes.
  const hasAnyVotes = useMemo(
    () =>
      !!votes &&
      (['jury', 'televote', 'combined'] as const).some(
        (ch) => Object.keys(votes[ch] ?? {}).length > 0,
      ),
    [votes],
  );

  // Share sources follow what you're looking at: the typed totals on the Totals
  // tab, the real matrix on Detailed/Rank. The breakdown always uses the matrix.
  const isBreakdownShare = shareStatsOpen === StatsTableType.BREAKDOWN;
  const useVotesShareSource = isBreakdownShare || activeMode !== 'totals';

  const shareRankedCountries = useVotesShareSource
    ? votesRankedCountries
    : totalsRankedCountries;
  const shareGetPoints = useVotesShareSource ? votesGetPoints : totalsGetPoints;
  const sharePodiumCountries =
    activeMode !== 'totals'
      ? votesCountriesOverrideForPodium
      : countriesOverrideForPodium;

  const shareTitleOverride = `${contestName} ${contestYear}`;
  const shareSubtitleOverride = stage.name;

  // Entering the Totals tab mirrors whatever Detailed/Rank currently hold, so the
  // three modes stay in sync. Skipped when un-generated edits are pending (they'd
  // be silently discarded) or when the matrix is empty (seeding zeros would pin
  // every country to 0).
  const handleModeChange = useCallback(
    (mode: PredefinitionMode) => {
      if (
        mode === 'totals' &&
        activeMode !== 'totals' &&
        totalsStatus !== 'stale'
      ) {
        const seeded = getTotalsFromVotes();

        if (seeded) {
          setLocalTotals(seeded);
          markTotalsSynced();
        }
      }
      setActiveMode(mode);
    },
    [activeMode, totalsStatus, getTotalsFromVotes, markTotalsSynced],
  );

  // Higher points get a stronger accent wash, so the shape of a ballot is
  // readable at a glance without reading any number.
  const getCellClassName = useCallback(
    (points: number) => {
      const tier = (a: number, b: number) =>
        isTotalOrCombinedVoteType ? a : b;

      if (points >= tier(20, 12)) return 'font-bold bg-primary-700/60';
      if (points >= tier(17, 10)) return 'font-semibold bg-primary-700/50';
      if (points >= tier(15, 7)) return 'font-semibold bg-primary-700/30';
      if (points >= tier(10, 4)) return 'font-medium bg-primary-700/20';
      if (points > 0) return 'font-medium bg-primary-700/[0.13]';

      return 'font-medium';
    },
    [isTotalOrCombinedVoteType],
  );

  // Save is gated, never allowed-then-erroring: on Detailed/Rank every ballot
  // must be complete and valid; on Totals a fresh breakdown must exist.
  const saveValidation = useMemo(
    () => validateAllBeforeSave(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [votes, votingCountries, stage.votingMode],
  );

  const canSave =
    activeMode === 'totals' ? totalsStatus === 'fresh' : saveValidation.ok;

  const saveDisabledReason = !canSave
    ? activeMode === 'totals'
      ? totalsStatus === 'stale'
        ? tSetup('totalsStaleHint')
        : tSetup('totalsUngeneratedHint')
      : tSetup('saveBlockedTooltip')
    : undefined;

  const handleSave = () => {
    if (!canSave || !votes) return;
    onClose();
    toast.success(tSetup('toastVotesSaved'));

    setTimeout(() => {
      onSave(votes);
    }, 300);
  };

  useEffectOnce(onLoaded);

  const modeTabs = [
    { value: 'detailed' as const, label: tSetup('detailedView') },
    { value: 'rank' as const, label: tSetup('rankView') },
    { value: 'totals' as const, label: tSetup('totalsView') },
  ];

  const pointsSummary = displayPointsSystem.every(
    (p: { value: number }, index: number) =>
      PREDEFINED_SYSTEMS_MAP['default']?.[index]?.value === p?.value,
  )
    ? '1-8, 10, 12'
    : displayPointsSystem.map((p: { value: number }) => p.value).join(', ');

  const confirmReset = () => {
    const isTotals = activeMode === 'totals';

    confirm({
      key: 'reset-voting-predefinition',
      type: 'danger',
      title: isTotals ? tSetup('resetTotalsTitle') : tSetup('resetMatrixTitle'),
      description: isTotals
        ? tSetup('resetTotalsDescription')
        : tSetup('resetMatrixDescription'),
      onConfirm: () => {
        if (isTotals) {
          setLocalTotals({});
          resetTotalsGeneration();
          toast.success(tSetup('toastTotalsCleared'));

          return;
        }

        resetVotes();
        setEditing({});
        toast.success(tSetup('toastMatrixCleared'));
      },
    });
  };

  const sortToggle = (isByPoints: boolean, onToggle: () => void) => (
    <VotingBarIconButton
      label={isByPoints ? t('common.sortByName') : t('common.sortByPoints')}
      onClick={onToggle}
      icon={
        isByPoints ? (
          <SortAZIcon className="h-[18px] w-[18px]" />
        ) : (
          <ArrowDown10 className="h-[18px] w-[18px]" />
        )
      }
    />
  );

  const contextualControls = (
    <>
      {activeMode === 'detailed' && (
        <>
          {voteTypeOptions.length > 0 && (
            <VotingSegmentedControl
              ariaLabel={tSetup('channelSwitchLabel')}
              value={selectedType}
              onChange={setSelectedType}
              options={[
                { value: 'Total' as const, label: totalBadgeLabel },
                ...voteTypeOptions.map((type: StageVotingType) => ({
                  value: type,
                  label:
                    type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
                })),
              ]}
            />
          )}
          {sortToggle(isSorting, () => setIsSorting(!isSorting))}
          <VotingBarButton
            variant="ghost"
            onClick={confirmReset}
            icon={<RotateCcw className="h-4 w-4" />}
          >
            {t('common.reset')}
          </VotingBarButton>
          <VotingBarButton
            variant="primary"
            onClick={() => {
              randomizeAll();
              setEditing({});
              toast.success(tSetup('toastVotesRandomized'));
            }}
            icon={<Shuffle className="h-4 w-4" />}
          >
            {t('common.randomize')}
          </VotingBarButton>
        </>
      )}

      {activeMode === 'rank' && (
        <>
          <VotingBarIconButton
            label={
              rankLayout === 'list'
                ? tSetup('layoutGrid')
                : tSetup('layoutList')
            }
            onClick={() =>
              setSettings({
                votingRankLayout: rankLayout === 'list' ? 'grid' : 'list',
              })
            }
            icon={
              rankLayout === 'list' ? (
                <LayoutGrid className="h-[18px] w-[18px]" />
              ) : (
                <List className="h-[18px] w-[18px]" />
              )
            }
          />
          <VotingBarButton
            variant="ghost"
            onClick={() => {
              randomizeRankOrder();
              toast.success(tSetup('toastRankingRandomized'));
            }}
            icon={<Dices className="h-4 w-4" />}
          >
            {tSetup('randomizeRanking')}
          </VotingBarButton>
          <VotingBarButton
            variant="primary"
            onClick={() => {
              randomizeRankPoints();
              toast.success(tSetup('toastRankPointsGenerated'));
            }}
            icon={<Sparkles className="h-4 w-4" />}
          >
            {tSetup('randomizePoints')}
          </VotingBarButton>
        </>
      )}

      {activeMode === 'totals' && (
        <>
          {sortToggle(!isTotalsSortByName, () =>
            setIsTotalsSortByName(!isTotalsSortByName),
          )}
          <VotingBarIconButton
            label={tSetup('totalsHelpLabel')}
            onClick={() => setShowTotalsHelp((prev) => !prev)}
            icon={<HelpCircle className="h-[18px] w-[18px]" />}
          />
        </>
      )}
    </>
  );

  const shareMenu = (
    <VotingBarMenu
      align="end"
      panelClassName="min-w-[300px]"
      renderTrigger={({ ref, onClick }) => (
        <VotingBarButton
          ref={ref}
          onClick={onClick}
          icon={<Share2 className="h-4 w-4" />}
        >
          {t('common.share')}
        </VotingBarButton>
      )}
    >
      {(close) => (
        <>
          <VotingMenuLabel
            hint={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-white/55">
                <Table className="h-3 w-3" />
                {activeMode === 'totals'
                  ? tSetup('shareSourceTotals')
                  : tSetup('shareSourceMatrix')}
              </span>
            }
          >
            {tSetup('shareWhat')}
          </VotingMenuLabel>
          <VotingMenuRow
            icon={<Trophy className="h-[17px] w-[17px]" />}
            sub={tSetup('shareScoreboardSub')}
            onClick={() => {
              close();
              setShareResultsOpen(true);
            }}
          >
            {tSetup('shareScoreboardResults')}
          </VotingMenuRow>
          <VotingMenuRow
            icon={<Columns2 className="h-[17px] w-[17px]" />}
            sub={tSetup('shareSplitSub')}
            onClick={() => {
              close();
              setShareStatsOpen(StatsTableType.SPLIT);
            }}
          >
            {tSetup('shareSplit')}
          </VotingMenuRow>
          <VotingMenuRow
            icon={<ImageIcon className="h-[17px] w-[17px]" />}
            sub={tSetup('shareSummarySub')}
            onClick={() => {
              close();
              setShareStatsOpen(StatsTableType.SUMMARY);
            }}
          >
            {tSetup('shareSummary')}
          </VotingMenuRow>
          <VotingMenuRow
            icon={<Table className="h-[17px] w-[17px]" />}
            disabled={!hasAnyVotes}
            sub={
              hasAnyVotes
                ? tSetup('shareBreakdownSub')
                : tSetup('shareBreakdownEmpty')
            }
            onClick={() => {
              close();
              setShareStatsOpen(StatsTableType.BREAKDOWN);
            }}
          >
            {tSetup('shareBreakdown')}
          </VotingMenuRow>
        </>
      )}
    </VotingBarMenu>
  );

  const overflowMenu = (
    <VotingBarMenu
      align="end"
      renderTrigger={({ ref, onClick }) => (
        <VotingBarIconButton
          ref={ref}
          onClick={onClick}
          label={t('common.more')}
          icon={<MoreHorizontal className="h-5 w-5" />}
        />
      )}
    >
      {(close) => (
        <>
          <VotingMenuLabel>{tSetup('presetsLabel')}</VotingMenuLabel>
          <VotingMenuRow
            icon={<Save className="h-[17px] w-[17px]" />}
            onClick={() => {
              close();
              openSavePresetCreate(
                activeMode === 'totals' ? 'totals' : 'detailed',
              );
            }}
          >
            {tSetup('presets.savePreset')}
          </VotingMenuRow>
          <VotingMenuRow
            icon={<FolderOpen className="h-[17px] w-[17px]" />}
            onClick={() => {
              close();
              openLoadPresetModal(
                activeMode === 'totals' ? 'totals' : 'detailed',
              );
            }}
          >
            {tSetup('presets.loadPreset')}
          </VotingMenuRow>

          <VotingMenuSeparator />

          <VotingMenuLabel
            hint={
              <Tooltip
                position="right"
                classNameIcon="!mt-0 !w-4 !h-4"
                className="!z-[99999]"
                content={
                  <VoteSpreadsheetFormatTooltipContent withDragDrop={false} />
                }
              >
                <span className="sr-only">{tSpreadsheet('formatHelp')}</span>
              </Tooltip>
            }
          >
            {tSetup('spreadsheetLabel')}
          </VotingMenuLabel>
          <VotingMenuRow
            icon={<Upload className="h-[17px] w-[17px]" />}
            sub=".xlsx"
            onClick={() => {
              close();
              importInputRef.current?.click();
            }}
          >
            {tSpreadsheet('import')}
          </VotingMenuRow>
          <VotingMenuRow
            icon={<Download className="h-[17px] w-[17px]" />}
            sub=".xlsx"
            onClick={() => {
              close();
              handleExportSpreadsheet();
            }}
          >
            {tSpreadsheet('export')}
          </VotingMenuRow>

          <VotingMenuSeparator />

          <VotingMenuRow
            variant="danger"
            icon={<RotateCcw className="h-[17px] w-[17px]" />}
            onClick={() => {
              close();
              confirmReset();
            }}
          >
            {activeMode === 'totals'
              ? tSetup('resetTotalsTitle')
              : tSetup('resetMatrixTitle')}
          </VotingMenuRow>
        </>
      )}
    </VotingBarMenu>
  );

  // 37 voters worth of names would bury the instruction that follows, so the
  // callout names the first few and counts the rest.
  const invalidVoterNames = saveValidation.errors.map((e) => e.label);
  const hiddenInvalidCount = Math.max(
    0,
    invalidVoterNames.length - MAX_LISTED_INVALID_VOTERS,
  );
  const listedInvalidVoters =
    invalidVoterNames.slice(0, MAX_LISTED_INVALID_VOTERS).join(', ') +
    (hiddenInvalidCount > 0 ? `, +${hiddenInvalidCount}` : '');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClickOutside}
        overlayClassName="!z-[1000]"
        // Fixed-height shell: the header and footer are pinned and only the body
        // between them scrolls. Full-bleed below 640px, per the design.
        containerClassName="!flex !flex-col !h-[min(720px,92vh)] max-sm:!h-[100dvh] max-sm:!mx-0 max-sm:!max-w-none max-sm:!rounded-none"
        contentClassName="!flex-1 !min-h-0 !px-4 sm:!px-5 !pt-0 !pb-1 text-white flex flex-col"
        topContent={
          <VotingPredefinitionHeader
            modeTabs={modeTabs}
            activeMode={activeMode}
            onModeChange={handleModeChange}
            contextualControls={contextualControls}
            shareMenu={shareMenu}
            overflowMenu={overflowMenu}
            kicker={tSetup('kicker')}
            title={stage.name}
            titleAdornment={
              activeMode === 'detailed' ? (
                <VotingBarMenu
                  panelClassName="max-w-[300px] min-w-0 p-3.5"
                  renderTrigger={({ ref, onClick }) => (
                    <button
                      ref={ref}
                      type="button"
                      onClick={onClick}
                      className="inline-flex h-[26px] items-center gap-[5px] rounded-lg px-2 text-[12.5px] font-bold text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                      <HelpCircle className="h-[15px] w-[15px]" />
                      {tSetup('pointsSummary', { points: pointsSummary })}
                    </button>
                  )}
                >
                  <p className="text-[12.5px] font-medium leading-relaxed text-white/70 [&_b]:font-extrabold [&_b]:text-white">
                    {tSetup.rich('detailedHelp', {
                      points: pointsSummary,
                      b: (chunks) => <b>{chunks}</b>,
                    })}
                  </p>
                </VotingBarMenu>
              ) : undefined
            }
          />
        }
        bottomContent={
          <div className="z-30 flex items-center justify-end gap-2.5 border-t border-white/10 bg-black/[0.18] px-4 py-3 sm:px-5">
            <VotingBarButton onClick={onClose}>
              {t('common.close')}
            </VotingBarButton>
            <VotingBarButton
              variant="primary"
              onClick={handleSave}
              disabled={!canSave}
              title={saveDisabledReason}
              icon={<Check className="h-4 w-4" />}
            >
              {tSetup('saveVotes')}
            </VotingBarButton>
          </div>
        }
      >
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];

            event.target.value = '';
            if (file) void handleImportSpreadsheet(file);
          }}
        />

        <div
          className="relative flex min-h-0 flex-1 flex-col gap-3.5"
          onDragOver={handleSpreadsheetDragOver}
          onDragLeave={handleSpreadsheetDragLeave}
          onDrop={handleSpreadsheetDrop}
        >
          {isSpreadsheetDragOver && activeMode === 'detailed' && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-white/40 bg-primary-900/80 backdrop-blur-sm">
              <p className="px-4 text-center text-sm font-medium text-white/90">
                {tSpreadsheet('dropToImport')}
              </p>
            </div>
          )}

          {/* With nothing entered yet every column is trivially incomplete, and
              the empty dots already say so — the callout is for a matrix that
              has been worked on and is still not savable. */}
          {activeMode !== 'totals' &&
            hasAnyVotes &&
            invalidVoterNames.length > 0 && (
              <VotingCallout
                variant="warn"
                icon={<AlertTriangle className="h-[18px] w-[18px]" />}
              >
                {tSetup.rich('saveBlockedCallout', {
                  voters: listedInvalidVoters,
                  b: (chunks) => <b>{chunks}</b>,
                })}
              </VotingCallout>
            )}

          {activeMode === 'detailed' && (
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
                const fallback = String(displayValue || '');

                return (editing[key] ?? fallback) as string;
              }}
              onChangeCell={(participant, voter, val) => {
                const key: CellKey = `${participant}:${voter}`;

                setEditing((s) => ({ ...s, [key]: val }));
              }}
              onBlurCell={(participant, voter, val) => {
                const key: CellKey = `${participant}:${voter}`;

                applyInputValue(participant, voter, val);

                setEditing((s) => {
                  const next = { ...s } as Record<CellKey, string>;

                  delete next[key];

                  return next;
                });
              }}
            />
          )}

          {activeMode === 'rank' && (
            <VotingRankView
              countries={stage.countries as any}
              orderedCodes={
                rankOrder ?? (stage.countries as any[]).map((c) => c.code)
              }
              onReorder={reorderRank}
              showPoints={showRankPoints}
              totals={getRankTotals()}
              rankTarget={rankTarget}
              onEnter={enterRankMode}
            />
          )}

          {activeMode === 'totals' && (
            <TotalsPredefinitionView
              stage={stage}
              localTotals={localTotals}
              onCellChange={handleTotalsCellChange}
              sortByName={isTotalsSortByName}
              budgets={getTotalsChannelBudgets()}
              status={totalsStatus}
              adjustments={totalsAdjustments}
              showHelp={showTotalsHelp}
              onDismissHelp={() => setShowTotalsHelp(false)}
              onGenerate={() => {
                const adjusted = generateFromTotals(localTotals).length;

                toast.success(
                  adjusted > 0
                    ? tSetup('toastBreakdownGeneratedAdjusted', {
                        count: adjusted,
                      })
                    : tSetup('toastBreakdownGenerated'),
                );
              }}
            />
          )}
        </div>

        {(shareResultsOpen || shareStatsOpen) && (
          <>
            <ShareResultsModal
              isOpen={shareResultsOpen}
              onClose={() => setShareResultsOpen(false)}
              onLoaded={() => {}}
              countriesOverride={sharePodiumCountries}
              titleOverride={shareTitleOverride}
              subtitleOverride={shareSubtitleOverride}
            />
            {shareStatsOpen && (
              <ShareStatsModal
                isOpen={!!shareStatsOpen}
                onClose={() => setShareStatsOpen(null)}
                onLoaded={() => {}}
                activeTab={shareStatsOpen}
                rankedCountries={shareRankedCountries}
                selectedStageId={stage.id}
                selectedVoteType="Total"
                getCellPoints={votesGetCellPoints}
                getCellClassName={getCellClassName}
                getPoints={shareGetPoints}
                selectedStage={stage}
                // Typed totals carry no jury/televote split under COMBINED, so
                // collapse those columns; the matrix source has real ones.
                aggregateOnly={!useVotesShareSource}
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
