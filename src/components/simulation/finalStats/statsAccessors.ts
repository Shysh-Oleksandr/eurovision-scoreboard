import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';
import {
  Country,
  EventStage,
  StageVotingMode,
  StageVotingType,
} from '@/models';
import type { StageVotes } from '@/state/scoreboard/types';

export type StatsVoteType = 'Total' | StageVotingType;

export interface StatsAccessors {
  rankedCountries: (Country & { rank: number })[];
  getPoints: (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ) => number;
  getCellPoints: (
    participantCode: string,
    voterCode: string,
  ) => string | number;
  getCellClassName: (points: number) => string;
}

/**
 * "Total" on a stage with a single channel (jury-only, televote-only or
 * combined) is really that channel; the final-stats badge says so and the
 * cell highlight thresholds follow it.
 */
export const isPlainTotal = (
  stage: EventStage | undefined,
  voteType: StatsVoteType,
): boolean =>
  voteType === 'Total' &&
  !(
    stage &&
    [
      StageVotingMode.JURY_ONLY,
      StageVotingMode.TELEVOTE_ONLY,
      StageVotingMode.COMBINED,
    ].includes(stage.votingMode)
  );

/**
 * The pure part of `useFinalStats`: ranking and point lookups for one stage
 * and vote type, from the stage's countries and its predefined votes. Shared
 * by the final-stats modal and the graphics studio's stats element.
 */
export function buildStatsAccessors(
  stage: EventStage | undefined,
  voteType: StatsVoteType,
  votes: Partial<StageVotes> | null | undefined,
): StatsAccessors {
  const participating: Country[] = stage ? stage.countries : [];
  const combinedMode = stage?.votingMode === StageVotingMode.COMBINED;

  const totalFromVotes = (
    countryCode: string,
    type: 'jury' | 'televote' | 'combined',
  ): number => {
    const channel = votes?.[type];

    if (!channel) return 0;

    return Object.values(channel).reduce((total, list) => {
      const vote = list.find((v) => v.countryCode === countryCode);

      return toFixedIfDecimalFloat(total + (vote?.points || 0));
    }, 0);
  };

  const getPoints: StatsAccessors['getPoints'] = (country, type) => {
    if (
      (voteType === StageVotingType.TELEVOTE && !type) ||
      type === 'televote'
    ) {
      return combinedMode
        ? totalFromVotes(country.code, 'televote')
        : country.televotePoints;
    }
    if ((voteType === StageVotingType.JURY && !type) || type === 'jury') {
      return combinedMode
        ? totalFromVotes(country.code, 'jury')
        : country.juryPoints;
    }
    if (combinedMode) return totalFromVotes(country.code, 'combined');

    return toFixedIfDecimalFloat(country.points);
  };

  const orderMap =
    stage?.runningOrder && stage.runningOrder.length > 0
      ? new Map(stage.runningOrder.map((code, idx) => [code, idx]))
      : null;

  const rankedCountries = [...participating]
    .sort((a, b) => {
      const pointsComparison = getPoints(b) - getPoints(a);

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
    })
    .map((country, index) => ({ ...country, rank: index + 1 }));

  const fromVoter = (
    participantCode: string,
    voterCode: string,
    type: 'jury' | 'televote' | 'combined',
  ) => {
    const list = votes?.[type]?.[voterCode];

    if (!list) return 0;
    const total = list
      .filter((v) => v.countryCode === participantCode)
      .reduce((sum, v) => sum + v.points, 0);

    return total ? toFixedIfDecimalFloat(total) : 0;
  };

  const getCellPoints: StatsAccessors['getCellPoints'] = (
    participantCode,
    voterCode,
  ) => {
    if (!stage) return '';
    const juryPoints = fromVoter(participantCode, voterCode, 'jury');
    const televotePoints = fromVoter(participantCode, voterCode, 'televote');

    if (voteType === StageVotingType.JURY) return juryPoints || '';
    if (voteType === StageVotingType.TELEVOTE) return televotePoints || '';
    if (combinedMode) {
      return fromVoter(participantCode, voterCode, 'combined') || '';
    }
    const total = juryPoints + televotePoints;

    return total > 0 ? total : '';
  };

  const plainTotal = isPlainTotal(stage, voteType);
  const getCellClassName: StatsAccessors['getCellClassName'] = (points) => {
    if ((points === 12 && !plainTotal) || (points >= 20 && plainTotal)) {
      return 'font-bold bg-primary-700/50';
    }
    if ((points === 10 && !plainTotal) || (points >= 17 && plainTotal)) {
      return 'font-semibold bg-primary-800/60';
    }
    if ((points === 8 && !plainTotal) || (points >= 15 && plainTotal)) {
      return 'font-semibold bg-primary-800/30';
    }

    return 'font-medium';
  };

  return { rankedCountries, getPoints, getCellPoints, getCellClassName };
}
