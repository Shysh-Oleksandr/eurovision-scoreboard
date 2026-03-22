import { Country, EventStage, StageVotingMode } from '../../models';

import type { ManualShareTotalsRow } from './types';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';

export const getDisplayTotal = (
  votingMode: StageVotingMode,
  row: ManualShareTotalsRow,
): number => {
  if (votingMode === StageVotingMode.JURY_AND_TELEVOTE) {
    return (row.jury ?? 0) + (row.televote ?? 0);
  }
  if (votingMode === StageVotingMode.JURY_ONLY) {
    return row.jury ?? 0;
  }
  if (votingMode === StageVotingMode.TELEVOTE_ONLY) {
    return row.televote ?? 0;
  }
  if (votingMode === StageVotingMode.COMBINED) {
    return row.combined ?? 0;
  }
  return (row.jury ?? 0) + (row.televote ?? 0);
};

const getJuryPoints = (row: ManualShareTotalsRow): number => row.jury ?? 0;
const getTelevotePoints = (row: ManualShareTotalsRow): number =>
  row.televote ?? 0;
const getCombinedPoints = (row: ManualShareTotalsRow): number =>
  row.combined ?? 0;

export const buildGetPoints = (
  votingMode: StageVotingMode,
  manualRowByCode: Record<string, ManualShareTotalsRow>,
) => {
  return (
    country: Country,
    type?: 'jury' | 'televote' | 'combined',
  ): number => {
    const row = manualRowByCode[country.code] || {};

    if (type === 'jury') {
      if (votingMode === StageVotingMode.JURY_ONLY) {
        return toFixedIfDecimalFloat(getJuryPoints(row));
      }
      if (
        votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
        votingMode === StageVotingMode.COMBINED
      ) {
        return toFixedIfDecimalFloat(getJuryPoints(row));
      }
      return 0;
    }
    if (type === 'televote') {
      if (votingMode === StageVotingMode.TELEVOTE_ONLY) {
        return toFixedIfDecimalFloat(getTelevotePoints(row));
      }
      if (
        votingMode === StageVotingMode.JURY_AND_TELEVOTE ||
        votingMode === StageVotingMode.COMBINED
      ) {
        return toFixedIfDecimalFloat(getTelevotePoints(row));
      }
      return 0;
    }

    return toFixedIfDecimalFloat(getDisplayTotal(votingMode, row));
  };
};

export const buildRankedCountriesForManualTotals = (
  stage: EventStage,
  manualRowByCode: Record<string, ManualShareTotalsRow>,
): (Country & { rank: number })[] => {
  const orderMap =
    stage.runningOrder && stage.runningOrder.length > 0
      ? new Map(stage.runningOrder.map((code, idx) => [code, idx]))
      : null;

  const withPoints = stage.countries.map((c) => {
    const row = manualRowByCode[c.code] || {};
    const jury = getJuryPoints(row);
    const televote = getTelevotePoints(row);
    const combined = getCombinedPoints(row);
    const total =
      stage.votingMode === StageVotingMode.JURY_AND_TELEVOTE
        ? jury + televote
        : stage.votingMode === StageVotingMode.COMBINED
          ? combined
          : stage.votingMode === StageVotingMode.JURY_ONLY
            ? jury
            : televote;

    return {
      ...c,
      juryPoints: jury,
      televotePoints: televote,
      points: total,
    };
  });

  const sorted = [...withPoints].sort((a, b) => {
    const pointsComparison = b.points - a.points;
    if (pointsComparison !== 0) return pointsComparison;

    const televoteComparison = b.televotePoints - a.televotePoints;
    if (televoteComparison !== 0) return televoteComparison;

    if (orderMap) {
      const aIdx = orderMap.get(a.code);
      const bIdx = orderMap.get(b.code);
      if (aIdx !== undefined && bIdx !== undefined && aIdx !== bIdx) {
        return aIdx - bIdx;
      }
    }
    return a.name.localeCompare(b.name);
  });

  return sorted.map((c, i) => ({ ...c, rank: i + 1 }));
};

export const buildCountriesOverrideForPodium = (
  stage: EventStage,
  manualRowByCode: Record<string, ManualShareTotalsRow>,
): Country[] => {
  const ranked = buildRankedCountriesForManualTotals(
    stage,
    manualRowByCode,
  );

  return ranked.map((c) => ({
    ...c,
    lastReceivedPoints: null,
    isVotingFinished: true,
  }));
};
