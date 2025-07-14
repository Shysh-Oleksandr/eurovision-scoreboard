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

const getWeightFactor = (randomnessLevel: number) => {
  if (randomnessLevel > 50) {
    // For randomness > 50, smoothly decrease weight factor from 0.9 at 51 to 0.1 at 100
    return 0.1 + ((100 - randomnessLevel) / 49) * 0.7;
  }

  if (randomnessLevel === 50) {
    return 0.8;
  }

  // For randomness < 50, smoothly increase weight factor from 1 at 49 to 2.2 at 0
  return 1 + ((50 - randomnessLevel) / 50) * 1.2;
};

const generateFullRanking = (
  votingCountry: BaseCountry,
  stageCountries: BaseCountry[],
  countryOdds: CountryOdds,
  oddsType: 'juryOdds' | 'televoteOdds',
  randomnessLevel: number,
): { code: string; rank: number }[] => {
  const weightFactor = getWeightFactor(randomnessLevel);
  const temperature = (randomnessLevel / 100) * 70; // 0-70

  const choices: CountryWithOdds[] = stageCountries
    .filter((c) => c.code !== votingCountry.code)
    .map((c) => ({
      id: c.code,
      weight: Math.pow(countryOdds[c.code]?.[oddsType] ?? 50, weightFactor),
    }));

  const rankedWinners: { code: string; rank: number }[] = [];
  let remainingChoices = [...choices];
  let rank = 1;

  while (remainingChoices.length > 0) {
    const winnerId = rw(remainingChoices, temperature);

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
  randomnessLevel: number,
): Vote[] => {
  const juryRanking = generateFullRanking(
    votingCountry,
    stageCountries,
    countryOdds,
    'juryOdds',
    randomnessLevel,
  );

  const televoteRanking = generateFullRanking(
    votingCountry,
    stageCountries,
    countryOdds,
    'televoteOdds',
    randomnessLevel,
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
  randomnessLevel: number,
): Vote[] => {
  const weightFactor = getWeightFactor(randomnessLevel);
  const temperature = 35 + (randomnessLevel / 100) * 25; // 35-60

  const choices: CountryWithOdds[] = stageCountries
    .filter((c) => c.code !== votingCountry.code)
    .map((c) => ({
      id: c.code,
      weight: Math.pow(countryOdds[c.code]?.[oddsType] ?? 50, weightFactor),
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
    const winnerId = rw(remainingChoices, temperature);

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
  randomnessLevel: number,
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
        randomnessLevel,
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
        randomnessLevel,
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
        randomnessLevel,
      );
    }
  }

  return stageVotes;
};
