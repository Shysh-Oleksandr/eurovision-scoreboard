import { EventStage, PointsItem, StageId, StageVotingMode } from '../../models';
import type { VotingCountry } from '../../models';

import type { JuryScaleReveal, StageVotes, Vote } from './types';

/*
 * "Scale countdown" jury reveal (Junior Eurovision 2024 format).
 *
 * Instead of one spokesperson at a time, the board first reveals EVERY 1 point
 * awarded by EVERY jury at once, then every 2, then every 3 … up to the last
 * non-douze value ("scale" phase). Only then do the spokespersons appear, one at
 * a time, each announcing their 12 ("douze" phase).
 *
 * This module is pure. It never mutates state and never reads a store — the whole
 * reveal is a function of a 3-value cursor (phase, stepIndex, votingCountryIndex)
 * over the predefined vote matrix, which is complete before a stage starts. That
 * means nothing derived is stored, so the on-screen overlay can never desync from
 * the board, and the final jury totals are identical to the default flow by
 * construction.
 */

/** voting country code -> the votes that country awards. */
export type JuryVoteMatrix = Record<string, Vote[]>;

/** What one participant received in a single scale step. */
export type StepAward = {
  points: number;
  voterCodes: string[];
};

export type DouzeAwards = {
  /** Accumulated douze-tier points per participant across the voters considered. */
  totals: Record<string, number>;
  /** The last voter that actually awarded something (drives the single flag shown). */
  lastVoterCode: string | null;
  /** Who that last voter awarded to. */
  lastRecipientCodes: string[];
};

/**
 * The jury vote matrix for a stage. COMBINED stages store their single
 * (jury-shaped) pass under `combined`, mirroring `giveJuryPoints`.
 */
export const getJuryMatrix = (
  stage: EventStage | undefined,
  predefinedVotes: Record<string, Partial<StageVotes>>,
): JuryVoteMatrix | null => {
  if (!stage) return null;

  const key =
    stage.votingMode === StageVotingMode.COMBINED ? 'combined' : 'jury';

  return predefinedVotes[stage.id]?.[key] ?? null;
};

/**
 * The non-douze points, lowest first — one reveal step each. Grouping is by
 * `id`, not by value, so a points system with duplicate values still gets one
 * step per item.
 */
export const getScaleSteps = (pointsSystem: PointsItem[]): PointsItem[] =>
  pointsSystem
    .filter((pointsItem) => !pointsItem.showDouzePoints)
    .sort((a, b) => a.value - b.value || a.id - b.id);

/**
 * The points announced by a spokesperson. Usually a single "12", but the points
 * system allows several flagged items — a voter then awards all of theirs at once.
 */
export const getDouzeItems = (pointsSystem: PointsItem[]): PointsItem[] =>
  pointsSystem.filter((pointsItem) => pointsItem.showDouzePoints);

export const getDouzePointsIds = (pointsSystem: PointsItem[]): Set<number> =>
  new Set(getDouzeItems(pointsSystem).map((pointsItem) => pointsItem.id));

/**
 * Everyone who received `pointsId` this step, with the flags to show above them.
 *
 * Iterates `voters` rather than the matrix keys so the flag order is spokesperson
 * order and voters that do not vote in this phase (e.g. the televote-only
 * Rest of the World entry) are never counted.
 */
export const getStepAwards = (
  matrix: JuryVoteMatrix | null,
  pointsId: number,
  voters: VotingCountry[],
): Record<string, StepAward> => {
  const awards: Record<string, StepAward> = {};

  if (!matrix) return awards;

  voters.forEach((voter) => {
    const votes = matrix[voter.code];

    if (!votes) return;

    votes.forEach((vote) => {
      if (vote.pointsId !== pointsId) return;

      const existing = awards[vote.countryCode];

      if (existing) {
        existing.points += vote.points;

        if (!existing.voterCodes.includes(voter.code)) {
          existing.voterCodes.push(voter.code);
        }

        return;
      }

      awards[vote.countryCode] = {
        points: vote.points,
        voterCodes: [voter.code],
      };
    });
  });

  return awards;
};

/**
 * Douze-tier awards for voters in `[fromIndex, toIndexExclusive)`.
 *
 * Callers use it two ways: the view passes `(0, votingCountryIndex)` to get the
 * running total the overlay keeps on screen for the whole phase, and the action
 * passes `(i, i + 1)` to apply a single spokesperson's award.
 */
export const getDouzeAwards = (
  matrix: JuryVoteMatrix | null,
  douzePointsIds: Set<number>,
  voters: VotingCountry[],
  fromIndex: number,
  toIndexExclusive: number,
): DouzeAwards => {
  const totals: Record<string, number> = {};
  let lastVoterCode: string | null = null;
  let lastRecipientCodes: string[] = [];

  if (!matrix || douzePointsIds.size === 0) {
    return { totals, lastVoterCode, lastRecipientCodes };
  }

  const start = Math.max(0, fromIndex);
  const end = Math.min(toIndexExclusive, voters.length);

  for (let index = start; index < end; index += 1) {
    const voter = voters[index];
    const votes = matrix[voter.code];

    if (!votes) continue;

    const recipientCodes: string[] = [];

    votes.forEach((vote) => {
      if (!douzePointsIds.has(vote.pointsId)) return;

      totals[vote.countryCode] = (totals[vote.countryCode] ?? 0) + vote.points;

      if (!recipientCodes.includes(vote.countryCode)) {
        recipientCodes.push(vote.countryCode);
      }
    });

    if (recipientCodes.length > 0) {
      lastVoterCode = voter.code;
      lastRecipientCodes = recipientCodes;
    }
  }

  return { totals, lastVoterCode, lastRecipientCodes };
};

