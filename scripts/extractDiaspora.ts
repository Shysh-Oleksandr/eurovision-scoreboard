/*
 * Phase B: derive directed diaspora/affinity presets from 20+ years of real
 * country-to-country Eurovision votes (scripts/../eurovisionVotes.json).
 *
 * THE STATISTIC — residual affinity (controls for song quality, the thing that
 * confounds a naive "who gives whom the most points"):
 *   For each contest (year, round) and channel (jury / televote / total), and
 *   each voter A, rank every other contestant C by how much EVERYONE ELSE gave
 *   them (leave-one-out, so A's own generosity can't inflate C's rank), assign
 *   the 12,10,8..1 scale by that rank = expected_{A->C}. Then
 *       residual_{A->B} = actual_{A->B} - expected_{A->B}
 *   Residuals are zero-sum per voter, so a persistent positive residual = A likes
 *   B beyond merit (diaspora/bloc); persistent negative = antipathy (rivalry).
 *
 * Observations are weighted: recent years more (blocs drift), finals over semis.
 * We aggregate per directed pair, keep those with enough data and significance,
 * map the mean residual to the -100..+100 UI scale, detect groups (connected
 * components of strong mutual affinity), and write diasporaAffinities.json.
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/extractDiaspora.ts
 */

/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

type Row = {
  year: number;
  round: string;
  from: string;
  to: string;
  jury: number | null;
  televote: number | null;
  total: number | null;
};

type Channel = 'televote' | 'jury' | 'total';
const CHANNELS: Channel[] = ['televote', 'jury', 'total'];
const POINTS10 = [12, 10, 8, 7, 6, 5, 4, 3, 2, 1];

// ---- tunables ---------------------------------------------------------------

const YEAR_DECAY = 0.93; // weight = YEAR_DECAY^(2025 - year); ~0.5 at 10y back
const SF_WEIGHT = 0.7; // semifinal observations vs finals (1.0)
const MIN_OBS = 6; // min contest observations for a pair to qualify
const MIN_ABS_T = 2.0; // min |mean/se| (significance) to qualify
const R_MAX = 8; // residual mapped to affinity 100 (|resid| 8 -> +/-100)
const CLUSTER_THRESHOLD = 35; // min mutual (symmetric) affinity to link a group

const affinityOf = (residual: number): number =>
  Math.max(-100, Math.min(100, Math.round((residual / R_MAX) * 100)));

const yearWeight = (year: number) => YEAR_DECAY ** (2025 - year);
const roundWeight = (round: string) => (round === 'final' ? 1 : SF_WEIGHT);

// ---- load & group by contest ------------------------------------------------

// Dataset lives at the monorepo root (one level above the frontend package).
const data: { votes: Row[] } = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', '..', 'eurovisionVotes.json'),
    'utf-8',
  ),
);

const contests = new Map<string, Row[]>();

for (const v of data.votes) {
  if (v.from === 'WLD' || v.to === 'WLD') continue; // aggregate voter, not a country
  const key = `${v.year}|${v.round}`;

  (contests.get(key) ?? contests.set(key, []).get(key)!).push(v);
}

// ---- accumulate residuals per directed pair per channel ---------------------

type Agg = { sumW: number; sumWR: number; sumWR2: number; n: number };
const pairAgg: Record<Channel, Map<string, Agg>> = {
  televote: new Map(),
  jury: new Map(),
  total: new Map(),
};

const bump = (
  ch: Channel,
  from: string,
  to: string,
  resid: number,
  w: number,
) => {
  const key = `${from}|${to}`;
  const a =
    pairAgg[ch].get(key) ??
    pairAgg[ch].set(key, { sumW: 0, sumWR: 0, sumWR2: 0, n: 0 }).get(key)!;

  a.sumW += w;
  a.sumWR += w * resid;
  a.sumWR2 += w * resid * resid;
  a.n += 1;
};

for (const [key, rows] of contests) {
  const [yearStr, round] = key.split('|');
  const year = Number(yearStr);
  const w = yearWeight(year) * roundWeight(round);

  for (const ch of CHANNELS) {
    // Only process this channel if the contest actually has it.
    const chRows = rows.filter((r) => r[ch] !== null);

    if (chRows.length === 0) continue;

    const contestants = [...new Set(chRows.map((r) => r.to))];
    const voters = [...new Set(chRows.map((r) => r.from))];

    // points[from][to]
    const points: Record<string, Record<string, number>> = {};

    for (const r of chRows) {
      (points[r.from] ??= {})[r.to] = r[ch] as number;
    }
    const given = (a: string, b: string) => points[a]?.[b] ?? 0;

    // field strength: total each contestant received
    const totalReceived: Record<string, number> = {};

    for (const c of contestants) {
      totalReceived[c] = voters.reduce((s, v) => s + given(v, c), 0);
    }

    for (const a of voters) {
      // leave-one-out ranking of contestants (excluding A itself)
      const ranked = contestants
        .filter((c) => c !== a)
        .map((c) => ({ c, adj: totalReceived[c] - given(a, c) }))
        .sort((x, y) => y.adj - x.adj);

      const expected: Record<string, number> = {};

      ranked.forEach((entry, i) => {
        expected[entry.c] = i < POINTS10.length ? POINTS10[i] : 0;
      });

      for (const entry of ranked) {
        const b = entry.c;

        bump(ch, a, b, given(a, b) - expected[b], w);
      }
    }
  }
}

// ---- summarize per pair -----------------------------------------------------

type PairStat = {
  from: string;
  to: string;
  mean: number; // weighted mean residual (points)
  t: number; // significance
  n: number;
  affinity: number; // -100..100
};

