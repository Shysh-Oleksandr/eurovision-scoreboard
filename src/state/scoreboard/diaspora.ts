import diasporaPresetsRaw from '../../data/diasporaPresets.json';

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
 */

export type AffinityMap = Record<string, Record<string, number>>;

export type DiasporaOverride = { from: string; to: string; affinity: number };

/**
 * A user-created bloc. Generates a directed affinity `base` for every ordered
 * member pair (k members -> k*(k-1) pairs); `pairs` are optional per-pair tweaks
 * within the group. Sits below `overrides` in resolution, so a global override
 * still wins over a custom-group value.
 */
export type DiasporaCustomGroup = {
  id: string;
  name: string;
  memberCodes: string[];
  /** affinity applied to every ordered member pair, before per-pair tweaks. */
  base: number;
  enabled: boolean;
  /** optional per-pair tweaks within the group (same shape as an override). */
  pairs?: DiasporaOverride[];
};

export type DiasporaSettings = {
  enabled: boolean;
  /** 0-100; maps to the internal affinity strength K (60 -> K3, the default). */
  strength: number;
  enabledGroupIds: string[];
  useSpecialPairs: boolean;
  /** "All historical pairs" — the full significant-pair set (max realism). */
  useBroadPreset: boolean;
  /** User custom directed pairs; win over any preset value. */
  overrides: DiasporaOverride[];
  /** User-created blocs; generate tunable directed member pairs. */
  customGroups: DiasporaCustomGroup[];
};

export type PresetPair = { from: string; to: string; affinity: number };
export type DiasporaPresetGroup = {
  id: string;
  name: string;
  codes: string[];
  defaultOn: boolean;
  pairs: PresetPair[];
};
type DiasporaPresets = {
  groups: DiasporaPresetGroup[];
  specialPairs: PresetPair[];
  rivalries: PresetPair[];
  broadPreset: { id: string; name: string; pairs: PresetPair[] };
};

export const diasporaPresets = diasporaPresetsRaw as unknown as DiasporaPresets;

// strength 100 -> K5 (dramatic); the default strength 60 -> K3 (pairs clearly
// visible, aggregate shape held by the beta compensation).
export const DIASPORA_K_MAX = 5;
// Jury affinity = this fraction of televote — the value the data itself implies
// (jury/televote residual ratio ~0.36; see scripts/extractDiaspora.ts).
export const DIASPORA_JURY_SCALE = 0.35;

// betaTeleBoost = BOOST_COEF * K * positiveAffinityLoad, clamped. Calibrated
// (scripts/calibrateDiaspora.ts) so the default config (groups + specials at
// K3) restores the televote Gini / max-median to the historical envelope.
const BOOST_COEF = 0.0019;
const MAX_BETA_TELE_BOOST = 1.2;

export const DEFAULT_DIASPORA_SETTINGS: DiasporaSettings = {
  enabled: true,
  strength: 60,
  enabledGroupIds: diasporaPresets.groups
    .filter((g) => g.defaultOn)
    .map((g) => g.id),
  // Blocs + the top-40 special pairs (which already fold in the significant
  // rivalries/negatives) are the core. "All historical pairs" is an advanced,
  // off-by-default opt-in.
  useSpecialPairs: true,
  useBroadPreset: false,
  overrides: [],
  customGroups: [],
};

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export const strengthToK = (strength: number): number =>
  (clamp(strength, 0, 100) / 100) * DIASPORA_K_MAX;

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

export type ResolvedDiaspora = {
  affinity: AffinityMap;
  affinityK: number;
  juryScale: number;
  betaTeleBoost: number;
};

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

// ---- override helpers (used by the Relations UI) ----------------------------
// All per-pair user edits (bloc pairs, special pairs, custom pairs) route into
// the single `overrides` array, which wins in resolveAffinityMap.

export const findOverride = (
  overrides: DiasporaOverride[],
  from: string,
  to: string,
): DiasporaOverride | undefined =>
  overrides.find((o) => o.from === from && o.to === to);

export const upsertOverride = (
  overrides: DiasporaOverride[],
  from: string,
  to: string,
  affinity: number,
): DiasporaOverride[] => {
  const index = overrides.findIndex((o) => o.from === from && o.to === to);

  if (index === -1) return [...overrides, { from, to, affinity }];

  // Replace in place so editing an existing pair doesn't reorder the list.
  const next = overrides.slice();

  next[index] = { from, to, affinity };

  return next;
};

export const removeOverride = (
  overrides: DiasporaOverride[],
  from: string,
  to: string,
): DiasporaOverride[] =>
  overrides.filter((o) => !(o.from === from && o.to === to));

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

// ---- custom-group helpers ---------------------------------------------------

export const newDiasporaGroupId = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

/**
 * Keep only per-pair tweaks whose endpoints are still members — called when a
 * bloc's membership shrinks, so a removed member leaves no stray directed pair
 * (the resolver applies `pairs` unconditionally, base cross-product aside).
 */
export const pruneGroupPairs = (
  pairs: DiasporaOverride[] | undefined,
  memberCodes: string[],
): DiasporaOverride[] =>
  (pairs ?? []).filter(
    (p) => memberCodes.includes(p.from) && memberCodes.includes(p.to),
  );

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
