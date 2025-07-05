import { useMemo } from 'react';

import { Country, EventPhase } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

export const useQualificationStatus = (
  country: Country,
  isVotingOver: boolean,
) => {
  const { qualifiedCountries, eventPhase, showAllParticipants, winnerCountry } =
    useScoreboardStore();

  const shouldShowAsNonQualified = useMemo(() => {
    const isSemiFinalPhase =
      eventPhase === EventPhase.SEMI_FINAL_1 ||
      eventPhase === EventPhase.SEMI_FINAL_2;

    const isQualified = qualifiedCountries.some((c) => c.code === country.code);

    const isNonQualifiedInSemiFinal =
      isVotingOver && isSemiFinalPhase && !isQualified;

    const isNonQualifiedInAllParticipantsMode =
      showAllParticipants &&
      winnerCountry &&
      !country.isQualifiedFromSemi &&
      !country.isAutoQualified;

    return Boolean(
      isNonQualifiedInSemiFinal || isNonQualifiedInAllParticipantsMode,
    );
  }, [
    eventPhase,
    qualifiedCountries,
    isVotingOver,
    showAllParticipants,
    winnerCountry,
    country,
  ]);

  return shouldShowAsNonQualified;
};