/** A cursor that claims nothing has been revealed yet. */
const freshCursor = (stageId: string): JuryScaleReveal => ({
  stageId,
  phase: 'scale',
  stepIndex: 0,
});

/**
 * The cursor for a stage, defaulting to the start of the countdown. Actions
 * self-initialise through this, so no eager setup is needed on stage transitions.
 *
 * The cursor is persisted, and stage ids are the shared constants SF1/SF2/GF —
 * so a cursor left over from a *different contest* matches on id alone. It is
 * therefore only trusted when the board agrees with it: a cursor claiming
 * progress against a stage with no jury points on it has to be stale, and
 * honouring it would silently skip the countdown and award only the 12s.
 */
export const resolveJuryScaleRevealCursor = (
  juryScaleReveal: JuryScaleReveal | null,
  stage: EventStage,
): JuryScaleReveal => {
  if (juryScaleReveal?.stageId !== stage.id) return freshCursor(stage.id);

  const claimsProgress =
    juryScaleReveal.phase !== 'scale' || juryScaleReveal.stepIndex > 0;
  const boardIsUntouched = stage.countries.every(
    (country) => country.juryPoints === 0,
  );

  return claimsProgress && boardIsUntouched
    ? freshCursor(stage.id)
    : juryScaleReveal;
};

/**
 * True while the countdown still has a step to reveal. Everything else — the
 * cursor sitting past the last step, an all-douze points system, an explicit
 * `douze`/`done` phase — means the spokespersons are up.
 *
 * Note the cursor deliberately stays in `scale` after the final step is awarded
 * so the last overlay remains on screen; the switch to `douze` happens on the
 * next advance, which awards in the same call rather than wasting a click.
 */
export const hasScaleStepsLeft = (
  cursor: JuryScaleReveal,
  scaleStepCount: number,
): boolean => cursor.phase === 'scale' && cursor.stepIndex < scaleStepCount;

/** A stage whose jury phase is also its final phase, so the reveal ends it. */
const isJuryTerminalStage = (stage: EventStage): boolean =>
  stage.votingMode === StageVotingMode.JURY_ONLY ||
  stage.votingMode === StageVotingMode.COMBINED;

/**
 * Whether normal jury voting has already put points on the board for this stage.
 * Guards against taking over mid-stage when the setting is switched on with a
 * simulation already running, which would re-award everything from step 0.
 */
const hasJuryVotingStarted = (
  stage: EventStage,
  votingCountryIndex: number,
  votingPointsIndex: number,
): boolean =>
  votingCountryIndex > 0 ||
  votingPointsIndex > 0 ||
  stage.countries.some((country) => country.juryPoints > 0);

export type JuryScaleRevealActivityParams = {
  stage: EventStage | undefined;
  enableJuryScaleReveal: boolean;
  isPickQualifiersMode: boolean;
  juryScaleReveal: JuryScaleReveal | null;
  votingCountryIndex: number;
  votingPointsIndex: number;
  viewedStageId: string | null;
  showAllParticipants: boolean;
};

/** Single source of truth for "is the bar board on screen right now". */
export const isJuryScaleRevealActive = ({
  stage,
  enableJuryScaleReveal,
  isPickQualifiersMode,
  juryScaleReveal,
  votingCountryIndex,
  votingPointsIndex,
  viewedStageId,
  showAllParticipants,
}: JuryScaleRevealActivityParams): boolean => {
  if (!enableJuryScaleReveal || !stage) return false;
  if (stage.votingMode === StageVotingMode.TELEVOTE_ONLY) return false;

  // Semi-finals in pick-qualifiers mode never run a jury phase at all.
  const isGrandFinal = stage.id.toUpperCase() === StageId.GF.toUpperCase();

  if (isPickQualifiersMode && !isGrandFinal) return false;

  // The bar board renders a single stage's participants, so the cross-stage
  // "show all participants" view and the finished-event stage picker fall back
  // to the normal scoreboard.
  if (showAllParticipants) return false;
  if (viewedStageId && viewedStageId !== stage.id) return false;

  const hasTakenOverStage = juryScaleReveal?.stageId === stage.id;

  if (stage.isJuryVoting) {
    return (
      hasTakenOverStage ||
      !hasJuryVotingStarted(stage, votingCountryIndex, votingPointsIndex)
    );
  }

  // Keep the bars up after the last douze on a stage the reveal itself ended.
  // The voting-mode guard matters: a JURY_AND_TELEVOTE stage also becomes
  // `isOver`, but only once televote has finished on the normal board.
  return (
    stage.isOver &&
    hasTakenOverStage &&
    juryScaleReveal.phase === 'done' &&
    isJuryTerminalStage(stage)
  );
};
