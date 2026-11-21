#!/usr/bin/env node
/**
 * Builds src/state/nextYear/oddsHistory.generated.json for Next year's "New
 * songs" (src/state/nextYear/newSongs.ts): every country's jury and
 * televote odds in each edition that has them, per series, oldest first.
 *
 *   { "esc": { "SE": [[jury, televote], …], … }, "jesc": {…}, "asia": {…} }
 *
 * Read from public/data/countries/*.json, so rerun it after adding or
 * changing an edition (docs/adding-contest-editions.md). A test
 * (oddsHistory.test.ts) fails while the file is out of date.
 *
 * Run: yarn gen:odds-history
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import prettier from 'prettier';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'data', 'countries');
const outFile = path.join(
  root,
  'src',
  'state',
  'nextYear',
  'oddsHistory.generated.json',
);

const SERIES = [
  ['jesc', /^junior-countries-(\d{4})\.json$/],
  ['asia', /^asia-countries-(\d{4})\.json$/],
  ['esc', /^countries-(\d{4})\.json$/],
];

const history = { esc: {}, jesc: {}, asia: {} };
const files = readdirSync(dataDir)
  .map((name) => {
    const match = SERIES.find(([, pattern]) => pattern.test(name));

    return match
      ? { name, series: match[0], year: Number(match[1].exec(name)[1]) }
      : null;
  })
  .filter(Boolean)
  .sort((a, b) => a.year - b.year);

for (const { name, series } of files) {
  const raw = JSON.parse(readFileSync(path.join(dataDir, name), 'utf8'));
  const countries = Array.isArray(raw) ? raw : raw.countries;

  for (const country of countries) {
    if (typeof country.juryOdds !== 'number') continue;
    const byCode = history[series];

    byCode[country.code] = [
      ...(byCode[country.code] ?? []),
      [country.juryOdds, country.televoteOdds ?? country.juryOdds],
    ];
  }
}

const sorted = Object.fromEntries(
  Object.entries(history).map(([series, byCode]) => [
    series,
    Object.fromEntries(
      Object.keys(byCode)
        .sort()
        .map((code) => [code, byCode[code]]),
    ),
  ]),
);
// Formatted the way `yarn format` would leave it.
const text = await prettier.format(JSON.stringify(sorted), {
  ...(await prettier.resolveConfig(outFile)),
  parser: 'json',
});

writeFileSync(outFile, text);
console.log(`Wrote ${path.relative(root, outFile)}`);
