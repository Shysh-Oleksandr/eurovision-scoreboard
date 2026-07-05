/*
 * Standalone Plackett-Luce (Gumbel-max) voting sampler — the step-2 prototype
 * engine, kept separate from production so we can tune it against the historical
 * shape targets. See prototypePlackettLuce.ts for the model write-up.
 */

import * as fs from 'fs';
import * as path from 'path';

import { BaseCountry } from '../src/models';

const POINTS = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

export type Params = {
  betaJury: number; // effective odds exponent for jury (per-voter signal/noise)
  betaTele: number; // effective odds exponent for televote (higher = spikier)
  jurors: number; // juror draws averaged per jury
  luckMag: number; // shared per-contest quality-shock scale (ln-odds units)
};

// spread (0-100) -> beta; randomness (0-100) -> luck shock. Tuned in step 2
// against the historical envelope: at spread=50, betaJury=2.3 / betaTele=2.6
// reproduce the real jury/televote Gini and decay curve. Jury and televote are a
// SINGLE PL draw each (within-country juror averaging over-sharpens — see the
// tuner output); they differ in kind via betaTele > betaJury.
export const paramsFor = (randomness: number, spread: number): Params => {
  const s = Math.max(0, Math.min(spread, 100)) / 100;
  const r = Math.max(0, Math.min(randomness, 100)) / 100;

  return {
    betaJury: 0.8 + s * 3.0, // 0.8 .. 2.3 .. 3.8
    betaTele: 1.0 + s * 3.2, // 1.0 .. 2.6 .. 4.2 (steeper than jury)
    jurors: 1,
    luckMag: r * 0.9,
  };
};

const gumbel = (): number => -Math.log(-Math.log(Math.random()));

const normal = (): number => {
  const u1 = Math.random() || 1e-12;
  const u2 = Math.random();

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

type Theta = Record<string, number>;

// Optional per-candidate additive offset (diaspora affinity, in theta units).
type Offset = (code: string) => number;

const drawRanking = (
  codes: string[],
  theta: Theta,
  offset?: Offset,
): string[] =>
  codes
    .map((c) => ({ c, key: theta[c] + (offset ? offset(c) : 0) + gumbel() }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.c);

const drawJuryRanking = (
  codes: string[],
  theta: Theta,
  jurors: number,
  offset?: Offset,
): string[] => {
  if (jurors <= 1) return drawRanking(codes, theta, offset);
  const rankSum: Record<string, number> = {};

  for (const c of codes) rankSum[c] = 0;
  for (let j = 0; j < jurors; j += 1) {
    drawRanking(codes, theta, offset).forEach((c, idx) => {
      rankSum[c] += idx;
    });
  }

  return [...codes].sort(
    (a, b) => rankSum[a] - rankSum[b] || theta[b] - theta[a],
  );
};

const allocate = (
  ranking: string[],
  totals: Record<string, number>,
  record?: Record<string, number>,
): void => {
  const k = Math.min(POINTS.length, ranking.length);

  for (let i = 0; i < k; i += 1) {
    totals[ranking[i]] += POINTS[i];
    if (record) record[ranking[i]] = POINTS[i];
  }
};

const buildTheta = (
  candidates: { code: string; odds: number }[],
  beta: number,
  luck: Record<string, number>,
  luckMag: number,
): Theta => {
  const theta: Theta = {};

  for (const c of candidates) {
    theta[c.code] =
      beta * Math.log(Math.max(1, c.odds)) + luckMag * luck[c.code];
  }

  return theta;
};

export type Candidate = {
  code: string;
  juryOdds: number;
  televoteOdds: number;
};

// Directed affinity, UI scale -100..+100: affinity[from][to].
export type Affinity = Record<string, Record<string, number>>;

export type DiasporaOptions = {
  affinity: Affinity;
  affinityK: number; // theta units per 100 affinity points
  juryScale: number; // jury gets this fraction of the televote affinity
};

const affinityTheta = (
  opts: DiasporaOptions,
  from: string,
  to: string,
): number => ((opts.affinity[from]?.[to] ?? 0) / 100) * opts.affinityK;

export type ContestResult = {
  jury: number[];
  televote: number[];
  total: number[];
  // Per-voter breakdown (only when returnByVoter), voter -> candidate -> points.
  televoteByVoter?: Record<string, Record<string, number>>;
  juryByVoter?: Record<string, Record<string, number>>;
};

export const simulateContest = (
  candidates: Candidate[],
  voters: string[],
  p: Params,
  diaspora?: DiasporaOptions,
  returnByVoter = false,
): ContestResult => {
  const codes = candidates.map((c) => c.code);

  const luckJury: Record<string, number> = {};
  const luckTele: Record<string, number> = {};

  for (const c of codes) {
    luckJury[c] = normal();
    luckTele[c] = normal();
  }

  const thetaJury = buildTheta(
    candidates.map((c) => ({ code: c.code, odds: c.juryOdds })),
    p.betaJury,
    luckJury,
    p.luckMag,
  );
  const thetaTele = buildTheta(
    candidates.map((c) => ({ code: c.code, odds: c.televoteOdds })),
    p.betaTele,
    luckTele,
    p.luckMag,
  );

  const jury: Record<string, number> = {};
  const tele: Record<string, number> = {};

  for (const c of codes) {
    jury[c] = 0;
    tele[c] = 0;
  }

  const televoteByVoter: Record<string, Record<string, number>> = {};
  const juryByVoter: Record<string, Record<string, number>> = {};

  for (const voter of voters) {
    const cands = codes.filter((c) => c !== voter); // no self-voting
    const juryOffset = diaspora
      ? (c: string) => diaspora.juryScale * affinityTheta(diaspora, voter, c)
      : undefined;
    const teleOffset = diaspora
      ? (c: string) => affinityTheta(diaspora, voter, c)
      : undefined;

    const juryRecord = returnByVoter ? (juryByVoter[voter] = {}) : undefined;
    const teleRecord = returnByVoter
      ? (televoteByVoter[voter] = {})
      : undefined;

    allocate(
      drawJuryRanking(cands, thetaJury, p.jurors, juryOffset),
      jury,
      juryRecord,
    );
    allocate(drawRanking(cands, thetaTele, teleOffset), tele, teleRecord);
  }

  return {
    jury: codes.map((c) => jury[c]),
    televote: codes.map((c) => tele[c]),
    total: codes.map((c) => jury[c] + tele[c]),
    ...(returnByVoter ? { televoteByVoter, juryByVoter } : {}),
  };
};

export const loadYear = (
  year: number,
): { candidates: Candidate[]; voterCodes: string[]; numVoters: number } => {
  const file: { countries: BaseCountry[] } = JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'public',
        'data',
        'countries',
        `countries-${year}.json`,
      ),
      'utf-8',
    ),
  );
  const candidates = file.countries
    .filter((c) => c.isQualified)
    .map((c) => ({
      code: c.code,
      juryOdds: c.juryOdds ?? 50,
      televoteOdds: c.televoteOdds ?? 50,
    }));
  const voterCodes = file.countries.map((c) => c.code);

  return { candidates, voterCodes, numVoters: voterCodes.length };
};
