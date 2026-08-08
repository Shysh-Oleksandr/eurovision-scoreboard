/*
 * Point-spread finder. The user wants to pick a `spread` knob value that lands a
 * given point RANGE on the final board — e.g. "last place gets ~7-15, winner
 * ~178-180". The spread knob (beta) doesn't change the total points distributed
 * (that's fixed by the field); it changes how CONCENTRATED they are: high spread
 * pulls the winner far ahead and collapses the tail toward zero, low spread
 * flattens everything toward the field mean.
 *
 * This sweeps spread across 0..100, and for each value runs the real
 * predefineStageVotes() engine over the last five editions (2021-2026), building
 * the same TOTAL board (jury + televote) the app shows. It reports, per spread:
 *   - winner total: mean, and a p10..p90 run-to-run band
 *   - last total:   mean, and a p10..p90 run-to-run band
 * then flags the spread whose bands sit closest to the requested target, so you
 * can read off "use spread = N".
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/tunePointSpread.ts \
 *        [randomness] [runsPerYear] [mode]
 *   randomness  : luck knob, default 50 (the app default)
 *   runsPerYear : simulations per edition per spread, default 400
 *   mode        : JURY_AND_TELEVOTE (default) | TELEVOTE_ONLY | JURY_ONLY
 *   e.g. npx ts-node --files -P tsconfig.scripts.json scripts/tunePointSpread.ts 50 400
 */

import * as fs from 'fs';
import * as path from 'path';

import { BaseCountry, StageVotingMode, VotingCountry } from '../src/models';
import { CountryOdds } from '../src/state/countriesStore';
import { PointsItem } from '../src/state/generalStore';
import { Vote } from '../src/state/scoreboard/types';
import { predefineStageVotes } from '../src/state/scoreboard/votesPredefinition';

// The default 12-point Eurovision system (1..8, 10, 12), same as analyzeSimShape.
const POINTS_ARRAY = new Array(10).fill(0).map((_, index) => {
  const points = index + 1;

  if (points === 9) return 10;
  if (points === 10) return 12;

  return points;
});

const pointsSystem: PointsItem[] = POINTS_ARRAY.map((value, id) => ({
  value,
  showDouzePoints: value === 12,
  id,
}));

// ---- what we're aiming for --------------------------------------------------
// The absolute winner total is fixed by the field, so it can't be "chosen" via
// spread. What the user actually wants: the FLATTEST board (smallest possible
// 1st place) that still keeps the tail alive -- last place non-null but modest.
// So we look for the lowest spread whose last-place mean has come down into a
// modest band while nulls (last place == 0) stay rare.
const GOAL = {
  maxNullRate: 0.05, // last place should be non-null in >= 95% of contests
  lastMeanCap: 18, // ...while last place isn't "very high"
};

const YEARS = [2021, 2022, 2023, 2024, 2025, 2026];

// Some editions store a bare BaseCountry[]; others wrap it in { countries }.
type CountryFile = BaseCountry[] | { countries: BaseCountry[] };

const loadYear = (year: number) => {
  const p = path.join(
    __dirname,
    '..',
    'public',
    'data',
    'countries',
    `countries-${year}.json`,
  );
  const parsed: CountryFile = JSON.parse(fs.readFileSync(p, 'utf-8'));
  const countries = Array.isArray(parsed) ? parsed : parsed.countries;

  // Grand-final field = qualified countries; everyone in the edition votes.
  const finalists = countries.filter((c) => c.isQualified);
  const votingCountries: VotingCountry[] = countries.map((c) => ({
    code: c.code,
    name: c.name,
    flag: c.flag,
  }));
  const odds: CountryOdds = {};

  for (const c of countries) {
    odds[c.code] = {
      juryOdds: c.juryOdds ?? 50,
      televoteOdds: c.televoteOdds ?? 50,
    };
  }

  return { finalists, votingCountries, odds };
};

// Sum a channel's per-voter Vote[] into a per-candidate point total array.
const aggregate = (
  votesByVoter: Record<string, Vote[]> | undefined,
  finalistCodes: string[],
): number[] => {
  const totals: Record<string, number> = {};

  for (const code of finalistCodes) totals[code] = 0;
  if (votesByVoter) {
    for (const voter of Object.keys(votesByVoter)) {
      for (const v of votesByVoter[voter]) {
        if (totals[v.countryCode] !== undefined) {
          totals[v.countryCode] += v.points;
        }
      }
    }
  }

  return finalistCodes.map((code) => totals[code]);
};

const mean = (xs: number[]): number =>
  xs.reduce((a, b) => a + b, 0) / xs.length;

// Percentile of an unsorted sample (linear interpolation).
const percentile = (values: number[], q: number): number => {
  const asc = [...values].sort((a, b) => a - b);
  const pos = q * (asc.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);

  return asc[lo] + (asc[hi] - asc[lo]) * (pos - lo);
};

type SpreadResult = {
  spread: number;
  winnerMean: number;
  winnerP10: number;
  winnerP90: number;
  lastMean: number;
  lastP10: number;
  lastP90: number;
  nullRate: number; // P(the last-place country scored exactly 0)
  zeroCountMean: number; // avg. number of countries on 0 points
};

