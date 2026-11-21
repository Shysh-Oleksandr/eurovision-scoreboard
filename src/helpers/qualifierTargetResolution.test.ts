import { describe, expect, it } from 'vitest';

import {
  getOpenPlacesInActiveSection,
  getQualifierSections,
  getQualifierTargetStageId,
  getTotalQualifiersAmount,
  groupQualifiersBySection,
  qualifiesOnlyToGrandFinal,
  resolveTargetStageIdForRank,
  shouldShowQualifierTargetLabels,
} from './qualifierTargetResolution';

import { EventStage, QualifierTarget, StageVotingMode } from '@/models';

describe('qualifierTargetResolution', () => {
  const amountBasedTargets: QualifierTarget[] = [
    { targetStageId: 'gf', amount: 5 },
    { targetStageId: 'sf2', amount: 5 },
  ];

  const rankBasedTargets: QualifierTarget[] = [
    { targetStageId: 'gf', amount: 10, minRank: 1, maxRank: 10 },
    { targetStageId: 'sf2', amount: 5, minRank: 11, maxRank: 15 },
  ];

  describe('resolveTargetStageIdForRank', () => {
    it('maps ranks to amount-based targets in order', () => {
      expect(resolveTargetStageIdForRank(1, amountBasedTargets)).toBe('gf');
      expect(resolveTargetStageIdForRank(5, amountBasedTargets)).toBe('gf');
      expect(resolveTargetStageIdForRank(6, amountBasedTargets)).toBe('sf2');
      expect(resolveTargetStageIdForRank(10, amountBasedTargets)).toBe('sf2');
    });

    it('maps ranks to rank-based target ranges', () => {
      expect(resolveTargetStageIdForRank(1, rankBasedTargets)).toBe('gf');
      expect(resolveTargetStageIdForRank(10, rankBasedTargets)).toBe('gf');
      expect(resolveTargetStageIdForRank(11, rankBasedTargets)).toBe('sf2');
      expect(resolveTargetStageIdForRank(15, rankBasedTargets)).toBe('sf2');
      expect(resolveTargetStageIdForRank(16, rankBasedTargets)).toBeNull();
    });
  });

  describe('getQualifierTargetStageId', () => {
    it('resolves a country rank from the full standings list', () => {
      const rankedCountryCodes = [
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
      ];

      expect(
        getQualifierTargetStageId('a', amountBasedTargets, rankedCountryCodes),
      ).toBe('gf');
      expect(
        getQualifierTargetStageId('f', amountBasedTargets, rankedCountryCodes),
      ).toBe('sf2');
    });
  });

  describe('getTotalQualifiersAmount', () => {
    it('sums amount-based targets', () => {
      expect(getTotalQualifiersAmount(amountBasedTargets)).toBe(10);
    });

    it('sums rank-based target ranges', () => {
      expect(getTotalQualifiersAmount(rankBasedTargets)).toBe(15);
    });
  });

  describe('qualifiesOnlyToGrandFinal', () => {
    const eventStages: EventStage[] = [
      {
        id: 'sf1',
        name: 'Semi-Final 1',
        order: 0,
        votingMode: StageVotingMode.TELEVOTE_ONLY,
        countries: [],
        isOver: false,
        isJuryVoting: false,
      },
      {
        id: 'gf',
        name: 'Grand Final',
        order: 1,
        votingMode: StageVotingMode.JURY_AND_TELEVOTE,
        countries: [],
        isOver: false,
        isJuryVoting: false,
        isLastStage: true,
      },
    ];

    it('returns true when the only target is the Grand Final', () => {
      expect(
        qualifiesOnlyToGrandFinal(
          [{ targetStageId: 'gf', amount: 10 }],
          eventStages,
        ),
      ).toBe(true);
    });

    it('returns false when qualifiers also advance to another stage', () => {
      const stagesWithSf2: EventStage[] = [
        ...eventStages.slice(0, 1),
        {
          id: 'sf2',
          name: 'Semi-Final 2',
          order: 1,
          votingMode: StageVotingMode.TELEVOTE_ONLY,
          countries: [],
          isOver: false,
          isJuryVoting: false,
        },
        { ...eventStages[1], order: 2 },
      ];

      expect(
        qualifiesOnlyToGrandFinal(
          [
            { targetStageId: 'gf', amount: 5 },
            { targetStageId: 'sf2', amount: 5 },
          ],
          stagesWithSf2,
        ),
      ).toBe(false);
    });

    it('hides labels when enabled but all qualifiers go to the Grand Final', () => {
      expect(
        shouldShowQualifierTargetLabels(
          [{ targetStageId: 'gf', amount: 10 }],
          eventStages,
          true,
        ),
      ).toBe(false);
    });
  });

  describe('qualifier sections', () => {
    const stages = [
      { id: 'gf', name: 'Grand Final' },
      { id: 'sf2', name: 'Wildcard round' },
    ] as EventStage[];

    it('splits amount-based places in the order they are listed', () => {
      expect(getQualifierSections(amountBasedTargets, stages)).toEqual([
        { targetStageId: 'gf', stageName: 'Grand Final', start: 0, size: 5 },
        {
          targetStageId: 'sf2',
          stageName: 'Wildcard round',
          start: 5,
          size: 5,
        },
      ]);
    });

    it('splits rank ranges in rank order, whatever order they are listed', () => {
      const sections = getQualifierSections(
        [...rankBasedTargets].reverse(),
        stages,
      );

      expect(
        sections.map(({ targetStageId, start, size }) => [
          targetStageId,
          start,
          size,
        ]),
      ).toEqual([
        ['gf', 0, 10],
        ['sf2', 10, 5],
      ]);
    });

    it('skips empty targets and names a missing stage with nothing', () => {
      expect(
        getQualifierSections(
          [
            { targetStageId: 'gf', amount: 0 },
            { targetStageId: 'gone', amount: 3 },
          ],
          stages,
        ),
      ).toEqual([{ targetStageId: 'gone', stageName: '', start: 0, size: 3 }]);
    });

    it('counts the open places of the target stage being filled', () => {
      expect(getOpenPlacesInActiveSection(rankBasedTargets, 0)).toBe(10);
      expect(getOpenPlacesInActiveSection(rankBasedTargets, 7)).toBe(3);
      expect(getOpenPlacesInActiveSection(rankBasedTargets, 10)).toBe(5);
      expect(getOpenPlacesInActiveSection(rankBasedTargets, 14)).toBe(1);
      expect(getOpenPlacesInActiveSection(rankBasedTargets, 15)).toBe(0);
      expect(getOpenPlacesInActiveSection(undefined, 0)).toBe(0);
    });

    it('groups qualifiers by their place, keeping their order', () => {
      const sections = getQualifierSections(
        [
          { targetStageId: 'gf', amount: 2 },
          { targetStageId: 'sf2', amount: 2 },
        ],
        stages,
      );
      const rank: Record<string, number> = { a: 3, b: 0, c: 2, d: 1 };

      expect(
        groupQualifiersBySection(
          sections,
          ['a', 'b', 'c', 'd'],
          (code) => rank[code],
        ),
      ).toEqual([
        ['b', 'd'],
        ['a', 'c'],
      ]);
      // By pick order; one past the places lands in the last section.
      expect(
        groupQualifiersBySection(
          sections,
          ['a', 'b', 'c', 'd', 'e'],
          (_, index) => index,
        ),
      ).toEqual([
        ['a', 'b'],
        ['c', 'd', 'e'],
      ]);
    });
  });
});
