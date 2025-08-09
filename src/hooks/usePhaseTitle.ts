import { useGeneralStore } from '../state/generalStore';
import { useScoreboardStore } from '../state/scoreboardStore';

export const usePhaseTitle = () => {
  const contestYear = useGeneralStore((state) => state.settings.contestYear);
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const { name: stageName } = getCurrentStage() || {};

  const phaseTitle = contestYear ? `${stageName} - ${contestYear}` : stageName;

  return phaseTitle;
};
