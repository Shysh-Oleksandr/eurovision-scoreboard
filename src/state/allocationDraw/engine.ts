/**
 * Allocation draw — rules solver. Pure, DOM-free, deterministic for a given
 * (input, code). Ported from the design handoff's `engine.js`.
 *
 * Rules it guarantees:
 * - semi sizes: balanced `floor(N/k)` with the remainder on the last semis, or
 *   the user's custom sizes (must add up to N);
 * - even split: every pot gives each semi `floor(n/k)` or `ceil(n/k)` countries,
 *   chosen (with backtracking over the pots) so every semi lands exactly on
 *   its size while fixed countries stay where the user put them;
 * - halves: `floor(n/2)` first half, `ceil(n/2)` second; or exact positions;
 * - pre-qualified voting: spread `floor/ceil(m/k)`, honouring "Votes in" pins.
 */
import { createRng, normalizeDrawCode, shuffle } from './rng';
import type {
  DrawError,
  DrawFixedNote,
  DrawInput,
  DrawPlan,
  DrawPlanSemi,
  DrawStep,
  OrderMode,
  SolveResult,
} from './types';

/** Every way to give `r` of `k` semis one extra country (combinations of indices). */
export const extrasCombos = (k: number, r: number): number[][] => {
  const out: number[][] = [];
  const rec = (start: number, pick: number[]) => {
    if (pick.length === r) {
      out.push(pick.slice());

      return;
    }
    for (let i = start; i < k; i += 1) {
      pick.push(i);
      rec(i + 1, pick);
      pick.pop();
    }
  };

  rec(0, []);

  return out;
};

/** Target size of every semi, in `input.semis` order. */
export const sizesFor = (input: DrawInput): number[] => {
  const k = input.semis.length;
  const N = input.entrants.length;
  const { rules } = input;

  if (k === 0) return [];

  if (rules.sizes === 'custom') {
    return input.semis.map(
      (s) => +(rules.sizesCustom[s.id] ?? Math.floor(N / k)),
    );
  }

  // Balanced: the odd country goes to the later semi (2025: 15 and 16).
  return input.semis.map(
    (_, i) => Math.floor(N / k) + (i >= k - (N % k) ? 1 : 0),
  );
};

/** Balanced split of `n` items into `k` groups: how many get one extra. */
export const splitEvenly = (n: number, k: number) => ({
  base: Math.floor(n / k),
  extra: n % k,
});

const usesPots = (input: DrawInput) =>
  input.rules.split === 'even' && input.rules.pots !== 'none';

/** Plain-data validation; the UI turns the result into copy and fixes. */
export const check = (input: DrawInput): DrawError | null => {
  const { semis, entrants, pots, preq, rules } = input;
  const k = semis.length;
  const N = entrants.length;

  if (k < 2) return { kind: 'fewSemis' };
  if (N === 0) return { kind: 'empty' };

  const sizes = sizesFor(input);
  const sum = sizes.reduce((a, b) => a + b, 0);

  if (rules.sizes === 'custom' && sum !== N) {
    return { kind: 'sizesSum', sum, total: N };
  }

  for (let i = 0; i < k; i += 1) {
    const fixedHere = entrants.filter((e) => e.fixed === semis[i].id);

    if (fixedHere.length > sizes[i]) {
      return {
        kind: 'semiFull',
        stageId: semis[i].id,
        fixedCount: fixedHere.length,
        size: sizes[i],
        codes: fixedHere.map((e) => e.code),
      };
    }
  }

  if (usesPots(input)) {
    for (let p = 0; p < pots.length; p += 1) {
      const n = pots[p].members.length;
      const max = Math.ceil(n / k);
      const memberSet = new Set(pots[p].members);

      for (const s of semis) {
        const fixedHere = entrants.filter(
          (e) => e.fixed === s.id && memberSet.has(e.code),
        );

        if (fixedHere.length > max) {
          return {
            kind: 'potFixed',
            stageId: s.id,
            potIndex: p,
            fixedCount: fixedHere.length,
            potSize: n,
            max,
            codes: fixedHere.map((e) => e.code),
          };
        }
      }
    }
  }

  if (rules.preq === 'drawn' && preq.length > 0) {
    const m = preq.length;
    const max = Math.ceil(m / k);

    for (const s of semis) {
      const here = preq.filter((p) => p.votesIn === s.id);

      if (here.length > max) {
        return {
          kind: 'preqFixed',
          stageId: s.id,
          count: here.length,
          total: m,
          max,
          codes: here.map((p) => p.code),
        };
      }
    }
  }

  return null;
};

