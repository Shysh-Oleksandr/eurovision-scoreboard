/*
 * Step 1 of the voting-predefinition refactor: extract the *shape* of real
 * Eurovision grand-final scoreboards so we have an objective, data-driven target
 * to calibrate the simulator against (instead of eyeball-tuning an exponent).
 *
 * The point-total SCALE is not comparable across eras, so every metric here is
 * scale-invariant (shares, ratios, fractions, Gini, a max-normalized decay
 * curve). Two structural regimes exist in the data:
 *
 *   - 2016-2026  "split" era: each voting country awards TWO independent 12->1
 *     sets (jury AND televote). We have the per-channel breakdown, so we build
 *     THREE envelopes: JURY, TELEVOTE, and their SUM (SPLIT_TOTAL).
 *   - 2003-2015  "combined" era: each country awarded ONE 12->1 set. Only totals
 *     exist. This is a smoother, more consensual regime -> COMBINED_TOTAL.
 *
 * Output: a human-readable report to stdout + a machine-readable envelope written
 * to scripts/historicalShapeEnvelope.json (the calibration target / golden-test
 * fixture for step 2).
 *
 * Run: npx ts-node -P tsconfig.scripts.json scripts/analyzeHistoricalShape.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { buildEnvelope, computeMetrics, Metrics } from './shapeMetrics';

type SplitRow = { name: string; juryPoints: number; televotePoints: number };
type TotalRow = { name: string; points: number };
type Row = SplitRow | TotalRow;
type Dataset = Record<string, Row[]>;

const isSplit = (r: Row): r is SplitRow =>
  (r as SplitRow).juryPoints !== undefined;

// Total participants per edition (whole contest incl. semis => ~= number of
// voting countries in the final). The scoreboard field size (finalists) is
// derived from the data itself. Provided by the project owner.
const EDITION_PARTICIPANTS: Record<string, number> = {
  '2026': 35,
  '2025': 37,
  '2024': 37,
  '2023': 37,
  '2022': 40,
  '2021': 39,
  '2019': 41,
  '2018': 43,
  '2017': 42,
  '2016': 42,
  '2015': 40,
  '2014': 37,
  '2013': 39,
  '2012': 42,
  '2011': 43,
  '2010': 39,
  '2009': 42,
  '2008': 43,
  '2007': 42,
  '2006': 37,
  '2005': 39,
  '2004': 36,
  '2003': 26,
};

// ---- pull the four channels out of the dataset -------------------------------

const main = () => {
  const dataPath = path.join(__dirname, 'realHistoricalPointsData.json');
  const data: Dataset = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  const jury: { year: string; metrics: Metrics }[] = [];
  const televote: { year: string; metrics: Metrics }[] = [];
  const splitTotal: { year: string; metrics: Metrics }[] = [];
  const combinedTotal: { year: string; metrics: Metrics }[] = [];

  const years = Object.keys(data).sort((a, b) => Number(b) - Number(a));

  for (const year of years) {
    const rows = data[year];

    if (rows.length && isSplit(rows[0])) {
      const rs = rows as SplitRow[];

      jury.push({ year, metrics: computeMetrics(rs.map((r) => r.juryPoints)) });
      televote.push({
        year,
        metrics: computeMetrics(rs.map((r) => r.televotePoints)),
      });
      splitTotal.push({
        year,
        metrics: computeMetrics(rs.map((r) => r.juryPoints + r.televotePoints)),
      });
    } else {
      const rs = rows as TotalRow[];

      combinedTotal.push({
        year,
        metrics: computeMetrics(rs.map((r) => r.points)),
      });
    }
  }

  const envelopes = [
    buildEnvelope('JURY', jury),
    buildEnvelope('TELEVOTE', televote),
    buildEnvelope('SPLIT_TOTAL', splitTotal),
    buildEnvelope('COMBINED_TOTAL', combinedTotal),
  ];

  // ---- report ---------------------------------------------------------------

  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const f2 = (x: number) => x.toFixed(2);

  const line = '='.repeat(78);
  const rows: string[] = [];

  rows.push(line);
  rows.push('HISTORICAL EUROVISION FINAL SCOREBOARD SHAPE');
  rows.push(line);

  for (const env of envelopes) {
    const s = env.scalar;

    rows.push('');
    rows.push(
      `### ${env.channel}   (${env.years.length} finals: ${
        env.years[env.years.length - 1]
      }-${env.years[0]})`,
    );
    rows.push(
      `  field size n .............. ${f2(s.n.mean)}  (range ${s.n.min}-${
        s.n.max
      })`,
    );
    rows.push(
      `  winner share of total ..... ${pct(s.winnerShare.mean)}  ±${pct(
        s.winnerShare.std,
      )}   (${pct(s.winnerShare.min)}..${pct(s.winnerShare.max)})`,
    );
    rows.push(
      `  winner margin (1st-2nd) ... ${pct(s.winnerMargin.mean)}  ±${pct(
        s.winnerMargin.std,
      )}`,
    );
    rows.push(
      `  top-3 share ............... ${pct(
        s.top3Share.mean,
      )}   top-10 share ${pct(s.top10Share.mean)}   top-half ${pct(
        s.topHalfShare.mean,
      )}`,
    );
    rows.push(
      `  # scoring ZERO ............ ${f2(s.zeroCount.mean)}  (${pct(
        s.zeroFrac.mean,
      )} of field)   range ${s.zeroCount.min}-${s.zeroCount.max}`,
    );
    rows.push(
      `  # near-nul (<5% of top) ... ${f2(s.sub5Count.mean)}  (${pct(
        s.sub5Frac.mean,
      )} of field)`,
    );
    rows.push(`  max / median .............. ${f2(s.maxToMedian.mean)}`);
    rows.push(
      `  Gini ...................... ${f2(s.gini.mean)}  ±${f2(
        s.gini.std,
      )}   (${f2(s.gini.min)}..${f2(s.gini.max)})`,
    );
    rows.push(
      `  effective # contenders .... ${f2(s.effectiveN.mean)}  (${pct(
        s.effectiveFrac.mean,
      )} of field)`,
    );
    // compact decay curve at a few positions
    const c = env.curve.mean;
    const at = (g: number) => c[Math.round(g * 20)];

    rows.push(
      `  decay curve (pts / winner): top=${f2(at(0))}  25%=${f2(
        at(0.25),
      )}  50%=${f2(at(0.5))}  75%=${f2(at(0.75))}  last=${f2(at(1))}`,
    );
  }

  rows.push('');
  rows.push(line);
  rows.push('READING IT');
  rows.push(line);
  rows.push(
    'JURY vs TELEVOTE are the two channels the modern sim must reproduce',
  );
  rows.push(
    'independently. Compare their zero-counts and Gini: televote is spikier',
  );
  rows.push(
    '(bigger winner share, more zeros) than jury (smoother, rarely zero).',
  );
  rows.push(
    'COMBINED_TOTAL (pre-2016) is the smoothest regime and a separate target.',
  );

  // eslint-disable-next-line no-console
  console.log(rows.join('\n'));

  const outPath = path.join(__dirname, 'historicalShapeEnvelope.json');

  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedFrom: 'realHistoricalPointsData.json',
        editionParticipants: EDITION_PARTICIPANTS,
        note: 'Scale-invariant shape metrics. JURY/TELEVOTE/SPLIT_TOTAL from 2016-2026 (split era); COMBINED_TOTAL from 2003-2015 (combined era). Curve grid: 0=winner .. 1=last, values are points/winner.',
        envelopes,
      },
      null,
      2,
    ),
  );
  // eslint-disable-next-line no-console
  console.log(`\nEnvelope written to ${outPath}`);
};

main();
