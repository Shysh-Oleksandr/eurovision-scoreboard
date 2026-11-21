import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  BallotEdit,
  CellOutcome,
  clearCell,
  giveNextPoint,
  pickCellPoint,
  typeCellValue,
} from './ballotEdits';
import {
  buildExportSectionsForStageVotes,
  downloadVoteSpreadsheet,
  importVotesFromSpreadsheetFile,
} from './voteSpreadsheet';
import { mergeImportedVotes } from './voteSpreadsheetParse';

import {
  BaseCountry,
  EventStage,
  StageVotingMode,
  StageVotingType,
} from '@/models';
import { useCountriesStore } from '@/state/countriesStore';
import { useGeneralStore } from '@/state/generalStore';
import { resolveDiaspora } from '@/state/scoreboard/diaspora';
import {
  generateRankConsistentVotes,
  RankChannel,
  RankTarget,
  resolveRankTarget,
  totalsForChannels,
} from '@/state/scoreboard/rankToStageVotes';
import {
  ChannelBudget,
  computeChannelBudget,
  generateVotesForTargets,
  resolveTargetChannels,
  TargetAdjustment,
  TargetField,
} from '@/state/scoreboard/totalsToStageVotes';
import {
  ManualShareTotalsRow,
  StageVotes,
  Vote,
} from '@/state/scoreboard/types';
import {
  filterVotersByChannel,
  getEffectiveVoterChannels,
  isVoterInChannel,
} from '@/state/scoreboard/voterChannels';
import {
  buildCombinedBallotsFromJuryTelevote,
  completeStageVotes,
  predefineStageVotes,
} from '@/state/scoreboard/votesPredefinition';
import { useScoreboardStore } from '@/state/scoreboardStore';

type UseVotingPredefinitionArgs = {
  stage: Pick<
    EventStage,
    'id' | 'name' | 'votingMode' | 'overrides' | 'voterChannels'
  > & {
    countries: (BaseCountry | any)[];
  };
};

export type VoteSpreadsheetActionSuccess = {
  ok: true;
  appliedCells: number;
  invalidVoters: string[];
  skippedSections: string[];
  unmatched: string[];
};

export type VoteSpreadsheetActionFailure = {
  ok: false;
  reason:
    | 'empty-file'
    | 'no-sections'
    | 'no-assignments'
    | 'multiple-points-blocked'
    | 'export-unavailable';
  unmatched?: string[];
  skippedSections?: string[];
};

export type VoteSpreadsheetActionResult =
  | VoteSpreadsheetActionSuccess
  | VoteSpreadsheetActionFailure;

const getInvalidVoterNames = (
  byVoter: Record<string, { pointsId: number }[]>,
  voters: Array<{ code: string; name: string }>,
  pointsSystem: Array<{ id: number }>,
  source: 'jury' | 'televote',
  voterChannels?: EventStage['voterChannels'],
): string[] => {
  const expectedIds = pointsSystem.map((p) => p.id);
  const invalid: string[] = [];

  for (const voter of voters) {
    if (!isVoterInChannel(voter.code, source, voterChannels)) continue;

    const arr = byVoter[voter.code] || [];
    const usedIds = arr.map((v) => v.pointsId);
    const hasAll = expectedIds.every((id) => usedIds.includes(id));
    const noDuplicates = new Set(usedIds).size === usedIds.length;

    if (!hasAll || !noDuplicates || usedIds.length !== expectedIds.length) {
      invalid.push(voter.name);
    }
  }

  return invalid;
};

const getInvalidVotersForVotes = (
  votes: Partial<StageVotes>,
  voters: Array<{ code: string; name: string }>,
  juryPointsSystem: Array<{ id: number }>,
  televotePointsSystem: Array<{ id: number }>,
  votingMode: StageVotingMode,
  voterChannels?: EventStage['voterChannels'],
): string[] => {
  const invalid = new Set<string>();

  if (
    votingMode === StageVotingMode.JURY_ONLY ||
    votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
    votingMode === StageVotingMode.COMBINED
  ) {
    getInvalidVoterNames(
      votes.jury ?? {},
      voters,
      juryPointsSystem,
      'jury',
      voterChannels,
    ).forEach((name) => invalid.add(name));
  }

  if (
    votingMode === StageVotingMode.TELEVOTE_ONLY ||
    votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
    votingMode === StageVotingMode.COMBINED
  ) {
    getInvalidVoterNames(
      votes.televote ?? {},
      voters,
      televotePointsSystem,
      'televote',
      voterChannels,
    ).forEach((name) => invalid.add(name));
  }

  return Array.from(invalid);
};

