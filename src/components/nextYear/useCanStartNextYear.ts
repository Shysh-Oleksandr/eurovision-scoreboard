import { useScoreboardStore } from '@/state/scoreboardStore';

/** The show is over and has a winner: Next year can start from it. */
export const useCanStartNextYear = (): boolean =>
  useScoreboardStore((state) => {
    const stage = state.eventStages.find((s) => s.id === state.currentStageId);

    return !!stage?.isLastStage && !!stage.isOver && !!state.winnerCountry;
  });
