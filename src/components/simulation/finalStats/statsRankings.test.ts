import { describe, expect, it } from 'vitest';

import { buildStageRankings } from './statsRankings';

import { Country, EventStage, StageVotingMode } from '@/models';

const country = (
  code: string,
  juryPoints: number,
  televotePoints: number,
): Country =>
  ({
    code,
    name: code,
    juryPoints,
    televotePoints,
    points: juryPoints + televotePoints,
  } as Country);

const getPoints = (entry: Country, type?: 'jury' | 'televote' | 'combined') =>
  type === 'jury'
    ? entry.juryPoints
    : type === 'televote'
    ? entry.televotePoints
    : entry.points;

const stage = (
  votingMode: StageVotingMode,
  runningOrder: string[] = [],
): EventStage =>
  ({ id: 'gf', name: 'Grand Final', votingMode, runningOrder } as EventStage);

describe('buildStageRankings', () => {
  const entries = [
    country('AA', 100, 50), // 150
    country('BB', 40, 110), // 150, more televote: ahead of AA
    country('CC', 100, 20), // ties AA on jury
    country('DD', 0, 0),
  ];

  it('breaks total ties by televote, then running order', () => {
    const { byTotal, maxTotal } = buildStageRankings(
      stage(StageVotingMode.JURY_AND_TELEVOTE, ['DD', 'CC', 'BB', 'AA']),
      entries,
      getPoints,
    );

    expect(byTotal.map((entry) => entry.code)).toEqual([
      'BB',
      'AA',
      'CC',
      'DD',
    ]);
    expect(maxTotal).toBe(150);
  });

  it('places jury and televote ties by running order', () => {
    const { juryPlace, televotePlace } = buildStageRankings(
      stage(StageVotingMode.JURY_AND_TELEVOTE, ['CC', 'AA', 'BB', 'DD']),
      entries,
      getPoints,
    );

    // AA and CC tie on 100 jury points; CC performed first.
    expect(juryPlace.get('CC')).toBe(1);
    expect(juryPlace.get('AA')).toBe(2);
    expect(televotePlace.get('BB')).toBe(1);
    expect(televotePlace.get('DD')).toBe(4);
  });

  it('has no split for a single-channel stage', () => {
    const rankings = buildStageRankings(
      stage(StageVotingMode.TELEVOTE_ONLY),
      entries,
      getPoints,
    );

    expect(rankings.hasSplit).toBe(false);
    expect(rankings.byJury).toEqual([]);
    expect(rankings.juryPlace.size).toBe(0);
  });
});
