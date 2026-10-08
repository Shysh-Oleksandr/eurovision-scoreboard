'use client';
import { Table2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { StatsElement as StatsElementModel } from '../model/design';
import { StatsSource, useDesignData } from '../render/DesignDataContext';

import SplitStats from '@/components/simulation/finalStats/SplitStats';
import { buildStatsAccessors } from '@/components/simulation/finalStats/statsAccessors';
import StatsTable from '@/components/simulation/finalStats/StatsTable';
import SummaryStats from '@/components/simulation/finalStats/SummaryStats';
import { StageVotingType, StatsTableType } from '@/models';

const VOTE_TYPES = {
  Total: 'Total',
  Jury: StageVotingType.JURY,
  Televote: StageVotingType.TELEVOTE,
} as const;

/**
 * The stats source for one element: what a share modal handed in, or tables
 * computed from the design's live stage for the element's own vote type.
 */
export function useStatsSource(el: StatsElementModel): StatsSource | null {
  const { stats, statsStage } = useDesignData();

  return useMemo(() => {
    if (stats) return stats;
    if (!statsStage) return null;
    const voteType = VOTE_TYPES[el.voteType];
    const accessors = buildStatsAccessors(
      statsStage.stage,
      voteType,
      statsStage.votes,
    );

    const { voters } = statsStage;

    return {
      ...accessors,
      selectedStage: statsStage.stage,
      selectedStageId: statsStage.stage.id,
      selectedVoteType: voteType,
      votingCountries: voters
        ? voteType === StageVotingType.JURY
          ? voters.jury
          : voters.televote
        : undefined,
    };
  }, [stats, statsStage, el.voteType]);
}

/**
 * One of the final-stats tables. Without any source (manual rows, a saved
 * contest) it renders a labelled placeholder so the element stays visible
 * and selectable in the editor.
 */
const StatsElement: React.FC<{ el: StatsElementModel }> = ({ el }) => {
  const t = useTranslations('graphics.data');
  const stats = useStatsSource(el);

  if (!stats) {
    return (
      <div className="gfx-stats-empty">
        <Table2 className="size-6" />
        <span>{t('statsNeedLive')}</span>
        <small>{t('statsNeedLiveHint')}</small>
      </div>
    );
  }

  switch (el.table) {
    case StatsTableType.BREAKDOWN:
      return (
        <StatsTable
          rankedCountries={stats.rankedCountries}
          getCellPoints={stats.getCellPoints}
          getCellClassName={stats.getCellClassName}
          getPoints={stats.getPoints}
          selectedStageId={stats.selectedStageId}
          selectedVoteType={stats.selectedVoteType}
          votingCountries={stats.votingCountries}
          enableHover={false}
        />
      );
    case StatsTableType.SPLIT:
      return (
        <SplitStats
          rankedCountries={stats.rankedCountries}
          selectedStage={stats.selectedStage}
          getPoints={stats.getPoints}
          enableHover={false}
          aggregateTotalsOnly={stats.aggregateTotalsOnly}
        />
      );
    case StatsTableType.SUMMARY:
      return (
        <SummaryStats
          rankedCountries={stats.rankedCountries}
          selectedStage={stats.selectedStage}
          getPoints={stats.getPoints}
          enableHover={false}
          aggregateTotalsOnly={stats.aggregateTotalsOnly}
        />
      );
    default:
      return null;
  }
};

export default StatsElement;
