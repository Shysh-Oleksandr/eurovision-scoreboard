/*
 * Step 2 prototype: a structural Plackett-Luce (Gumbel-max) voting sampler,
 * standalone so the production engine is untouched while we tune it against the
 * historical shape targets from step 1.
 *
 * MODEL
 *   For each channel, each candidate i has a latent quality:
 *       theta_i = beta * ln(odds_i)  +  luckMag * N_i
 *   - beta (from `spread`)  -> how strongly the odds separate candidates. This is
 *     the within-draw signal; it sets the board's GAPS. weight_i = odds_i^beta.
 *   - N_i ~ Normal(0,1) drawn ONCE per contest, shared across all voters
 *     (from `randomness`) -> which songs over/under-perform THIS run. Moves
 *     unpredictability without touching the gaps. (Averages out over many runs,
 *     so it barely shifts the mean shape - exactly what we want.)
 *
 *   A single voter's ranking = sort candidates by  theta_i + Gumbel(0,1)  desc.
 *   (theta + Gumbel, argsort  <=>  Plackett-Luce draw from weights e^theta.)
 *
 *   JURY   = average of `jurors` independent juror rankings, aggregated by
 *            rank-sum (like real ESC juries) -> smooth, rarely zeros anyone.
 *   TELEVOTE = a SINGLE draw with its own (higher) beta -> spikier, more zeros.
 *
 *   Top-N of each voter's aggregated ranking gets 12,10,8,7,6,5,4,3,2,1.
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/prototypePlackettLuce.ts \
 *        [randomness] [spread] [runs]
 */

import * as fs from 'fs';
import * as path from 'path';

import { loadYear, paramsFor, simulateContest } from './plSampler';
import { computeMetrics, Envelope, Metrics, mean } from './shapeMetrics';

// ---- report (same layout as analyzeSimShape) --------------------------------

const meanMetrics = (runs: Metrics[]): Record<string, number> => {
  const keys: (keyof Metrics)[] = [
    'winnerShare',
    'winnerMargin',
    'top3Share',
    'top10Share',
    'zeroCount',
    'sub5Count',
    'maxToMedian',
    'gini',
    'effectiveN',
  ];
  const out: Record<string, number> = {};

  for (const k of keys) out[k] = mean(runs.map((r) => r[k] as number));
  const curveAt = (g: number) =>
    mean(runs.map((r) => r.curve[Math.round(g * 20)]));

  out['curve25'] = curveAt(0.25);
  out['curve50'] = curveAt(0.5);
  out['curve75'] = curveAt(0.75);

  return out;
};

const main = () => {
  const randomness = Number(process.argv[2] ?? 50);
  const spread = Number(process.argv[3] ?? 50);
  const runs = Number(process.argv[4] ?? 400);
  const YEAR = Number(process.argv[5] ?? 2026);

  const { candidates, voterCodes, numVoters } = loadYear(YEAR);
  const p = paramsFor(randomness, spread);

  const juryRuns: Metrics[] = [];
  const televoteRuns: Metrics[] = [];
  const totalRuns: Metrics[] = [];

  for (let i = 0; i < runs; i += 1) {
    const r = simulateContest(candidates, voterCodes, p);

    juryRuns.push(computeMetrics(r.jury));
    televoteRuns.push(computeMetrics(r.televote));
    totalRuns.push(computeMetrics(r.total));
  }

  const env: { envelopes: Envelope[] } = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'historicalShapeEnvelope.json'),
      'utf-8',
    ),
  );
  const histOf = (channel: string) =>
    env.envelopes.find((e) => e.channel === channel)!;

  const f2 = (x: number) => x.toFixed(2);
  const line = '='.repeat(86);

  const compare = (
    title: string,
    sim: Record<string, number>,
    hist: Envelope,
  ) => {
    const h = hist.scalar;
    const hAt = (g: number) => hist.curve.mean[Math.round(g * 20)];
    const rows: [string, number, number][] = [
      ['winner share', sim.winnerShare, h.winnerShare.mean],
      ['winner margin', sim.winnerMargin, h.winnerMargin.mean],
      ['top-3 share', sim.top3Share, h.top3Share.mean],
      ['top-10 share', sim.top10Share, h.top10Share.mean],
      ['# zeros', sim.zeroCount, h.zeroCount.mean],
      ['# near-nul(<5%)', sim.sub5Count, h.sub5Count.mean],
      ['max/median', sim.maxToMedian, h.maxToMedian.mean],
      ['Gini', sim.gini, h.gini.mean],
      ['effective #', sim.effectiveN, h.effectiveN.mean],
      ['curve @25%', sim.curve25, hAt(0.25)],
      ['curve @50%', sim.curve50, hAt(0.5)],
      ['curve @75%', sim.curve75, hAt(0.75)],
    ];
    const out = [
      '',
      `### ${title}`,
      `  ${'metric'.padEnd(18)}${'SIM'.padStart(10)}${'HISTORY'.padStart(
        12,
      )}${'Δ'.padStart(12)}`,
    ];

    for (const [label, s, hv] of rows) {
      const delta = s - hv;
      const flag = Math.abs(delta) > Math.abs(hv) * 0.25 ? '  <-- off' : '';

      out.push(
        `  ${label.padEnd(18)}${f2(s).padStart(10)}${f2(hv).padStart(12)}${
          (delta >= 0 ? '+' : '') + f2(delta)
        }`.padEnd(52) + flag,
      );
    }

    return out.join('\n');
  };

  const report = [
    line,
    `PLACKETT-LUCE PROTOTYPE vs HISTORY   (year ${YEAR}, randomness=${randomness}, spread=${spread}, ${runs} runs)`,
    line,
    `params: betaJury=${p.betaJury} betaTele=${p.betaTele} jurors=${
      p.jurors
    } luckMag=${f2(p.luckMag)}`,
    `field: ${candidates.length} finalists, ${numVoters} voting countries`,
    compare('JURY', meanMetrics(juryRuns), histOf('JURY')),
    compare('TELEVOTE', meanMetrics(televoteRuns), histOf('TELEVOTE')),
    compare(
      'TOTAL (jury+televote vs SPLIT_TOTAL)',
      meanMetrics(totalRuns),
      histOf('SPLIT_TOTAL'),
    ),
    '',
    line,
    'Δ = sim - history.  "<-- off" flags metrics >25% away from the real value.',
  ];

  // eslint-disable-next-line no-console
  console.log(report.join('\n'));
};

main();
