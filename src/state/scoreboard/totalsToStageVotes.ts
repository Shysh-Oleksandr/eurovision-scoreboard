import {
  BaseCountry,
  Country,
  PointsItem,
  StageVotingMode,
  VoterChannels,
  VotingCountry,
} from '../../models';

import { RankChannel, totalsForChannels } from './rankToStageVotes';
import { ManualShareTotalsRow, StageVotes, Vote } from './types';
import { filterVotersByChannel } from './voterChannels';
import { predefineStageVotes } from './votesPredefinition';

/*
 * Totals-based voting predefinition.
 *
 * The user types a target TOTAL per participant (per channel), and we generate a
 * per-voter matrix whose column sums best-fit those targets via largest-remainder
 * assignment: each voter hands its highest point value to the country furthest
 * below its target, and so on. This is a deterministic apportionment with no
 * local minima — unlike a random draw plus swap-repair, it hits the targets
 * tightly in a single O(voters × points × countries) pass. (For COMBINED voting
 * the untargeted jury/televote channels, needed only for save-validation, are
 * still filled by the random engine `predefineStageVotes`.)
 *
 * Unlike the rank feature (which only enforces an ORDER), arbitrary target
 * magnitudes are not always achievable by a valid ballot matrix: each voter hands
 * out the fixed points set once, so a channel's total is fixed at
 * `voters × sum(pointsSystem)` and any single country tops out at `voters × 12`.
 * We therefore clamp infeasible targets up-front (Gale–Ryser prefix bound) and
 * report whatever the assignment still can't reach as an "adjustment", so the
 * caller can explain why a number changed.
 */

/** Which manual-totals field a channel reads its target from. */
export type TargetField = 'jury' | 'televote' | 'combined';

interface TargetChannelSpec {
  channel: RankChannel;
  field: TargetField;
  pointsSystem: PointsItem[];
}

interface ResolvedTargetChannels {
  engineMode: StageVotingMode;
  /** Channels to keep from the engine output and write into `votes`. */
  mergeChannels: RankChannel[];
  /** Channels whose totals are fitted to the user's targets. */
  targetChannels: TargetChannelSpec[];
}

/**
 * Resolve which engine mode a voting mode uses, which channels to keep, and which
 * channels are target-fitted. Mirrors `resolveRankTarget`: COMBINED keeps
 * jury+televote (they gate save-validation) but only fits the `combined` channel.
 */
export const resolveTargetChannels = (
  votingMode: StageVotingMode,
  juryPointsSystem: PointsItem[],
  televotePointsSystem: PointsItem[],
): ResolvedTargetChannels => {
  if (votingMode === StageVotingMode.COMBINED) {
    return {
      engineMode: StageVotingMode.COMBINED,
      mergeChannels: ['jury', 'televote', 'combined'],
      // The engine builds combined ballots from the jury points system.
      targetChannels: [
        {
          channel: 'combined',
          field: 'combined',
          pointsSystem: juryPointsSystem,
        },
      ],
    };
  }
  if (votingMode === StageVotingMode.JURY_ONLY) {
    return {
      engineMode: StageVotingMode.JURY_ONLY,
      mergeChannels: ['jury'],
      targetChannels: [
        { channel: 'jury', field: 'jury', pointsSystem: juryPointsSystem },
      ],
    };
  }
  if (votingMode === StageVotingMode.TELEVOTE_ONLY) {
    return {
      engineMode: StageVotingMode.TELEVOTE_ONLY,
      mergeChannels: ['televote'],
      targetChannels: [
        {
          channel: 'televote',
          field: 'televote',
          pointsSystem: televotePointsSystem,
        },
      ],
    };
  }

  // JURY_AND_TELEVOTE: two independent target channels.
  return {
    engineMode: StageVotingMode.JURY_AND_TELEVOTE,
    mergeChannels: ['jury', 'televote'],
    targetChannels: [
      { channel: 'jury', field: 'jury', pointsSystem: juryPointsSystem },
      {
        channel: 'televote',
        field: 'televote',
        pointsSystem: televotePointsSystem,
      },
    ],
  };
};

