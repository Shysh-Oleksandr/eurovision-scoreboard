import { describe, expect, it } from 'vitest';

import {
  drawOrderOf,
  drawShareFromLineup,
  drawShareFromPlan,
} from './drawShare';

import { solve } from '@/state/allocationDraw/engine';
import {
  createOfficialRules,
  DrawInput,
  DrawPlan,
  DrawRules,
} from '@/state/allocationDraw/types';
import { DrawnStageInfo } from '@/state/allocationDrawStore';

const SEMIS = [
  { id: 'SF1', name: 'Semi-Final 1' },
  { id: 'SF2', name: 'Semi-Final 2' },
];
const POTS = [
  ['AL', 'BG', 'HR', 'ME', 'RS', 'CH'],
  ['AU', 'DK', 'EE', 'FI', 'NO', 'SE'],
  ['AM', 'AZ', 'GE', 'IL', 'PL', 'UA'],
  ['BE', 'CZ', 'LU', 'MD', 'PT', 'RO'],
  ['CY', 'GR', 'LV', 'LT', 'MT', 'SM'],
];
const PREQ = ['AT', 'FR', 'DE', 'IT', 'GB'];

const makeInput = (rules: Partial<DrawRules> = {}): DrawInput => ({
  semis: SEMIS,
  entrants: POTS.flat().map((code) => ({ code, fixed: null })),
  pots: POTS.map((members) => ({ members })),
  preq: PREQ.map((code) => ({ code, votesIn: 'drawn' })),
  rules: { ...createOfficialRules(), ...rules },
});

const plan = (input: DrawInput): DrawPlan => {
  const result = solve(input, 'K7Q-2MX');

  if (!result.ok) throw new Error(result.error.kind);

  return result.plan;
};

// Names are the codes spelt out, plus a custom entry with its own flag.
const lookup = (code: string) =>
  code === 'XX'
    ? { name: 'Custom', flag: 'https://cdn.example/x.png' }
    : { name: `Name ${code}` };

describe('drawShareFromPlan', () => {
  it('lists each half in draw order, first half first', () => {
    const input = makeInput();
    const p = plan(input);
    const data = drawShareFromPlan(p, input, lookup);

    expect(data.order).toBe('halves');
    expect(data.semis.map((s) => s.id)).toEqual(['SF1', 'SF2']);

    data.semis.forEach((semi) => {
      const { members } = p.semis[semi.id];
      const half = new Map(members.map((m) => [m.code, m.half]));
      const codes = semi.entries.map((e) => e.code);
      const first = codes.slice(0, semi.firstHalfSize);
      const second = codes.slice(semi.firstHalfSize);
      const drawn = drawOrderOf(p, semi.id);
      const inDrawOrder = (list: string[]) =>
        list.every(
          (c, i) => i === 0 || drawn.indexOf(list[i - 1]) < drawn.indexOf(c),
        );

      expect(codes).toHaveLength(members.length);
      expect(first.every((c) => half.get(c) === 1)).toBe(true);
      expect(second.every((c) => half.get(c) === 2)).toBe(true);
      expect(inDrawOrder(first)).toBe(true);
      expect(inDrawOrder(second)).toBe(true);
      expect(semi.entries[0].name).toBe(`Name ${codes[0]}`);
    });
  });

  it('puts every pre-qualified voter in the semi the draw chose, A–Z', () => {
    const input = makeInput();
    const data = drawShareFromPlan(plan(input), input, lookup);
    const voters = data.semis.flatMap((s) => s.voters.map((v) => v.code));

    expect([...voters].sort()).toEqual([...PREQ].sort());
    data.semis.forEach((semi) => {
      const names = semi.voters.map((v) => v.name);

      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });
  });

  it('numbers exact positions and sorts a plain list by name', () => {
    const positions = makeInput({ order: 'positions' });
    const p = plan(positions);
    const byPos = drawShareFromPlan(p, positions, lookup);

    byPos.semis.forEach((semi) => {
      const pos = new Map(p.semis[semi.id].members.map((m) => [m.code, m.pos]));

      expect(semi.firstHalfSize).toBeUndefined();
      expect(semi.entries.map((e) => pos.get(e.code))).toEqual(
        semi.entries.map((_, i) => i + 1),
      );
    });

    const none = makeInput({ order: 'none' });
    const plain = drawShareFromPlan(plan(none), none, lookup);

    plain.semis.forEach((semi) => {
      const names = semi.entries.map((e) => e.name);

      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });
  });
});