const NO_FIT: DrawError = { kind: 'noFit' };

/** Runs the draw. `code` is any string; it is normalized before seeding. */
export const solve = (input: DrawInput, code: string): SolveResult => {
  const error = check(input);

  if (error) return { ok: false, error };

  const { semis, entrants, pots, preq, rules } = input;
  const k = semis.length;
  const sizes = sizesFor(input);
  const random = createRng(normalizeDrawCode(code));
  const semiIndex = new Map(semis.map((s, i) => [s.id, i]));
  const entrantByCode = new Map(entrants.map((e) => [e.code, e]));
  const fixedIndexOf = (c: string): number => {
    const e = entrantByCode.get(c);

    return e && e.fixed ? semiIndex.get(e.fixed) ?? -1 : -1;
  };
  const assign = new Map<string, number>(); // code -> semi index

  const groups =
    rules.pots === 'none' || pots.length === 0
      ? [{ members: entrants.map((e) => e.code) }]
      : pots;

  if (usesPots(input)) {
    // Per-pot counts per semi, so that every semi lands exactly on its size.
    const options = groups.map((pot) => {
      const n = pot.members.length;
      const { base, extra } = splitEvenly(n, k);
      const fixedCount = semis.map(
        (_, i) => pot.members.filter((m) => fixedIndexOf(m) === i).length,
      );

      return shuffle(extrasCombos(k, extra), random)
        .map((ex) => semis.map((_, i) => base + (ex.includes(i) ? 1 : 0)))
        .filter((counts) => counts.every((c, i) => c >= fixedCount[i]));
    });
    const picked: number[][] = [];
    const left = sizes.slice();
    const rec = (i: number): boolean => {
      if (i === groups.length) return left.every((x) => x === 0);

      for (const counts of options[i]) {
        if (counts.some((c, j) => c > left[j])) continue;

        counts.forEach((c, j) => (left[j] -= c));
        picked[i] = counts;

        if (rec(i + 1)) return true;

        counts.forEach((c, j) => (left[j] += c));
      }

      return false;
    };

    if (!rec(0)) return { ok: false, error: NO_FIT };

    groups.forEach((pot, gi) => {
      const need = picked[gi].slice();

      pot.members.forEach((m) => {
        const fi = fixedIndexOf(m);

        if (fi > -1) {
          assign.set(m, fi);
          need[fi] -= 1;
        }
      });

      const slots: number[] = [];

      need.forEach((c, j) => {
        for (let x = 0; x < c; x += 1) slots.push(j);
      });

      const free = shuffle(
        pot.members.filter((m) => fixedIndexOf(m) < 0),
        random,
      );
      const shuffledSlots = shuffle(slots, random);

      free.forEach((m, x) => assign.set(m, shuffledSlots[x]));
    });
  } else {
    const capacity = sizes.slice();

    entrants.forEach((e) => {
      if (e.fixed) {
        const i = semiIndex.get(e.fixed)!;

        assign.set(e.code, i);
        capacity[i] -= 1;
      }
    });

    const slots: number[] = [];

    capacity.forEach((c, j) => {
      for (let x = 0; x < c; x += 1) slots.push(j);
    });

    const shuffledSlots = shuffle(slots, random);

    shuffle(
      entrants.filter((e) => !e.fixed).map((e) => e.code),
      random,
    ).forEach((m, x) => assign.set(m, shuffledSlots[x]));
  }

  // Halves / positions
  const out: Record<string, DrawPlanSemi> = {};

  semis.forEach((s, i) => {
    const members = shuffle(
      entrants.filter((e) => assign.get(e.code) === i).map((e) => e.code),
      random,
    );
    const n = members.length;
    const firstHalf = Math.floor(n / 2);

    out[s.id] = {
      size: n,
      voters: [],
      members: members.map((code, x) => ({
        code,
        half: rules.order === 'halves' ? (x < firstHalf ? 1 : 2) : 0,
        pos: rules.order === 'positions' ? x + 1 : 0,
      })),
    };
  });

  // Pre-qualified voting
  const preqDraw: Array<{ code: string; stageId: string }> = [];

  if (rules.preq === 'drawn' && preq.length > 0) {
    const m = preq.length;
    const { base, extra } = splitEvenly(m, k);
    const fixedCount = semis.map(
      (s) => preq.filter((p) => p.votesIn === s.id).length,
    );
    const combos = shuffle(extrasCombos(k, extra), random)
      .map((ex) => semis.map((_, i) => base + (ex.includes(i) ? 1 : 0)))
      .filter((counts) => counts.every((c, i) => c >= fixedCount[i]));
    const need = combos[0].map((c, i) => c - fixedCount[i]);

    preq.forEach((p) => {
      if (p.votesIn !== 'drawn') {
        out[p.votesIn].voters.push({ code: p.code, fixed: true });
      }
    });

    const slots: number[] = [];

    need.forEach((c, j) => {
      for (let x = 0; x < c; x += 1) slots.push(j);
    });

    const shuffledSlots = shuffle(slots, random);

    shuffle(
      preq.filter((p) => p.votesIn === 'drawn'),
      random,
    ).forEach((p, x) =>
      preqDraw.push({ code: p.code, stageId: semis[shuffledSlots[x]].id }),
    );
  } else if (rules.preq === 'all') {
    semis.forEach((s) =>
      preq.forEach((p) => out[s.id].voters.push({ code: p.code, fixed: true })),
    );
  }

  // Reveal sequence
  const steps: DrawStep[] = [];

  if (preqDraw.length > 0) {
    steps.push({
      t: 'group',
      key: 'preq',
      kind: 'preq',
      size: preq.length,
      fixedNotes: [],
    });
    preqDraw.forEach((p) => steps.push({ t: 'preq', ...p }));
  }

  const memberOf = (code: string) => {
    for (const s of semis) {
      const m = out[s.id].members.find((x) => x.code === code);

      if (m) return { stageId: s.id, ...m };
    }

    return null;
  };

  groups.forEach((pot, gi) => {
    const fixedHere = pot.members.filter((m) => fixedIndexOf(m) > -1);
    const toDraw =
      rules.order === 'none'
        ? pot.members.filter((m) => fixedIndexOf(m) < 0)
        : pot.members;

    if (toDraw.length === 0) return;

    const fixedNotes: DrawFixedNote[] = [];

    semis.forEach((s, i) => {
      const codes = fixedHere.filter((m) => fixedIndexOf(m) === i);

      if (codes.length > 0) fixedNotes.push({ stageId: s.id, codes });
    });

    steps.push({
      t: 'group',
      key: `pot${gi}`,
      kind: 'pot',
      potIndex: gi,
      size: pot.members.length,
      fixedNotes,
    });

    shuffle(toDraw, random).forEach((code) => {
      const m = memberOf(code);

      if (!m) return;

      steps.push({
        t: 'entrant',
        code,
        stageId: m.stageId,
        half: m.half,
        pos: m.pos,
        fixed: fixedIndexOf(code) > -1,
        potIndex: gi,
      });
    });
  });

  const plan: DrawPlan = {
    code,
    order: rules.order as OrderMode,
    sizes: Object.fromEntries(semis.map((s, i) => [s.id, sizes[i]])),
    semis: out,
    steps,
    total: steps.filter((s) => s.t !== 'group').length,
  };

  return { ok: true, plan };
};