// Only voters eligible for the channel award points (by default the "WW"
// Rest of the World voter is televote-only), mirroring `predefineStageVotes`.
const channelVoterCount = (
  channel: RankChannel,
  votingCountries: VotingCountry[],
  voterChannels?: VoterChannels,
): number =>
  filterVotersByChannel(votingCountries, channel, voterChannels).length;

export interface ChannelBudget {
  /** Voters awarding in this channel. */
  voters: number;
  /** Points a single voter hands out (top `numAwardable` values). */
  perVoterSum: number;
  /** Total points across the channel: `voters × perVoterSum`. */
  budget: number;
  /** prefixSum[r] = sum of the top r point values (r = 0..numAwardable). */
  prefixSum: number[];
  /** Points slots a voter can fill (min of points system size and rivals). */
  numAwardable: number;
  /** The highest single point value (e.g. 12). */
  maxValue: number;
}

const sortedValuesDesc = (pointsSystem: PointsItem[]): number[] =>
  pointsSystem.map((p) => p.value).sort((a, b) => b - a);

export const computeChannelBudget = (
  channel: RankChannel,
  pointsSystem: PointsItem[],
  votingCountries: VotingCountry[],
  participantsCount: number,
  voterChannels?: VoterChannels,
): ChannelBudget => {
  const voters = channelVoterCount(channel, votingCountries, voterChannels);
  const values = sortedValuesDesc(pointsSystem);
  // A voter can't award more distinct points than there are rival participants.
  const numAwardable = Math.max(
    0,
    Math.min(values.length, participantsCount - 1),
  );
  const top = values.slice(0, numAwardable);
  const prefixSum: number[] = [0];

  top.forEach((v, i) => prefixSum.push(prefixSum[i] + v));

  return {
    voters,
    perVoterSum: prefixSum[numAwardable] ?? 0,
    budget: voters * (prefixSum[numAwardable] ?? 0),
    prefixSum,
    numAwardable,
    maxValue: top[0] ?? 0,
  };
};

/** Max total the top-r countries can jointly receive (Gale–Ryser prefix bound). */
const prefixBound = (b: ChannelBudget, r: number): number => {
  const slots = Math.min(r, b.numAwardable);

  return b.voters * b.prefixSum[slots];
};

/** Max total any single country can receive: every voter's top value. */
export const channelSingleMax = (b: ChannelBudget): number =>
  b.voters * b.maxValue;

/**
 * Clamp pinned targets so every prefix sum is feasible. Sorting descending and
 * enforcing `sum(top r) ≤ prefixBound(r)` in one pass also caps each entry to the
 * single-country max (r = 1) and the whole channel to its budget (r large).
 */
export const clampChannelTargets = (
  pinned: Record<string, number>,
  budget: ChannelBudget,
): Record<string, number> => {
  const entries = Object.entries(pinned).sort((a, b) => b[1] - a[1]);
  const clamped: Record<string, number> = {};
  let cum = 0;

  entries.forEach(([code, value], i) => {
    const allowedCum = prefixBound(budget, i + 1);
    let v = Math.max(0, value);

    if (cum + v > allowedCum) {
      v = Math.max(0, allowedCum - cum);
    }
    clamped[code] = v;
    cum += v;
  });

  return clamped;
};

// Spread the leftover budget (after pinned targets) evenly across the blank
// countries so the effective targets sum to the channel budget.
const buildEffectiveTargets = (
  clamped: Record<string, number>,
  codes: string[],
  budget: number,
): Record<string, number> => {
  const pinnedSum = Object.values(clamped).reduce((s, v) => s + v, 0);
  const freeCodes = codes.filter((c) => !(c in clamped));
  const perFree =
    freeCodes.length > 0
      ? Math.max(0, budget - pinnedSum) / freeCodes.length
      : 0;
  const eff: Record<string, number> = {};

  codes.forEach((c) => {
    eff[c] = c in clamped ? clamped[c] : perFree;
  });

  return eff;
};

