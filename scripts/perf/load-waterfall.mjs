#!/usr/bin/env node
/**
 * Analyze the *load path* of a Chrome DevTools trace (.json or .json.gz):
 * navigation timing, FCP/LCP, and the JS request waterfall grouped into
 * "network round-trip levels" (a level = requests whose start is gated by the
 * previous level finishing + main-thread work).
 *
 * Companion to analyze-trace.mjs (which covers runtime smoothness).
 * Used by docs/performance-improvement-plan.md phase 3.
 *
 * Usage: node scripts/perf/load-waterfall.mjs <trace.json[.gz]> [--all]
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
const showAll = process.argv.includes('--all');
if (!file) {
  console.error('usage: node load-waterfall.mjs <trace.json[.gz]> [--all]');
  process.exit(1);
}
let raw = fs.readFileSync(file);
if (file.endsWith('.gz')) raw = zlib.gunzipSync(raw);
const evts = (JSON.parse(raw).traceEvents || JSON.parse(raw)).filter(Boolean);

// --- navigation start -------------------------------------------------------
const navs = evts.filter(
  (e) =>
    e.name === 'navigationStart' &&
    e.args?.data &&
    /^https?:/.test(
      e.args.data.documentLoaderURL || e.args.data.url || e.args.data.frame,
    ),
);
const nav = navs[navs.length - 1];
const navTs = nav ? nav.ts : Math.min(...evts.map((e) => e.ts || Infinity));
const rel = (ts) => (ts - navTs) / 1000;

// --- paint metrics ----------------------------------------------------------
const marks = {};
for (const e of evts) {
  if (e.name === 'firstContentfulPaint' && e.ts >= navTs)
    marks.FCP ??= rel(e.ts);
  if (e.name === 'firstPaint' && e.ts >= navTs) marks.FP ??= rel(e.ts);
  if (
    (e.name === 'largestContentfulPaint::Candidate' ||
      e.name === 'largestContentfulPaint::Invalidate') &&
    e.ts >= navTs
  )
    marks.LCP = rel(e.ts);
  if (e.name === 'domContentLoadedEventEnd' && e.ts >= navTs)
    marks.DCL ??= rel(e.ts);
  if (e.name === 'loadEventEnd' && e.ts >= navTs) marks.load ??= rel(e.ts);
}

// --- requests ---------------------------------------------------------------
const byId = new Map();
for (const e of evts) {
  const id = e.args?.data?.requestId;
  if (!id) continue;
  const r = byId.get(id) || { id };
  byId.set(id, r);
  const d = e.args.data;
  if (e.name === 'ResourceSendRequest') {
    r.url = d.url;
    r.sent = rel(e.ts);
    r.priority = d.priority;
  } else if (e.name === 'ResourceReceiveResponse') {
    r.respStart = rel(e.ts);
    r.mime = d.mimeType;
    r.status = d.statusCode;
    r.fromCache = d.fromCache || r.fromCache;
    // ResourceFinish reports 0 bytes for cache hits; the response event
    // carries the real transferred size.
    if (d.encodedDataLength) r.bytes = d.encodedDataLength;
  } else if (e.name === 'ResourceMarkAsCached') {
    r.fromCache = true;
  } else if (e.name === 'ResourceFinish') {
    r.end = rel(e.ts);
    r.decoded = d.decodedBodyLength;
    if (d.encodedDataLength) r.bytes = d.encodedDataLength;
    r.bytes ??= d.decodedBodyLength;
  } else if (e.name === 'ResourceWillSendRequest') {
    r.queued = rel(e.ts);
  }
}
const reqs = [...byId.values()].filter((r) => r.url && r.sent >= -50);
reqs.sort((a, b) => a.sent - b.sent);

const isJs = (r) => /\.js(\?|$)/.test(r.url) || /javascript/.test(r.mime || '');
const short = (u) =>
  u
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/\?dpl=\d+/, '')
    .replace('/_next/static/chunks/', '');

// --- group JS into round-trip levels ---------------------------------------
// A new level starts when a request is sent >120ms after the last request in
// the current level was *sent*, i.e. it could not have been discovered from
// the same parse.
const js = reqs.filter(isJs);
const levels = [];
for (const r of js) {
  const cur = levels[levels.length - 1];
  if (!cur || r.sent - cur.lastSent > 120) {
    levels.push({ reqs: [r], lastSent: r.sent });
  } else {
    cur.reqs.push(r);
    cur.lastSent = r.sent;
  }
}

const doc = reqs.find((r) => /html/.test(r.mime || ''));
console.log(`=== ${file}`);
console.log(
  `nav t=0  doc: sent ${doc ? doc.sent.toFixed(0) : '?'}ms  resp ${
    doc?.respStart?.toFixed(0) ?? '?'
  }ms  done ${doc?.end?.toFixed(0) ?? '?'}ms  ${
    doc?.bytes ? (doc.bytes / 1024).toFixed(0) + ' KB' : ''
  }`,
);
console.log(
  'Metrics: ' +
    Object.entries(marks)
      .map(([k, v]) => `${k} ${v.toFixed(0)}ms`)
      .join('  '),
);

console.log(`\nJS round-trip levels (${levels.length}):`);
levels.forEach((lv, i) => {
  const first = Math.min(...lv.reqs.map((r) => r.sent));
  const last = Math.max(...lv.reqs.map((r) => r.end ?? r.sent));
  const bytes = lv.reqs.reduce((s, r) => s + (r.bytes || 0), 0);
  const cached = lv.reqs.filter((r) => r.fromCache).length;
  console.log(
    `  L${i + 1}: ${lv.reqs.length} chunks  ${first.toFixed(
      0,
    )} → ${last.toFixed(0)}ms  ${(bytes / 1024).toFixed(0)} KB${
      cached ? `  (${cached} from cache)` : ''
    }`,
  );
  const sorted = [...lv.reqs].sort((a, b) => (b.bytes || 0) - (a.bytes || 0));
  for (const r of showAll ? sorted : sorted.slice(0, 5)) {
    console.log(
      `      ${short(r.url).padEnd(42)} ${((r.bytes || 0) / 1024)
        .toFixed(0)
        .padStart(5)} KB  sent ${r.sent.toFixed(0)} end ${(
        r.end ?? 0
      ).toFixed(0)}${r.fromCache ? '  [cache]' : ''}`,
    );
  }
  if (!showAll && sorted.length > 5)
    console.log(`      … ${sorted.length - 5} more`);
});

const totalJs = js.reduce((s, r) => s + (r.bytes || 0), 0);
const jsCached = js.filter((r) => r.fromCache).length;
console.log(
  `\nJS total: ${js.length} requests, ${(totalJs / 1024).toFixed(
    0,
  )} KB transferred${jsCached ? ` (${jsCached} served from cache)` : ''}`,
);

// --- other resource types ---------------------------------------------------
const groups = {};
for (const r of reqs) {
  const k = isJs(r) ? 'js' : (r.mime || 'other').split('/')[0];
  const g = (groups[k] = groups[k] || { n: 0, bytes: 0 });
  g.n++;
  g.bytes += r.bytes || 0;
}
console.log(
  'By type: ' +
    Object.entries(groups)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .map(([k, v]) => `${k} ${v.n}×${(v.bytes / 1024).toFixed(0)}KB`)
      .join('  '),
);
