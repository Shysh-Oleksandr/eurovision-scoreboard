/*
 * The JSON-free half of the diaspora layer: the types, constants, defaults and
 * pure settings helpers that the boot path (generalStore, syncedSettings)
 * needs. Everything that touches the 46 KB `diasporaPresets.json` — resolving
 * affinity maps, preset lookups, the lens — lives in `./diaspora`, which
 * re-exports this module, so lazily-loaded consumers keep importing from
 * there. Keep this file free of any import that reaches the presets JSON.
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

export type ResolvedDiaspora = {
  affinity: AffinityMap;
  affinityK: number;
  juryScale: number;
  betaTeleBoost: number;
};

// strength 100 -> K5 (dramatic); the default strength 60 -> K3 (pairs clearly
// visible, aggregate shape held by the beta compensation).
export const DIASPORA_K_MAX = 5;
// Jury affinity = this fraction of televote — the value the data itself implies
// (jury/televote residual ratio ~0.36; see scripts/extractDiaspora.ts).
export const DIASPORA_JURY_SCALE = 0.35;

export const DEFAULT_DIASPORA_SETTINGS: DiasporaSettings = {
  enabled: true,
  strength: 60,
  // Literal copy of `diasporaPresets.groups.filter(g => g.defaultOn).map(g =>
  // g.id)` — hardcoded so the default doesn't drag the presets JSON into the
  // boot chunk. diaspora.test.ts guards it against drifting from the JSON.
  enabledGroupIds: [
    'nordic',
    'ex-yugoslav',
    'anglophone',
    'francophone',
    'baltic',
    'benelux',
    'dach',
    'hellenic',
  ],
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
