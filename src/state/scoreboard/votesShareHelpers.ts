import { Country, EventStage, StageVotingMode } from '../../models';

import type { StageVotes } from './types';

import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';

/*
 * Share adapters over a per-voter votes matrix.
 *
 * The mirror image of `manualShareTotalsHelpers` (which adapts hand-typed
 * totals): these derive the same `rankedCountries` / `getPoints` /
 * `countriesOverride` contracts the share pipeline expects, but from the real
 * `StageVotes` matrix. Because a matrix has per-voter detail, this source can
 * additionally drive the BREAKDOWN grid via `buildGetCellPointsFromVotes`.
 */

type Channel = 'jury' | 'televote' | 'combined';

/** Sum of points a country received in one channel, across all voters. */
const channelTotal = (
  votes: Partial<StageVotes> | null,
  channel: Channel,
  countryCode: string,
): number => {
  const byVoter = votes?.[channel];

  if (!byVoter) return 0;

  let sum = 0;

  Object.values(byVoter).forEach((ballot) => {
    ballot.forEach((vote) => {
      if (vote.countryCode === countryCode) sum += vote.points;
    });
  });

  return sum;
};

/** The total a country displays for a voting mode (mirrors `getDisplayTotal`). */
const displayTotal = (
  votingMode: StageVotingMode,
  votes: Partial<StageVotes> | null,
  countryCode: string,
): number => {
  if (votingMode === StageVotingMode.COMBINED) {
    return channelTotal(votes, 'combined', countryCode);
  }
  if (votingMode === StageVotingMode.JURY_ONLY) {
    return channelTotal(votes, 'jury', countryCode);
  }
  if (votingMode === StageVotingMode.TELEVOTE_ONLY) {
    return channelTotal(votes, 'televote', countryCode);
  }

  return (
    channelTotal(votes, 'jury', countryCode) +
    channelTotal(votes, 'televote', countryCode)
  );
};

export const buildGetPointsFromVotes = (
  votingMode: StageVotingMode,
  votes: Partial<StageVotes> | null,
) => {
  return (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ): number => {
    if (type === 'jury') {
      return toFixedIfDecimalFloat(channelTotal(votes, 'jury', country.code));
    }
    if (type === 'televote') {
      return toFixedIfDecimalFloat(
        channelTotal(votes, 'televote', country.code),
      );
    }

    // No type (or 'combined') means "the total shown" for this mode.
    return toFixedIfDecimalFloat(displayTotal(votingMode, votes, country.code));
  };
};

/**
 * What a single voter awarded a single participant, under "Total" semantics:
 * the `combined` channel for COMBINED voting, otherwise jury + televote. Drives
 * the BREAKDOWN grid; returns '' for an empty cell so the table renders blank.
 */
export const buildGetCellPointsFromVotes = (
  votingMode: StageVotingMode,
  votes: Partial<StageVotes> | null,
) => {
  return (participantCode: string, voterCode: string): string | number => {
    const sumFrom = (channel: Channel) =>
      (votes?.[channel]?.[voterCode] ?? [])
        .filter((vote) => vote.countryCode === participantCode)
        .reduce((acc, vote) => acc + vote.points, 0);

    const total =
      votingMode === StageVotingMode.COMBINED
        ? sumFrom('combined')
        : votingMode === StageVotingMode.JURY_ONLY
        ? sumFrom('jury')
        : votingMode === StageVotingMode.TELEVOTE_ONLY
        ? sumFrom('televote')
        : sumFrom('jury') + sumFrom('televote');

    return total ? toFixedIfDecimalFloat(total) : '';
  };
};

/** Stage countries ranked by the matrix totals, with the app's tiebreakers. */
export const buildRankedCountriesFromVotes = (
  stage: EventStage,
  votes: Partial<StageVotes> | null,
  votingMode: StageVotingMode,
): (Country & { rank: number })[] => {
  const orderMap =
    stage.runningOrder && stage.runningOrder.length > 0
      ? new Map(stage.runningOrder.map((code, idx) => [code, idx]))
      : null;

  const withPoints = stage.countries.map((c) => ({
    ...c,
    juryPoints: channelTotal(votes, 'jury', c.code),
    televotePoints: channelTotal(votes, 'televote', c.code),
    points: displayTotal(votingMode, votes, c.code),
  }));

  const sorted = [...withPoints].sort((a, b) => {
    const pointsComparison = b.points - a.points;

    if (pointsComparison !== 0) return pointsComparison;

    const televoteComparison = b.televotePoints - a.televotePoints;

    if (televoteComparison !== 0) return televoteComparison;

    if (orderMap) {
      const aIdx = orderMap.get(a.code);
      const bIdx = orderMap.get(b.code);

      if (aIdx !== undefined && bIdx !== undefined && aIdx !== bIdx) {
        return aIdx - bIdx;
      }
    }

    return a.name.localeCompare(b.name);
  });

  return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
};

export const buildCountriesOverrideForPodiumFromVotes = (
  stage: EventStage,
  votes: Partial<StageVotes> | null,
  votingMode: StageVotingMode,
): Country[] => {
  const ranked = buildRankedCountriesFromVotes(stage, votes, votingMode);

  return ranked.map((c) => ({
    ...c,
    lastReceivedPoints: null,
    isVotingFinished: true,
  }));
};
