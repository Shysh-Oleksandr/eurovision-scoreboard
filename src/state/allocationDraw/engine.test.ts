import { describe, expect, it } from 'vitest';

import { check, sizesFor, solve } from './engine';
import { historyPots, nearestPotIndex, resolvePots } from './pots';
import {
  createRng,
  formatDrawCode,
  isValidDrawCode,
  newDrawCode,
  shuffle,
} from './rng';
import {
  createOfficialRules,
  DrawInput,
  DrawPlan,
  DrawRules,
  OrderMode,
} from './types';

const SEMIS = [
  { id: 'SF1', name: 'Semi-Final 1' },
  { id: 'SF2', name: 'Semi-Final 2' },
];

// 2026 pots (codes)
const POTS_2026 = [
  ['AL', 'BG', 'HR', 'ME', 'RS', 'CH'],
  ['AU', 'DK', 'EE', 'FI', 'NO', 'SE'],
  ['AM', 'AZ', 'GE', 'IL', 'PL', 'UA'],
  ['BE', 'CZ', 'LU', 'MD', 'PT', 'RO'],
  ['CY', 'GR', 'LV', 'LT', 'MT', 'SM'],
];
const PREQ_2026 = ['AT', 'FR', 'DE', 'IT', 'GB'];

// 2025 pots: 31 semi-finalists, one pot of 7
const POTS_2025 = [
  ['BE', 'CZ', 'EE', 'LV', 'LT', 'LU', 'NL'],
  ['AM', 'AZ', 'GE', 'IL', 'PL', 'UA'],
  ['AL', 'AT', 'HR', 'ME', 'RS', 'SI'],
  ['CY', 'GR', 'IE', 'MT', 'PT', 'SM'],
  ['AU', 'DK', 'FI', 'IS', 'NO', 'SE'],
];
const PREQ_2025 = ['CH', 'FR', 'DE', 'IT', 'ES', 'GB'];

const makeInput = (
  pots: string[][],
  preq: string[],
  overrides: {
    fixed?: Record<string, string>;
    votesIn?: Record<string, string>;
    rules?: Partial<DrawRules>;
    semis?: typeof SEMIS;
  } = {},
): DrawInput => {
  const fixed = overrides.fixed ?? {};

  return {
    semis: overrides.semis ?? SEMIS,
    entrants: pots.flat().map((code) => ({ code, fixed: fixed[code] ?? null })),
    pots: pots.map((members) => ({ members })),
    preq: preq.map((code) => ({
      code,
      votesIn: overrides.votesIn?.[code] ?? 'drawn',
    })),
    rules: { ...createOfficialRules(), ...overrides.rules },
  };
};

const expectPlan = (input: DrawInput, code = 'K7Q-2MX'): DrawPlan => {
  const result = solve(input, code);

  if (!result.ok) throw new Error(`unexpected error ${result.error.kind}`);

  return result.plan;
};

const membersOf = (plan: DrawPlan, stageId: string) =>
  plan.semis[stageId].members.map((m) => m.code);

describe('rng', () => {
  it('is deterministic per seed and shuffles without losing items', () => {
    const a = createRng('ABC123');
    const b = createRng('ABC123');
    const c = createRng('ABC124');
    const seqA = [a(), a(), a()];

    expect([b(), b(), b()]).toEqual(seqA);
    expect([c(), c(), c()]).not.toEqual(seqA);

    const items = Array.from({ length: 20 }, (_, i) => i);
    const shuffled = shuffle(items, createRng('seed'));

    expect(shuffled).not.toEqual(items);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(items[0]).toBe(0); // input untouched
  });

  it('makes and validates draw codes', () => {
    const code = newDrawCode(createRng('x'));

    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/);
    expect(isValidDrawCode(code)).toBe(true);
    expect(isValidDrawCode('abc')).toBe(false);
    expect(formatDrawCode('k7q2mx')).toBe('K7Q-2MX');
  });
});

describe('sizesFor', () => {
  it('balances 30 into 15/15 and 31 into 15/16 (extra on the later semi)', () => {
    expect(sizesFor(makeInput(POTS_2026, []))).toEqual([15, 15]);
    expect(sizesFor(makeInput(POTS_2025, []))).toEqual([15, 16]);
  });

  it('uses custom sizes when set', () => {
    const input = makeInput(POTS_2026, [], {
      rules: { sizes: 'custom', sizesCustom: { SF1: 14, SF2: 16 } },
    });

    expect(sizesFor(input)).toEqual([14, 16]);
  });
});

