import {
  BaseCountry,
  Country,
  StageVotingMode,
  VotingCountry,
} from '../../models';
import { CountryOdds } from '../countriesStore';
import { PointsItem } from '../generalStore';

import { ResolvedDiaspora } from './diaspora';
import { StageVotes, Vote } from './types';

/*
 * Random-vote ("predefinition") engine.
 *
 * MODEL — a Plackett-Luce (Gumbel-max) ranking sampler, calibrated against 22
 * years of real Eurovision finals (see scripts/analyzeHistoricalShape.ts and
 * scripts/plSampler.ts). Each candidate i has a latent quality:
 *
 *     theta_i = beta * ln(odds_i)  +  luckMag * N_i
 *
 *   - beta (from `pointsSpread`)  -> how strongly odds separate candidates; sets
 *     the GAPS between winners and losers. weight_i = odds_i^beta.
 *   - N_i ~ Normal(0,1), drawn ONCE per contest and shared across every voter
 *     (from `randomnessLevel`) -> which songs over/under-perform THIS run. Keeps
 *     a country's "luck" consistent across all voters (as the old engine did),
 *     while making the outcome track the odds less as randomness rises.
 *
 * A voter's ranking = sort candidates by  theta_i + Gumbel(0,1)  descending
 * (theta + Gumbel argsort <=> a Plackett-Luce draw from weights e^theta). The
 * top entries receive the points system's values (12,10,8...).
 *
 * Jury and televote are each a SINGLE draw (within-country juror averaging
 * over-sharpens — it makes juries agree too much and manufactures nul-points
 * that real juries never hand out). They differ IN KIND via a steeper televote
 * beta, reproducing televote's spikier, more concentrated boards.
 */

const clamp01 = (value: number, max = 100): number =>
  Math.max(0, Math.min(value, max)) / max;

type EngineParams = {
  betaJury: number;
  betaTele: number;
  luckMag: number;
};

// Knob mapping, tuned so that at the defaults (randomness=50, spread=50) the
// simulated jury/televote Gini, zero-counts and decay curve match the historical
// envelope. See scripts/tunePlackettLuce.ts for the sweep this came from.
const deriveEngineParams = (
  randomnessLevel: number,
  pointsSpread: number,
): EngineParams => {
  const s = clamp01(pointsSpread);
  const r = clamp01(randomnessLevel);

  return {
    betaJury: 0.8 + s * 3.0, // 0.8 (flat) .. 2.3 (default) .. 3.8 (blowout)
    betaTele: 1.0 + s * 3.2, // 1.0 .. 2.6 (default) .. 4.2 (steeper than jury)
    // Convex so low/mid randomness stays odds-faithful while 100 turns genuinely
    // chaotic. Anchors (see scripts/tuneRandomness.ts): r=0 -> 0 (favourite wins
    // ~100%); r=0.5 -> 0.58 (favourite ~80%, a modest bump); r=1 -> 2.5
    // (favourite ~22% — beatable but still the best single bet).
    luckMag: 2.6 * r ** 2.0,
  };
};

// Gumbel(0,1) sample: -ln(-ln U). Adding it to a score and taking the argmax is
// exactly one draw from softmax(score) (the Gumbel-max trick).
const sampleGumbel = (): number => -Math.log(-Math.log(Math.random() || 1e-12));