/**
 * Build a valid per-voter ballot matrix for one channel whose column sums best-
 * fit `effectiveTargets`, using largest-remainder assignment: each voter gives
 * its highest point value to the eligible country furthest below its target, the
 * next value to the next-furthest, and so on. Every voter uses each point id
 * once on a distinct non-self recipient, so the result is always save-valid.
 * Deterministic apportionment — no local minima, O(voters × points × countries).
 */
export const constructChannelTowardTargets = (
  pointsSystem: PointsItem[],
  votingCountries: VotingCountry[],
  channel: RankChannel,
  codes: string[],
  effectiveTargets: Record<string, number>,
  voterChannels?: VoterChannels,
): Record<string, Vote[]> => {
  const voters = filterVotersByChannel(votingCountries, channel, voterChannels);
  const items = [...pointsSystem].sort((a, b) => b.value - a.value);
  const awarded: Record<string, number> = {};

  codes.forEach((c) => {
    awarded[c] = 0;
  });

  const byVoter: Record<string, Vote[]> = {};

  voters.forEach((voter) => {
    const used = new Set<string>();
    const ballot: Vote[] = [];

    for (const item of items) {
      let bestCode: string | null = null;
      let bestRemaining = -Infinity;

      for (const code of codes) {
        if (code === voter.code || used.has(code)) continue;

        const remaining = (effectiveTargets[code] ?? 0) - awarded[code];

        if (remaining > bestRemaining) {
          bestRemaining = remaining;
          bestCode = code;
        }
      }

      if (bestCode === null) break; // fewer rivals than point slots

      used.add(bestCode);
      awarded[bestCode] += item.value;
      ballot.push({
        countryCode: bestCode,
        points: item.value,
        pointsId: item.id,
        showDouzePointsAnimation: !!item.showDouzePoints,
      });
    }

    byVoter[voter.code] = ballot;
  });

  return byVoter;
};

export interface GenerateTargetVotesArgs {
  /** Typed targets per participant code (jury/televote/combined fields). */
  targets: Record<string, ManualShareTotalsRow>;
  stageCountries: (Country | BaseCountry)[];
  votingCountries: VotingCountry[];
  /** Per-voter channel eligibility overrides (see `voterChannels.ts`). */
  voterChannels?: VoterChannels;
  votingMode: StageVotingMode;
  juryPointsSystem: PointsItem[];
  televotePointsSystem: PointsItem[];
  randomnessLevel: number;
  pointsSpread: number;
  allowMultiplePointsToSameEntry?: boolean;
}

export interface TargetAdjustment {
  code: string;
  /** Sum of the channels the user pinned for this code. */
  requested: number;
  /** Closest achievable sum across those same channels. */
  achieved: number;
}

export interface TargetVotesResult {
  /** Channels this mode writes; merge into the existing votes. */
  votes: Partial<StageVotes>;
  /** Per-code achieved display total from the generated matrix. */
  achieved: Record<string, number>;
  /** Codes whose pinned targets couldn't be hit exactly. */
  adjustments: TargetAdjustment[];
  mergeChannels: RankChannel[];
}

/**
 * Generate a per-voter matrix whose column sums best-fit the typed target totals,
 * ready to Save and simulate. Diaspora affinity is disabled — the targets are
 * explicit user intent. Returns the votes plus the achieved totals and the list
 * of adjustments (targets the ballot math couldn't reach exactly).
 */
