/**
 * Pot resolution for the allocation draw: official pots (curated per year),
 * pots "based on voting history" (balanced clustering on the affinity
 * matrix), the user's custom pots, or none. Pure and deterministic.
 */
import type { SymmetricAffinity } from './affinity';
import type { DrawPot, DrawRules } from './types';

/** Countries per pot: a multiple of the number of semis (6 for two or three semis). */
export const potSizeFor = (semiCount: number): number =>
  Math.max(1, semiCount) * Math.ceil(6 / Math.max(1, semiCount));

export const potCountFor = (entrantCount: number, semiCount: number): number =>
  Math.max(1, Math.ceil(entrantCount / potSizeFor(semiCount)));

const affinityBetween = (
  affinity: SymmetricAffinity | null,
  a: string,
  b: string,
): number => affinity?.[a]?.[b] ?? 0;

const affinityToPot = (
  affinity: SymmetricAffinity | null,
  code: string,
  pot: readonly string[],
): number =>
  pot.reduce(
    (sum, member) =>
      member === code ? sum : sum + affinityBetween(affinity, code, member),
    0,
  );

const smallestPotIndex = (pots: readonly (readonly string[])[]): number =>
  pots.reduce((best, pot, i) => (pot.length < pots[best].length ? i : best), 0);

/**
 * Pot a newly added country belongs to: the one it shares the most voting
 * history with, or the smallest pot when it has no history (custom entries).
 */
export const nearestPotIndex = (
  code: string,
  pots: readonly (readonly string[])[],
  affinity: SymmetricAffinity | null,
): number => {
  if (pots.length === 0) return -1;
  if (!affinity?.[code]) return smallestPotIndex(pots);

  let best = -1;
  let bestScore = 0;

  pots.forEach((pot, i) => {
    const score = affinityToPot(affinity, code, pot);

    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });

  return best === -1 ? smallestPotIndex(pots) : best;
};

/**
 * Balanced clustering: `k` pots of ⌊N/k⌋ / ⌈N/k⌉ countries maximising the
 * affinity inside each pot. Greedy seeding by the strongest pairs, then a
 * pairwise-swap local search. Countries without data fill the remaining seats.
 */
