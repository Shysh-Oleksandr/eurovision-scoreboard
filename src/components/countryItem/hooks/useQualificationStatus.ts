import { useMemo } from 'react';

import { Country, StageId } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

export const useQualificationStatus = (
  country: Country,
  isVotingOver: boolean,
) => {
  const {
    getCurrentStage,
    getCountryInSemiFinal,
    showAllParticipants,
    winnerCountry,
  } = useScoreboardStore();

  const shouldShowAsNonQualified = useMemo(() => {
    const { id: currentStageId } = getCurrentStage();
    const isSemiFinalPhase = currentStageId !== StageId.GF;

    const countryInSemiFinal = getCountryInSemiFinal(country.code);

    const isNonQualifiedInSemiFinal =
      isVotingOver &&
      isSemiFinalPhase &&
      !countryInSemiFinal?.isQualifiedFromSemi;

    const isNonQualifiedInAllParticipantsMode =
      showAllParticipants &&
      winnerCountry &&
      !countryInSemiFinal?.isQualifiedFromSemi &&
      !country?.isAutoQualified;

    return Boolean(
      isNonQualifiedInSemiFinal || isNonQualifiedInAllParticipantsMode,
    );
  }, [
    getCurrentStage,
    getCountryInSemiFinal,
    country.code,
    country?.isAutoQualified,
    isVotingOver,
    showAllParticipants,
    winnerCountry,
  ]);

  return shouldShowAsNonQualified;
};
