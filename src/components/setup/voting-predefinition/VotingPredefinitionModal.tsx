'use client';

import {
  AlertTriangle,
  Check,
  Columns2,
  Dices,
  Download,
  Eraser,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  LayoutGrid,
  List,
  ListChecks,
  ListOrdered,
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
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import dynamic from 'next/dynamic';

import {
  ballotChips,
  CellOutcome,
  isBallotComplete,
  nextFreePoint,
} from './ballotEdits';
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
import { type PointsChip, VotingPointsBar } from './VotingPointsBar';
import {
  VotingPredefinitionHeader,
  type PredefinitionMode,
} from './VotingPredefinitionHeader';
import { VotingPredefinitionPresetModals } from './VotingPredefinitionPresetModals';
import {
  type MatrixCell,
  VotingPredefinitionTable,
} from './VotingPredefinitionTable';
import { VotingRankView } from './VotingRankView';

import { ArrowDown10 } from '@/assets/icons/ArrowDown10';
import SortAZIcon from '@/assets/icons/SortAZIcon';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal/Modal';
import { Tooltip } from '@/components/common/Tooltip';
import { getShortCodes } from '@/data/countries/shortCodes';
import { PREDEFINED_SYSTEMS_MAP } from '@/data/data';
import { toast } from '@/helpers/toast';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import { useBackHandler } from '@/hooks/useBackHandler';
import { useChosenShortCodes } from '@/hooks/useChosenShortCodes';
import { useConfirmation } from '@/hooks/useConfirmation';
import { useConfirmModalClose } from '@/hooks/useConfirmModalClose';
import { useEffectOnce } from '@/hooks/useEffectOnce';
import { EventStage, StageVotingType, StatsTableType } from '@/models';
import { playHaptic } from '@/native/haptics';
import { IS_NATIVE_APP } from '@/native/platform';
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

/** How long a notice ("Moved 12 points from Norway") stays in the bar. */
const NOTICE_MS = 5000;

/** From this viewport width the modal grows to fit the matrix (`md`). */
const FIT_MIN_VIEWPORT = 768;

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
  const alwaysShowFullCountryNames = useGeneralStore(
    (s) => s.settings.alwaysShowFullCountryNames,
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
    allVotingCountries,
    voteTypeOptions,
    rankedCountries,
    randomizeAll,
    resetVotes,
    applyInputValue,
    pickPoint,
    clearCellPoints,
    giveNext,
    clearBallot,
    fillVotesRandomly,
    hasVotesInScope,
    activePointsSystem,
    isCombinedVoting,
    cellTop,
    getBallot,
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

  const dropEditing = (cell: MatrixCell) =>
    setEditing((prev) => {
      const key: CellKey = `${cell.p}:${cell.v}`;

      if (!(key in prev)) return prev;

      const next = { ...prev };

      delete next[key];

      return next;
    });

  // --- The points bar: the selected cell, or the voter whose whole vote is
  // being given (each tap on a row then gives the next value).
  const [selected, setSelected] = useState<MatrixCell | null>(null);
  const [ballotVoter, setBallotVoter] = useState<string | null>(null);
  /** Whole-vote mode: a free value picked to go next instead of the top one. */
  const [preferredNextId, setPreferredNextId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | undefined>(undefined);

  const showNotice = useCallback((text: string | null) => {
    window.clearTimeout(noticeTimer.current);
    setNotice(text);
    if (text) {
      noticeTimer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(noticeTimer.current), []);

  const chosenShortCodes = useChosenShortCodes();
  const codes = useMemo(
    () =>
      getShortCodes(
        [...(stage.countries as any[]), ...allVotingCountries],
        chosenShortCodes,
      ),
    [stage.countries, allVotingCountries, chosenShortCodes],
  );

  const nameOf = (code: string) =>
    (stage.countries as any[]).find((c) => c.code === code)?.name ??
    allVotingCountries.find((c) => c.code === code)?.name ??
    code;

  const exitBallot = useCallback(() => {
    setBallotVoter(null);
    setPreferredNextId(null);
  }, []);

  useBackHandler(ballotVoter !== null, exitBallot);

  useEffect(() => {
    if (!ballotVoter) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitBallot();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [ballotVoter, exitBallot]);

  // Another channel or tab: whole-vote mode ends, notices are stale.
  useEffect(() => {
    exitBallot();
    showNotice(null);
  }, [selectedType, activeMode, exitBallot, showNotice]);

  // Another stage (the modal stays mounted between stages): nothing selected.
  useEffect(() => {
    setSelected(null);
    exitBallot();
  }, [stage.id, exitBallot]);

  const describeOutcome = (outcome: CellOutcome | null) => {
    switch (outcome?.kind) {
      case 'moved':
        return tSetup('noticeMoved', {
          points: outcome.points,
          from: nameOf(outcome.from),
        });
      case 'notInSystem':
        return tSetup('noticeNotInSystem', {
          value: outcome.raw,
          points: pointsSummary,
        });
      case 'unreachable':
        return tSetup('noticeUnreachable', { value: outcome.value });
      default:
        return null;
    }
  };

  const handleCommitCell = (cell: MatrixCell, value: string) => {
    const outcome = applyInputValue(cell.p, cell.v, value);

    dropEditing(cell);
    if (outcome && outcome.kind !== 'unchanged')
      showNotice(describeOutcome(outcome));
  };

  const handleSelectCell = (cell: MatrixCell) => {
    setSelected(cell);
    if (ballotVoter && ballotVoter !== cell.v) exitBallot();
  };

  const handlePick = (pointsId: number) => {
    if (IS_NATIVE_APP) playHaptic({ id: 'selection' });

    if (ballotVoter) {
      // Whole-vote mode: a free value goes next; a given one is taken back
      // (as a second tap on its row does) and goes next.
      const holder = getBallot(ballotVoter).find(
        (vote) => vote.pointsId === pointsId,
      );

      if (holder) pickPoint(holder.countryCode, ballotVoter, pointsId);
      setPreferredNextId((prev) =>
        prev === pointsId && !holder ? null : pointsId,
      );
      showNotice(null);

      return;
    }
    if (!selected) return;

    dropEditing(selected);
    showNotice(describeOutcome(pickPoint(selected.p, selected.v, pointsId)));
  };

  const handleClearCell = () => {
    if (!selected) return;

    dropEditing(selected);
    clearCellPoints(selected.p, selected.v);
    showNotice(null);
  };

  const startBallot = (voterCode: string) => {
    if (ballotVoter === voterCode) {
      exitBallot();

      return;
    }

    setBallotVoter(voterCode);
    setPreferredNextId(null);
    setSelected(null);
    showNotice(null);
  };

  /** After a vote is complete: the next voter (in column order) who isn't. */
  const advanceBallot = (fromVoter: string) => {
    const order = votingCountries.map((voter) => voter.code);
    const start = order.indexOf(fromVoter);
    const next = [...order.slice(start + 1), ...order.slice(0, start)].find(
      (code) => !isBallotComplete(getBallot(code), activePointsSystem),
    );

    setPreferredNextId(null);
    if (next) {
      setBallotVoter(next);
      showNotice(tSetup('noticeBallotDone', { voter: nameOf(fromVoter) }));
    } else {
      exitBallot();
      showNotice(tSetup('noticeAllComplete'));
    }
  };

  const handleBallotTap = (participantCode: string) => {
    if (!ballotVoter || participantCode === ballotVoter) return;
    if (IS_NATIVE_APP) playHaptic({ id: 'selection' });

    const ballot = giveNext(participantCode, ballotVoter, preferredNextId);

    setPreferredNextId(null);
    showNotice(null);
    if (isBallotComplete(ballot, activePointsSystem))
      advanceBallot(ballotVoter);
  };

  const handleFillBallot = () => {
    if (!ballotVoter) return;

    fillVotesRandomly(ballotVoter);
    advanceBallot(ballotVoter);
  };

  const handleClearBallot = () => {
    if (!ballotVoter) return;

    clearBallot(ballotVoter);
    setPreferredNextId(null);
    showNotice(null);
  };

  // Whole-vote mode moving to another voter brings their column into view.
  const [tableEl, setTableEl] = useState<HTMLTableElement | null>(null);

  useEffect(() => {
    if (!ballotVoter || !tableEl) return;

    const index = votingCountries.findIndex((v) => v.code === ballotVoter);

    tableEl
      .querySelector(`thead th[data-c="${index}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballotVoter, tableEl]);

  // --- Size: from `md`, the modal grows (up to the viewport) until the whole
  // matrix fits, measured; never smaller than its usual size. Kept while the
  // Rank and Totals tabs are open, so switching tabs doesn't resize it.
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = modalRef.current;
    const scroller = scrollerRef.current;

    if (!tableEl || !container || !scroller) return undefined;

    const fit = () => {
      if (window.innerWidth < FIT_MIN_VIEWPORT) {
        container.style.removeProperty('--vp-w');
        container.style.removeProperty('--vp-h');

        return;
      }

      // Layout sizes, not bounding rects: the modal opens scaled (95%), and
      // a transform doesn't resize anything, so nothing would measure again.
      let naturalWidth = 0;

      tableEl
        .querySelectorAll<HTMLElement>('thead th:not(.dp-vp-filler)')
        .forEach((th) => {
          naturalWidth += th.offsetWidth;
        });

      // What the modal needs = its chrome around the scroll box + the table.
      const width =
        container.offsetWidth - scroller.clientWidth + naturalWidth + 2;
      const height =
        container.offsetHeight -
        scroller.clientHeight +
        tableEl.offsetHeight +
        2;

      container.style.setProperty('--vp-w', `${Math.ceil(width)}px`);
      container.style.setProperty('--vp-h', `${Math.ceil(height)}px`);
    };

    fit();

    const observer = new ResizeObserver(fit);

    observer.observe(tableEl);
    observer.observe(scroller);
    window.addEventListener('resize', fit);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [tableEl]);

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
    votingCountries: allVotingCountries,
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
        setSelected(null);
        exitBallot();
        showNotice(null);
        toast.success(tSetup('toastMatrixCleared'));
      },
    });
  };

  const handleRandomizeAll = () => {
    randomizeAll();
    setEditing({});
    exitBallot();
    showNotice(null);
    toast.success(tSetup('toastVotesRandomized'));
  };

  const handleFillAll = () => {
    const changed = fillVotesRandomly();

    setEditing({});
    exitBallot();
    showNotice(null);
    if (changed > 0) toast.success(tSetup('toastVotesFilled'));
    else toast.info(tSetup('toastNothingToFill'));
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
            className="dp-vp-reset"
            onClick={confirmReset}
            icon={<RotateCcw className="h-4 w-4" />}
          >
            {t('common.reset')}
          </VotingBarButton>
          {/* With votes on the tab, Randomize asks what to keep: filling
              only what's missing is the common case once some ballots are
              typed in by hand. */}
          {hasVotesInScope() ? (
            <VotingBarMenu
              align="end"
              panelClassName="min-w-[280px]"
              renderTrigger={({ ref, onClick }) => (
                <VotingBarButton
                  ref={ref}
                  variant="primary"
                  collapsible
                  onClick={onClick}
                  icon={<Shuffle className="h-4 w-4" />}
                >
                  {t('common.randomize')}
                </VotingBarButton>
              )}
            >
              {(close) => (
                <>
                  <VotingMenuRow
                    icon={<ListChecks className="h-[17px] w-[17px]" />}
                    sub={tSetup('randomizeFillSub')}
                    onClick={() => {
                      close();
                      handleFillAll();
                    }}
                  >
                    {tSetup('randomizeFill')}
                  </VotingMenuRow>
                  <VotingMenuRow
                    icon={<Shuffle className="h-[17px] w-[17px]" />}
                    sub={tSetup('randomizeAllSub')}
                    onClick={() => {
                      close();
                      handleRandomizeAll();
                    }}
                  >
                    {tSetup('randomizeAll')}
                  </VotingMenuRow>
                </>
              )}
            </VotingBarMenu>
          ) : (
            <VotingBarButton
              variant="primary"
              collapsible
              onClick={handleRandomizeAll}
              icon={<Shuffle className="h-4 w-4" />}
            >
              {t('common.randomize')}
            </VotingBarButton>
          )}
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
            collapsible
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
            collapsible
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
          collapsible
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

          {/* Spreadsheet import/export is website-only: files are awkward on a
              phone and the apps have no native download/share for them. */}
          {!IS_NATIVE_APP && (
            <>
              <VotingMenuLabel
                hint={
                  <Tooltip
                    position="right"
                    classNameIcon="!mt-0 !w-4 !h-4"
                    className="!z-[99999]"
                    content={
                      <VoteSpreadsheetFormatTooltipContent
                        withDragDrop={false}
                      />
                    }
                  >
                    <span className="sr-only">
                      {tSpreadsheet('formatHelp')}
                    </span>
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
            </>
          )}

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

  // --- What the points bar shows.
  const isEditable = !isTotalOrCombinedVoteType;
  const selectedVoter = selected
    ? votingCountries.find((voter) => voter.code === selected.v)
    : undefined;
  const activeCell =
    selected && selectedVoter && selected.p !== selected.v ? selected : null;
  const ballotVoterCountry = ballotVoter
    ? votingCountries.find((voter) => voter.code === ballotVoter)
    : undefined;
  const ballotVotes = ballotVoter ? getBallot(ballotVoter) : [];
  const ballotNext = ballotVoter
    ? activePointsSystem.find(
        (item) =>
          item.id === preferredNextId &&
          !ballotVotes.some((vote) => vote.pointsId === item.id),
      ) ?? nextFreePoint(ballotVotes, activePointsSystem)
    : null;

  const channelPoints = (
    channel: 'jury' | 'televote' | 'combined',
    participant: string,
    voter: string,
  ) =>
    (votes?.[channel]?.[voter] ?? []).reduce(
      (sum, vote) =>
        vote.countryCode === participant ? sum + vote.points : sum,
      0,
    );

  const hint = (fine: string, touch: string) => (
    <>
      <span className="dp-stats-hint-hover">{fine}</span>
      <span className="dp-stats-hint-tap">{touch}</span>
    </>
  );

  const barAction = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    options: { quiet?: boolean; disabled?: boolean } = {},
  ) => (
    <Button
      variant="surface"
      size="sm"
      className={options.quiet ? 'dp-act--quiet' : undefined}
      Icon={icon}
      aria-label={label}
      disabled={options.disabled}
      onClick={onClick}
    >
      <span className="dp-vp-lbl">{label}</span>
    </Button>
  );

  const pointsBar: React.ComponentProps<typeof VotingPointsBar> = (() => {
    const chipsLabel = tSetup('pointsLegend');

    if (!isEditable) {
      if (activeCell && selectedVoter) {
        const names = {
          voter: selectedVoter.name,
          country: nameOf(activeCell.p),
        };
        const points = getCellValue(activeCell.p, activeCell.v);
        const text = !points
          ? tSetup('cellNothing', names)
          : !isCombinedVoting && voteTypeOptions.length > 0
          ? tSetup('cellGivesSplit', {
              ...names,
              points,
              jury: channelPoints('jury', activeCell.p, activeCell.v),
              televote: channelPoints('televote', activeCell.p, activeCell.v),
            })
          : tSetup('cellGives', { ...names, points });

        return { voter: selectedVoter, text, chips: null, chipsLabel };
      }

      return {
        voter: null,
        text: hint(tSetup('barHintTotal'), tSetup('barHintTotalTap')),
        chips: null,
        chipsLabel,
      };
    }

    if (ballotVoter && ballotVoterCountry) {
      const chips: PointsChip[] = ballotChips(
        ballotVotes,
        activePointsSystem,
      ).map(({ item, holder }) => ({
        id: item.id,
        value: item.value,
        holder: holder ? codes[holder] ?? holder : null,
        label: holder
          ? tSetup('chipUsed', { points: item.value, country: nameOf(holder) })
          : tSetup('chipFree', { points: item.value }),
        state: holder ? 'used' : item.id === ballotNext?.id ? 'next' : 'free',
      }));
      const prompt = ballotNext
        ? tSetup('ballotPrompt', {
            voter: ballotVoterCountry.name,
            points: ballotNext.value,
          })
        : tSetup('ballotComplete', { voter: ballotVoterCountry.name });

      return {
        voter: ballotVoterCountry,
        text: notice ? `${notice} ${prompt}` : prompt,
        chips,
        chipsLabel,
        onPick: handlePick,
        actions: (
          <>
            {barAction(
              tSetup('fillBallot'),
              <Shuffle className="size-4" />,
              handleFillBallot,
              { disabled: !ballotNext },
            )}
            {barAction(
              tSetup('clearBallot'),
              <Eraser className="size-4" />,
              handleClearBallot,
              { quiet: true, disabled: ballotVotes.length === 0 },
            )}
            <Button
              variant="surfaceStrong"
              size="sm"
              Icon={<Check className="size-4" />}
              onClick={exitBallot}
            >
              {tSetup('doneBallot')}
            </Button>
          </>
        ),
      };
    }

    if (activeCell && selectedVoter) {
      const ballot = getBallot(activeCell.v);
      const points = getCellValue(activeCell.p, activeCell.v);
      const names = {
        voter: selectedVoter.name,
        country: nameOf(activeCell.p),
      };
      const chips: PointsChip[] = ballotChips(ballot, activePointsSystem).map(
        ({ item, holder }) => ({
          id: item.id,
          value: item.value,
          holder: holder ? codes[holder] ?? holder : null,
          label: holder
            ? tSetup('chipUsed', {
                points: item.value,
                country: nameOf(holder),
              })
            : tSetup('chipFree', { points: item.value }),
          state: holder === activeCell.p ? 'here' : holder ? 'used' : 'free',
        }),
      );

      return {
        voter: selectedVoter,
        text:
          notice ??
          (points
            ? tSetup('cellGives', { ...names, points })
            : tSetup('cellNothing', names)),
        chips,
        chipsLabel,
        onPick: handlePick,
        actions: (
          <>
            {points > 0 &&
              barAction(
                tSetup('clearCell'),
                <Eraser className="size-4" />,
                handleClearCell,
                { quiet: true },
              )}
            {barAction(
              tSetup('enterBallot'),
              <ListOrdered className="size-4" />,
              () => startBallot(activeCell.v),
            )}
          </>
        ),
      };
    }

    return {
      voter: null,
      text: notice ?? hint(tSetup('barHintEdit'), tSetup('barHintEditTap')),
      chips: ballotChips([], activePointsSystem).map(({ item }) => ({
        id: item.id,
        value: item.value,
        holder: null,
        label: tSetup('chipFree', { points: item.value }),
        state: 'legend',
      })),
      chipsLabel,
    };
  })();

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
        ref={modalRef}
        isOpen={isOpen}
        onClose={onClickOutside}
        overlayClassName="!z-[1000]"
        // Fixed-height shell: the header and footer are pinned and only the body
        // between them scrolls. Full-bleed on phones, per the design. From
        // `md` it grows to fit the matrix (`--vp-w` / `--vp-h`, measured).
        containerClassName="!flex !flex-col !h-[min(max(720px,var(--vp-h,0px)),92vh)] md:!max-w-[min(max(56rem,var(--vp-w,0px)),100vw_-_5rem)] lg:!max-w-[min(max(64rem,var(--vp-w,0px)),100vw_-_5rem)]"
        fullScreenOnPhone
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
          <div className="z-30 flex items-center gap-2.5 border-t border-white/10 bg-black/[0.18] px-3.5 pt-[10px] pb-[calc(10px+var(--modal-safe-bottom,0px))] sm:px-5">
            <Button
              variant="ghost"
              size="lg"
              className="px-[18px]"
              onClick={onClose}
            >
              {t('common.close')}
            </Button>
            <Button
              variant="cta"
              size="lg"
              className="flex-1 min-w-0 justify-center !uppercase !font-bold"
              onClick={handleSave}
              disabled={!canSave}
              title={saveDisabledReason}
              Icon={<Check className="size-[18px]" />}
            >
              {tSetup('saveVotes')}
            </Button>
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
          className="dp-vp relative flex min-h-0 flex-1 flex-col gap-3"
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
                <span className="dp-vp-callout-long">
                  {tSetup.rich('saveBlockedCallout', {
                    voters: listedInvalidVoters,
                    b: (chunks) => <b>{chunks}</b>,
                  })}
                </span>
                <span className="dp-vp-callout-short">
                  {tSetup('saveBlockedCalloutShort', {
                    count: invalidVoterNames.length,
                  })}
                </span>
              </VotingCallout>
            )}

          {activeMode === 'detailed' && (
            <>
              <VotingPredefinitionTable
                rankedCountries={rankedCountries as any}
                votingCountries={votingCountries as any}
                codes={codes}
                isEditable={!isTotalOrCombinedVoteType}
                showFullNames={alwaysShowFullCountryNames}
                cellTop={cellTop}
                getVoterValidity={getVoterValidity as any}
                getTotalPointsForCountry={getTotalPointsForCountry}
                getCellValue={getCellValue}
                valueForCell={(participant, voter) => {
                  const key: CellKey = `${participant}:${voter}`;
                  const displayValue = toFixedIfDecimalFloat(
                    getCellValue(participant, voter),
                  );
                  const fallback = String(displayValue || '');

                  return (editing[key] ?? fallback) as string;
                }}
                onChangeCell={(cell, val) => {
                  const key: CellKey = `${cell.p}:${cell.v}`;

                  setEditing((prev) => ({ ...prev, [key]: val }));
                }}
                onCommitCell={handleCommitCell}
                selected={selected}
                onSelectCell={handleSelectCell}
                ballotVoter={ballotVoter}
                nextPoints={ballotNext?.value ?? null}
                onVoterClick={startBallot}
                onBallotTap={handleBallotTap}
                tableRef={setTableEl}
                scrollerRef={scrollerRef}
              />
              <VotingPointsBar {...pointsBar} />
            </>
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
              stageName={stage.name}
            />
            {shareStatsOpen && (
              <ShareStatsModal
                isOpen={!!shareStatsOpen}
                onClose={() => setShareStatsOpen(null)}
                onLoaded={() => {}}
                activeTab={shareStatsOpen}
                // The same tables as the share menu: no breakdown without votes.
                tableOptions={[
                  StatsTableType.SPLIT,
                  StatsTableType.SUMMARY,
                  ...(hasAnyVotes ? [StatsTableType.BREAKDOWN] : []),
                ]}
                onTableChange={setShareStatsOpen}
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
