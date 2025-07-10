import { useScoreboardStore } from '../state/scoreboardStore';

export const useNextEventName = () => {
  const eventStages = useScoreboardStore((state) => state.eventStages);
  const currentStageId = useScoreboardStore((state) => state.currentStageId);
  const currentStageIndex = eventStages.findIndex(
    (stage) => stage.id === currentStageId,
  );
  const nextStage =
    currentStageIndex === eventStages.length - 1
      ? null
      : eventStages[currentStageIndex + 1];
  const nextPhase = nextStage?.name;

  return { nextPhase };
};
