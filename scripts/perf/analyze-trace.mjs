#!/usr/bin/env node
/**
 * Analyze a Chrome DevTools performance trace (.json or .json.gz) for the
 * runtime-smoothness metrics used by docs/performance-improvement-plan.md.
 *
 * Usage: node scripts/perf/analyze-trace.mjs <trace.json[.gz]>
 *
 * Reports: main-thread totals by category, long tasks, per-second worst
 * windows (busy% / fps / recalc / paint / js), and style-recalc stats.
 * Compare before/after numbers for the same scripted flow.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
if (!file) {
  console.error('usage: node analyze-trace.mjs <trace.json[.gz]>');
  process.exit(1);
}
let raw = fs.readFileSync(file);
if (file.endsWith('.gz')) raw = zlib.gunzipSync(raw);
const json = JSON.parse(raw);
const evts = json.traceEvents || json;

let t0 = Infinity;
let tmax = 0;
for (const e of evts) {
  if (e.ts > 0 && e.ts < t0) t0 = e.ts;
  if (e.ts > tmax) tmax = e.ts;
}
const durS = (tmax - t0) / 1e6;

const TRACKED = [
  'UpdateLayoutTree',
  'Layout',
  'Paint',
  'PrePaint',
  'Layerize',
  'FunctionCall',
  'Commit',
  'FireAnimationFrame',
  'EventDispatch',
];
const agg = {};
for (const e of evts) {
  if (!e.dur || !TRACKED.includes(e.name)) continue;
  const a = (agg[e.name] = agg[e.name] || { n: 0, sum: 0, max: 0 });
  a.n++;
  a.sum += e.dur;
  if (e.dur > a.max) a.max = e.dur;
}
console.log(`=== ${file} — ${durS.toFixed(0)}s trace`);
console.log('Main-thread totals:');
Object.entries(agg)
  .sort((a, b) => b[1].sum - a[1].sum)
  .forEach(([k, v]) =>
    console.log(
      `  ${k}: total ${(v.sum / 1000).toFixed(0)}ms n=${v.n} max ${(
        v.max / 1000
      ).toFixed(0)}ms`,
    ),
  );

const longTasks = evts.filter((e) => e.name === 'RunTask' && e.dur > 100000);
console.log(
  `Long tasks >100ms: ${longTasks.length}` +
    (longTasks.length
      ? ` (worst ${(Math.max(...longTasks.map((e) => e.dur)) / 1000).toFixed(
          0,
        )}ms)`
      : ''),
);

const W = 1_000_000;
const nW = Math.ceil((tmax - t0) / W);
const busy = new Array(nW).fill(0);
const frames = new Array(nW).fill(0);
const recalc = new Array(nW).fill(0);
const paint = new Array(nW).fill(0);
const js = new Array(nW).fill(0);
for (const e of evts) {
  const w = Math.floor((e.ts - t0) / W);
  if (w < 0 || w >= nW) continue;
  if (e.name === 'RunTask' && e.dur) busy[w] += e.dur;
  if (e.name === 'DrawFrame') frames[w]++;
  if (e.name === 'UpdateLayoutTree' && e.dur) recalc[w] += e.dur;
  if (e.name === 'Paint' && e.dur) paint[w] += e.dur;
  if (e.name === 'FunctionCall' && e.dur) js[w] += e.dur;
}
console.log('Worst seconds (busy% fps recalcMs paintMs jsMs):');
busy
  .map((b, i) => i)
  .sort((a, b) => busy[b] - busy[a])
  .slice(0, 10)
  .sort((a, b) => a - b)
  .forEach((i) =>
    console.log(
      `  t=${i}s busy=${(busy[i] / 10000).toFixed(0)}% fps=${frames[i]} recalc=${(
        recalc[i] / 1000
      ).toFixed(0)} paint=${(paint[i] / 1000).toFixed(0)} js=${(
        js[i] / 1000
      ).toFixed(0)}`,
    ),
  );
const active = busy.map((b, i) => i).filter((i) => busy[i] > 200000);
const fpsActive = active.map((i) => frames[i]).sort((a, b) => a - b);
if (fpsActive.length) {
  const q = (p) => fpsActive[Math.floor(fpsActive.length * p)];
  console.log(
    `Active windows (busy>20%): ${active.length}, fps min/p25/median: ${
      fpsActive[0]
    }/${q(0.25)}/${q(0.5)}`,
  );
}
