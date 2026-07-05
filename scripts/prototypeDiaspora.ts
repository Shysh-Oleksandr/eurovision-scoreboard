/*
 * Phase A diaspora prototype. Seeds a handful of known directed affinities and
 * checks three things against the historical envelope:
 *   1. televote hard-zeros rise toward the real ~1.4 (the gap plain PL can't hit)
 *   2. overall jury/televote/total shape stays inside the envelope
 *   3. specific directed pairs behave (e.g. Cyprus reliably 12 -> Greece), and
 *      negatives suppress a target toward zero
 *
 * Affinity scale is -100..+100 (UI units); affinityK converts to theta units.
 * juryScale shrinks the effect for juries (diaspora is mostly a televote thing).
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/prototypeDiaspora.ts [runs] [K] [juryScale]
 */

/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

import {
  Affinity,
  DiasporaOptions,
  loadYear,
  simulateContest,
} from './plSampler';
import { computeMetrics, Envelope, mean, Metrics } from './shapeMetrics';

// ---- seeded affinities (directed, -100..+100) -------------------------------

const affinity: Affinity = {};
const dir = (from: string, to: string, value: number) => {
  (affinity[from] ??= {})[to] = value;
};
const pair = (a: string, b: string, value: number) => {
  dir(a, b, value);
  dir(b, a, value);
};
const group = (codes: string[], value: number) => {
  for (const a of codes) {
    for (const b of codes) {
      if (a !== b) dir(a, b, value);
    }
  }
};

// Real, well-known relationships (both are finalists/voters in 2026 where noted).
pair('CY', 'GR', 100); // Cyprus <-> Greece, the strongest classic pair
pair('RO', 'MD', 90); // Romania <-> Moldova
pair('GR', 'AL', 55); // Greece <-> Albania (diaspora)
dir('SM', 'IT', 80); // San Marino -> Italy (asymmetric: SM adores IT)
dir('IT', 'SM', 30); // Italy -> San Marino (weaker back)
dir('MT', 'IT', 45); // Malta -> Italy
group(['SE', 'NO', 'DK', 'FI', 'IS'], 40); // Nordics
group(['HR', 'RS', 'SI', 'ME', 'MK', 'BA'], 50); // Ex-Yugoslav
group(['EE', 'LV', 'LT'], 45); // Baltics

// Negatives (rivalries). AM/AZ aren't 2026 finalists, so add ONE synthetic
// negative between two finalists purely to prove the mechanism suppresses.
pair('AM', 'AZ', -100); // real rivalry (invisible in 2026: neither is a finalist)
dir('PL', 'DE', -100); // SYNTHETIC mechanism test: does PL zero out DE?

const K = Number(process.argv[3] ?? 5);
const JURY_SCALE = Number(process.argv[4] ?? 0.3);
const diaspora: DiasporaOptions = {
  affinity,
  affinityK: K,
  juryScale: JURY_SCALE,
};

// ---- run --------------------------------------------------------------------

const RUNS = Number(process.argv[2] ?? 500);
const YEAR = 2026;
const { candidates, voterCodes } = loadYear(YEAR);
const finalistCodes = new Set(candidates.map((c) => c.code));
const P = { betaJury: 2.3, betaTele: 2.6, jurors: 1, luckMag: 0.58 };

const env: { envelopes: Envelope[] } = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'historicalShapeEnvelope.json'),
    'utf-8',
  ),
);
const histOf = (channel: string) =>
  env.envelopes.find((e) => e.channel === channel)!;

const meanOf = (runs: Metrics[], sel: (m: Metrics) => number) =>
  mean(runs.map(sel));

// pair diagnostics accumulators: avg televote points A->B and P(A gives B a 12)
const diagPairs = [
  ['CY', 'GR'],
  ['GR', 'CY'],
  ['RO', 'MD'],
  ['SM', 'IT'],
  ['MT', 'IT'],
  ['PL', 'DE'],
] as const;

