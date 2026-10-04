import diasporaPresetsRaw from '../../data/diasporaPresets.json';

/**
 * Symmetric voting-affinity matrix for the allocation draw's "Based on voting
 * history" pots and for placing a country in its nearest official pot. It is
 * built from every preset pair (groups, special pairs and the broad preset),
 * regardless of the user's diaspora settings: the draw asks "who tends to vote
 * for whom", not "what is enabled in this simulation".
 *
 * Kept in its own module so the 46 KB presets JSON only loads with the draw.
 */
export type SymmetricAffinity = Record<string, Record<string, number>>;

type Pair = { from: string; to: string; affinity: number };
type Presets = {
  groups: Array<{ pairs: Pair[] }>;
  specialPairs: Pair[];
  rivalries?: Pair[];
  broadPreset: { pairs: Pair[] };
};

let cached: SymmetricAffinity | null = null;

export const getDrawAffinity = (): SymmetricAffinity => {
  if (cached) return cached;

  const presets = diasporaPresetsRaw as unknown as Presets;
  const directed: Record<string, Record<string, number>> = {};
  const set = (p: Pair) => {
    if (p.from === p.to) return;
    (directed[p.from] ??= {})[p.to] = p.affinity;
  };

  // Later layers win, as in resolveAffinityMap: broad < groups < special pairs.
  presets.broadPreset.pairs.forEach(set);
  presets.groups.forEach((g) => g.pairs.forEach(set));
  presets.specialPairs.forEach(set);

  const out: SymmetricAffinity = {};
  const put = (a: string, b: string, v: number) => {
    (out[a] ??= {})[b] = v;
    (out[b] ??= {})[a] = v;
  };

  for (const from of Object.keys(directed)) {
    for (const to of Object.keys(directed[from])) {
      if (from > to && directed[to]?.[from] !== undefined) continue; // handled from the other side

      const ab = directed[from][to];
      const ba = directed[to]?.[from];

      put(from, to, ba === undefined ? ab : (ab + ba) / 2);
    }
  }

  cached = out;

  return out;
};