describe('solve — official rules', () => {
  it('splits every pot evenly, keeps semis within ±1 and halves ⌊n/2⌋/⌈n/2⌉ (2026)', () => {
    const plan = expectPlan(makeInput(POTS_2026, PREQ_2026));

    expect(plan.sizes).toEqual({ SF1: 15, SF2: 15 });
    expect(membersOf(plan, 'SF1')).toHaveLength(15);
    expect(membersOf(plan, 'SF2')).toHaveLength(15);

    for (const pot of POTS_2026) {
      const inSf1 = pot.filter((c) => membersOf(plan, 'SF1').includes(c));

      expect(inSf1).toHaveLength(3);
    }

    for (const stageId of ['SF1', 'SF2']) {
      const halves = plan.semis[stageId].members.map((m) => m.half);

      expect(halves.filter((h) => h === 1)).toHaveLength(7);
      expect(halves.filter((h) => h === 2)).toHaveLength(8);
    }

    // Pre-qualified: 2 in one semi, 3 in the other, all five drawn
    const preqSteps = plan.steps.filter((s) => s.t === 'preq');
    const perSemi = ['SF1', 'SF2'].map(
      (id) =>
        preqSteps.filter((s) => s.t === 'preq' && s.stageId === id).length,
    );

    expect(preqSteps).toHaveLength(5);
    expect(perSemi.sort()).toEqual([2, 3]);
    expect(plan.total).toBe(35);
    expect(plan.steps.filter((s) => s.t === 'group')).toHaveLength(6);
    expect(plan.steps[0]).toMatchObject({ t: 'group', kind: 'preq' });
  });

  it('handles the uneven 2025 case (15/16, a pot of 7 → 3/4 or 4/3)', () => {
    const plan = expectPlan(makeInput(POTS_2025, PREQ_2025));

    expect(membersOf(plan, 'SF1')).toHaveLength(15);
    expect(membersOf(plan, 'SF2')).toHaveLength(16);

    POTS_2025.forEach((pot) => {
      const inSf1 = pot.filter((c) =>
        membersOf(plan, 'SF1').includes(c),
      ).length;
      const inSf2 = pot.length - inSf1;

      expect(Math.abs(inSf1 - inSf2)).toBeLessThanOrEqual(1);
    });

    const preqSteps = plan.steps.filter((s) => s.t === 'preq');

    expect(
      ['SF1', 'SF2'].map(
        (id) =>
          preqSteps.filter((s) => s.t === 'preq' && s.stageId === id).length,
      ),
    ).toEqual([3, 3]);
  });

  it('is deterministic for a code and differs between codes', () => {
    const input = makeInput(POTS_2026, PREQ_2026);
    const a = expectPlan(input, 'AAA-AAA');
    const b = expectPlan(input, 'AAA-AAA');
    const c = expectPlan(input, 'BBB-BBB');

    expect(a).toEqual(b);
    expect(a.steps).not.toEqual(c.steps);
  });

  it('honours fixed countries and "votes in" pins', () => {
    const plan = expectPlan(
      makeInput(POTS_2026, PREQ_2026, {
        fixed: { IL: 'SF2', SE: 'SF1' },
        votesIn: { DE: 'SF1' },
      }),
    );

    expect(membersOf(plan, 'SF2')).toContain('IL');
    expect(membersOf(plan, 'SF1')).toContain('SE');
    expect(plan.semis.SF1.voters).toEqual([{ code: 'DE', fixed: true }]);

    const fixedStep = plan.steps.find(
      (s) => s.t === 'entrant' && s.code === 'IL',
    );

    expect(fixedStep).toMatchObject({ fixed: true, stageId: 'SF2' });
    expect(plan.steps.filter((s) => s.t === 'preq')).toHaveLength(4);

    // The pot intro mentions the fixed country
    const pot3Intro = plan.steps.find(
      (s) => s.t === 'group' && s.kind === 'pot' && s.potIndex === 2,
    );

    expect(pot3Intro).toMatchObject({
      fixedNotes: [{ stageId: 'SF2', codes: ['IL'] }],
    });
  });

  it('works with three semis', () => {
    const semis = [...SEMIS, { id: 'SF3', name: 'Semi-Final 3' }];
    const plan = expectPlan(makeInput(POTS_2026, PREQ_2026, { semis }));

    expect(plan.sizes).toEqual({ SF1: 10, SF2: 10, SF3: 10 });
    POTS_2026.forEach((pot) => {
      semis.forEach((s) => {
        expect(
          pot.filter((c) => membersOf(plan, s.id).includes(c)),
        ).toHaveLength(2);
      });
    });
  });
});