export const useVotingPredefinition = ({
  stage,
}: UseVotingPredefinitionArgs) => {
  const globalPointsSystem = useGeneralStore((s) => s.pointsSystem);
  const globalTelevotePointsSystem = useGeneralStore(
    (s) => s.televotePointsSystem,
  );
  const globalSplitPointsSystem = useGeneralStore(
    (s) => s.settings.splitPointsSystem,
  );
  const globalAllowMultiple = useGeneralStore(
    (s) => s.settings.allowMultiplePointsToSameEntry,
  );

  // configuredEventStages is updated before onSave(), so it's always fresher
  // than the `stage` prop (which may be stale, e.g. initialSetupStage).
  const configuredStage = useCountriesStore((state) =>
    state.configuredEventStages.find((s) => s.id === stage.id),
  );
  const effectiveVotingMode = configuredStage?.votingMode ?? stage.votingMode;
  const stageOverride =
    configuredStage?.overrides?.pointsSystem ?? stage.overrides?.pointsSystem;

  const pointsSystem = stageOverride?.pointsSystem ?? globalPointsSystem;
  const televotePointsSystem =
    stageOverride?.televotePointsSystem ?? globalTelevotePointsSystem;
  const splitPointsSystem =
    stageOverride?.splitPointsSystem ?? globalSplitPointsSystem;
  const allowMultiplePointsToSameEntry =
    stageOverride?.allowMultiplePointsToSameEntry ?? globalAllowMultiple;

  // When a split points system is enabled, televote uses its own system while
  // jury (and everything else) uses the default `pointsSystem`.
  const effectiveTelevotePointsSystem = splitPointsSystem
    ? televotePointsSystem
    : pointsSystem;

  const getPointsSystemForSource = (source: 'jury' | 'televote') =>
    source === 'televote' ? effectiveTelevotePointsSystem : pointsSystem;

  const globalRandomnessLevel = useGeneralStore(
    (s) => s.settings.randomnessLevel,
  );
  const globalPointsSpread = useGeneralStore((s) => s.settings.pointsSpread);
  const diasporaSettings = useGeneralStore((s) => s.settings.diaspora);
  const getStageVotingCountries = useCountriesStore(
    (s) => s.getStageVotingCountries,
  );
  const { countryOdds: globalCountryOdds } = useCountriesStore();

  // Per-stage odds override (configuredStage is fresher than the stage prop),
  // mirroring the points-system resolution above.
  const oddsOverride =
    configuredStage?.overrides?.odds ?? stage.overrides?.odds;
  const randomnessLevel =
    oddsOverride?.randomnessLevel ?? globalRandomnessLevel;
  const pointsSpread = oddsOverride?.pointsSpread ?? globalPointsSpread;
  const countryOdds = oddsOverride
    ? { ...globalCountryOdds, ...oddsOverride.countryOdds }
    : globalCountryOdds;

  const isReplayingSavedVotes = useScoreboardStore(
    (s) => s.isReplayingSavedVotes,
  );

  // When replaying a saved contest (presentation mode), the authoritative votes
  // for this stage already live in the scoreboard store. If the user has the
  // per-stage predefinition modal enabled, seed it from those saved votes
  // instead of showing an empty grid. Returns a deep clone so edits in the
  // modal don't mutate the store before the user saves.
  const getSeedVotes = (): Partial<StageVotes> | null => {
    if (!isReplayingSavedVotes) return null;

    const saved = useScoreboardStore.getState().predefinedVotes?.[stage.id];

    if (!saved || Object.keys(saved).length === 0) return null;

    return JSON.parse(JSON.stringify(saved)) as Partial<StageVotes>;
  };

  const [selectedType, setSelectedType] = useState<'Total' | StageVotingType>(
    'Total',
  );
  const [votes, setVotes] = useState<Partial<StageVotes> | null>(() =>
    getSeedVotes(),
  );
  const [isSorting, setIsSorting] = useState(false);

  // Rank-view state (drag-to-rank mode of the Detailed tab). Kept here — not in
  // the view component — so the ranking and reveal survive switching between the
  // Numbers matrix and the Rank view (which mounts/unmounts the view component).
  const [rankOrder, setRankOrder] = useState<string[] | null>(null);
  const [showRankPoints, setShowRankPoints] = useState(false);

  // Totals-view state (type target totals -> generate a best-fit breakdown).
  // 'ungenerated' -> no breakdown yet; 'fresh' -> breakdown matches the current
  // inputs (Save allowed); 'stale' -> an input changed since generating.
  const [totalsStatus, setTotalsStatus] = useState<
    'ungenerated' | 'fresh' | 'stale'
  >('ungenerated');
  const [totalsAdjustments, setTotalsAdjustments] = useState<
    TargetAdjustment[]
  >([]);
  const [totalsAchieved, setTotalsAchieved] = useState<Record<string, number>>(
    {},
  );

  const [lastStageId, setLastStageId] = useState<string | null>(stage.id);
  const [lastStageVotingMode, setLastStageVotingMode] =
    useState<StageVotingMode | null>(effectiveVotingMode);

  // Overrides are paused outside Jury and Televote mode.
  const voterChannels = getEffectiveVoterChannels({
    votingMode: effectiveVotingMode,
    voterChannels: stage.voterChannels,
  });
  // Every voter of the stage; the engine filters per channel itself.
  const votingCountries = getStageVotingCountries(stage.id, {
    fromScoreboard: false,
    channel: 'all',
  });
  // Voters shown as columns on the selected tab.
  const visibleVotingCountries = filterVotersByChannel(
    votingCountries,
    selectedType === StageVotingType.JURY
      ? 'jury'
      : selectedType === StageVotingType.TELEVOTE
      ? 'televote'
      : 'all',
    voterChannels,
  );

  const isCombinedVoting = effectiveVotingMode === StageVotingMode.COMBINED;

  const totalBadgeLabel = useMemo(() => {
    if (effectiveVotingMode === StageVotingMode.JURY_ONLY) return 'Jury';
    if (effectiveVotingMode === StageVotingMode.TELEVOTE_ONLY)
      return 'Televote';
    if (effectiveVotingMode === StageVotingMode.COMBINED) return 'Combined';

    return 'Total';
  }, [effectiveVotingMode]);

  const isTotalVoteType =
    selectedType === 'Total' && totalBadgeLabel === 'Total';
  const isTotalOrCombinedVoteType =
    selectedType === 'Total' &&
    (totalBadgeLabel === 'Combined' || totalBadgeLabel === 'Total');

  const voteTypeOptions = useMemo(() => {
    if (
      [StageVotingMode.JURY_AND_TELEVOTE, StageVotingMode.COMBINED].includes(
        effectiveVotingMode,
      )
    ) {
      return [StageVotingType.JURY, StageVotingType.TELEVOTE];
    }

    return [] as StageVotingType[];
  }, [effectiveVotingMode]);

  const getActiveSource = (): 'jury' | 'televote' | null => {
    if (
      selectedType === StageVotingType.JURY ||
      effectiveVotingMode === StageVotingMode.JURY_ONLY
    )
      return 'jury';
    if (
      selectedType === StageVotingType.TELEVOTE ||
      effectiveVotingMode === StageVotingMode.TELEVOTE_ONLY
    )
      return 'televote';

    return null;
  };

  // Points system shown in the header / used for reference. When the televote
  // tab is active and a split system is configured, show the televote system.
  const displayPointsSystem =
    getActiveSource() === 'televote'
      ? effectiveTelevotePointsSystem
      : pointsSystem;

  // Which running total the rank view controls, from the active badge:
  // Jury/Televote rank those channels; Total ranks the combined outcome.
  const rankTarget: RankTarget =
    selectedType === StageVotingType.JURY
      ? 'jury'
      : selectedType === StageVotingType.TELEVOTE
      ? 'televote'
      : 'total';

  const rankChannels = useMemo<RankChannel[]>(
    () => resolveRankTarget(rankTarget, effectiveVotingMode).rankChannels,
    [rankTarget, effectiveVotingMode],
  );

  const stageCodes = useMemo<string[]>(
    () => stage.countries.map((c: any) => c.code),
    [stage.countries],
  );

  const randomizeAll = () => {
    const effectiveTelevoteSystem = effectiveTelevotePointsSystem;

    const isJuryOnly =
      selectedType === StageVotingType.JURY && totalBadgeLabel === 'Total';
    const isTelevoteOnly =
      selectedType === StageVotingType.TELEVOTE && totalBadgeLabel === 'Total';

    const modeToGenerate = isJuryOnly
      ? StageVotingMode.JURY_ONLY
      : isTelevoteOnly
      ? StageVotingMode.TELEVOTE_ONLY
      : effectiveVotingMode;

    const generated = predefineStageVotes(
      stage.countries,
      votingCountries,
      modeToGenerate,
      countryOdds,
      randomnessLevel,
      pointsSpread,
      pointsSystem,
      effectiveTelevoteSystem,
      allowMultiplePointsToSameEntry,
      resolveDiaspora(diasporaSettings),
      voterChannels,
    );

    if (isJuryOnly) {
      setVotes((prev) => ({
        ...prev,
        ...(generated.jury ? { jury: generated.jury } : {}),
      }));
    } else if (isTelevoteOnly) {
      setVotes((prev) => ({
        ...prev,
        ...(generated.televote ? { televote: generated.televote } : {}),
      }));
    } else {
      setVotes(generated);
    }

    setIsSorting(true);

    return generated;
  };

  const resetTotalsGeneration = () => {
    setTotalsStatus('ungenerated');
    setTotalsAdjustments([]);
    setTotalsAchieved({});
  };

  const resetVotes = () => {
    setVotes(null);
    setSelectedType('Total');
    setIsSorting(false);
    setRankOrder(null);
    setShowRankPoints(false);
    resetTotalsGeneration();
  };

  // Called when the modal's stage/voting-mode changes (e.g. advancing to the
  // next stage while the modal stays mounted). During a saved-contest replay we
  // reseed from the stored votes for the new stage rather than clearing.
  const reseedVotesForStage = () => {
    const seed = getSeedVotes();

    setVotes(seed);
    setSelectedType('Total');
    setIsSorting(!!seed);
    setRankOrder(null);
    setShowRankPoints(false);
    resetTotalsGeneration();
  };

  // Per-country aggregate total across the rank target's channels — the value
  // shown on the right of each row once points are revealed.
  const getRankTotals = (): Record<string, number> =>
    totalsForChannels(votes || {}, rankChannels, stageCodes);

  // Derive a rank order from the current votes (highest total first); countries
  // with equal totals keep the stage's running order (stable sort). With no
  // votes yet this is simply the running order.
  const seedRankOrder = (): string[] => {
    const totals = getRankTotals();

    return [...stage.countries]
      .sort((a: any, b: any) => (totals[b.code] || 0) - (totals[a.code] || 0))
      .map((c: any) => c.code);
  };

  // Generate a points-consistent matrix for the current rank target from a drag
  // order, writing only the target channels into `votes`. `reveal` shows the
  // per-country totals on the rows.
  const generateRankVotes = (order: string[], reveal: boolean) => {
    const { votes: generated } = generateRankConsistentVotes({
      orderedCodes: order,
      stageCountries: stage.countries,
      votingCountries,
      voterChannels,
      target: rankTarget,
      votingMode: effectiveVotingMode,
      juryPointsSystem: pointsSystem,
      televotePointsSystem: effectiveTelevotePointsSystem,
      randomnessLevel,
      pointsSpread,
      allowMultiplePointsToSameEntry,
    });

    setVotes((prev) => {
      const next: Partial<StageVotes> = prev ? { ...prev } : {};

      // Merge every channel the generator produced (COMBINED writes three).
      Object.keys(generated).forEach((ch) => {
        (next as any)[ch] = (generated as any)[ch];
      });

      return next;
    });
    setIsSorting(true);
    if (reveal) setShowRankPoints(true);
  };

  const targetChannelsEmpty = (): boolean =>
    rankChannels.every((ch) => {
      const byVoter = (votes as any)?.[ch];

      return !byVoter || Object.keys(byVoter).length === 0;
    });

  // Entering the rank view (or switching the active badge): seed the order from
  // the current votes. If the target has no votes yet, silently predefine a
  // baseline so the contest is playable even if the user never clicks
  // "Randomize points" — points stay hidden until they do.
  const enterRankMode = () => {
    const order = seedRankOrder();

    setRankOrder(order);
    if (targetChannelsEmpty()) {
      generateRankVotes(order, false);
    }
  };

  // Called on a drag reorder: the user redefined the intended order, so
  // regenerate the target channels to match it (keeping the current reveal).
  const reorderRank = (order: string[]) => {
    setRankOrder(order);
    generateRankVotes(order, showRankPoints);
  };

  // Called by the "Randomize points" button: re-roll the target channels for the
  // current order and reveal the resulting totals.
  const randomizeRankPoints = () => {
    const order = rankOrder ?? seedRankOrder();

    if (!rankOrder) setRankOrder(order);
    generateRankVotes(order, true);
  };

  // Called by the "Randomize ranking" button: run the standard odds-based engine
  // (`randomizeAll`) so the new ranking reflects the countries' actual odds, then
  // derive the rank order from the generated standings. The reveal state is left
  // as-is so the ranking and points can be randomized independently.
  const randomizeRankOrder = () => {
    const generated = randomizeAll();
    const totals = totalsForChannels(generated || {}, rankChannels, stageCodes);
    const order = [...stage.countries]
      .sort((a: any, b: any) => (totals[b.code] || 0) - (totals[a.code] || 0))
      .map((c: any) => c.code);

    setRankOrder(order);
  };

  // Per target channel (jury/televote for JURY_AND_TELEVOTE, one otherwise), the
  // budget/feasibility numbers that drive the budget bar — cheap, no generation.
  const getTotalsChannelBudgets = (): Array<{
    channel: RankChannel;
    field: TargetField;
    budget: ChannelBudget;
  }> => {
    const { targetChannels } = resolveTargetChannels(
      effectiveVotingMode,
      pointsSystem,
      effectiveTelevotePointsSystem,
    );

    return targetChannels.map(({ channel, field, pointsSystem: ps }) => ({
      channel,
      field,
      budget: computeChannelBudget(
        channel,
        ps,
        votingCountries,
        stage.countries.length,
        voterChannels,
      ),
    }));
  };

  // Generate a best-fit per-voter breakdown from the typed target totals and
  // merge it into `votes`. Marks the breakdown "fresh" (Save allowed) and records
  // the achieved totals + any adjustments (targets the ballot math couldn't hit).
  const generateFromTotals = (
    targets: Record<string, ManualShareTotalsRow>,
  ) => {
    const {
      votes: generated,
      achieved,
      adjustments,
    } = generateVotesForTargets({
      targets,
      stageCountries: stage.countries,
      votingCountries,
      voterChannels,
      votingMode: effectiveVotingMode,
      juryPointsSystem: pointsSystem,
      televotePointsSystem: effectiveTelevotePointsSystem,
      randomnessLevel,
      pointsSpread,
      allowMultiplePointsToSameEntry,
    });

    setVotes((prev) => {
      const next: Partial<StageVotes> = prev ? { ...prev } : {};

      Object.keys(generated).forEach((ch) => {
        (next as any)[ch] = (generated as any)[ch];
      });

      return next;
    });
    setIsSorting(true);
    setTotalsAchieved(achieved);
    setTotalsAdjustments(adjustments);
    setTotalsStatus('fresh');

    // Returned so the caller can report how many targets had to be adjusted.
    return adjustments;
  };

  // Called when a target input changes after generating: the breakdown no longer
  // reflects the inputs, so Save is disabled until the user regenerates.
  const markTotalsStale = () => {
    setTotalsStatus((s) => (s === 'fresh' ? 'stale' : s));
  };

  // Read the current matrix back out as per-channel totals, so entering the
  // Totals view mirrors whatever Detailed/Rank produced. Returns null when the
  // target channels are empty — seeding zeros would pin every country to 0.
  const getTotalsFromVotes = (): Record<
    string,
    ManualShareTotalsRow
  > | null => {
    const { targetChannels } = resolveTargetChannels(
      effectiveVotingMode,
      pointsSystem,
      effectiveTelevotePointsSystem,
    );
    const rows: Record<string, ManualShareTotalsRow> = {};
    let hasAny = false;

    targetChannels.forEach(({ channel, field }) => {
      const byVoter = (votes as any)?.[channel];

      if (!byVoter || Object.keys(byVoter).length === 0) return;

      hasAny = true;

      const channelTotals = totalsForChannels(
        votes || {},
        [channel],
        stageCodes,
      );

      stageCodes.forEach((code) => {
        rows[code] = {
          ...(rows[code] || {}),
          [field]: channelTotals[code] || 0,
        };
      });
    });

    return hasAny ? rows : null;
  };

  // The totals inputs now mirror the matrix exactly, so the breakdown is in sync
  // (Save allowed) and there is nothing that was adjusted away from a target.
  const markTotalsSynced = () => {
    setTotalsStatus('fresh');
    setTotalsAdjustments([]);
    setTotalsAchieved({});
  };

  // Edits read and write through a ref as well as state, so two edits in one
  // tick (a commit on blur, then a pick) never work from a stale matrix.
  const votesRef = useRef(votes);

  votesRef.current = votes;

  const activeSource = getActiveSource();
  /** The points of the channel being edited (the bar's chips). */
  const activePointsSystem = activeSource
    ? getPointsSystemForSource(activeSource)
    : displayPointsSystem;
  /** Several points per entry apply to the jury only. */
  const isMultipleActive =
    allowMultiplePointsToSameEntry && activeSource === 'jury';

  /**
   * The most one cell can show, for the shading: the channel's top value, or
   * a jury and a televote top value summed on Total.
   */
  const maxValue = (system: readonly { value: number }[]) =>
    Math.max(0, ...system.map((item) => item.value));
  const cellTop = activeSource
    ? maxValue(activePointsSystem)
    : effectiveVotingMode === StageVotingMode.JURY_AND_TELEVOTE
    ? maxValue(pointsSystem) + maxValue(effectiveTelevotePointsSystem)
    : maxValue(pointsSystem);

  /** `voterCode`'s ballot in the channel being edited. */
  const getBallot = (voterCode: string): Vote[] =>
    (activeSource && votesRef.current?.[activeSource]?.[voterCode]) || [];

  /**
   * Runs one ballot edit on the channel being edited and returns what
   * happened (null on the read-only Total tab).
   */
  const editBallot = (
    voterCode: string,
    edit: (ballot: Vote[]) => BallotEdit,
  ): BallotEdit | null => {
    const source = getActiveSource();

    if (!source) return null;

    const prev = votesRef.current;
    const result = edit(prev?.[source]?.[voterCode] || []);

    if (result.outcome.kind === 'unchanged') return result;

    const next: Partial<StageVotes> = {
      ...(prev ?? {}),
      [source]: { ...(prev?.[source] ?? {}), [voterCode]: result.ballot },
    };

    votesRef.current = next;
    setVotes(next);

    return result;
  };

  /** Typing into a cell: see `typeCellValue`. */
  const applyInputValue = (
    participantCode: string,
    voterCode: string,
    rawValue: string,
  ): CellOutcome | null =>
    editBallot(voterCode, (ballot) =>
      typeCellValue(
        ballot,
        participantCode,
        rawValue,
        activePointsSystem,
        isMultipleActive,
      ),
    )?.outcome ?? null;

  /** A chip picked in the points bar: see `pickCellPoint`. */
  const pickPoint = (
    participantCode: string,
    voterCode: string,
    pointsId: number,
  ): CellOutcome | null =>
    editBallot(voterCode, (ballot) =>
      pickCellPoint(
        ballot,
        participantCode,
        pointsId,
        activePointsSystem,
        isMultipleActive,
      ),
    )?.outcome ?? null;

  const clearCellPoints = (participantCode: string, voterCode: string) =>
    editBallot(voterCode, (ballot) => clearCell(ballot, participantCode))
      ?.outcome ?? null;

  /**
   * "Whole vote" mode: a tap on a row gives the voter's next value (or takes
   * back what the row has). Returns the ballot after the tap.
   */
  const giveNext = (
    participantCode: string,
    voterCode: string,
    preferredId: number | null,
  ): Vote[] =>
    editBallot(voterCode, (ballot) =>
      giveNextPoint(
        ballot,
        participantCode,
        activePointsSystem,
        isMultipleActive,
        preferredId,
      ),
    )?.ballot ?? getBallot(voterCode);

  const clearBallot = (voterCode: string) => {
    const source = getActiveSource();
    const prev = votesRef.current;

    if (!source || !prev?.[source]?.[voterCode]) return;

    const rest = { ...prev[source] };

    delete rest[voterCode];

    const next = { ...prev, [source]: rest };

    votesRef.current = next;
    setVotes(next);
  };

  /** The channels the open tab shows: one, or all the mode uses on Total. */
  const getScopeChannels = (): Array<'jury' | 'televote'> => {
    const source = getActiveSource();

    if (source) return [source];

    return effectiveVotingMode === StageVotingMode.JURY_ONLY
      ? ['jury']
      : effectiveVotingMode === StageVotingMode.TELEVOTE_ONLY
      ? ['televote']
      : ['jury', 'televote'];
  };

  /** Whether the open tab's channels hold any points yet. */
  const hasVotesInScope = () =>
    getScopeChannels().some((channel) =>
      Object.values(votesRef.current?.[channel] ?? {}).some(
        (ballot) => ballot.length > 0,
      ),
    );

  /**
   * "Fill the rest": gives every incomplete ballot on the open tab (or just
   * `voterCode`'s) its missing points at random, keeping every point already
   * given. Returns how many ballots changed.
   */
  const fillVotesRandomly = (voterCode?: string): number => {
    const channels = getScopeChannels();
    const prev = votesRef.current;
    const next = completeStageVotes({
      votes: prev,
      channels,
      voterCodes: voterCode ? [voterCode] : undefined,
      completeCombined: !getActiveSource(),
      stageCountries: stage.countries,
      votingCountries,
      votingMode: effectiveVotingMode,
      countryOdds,
      randomnessLevel,
      pointsSpread,
      juryPointsSystem: pointsSystem,
      televotePointsSystem: effectiveTelevotePointsSystem,
      allowMultiplePointsToSameEntry,
      diaspora: resolveDiaspora(diasporaSettings),
      voterChannels,
    });
    const changed = (['jury', 'televote', 'combined'] as const).reduce(
      (count, channel) =>
        count +
        Object.keys(next[channel] ?? {}).filter(
          (code) => next[channel]![code] !== prev?.[channel]?.[code],
        ).length,
      0,
    );

    if (changed > 0) {
      votesRef.current = next;
      setVotes(next);
    }

    return changed;
  };

  const getVoterValidity = (voterCode: string) => {
    const source = getActiveSource();

    if (!source || !votes) return null;

    const used = (votes as any)[source]?.[voterCode] || [];

    if (!used || used.length === 0) return 'incomplete';

    const expectedIds = getPointsSystemForSource(source).map((p) => p.id);

    const usedIds = used.map((v: any) => v.pointsId);

    const hasAll = expectedIds.every((id) => usedIds.includes(id));
    const noDuplicates = new Set(usedIds).size === usedIds.length;

    if (!noDuplicates) return 'invalid';
    if (hasAll && usedIds.length === expectedIds.length) return 'valid';

    return hasAll ? 'invalid' : 'incomplete';
  };

  const getTotalPointsForCountry = (countryCode: string): number => {
    if (!votes) return 0;

    const addFrom = (arr: any[] | undefined, acc: number) => {
      if (!arr) return acc;

      for (const v of arr) {
        if (v.countryCode === countryCode) acc += v.points || 0;
      }

      return acc;
    };

    if (isTotalOrCombinedVoteType) {
      if (isCombinedVoting) {
        let sum = 0;

        Object.values(votes.combined || {}).forEach((a: any) => {
          sum = addFrom(a as any[], sum);
        });

        return sum;
      }

      let sum = 0;

      Object.values(votes.jury || {}).forEach((a: any) => {
        sum = addFrom(a as any[], sum);
      });
      Object.values(votes.televote || {}).forEach((a: any) => {
        sum = addFrom(a as any[], sum);
      });

      return sum;
    }

    const source = getActiveSource() || 'televote';
    let sum = 0;

    Object.values(votes[source] || {}).forEach((a: any) => {
      sum = addFrom(a as any[], sum);
    });

    return sum;
  };

  const getCellValue = (participantCode: string, voterCode: string): number => {
    if (!votes) return 0;

    if (isTotalOrCombinedVoteType) {
      const juryArr = votes.jury?.[voterCode] || [];
      const televoteArr = votes.televote?.[voterCode] || [];
      const combinedArr = votes.combined?.[voterCode] || [];
      const arr = isCombinedVoting ? combinedArr : [...juryArr, ...televoteArr];
      const found = arr
        .filter((v: any) => v.countryCode === participantCode)
        .reduce((acc, v) => acc + v.points, 0);

      return found || 0;
    }

    const source = getActiveSource() || 'televote';
    const arr = votes?.[source]?.[voterCode] || [];
    const total = arr
      .filter((v: any) => v.countryCode === participantCode)
      .reduce((acc: number, v: any) => acc + v.points, 0);

    return total || 0;
  };

  const rankedCountries = (() => {
    const totals: Record<string, number> = {};

    stage.countries.forEach((c) => {
      totals[c.code] = 0;
    });
    if (votes) {
      const add = (arr: any[]) => {
        arr.forEach((v) => {
          totals[v.countryCode] = (totals[v.countryCode] || 0) + v.points;
        });
      };

      if (selectedType === 'Total') {
        if (isCombinedVoting) {
          Object.values(votes.combined || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
        } else {
          Object.values(votes.jury || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
          Object.values(votes.televote || {}).forEach((arr: any) =>
            add(arr as any[]),
          );
        }
      } else if (selectedType === StageVotingType.JURY) {
        Object.values(votes.jury || {}).forEach((arr: any) =>
          add(arr as any[]),
        );
      } else {
        Object.values(votes.televote || {}).forEach((arr: any) =>
          add(arr as any[]),
        );
      }
    }
    const withRank = [...stage.countries]
      .sort((a, b) => (totals[b.code] || 0) - (totals[a.code] || 0))
      .map((c, i) => ({ ...c, rank: i + 1 }));
    const finalCountries = isSorting
      ? withRank
      : withRank.sort((a, b) => a.name.localeCompare(b.name));

    return finalCountries as Array<BaseCountry & { rank: number }>;
  })();

  const validateAllBeforeSave = () => {
    const modesToValidate: Array<'jury' | 'televote'> = [];

    if (
      effectiveVotingMode === StageVotingMode.JURY_AND_TELEVOTE ||
      effectiveVotingMode === StageVotingMode.COMBINED
    ) {
      modesToValidate.push('jury', 'televote');
    } else if (effectiveVotingMode === StageVotingMode.JURY_ONLY) {
      modesToValidate.push('jury');
    } else if (effectiveVotingMode === StageVotingMode.TELEVOTE_ONLY) {
      modesToValidate.push('televote');
    }

    const errors: Array<{ label: string; reasons: string[] }> = [];

    for (const mode of modesToValidate) {
      const expected = getPointsSystemForSource(mode).map((p) => ({
        id: p.id,
        value: p.value,
      }));

      for (const voter of votingCountries) {
        if (!isVoterInChannel(voter.code, mode, voterChannels)) continue;

        const arr: any[] = (votes as any)?.[mode]?.[voter.code] || [];
        const usedIds: number[] = arr.map((v) => v.pointsId as number);
        const reasons: string[] = [];

        const missingValues = expected
          .filter((p) => !usedIds.includes(p.id))
          .map((p) => p.value);

        if (missingValues.length > 0) {
          reasons.push(
            `not all points are used (missing: ${missingValues.join(', ')})`,
          );
        }

        const countsById = new Map<number, number>();

        for (const id of usedIds)
          countsById.set(id, (countsById.get(id) || 0) + 1);

        const duplicateIds: number[] = Array.from(countsById.entries())
          .filter(([, count]) => count > 1)
          .map(([id]) => id);

        if (duplicateIds.length > 0) {
          const duplicateValues = expected
            .filter((p) => duplicateIds.includes(p.id))
            .map((p) => p.value);

          reasons.push(`duplicate points (${duplicateValues.join(', ')})`);
        }

        if (usedIds.length > expected.length) {
          reasons.push('too many assignments');
        }
        if (usedIds.length === 0) {
          reasons.push('no points assigned');
        }
        if (reasons.length > 0) {
          const label = `${voter.name} (${mode})`;

          errors.push({ label, reasons });
        }
      }
    }

    return { ok: errors.length === 0, errors } as const;
  };

  const importVotesFromSpreadsheet = useCallback(
    async (file: File): Promise<VoteSpreadsheetActionResult> => {
      if (allowMultiplePointsToSameEntry) {
        return { ok: false, reason: 'multiple-points-blocked' };
      }

      const result = await importVotesFromSpreadsheetFile(file, {
        participants: stage.countries.map((c: any) => ({
          code: c.code,
          name: c.name,
        })),
        voters: votingCountries.map((c) => ({
          code: c.code,
          name: c.name,
        })),
        juryPointsSystem: pointsSystem,
        televotePointsSystem: effectiveTelevotePointsSystem,
        votingMode: effectiveVotingMode,
      });

      if (!result.ok) {
        return {
          ok: false,
          reason: result.error,
          unmatched: result.unmatched,
          skippedSections: result.skippedSections,
        };
      }

      const nextVotes = mergeImportedVotes(votes, {
        jury: result.votes.jury,
        televote: result.votes.televote,
        combined: result.votes.combined,
        unmatched: result.unmatched,
        skippedSections: result.skippedSections,
        appliedCells: result.appliedCells,
      });

      if (
        effectiveVotingMode === StageVotingMode.COMBINED &&
        !result.votes.combined &&
        (nextVotes.jury || nextVotes.televote)
      ) {
        nextVotes.combined = buildCombinedBallotsFromJuryTelevote(
          stage.countries,
          votingCountries,
          nextVotes.jury ?? {},
          nextVotes.televote ?? {},
          pointsSystem,
          voterChannels,
        );
      }

      setVotes(nextVotes);
      setIsSorting(true);

      return {
        ok: true,
        appliedCells: result.appliedCells,
        invalidVoters: getInvalidVotersForVotes(
          nextVotes,
          votingCountries,
          pointsSystem,
          effectiveTelevotePointsSystem,
          effectiveVotingMode,
          voterChannels,
        ),
        skippedSections: result.skippedSections,
        unmatched: result.unmatched,
      };
    },
    [
      allowMultiplePointsToSameEntry,
      effectiveTelevotePointsSystem,
      effectiveVotingMode,
      pointsSystem,
      stage.countries,
      voterChannels,
      votes,
      votingCountries,
    ],
  );

  const exportVotesToSpreadsheet = useCallback(
    async (filename: string): Promise<VoteSpreadsheetActionResult> => {
      const participants = rankedCountries.map((country) => ({
        code: country.code,
        name: country.name,
        rank: country.rank,
      }));

      const getParticipantTotal = (
        code: string,
        source: 'jury' | 'televote' | 'combined',
      ) => {
        if (!votes) return 0;

        const sumFrom = (channel: 'jury' | 'televote' | 'combined') => {
          let sum = 0;

          Object.values(votes[channel] ?? {}).forEach((ballot) => {
            ballot
              .filter((vote) => vote.countryCode === code)
              .forEach((vote) => {
                sum += vote.points;
              });
          });

          return sum;
        };

        if (
          source === 'combined' &&
          effectiveVotingMode === StageVotingMode.JURY_AND_TELEVOTE
        ) {
          return sumFrom('jury') + sumFrom('televote');
        }

        return sumFrom(source);
      };

      const sections = buildExportSectionsForStageVotes({
        stageName: stage.name,
        votingMode: effectiveVotingMode,
        participants,
        voters: votingCountries.map((c) => ({ code: c.code, name: c.name })),
        votes,
        getParticipantTotal,
      });

      if (sections.length === 0) {
        return { ok: false, reason: 'export-unavailable' };
      }

      await downloadVoteSpreadsheet({ filename, sections });

      return {
        ok: true,
        appliedCells: 0,
        invalidVoters: [],
        skippedSections: [],
        unmatched: [],
      };
    },
    [effectiveVotingMode, rankedCountries, stage.name, votes, votingCountries],
  );

  useEffect(() => {
    if (stage.id !== lastStageId) {
      reseedVotesForStage();
    }
    setLastStageId(stage.id);
  }, [stage.id, lastStageId]);

  useEffect(() => {
    if (effectiveVotingMode !== lastStageVotingMode) {
      reseedVotesForStage();
    }
    setLastStageVotingMode(effectiveVotingMode);
  }, [effectiveVotingMode, lastStageVotingMode]);

  return {
    // stores & config
    pointsSystem,
    displayPointsSystem,
    // state
    selectedType,
    setSelectedType,
    votes,
    setVotes,
    isSorting,
    setIsSorting,
    // derived
    isCombinedVoting,
    totalBadgeLabel,
    isTotalVoteType,
    isTotalOrCombinedVoteType,
    /** Voters shown as columns on the selected tab. */
    votingCountries: visibleVotingCountries,
    /** Every voter of the stage regardless of channel. */
    allVotingCountries: votingCountries,
    voteTypeOptions,
    rankedCountries,
    // actions
    randomizeAll,
    resetVotes,
    applyInputValue,
    pickPoint,
    clearCellPoints,
    giveNext,
    clearBallot,
    fillVotesRandomly,
    hasVotesInScope,
    // editing
    activeSource,
    activePointsSystem,
    isMultipleActive,
    cellTop,
    getBallot,
    // getters
    getVoterValidity,
    getTotalPointsForCountry,
    getCellValue,
    // rank view
    rankTarget,
    rankChannels,
    rankOrder,
    showRankPoints,
    getRankTotals,
    enterRankMode,
    reorderRank,
    randomizeRankPoints,
    randomizeRankOrder,
    generateRankVotes,
    seedRankOrder,
    // totals view
    totalsStatus,
    totalsAdjustments,
    totalsAchieved,
    getTotalsChannelBudgets,
    generateFromTotals,
    markTotalsStale,
    resetTotalsGeneration,
    getTotalsFromVotes,
    markTotalsSynced,
    // validation
    validateAllBeforeSave,
    importVotesFromSpreadsheet,
    exportVotesToSpreadsheet,
  };
};

export type UseVotingPredefinitionReturn = ReturnType<
  typeof useVotingPredefinition
>;
