/**
 * Seeded randomness for the allocation draw: the same draw code with the same
 * line-up and rules reproduces the same draw. Also the app-wide unbiased
 * shuffle (Fisher–Yates), replacing `sort(() => Math.random() - 0.5)`.
 */

/** 32-bit string hash (xmur-style mixing) used to seed the generator. */
export const hashString = (str: string): number => {
  let h = 1779033703 ^ str.length;

  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return h >>> 0;
};

/** mulberry32: small, fast, deterministic PRNG returning [0, 1). */
export const createRng = (seed: string | number): (() => number) => {
  let a = typeof seed === 'number' ? seed >>> 0 : hashString(seed);

  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Unbiased Fisher–Yates shuffle; returns a new array. */
export const shuffle = <T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] => {
  const out = items.slice();

  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));

    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
};

/** Letters and digits that are hard to confuse when read aloud or typed. */
export const DRAW_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const DRAW_CODE_LENGTH = 6;

export const normalizeDrawCode = (value: string | null | undefined): string =>
  String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export const isValidDrawCode = (value: string | null | undefined): boolean =>
  normalizeDrawCode(value).length === DRAW_CODE_LENGTH;

/** `K7Q-2MX` style display form of a code. */
export const formatDrawCode = (value: string): string => {
  const normalized = normalizeDrawCode(value);

  return normalized.length > 3
    ? `${normalized.slice(0, 3)}-${normalized.slice(3)}`
    : normalized;
};

export const newDrawCode = (random: () => number = Math.random): string => {
  let code = '';

  for (let i = 0; i < DRAW_CODE_LENGTH; i += 1) {
    code +=
      DRAW_CODE_ALPHABET[Math.floor(random() * DRAW_CODE_ALPHABET.length)];
  }

  return formatDrawCode(code);
};
