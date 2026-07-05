/*
 * Rebuild the `specialPairs` preset in src/data/diasporaPresets.json to be the
 * TOP-N most influential directed pairs from the broad historical set (by
 * |affinity|, including rivalries/negatives), EXCLUDING pairs already covered by
 * a default-on bloc. Preserves every other field (groups, broadPreset, etc.).
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/rebuildSpecialPairs.ts
 */

/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

const TOP = 40;
const file = path.join(__dirname, '..', 'src', 'data', 'diasporaPresets.json');
const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

// pairs already represented by a default-on bloc
const blocPairs = new Set<string>();

for (const g of data.groups) {
  if (!g.defaultOn) continue;
  for (const p of g.pairs) blocPairs.add(`${p.from}|${p.to}`);
}

const special = data.broadPreset.pairs
  .filter((p: any) => !blocPairs.has(`${p.from}|${p.to}`))
  .slice()
  .sort(
    (a: any, b: any) =>
      Math.abs(b.affinity) - Math.abs(a.affinity) ||
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to),
  )
  .slice(0, TOP)
  .map((p: any) => ({ from: p.from, to: p.to, affinity: p.affinity }));

data.specialPairs = special;
fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

const pos = special.filter((s: any) => s.affinity > 0).length;

console.log(
  `Wrote ${special.length} special pairs (${pos} positive, ${
    special.length - pos
  } negative), excluding ${blocPairs.size} default-bloc pairs.`,
);
console.log(
  special.map((s: any) => `  ${s.from}->${s.to}  ${s.affinity}`).join('\n'),
);
