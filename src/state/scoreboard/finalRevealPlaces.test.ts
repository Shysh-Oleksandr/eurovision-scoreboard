import { describe, expect, it } from 'vitest';

import { getFinalRevealPlaces, placeAtPoints } from './finalRevealPlaces';
import { getFinalRevealInfo } from './helpers';

import { Country, EventStage, StageVotingMode } from '@/models';

const country = (
  code: string,
  points: number,
  televotePoints: number,
  isVotingFinished = true,
): Country =>
  ({
    code,
    name: code.toUpperCase(),
    points,
    juryPoints: points - televotePoints,
    televotePoints,
    lastReceivedPoints: null,
    isVotingFinished,
  } as Country);

// Shaped like the reference clip: the leader on 170, the last country 8th
// on 93 with no televote yet.
const reference = () => [
  country('th', 170, 90),
  country('a', 140, 70),
  country('b', 130, 60),
  country('c', 120, 60),
  country('d', 110, 50),
  country('e', 100, 50),
  country('f', 95, 40),
  country('ph', 93, 0, false),
  country('g', 80, 40),
];

const stageOf = (countries: Country[], runningOrder?: string[]) =>
  ({
    id: 'final',
    isLastStage: true,
    isJuryVoting: false,
    isOver: false,
    votingMode: StageVotingMode.JURY_AND_TELEVOTE,
    countries,
    runningOrder,
  } as unknown as EventStage);

describe('getFinalRevealPlaces', () => {
  it('ranks the start and every pass with the board tiebreak', () => {
    const places = getFinalRevealPlaces(reference(), 'ph')!;

    expect(places.leaderCode).toBe('th');
    expect(places.leaderPoints).toBe(170);
    expect(places.totalPlaces).toBe(9);
    expect(places.startPlace).toBe(8);
    // Level on points, the bigger televote wins: on 95 the last country has
    // 2 televote points against f's 40, so it passes f on 96, and so on.
    expect(places.passes).toEqual([
      { points: 96, place: 7 },
      { points: 101, place: 6 },
      { points: 111, place: 5 },
      { points: 121, place: 4 },
      { points: 131, place: 3 },
      { points: 141, place: 2 },
      { points: 171, place: 1 },
    ]);
    expect(places.winAt).toBe(171);
  });

  it('gives the place for any running total', () => {
    const places = getFinalRevealPlaces(reference(), 'ph')!;

    expect(placeAtPoints(places, 93)).toBe(8);
    expect(placeAtPoints(places, 120)).toBe(5);
    expect(placeAtPoints(places, 121)).toBe(4);
    expect(placeAtPoints(places, 170)).toBe(2);
    expect(placeAtPoints(places, 171)).toBe(1);
    expect(placeAtPoints(places, 400)).toBe(1);
  });

  it('wins on a tie when the running televote beats the leader', () => {
    const countries = reference().map((c) =>
      c.code === 'th' ? country('th', 170, 50) : c,
    );
    const places = getFinalRevealPlaces(countries, 'ph')!;

    // On 170 the last country has 77 televote points against 50.
    expect(places.winAt).toBe(170);
    expect(placeAtPoints(places, 169)).toBe(2);
    expect(placeAtPoints(places, 170)).toBe(1);
  });

  it('falls back to the running order when the televote is level too', () => {
    const countries = [country('th', 50, 20), country('ph', 30, 0, false)];

    // On 50 both have 20 televote points: earlier in the running order wins.
    expect(getFinalRevealPlaces(countries, 'ph', ['ph', 'th'])!.winAt).toBe(50);
    expect(getFinalRevealPlaces(countries, 'ph', ['th', 'ph'])!.winAt).toBe(51);
  });

  it('collapses countries passed on the same total into one move', () => {
    const countries = [
      country('l', 200, 100),
      country('x', 120, 60),
      country('y', 120, 60),
      country('z', 120, 10),
      country('ph', 100, 0, false),
    ];
    const places = getFinalRevealPlaces(countries, 'ph')!;

    expect(places.startPlace).toBe(5);
    // z falls on the tie (20 > 10), x and y one point later.
    expect(places.passes).toEqual([
      { points: 120, place: 4 },
      { points: 121, place: 2 },
      { points: 201, place: 1 },
    ]);
  });

  it('starts right under the leader without any passes', () => {
    const countries = [country('l', 150, 80), country('ph', 140, 0, false)];
    const places = getFinalRevealPlaces(countries, 'ph')!;

    expect(places.startPlace).toBe(2);
    expect(places.passes).toEqual([{ points: 151, place: 1 }]);
  });

  it('counts a televote-only stage the same way', () => {
    // Televote only: points are the televote, so the running total is too.
    const countries = [
      country('l', 120, 120),
      country('m', 60, 60),
      country('ph', 0, 0, false),
    ];
    const places = getFinalRevealPlaces(countries, 'ph')!;

    expect(places.startPlace).toBe(3);
    expect(places.winAt).toBe(121);
  });
});

describe('getFinalRevealInfo', () => {
  it('picks the leader with the board tiebreak', () => {
    const countries = [
      country('th', 170, 90),
      country('x', 170, 95),
      country('ph', 93, 0, false),
    ];

    expect(getFinalRevealInfo(stageOf(countries), true)).toEqual({
      leaderCode: 'x',
      lastCode: 'ph',
      pointsNeeded: 78,
    });
  });

  it('asks for one point less when a tie would win', () => {
    const countries = [country('th', 170, 50), country('ph', 93, 0, false)];

    expect(getFinalRevealInfo(stageOf(countries), true)?.pointsNeeded).toBe(77);
  });

  it('skips the reveal when the last country already leads', () => {
    const countries = [country('th', 90, 50), country('ph', 93, 0, false)];

    expect(getFinalRevealInfo(stageOf(countries), true)).toBeNull();
  });
});
