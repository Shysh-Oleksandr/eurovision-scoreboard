import rw from 'random-weighted-choice';

import { POINTS_ARRAY } from '../../data/data';
import { BaseCountry, Country, StageVotingMode } from '../../models';
import { CountryOdds } from '../countriesStore';

import { StageVotes, Vote } from './types';

type CountryWithOdds = {
  id: string;
  weight: number;
};

type CountryWithRank = {
  code: string;
  juryRank: number;
  televoteRank: number;
  combinedRank: number;
};

const generateFullRanking = (
  votingCountry: BaseCountry,
  stageCountries: BaseCountry[],
  countryOdds: CountryOdds,
  oddsType: 'juryOdds' | 'televoteOdds',
): { code: string; rank: number }[] => {
  const choices: CountryWithOdds[] = stageCountries
    .filter((c) => c.code !== votingCountry.code)
    .map((c) => ({
      id: c.code,
      weight: countryOdds[c.code]?.[oddsType] ?? 50,
    }));

  const rankedWinners: { code: string; rank: number }[] = [];
  let remainingChoices = [...choices];
  let rank = 1;

  while (remainingChoices.length > 0) {
    const winnerId = rw(remainingChoices);

    rankedWinners.push({ code: winnerId, rank });
    remainingChoices = remainingChoices.filter((c) => c.id !== winnerId);
    rank += 1;
  }

  return rankedWinners;
};

const generateCombinedVotes = (
  votingCountry: BaseCountry,
  stageCountries: BaseCountry[],
  countryOdds: CountryOdds,
): Vote[] => {
  const juryRanking = generateFullRanking(
    votingCountry,
    stageCountries,
    countryOdds,
    'juryOdds',
  );

  const televoteRanking = generateFullRanking(
    votingCountry,
    stageCountries,
    countryOdds,
    'televoteOdds',
  );

  const combinedRanking: CountryWithRank[] = juryRanking
    .map((juryResult) => {
      const televoteResult = televoteRanking.find(
        (tv) => tv.code === juryResult.code,
      )!;

      return {
        code: juryResult.code,
        juryRank: juryResult.rank,
        televoteRank: televoteResult.rank,
        combinedRank: juryResult.rank + televoteResult.rank,
      };
    })
    .sort((a, b) => {
      if (a.combinedRank !== b.combinedRank) {
        return a.combinedRank - b.combinedRank;
      }

      return a.televoteRank - b.televoteRank;
    });

  const numPointsToAward = Math.min(
    POINTS_ARRAY.length,
    combinedRanking.length,
  );
  const winners = combinedRanking.slice(0, numPointsToAward);
  const sortedPoints = [...POINTS_ARRAY].sort((a, b) => b - a);

  return winners.map((winner, index) => ({
    countryCode: winner.code,
    points: sortedPoints[index],
  }));
};

const generateVotesForSource = (
  votingCountry: BaseCountry,
  stageCountries: BaseCountry[],
  countryOdds: CountryOdds,
  oddsType: 'juryOdds' | 'televoteOdds',
): Vote[] => {
  const choices: CountryWithOdds[] = stageCountries
    .filter((c) => c.code !== votingCountry.code)
    .map((c) => ({
      id: c.code,
      weight: countryOdds[c.code]?.[oddsType] ?? 50,
    }));

  if (choices.length === 0) {
    return [];
  }

  const numPointsToAward = Math.min(POINTS_ARRAY.length, choices.length);
  const winners: string[] = [];
  let remainingChoices = [...choices];

  if (remainingChoices.length === 0) {
    return [];
  }

  while (winners.length < numPointsToAward && remainingChoices.length > 0) {
    const winnerId = rw(remainingChoices);

    winners.push(winnerId);
    remainingChoices = remainingChoices.filter((c) => c.id !== winnerId);
  }

  const sortedPoints = [...POINTS_ARRAY].sort((a, b) => b - a);

  return winners.map((winnerCode, index) => ({
    countryCode: winnerCode,
    points: sortedPoints[index],
  }));
};

export const predefineStageVotes = (
  stageCountries: (Country | BaseCountry)[],
  votingCountries: BaseCountry[],
  votingMode: StageVotingMode,
  countryOdds: CountryOdds,
): Partial<StageVotes> => {
  const stageVotes: Partial<StageVotes> = {};

  const shouldGenerateJury =
    votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
    votingMode === StageVotingMode.JURY_ONLY ||
    votingMode === StageVotingMode.COMBINED;

  const shouldGenerateCombined = votingMode === StageVotingMode.COMBINED;

  const shouldGenerateTelevote =
    votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
    votingMode === StageVotingMode.COMBINED ||
    votingMode === StageVotingMode.TELEVOTE_ONLY;

  if (shouldGenerateJury) {
    stageVotes.jury = {};
    for (const votingCountry of votingCountries) {
      stageVotes.jury[votingCountry.code] = generateVotesForSource(
        votingCountry,
        stageCountries,
        countryOdds,
        'juryOdds',
      );
    }
  }

  if (shouldGenerateCombined) {
    stageVotes.combined = {};
    for (const votingCountry of votingCountries) {
      stageVotes.combined[votingCountry.code] = generateCombinedVotes(
        votingCountry,
        stageCountries,
        countryOdds,
      );
    }
  }

  if (shouldGenerateTelevote) {
    stageVotes.televote = {};
    for (const votingCountry of votingCountries) {
      stageVotes.televote[votingCountry.code] = generateVotesForSource(
        votingCountry,
        stageCountries,
        countryOdds,
        'televoteOdds',
      );
    }
  }

  return stageVotes;
};
