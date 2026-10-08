import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { EventStage, StageVotingMode, StageVotingType } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import { buildStatsAccessors } from './statsAccessors';

export const useFinalStats = () => {
  const t = useTranslations('simulation.finalStats');
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const predefinedVotes = useScoreboardStore((state) => state.predefinedVotes);
  const currentStageId = useScoreboardStore((state) => state.currentStageId);

  const finishedStages = eventStages.filter((stage) => stage.isOver);

  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const [selectedVoteType, setSelectedVoteType] = useState<
    'Total' | StageVotingType
  >('Total');

  useEffect(() => {
    const isSelectedStageValid = finishedStages.some(
      (stage) => stage.id === selectedStageId,
    );

    if (selectedStageId && isSelectedStageValid) {
      return;
    }

    const currentStage = eventStages.find((s) => s.id === currentStageId);

    if (currentStage?.isOver) {
      setSelectedStageId(currentStage.id);

      return;
    }

    if (finishedStages.length > 0) {
      const lastFinishedStage = finishedStages[finishedStages.length - 1];

      setSelectedStageId(lastFinishedStage.id);

      return;
    }
  }, [eventStages, currentStageId, selectedStageId, finishedStages]);

  const selectedStage: EventStage | undefined = eventStages.find(
    (s) => s.id === selectedStageId,
  );

  const voteTypeOptions = useMemo(() => {
    if (!selectedStage) return [];

    const { votingMode } = selectedStage;

    if (
      [StageVotingMode.JURY_AND_TELEVOTE, StageVotingMode.COMBINED].includes(
        votingMode,
      )
    ) {
      return [StageVotingType.JURY, StageVotingType.TELEVOTE];
    }

    return [];
  }, [selectedStage]);

  const totalBadgeLabel = useMemo(() => {
    if (!selectedStage) return t('total');

    const { votingMode } = selectedStage;

    if (votingMode === StageVotingMode.JURY_ONLY) {
      return t('jury');
    }

    if (votingMode === StageVotingMode.TELEVOTE_ONLY) {
      return t('televote');
    }

    if (votingMode === StageVotingMode.COMBINED) {
      return t('combined');
    }

    return t('total');
  }, [selectedStage, t]);

  const votesForStage = selectedStageId
    ? predefinedVotes[selectedStageId]
    : null;

  // Ranking and point lookups are pure (statsAccessors.ts) so the graphics
  // studio can compute the same tables for its stats element.
  const { rankedCountries, getPoints, getCellPoints, getCellClassName } =
    useMemo(
      () => buildStatsAccessors(selectedStage, selectedVoteType, votesForStage),
      [selectedStage, selectedVoteType, votesForStage],
    );

  return {
    finishedStages,
    selectedStage,
    selectedStageId,
    setSelectedStageId,
    selectedVoteType,
    setSelectedVoteType,
    voteTypeOptions,
    totalBadgeLabel,
    rankedCountries,
    getPoints,
    getCellPoints,
    getCellClassName,
  };
};
