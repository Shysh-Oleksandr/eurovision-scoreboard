#!/usr/bin/env node
/**
 * Attribute built chunks to source modules via their Turbopack source maps.
 *
 * Turbopack map filenames do NOT match chunk filenames — the map is found via
 * the `sourceMappingURL` comment at the end of each chunk.
 *
 * Usage:
 *   node scripts/perf/chunk-modules.mjs <chunkPrefix> [...]   # per-chunk detail
 *   node scripts/perf/chunk-modules.mjs --find <substring>    # which chunks contain a module
 *   node scripts/perf/chunk-modules.mjs --all                 # every chunk, size-sorted
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = '.open-next/assets/_next/static/chunks';

function mapForChunk(file) {
  const full = path.join(DIR, file);
  const size = fs.statSync(full).size;
  const fd = fs.openSync(full, 'r');
  const tailLen = Math.min(400, size);
  const buf = Buffer.alloc(tailLen);
  fs.readSync(fd, buf, 0, tailLen, size - tailLen);
  fs.closeSync(fd);
  const m = buf.toString('utf8').match(/sourceMappingURL=([^\s*]+)/);
  if (!m) return null;
  const mapPath = path.join(DIR, path.basename(m[1]));
  if (!fs.existsSync(mapPath)) return null;
  return { mapPath, size };
}

/** Approximate per-source byte share of a chunk, from the mappings string. */
function sourceSizes(map, chunkSize) {
  // Count VLQ segments attributed to each source index as a proxy for weight.
  const counts = new Array(map.sources.length).fill(0);
  let srcIdx = 0;
  for (const line of map.mappings.split(';')) {
    for (const seg of line.split(',')) {
      if (!seg) continue;
      const fields = decodeVlq(seg);
      if (fields.length >= 4) {
        srcIdx += fields[1];
        if (srcIdx >= 0 && srcIdx < counts.length) counts[srcIdx]++;
      }
    }
  }
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return counts.map((c) => (c / total) * chunkSize);
}

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeVlq(seg) {
  const out = [];
  let shift = 0;
  let value = 0;
  for (const ch of seg) {
    const digit = B64.indexOf(ch);
    if (digit === -1) continue;
    const cont = digit & 32;
    value += (digit & 31) << shift;
    if (cont) {
      shift += 5;
    } else {
      const neg = value & 1;
      value >>= 1;
      out.push(neg ? -value : value);
      value = 0;
      shift = 0;
    }
  }
  return out;
}

const short = (s) =>
  s
    .replace(/^turbopack:\/\/\/\[project\]\//, '')
    .replace(/^\[project\]\//, '');

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js'));
const args = process.argv.slice(2);

if (args[0] === '--find') {
  const needle = args[1];
  for (const f of files) {
    const info = mapForChunk(f);
    if (!info) continue;
    const map = JSON.parse(fs.readFileSync(info.mapPath, 'utf8'));
    const hits = map.sources.filter((s) => s.includes(needle));
    if (hits.length) {
      const sizes = sourceSizes(map, info.size);
      const own = map.sources.reduce(
        (sum, s, i) => (s.includes(needle) ? sum + sizes[i] : sum),
        0,
      );
      console.log(
        `${f}  chunk ${(info.size / 1024).toFixed(0)} KB  — ${
          hits.length
        } matching modules ≈ ${(own / 1024).toFixed(0)} KB`,
      );
      for (const h of hits.slice(0, 6)) console.log('    ' + short(h));
      if (hits.length > 6) console.log(`    … ${hits.length - 6} more`);
    }
  }
  process.exit(0);
}

const targets =
  args[0] === '--all'
    ? files
    : files.filter((f) => args.some((a) => f.startsWith(a)));

const rows = [];
for (const f of targets) {
  const info = mapForChunk(f);
  if (!info) {
    rows.push({ f, size: fs.statSync(path.join(DIR, f)).size, mods: [] });
    continue;
  }
  const map = JSON.parse(fs.readFileSync(info.mapPath, 'utf8'));
  const sizes = sourceSizes(map, info.size);
  const mods = map.sources
    .map((s, i) => ({ s: short(s), bytes: sizes[i] }))
    .sort((a, b) => b.bytes - a.bytes);
  rows.push({ f, size: info.size, mods, count: map.sources.length });
}
rows.sort((a, b) => b.size - a.size);

for (const r of rows) {
  console.log(
    `\n=== ${r.f}  ${(r.size / 1024).toFixed(0)} KB  (${
      r.count ?? 0
    } modules)`,
  );
  for (const m of r.mods.slice(0, args[0] === '--all' ? 6 : 20)) {
    console.log(`   ${(m.bytes / 1024).toFixed(1).padStart(6)} KB  ${m.s}`);
  }
}
