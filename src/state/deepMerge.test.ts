import { describe, expect, it } from 'vitest';

import deepMerge from './deepMerge';

describe('deepMerge', () => {
  it('mutates and returns the target', () => {
    const target = { a: 1 };
    const result = deepMerge(target, { b: 2 });

    expect(result).toBe(target);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('merges nested plain objects instead of replacing them', () => {
    expect(deepMerge({ a: { b: 1, c: 2 } }, { a: { c: 9, d: 3 } })).toEqual({
      a: { b: 1, c: 9, d: 3 },
    });
  });

  it('overwrites arrays when the incoming array has items', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [9] })).toEqual({
      list: [9],
    });
  });

  it('keeps the existing array when the incoming one is empty', () => {
    expect(deepMerge({ list: [1, 2, 3] }, { list: [] })).toEqual({
      list: [1, 2, 3],
    });
  });

  it('still assigns an empty array when the target has no value', () => {
    // The customiser returns `previousValue` (undefined) for empty incoming
    // arrays, which means "not handled" — so the empty array is assigned.
    expect(deepMerge({} as { list?: number[] }, { list: [] })).toEqual({
      list: [],
    });
  });

  it('treats null as a defined value', () => {
    expect(deepMerge({ a: null }, { a: [1] })).toEqual({ a: [1] });
    expect(deepMerge({ a: { b: 1 } }, { a: null })).toEqual({ a: null });
  });

  it('replaces non-plain objects wholesale', () => {
    const date = new Date(1);

    expect(deepMerge({ a: new Date(0) }, { a: date })).toEqual({ a: date });
  });

  it('assigns undefined source values (own keys are always visited)', () => {
    expect(deepMerge({ n: 1 }, { n: undefined })).toEqual({ n: undefined });
  });

  it('applies multiple sources left to right and skips nullish ones', () => {
    expect(deepMerge({ a: 1 }, null, { a: 2, b: 1 }, { b: 2 })).toEqual({
      a: 2,
      b: 2,
    });
  });
});
