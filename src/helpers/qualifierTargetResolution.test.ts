import { describe, expect, it } from 'vitest';

import {
  getQualifierTargetStageId,
  getTotalQualifiersAmount,
  resolveTargetStageIdForRank,
} from './qualifierTargetResolution';

import { QualifierTarget } from '@/models';

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
});
