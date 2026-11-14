import { VoterInfo } from './useVoterInfo';

import { useTelevoteProgress } from '@/components/controlsPanel/useTelevoteEntry';
import { useGeneralStore } from '@/state/generalStore';

/**
 * How far the round is, 0-1, wherever the layout shows a progress line (the
 * window's caption, the sheet's and the stripe's top edge), or undefined
 * when its setting is off: the juries through "Show jury voting progress",
 * the televote as the points given of the stage's total (the televote
 * limit's bar, so shown with the limit on).
 */
export const useRoundProgress = (voter: VoterInfo): number | undefined => {
  const showJuryProgress = useGeneralStore(
    (state) => state.settings.shouldShowJuryVotingProgress,
  );
  const { televoteProgress } = useTelevoteProgress();

  if (voter.phase === 'jury') {
    return showJuryProgress ? voter.progress : undefined;
  }

  return televoteProgress
    ? Math.min(televoteProgress.progressPercentage / 100, 1)
    : undefined;
};