// Standard normal via Box-Muller, for the shared per-contest luck shock.
const sampleNormal = (): number => {
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

type ThetaByCode = Record<string, number>;

// Build the quality vector for one channel: beta * ln(odds) + a per-contest luck
// shock. Called once per channel, so each candidate's shock is fixed for the
// whole contest and shared by every voter.
const buildTheta = (
  stageCountries: (Country | BaseCountry)[],
  countryOdds: CountryOdds,
  oddsType: 'juryOdds' | 'televoteOdds',
  beta: number,
  luckMag: number,
): ThetaByCode => {
  const theta: ThetaByCode = {};

  for (const country of stageCountries) {
    const odds = countryOdds[country.code]?.[oddsType] ?? 50;

    theta[country.code] =
      beta * Math.log(Math.max(1, odds)) + luckMag * sampleNormal();
  }

  return theta;
};

const sortedPointsDesc = (pointsSystem: PointsItem[]): PointsItem[] =>
  [...pointsSystem].sort((a, b) => b.value - a.value);

const toVote = (countryCode: string, pointsItem: PointsItem): Vote => ({
  countryCode,
  points: pointsItem.value,
  pointsId: pointsItem.id,
  showDouzePointsAnimation: pointsItem.showDouzePoints,
});

// Per-candidate additive offset (diaspora affinity, in theta units) for one voter.
type Offset = (code: string) => number;

// Build a voter's diaspora offset for a channel, or undefined when the voter has
// no affinities (so the hot path adds nothing). `scale` is 1 for televote and
// juryScale for jury.
const makeAffinityOffset = (
  diaspora: ResolvedDiaspora | null | undefined,
  voterCode: string,
  scale: number,
): Offset | undefined => {
  const row = diaspora?.affinity[voterCode];

  if (!row) return undefined;
  const k = diaspora!.affinityK * scale;

  return (code) => ((row[code] ?? 0) / 100) * k;
};

// One voter's full ranking (best first) via Gumbel-max over the candidate thetas.
const rankByTheta = (
  candidateCodes: string[],
  theta: ThetaByCode,
  offset?: Offset,
): string[] =>
  candidateCodes
    .map((code) => ({
      code,
      key: theta[code] + (offset ? offset(code) : 0) + sampleGumbel(),
    }))
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.code);

const candidatesFor = (
  votingCountry: BaseCountry,
  stageCountries: (Country | BaseCountry)[],
): string[] =>
  stageCountries
    .filter((c) => c.code !== votingCountry.code)
    .map((c) => c.code);

const generateVotesForSource = (
  votingCountry: BaseCountry,
  stageCountries: (Country | BaseCountry)[],
  theta: ThetaByCode,
  pointsSystem: PointsItem[],
  allowMultiplePointsToSameEntry: boolean,
  offset?: Offset,
): Vote[] => {
  const candidates = candidatesFor(votingCountry, stageCountries);

  if (candidates.length === 0) {
    return [];
  }

  const sortedPoints = sortedPointsDesc(pointsSystem);

  if (allowMultiplePointsToSameEntry) {
    // Sample WITH replacement: each point slot is an independent Plackett-Luce
    // draw (argmax of theta + Gumbel), so the same country can win several.
    return sortedPoints.map((pointsItem) => {
      let [bestCode] = candidates;
      let bestKey = -Infinity;

      for (const code of candidates) {
        const key = theta[code] + (offset ? offset(code) : 0) + sampleGumbel();

        if (key > bestKey) {
          bestKey = key;
          bestCode = code;
        }
      }

      return toVote(bestCode, pointsItem);
    });
  }

  const ranking = rankByTheta(candidates, theta, offset);
  const numPointsToAward = Math.min(sortedPoints.length, ranking.length);

  return sortedPoints
    .slice(0, numPointsToAward)
    .map((pointsItem, index) => toVote(ranking[index], pointsItem));
};

const generateCombinedVotes = (
  votingCountry: BaseCountry,
  stageCountries: (Country | BaseCountry)[],
  thetaJury: ThetaByCode,
  thetaTele: ThetaByCode,
  pointsSystem: PointsItem[],
  juryOffset?: Offset,
  televoteOffset?: Offset,
): Vote[] => {
  const candidates = candidatesFor(votingCountry, stageCountries);

  if (candidates.length === 0) {
    return [];
  }

  const juryRanking = rankByTheta(candidates, thetaJury, juryOffset);
  const televoteRanking = rankByTheta(candidates, thetaTele, televoteOffset);

  const juryPos: Record<string, number> = {};
  const televotePos: Record<string, number> = {};

  juryRanking.forEach((code, index) => {
    juryPos[code] = index;
  });
  televoteRanking.forEach((code, index) => {
    televotePos[code] = index;
  });

  const combinedRanking = [...candidates].sort((a, b) => {
    const combinedA = juryPos[a] + televotePos[a];
    const combinedB = juryPos[b] + televotePos[b];

    if (combinedA !== combinedB) {
      return combinedA - combinedB;
    }

    // Tiebreak by the stronger televote position (matches prior behaviour).
    return televotePos[a] - televotePos[b];
  });

  const sortedPoints = sortedPointsDesc(pointsSystem);
  const numPointsToAward = Math.min(
    sortedPoints.length,
    combinedRanking.length,
  );

  return sortedPoints
    .slice(0, numPointsToAward)
    .map((pointsItem, index) => toVote(combinedRanking[index], pointsItem));
};

