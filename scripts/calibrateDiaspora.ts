/*
 * Calibrate the betaTele compensation for the DEFAULT diaspora config (groups +
 * special pairs at strength 60 = K3), using the real production resolver. Sweeps
 * betaTele to find the value that restores the televote Gini / max-median to the
 * historical envelope, and prints what src/state/scoreboard/diaspora.ts's
 * betaTeleBoostFor currently predicts — so we can set BOOST_COEF.
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/calibrateDiaspora.ts [runs]
 */

/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

import {
  betaTeleBoostFor,
  DEFAULT_DIASPORA_SETTINGS,
  DiasporaSettings,
  resolveAffinityMap,
  strengthToK,
} from '../src/state/scoreboard/diaspora';

import { loadYear, simulateContest } from './plSampler';
import { computeMetrics, Envelope, mean, Metrics } from './shapeMetrics';

const RUNS = Number(process.argv[2] ?? 800);
const YEAR = 2026;

const env: { envelopes: Envelope[] } = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'historicalShapeEnvelope.json'),
    'utf-8',
  ),
);
const teleHist = env.envelopes.find((e) => e.channel === 'TELEVOTE')!;

const { candidates, voterCodes } = loadYear(YEAR);

const measureTele = (
  betaTele: number,
  affinity: Record<string, Record<string, number>>,
  k: number,
) => {
  const P = { betaJury: 2.3, betaTele, jurors: 1, luckMag: 0.58 };
  const runs: Metrics[] = [];

  for (let i = 0; i < RUNS; i += 1) {
    const r = simulateContest(candidates, voterCodes, P, {
      affinity,
      affinityK: k,
      juryScale: 0.35,
    });

    runs.push(computeMetrics(r.televote));
  }

  return {
    gini: mean(runs.map((m) => m.gini)),
    maxMed: mean(
      runs.map((m) => (Number.isFinite(m.maxToMedian) ? m.maxToMedian : NaN)),
    ),
    zeros: mean(runs.map((m) => m.zeroCount)),
  };
};

const run = (label: string, s: DiasporaSettings) => {
  const affinity = resolveAffinityMap(s);
  const k = strengthToK(s.strength);
  let load = 0;

  for (const f of Object.keys(affinity)) {
    for (const t of Object.keys(affinity[f]))
      load += Math.max(0, affinity[f][t]) / 100;
  }
  const predictedBoost = betaTeleBoostFor(affinity, k);

  const f2 = (x: number) => x.toFixed(2);

  console.log(`\n### ${label}   (K=${f2(k)}, positive load=${f2(load)})`);
  console.log(
    `  target: tele Gini ${f2(teleHist.scalar.gini.mean)}, max/med ${f2(
      teleHist.scalar.maxToMedian.mean,
    )}`,
  );
  console.log(
    `  betaTeleBoostFor() predicts: +${f2(predictedBoost)}  => betaTele ${f2(
      2.6 + predictedBoost,
    )}`,
  );
  console.log(
    `  ${'betaTele'.padStart(9)}${'Gini'.padStart(8)}${'max/med'.padStart(
      9,
    )}${'zeros'.padStart(8)}`,
  );
  for (const bt of [2.6, 2.7, 2.8, 2.9, 3.0, 3.1]) {
    const m = measureTele(bt, affinity, k);
    const flag =
      bt === Number((2.6 + predictedBoost).toFixed(1)) ? '  <- predicted' : '';

    console.log(
      `  ${f2(bt).padStart(9)}${f2(m.gini).padStart(8)}${f2(m.maxMed).padStart(
        9,
      )}${f2(m.zeros).padStart(8)}${flag}`,
    );
  }
};

// Default config (groups + specials, strength 60)
run('DEFAULT (groups + specials, strength 60)', DEFAULT_DIASPORA_SETTINGS);

// Heavier config: broad preset on, strength 60 — check the boost scales sensibly
run('BROAD ("all pairs"), strength 60', {
  ...DEFAULT_DIASPORA_SETTINGS,
  useBroadPreset: true,
});
