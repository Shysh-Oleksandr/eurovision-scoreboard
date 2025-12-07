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
  const eventStages = useScoreboardStore((state) => state.eventStages);

  // Note: Semi-final means any stage before the final stage (GF)
  const shouldShowAsNonQualified = useMemo(() => {
    const fallbackStage = getCurrentStage();
    const currentStageId = viewedStageId || fallbackStage?.id;

    if (!currentStageId) return false;

    const currentStage =
      eventStages.find((s) => s.id === currentStageId) || fallbackStage;

    if (!currentStage) return false;

    const isGrandFinal = currentStage.id === StageId.GF;

    // Find this country in the currently viewed stage (or latest non-final),
    // falling back to the semi-final lookup for legacy/all-participants cases.
    const countryInCurrentStage =
      currentStage.countries.find((c) => c.code === country.code) ||
      getCountryInSemiFinal(country.code);

    const hasQualifiedFromCurrentStage =
      !!countryInCurrentStage &&
      countryInCurrentStage.qualifiedFromStageIds?.includes(currentStage.id);

    // Non-final phases: mark countries as non-qualified once voting is over
    // if they haven't qualified from this stage.
    if (!isGrandFinal) {
      const isNonQualifiedInSemiFinal =
        isVotingOver && !hasQualifiedFromCurrentStage;

      const isNonQualifiedInAllParticipantsMode =
        showAllParticipants &&
        winnerCountry &&
        !hasQualifiedFromCurrentStage &&
        !country?.isAutoQualified;

      return Boolean(
        isNonQualifiedInSemiFinal || isNonQualifiedInAllParticipantsMode,
      );
    }

    // Grand Final: in all-participants mode, any country not participating
    // in the Grand Final should be shown as non-qualified (unless auto-qualified).
    const isInGrandFinal = currentStage.countries.some(
      (c) => c.code === country.code,
    );

    const isNonQualifiedInGrandFinalAllParticipants =
      showAllParticipants &&
      winnerCountry &&
      !isInGrandFinal &&
      !country?.isAutoQualified;

    return Boolean(isNonQualifiedInGrandFinalAllParticipants);
  }, [
    viewedStageId,
    getCurrentStage,
    getCountryInSemiFinal,
    eventStages,
    country.code,
    country?.isAutoQualified,
    isVotingOver,
    showAllParticipants,
    winnerCountry,
  ]);

  return shouldShowAsNonQualified;
};