describe('drawShareFromLineup', () => {
  const info = (
    members: string[],
    extra: Partial<DrawnStageInfo> = {},
  ): DrawnStageInfo => ({
    code: 'K7Q-2MX',
    order: 'halves',
    members: [...members].sort(),
    voters: [],
    ...extra,
  });

  it('follows the current halves and keeps draw order inside them', () => {
    const stages = [
      {
        id: 'SF1',
        name: 'Semi-Final 1',
        // Running order shuffled on Apply; GR was moved to the second half.
        runningOrder: ['SE', 'AL', 'MT', 'GR', 'PL'],
        firstHalfSize: 2,
        countries: ['AL', 'GR', 'MT', 'PL', 'SE', 'XX'].map((code) => ({
          code,
        })),
      },
      {
        id: 'SF2',
        name: 'Semi-Final 2',
        runningOrder: ['DK', 'BE'],
        firstHalfSize: 1,
        countries: [{ code: 'BE' }, { code: 'DK' }],
      },
      {
        id: 'GF',
        name: 'Grand Final',
        countries: [{ code: 'FR' }],
      },
    ];
    const drawn = {
      SF1: info(['AL', 'GR', 'MT', 'PL', 'SE', 'XX'], {
        drawOrder: ['AL', 'XX', 'SE', 'PL', 'GR', 'MT'],
        voters: ['FR'],
      }),
      SF2: info(['BE', 'DK'], { drawOrder: ['BE', 'DK'] }),
    };
    const data = drawShareFromLineup('SF2', stages, drawn, lookup);

    expect(data?.semis.map((s) => s.id)).toEqual(['SF1', 'SF2']);
    const [sf1] = data!.semis;

    // XX had no running-order place: appended, so it lands in the second half.
    expect(sf1.entries.map((e) => e.code)).toEqual([
      'AL',
      'SE',
      'XX',
      'PL',
      'GR',
      'MT',
    ]);
    expect(sf1.firstHalfSize).toBe(2);
    expect(sf1.voters).toEqual([{ code: 'FR', name: 'Name FR' }]);
    expect(sf1.entries[2]).toEqual({
      code: 'XX',
      name: 'Custom',
      flag: 'https://cdn.example/x.png',
    });
  });

  it('leaves out semis that changed since the draw, or came from another one', () => {
    const stages = [
      { id: 'SF1', name: 'SF1', countries: [{ code: 'AL' }, { code: 'SE' }] },
      { id: 'SF2', name: 'SF2', countries: [{ code: 'BE' }] },
      { id: 'SF3', name: 'SF3', countries: [{ code: 'CY' }] },
    ];
    const drawn = {
      SF1: info(['AL', 'SE']),
      SF2: info(['BE', 'DK']), // DK was moved out
      SF3: info(['CY'], { code: 'OTHER-1' }),
    };

    expect(
      drawShareFromLineup('SF1', stages, drawn, lookup)?.semis.map((s) => s.id),
    ).toEqual(['SF1']);
    expect(drawShareFromLineup('SF4', stages, drawn, lookup)).toBeNull();
    expect(
      drawShareFromLineup('SF3', stages, drawn, lookup)?.semis.map((s) => s.id),
    ).toEqual(['SF3']);
  });

  it('shows a semi without halves as its running order', () => {
    const stages = [
      {
        id: 'SF1',
        name: 'SF1',
        runningOrder: ['SE', 'AL'],
        countries: [{ code: 'AL' }, { code: 'SE' }],
      },
    ];
    const data = drawShareFromLineup(
      'SF1',
      stages,
      { SF1: info(['AL', 'SE'], { drawOrder: ['AL', 'SE'] }) },
      lookup,
    );

    expect(data?.semis[0].entries.map((e) => e.code)).toEqual(['SE', 'AL']);
    expect(data?.semis[0].firstHalfSize).toBeUndefined();
  });
});
