/*
 * Phase B validation: load the data-derived affinities (diasporaAffinities.json)
 * into the sampler and check whether real, broad-coverage affinity closes the
 * televote zero-count gap (plain PL ~0.5 vs history ~1.4) while keeping the rest
 * of the shape inside the envelope.
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/validateDiaspora.ts [runs] [K] [juryScale]
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

const RUNS = Number(process.argv[2] ?? 500);
const K = Number(process.argv[3] ?? 5);
const JURY_SCALE = Number(process.argv[4] ?? 0.35);
const YEAR = 2026;

// ---- load derived affinities ------------------------------------------------

const derived: {
  pairs: { from: string; to: string; affinity: number }[];
} = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'diasporaAffinities.json'), 'utf-8'),
);

const affinity: Affinity = {};

for (const p of derived.pairs) {
  (affinity[p.from] ??= {})[p.to] = p.affinity;
}
const diaspora: DiasporaOptions = {
  affinity,
  affinityK: K,
  juryScale: JURY_SCALE,
};

const { candidates, voterCodes } = loadYear(YEAR);
const finalistCodes = candidates.map((c) => c.code);

// coverage: how many directed (voter -> finalist) pairs have an affinity?
let covered = 0;
let totalDirected = 0;

for (const v of voterCodes) {
  for (const c of finalistCodes) {
    if (v === c) continue;
    totalDirected += 1;
    if (affinity[v]?.[c] !== undefined) covered += 1;
  }
}

// Optional beta overrides (argv[5]=betaTele, argv[6]=betaJury) to test whether a
// small beta bump restores the aggregate shape when default diaspora is on.
const BETA_TELE = Number(process.argv[5] ?? 2.6);
const BETA_JURY = Number(process.argv[6] ?? 2.3);
const P = {
  betaJury: BETA_JURY,
  betaTele: BETA_TELE,
  jurors: 1,
  luckMag: 0.58,
};

// A few strong real pairs whose target is a 2026 finalist, to show pair
// visibility (avg televote points A->B and P(gives 12)) at this K.
const diagPairs = [
  ['CY', 'GR'],
  ['GB', 'LT'],
  ['HR', 'RS'],
  ['RO', 'MD'],
] as const;

const runSet = (useDiaspora: boolean) => {
  const tele: Metrics[] = [];
  const jury: Metrics[] = [];
  const total: Metrics[] = [];
  const pairPts: Record<string, number[]> = {};
  const pair12: Record<string, number> = {};

  for (const [a, b] of diagPairs) {
    pairPts[`${a}->${b}`] = [];
    pair12[`${a}->${b}`] = 0;
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

      pairPts[`${a}->${b}`].push(pts);
      if (pts === 12) pair12[`${a}->${b}`] += 1;
    }
  }

  return { tele, jury, total, pairPts, pair12 };
};

const off = runSet(false);
const on = runSet(true);

const env: { envelopes: Envelope[] } = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'historicalShapeEnvelope.json'),
    'utf-8',
  ),
);
const histOf = (c: string) => env.envelopes.find((e) => e.channel === c)!;
const f2 = (x: number) => x.toFixed(2);
const g = (runs: Metrics[], sel: (m: Metrics) => number) =>
  f2(mean(runs.map(sel)));
const line = '='.repeat(74);

console.log(line);
console.log(
  `DIASPORA VALIDATION (real affinities)  year ${YEAR}, ${RUNS} runs, K=${K}, juryScale=${JURY_SCALE}`,
);
console.log(line);
console.log(
  `affinity coverage of voter->finalist pairs: ${covered}/${totalDirected} (${(
    (100 * covered) /
    totalDirected
  ).toFixed(0)}%)\n`,
);

const show = (
  label: string,
  offRuns: Metrics[],
  onRuns: Metrics[],
  hist: Envelope,
) => {
  console.log(`### ${label}   (OFF -> ON  vs history)`);
  console.log(
    `  zeros:    ${g(offRuns, (m) => m.zeroCount)} -> ${g(
      onRuns,
      (m) => m.zeroCount,
    )}   (hist ${f2(hist.scalar.zeroCount.mean)})`,
  );
  console.log(
    `  sub5:     ${g(offRuns, (m) => m.sub5Count)} -> ${g(
      onRuns,
      (m) => m.sub5Count,
    )}   (hist ${f2(hist.scalar.sub5Count.mean)})`,
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
  console.log('');
};

show('TELEVOTE', off.tele, on.tele, histOf('TELEVOTE'));
show('JURY', off.jury, on.jury, histOf('JURY'));
show('TOTAL', off.total, on.total, histOf('SPLIT_TOTAL'));

console.log('PAIR VISIBILITY (televote A->B: avg pts, P(12))  OFF -> ON');
for (const [a, b] of diagPairs) {
  const key = `${a}->${b}`;
  const aff = affinity[a]?.[b] ?? 0;

  console.log(
    `  ${key.padEnd(9)} aff ${String(aff).padStart(4)}   avg ${f2(
      mean(off.pairPts[key]),
    )} -> ${f2(mean(on.pairPts[key]))}   P(12) ${(
      (100 * off.pair12[key]) /
      RUNS
    ).toFixed(0)}% -> ${((100 * on.pair12[key]) / RUNS).toFixed(0)}%`,
  );
}
