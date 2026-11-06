import { describe, expect, it } from 'vitest';

import { insertByDate } from './data';

describe('insertByDate', () => {
  const updates = [
    { date: '2026-11-01', title: 'b' },
    { date: '2026-10-28', title: 'a' },
  ];

  it('puts a newer update first', () => {
    expect(
      insertByDate(updates, { date: '2026-11-12', title: 'c' }).map(
        (u) => u.title,
      ),
    ).toEqual(['c', 'b', 'a']);
  });

  it('slots an older one in by date, ahead of the same day', () => {
    expect(
      insertByDate(updates, { date: '2026-10-28', title: 'c' }).map(
        (u) => u.title,
      ),
    ).toEqual(['b', 'c', 'a']);
    expect(
      insertByDate(updates, { date: '2026-01-01', title: 'c' }).map(
        (u) => u.title,
      ),
    ).toEqual(['b', 'a', 'c']);
  });

  it('leaves the list alone without an update', () => {
    expect(insertByDate(updates, null)).toBe(updates);
  });
});
