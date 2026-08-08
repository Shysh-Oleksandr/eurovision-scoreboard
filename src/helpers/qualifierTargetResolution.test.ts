import { describe, expect, it } from 'vitest';

import {
  getQualifierTargetStageId,
  getTotalQualifiersAmount,
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
});
