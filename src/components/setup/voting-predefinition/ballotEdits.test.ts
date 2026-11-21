import { describe, expect, it } from 'vitest';

import {
  ballotChips,
  cellTotal,
  clearCell,
  giveNextPoint,
  isBallotComplete,
  nextFreePoint,
  pickCellPoint,
  typeCellValue,
} from './ballotEdits';

import type { PointsItem } from '@/models';
import type { Vote } from '@/state/scoreboard/types';

const system: PointsItem[] = [
  { id: 0, value: 1, showDouzePoints: false },
  { id: 1, value: 2, showDouzePoints: false },
  { id: 2, value: 6, showDouzePoints: false },
  { id: 3, value: 6, showDouzePoints: false },
  { id: 4, value: 7, showDouzePoints: false },
  { id: 5, value: 8, showDouzePoints: false },
  { id: 6, value: 10, showDouzePoints: false },
  { id: 7, value: 12, showDouzePoints: true },
];

const vote = (countryCode: string, pointsId: number): Vote => {
  const item = system.find((p) => p.id === pointsId)!;

  return {
    countryCode,
    points: item.value,
    pointsId,
    showDouzePointsAnimation: !!item.showDouzePoints,
  };
};

describe('typeCellValue', () => {
  it('sets a free value', () => {
    const { ballot, outcome } = typeCellValue([], 'SE', '12', system);

    expect(outcome).toEqual({ kind: 'set' });
    expect(ballot).toEqual([vote('SE', 7)]);
    expect(ballot[0].showDouzePointsAnimation).toBe(true);
  });

  it('moves a value another country has, and says from whom', () => {
    const { ballot, outcome } = typeCellValue(
      [vote('NO', 7), vote('SE', 6)],
      'SE',
      '12',
      system,
    );

    expect(outcome).toEqual({ kind: 'moved', from: 'NO', points: 12 });
    expect(ballot).toEqual([vote('SE', 7)]);
  });

  it('uses the second slot of a repeated value before moving one', () => {
    const { ballot, outcome } = typeCellValue(
      [vote('NO', 2)],
      'SE',
      '6',
      system,
    );

    expect(outcome).toEqual({ kind: 'set' });
    expect(ballot).toEqual([vote('NO', 2), vote('SE', 3)]);
  });

  it('keeps the cell when the value is not in the system', () => {
    const before = [vote('SE', 6)];
    const { ballot, outcome } = typeCellValue(before, 'SE', '9', system);

    expect(outcome).toEqual({ kind: 'notInSystem', raw: '9' });
    expect(ballot).toEqual(before);
    expect(typeCellValue(before, 'SE', 'abc', system).outcome.kind).toBe(
      'notInSystem',
    );
  });

  it('clears on blank or 0, and is unchanged on an empty cell', () => {
    expect(typeCellValue([vote('SE', 6)], 'SE', '', system)).toEqual({
      ballot: [],
      outcome: { kind: 'cleared' },
    });
    expect(typeCellValue([vote('SE', 6)], 'SE', '0', system).outcome).toEqual({
      kind: 'cleared',
    });
    expect(typeCellValue([vote('NO', 6)], 'SE', '', system).outcome).toEqual({
      kind: 'unchanged',
    });
  });

  it('is unchanged when the value is the same', () => {
    expect(typeCellValue([vote('SE', 6)], 'SE', '10', system).outcome).toEqual({
      kind: 'unchanged',
    });
  });

  describe('several points per entry', () => {
    it('makes the total from free slots, not greedily', () => {
      // 12 and 10 are taken: 15 = 8 + 7, though a greedy pass would try 8,
      // then 6, then fail.
      const { ballot, outcome } = typeCellValue(
        [vote('NO', 7), vote('DK', 6)],
        'SE',
        '15',
        system,
        true,
      );

      expect(outcome).toEqual({ kind: 'set' });
      expect(cellTotal(ballot, 'SE')).toBe(15);
      expect(ballot.filter((v) => v.countryCode === 'SE')).toHaveLength(2);
    });

    it('says when no free slots add up to the total', () => {
      const before = [vote('NO', 7), vote('DK', 6), vote('FI', 5)];
      const { ballot, outcome } = typeCellValue(
        before,
        'SE',
        '30',
        system,
        true,
      );

      expect(outcome).toEqual({ kind: 'unreachable', value: 30 });
      expect(ballot).toEqual(before);
    });
  });
});

describe('pickCellPoint', () => {
  it('replaces the cell’s slot with the picked one', () => {
    const { ballot, outcome } = pickCellPoint([vote('SE', 0)], 'SE', 7, system);

    expect(outcome).toEqual({ kind: 'set' });
    expect(ballot).toEqual([vote('SE', 7)]);
  });

  it('moves a slot held by another country', () => {
    const { ballot, outcome } = pickCellPoint([vote('NO', 7)], 'SE', 7, system);

    expect(outcome).toEqual({ kind: 'moved', from: 'NO', points: 12 });
    expect(ballot).toEqual([vote('SE', 7)]);
  });

  it('takes back the slot the cell already holds', () => {
    expect(pickCellPoint([vote('SE', 7)], 'SE', 7, system)).toEqual({
      ballot: [],
      outcome: { kind: 'cleared' },
    });
  });

  it('adds to the cell with several points per entry', () => {
    const { ballot } = pickCellPoint([vote('SE', 7)], 'SE', 6, system, true);

    expect(cellTotal(ballot, 'SE')).toBe(22);
  });
});

describe('whole vote', () => {
  it('gives the top free value, then the next', () => {
    const first = giveNextPoint([vote('NO', 7)], 'SE', system).ballot;

    expect(cellTotal(first, 'SE')).toBe(10);

    const second = giveNextPoint(first, 'DK', system).ballot;

    expect(cellTotal(second, 'DK')).toBe(8);
    expect(nextFreePoint(second, system)?.value).toBe(7);
  });

  it('takes back points on a second tap', () => {
    const first = giveNextPoint([], 'SE', system).ballot;
    const second = giveNextPoint(first, 'SE', system);

    expect(second).toEqual({ ballot: [], outcome: { kind: 'cleared' } });
  });

  it('gives a preferred free slot first', () => {
    const { ballot } = giveNextPoint([], 'SE', system, false, 0);

    expect(cellTotal(ballot, 'SE')).toBe(1);
  });

  it('is unchanged once every slot is given', () => {
    const full = system.map((p, i) => vote(`C${i}`, p.id));

    expect(isBallotComplete(full, system)).toBe(true);
    expect(nextFreePoint(full, system)).toBeNull();
    expect(giveNextPoint(full, 'SE', system).outcome).toEqual({
      kind: 'unchanged',
    });
  });
});

describe('ballotChips and clearCell', () => {
  it('lists every slot top value first with its holder', () => {
    const chips = ballotChips([vote('NO', 3)], system);

    expect(chips.map((c) => c.item.value)).toEqual([12, 10, 8, 7, 6, 6, 2, 1]);
    expect(chips.find((c) => c.item.id === 3)?.holder).toBe('NO');
    expect(chips.find((c) => c.item.id === 2)?.holder).toBeNull();
  });

  it('clears a cell', () => {
    expect(clearCell([vote('SE', 1), vote('NO', 2)], 'SE')).toEqual({
      ballot: [vote('NO', 2)],
      outcome: { kind: 'cleared' },
    });
    expect(clearCell([], 'SE').outcome).toEqual({ kind: 'unchanged' });
  });
});
