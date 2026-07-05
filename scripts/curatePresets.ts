/*
 * Turn the 393 data-derived directed affinities (diasporaAffinities.json) into
 * curated, user-facing presets:
 *   - named GROUPS (blocs) with data-derived intra-group directed affinities
 *   - SPECIAL directed pairs (neighbour/diaspora that cross groups, often
 *     asymmetric)
 *   - RIVALRIES (negative)
 *   - a BROAD "all historical pairs" preset (every significant pair)
 *
 * Group *membership* is curated (domain knowledge); every affinity VALUE is
 * pulled from the data (falls back to a modest group default only when a member
 * pair lacks a significant observation). Writes diasporaPresets.json.
 *
 * Run: npx ts-node --files -P tsconfig.scripts.json scripts/curatePresets.ts
 */

/* eslint-disable no-console */
import * as fs from 'fs';
import * as path from 'path';

type DerivedPair = {
  from: string;
  to: string;
  affinity: number;
  televoteResidual: number;
  juryResidual: number;
  n: number;
  t: number;
};

const derived: { pairs: DerivedPair[] } = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'diasporaAffinities.json'), 'utf-8'),
);

const byPair = new Map<string, DerivedPair>();

for (const p of derived.pairs) byPair.set(`${p.from}|${p.to}`, p);
const affOf = (from: string, to: string): number | null =>
  byPair.get(`${from}|${to}`)?.affinity ?? null;

// ---- curated group membership (values come from the data) -------------------

const GROUPS: {
  id: string;
  name: string;
  codes: string[];
  defaultOn: boolean;
}[] = [
  {
    id: 'nordic',
    name: 'Nordics',
    codes: ['SE', 'NO', 'DK', 'FI', 'IS'],
    defaultOn: true,
  },
  { id: 'baltic', name: 'Baltics', codes: ['EE', 'LV', 'LT'], defaultOn: true },
  {
    id: 'ex-yugoslav',
    name: 'Ex-Yugoslavia',
    codes: ['HR', 'RS', 'SI', 'ME', 'MK', 'BA'],
    defaultOn: true,
  },
  {
    id: 'benelux',
    name: 'Benelux',
    codes: ['BE', 'NL', 'LU'],
    defaultOn: true,
  },
  { id: 'iberian', name: 'Iberian', codes: ['ES', 'PT'], defaultOn: true },
];

// Curated cross-group neighbour / diaspora pairs (directed). Value from data.
const SPECIAL: { from: string; to: string; label: string }[] = [
  { from: 'CY', to: 'GR', label: 'Cyprus → Greece' },
  { from: 'GR', to: 'CY', label: 'Greece → Cyprus' },
  { from: 'GR', to: 'AL', label: 'Greece → Albania' },
  { from: 'AL', to: 'GR', label: 'Albania → Greece' },
  { from: 'RO', to: 'MD', label: 'Romania → Moldova' },
  { from: 'MD', to: 'RO', label: 'Moldova → Romania' },
  { from: 'SM', to: 'IT', label: 'San Marino → Italy' },
  { from: 'IT', to: 'SM', label: 'Italy → San Marino' },
  { from: 'MT', to: 'IT', label: 'Malta → Italy' },
  { from: 'IT', to: 'AL', label: 'Italy → Albania (diaspora)' },
  { from: 'CH', to: 'AL', label: 'Switzerland → Albania (diaspora)' },
  { from: 'GE', to: 'AM', label: 'Georgia → Armenia' },
  { from: 'FR', to: 'AM', label: 'France → Armenia (diaspora)' },
  { from: 'RU', to: 'AM', label: 'Russia → Armenia' },
  { from: 'GB', to: 'IE', label: 'UK → Ireland' },
  { from: 'GB', to: 'LT', label: 'UK → Lithuania (diaspora)' },
  { from: 'IE', to: 'LT', label: 'Ireland → Lithuania (diaspora)' },
  { from: 'GB', to: 'PL', label: 'UK → Poland (diaspora)' },
  { from: 'EE', to: 'FI', label: 'Estonia → Finland' },
  { from: 'FI', to: 'EE', label: 'Finland → Estonia' },
];

