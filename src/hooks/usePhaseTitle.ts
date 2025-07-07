import { useGeneralStore } from '../state/generalStore';
import { useScoreboardStore } from '../state/scoreboardStore';

export const usePhaseTitle = () => {
  const { year } = useGeneralStore();
  const { getCurrentStage } = useScoreboardStore();

  const { name: stageName } = getCurrentStage() || {};

  const phaseTitle = `${stageName} - ${year}`;

  return phaseTitle;
};
