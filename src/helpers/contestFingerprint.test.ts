import { describe, expect, it } from 'vitest';

import {
  contestSetupFingerprint,
  ContestSetupFingerprintInput,
  rebaseLoadedContestGeneralInfo,
  stableStringify,
} from './contestFingerprint';

import { useGeneralStore } from '@/state/generalStore';

const base = (): ContestSetupFingerprintInput => ({
  setup: {
    baseYear: '2026',
    stages: [
      { id: 'GF', name: 'Grand Final', order: 2, participants: ['FR', 'DE'] },
      {
        id: 'SF1',
        name: 'Semi-Final 1',
        order: 0,
        participants: ['AL', 'AZ'],
        qualifiesTo: [{ targetStageId: 'GF', amount: 10 }],
      },
    ],
    countryOdds: [
      ['FR', 60, 40],
      ['AL', 30, 70],
    ],
  },
  generalInfo: {
    contestName: 'Eurovision',
    contestDescription: '',
    contestYear: '2026',
    hostingCountryCode: 'AT',
    contestType: 'esc',
  },
});

describe('stableStringify', () => {
  it('is independent of key order and drops undefined', () => {
    expect(
      stableStringify({ b: 1, a: [1, { d: 2, c: 3 }], u: undefined }),
    ).toBe(stableStringify({ a: [1, { c: 3, d: 2 }], b: 1 }));
  });
});

describe('contestSetupFingerprint', () => {
  it('ignores stage and odds ordering', () => {
    const shuffled = base();

    shuffled.setup.stages = [...(shuffled.setup.stages as unknown[])].reverse();
    shuffled.setup.countryOdds = [
      ...(shuffled.setup.countryOdds as unknown[]),
    ].reverse();

    expect(contestSetupFingerprint(shuffled)).toBe(
      contestSetupFingerprint(base()),
    );
  });

  it('changes when a participant moves stage', () => {
    const moved = base();
    const stages = moved.setup.stages as Array<{ participants: string[] }>;

    stages[0].participants = ['FR'];
    stages[1].participants = ['AL', 'AZ', 'DE'];

    expect(contestSetupFingerprint(moved)).not.toBe(
      contestSetupFingerprint(base()),
    );
  });

  it('changes when a stage is renamed or odds change', () => {
    const renamed = base();

    (renamed.setup.stages as Array<{ name: string }>)[0].name = 'Final';
    expect(contestSetupFingerprint(renamed)).not.toBe(
      contestSetupFingerprint(base()),
    );

    const odds = base();

    (odds.setup.countryOdds as Array<[string, number, number]>)[0][1] = 61;
    expect(contestSetupFingerprint(odds)).not.toBe(
      contestSetupFingerprint(base()),
    );
  });

  it('changes when the general info changes', () => {
    const info = base();

    info.generalInfo.contestName = 'My Contest';
    expect(contestSetupFingerprint(info)).not.toBe(
      contestSetupFingerprint(base()),
    );
  });
});

describe('rebaseLoadedContestGeneralInfo', () => {
  it('moves only the general info of the saved baseline', () => {
    const saved = base();
    const renamed = {
      ...saved,
      generalInfo: { ...saved.generalInfo, contestName: 'Eurovision Asia' },
    };
    const editedSetup = {
      ...renamed,
      setup: { ...renamed.setup, baseYear: '2025' },
    };

    useGeneralStore.setState({
      loadedContestFingerprint: contestSetupFingerprint(saved),
    });
    rebaseLoadedContestGeneralInfo({ contestName: 'Eurovision Asia' });

    const baseline = useGeneralStore.getState().loadedContestFingerprint;

    // A details-only save of the name leaves the setup clean...
    expect(baseline).toBe(contestSetupFingerprint(renamed));
    // ...and setup edits that weren't saved still show as unsaved.
    expect(baseline).not.toBe(contestSetupFingerprint(editedSetup));
  });

  it('does nothing without a loaded contest', () => {
    useGeneralStore.setState({ loadedContestFingerprint: null });
    rebaseLoadedContestGeneralInfo({ contestName: 'X' });

    expect(useGeneralStore.getState().loadedContestFingerprint).toBeNull();
  });
});