// Curated rivalries (negative, off by default — political/sensitive).
const RIVALRIES: { from: string; to: string; label: string }[] = [
  { from: 'AM', to: 'AZ', label: 'Armenia ✗ Azerbaijan' },
  { from: 'AZ', to: 'AM', label: 'Azerbaijan ✗ Armenia' },
  { from: 'RS', to: 'UA', label: 'Serbia ✗ Ukraine' },
];

const GROUP_DEFAULT_FILL = 40; // used only when a member pair has no data
const BROAD_MIN_ABS = 20; // broad preset keeps |affinity| >= this

// ---- build ------------------------------------------------------------------

let filled = 0;
let dataBacked = 0;

const groupPresets = GROUPS.map((g) => {
  const pairs: {
    from: string;
    to: string;
    affinity: number;
    source: string;
  }[] = [];

  for (const from of g.codes) {
    for (const to of g.codes) {
      if (from === to) continue;
      const a = affOf(from, to);

      if (a !== null) {
        pairs.push({ from, to, affinity: a, source: 'data' });
        dataBacked += 1;
      } else {
        pairs.push({
          from,
          to,
          affinity: GROUP_DEFAULT_FILL,
          source: 'default',
        });
        filled += 1;
      }
    }
  }

  return { ...g, pairs };
});

const resolveList = (
  list: { from: string; to: string; label: string }[],
): { from: string; to: string; label: string; affinity: number | null }[] =>
  list.map((p) => ({ ...p, affinity: affOf(p.from, p.to) }));

const specialPairs = resolveList(SPECIAL);
const rivalries = resolveList(RIVALRIES);

const broadPairs = derived.pairs
  .filter((p) => Math.abs(p.affinity) >= BROAD_MIN_ABS)
  .map((p) => ({ from: p.from, to: p.to, affinity: p.affinity }));

// ---- report -----------------------------------------------------------------

const line = '='.repeat(76);

console.log(line);
console.log('CURATED DIASPORA PRESETS');
console.log(line);
for (const g of groupPresets) {
  const vals = g.pairs.map((p) => p.affinity);
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  const dataCount = g.pairs.filter((p) => p.source === 'data').length;

  console.log(
    `  ${g.name.padEnd(16)} ${g.codes.join(',').padEnd(22)} ${
      g.pairs.length
    } pairs (avg aff ${avg}, ${dataCount} data-backed)${
      g.defaultOn ? '  [default ON]' : ''
    }`,
  );
}
console.log('\n  SPECIAL directed pairs (data value | missing):');
for (const p of specialPairs) {
  console.log(
    `    ${`${p.from}->${p.to}`.padEnd(9)} ${
      p.affinity === null ? '   —(no data)' : String(p.affinity).padStart(4)
    }   ${p.label}`,
  );
}
console.log('\n  RIVALRIES:');
for (const p of rivalries) {
  console.log(
    `    ${`${p.from}->${p.to}`.padEnd(9)} ${
      p.affinity === null ? '   —(no data)' : String(p.affinity).padStart(4)
    }   ${p.label}`,
  );
}
console.log(
  `\n  BROAD preset: ${broadPairs.length} pairs with |affinity| >= ${BROAD_MIN_ABS} (of ${derived.pairs.length} significant)`,
);
console.log(
  `  Group pairs: ${dataBacked} data-backed, ${filled} filled with default ${GROUP_DEFAULT_FILL}`,
);

// ---- write ------------------------------------------------------------------

const outPath = path.join(__dirname, 'diasporaPresets.json');

fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      meta: {
        source: 'diasporaAffinities.json',
        scale:
          '-100..+100 directed; values are televote affinity, jury uses juryScale',
        groupDefaultFill: GROUP_DEFAULT_FILL,
        broadMinAbs: BROAD_MIN_ABS,
        suggestedJuryScale: 0.35,
        note: 'Default-ON = the 5 groups + positive special pairs. Rivalries and the broad preset are opt-in.',
      },
      groups: groupPresets,
      specialPairs: specialPairs.filter((p) => p.affinity !== null),
      rivalries: rivalries.filter((p) => p.affinity !== null),
      broadPreset: {
        id: 'historical-all',
        name: 'All historical pairs',
        defaultOn: false,
        pairs: broadPairs,
      },
    },
    null,
    2,
  ),
);
console.log(`\nWrote presets to ${outPath}`);
