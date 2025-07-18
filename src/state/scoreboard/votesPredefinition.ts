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

const calculateTemperature = (randomnessLevel: number): number => {
  // Interpolate temperature from 45 to 50 for randomness levels 0-40.
  // Beyond 40, it stays at 50.
  const clampedRandomness = Math.max(0, Math.min(randomnessLevel, 40));
  const temperature = 45 + (clampedRandomness / 40) * 5;

  return temperature;
};

const calculateWeightFromOdds = (odds: number): number => {
  // A higher exponent creates a more "spiky" distribution of points,
  // making the difference between winners and losers more pronounced.
  const DISTRIBUTION_EXPONENT = 2.5;

  return Math.pow(Math.max(1, odds), DISTRIBUTION_EXPONENT);
};

const generateFullRanking = (
  votingCountry: BaseCountry,
  stageCountries: BaseCountry[],
  countryOdds: CountryOdds,
  oddsType: 'juryOdds' | 'televoteOdds',
  temperature: number,
): { code: string; rank: number }[] => {
  const choices: CountryWithOdds[] = stageCountries
    .filter((c) => c.code !== votingCountry.code)
    .map((c) => ({
      id: c.code,
      weight: calculateWeightFromOdds(countryOdds[c.code]?.[oddsType] ?? 50),
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
  temperature: number,
): Vote[] => {
  const juryRanking = generateFullRanking(
    votingCountry,
    stageCountries,
    countryOdds,
    'juryOdds',
    temperature,
  );

  const televoteRanking = generateFullRanking(
    votingCountry,
    stageCountries,
    countryOdds,
    'televoteOdds',
    temperature,
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
  temperature: number,
): Vote[] => {
  const choices: CountryWithOdds[] = stageCountries
    .filter((c) => c.code !== votingCountry.code)
    .map((c) => ({
      id: c.code,
      weight: calculateWeightFromOdds(countryOdds[c.code]?.[oddsType] ?? 50),
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
  // Create a new set of odds with randomness "baked in" for this simulation.
  // This ensures that a country's "luck" is consistent across all voters.
  const perturbedOdds: CountryOdds = {};
  const randomnessFactor = randomnessLevel / 100;
  const temperature = calculateTemperature(randomnessLevel);

  for (const country of stageCountries) {
    const originalJuryOdds = countryOdds[country.code]?.juryOdds ?? 50;
    const originalTelevoteOdds = countryOdds[country.code]?.televoteOdds ?? 50;

    const luckFactor = Math.random() * 1.5 + 1.5; // 1.5-3
    // Generate a "luck" factor for this country for this simulation run
    // from a power-law distribution. This ensures "spiky" random results
    // where some countries get high values and most get lower values.
    // We set a minimum baseline (e.g., 15) to prevent too many countries
    // from getting near-zero odds at high randomness levels.
    const randomBaseline = Math.random() * 20; // 0-20

    const juryRandomValue =
      randomBaseline +
      (100 - randomBaseline) * Math.pow(Math.random(), luckFactor);
    const televoteRandomValue =
      randomBaseline +
      (100 - randomBaseline) * Math.pow(Math.random(), luckFactor);

    // Interpolate between the real odds and the random value.
    const perturbedJuryOdds =
      (1 - randomnessFactor) * originalJuryOdds +
      randomnessFactor * juryRandomValue;
    const perturbedTelevoteOdds =
      (1 - randomnessFactor) * originalTelevoteOdds +
      randomnessFactor * televoteRandomValue;

    perturbedOdds[country.code] = {
      juryOdds: perturbedJuryOdds,
      televoteOdds: perturbedTelevoteOdds,
    };
  }

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
        perturbedOdds,
        'juryOdds',
        temperature,
      );
    }
  }

  if (shouldGenerateCombined) {
    stageVotes.combined = {};
    for (const votingCountry of votingCountries) {
      stageVotes.combined[votingCountry.code] = generateCombinedVotes(
        votingCountry,
        stageCountries,
        perturbedOdds,
        temperature,
      );
    }
  }

  if (shouldGenerateTelevote) {
    stageVotes.televote = {};
    for (const votingCountry of votingCountries) {
      stageVotes.televote[votingCountry.code] = generateVotesForSource(
        votingCountry,
        stageCountries,
        perturbedOdds,
        'televoteOdds',
        temperature,
      );
    }
  }

  return stageVotes;
};
