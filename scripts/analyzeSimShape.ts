/*
 * Step 1b: measure the shape the CURRENT engine produces, with the exact same
 * metrics used on the real data, so we can see the gap.
 *
 * It loads the real 2026 year-odds, runs predefineStageVotes() many times at a
 * given (randomness, spread) setting, aggregates each run into jury / televote /
 * total scoreboards, computes the shared shape metrics, and prints the sim mean
 * next to the historical envelope mean (JURY vs JURY, TELEVOTE vs TELEVOTE,
 * total vs SPLIT_TOTAL) with the delta.
 *
 * Run: npx ts-node -P tsconfig.scripts.json scripts/analyzeSimShape.ts [randomness] [spread] [runs]
 *   e.g. npx ts-node -P tsconfig.scripts.json scripts/analyzeSimShape.ts 50 50 300
 */

import * as fs from 'fs';
import * as path from 'path';

import { BaseCountry, StageVotingMode, VotingCountry } from '../src/models';
import { CountryOdds } from '../src/state/countriesStore';
import { PointsItem } from '../src/state/generalStore';
import {
  DEFAULT_DIASPORA_SETTINGS,
  resolveDiaspora,
} from '../src/state/scoreboard/diaspora';
import { Vote } from '../src/state/scoreboard/types';
import { predefineStageVotes } from '../src/state/scoreboard/votesPredefinition';

import { computeMetrics, Envelope, Metrics, mean } from './shapeMetrics';

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

type CountryFile = { countries: BaseCountry[] };

const loadYear = (year: number) => {
  const p = path.join(
    __dirname,
    '..',
    'public',
    'data',
    'countries',
    `countries-${year}.json`,
  );
  const file: CountryFile = JSON.parse(fs.readFileSync(p, 'utf-8'));

  // Grand-final field = qualified countries; voters = everyone in the edition
  // (finalists + non-qualifiers all vote in the final), mirroring reality and
  // the ~26-finalist / ~37-voter shape of the historical envelope.
  const finalists = file.countries.filter((c) => c.isQualified);
  const votingCountries: VotingCountry[] = file.countries.map((c) => ({
    code: c.code,
    name: c.name,
    flag: c.flag,
  }));
  const odds: CountryOdds = {};

  for (const c of file.countries) {
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

const meanMetrics = (runs: Metrics[]): Record<string, number> => {
  const keys: (keyof Metrics)[] = [
    'n',
    'winnerShare',
    'winnerMargin',
    'top3Share',
    'top10Share',
    'zeroCount',
    'zeroFrac',
    'sub5Count',
    'maxToMedian',
    'gini',
    'effectiveN',
    'effectiveFrac',
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
  const runs = Number(process.argv[4] ?? 300);
  // argv[5]=1 exercises the production default diaspora config end-to-end.
  const useDiaspora = process.argv[5] === '1';
  const diaspora = useDiaspora
    ? resolveDiaspora(DEFAULT_DIASPORA_SETTINGS)
    : null;
  const YEAR = 2026;

  const { finalists, votingCountries, odds } = loadYear(YEAR);
  const finalistCodes = finalists.map((c) => c.code);

  const juryRuns: Metrics[] = [];
  const televoteRuns: Metrics[] = [];
  const totalRuns: Metrics[] = [];

  for (let i = 0; i < runs; i += 1) {
    const votes = predefineStageVotes(
      finalists,
      votingCountries,
      StageVotingMode.JURY_AND_TELEVOTE,
      odds,
      randomness,
      spread,
      pointsSystem,
      pointsSystem,
      false,
      diaspora,
    );

    const jury = aggregate(votes.jury, finalistCodes);
    const televote = aggregate(votes.televote, finalistCodes);
    const total = finalistCodes.map((_, idx) => jury[idx] + televote[idx]);

    juryRuns.push(computeMetrics(jury));
    televoteRuns.push(computeMetrics(televote));
    totalRuns.push(computeMetrics(total));
  }

  // ---- load historical envelope for comparison ------------------------------
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
    const hc = hist.curve.mean;
    const hAt = (g: number) => hc[Math.round(g * 20)];
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
    const out: string[] = [];

    out.push('');
    out.push(`### ${title}`);
    out.push(
      `  ${'metric'.padEnd(18)}${'SIM'.padStart(10)}${'HISTORY'.padStart(
        12,
      )}${'Δ'.padStart(12)}`,
    );
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

  const report: string[] = [];

  report.push(line);
  report.push(
    `CURRENT ENGINE vs HISTORY   (year ${YEAR} odds, randomness=${randomness}, spread=${spread}, ${runs} runs)`,
  );
  report.push(line);
  report.push(
    `field: ${finalistCodes.length} finalists, ${votingCountries.length} voting countries`,
  );
  report.push(
    compare(
      'JURY  (sim jury vs history JURY)',
      meanMetrics(juryRuns),
      histOf('JURY'),
    ),
  );
  report.push(
    compare(
      'TELEVOTE  (sim televote vs history TELEVOTE)',
      meanMetrics(televoteRuns),
      histOf('TELEVOTE'),
    ),
  );
  report.push(
    compare(
      'TOTAL  (sim jury+televote vs history SPLIT_TOTAL)',
      meanMetrics(totalRuns),
      histOf('SPLIT_TOTAL'),
    ),
  );
  report.push('');
  report.push(line);
  report.push(
    'Δ = sim - history.  "<-- off" flags metrics >25% away from the real value.',
  );

  // eslint-disable-next-line no-console
  console.log(report.join('\n'));
};

main();
