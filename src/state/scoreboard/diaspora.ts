import diasporaPresetsRaw from '../../data/diasporaPresets.json';

import {
  AffinityMap,
  DiasporaPresetGroup,
  DiasporaSettings,
  PresetPair,
  ResolvedDiaspora,
  DIASPORA_JURY_SCALE,
  strengthToK,
} from './diasporaSettings';

/*
 * Diaspora / affinity layer for random-vote predefinition.
 *
 * A directed affinity affinity[from][to] on a -100..+100 scale biases how much a
 * voting country over- or under-votes a candidate, on top of the odds. It is a
 * realism layer, derived from 20+ years of real votes (see scripts/extractDiaspora.ts)
 * and curated into presets (scripts/curatePresets.ts -> src/data/diasporaPresets.json).
 *
 * Applied broadly, positive affinity flattens the board, so the engine also
 * bumps the televote beta by `betaTeleBoost` to keep the aggregate shape matched
 * to history — diaspora then only adds pair realism, never changes competitiveness.
 *
 * This module carries everything that needs the 46 KB presets JSON; the types,
 * defaults and pure settings helpers live in `./diasporaSettings` (re-exported
 * below) so the boot path can use them without pulling the JSON in.
 */

export * from './diasporaSettings';

type DiasporaPresets = {
  groups: DiasporaPresetGroup[];
  specialPairs: PresetPair[];
  rivalries: PresetPair[];
  broadPreset: { id: string; name: string; pairs: PresetPair[] };
};

export const diasporaPresets = diasporaPresetsRaw as unknown as DiasporaPresets;

// betaTeleBoost = BOOST_COEF * K * positiveAffinityLoad, clamped. Calibrated
// (scripts/calibrateDiaspora.ts) so the default config (groups + specials at
// K3) restores the televote Gini / max-median to the historical envelope.
const BOOST_COEF = 0.0019;
const MAX_BETA_TELE_BOOST = 1.2;

/**
 * Resolve the settings into a directed affinity map. Layering (later wins):
 * broad preset < groups < special pairs < custom blocs < user overrides.
 */
export const resolveAffinityMap = (s: DiasporaSettings): AffinityMap => {
  const map: AffinityMap = {};
  const set = (from: string, to: string, aff: number) => {
    if (from === to) return;
    (map[from] ??= {})[to] = aff;
  };

  if (!s.enabled) return map;

  if (s.useBroadPreset) {
    for (const p of diasporaPresets.broadPreset.pairs)
      set(p.from, p.to, p.affinity);
  }
  for (const g of diasporaPresets.groups) {
    if (!s.enabledGroupIds.includes(g.id)) continue;
    for (const p of g.pairs) set(p.from, p.to, p.affinity);
  }
  if (s.useSpecialPairs) {
    for (const p of diasporaPresets.specialPairs) set(p.from, p.to, p.affinity);
  }
  // Custom blocs sit above presets but below overrides, so a user's explicit
  // override still wins. `?? []` guards persisted state from before this field.
  for (const cg of s.customGroups ?? []) {
    if (!cg.enabled) continue;
    for (const a of cg.memberCodes) {
      for (const b of cg.memberCodes) set(a, b, cg.base); // set() skips a === b
    }
    for (const p of cg.pairs ?? []) set(p.from, p.to, p.affinity);
  }
  for (const o of s.overrides) set(o.from, o.to, o.affinity);

  return map;
};

// Total positive affinity mass (in units of 100) — proxy for how much the map
// flattens the board, so the beta compensation can scale with any config.
const positiveAffinityLoad = (map: AffinityMap): number => {
  let sum = 0;

  for (const from of Object.keys(map)) {
    for (const to of Object.keys(map[from])) {
      sum += Math.max(0, map[from][to]) / 100;
    }
  }

  return sum;
};

export const betaTeleBoostFor = (map: AffinityMap, k: number): number =>
  Math.min(MAX_BETA_TELE_BOOST, BOOST_COEF * k * positiveAffinityLoad(map));

/**
 * Resolve settings into everything the engine needs, or null when diaspora is
 * off / zero strength (engine then behaves exactly as before this feature).
 */
export const resolveDiaspora = (
  s: DiasporaSettings,
): ResolvedDiaspora | null => {
  if (!s.enabled || s.strength <= 0) return null;
  const affinity = resolveAffinityMap(s);
  const affinityK = strengthToK(s.strength);

  return {
    affinity,
    affinityK,
    juryScale: DIASPORA_JURY_SCALE,
    betaTeleBoost: betaTeleBoostFor(affinity, affinityK),
  };
};

// The preset value a directed pair resolves to WITHOUT overrides (the "was"
// baseline shown when an override edits a known preset). Same later-wins order
// as resolveAffinityMap minus overrides. Null for a fresh custom pair.
let basePresetMap: Map<string, number> | null = null;
const buildBasePresetMap = (): Map<string, number> => {
  if (basePresetMap) return basePresetMap;
  const m = new Map<string, number>();
  const add = (from: string, to: string, aff: number) => {
    if (from !== to) m.set(`${from}|${to}`, aff);
  };

  for (const p of diasporaPresets.broadPreset.pairs)
    add(p.from, p.to, p.affinity);
  for (const g of diasporaPresets.groups) {
    for (const p of g.pairs) add(p.from, p.to, p.affinity);
  }
  for (const p of diasporaPresets.specialPairs) add(p.from, p.to, p.affinity);
  basePresetMap = m;

  return m;
};

export const basePresetValue = (from: string, to: string): number | null =>
  buildBasePresetMap().get(`${from}|${to}`) ?? null;

// ---- by-country lens derivation ---------------------------------------------
// A read/tune view over the SAME resolved data, filtered to one country. Built
// from the settings on demand (no second copy of the data) and tagged with the
// source each value came from.

export type RelationSource =
  | { kind: 'group' | 'customGroup'; name: string }
  | { kind: 'special' | 'override' };

export type ResolvedRelation = {
  from: string;
  to: string;
  affinity: number;
  source: RelationSource;
};

/**
 * All directed relationships that are actually in effect for the lens, deduped
 * by later-wins precedence (same order as resolveAffinityMap, minus the broad
 * historical set — 323 pairs would swamp the rail and carry no per-pair source).
 * The lens component derives the flag rail and per-country favors/snubs from this.
 */
export const collectLensRelations = (
  s: DiasporaSettings,
): ResolvedRelation[] => {
  const map = new Map<string, ResolvedRelation>();
  const set = (
    from: string,
    to: string,
    affinity: number,
    source: RelationSource,
  ) => {
    if (from === to) return;
    map.set(`${from}|${to}`, { from, to, affinity, source });
  };

  if (!s.enabled) return [];

  for (const g of diasporaPresets.groups) {
    if (!s.enabledGroupIds.includes(g.id)) continue;
    for (const p of g.pairs)
      set(p.from, p.to, p.affinity, { kind: 'group', name: g.name });
  }
  if (s.useSpecialPairs) {
    for (const p of diasporaPresets.specialPairs)
      set(p.from, p.to, p.affinity, { kind: 'special' });
  }
  for (const cg of s.customGroups ?? []) {
    if (!cg.enabled) continue;
    const source: RelationSource = { kind: 'customGroup', name: cg.name };

    for (const a of cg.memberCodes) {
      for (const b of cg.memberCodes) set(a, b, cg.base, source);
    }
    for (const p of cg.pairs ?? []) set(p.from, p.to, p.affinity, source);
  }
  for (const o of s.overrides)
    set(o.from, o.to, o.affinity, { kind: 'override' });

  return [...map.values()];
};
