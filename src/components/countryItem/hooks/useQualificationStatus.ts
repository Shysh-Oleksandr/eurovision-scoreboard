import { useMemo } from 'react';

import { useShallow } from 'zustand/shallow';

import { Country, EventStage, StageId } from '../../../models';
import { useScoreboardStore } from '../../../state/scoreboardStore';

import type { ScoreboardState } from '@/state/scoreboard/types';

/** The stage this hook reasons about: the viewed stage, falling back to the current one. */
const resolveViewedStage = (state: ScoreboardState): EventStage | undefined => {
  const fallbackStage = state.getCurrentStage();
  const currentStageId = state.viewedStageId || fallbackStage?.id;

  if (!currentStageId) return undefined;

  return (
    state.eventStages.find((s) => s.id === currentStageId) || fallbackStage
  );
};

export const useQualificationStatus = (
  country: Country,
  isVotingOver: boolean,
) => {
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);

  // One narrow selector per item instead of a whole-`eventStages`
  // subscription: the stage is resolved once, and the results are primitives
  // (or a reference-stable country object), so memoized items don't re-render
  // on unrelated store writes.
  const { stageId, countryInCurrentStage, isInCurrentStage } =
    useScoreboardStore(
      useShallow((state) => {
        const stage = resolveViewedStage(state);

        if (!stage) {
          return {
            stageId: null as string | null,
            countryInCurrentStage: null as Country | null,
            isInCurrentStage: false,
          };
        }

        const countryInStage = stage.countries.find(
          (c) => c.code === country.code,
        );

        return {
          stageId: stage.id as string | null,
          countryInCurrentStage:
            countryInStage || state.getCountryInSemiFinal(country.code),
          isInCurrentStage: !!countryInStage,
        };
      }),
    );

  // Note: Semi-final means any stage before the final stage (GF)
  const { shouldShowAsNonQualified, shouldShowNQLabel } = useMemo(() => {
    if (!stageId)
      return { shouldShowAsNonQualified: false, shouldShowNQLabel: false };

    const isGrandFinal = stageId.toUpperCase() === StageId.GF.toUpperCase();

    const hasQualifiedFromCurrentStage =
      !!countryInCurrentStage &&
      countryInCurrentStage.qualifiedFromStageIds?.includes(stageId);

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

      return {
        shouldShowAsNonQualified: Boolean(
          isNonQualifiedInSemiFinal || isNonQualifiedInAllParticipantsMode,
        ),
        shouldShowNQLabel: false,
      };
    }

    // Grand Final: in all-participants mode, any country not participating
    // in the Grand Final should be shown as non-qualified (unless auto-qualified).
    const isNonQualifiedInGrandFinalAllParticipants = Boolean(
      showAllParticipants &&
        winnerCountry &&
        !isInCurrentStage &&
        !country?.isAutoQualified,
    );

    return {
      shouldShowAsNonQualified: isNonQualifiedInGrandFinalAllParticipants,
      shouldShowNQLabel:
        isNonQualifiedInGrandFinalAllParticipants && showAllParticipants,
    };
  }, [
    stageId,
    countryInCurrentStage,
    isInCurrentStage,
    country?.isAutoQualified,
    isVotingOver,
    showAllParticipants,
    winnerCountry,
  ]);

  return { shouldShowAsNonQualified, shouldShowNQLabel };
};
