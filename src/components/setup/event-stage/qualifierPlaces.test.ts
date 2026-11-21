import { describe, expect, it } from 'vitest';

import { formatPlaceRange, summarizePlaces } from './qualifierPlaces';

const range = (targetStageId: string, minRank?: number, maxRank?: number) => ({
  targetStageId,
  amount: 0,
  minRank,
  maxRank,
});

describe('summarizePlaces', () => {
  it('orders bands by place and marks the rest of a known stage as out', () => {
    const result = summarizePlaces(
      [range('semi', 11, 14), range('final', 1, 10)],
      15,
    );

    expect(result.bands.map((b) => b.targetStageId)).toEqual(['final', 'semi']);
    expect(result.out).toEqual({ from: 15, to: 15 });
    expect(result.problems).toEqual([]);
    expect(result.nextFreePlace).toBe(15);
    expect(result.beyondSize).toBe(false);
  });

  it('has no out band while the stage size is unknown', () => {
    expect(summarizePlaces([range('final', 1, 10)], 0).out).toBeNull();
  });

  it('reports a gap before a later band, including a missing place 1', () => {
    expect(
      summarizePlaces([range('final', 1, 10), range('semi', 13, 15)], 0)
        .problems,
    ).toEqual([{ kind: 'gap', from: 11, to: 12 }]);
    expect(summarizePlaces([range('final', 3, 10)], 0).problems).toEqual([
      { kind: 'gap', from: 1, to: 2 },
    ]);
  });

  it('reports an overlap at the first shared place and marks both stages', () => {
    const result = summarizePlaces(
      [range('final', 1, 10), range('semi', 8, 12)],
      0,
    );

    expect(result.problems).toEqual([
      { kind: 'overlap', first: 'final', second: 'semi', place: 8 },
    ]);
    expect([...result.invalidStageIds].sort()).toEqual(['final', 'semi']);
  });

  it('reports half-typed and reversed ranges, and leaves them out of the bands', () => {
    const result = summarizePlaces(
      [range('final', 1, 10), range('semi', 11), range('heat', 15, 12)],
      0,
    );

    expect(result.problems).toEqual([
      { kind: 'incomplete', targetStageId: 'semi', missing: 'last' },
      { kind: 'reversed', targetStageId: 'heat' },
    ]);
    expect(result.bands).toHaveLength(1);
    expect(result.nextFreePlace).toBe(11);
  });

  it('ignores targets with no places and flags bands past the stage size', () => {
    const result = summarizePlaces([range('semi'), range('final', 1, 18)], 15);

    expect(result.problems).toEqual([]);
    expect(result.beyondSize).toBe(true);
    expect(result.out).toBeNull();
  });
});

describe('formatPlaceRange', () => {
  it('writes one place or an en-dash range', () => {
    expect(formatPlaceRange({ from: 5, to: 5 })).toBe('5');
    expect(formatPlaceRange({ from: 1, to: 10 })).toBe('1–10');
  });
});