export const generateVotesForTargets = ({
  targets,
  stageCountries,
  votingCountries,
  voterChannels,
  votingMode,
  juryPointsSystem,
  televotePointsSystem,
  randomnessLevel,
  pointsSpread,
  allowMultiplePointsToSameEntry = false,
}: GenerateTargetVotesArgs): TargetVotesResult => {
  const codes = stageCountries.map((c) => c.code);
  const participantsCount = codes.length;
  const { engineMode, mergeChannels, targetChannels } = resolveTargetChannels(
    votingMode,
    juryPointsSystem,
    televotePointsSystem,
  );

  const budgetByChannel: Record<string, ChannelBudget> = {};
  const requestedByChannel: Record<string, Record<string, number>> = {};
  const clampedByChannel: Record<string, Record<string, number>> = {};

  targetChannels.forEach(({ channel, field, pointsSystem }) => {
    const budget = computeChannelBudget(
      channel,
      pointsSystem,
      votingCountries,
      participantsCount,
      voterChannels,
    );
    const pinned: Record<string, number> = {};

    codes.forEach((code) => {
      const raw = targets[code]?.[field];

      if (raw !== undefined && raw !== null && Number.isFinite(raw)) {
        pinned[code] = Math.max(0, Math.round(raw));
      }
    });

    budgetByChannel[channel] = budget;
    requestedByChannel[channel] = pinned;
    clampedByChannel[channel] = clampChannelTargets(pinned, budget);
  });

  const targetChannelSet = new Set(targetChannels.map((tc) => tc.channel));
  const votes: Partial<StageVotes> = {};

  // Non-target merge channels (COMBINED's jury/televote) only need to be valid
  // and complete for save-validation, so fill them with the random engine.
  const nonTargetMerge = mergeChannels.filter(
    (ch) => !targetChannelSet.has(ch),
  );

  if (nonTargetMerge.length > 0) {
    const generated = predefineStageVotes(
      stageCountries,
      votingCountries,
      engineMode,
      {},
      randomnessLevel,
      pointsSpread,
      juryPointsSystem,
      televotePointsSystem,
      allowMultiplePointsToSameEntry,
      null, // diaspora off: the targets are explicit user intent
      voterChannels,
    );

    nonTargetMerge.forEach((channel) => {
      if ((generated as any)[channel]) {
        (votes as any)[channel] = (generated as any)[channel];
      }
    });
  }

  // Construct each target channel so its column sums best-fit the targets.
  const achievedByChannel: Record<string, Record<string, number>> = {};

  targetChannels.forEach(({ channel, pointsSystem }) => {
    const effectiveTargets = buildEffectiveTargets(
      clampedByChannel[channel],
      codes,
      budgetByChannel[channel].budget,
    );

    (votes as any)[channel] = constructChannelTowardTargets(
      pointsSystem,
      votingCountries,
      channel,
      codes,
      effectiveTargets,
      voterChannels,
    );
    achievedByChannel[channel] = totalsForChannels(votes, [channel], codes);
  });

  const achieved: Record<string, number> = {};
  const adjustments: TargetAdjustment[] = [];

  // Only report an adjustment when the miss exceeds one top point value: below
  // that it's just apportionment rounding (points are indivisible), not a
  // meaningful "we couldn't honor your number", so it shouldn't spam badges.
  const tolerance = Math.max(
    0,
    ...targetChannels.map(({ channel }) => budgetByChannel[channel].maxValue),
  );

  codes.forEach((code) => {
    let displayTotal = 0;
    let pinnedRequested = 0;
    let pinnedAchieved = 0;
    let isPinned = false;

    targetChannels.forEach(({ channel }) => {
      const channelAchieved = achievedByChannel[channel][code] || 0;

      displayTotal += channelAchieved;

      const req = requestedByChannel[channel][code];

      if (req !== undefined) {
        isPinned = true;
        pinnedRequested += req;
        pinnedAchieved += channelAchieved;
      }
    });

    achieved[code] = displayTotal;

    if (isPinned && Math.abs(pinnedRequested - pinnedAchieved) > tolerance) {
      adjustments.push({
        code,
        requested: pinnedRequested,
        achieved: pinnedAchieved,
      });
    }
  });

  return { votes, achieved, adjustments, mergeChannels };
};
