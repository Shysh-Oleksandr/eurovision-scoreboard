import { beforeEach, describe, expect, it, vi } from 'vitest';
import { create, StoreApi, UseBoundStore } from 'zustand';

import { Country, EventStage, StageVotingMode } from '../../models';

import { createCountriesComparator } from './helpers';
import { ScoreboardState, StageVotes, Vote } from './types';
import { createVotingActions } from './votingActions';

vi.mock('@/theme/playThemeSound', () => ({
  playThemeSound: vi.fn(),
  notifyThemeSoundStageFinished: vi.fn(),
  isVotingPointsValueDouzeTier: vi.fn(() => false),
  playThemeSoundPointsAwardedIfNonDouze: vi.fn(),
  playThemeSoundTelevoteRevealIfNonDouze: vi.fn(),
}));
vi.mock('@/native/haptics', () => ({ playHaptic: vi.fn() }));

/*
 * Pick qualifiers mode with two target stages: the first picks fill the
 * first target stage's places, whoever is picked, and the entries end up
 * ranked so the stage hands them to the target stages that way.
 */

// Predefined jury points: AA leads, FF is last.
const POINTS: Record<string, number> = {
  AA: 12,
  BB: 10,
  CC: 8,
  DD: 7,
  EE: 6,
  FF: 5,
};
const CODES = Object.keys(POINTS);

const juryVotes = (): Partial<StageVotes> => ({
  jury: {
    XX: CODES.map(
      (code): Vote => ({
        countryCode: code,
        points: POINTS[code],
        pointsId: 0,
        showDouzePointsAnimation: false,
      }),
    ),
  },
});

const makeStage = (): EventStage =>
  ({
    id: 'sf1',
    name: 'Semi-Final 1',
    order: 0,
    votingMode: StageVotingMode.JURY_ONLY,
    runningOrder: CODES,
    countries: CODES.map(
      (code) =>
        ({
          code,
          name: code,
          juryPoints: 0,
          televotePoints: 0,
          points: 0,
          lastReceivedPoints: null,
        } as Country),
    ),
    qualifiesTo: [
      { targetStageId: 'gf', amount: 2 },
      { targetStageId: 'wc', amount: 2 },
    ],
    isOver: false,
    isJuryVoting: true,
  } as EventStage);

type TestStore = UseBoundStore<StoreApi<ScoreboardState>>;

const makeStore = (): TestStore =>
  create<ScoreboardState>()(
    (set, get, api) =>
      ({
        ...(createVotingActions as any)(set, get, api),
        eventStages: [makeStage()],
        currentStageId: 'sf1',
        getCurrentStage: () =>
          get().eventStages.find((stage) => stage.id === get().currentStageId),
        countryPoints: {
          sf1: Object.fromEntries(
            CODES.map((code) => [
              code,
              {
                juryPoints: POINTS[code],
                televotePoints: 0,
                combinedPoints: 0,
              },
            ]),
          ),
        },
        predefinedVotes: { sf1: juryVotes() },
        qualificationOrder: {},
        splitScreenQualifierCandidates: [],
        splitScreenQualifierShownCountByStage: {},
        splitScreenQualifierLastShownByStage: {},
      } as unknown as ScoreboardState),
  );

/** The entries in the order the stage hands out its places. */
const finalRanking = (store: TestStore) => {
  const stage = store.getState().getCurrentStage()!;

  return [...stage.countries]
    .sort(createCountriesComparator(stage.runningOrder))
    .map((country) => country.code);
};

describe('Pick qualifiers mode with several target stages', () => {
  let store: TestStore;

  beforeEach(() => {
    store = makeStore();
  });

  it('gives the first target stage the first picks, whoever they are', () => {
    // Last and fourth by points go first: they take the first target
    // stage's two places; then the leader and the second.
    ['FF', 'DD', 'AA', 'BB'].forEach((code) =>
      store.getState().pickQualifier(code),
    );

    const stage = store.getState().getCurrentStage()!;
    const ranking = finalRanking(store);

    expect(stage.isOver).toBe(true);
    expect(new Set(ranking.slice(0, 2))).toEqual(new Set(['FF', 'DD']));
    expect(new Set(ranking.slice(2, 4))).toEqual(new Set(['AA', 'BB']));
  });

  it('reveals the predefined qualifiers stage by stage when random', () => {
    for (let pick = 0; pick < 4; pick += 1) {
      store.getState().pickQualifierRandomly();
    }

    const order = store.getState().qualificationOrder.sf1;
    const byPick = Object.keys(order).sort((a, b) => order[a] - order[b]);

    expect(new Set(byPick.slice(0, 2))).toEqual(new Set(['AA', 'BB']));
    expect(new Set(byPick.slice(2, 4))).toEqual(new Set(['CC', 'DD']));
    // Nothing swapped: the predefined votes stand.
    expect(store.getState().predefinedVotes.sf1).toEqual(juryVotes());
  });

  it('keeps a pick inside the stage being filled without swapping', () => {
    store.getState().pickQualifier('BB');
    store.getState().pickQualifier('AA');
    // The second target stage: CC is within its places, so no swap.
    store.getState().pickQualifier('CC');

    expect(store.getState().predefinedVotes.sf1).toEqual(juryVotes());
  });
});
