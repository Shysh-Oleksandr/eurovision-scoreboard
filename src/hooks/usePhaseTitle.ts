import { useGeneralStore } from '../state/generalStore';
import { useScoreboardStore } from '../state/scoreboardStore';

export const usePhaseTitle = () => {
  const year = useGeneralStore((state) => state.year);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const { name: stageName } = getCurrentStage() || {};

  const phaseTitle = `${stageName} - ${year}`;

  return phaseTitle;
};