export const historyPots = (
  codes: readonly string[],
  k: number,
  affinity: SymmetricAffinity | null,
): string[][] => {
  const sorted = [...codes].sort();
  const potCount = Math.max(1, Math.min(k, sorted.length));

  if (potCount <= 1) return [sorted];

  const capacity = sorted
    .map(
      (_, i) =>
        Math.floor(sorted.length / potCount) +
        (i < sorted.length % potCount ? 1 : 0),
    )
    .slice(0, potCount);
  const pots: string[][] = capacity.map(() => []);
  const hasRoom = (i: number) => pots[i].length < capacity[i];
  const assigned = new Set<string>();
  const withData = sorted.filter((c) => !!affinity?.[c]);
  const withoutData = sorted.filter((c) => !affinity?.[c]);

  // Seed: the strongest pairs open the pots.
  const pairs: Array<[string, string, number]> = [];

  for (let i = 0; i < withData.length; i += 1) {
    for (let j = i + 1; j < withData.length; j += 1) {
      const v = affinityBetween(affinity, withData[i], withData[j]);

      if (v > 0) pairs.push([withData[i], withData[j], v]);
    }
  }
  pairs.sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0]));

  let opened = 0;

  for (const [a, b] of pairs) {
    if (opened >= potCount) break;
    if (assigned.has(a) || assigned.has(b)) continue;

    pots[opened].push(a, b);
    assigned.add(a);
    assigned.add(b);
    opened += 1;
  }

  // Fill: strongest remaining countries first, each to its best pot with room.
  const mass = (c: string) =>
    withData.reduce(
      (s, o) =>
        o === c ? s : s + Math.max(0, affinityBetween(affinity, c, o)),
      0,
    );
  const rest = withData
    .filter((c) => !assigned.has(c))
    .sort((a, b) => mass(b) - mass(a) || a.localeCompare(b));

  for (const c of rest) {
    let best = -1;
    let bestScore = -Infinity;

    pots.forEach((pot, i) => {
      if (!hasRoom(i)) return;

      const score = affinityToPot(affinity, c, pot);

      if (
        score > bestScore ||
        (score === bestScore && pot.length < pots[best].length)
      ) {
        best = i;
        bestScore = score;
      }
    });

    pots[best === -1 ? smallestPotIndex(pots) : best].push(c);
    assigned.add(c);
  }

  // Local search: swap two countries between pots while it raises the total.
  const inside = (c: string, pot: readonly string[]) =>
    affinityToPot(affinity, c, pot);

  for (let iter = 0; iter < 60; iter += 1) {
    let improved = false;

    for (let i = 0; i < pots.length; i += 1) {
      for (let j = i + 1; j < pots.length; j += 1) {
        for (let a = 0; a < pots[i].length; a += 1) {
          for (let b = 0; b < pots[j].length; b += 1) {
            const ca = pots[i][a];
            const cb = pots[j][b];
            const before = inside(ca, pots[i]) + inside(cb, pots[j]);
            const after =
              inside(ca, pots[j]) -
              affinityBetween(affinity, ca, cb) +
              inside(cb, pots[i]) -
              affinityBetween(affinity, ca, cb);

            if (after > before + 1e-9) {
              pots[i][a] = cb;
              pots[j][b] = ca;
              improved = true;
            }
          }
        }
      }
    }

    if (!improved) break;
  }

  // Countries without history take the remaining seats, smallest pot first.
  for (const c of withoutData) {
    const open = pots.map((_, i) => i).filter(hasRoom);

    pots[
      open.length
        ? open[smallestPotIndex(open.map((i) => pots[i]))]
        : smallestPotIndex(pots)
    ].push(c);
  }

  return pots.map((pot) => pot.sort());
};

export interface ResolvePotsArgs {
  /** Codes of every semi-finalist, fixed ones included. */
  entrantCodes: readonly string[];
  rules: Pick<DrawRules, 'pots' | 'customPots'>;
  /** Official pot (1-based) per code for the current year; empty when unknown. */
  officialPotByCode: Readonly<Record<string, number>>;
  affinity: SymmetricAffinity | null;
  semiCount: number;
}

/** The pots the draw uses, in display order; countries not in any base pot join their nearest one. */
export const resolvePots = ({
  entrantCodes,
  rules,
  officialPotByCode,
  affinity,
  semiCount,
}: ResolvePotsArgs): DrawPot[] => {
  const codes = [...entrantCodes].sort();
  const codeSet = new Set(codes);

  if (rules.pots === 'none') return [{ members: codes }];

  let base: string[][];

  if (rules.pots === 'custom' && rules.customPots) {
    base = rules.customPots.map((pot) => pot.filter((c) => codeSet.has(c)));
  } else {
    const hasOfficial =
      rules.pots === 'official' &&
      codes.some((c) => officialPotByCode[c] !== undefined);

    if (hasOfficial) {
      const max = Math.max(...codes.map((c) => officialPotByCode[c] ?? 0));

      base = Array.from({ length: max }, () => []);
      codes.forEach((c) => {
        const pot = officialPotByCode[c];

        if (pot !== undefined && pot >= 1) base[pot - 1].push(c);
      });
    } else {
      base = historyPots(codes, potCountFor(codes.length, semiCount), affinity);
    }
  }

  const placed = new Set(base.flat());

  codes
    .filter((c) => !placed.has(c))
    .forEach((c) => {
      const i = nearestPotIndex(c, base, affinity);

      if (i === -1) base.push([c]);
      else base[i].push(c);
    });

  return base
    .map((members) => ({ members: [...members].sort() }))
    .filter((pot) => pot.members.length > 0 || rules.pots === 'custom');
};
