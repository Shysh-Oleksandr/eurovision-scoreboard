import { describe, expect, it } from 'vitest';

import { layoutRing } from './ringLayout';
import { buildVotesStageData, directionFor, sumLinks } from './votesData';

import { Country, EventStage, StageVotingMode } from '@/models';
import type { StageVotes, Vote } from '@/state/scoreboard/types';

const country = (code: string, points = 0): Country => ({
  code,
  name: code.toUpperCase(),
  points,
  juryPoints: 0,
  televotePoints: 0,
  lastReceivedPoints: null,
});

const ballot = (pairs: [string, number][]): Vote[] =>
  pairs.map(([countryCode, points], index) => ({
    countryCode,
    points,
    pointsId: index,
    showDouzePointsAnimation: false,
  }));

const final = (overrides: Partial<EventStage> = {}): EventStage => ({
  id: 'gf',
  name: 'Grand Final',
  order: 2,
  votingMode: StageVotingMode.JURY_AND_TELEVOTE,
  countries: [country('se', 30), country('no', 20), country('fi', 5)],
  isOver: true,
  isJuryVoting: false,
  isLastStage: true,
  ...overrides,
});

const votes: Partial<StageVotes> = {
  jury: {
    se: ballot([
      ['no', 12],
      ['fi', 10],
    ]),
    no: ballot([
      ['se', 12],
      ['fi', 10],
    ]),
    dk: ballot([
      ['se', 10],
      ['no', 8],
    ]),
  },
  televote: {
    se: ballot([['no', 8]]),
    no: ballot([['se', 8]]),
    dk: ballot([
      ['se', 12],
      ['fi', 5],
    ]),
  },
};

const build = (stage = final(), stages: EventStage[] = [stage]) =>
  buildVotesStageData({
    stage,
    stages,
    ranked: stage.countries,
    voters: [
      { code: 'se', name: 'SE' },
      { code: 'no', name: 'NO' },
      { code: 'dk', name: 'DK' },
    ],
    votes,
    getPoints: (c) => c.points,
  });

describe('buildVotesStageData', () => {
  it('lists who gave an entry points, most first, split by channel', () => {
    const data = build();

    expect(data.received('se')).toEqual([
      { code: 'dk', total: 22, jury: 10, televote: 12 },
      { code: 'no', total: 20, jury: 12, televote: 8 },
    ]);
  });

  it('lists whom a voter gave points, with voters-only countries too', () => {
    const data = build();

    expect(data.given('dk').map((link) => link.code)).toEqual([
      'se',
      'no',
      'fi',
    ]);
    expect(data.votersOnly.map((voter) => voter.code)).toEqual(['dk']);
    expect(data.countries.get('dk')?.isEntry).toBe(false);
  });

  it('knows the winner, places and the largest single link', () => {
    const data = build();

    expect(data.countries.get('se')?.status).toEqual({ kind: 'winner' });
    expect(data.countries.get('no')?.status).toEqual({
      kind: 'place',
      place: 2,
      qualified: undefined,
    });
    expect(data.maxLink).toBe(22);
    expect(data.split).toBe(true);
  });

  it('says where a voter-only country went out', () => {
    const semi: EventStage = {
      ...final({ id: 'sf1', name: 'Semi-Final 1', order: 1 }),
      countries: [country('dk')],
      qualifiesTo: [{ targetStageId: 'gf', amount: 1 }],
      isLastStage: false,
    };
    const data = build(final(), [semi, final()]);

    expect(data.countries.get('dk')?.status).toEqual({
      kind: 'out',
      stageName: 'Semi-Final 1',
    });
  });

  it('counts only the combined ballot in a combined stage', () => {
    const data = buildVotesStageData({
      stage: final({ votingMode: StageVotingMode.COMBINED }),
      stages: [],
      ranked: final().countries,
      voters: [{ code: 'dk', name: 'DK' }],
      votes: { ...votes, combined: { dk: ballot([['fi', 12]]) } },
      getPoints: (c) => c.points,
    });

    expect(data.split).toBe(false);
    expect(data.given('dk')).toEqual([
      { code: 'fi', total: 12, jury: 0, televote: 0 },
    ]);
  });

  it('sums a view and picks the direction a country can show', () => {
    const data = build();

    expect(sumLinks(data.received('se'))).toEqual({
      total: 42,
      jury: 22,
      televote: 20,
    });
    expect(directionFor(data.countries.get('dk'), 'received')).toBe('given');
    expect(directionFor(data.countries.get('se'), 'given')).toBe('given');
  });
});

describe('layoutRing', () => {
  it('starts at 12 o’clock and keeps the flags inside the area', () => {
    const points = Array.from({ length: 36 }, (_, i) => 24 - (i % 20));
    const layout = layoutRing({
      width: 900,
      height: 560,
      points,
      maxPoints: 24,
      pills: true,
    });

    expect(layout.slots).toHaveLength(36);
    // The seam between the last and the first flag is at 12 o'clock.
    expect(layout.slots[0].x).toBeGreaterThan(450);
    expect(layout.slots[35].x).toBeLessThan(450);
    expect(layout.slots[0].y).toBeLessThan(80);
    layout.slots.forEach((slot) => {
      expect(slot.x - slot.d / 2).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.d / 2).toBeLessThanOrEqual(900);
      expect(slot.y - slot.d / 2).toBeGreaterThanOrEqual(0);
      expect(slot.y + slot.d / 2).toBeLessThanOrEqual(560);
    });
    // Bigger points, bigger flag.
    expect(layout.slots[0].d).toBeGreaterThan(layout.slots[19].d);
  });

  it('shrinks the flags until a crowded ring has room for them all', () => {
    const points = Array.from({ length: 40 }, () => 24);
    const layout = layoutRing({
      width: 360,
      height: 520,
      points,
      maxPoints: 24,
      pills: true,
    });

    // Neighbours along the ring don't overlap.
    layout.slots.forEach((slot, index) => {
      const next = layout.slots[(index + 1) % layout.slots.length];
      const gap = Math.hypot(next.x - slot.x, next.y - slot.y);

      expect(gap).toBeGreaterThan((slot.d + next.d) / 2 - 2);
    });
    expect(layout.center).toBeLessThan(
      Math.min(360, 520) / 2 - layout.slots[0].d,
    );
  });
});