const summarize = (ch: Channel): Map<string, PairStat> => {
  const out = new Map<string, PairStat>();

  for (const [key, a] of pairAgg[ch]) {
    if (a.n < MIN_OBS || a.sumW === 0) continue;
    const mean = a.sumWR / a.sumW;
    const variance = Math.max(0, a.sumWR2 / a.sumW - mean * mean);
    const se = Math.sqrt(variance / a.n) || 1e-9;
    const t = mean / se;
    const [from, to] = key.split('|');

    out.set(key, { from, to, mean, t, n: a.n, affinity: affinityOf(mean) });
  }

  return out;
};

const tele = summarize('televote');
const jury = summarize('jury');
const total = summarize('total');

const qualifies = (s: PairStat) => Math.abs(s.t) >= MIN_ABS_T;

// ---- report -----------------------------------------------------------------

const f2 = (x: number) => x.toFixed(2);
const line = '='.repeat(80);
const fmtPair = (s: PairStat, other?: Map<string, PairStat>) => {
  const o = other?.get(`${s.from}|${s.to}`);
  const oTxt = o ? `   (jury resid ${f2(o.mean)})` : '';

  return `  ${`${s.from}->${s.to}`.padEnd(10)} aff ${String(
    s.affinity,
  ).padStart(4)}   resid ${f2(s.mean).padStart(6)}   t ${f2(s.t).padStart(
    6,
  )}   n=${s.n}${oTxt}`;
};

const teleSorted = [...tele.values()]
  .filter(qualifies)
  .sort((a, b) => b.mean - a.mean);

console.log(line);
console.log('TELEVOTE — strongest POSITIVE directed affinities');
console.log(line);
teleSorted.slice(0, 30).forEach((s) => console.log(fmtPair(s, jury)));

console.log(`\n${line}`);
console.log('TELEVOTE — strongest NEGATIVE directed affinities (rivalries)');
console.log(line);
teleSorted
  .slice(-20)
  .reverse()
  .forEach((s) => console.log(fmtPair(s, jury)));

// jury vs televote strength ratio (validates juryScale ~0.3)
const ratios: number[] = [];

for (const s of teleSorted.slice(0, 40)) {
  const j = jury.get(`${s.from}|${s.to}`);

  if (j && s.mean > 1) ratios.push(j.mean / s.mean);
}
const meanRatio = ratios.length
  ? ratios.reduce((a, b) => a + b, 0) / ratios.length
  : NaN;

console.log(
  `\nJury/televote residual ratio on top pairs: ${f2(
    meanRatio,
  )}  (=> juryScale ~ ${f2(meanRatio)})`,
);

// ---- cluster detection (connected components of strong mutual affinity) ------

const symAff = new Map<string, number>(); // "A|B" with A<B -> symmetric affinity
const nodes = new Set<string>();

for (const s of tele.values()) {
  if (!qualifies(s)) continue;
  nodes.add(s.from);
  nodes.add(s.to);
  const rev = tele.get(`${s.to}|${s.from}`);
  const sym = (s.affinity + (rev?.affinity ?? 0)) / 2;
  const key = [s.from, s.to].sort().join('|');

  symAff.set(key, sym);
}

const adj = new Map<string, string[]>();

for (const [key, sym] of symAff) {
  if (sym < CLUSTER_THRESHOLD) continue;
  const [x, y] = key.split('|');

  (adj.get(x) ?? adj.set(x, []).get(x)!).push(y);
  (adj.get(y) ?? adj.set(y, []).get(y)!).push(x);
}

const seen = new Set<string>();
const clusters: string[][] = [];

for (const node of adj.keys()) {
  if (seen.has(node)) continue;
  const stack = [node];
  const comp: string[] = [];

  seen.add(node);
  while (stack.length) {
    const cur = stack.pop()!;

    comp.push(cur);
    for (const nb of adj.get(cur) ?? []) {
      if (!seen.has(nb)) {
        seen.add(nb);
        stack.push(nb);
      }
    }
  }
  if (comp.length >= 2) clusters.push(comp.sort());
}

console.log(`\n${line}`);
console.log(`DETECTED GROUPS  (mutual affinity >= ${CLUSTER_THRESHOLD})`);
console.log(line);
clusters
  .sort((a, b) => b.length - a.length)
  .forEach((c, i) => console.log(`  Group ${i + 1}: ${c.join(', ')}`));

// ---- write output -----------------------------------------------------------

const exportPairs = teleSorted.map((s) => ({
  from: s.from,
  to: s.to,
  affinity: s.affinity,
  televoteResidual: Number(s.mean.toFixed(3)),
  juryResidual: Number((jury.get(`${s.from}|${s.to}`)?.mean ?? 0).toFixed(3)),
  totalResidual: Number((total.get(`${s.from}|${s.to}`)?.mean ?? 0).toFixed(3)),
  n: s.n,
  t: Number(s.t.toFixed(2)),
}));

const outPath = path.join(__dirname, 'diasporaAffinities.json');

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      meta: {
        source: 'eurovisionVotes.json (2004-2025, finals + semis)',
        method: 'leave-one-out residual affinity, recency+round weighted',
        params: {
          YEAR_DECAY,
          SF_WEIGHT,
          MIN_OBS,
          MIN_ABS_T,
          R_MAX,
          CLUSTER_THRESHOLD,
        },
        suggestedJuryScale: Number(meanRatio.toFixed(2)),
      },
      groups: clusters.map((codes, i) => ({ id: `group-${i + 1}`, codes })),
      pairs: exportPairs,
    },
    null,
    2,
  ),
);
console.log(
  `\nWrote ${exportPairs.length} directed pairs + ${clusters.length} groups to ${outPath}`,
);