describe('solve — custom rules', () => {
  it('fully random split fills the capacities', () => {
    const plan = expectPlan(
      makeInput(POTS_2026, PREQ_2026, {
        rules: { split: 'random' },
        fixed: { AL: 'SF1', BG: 'SF1', HR: 'SF1', ME: 'SF1' },
      }),
    );

    expect(membersOf(plan, 'SF1')).toHaveLength(15);
    expect(membersOf(plan, 'SF2')).toHaveLength(15);
    expect(membersOf(plan, 'SF1')).toEqual(
      expect.arrayContaining(['AL', 'BG', 'HR', 'ME']),
    );
  });

  it('no pots draws everyone at random into balanced semis', () => {
    const plan = expectPlan(
      makeInput(POTS_2026, PREQ_2026, { rules: { pots: 'none' } }),
    );

    expect(membersOf(plan, 'SF1')).toHaveLength(15);
    expect(plan.steps.filter((s) => s.t === 'group')).toHaveLength(2);
  });

  it('exact positions number every country 1…n', () => {
    const plan = expectPlan(
      makeInput(POTS_2026, [], { rules: { order: 'positions' as OrderMode } }),
    );
    const positions = plan.semis.SF1.members
      .map((m) => m.pos)
      .sort((a, b) => a - b);

    expect(positions).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    expect(plan.semis.SF1.members.every((m) => m.half === 0)).toBe(true);
  });

  it('"don\'t change running order" skips fixed countries in the ceremony', () => {
    const plan = expectPlan(
      makeInput(POTS_2026, [], {
        rules: { order: 'none' },
        fixed: { IL: 'SF2' },
      }),
    );

    expect(plan.steps.some((s) => s.t === 'entrant' && s.code === 'IL')).toBe(
      false,
    );
    expect(plan.total).toBe(29);
  });

  it('pre-qualified "all" adds every one to every semi; "none" adds nobody', () => {
    const all = expectPlan(
      makeInput(POTS_2026, PREQ_2026, { rules: { preq: 'all' } }),
    );

    expect(all.semis.SF1.voters.map((v) => v.code)).toEqual(PREQ_2026);
    expect(all.semis.SF2.voters.map((v) => v.code)).toEqual(PREQ_2026);
    expect(all.steps.some((s) => s.t === 'preq')).toBe(false);

    const none = expectPlan(
      makeInput(POTS_2026, PREQ_2026, { rules: { preq: 'none' } }),
    );

    expect(none.semis.SF1.voters).toEqual([]);
  });

  it('custom sizes are respected (with a split the pots allow)', () => {
    // Five pots of 6 can only give 3/3 each, so 12/18 needs a random split.
    const plan = expectPlan(
      makeInput(POTS_2026, [], {
        rules: {
          sizes: 'custom',
          sizesCustom: { SF1: 12, SF2: 18 },
          split: 'random',
        },
      }),
    );

    expect(membersOf(plan, 'SF1')).toHaveLength(12);
    expect(membersOf(plan, 'SF2')).toHaveLength(18);
  });
});

describe('check', () => {
  it('needs two semis and someone to draw', () => {
    expect(check(makeInput(POTS_2026, [], { semis: [SEMIS[0]] }))).toEqual({
      kind: 'fewSemis',
    });
    expect(check(makeInput([], []))).toEqual({ kind: 'empty' });
  });

  it('reports custom sizes that do not add up', () => {
    expect(
      check(
        makeInput(POTS_2026, [], {
          rules: { sizes: 'custom', sizesCustom: { SF1: 15, SF2: 16 } },
        }),
      ),
    ).toEqual({ kind: 'sizesSum', sum: 31, total: 30 });
  });

  it('reports too many fixed countries in a semi', () => {
    const fixed = Object.fromEntries(
      POTS_2026.flat()
        .slice(0, 16)
        .map((c) => [c, 'SF1']),
    );

    expect(check(makeInput(POTS_2026, [], { fixed }))).toMatchObject({
      kind: 'semiFull',
      stageId: 'SF1',
      fixedCount: 16,
      size: 15,
    });
  });

  it('reports a pot that cannot be split evenly', () => {
    const fixed = { AL: 'SF1', BG: 'SF1', HR: 'SF1', ME: 'SF1' };

    expect(check(makeInput(POTS_2026, [], { fixed }))).toMatchObject({
      kind: 'potFixed',
      stageId: 'SF1',
      potIndex: 0,
      fixedCount: 4,
      potSize: 6,
      max: 3,
      codes: ['AL', 'BG', 'HR', 'ME'],
    });

    // The same pins are fine with a fully random split
    expect(
      check(makeInput(POTS_2026, [], { fixed, rules: { split: 'random' } })),
    ).toBeNull();
  });

  it('reports too many pre-qualified pins on one semi', () => {
    expect(
      check(
        makeInput(POTS_2026, PREQ_2026, {
          votesIn: { AT: 'SF1', FR: 'SF1', DE: 'SF1', IT: 'SF1' },
        }),
      ),
    ).toMatchObject({ kind: 'preqFixed', stageId: 'SF1', count: 4, max: 3 });
  });

  it('solve reports noFit when the per-pot quotas cannot meet the sizes', () => {
    // Two pots of 6 with custom sizes 2 / 10: each pot can give at most 3 to a semi.
    const result = solve(
      makeInput([POTS_2026[0], POTS_2026[1]], [], {
        rules: { sizes: 'custom', sizesCustom: { SF1: 2, SF2: 10 } },
      }),
      'ABC-DEF',
    );

    expect(result).toEqual({ ok: false, error: { kind: 'noFit' } });
  });
});