const measureSpread = (
  spread: number,
  randomness: number,
  runsPerYear: number,
  mode: StageVotingMode,
  loaded: ReturnType<typeof loadYear>[],
): SpreadResult => {
  const winnerTotals: number[] = [];
  const lastTotals: number[] = [];
  let nullRuns = 0;
  let zeroCountSum = 0;

  for (const { finalists, votingCountries, odds } of loaded) {
    const finalistCodes = finalists.map((c) => c.code);

    for (let i = 0; i < runsPerYear; i += 1) {
      const votes = predefineStageVotes(
        finalists,
        votingCountries,
        mode,
        odds,
        randomness,
        spread,
        pointsSystem,
        pointsSystem,
        false,
        null,
      );

      const jury = aggregate(votes.jury, finalistCodes);
      const televote = aggregate(votes.televote, finalistCodes);
      const total = finalistCodes.map(
        (_, idx) => (jury[idx] ?? 0) + (televote[idx] ?? 0),
      );

      const last = Math.min(...total);

      winnerTotals.push(Math.max(...total));
      lastTotals.push(last);
      if (last === 0) nullRuns += 1;
      zeroCountSum += total.filter((v) => v === 0).length;
    }
  }

  const totalRuns = loaded.length * runsPerYear;

  return {
    spread,
    winnerMean: mean(winnerTotals),
    winnerP10: percentile(winnerTotals, 0.1),
    winnerP90: percentile(winnerTotals, 0.9),
    lastMean: mean(lastTotals),
    lastP10: percentile(lastTotals, 0.1),
    lastP90: percentile(lastTotals, 0.9),
    nullRate: nullRuns / totalRuns,
    zeroCountMean: zeroCountSum / totalRuns,
  };
};

const main = () => {
  const randomness = Number(process.argv[2] ?? 50);
  const runsPerYear = Number(process.argv[3] ?? 400);
  const modeArg = (process.argv[4] ?? 'JURY_AND_TELEVOTE') as keyof typeof StageVotingMode;
  const mode = StageVotingMode[modeArg] ?? StageVotingMode.JURY_AND_TELEVOTE;

  const loaded = YEARS.map(loadYear);
  const fieldSizes = loaded.map((l) => l.finalists.length);
  const voterCounts = loaded.map((l) => l.votingCountries.length);

  // Sweep the whole range at a fine step -- fast enough and no target to home in
  // on, we want to see the full winner/last/null trade-off.
  const all: SpreadResult[] = [];

  for (let s = 0; s <= 100; s += 5) {
    all.push(measureSpread(s, randomness, runsPerYear, mode, loaded));
  }

  // Recommended = the LOWEST spread (=> smallest winner) whose last-place mean is
  // already within the modest cap AND whose null rate is acceptable. Falls back
  // to the spread with the lowest null-penalised last mean if none qualify.
  const qualifying = all.filter(
    (r) => r.nullRate <= GOAL.maxNullRate && r.lastMean <= GOAL.lastMeanCap,
  );
  const best =
    qualifying.length > 0
      ? qualifying.sort((a, b) => a.spread - b.spread)[0]
      : [...all].sort(
          (a, b) =>
            a.lastMean +
            a.nullRate * 100 -
            (b.lastMean + b.nullRate * 100),
        )[0];

  const f0 = (x: number) => x.toFixed(0);
  const line = '='.repeat(78);
  const out: string[] = [];

  out.push(line);
  out.push(
    `POINT-SPREAD FINDER   (${StageVotingMode[mode]} total, randomness=${randomness}, ${runsPerYear} runs/yr)`,
  );
  out.push(line);
  out.push(
    `editions: ${YEARS.join(', ')}  |  field ${Math.min(
      ...fieldSizes,
    )}-${Math.max(...fieldSizes)} finalists, ${Math.min(
      ...voterCounts,
    )}-${Math.max(...voterCounts)} voters`,
  );
  out.push(
    `goal:     smallest winner + non-null tail  (last mean <= ${GOAL.lastMeanCap}, null rate <= ${(
      GOAL.maxNullRate * 100
    ).toFixed(0)}%)`,
  );
  out.push('');
  out.push(
    `  ${'spread'.padStart(7)}${'winner mean'.padStart(13)}${'last mean'.padStart(
      11,
    )}${'last p10..p90'.padStart(15)}${'null%'.padStart(8)}${'#zeros'.padStart(
      8,
    )}`,
  );

  for (const r of all) {
    const marker = r.spread === best.spread ? '  <-- recommended' : '';
    const lastBand = `${f0(r.lastP10)}..${f0(r.lastP90)}`;

    out.push(
      `  ${f0(r.spread).padStart(7)}${r.winnerMean
        .toFixed(0)
        .padStart(13)}${r.lastMean.toFixed(1).padStart(11)}${lastBand.padStart(
        15,
      )}${(r.nullRate * 100).toFixed(1).padStart(8)}${r.zeroCountMean
        .toFixed(1)
        .padStart(8)}${marker}`,
    );
  }

  out.push('');
  out.push(line);
  out.push(
    `Recommended: spread = ${best.spread}  ->  winner ~${best.winnerMean.toFixed(
      0,
    )}, last ~${best.lastMean.toFixed(0)} (${f0(best.lastP10)}..${f0(
      best.lastP90,
    )}), last-is-null ${(best.nullRate * 100).toFixed(1)}% of contests`,
  );
  out.push(
    'Lower spread => flatter board (smaller winner) but a higher last place; higher spread => sharper winner but the tail sinks toward 0.',
  );
  out.push(
    'p10..p90 = the band 80% of simulated contests fall inside (the "from X to Y" range last place lands on).',
  );

  // eslint-disable-next-line no-console
  console.log(out.join('\n'));
};

main();
