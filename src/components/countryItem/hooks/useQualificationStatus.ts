import { useMemo } from 'react';

import { Country, StageId } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

export const useQualificationStatus = (
  country: Country,
  isVotingOver: boolean,
) => {
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const getCountryInSemiFinal = useScoreboardStore(
    (state) => state.getCountryInSemiFinal,
  );
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);

  const shouldShowAsNonQualified = useMemo(() => {
    const currentStageId = viewedStageId || getCurrentStage().id;
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
    viewedStageId,
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
