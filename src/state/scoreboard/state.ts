import { ScoreboardState } from './types';

import { StageId } from '@/models';

export const initialScoreboardState: Partial<ScoreboardState> = {
  eventStages: [],
  currentStageId: null,
  viewedStageId: null,
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
  manualShareTotals: {},
  countryPoints: {
    [StageId.SF1]: {},
    [StageId.SF2]: {},
    [StageId.GF]: {},
  },
  qualificationOrder: {
    [StageId.SF1]: {},
    [StageId.SF2]: {},
    [StageId.GF]: {},
  },
  lastPointsResetTimerId: null,
  isBoardTeleportAnimationRunning: false,
  shouldResetLastPointsAfterTeleport: false,
  currentRevealTelevotePoints: undefined,
  isWinnerAnimationAlreadyDisplayed: false,
  isLastSimulationAnimationFinished: true,
  splitScreenQualifierModalOpen: false,
  splitScreenQualifierCandidates: [],
  splitScreenQualifierCandidatesStageId: null,
  splitScreenQualifierCandidatesQualifiedCount: null,
  splitScreenQualifierShownCountByStage: {},
  splitScreenQualifierLastShownByStage: {},
};