const runSet = (useDiaspora: boolean) => {
  const tele: Metrics[] = [];
  const jury: Metrics[] = [];
  const total: Metrics[] = [];
  const pairPoints: Record<string, number[]> = {};
  const pairTwelve: Record<string, number> = {};

  for (const [a, b] of diagPairs) {
    pairPoints[`${a}->${b}`] = [];
    pairTwelve[`${a}->${b}`] = 0;
  }

  for (let i = 0; i < RUNS; i += 1) {
    const r = simulateContest(
      candidates,
      voterCodes,
      P,
      useDiaspora ? diaspora : undefined,
      true,
    );

    tele.push(computeMetrics(r.televote));
    jury.push(computeMetrics(r.jury));
    total.push(computeMetrics(r.total));

    for (const [a, b] of diagPairs) {
      const pts = r.televoteByVoter?.[a]?.[b] ?? 0;

      pairPoints[`${a}->${b}`].push(pts);
      if (pts === 12) pairTwelve[`${a}->${b}`] += 1;
    }
  }

  return { tele, jury, total, pairPoints, pairTwelve };
};

const off = runSet(false);
const on = runSet(true);

const f2 = (x: number) => x.toFixed(2);
const line = '='.repeat(78);

console.log(line);
console.log(
  `DIASPORA PROTOTYPE  (year ${YEAR}, ${RUNS} runs, K=${K}, juryScale=${JURY_SCALE})`,
);
console.log(line);

const shapeRow = (
  label: string,
  offRuns: Metrics[],
  onRuns: Metrics[],
  hist: Envelope,
) => {
  const g = (runs: Metrics[], sel: (m: Metrics) => number) =>
    f2(meanOf(runs, sel));

  console.log(`\n### ${label}   (OFF -> ON  vs history)`);
  console.log(
    `  zeros:    ${g(offRuns, (m) => m.zeroCount)} -> ${g(
      onRuns,
      (m) => m.zeroCount,
    )}   (hist ${f2(hist.scalar.zeroCount.mean)})`,
  );
  console.log(
    `  Gini:     ${g(offRuns, (m) => m.gini)} -> ${g(
      onRuns,
      (m) => m.gini,
    )}   (hist ${f2(hist.scalar.gini.mean)})`,
  );
  console.log(
    `  max/med:  ${g(offRuns, (m) =>
      Number.isFinite(m.maxToMedian) ? m.maxToMedian : NaN,
    )} -> ${g(onRuns, (m) =>
      Number.isFinite(m.maxToMedian) ? m.maxToMedian : NaN,
    )}   (hist ${f2(hist.scalar.maxToMedian.mean)})`,
  );
  console.log(
    `  eff#:     ${g(offRuns, (m) => m.effectiveN)} -> ${g(
      onRuns,
      (m) => m.effectiveN,
    )}   (hist ${f2(hist.scalar.effectiveN.mean)})`,
  );
};

shapeRow('TELEVOTE', off.tele, on.tele, histOf('TELEVOTE'));
shapeRow('JURY', off.jury, on.jury, histOf('JURY'));
shapeRow('TOTAL', off.total, on.total, histOf('SPLIT_TOTAL'));

console.log(`\n${line}`);
console.log('PAIR DIAGNOSTICS  (televote points A->B; avg and P(gives 12))');
console.log(line);
console.log(
  `  ${'pair'.padEnd(10)}${'seed'.padStart(6)}${'avg OFF'.padStart(
    10,
  )}${'avg ON'.padStart(10)}${'P(12) OFF'.padStart(12)}${'P(12) ON'.padStart(
    11,
  )}`,
);
for (const [a, b] of diagPairs) {
  const key = `${a}->${b}`;
  const seed = affinity[a]?.[b] ?? 0;
  const targetIsFinalist = finalistCodes.has(b) ? '' : '  (B not finalist)';

  console.log(
    `  ${key.padEnd(10)}${String(seed).padStart(6)}${f2(
      mean(off.pairPoints[key]),
    ).padStart(10)}${f2(mean(on.pairPoints[key])).padStart(10)}${`${(
      (100 * off.pairTwelve[key]) /
      RUNS
    ).toFixed(0)}%`.padStart(12)}${`${(
      (100 * on.pairTwelve[key]) /
      RUNS
    ).toFixed(0)}%`.padStart(11)}${targetIsFinalist}`,
  );
}
