/*
 * Step-2 tuner: sweep the Plackett-Luce beta (per channel) and juror count, and
 * for each print the key shape metrics next to the historical targets, so we can
 * read off the beta that reproduces real Eurovision.
 *
 * Jury and televote are tuned independently: a jury sweep uses the jury board,
 * a televote sweep uses the televote board. Targets:
 *   JURY:     Gini 0.45, zeros ~0.5, max/median 4.65, curve50 0.23
 *   TELEVOTE: Gini 0.54, zeros ~1.4, max/median 7.07, curve50 0.15
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/tunePlackettLuce.ts [runs]
 */

import * as fs from 'fs';
import * as path from 'path';

import { loadYear, Params, simulateContest } from './plSampler';
import { computeMetrics, Envelope, mean, Metrics } from './shapeMetrics';

const RUNS = Number(process.argv[2] ?? 400);
const YEAR = 2026;

const env: { envelopes: Envelope[] } = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'historicalShapeEnvelope.json'),
    'utf-8',
  ),
);
const histOf = (channel: string) =>
  env.envelopes.find((e) => e.channel === channel)!;

const { candidates, voterCodes } = loadYear(YEAR);

const avg = (runs: Metrics[], sel: (m: Metrics) => number) =>
  mean(runs.map(sel));

const runWith = (
  p: Params,
): { jury: Metrics[]; tele: Metrics[]; total: Metrics[] } => {
  const jury: Metrics[] = [];
  const tele: Metrics[] = [];
  const total: Metrics[] = [];

  for (let i = 0; i < RUNS; i += 1) {
    const r = simulateContest(candidates, voterCodes, p);

    jury.push(computeMetrics(r.jury));
    tele.push(computeMetrics(r.televote));
    total.push(computeMetrics(r.total));
  }

  return { jury, tele, total };
};

const f = (x: number) => x.toFixed(2);

const header = (label: string) => {
  const h = histOf(label === 'JURY' ? 'JURY' : 'TELEVOTE');
  const target = `[target: Gini ${f(h.scalar.gini.mean)}  zeros ${f(
    h.scalar.zeroCount.mean,
  )}  max/med ${f(h.scalar.maxToMedian.mean)}  c50 ${f(h.curve.mean[10])}]`;

  // eslint-disable-next-line no-console
  console.log(`\n### ${label} sweep  ${target}`);
  // eslint-disable-next-line no-console
  console.log(
    `  ${'beta'.padStart(6)}${'jurors'.padStart(8)}${'Gini'.padStart(
      8,
    )}${'zeros'.padStart(8)}${'sub5'.padStart(8)}${'max/med'.padStart(
      9,
    )}${'c25'.padStart(7)}${'c50'.padStart(7)}${'c75'.padStart(
      7,
    )}${'eff#'.padStart(8)}`,
  );
};

const row = (beta: number, jurors: number, runs: Metrics[]) => {
  const g = avg(runs, (m) => m.gini);
  const z = avg(runs, (m) => m.zeroCount);
  const s5 = avg(runs, (m) => m.sub5Count);
  const mm = mean(
    runs
      .map((m) => (Number.isFinite(m.maxToMedian) ? m.maxToMedian : NaN))
      .filter(Number.isFinite),
  );
  const c = (gpos: number) => avg(runs, (m) => m.curve[Math.round(gpos * 20)]);
  const eff = avg(runs, (m) => m.effectiveN);

  // eslint-disable-next-line no-console
  console.log(
    `  ${f(beta).padStart(6)}${String(jurors).padStart(8)}${f(g).padStart(
      8,
    )}${f(z).padStart(8)}${f(s5).padStart(8)}${f(mm).padStart(9)}${f(
      c(0.25),
    ).padStart(7)}${f(c(0.5)).padStart(7)}${f(c(0.75)).padStart(7)}${f(
      eff,
    ).padStart(8)}`,
  );
};

const base: Params = { betaJury: 1, betaTele: 1, jurors: 5, luckMag: 0.45 };

// ---- JURY sweep: vary betaJury, and compare jurors 5 vs 1 -------------------
header('JURY');
for (const jurors of [5, 1]) {
  for (const beta of [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0]) {
    const { jury } = runWith({ ...base, betaJury: beta, jurors });

    row(beta, jurors, jury);
  }
}

// ---- TELEVOTE sweep: vary betaTele (jurors irrelevant for televote) ---------
header('TELEVOTE');
for (const beta of [0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.4, 2.8]) {
  const { tele } = runWith({ ...base, betaTele: beta });

  row(beta, 0, tele);
}