export const predefineStageVotes = (
  stageCountries: (Country | BaseCountry)[],
  votingCountries: VotingCountry[],
  votingMode: StageVotingMode,
  countryOdds: CountryOdds,
  randomnessLevel: number,
  pointsSpread: number,
  juryPointsSystem: PointsItem[],
  televotePointsSystem: PointsItem[],
  allowMultiplePointsToSameEntry = false,
  diaspora?: ResolvedDiaspora | null,
): Partial<StageVotes> => {
  const { betaJury, betaTele, luckMag } = deriveEngineParams(
    randomnessLevel,
    pointsSpread,
  );

  // Diaspora affinity flattens the televote board; bump its beta to hold the
  // aggregate shape (see scripts/calibrateDiaspora.ts). juryScale keeps the
  // effect subtle on juries, as the real data implies.
  const betaTeleEffective = betaTele + (diaspora?.betaTeleBoost ?? 0);
  const juryScale = diaspora?.juryScale ?? 0;

  const shouldGenerateJury =
    votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
    votingMode === StageVotingMode.JURY_ONLY ||
    votingMode === StageVotingMode.COMBINED;

  const shouldGenerateCombined = votingMode === StageVotingMode.COMBINED;

  const shouldGenerateTelevote =
    votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
    votingMode === StageVotingMode.COMBINED ||
    votingMode === StageVotingMode.TELEVOTE_ONLY;

  // Build each channel's quality vector ONCE (luck shock baked in) and reuse it
  // for every voter, so a country's luck is consistent across the contest.
  const thetaJury =
    shouldGenerateJury || shouldGenerateCombined
      ? buildTheta(stageCountries, countryOdds, 'juryOdds', betaJury, luckMag)
      : {};
  const thetaTele =
    shouldGenerateTelevote || shouldGenerateCombined
      ? buildTheta(
          stageCountries,
          countryOdds,
          'televoteOdds',
          betaTeleEffective,
          luckMag,
        )
      : {};

  const stageVotes: Partial<StageVotes> = {};

  if (shouldGenerateJury) {
    stageVotes.jury = {};
    for (const votingCountry of votingCountries) {
      if (votingCountry.code === 'WW') {
        continue;
      }

      stageVotes.jury[votingCountry.code] = generateVotesForSource(
        votingCountry,
        stageCountries,
        thetaJury,
        juryPointsSystem,
        allowMultiplePointsToSameEntry,
        makeAffinityOffset(diaspora, votingCountry.code, juryScale),
      );
    }
  }

  if (shouldGenerateCombined) {
    stageVotes.combined = {};
    for (const votingCountry of votingCountries) {
      stageVotes.combined[votingCountry.code] = generateCombinedVotes(
        votingCountry,
        stageCountries,
        thetaJury,
        thetaTele,
        juryPointsSystem,
        makeAffinityOffset(diaspora, votingCountry.code, juryScale),
        makeAffinityOffset(diaspora, votingCountry.code, 1),
      );
    }
  }

  if (shouldGenerateTelevote) {
    stageVotes.televote = {};
    for (const votingCountry of votingCountries) {
      stageVotes.televote[votingCountry.code] = generateVotesForSource(
        votingCountry,
        stageCountries,
        thetaTele,
        televotePointsSystem,
        allowMultiplePointsToSameEntry,
        makeAffinityOffset(diaspora, votingCountry.code, 1),
      );
    }
  }

  return stageVotes;
};
