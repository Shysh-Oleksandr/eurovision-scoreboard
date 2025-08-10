import { useEffect, useMemo, useState } from 'react';

import { getFlagPath } from '../../../helpers/getFlagPath';
import {
  BaseCountry,
  Country,
  EventStage,
  StageVotingMode,
  StageVotingType,
} from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

export const useFinalStats = () => {
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
    if (!selectedStage) return 'Total';

    const { votingMode } = selectedStage;

    if (votingMode === StageVotingMode.JURY_ONLY) {
      return 'Jury';
    }

    if (votingMode === StageVotingMode.TELEVOTE_ONLY) {
      return 'Televote';
    }

    if (votingMode === StageVotingMode.COMBINED) {
      return 'Combined';
    }

    return 'Total';
  }, [selectedStage]);

  const participatingCountries: Country[] = useMemo(
    () => (selectedStage ? selectedStage.countries : []),
    [selectedStage],
  );

  const votesForStage = selectedStageId
    ? predefinedVotes[selectedStageId]
    : null;

  const getTotalPointsForCountry = (
    countryCode: string,
    type: 'jury' | 'televote' | 'combined',
  ): number => {
    if (!votesForStage?.[type]) return 0;

    return Object.values(votesForStage[type]!).reduce((total, votes) => {
      const vote = votes.find((v) => v.countryCode === countryCode);

      return total + (vote?.points || 0);
    }, 0);
  };

  const getPoints = (country: Country) => {
    if (selectedVoteType === StageVotingType.JURY) {
      if (selectedStage?.votingMode === StageVotingMode.COMBINED) {
        return getTotalPointsForCountry(country.code, 'jury');
      }

      return country.juryPoints;
    }
    if (selectedVoteType === StageVotingType.TELEVOTE) {
      if (selectedStage?.votingMode === StageVotingMode.COMBINED) {
        return getTotalPointsForCountry(country.code, 'televote');
      }

      return country.televotePoints;
    }

    if (selectedStage?.votingMode === StageVotingMode.COMBINED) {
      return getTotalPointsForCountry(country.code, 'combined');
    }

    return country.points;
  };

  const rankedCountries = [...participatingCountries]
    .sort((a, b) => {
      const pointsComparison = getPoints(b) - getPoints(a);

      if (pointsComparison === 0) {
        const televoteComparison = b.televotePoints - a.televotePoints;

        if (televoteComparison === 0) {
          return a.name.localeCompare(b.name);
        }

        return televoteComparison;
      }

      return pointsComparison;
    })
    .map((country, index) => ({ ...country, rank: index + 1 }));

  const getPointsFromVoter = (
    participantCode: string,
    voterCode: string,
    type: 'jury' | 'televote' | 'combined',
  ) => {
    const votes = votesForStage?.[type]?.[voterCode];

    if (!votes) return 0;
    const vote = votes.find((v) => v.countryCode === participantCode);

    return vote ? vote.points : 0;
  };

  const getCellPoints = (participantCode: string, voterCode: string) => {
    if (!selectedStage) return '';

    const juryPoints = getPointsFromVoter(participantCode, voterCode, 'jury');
    const televotePoints = getPointsFromVoter(
      participantCode,
      voterCode,
      'televote',
    );

    if (selectedVoteType === StageVotingType.JURY) {
      return juryPoints || '';
    }
    if (selectedVoteType === StageVotingType.TELEVOTE) {
      return televotePoints || '';
    }

    if (selectedStage?.votingMode === StageVotingMode.COMBINED) {
      const combinedPoints =
        getPointsFromVoter(participantCode, voterCode, 'combined') || '';

      return combinedPoints;
    }

    const total = juryPoints + televotePoints;

    return total > 0 ? total : '';
  };

  const getCellClassName = (points: number) => {
    const isTotalVoteType =
      selectedVoteType === 'Total' && totalBadgeLabel === 'Total';

    if (
      (points === 12 && !isTotalVoteType) ||
      (points >= 20 && isTotalVoteType)
    ) {
      return 'font-bold bg-primary-700/50';
    }

    if (
      (points === 10 && !isTotalVoteType) ||
      (points >= 17 && isTotalVoteType)
    ) {
      return 'font-semibold bg-primary-800/60';
    }
    if (
      (points === 8 && !isTotalVoteType) ||
      (points >= 15 && isTotalVoteType)
    ) {
      return 'font-semibold bg-primary-800/30';
    }

    return 'font-medium';
  };

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