describe('pots', () => {
  const affinity = {
    SE: { NO: 50, DK: 40, FI: 60 },
    NO: { SE: 50, DK: 40 },
    DK: { SE: 40, NO: 40 },
    FI: { SE: 60 },
    GR: { CY: 90 },
    CY: { GR: 90 },
    RS: { ME: 70, HR: 40 },
    ME: { RS: 70 },
    HR: { RS: 40 },
  };

  it('clusters neighbours into the same pot and balances sizes', () => {
    const pots = historyPots(
      [
        'SE',
        'NO',
        'DK',
        'FI',
        'GR',
        'CY',
        'RS',
        'ME',
        'HR',
        'custom-1',
        'custom-2',
        'MT',
      ],
      3,
      affinity,
    );
    const potOf = (c: string) => pots.findIndex((p) => p.includes(c));

    expect(pots.map((p) => p.length)).toEqual([4, 4, 4]);
    expect(potOf('SE')).toBe(potOf('NO'));
    expect(potOf('GR')).toBe(potOf('CY'));
    expect(potOf('RS')).toBe(potOf('ME'));
    expect(potOf('custom-1')).toBeGreaterThan(-1);
    expect(
      historyPots(
        [
          'SE',
          'NO',
          'DK',
          'FI',
          'GR',
          'CY',
          'RS',
          'ME',
          'HR',
          'custom-1',
          'custom-2',
          'MT',
        ],
        3,
        affinity,
      ),
    ).toEqual(pots);
  });

  it('places a new country in its nearest official pot, or the smallest one', () => {
    const base = [
      ['SE', 'NO'],
      ['GR', 'CY', 'MT'],
    ];

    expect(nearestPotIndex('DK', base, affinity)).toBe(0);
    expect(nearestPotIndex('custom-9', base, affinity)).toBe(0);
    expect(
      nearestPotIndex('custom-9', [['SE', 'NO', 'DK'], ['GR']], affinity),
    ).toBe(1);
  });

  it('resolvePots: official pots from year data, extras join their nearest pot', () => {
    const pots = resolvePots({
      entrantCodes: ['SE', 'NO', 'GR', 'CY', 'DK'],
      rules: { pots: 'official', customPots: null },
      officialPotByCode: { SE: 2, NO: 2, GR: 1, CY: 1 },
      affinity,
      semiCount: 2,
    });

    expect(pots).toEqual([
      { members: ['CY', 'GR'] },
      { members: ['DK', 'NO', 'SE'] },
    ]);
  });

  it('resolvePots: no pots / custom pots', () => {
    expect(
      resolvePots({
        entrantCodes: ['SE', 'NO'],
        rules: { pots: 'none', customPots: null },
        officialPotByCode: {},
        affinity: null,
        semiCount: 2,
      }),
    ).toEqual([{ members: ['NO', 'SE'] }]);

    expect(
      resolvePots({
        entrantCodes: ['SE', 'NO', 'GR'],
        rules: { pots: 'custom', customPots: [['SE'], [], ['NO', 'XX']] },
        officialPotByCode: {},
        affinity,
        semiCount: 2,
      }),
    ).toEqual([{ members: ['SE'] }, { members: ['GR'] }, { members: ['NO'] }]);
  });
});
