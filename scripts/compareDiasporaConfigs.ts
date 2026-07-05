/*
 * Compare the simulated scoreboard shape under different diaspora configs
 * against the historical envelope, through the REAL production engine
 * (resolveDiaspora -> predefineStageVotes, incl. the betaTele compensation).
 *
 * Answers: is enabling the full historical set (broad preset) by default a good
 * idea shape-wise, vs a blocs-only config?
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/compareDiasporaConfigs.ts [runs]
 */

/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

import { BaseCountry, StageVotingMode, VotingCountry } from '../src/models';
import { CountryOdds } from '../src/state/countriesStore';
import { PointsItem } from '../src/state/generalStore';
import {
  DEFAULT_DIASPORA_SETTINGS,
  DiasporaSettings,
  resolveAffinityMap,
  resolveDiaspora,
} from '../src/state/scoreboard/diaspora';
import { Vote } from '../src/state/scoreboard/types';
import { predefineStageVotes } from '../src/state/scoreboard/votesPredefinition';

import { computeMetrics, Envelope, mean, Metrics } from './shapeMetrics';

const RUNS = Number(process.argv[2] ?? 600);
const YEAR = 2026;

const POINTS_ARRAY = new Array(10).fill(0).map((_, i) => {
  const p = i + 1;

  if (p === 9) return 10;
  if (p === 10) return 12;

  return p;
});
const pointsSystem: PointsItem[] = POINTS_ARRAY.map((value, id) => ({
  value,
  showDouzePoints: value === 12,
  id,
}));

const file: { countries: BaseCountry[] } = JSON.parse(
  fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'public',
      'data',
      'countries',
      `countries-${YEAR}.json`,
    ),
    'utf-8',
  ),
);
const finalists = file.countries.filter((c) => c.isQualified);
const finalistCodes = finalists.map((c) => c.code);
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

const aggregate = (byVoter: Record<string, Vote[]> | undefined): number[] => {
  const totals: Record<string, number> = {};

  for (const code of finalistCodes) totals[code] = 0;
  if (byVoter) {
    for (const voter of Object.keys(byVoter)) {
      for (const v of byVoter[voter]) {
        if (totals[v.countryCode] !== undefined)
          totals[v.countryCode] += v.points;
      }
    }
  }

  return finalistCodes.map((c) => totals[c]);
};

const env: { envelopes: Envelope[] } = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'historicalShapeEnvelope.json'),
    'utf-8',
  ),
);
const hist = (c: string) => env.envelopes.find((e) => e.channel === c)!;

const base = DEFAULT_DIASPORA_SETTINGS;
const configs: { label: string; settings: DiasporaSettings | null }[] = [
  { label: 'OFF (no diaspora)', settings: { ...base, enabled: false } },
  {
    label: 'BLOCS only (groups+specials, no broad/rivalries)',
    settings: { ...base, useBroadPreset: false, useRivalries: false },
  },
  {
    label: 'BLOCS + rivalries (no broad)',
    settings: { ...base, useBroadPreset: false, useRivalries: true },
  },
  {
    label: 'FULL SET (current default: broad+groups+specials+rivalries)',
    settings: base,
  },
];

const f2 = (x: number) => x.toFixed(2);
const g = (runs: Metrics[], sel: (m: Metrics) => number) =>
  f2(mean(runs.map(sel)));
const line = '='.repeat(92);

console.log(line);
console.log(
  `DIASPORA CONFIG COMPARISON  (year ${YEAR}, ${RUNS} runs, randomness=50, spread=50)`,
);
console.log(
  'history targets: TELE Gini 0.54 / maxmed 7.07 / zeros 1.40 | JURY 0.45 / 4.65 / 0.50 | TOTAL 0.43 / 4.36 / 0.10',
);
console.log(line);

for (const cfg of configs) {
  const resolved = cfg.settings ? resolveDiaspora(cfg.settings) : null;
  const load =
    cfg.settings && cfg.settings.enabled
      ? Object.values(resolveAffinityMap(cfg.settings)).reduce(
          (s, row) => s + Object.values(row).filter((v) => v > 0).length,
          0,
        )
      : 0;

  const jury: Metrics[] = [];
  const tele: Metrics[] = [];
  const total: Metrics[] = [];

  for (let i = 0; i < RUNS; i += 1) {
    const votes = predefineStageVotes(
      finalists,
      votingCountries,
      StageVotingMode.JURY_AND_TELEVOTE,
      odds,
      50,
      50,
      pointsSystem,
      pointsSystem,
      false,
      resolved,
    );
    const j = aggregate(votes.jury);
    const tv = aggregate(votes.televote);

    jury.push(computeMetrics(j));
    tele.push(computeMetrics(tv));
    total.push(computeMetrics(finalistCodes.map((_, k) => j[k] + tv[k])));
  }

  const row = (label: string, runs: Metrics[], h: Envelope) =>
    `  ${label.padEnd(9)} Gini ${g(runs, (m) => m.gini)} (${f2(
      h.scalar.gini.mean,
    )})   ` +
    `maxmed ${g(runs, (m) =>
      Number.isFinite(m.maxToMedian) ? m.maxToMedian : NaN,
    )} (${f2(h.scalar.maxToMedian.mean)})   ` +
    `zeros ${g(runs, (m) => m.zeroCount)} (${f2(h.scalar.zeroCount.mean)})`;

  console.log(`\n### ${cfg.label}`);
  console.log(
    `    positive pairs applied: ${load}   betaTeleBoost: +${f2(
      resolved?.betaTeleBoost ?? 0,
    )}`,
  );
  console.log(row('TELEVOTE', tele, hist('TELEVOTE')));
  console.log(row('JURY', jury, hist('JURY')));
  console.log(row('TOTAL', total, hist('SPLIT_TOTAL')));
}
console.log(`\n${line}`);
console.log(
  '(sim value (history target)). betaTeleBoost is the automatic shape compensation.',
);
