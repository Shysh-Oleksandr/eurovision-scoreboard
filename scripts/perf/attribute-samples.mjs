#!/usr/bin/env node
// Attribute CPU samples inside long RunTasks of a Chrome trace to source files
// via Turbopack source maps. Companion to analyze-trace.mjs: that one finds
// the long tasks, this one says which source files burned the time inside
// them (e.g. it is what attributed the phase-transition stalls to
// gsap/CSSPlugin rather than React rendering — see
// docs/performance-improvement-plan.md, Phase 1 results).
//
// Usage: node scripts/perf/attribute-samples.mjs <trace.json[.gz]> \
//          .open-next/assets/_next/static/chunks [minTaskMs=150]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [file, chunksDir, minMsArg] = process.argv.slice(2);
const minMs = Number(minMsArg ?? 150);
let raw = fs.readFileSync(file);
if (file.endsWith('.gz')) raw = zlib.gunzipSync(raw);
const evts = JSON.parse(raw).traceEvents;

// ---- collect profile(s): id -> {nodes: Map, samples: [], times: []}
const profiles = new Map();
for (const e of evts) {
  if (e.name === 'Profile') {
    profiles.set(e.id, {
      nodes: new Map(),
      samples: [],
      times: [],
      startTime: e.args.data.startTime,
      pid: e.pid,
      tid: e.tid,
    });
  }
}
for (const e of evts) {
  if (e.name !== 'ProfileChunk') continue;
  const p = profiles.get(e.id);
  if (!p) continue;
  const d = e.args.data.cpuProfile || {};
  for (const n of d.nodes || []) p.nodes.set(n.id, n);
  const samples = d.samples || [];
  const deltas = e.args.data.timeDeltas || [];
  let t = p.times.length ? p.times[p.times.length - 1] : p.startTime;
  for (let i = 0; i < samples.length; i++) {
    t += deltas[i] ?? 0;
    p.samples.push(samples[i]);
    p.times.push(t);
  }
}
// pick largest profile (renderer main)
let prof = null;
for (const p of profiles.values()) if (!prof || p.samples.length > prof.samples.length) prof = p;

const longTasks = evts
  .filter((e) => e.name === 'RunTask' && e.dur > minMs * 1000)
  .sort((a, b) => a.ts - b.ts);
let t0 = Infinity;
for (const e of evts) if (e.name === 'RunTask' && e.ts < t0) t0 = e.ts;

// ---- source map resolution
const mapCache = new Map();
function decodeVLQ(str) {
  const map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const res = [];
  let shift = 0, value = 0;
  for (const c of str) {
    const digit = map.indexOf(c);
    const cont = digit & 32;
    value += (digit & 31) << shift;
    if (cont) shift += 5;
    else {
      res.push(value & 1 ? -(value >> 1) : value >> 1);
      value = 0; shift = 0;
    }
  }
  return res;
}
function loadMap(chunkFile) {
  if (mapCache.has(chunkFile)) return mapCache.get(chunkFile);
  let entry = null;
  try {
    const js = fs.readFileSync(path.join(chunksDir, chunkFile), 'utf8');
    const m = js.match(/sourceMappingURL=([\w.-]+\.map)/);
    if (m) {
      const sm = JSON.parse(fs.readFileSync(path.join(chunksDir, m[1]), 'utf8'));
      // decode mappings into per-line arrays of [genCol, srcIdx, srcLine]
      const lines = sm.mappings.split(';').map((line) => {
        const segs = [];
        let genCol = 0, srcIdx = 0, srcLine = 0, srcCol = 0;
        for (const seg of line.split(',')) {
          if (!seg) continue;
          const dec = decodeVLQ(seg);
          genCol += dec[0];
          if (dec.length > 1) {
            srcIdx += dec[1];
            srcLine += dec[2];
            srcCol += dec[3];
          }
          segs.push([genCol, srcIdx, srcLine]);
        }
        return segs;
      });
      entry = { sources: sm.sources, lines };
    }
  } catch {
    entry = null;
  }
  mapCache.set(chunkFile, entry);
  return entry;
}
function resolve(url, line, col) {
  const chunkFile = (url || '').split('/').pop()?.split('?')[0] || '';
  if (!chunkFile.endsWith('.js')) return null;
  const sm = loadMap(chunkFile);
  if (!sm || line == null || !sm.lines[line]) return null;
  const segs = sm.lines[line];
  let best = null;
  for (const s of segs) {
    if (s[0] <= col) best = s;
    else break;
  }
  if (!best) best = segs[0];
  if (!best) return null;
  const src = sm.sources[best[1]] || '?';
  return src.replace(/^.*node_modules\//, 'npm:').replace(/^\[project\]\//, '');
}

for (const task of longTasks) {
  const end = task.ts + task.dur;
  const agg = new Map();
  let n = 0;
  for (let i = 0; i < prof.samples.length; i++) {
    const t = prof.times[i];
    if (t < task.ts || t > end) continue;
    n++;
    const node = prof.nodes.get(prof.samples[i]);
    if (!node) continue;
    const cf = node.callFrame;
    const srcFile = resolve(cf.url, cf.lineNumber, cf.columnNumber);
    const key = srcFile
      ? `${srcFile.split('/').slice(-2).join('/')}  ${cf.functionName || '(anon)'}`
      : `${cf.functionName || '(anon)'} [${(cf.url || '').split('/').pop()?.slice(0, 20) || 'native'}]`;
    agg.set(key, (agg.get(key) || 0) + 1);
  }
  console.log(`\nTASK t=+${((task.ts - t0) / 1e6).toFixed(1)}s dur=${(task.dur / 1000).toFixed(0)}ms samples=${n}`);
  [...agg.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 14)
    .forEach(([k, v]) => console.log(`  ${((v / n) * task.dur / 1000).toFixed(0).padStart(4)}ms  ${k}`));
}
