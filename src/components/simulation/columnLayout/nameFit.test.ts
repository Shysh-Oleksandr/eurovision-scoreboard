import { describe, expect, it } from 'vitest';

import { allNamesFit, NameMeasure, namesReadWell } from './nameFit';

const FONT = 11.2;
const fits = (text: number): NameMeasure => ({ text, box: 75, fontSize: FONT });
// Box 75px: 75 - 11.2 (ellipsis) = 63.8px shown; cut below 0.85.
const cutTo = (shown: number): NameMeasure => ({
  text: 63.8 / shown,
  box: 75,
  fontSize: FONT,
});

const board = (cut: NameMeasure[], total = 20) => [
  ...cut,
  ...Array.from({ length: total - cut.length }, () => fits(60)),
];

describe('allNamesFit', () => {
  it('fails on any cut name, however slightly', () => {
    expect(allNamesFit(board([]))).toBe(true);
    expect(allNamesFit(board([{ text: 75.3, box: 75, fontSize: FONT }]))).toBe(
      false,
    );
  });
});

describe('namesReadWell', () => {
  it('keeps names when every name fits', () => {
    expect(namesReadWell(board([]))).toBe(true);
  });

  it('keeps names when a few are cut but keep most of themselves', () => {
    // "Netherlands" in a 75px box: about 72% shown.
    expect(namesReadWell(board([cutTo(0.72), cutTo(0.8), cutTo(0.84)]))).toBe(
      true,
    );
  });

  it('switches to codes when a name is cut down to its first letters', () => {
    expect(namesReadWell(board([cutTo(0.84), cutTo(0.5)]))).toBe(false);
  });

  it('switches to codes when too many names are cut', () => {
    // A quarter of 20 is 5.
    expect(
      namesReadWell(board(Array.from({ length: 5 }, () => cutTo(0.8)))),
    ).toBe(true);
    expect(
      namesReadWell(board(Array.from({ length: 6 }, () => cutTo(0.8)))),
    ).toBe(false);
  });

  it('rounds the allowance up on short line-ups', () => {
    // 10 names: up to 3 may be cut.
    expect(
      namesReadWell(
        board(
          Array.from({ length: 3 }, () => cutTo(0.8)),
          10,
        ),
      ),
    ).toBe(true);
  });
});
