import { ScoreboardState } from './types';

import { EventMode, StageId } from '@/models';

export const initialScoreboardState: Partial<ScoreboardState> = {
  eventStages: [],
  currentStageId: null,
  viewedStageId: null,
  eventMode: EventMode.GRAND_FINAL_ONLY,
  votingCountryIndex: 0,
  votingPointsIndex: 0,
  shouldShowLastPoints: true,
  shouldClearPoints: false,
  winnerCountry: null,
  showQualificationResults: false,
  restartCounter: 0,
  startCounter: 0,
  showAllParticipants: false,
  televotingProgress: 0,
  predefinedVotes: {
    [StageId.SF1]: {},
    [StageId.SF2]: {},
    [StageId.GF]: {},
  },
  hasShownManualTelevoteWarning: false,
  randomnessLevel: 50,
  lastPointsResetTimerId: null,
};
