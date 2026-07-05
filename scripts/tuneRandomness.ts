/*
 * Randomness-knob tuner. The `spread` knob (beta) is validated; this isolates
 * the `randomness` knob (luckMag) and measures how "chaotic" the outcome is as a
 * function of luckMag, so we can fit a luckMag(randomness) curve that:
 *   - barely moves the shape at the default (randomness 50), and
 *   - makes randomness 100 genuinely unpredictable (the odds favourite should
 *     NOT win ~9/10 runs).
 *
 * Chaos metrics (on the TOTAL board, spread fixed at 50):
 *   favWin%   - how often the pre-race odds favourite wins           (100% -> 0)
 *   favRank   - the favourite's mean finishing position (1 = win)
 *   podium%   - fraction of the pre-race top-3 that finish top-3
 *   spearman  - rank correlation between odds order and result order (1 -> 0)
 *   rankVol   - mean run-to-run rank volatility per country (positions)
 *   Gini      - total-board concentration (shape guard; ~0.43 is realistic)
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/tuneRandomness.ts [runs]
 */

import { Candidate, loadYear, Params, simulateContest } from './plSampler';
import { computeMetrics, mean } from './shapeMetrics';

const RUNS = Number(process.argv[2] ?? 800);
const YEAR = 2026;
const SPREAD = 50; // validated default; betaJury=2.3, betaTele=2.6

const { candidates, voterCodes } = loadYear(YEAR);
const oddsValue = (c: Candidate) => c.juryOdds + c.televoteOdds;

const codes = candidates.map((c) => c.code);
const oddsRank: Record<string, number> = {};

[...candidates]
  .sort((a, b) => oddsValue(b) - oddsValue(a))
  .forEach((c, i) => {
    oddsRank[c.code] = i;
  });
const [favourite] = [...candidates].sort((a, b) => oddsValue(b) - oddsValue(a));
const preTop3 = [...candidates]
  .sort((a, b) => oddsValue(b) - oddsValue(a))
  .slice(0, 3)
  .map((c) => c.code);

const pearson = (xs: number[], ys: number[]): number => {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;

  for (let i = 0; i < xs.length; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }

  return dx === 0 || dy === 0 ? 0 : num / Math.sqrt(dx * dy);
};

const measure = (luckMag: number) => {
  const p: Params = { betaJury: 2.3, betaTele: 2.6, jurors: 1, luckMag };

  let favWins = 0;
  let favRankSum = 0;
  let podiumHits = 0;
  let spearmanSum = 0;
  let giniSum = 0;
  const rankAccum: Record<string, number[]> = {};

  for (const c of codes) rankAccum[c] = [];

  for (let run = 0; run < RUNS; run += 1) {
    const { total } = simulateContest(candidates, voterCodes, p);
    const totalByCode: Record<string, number> = {};

    codes.forEach((c, i) => {
      totalByCode[c] = total[i];
    });

    const resultOrder = [...codes].sort(
      (a, b) => totalByCode[b] - totalByCode[a],
    );
    const resultRank: Record<string, number> = {};

    resultOrder.forEach((c, i) => {
      resultRank[c] = i;
    });

    if (resultOrder[0] === favourite.code) favWins += 1;
    favRankSum += resultRank[favourite.code] + 1;
    podiumHits += preTop3.filter((c) => resultRank[c] < 3).length;

    spearmanSum += pearson(
      codes.map((c) => oddsRank[c]),
      codes.map((c) => resultRank[c]),
    );
    giniSum += computeMetrics(total).gini;
    for (const c of codes) rankAccum[c].push(resultRank[c]);
  }

  const rankVol = mean(
    codes.map((c) => {
      const rs = rankAccum[c];
      const m = mean(rs);

      return Math.sqrt(mean(rs.map((x) => (x - m) ** 2)));
    }),
  );

  return {
    favWin: favWins / RUNS,
    favRank: favRankSum / RUNS,
    podium: podiumHits / (3 * RUNS),
    spearman: spearmanSum / RUNS,
    rankVol,
    gini: giniSum / RUNS,
  };
};

const f2 = (x: number) => x.toFixed(2);
const pc = (x: number) => `${(x * 100).toFixed(0)}%`;

// eslint-disable-next-line no-console
console.log(
  `Randomness tuner  (year ${YEAR}, spread ${SPREAD}, ${RUNS} runs)\nfavourite = ${
    favourite.code
  } (odds ${oddsValue(favourite)})\n`,
);
// eslint-disable-next-line no-console
console.log(
  `  ${'luckMag'.padStart(8)}${'favWin%'.padStart(9)}${'favRank'.padStart(
    9,
  )}${'podium%'.padStart(9)}${'spearman'.padStart(10)}${'rankVol'.padStart(
    9,
  )}${'Gini'.padStart(8)}`,
);
for (const luckMag of [
  0, 0.2, 0.45, 0.7, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 7.0,
]) {
  const m = measure(luckMag);

  // eslint-disable-next-line no-console
  console.log(
    `  ${f2(luckMag).padStart(8)}${pc(m.favWin).padStart(9)}${f2(
      m.favRank,
    ).padStart(9)}${pc(m.podium).padStart(9)}${f2(m.spearman).padStart(10)}${f2(
      m.rankVol,
    ).padStart(9)}${f2(m.gini).padStart(8)}`,
  );
}
