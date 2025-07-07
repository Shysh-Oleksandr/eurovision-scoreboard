import React from 'react';

import { StageVotingMode } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

const ControlsPanel = (): JSX.Element | null => {
  const { votingCountryIndex, votingPoints, getCurrentStage } =
    useScoreboardStore();

  const { isJuryVoting, isOver: isVotingOver, votingMode } = getCurrentStage();

  if (isVotingOver) {
    return null;
  }

  let votingTitle = 'Televote';

  if (votingMode === StageVotingMode.COMBINED) {
    votingTitle = 'Voting';
  } else if (isJuryVoting) {
    votingTitle = 'Jury voting';
  }

  return (
    <div className="flex-1 mb-[6px] md:pt-1 pt-4">
      <div className="md:pb-3 pb-1">
        <h3 className="lg:text-2xl text-xl text-white">{votingTitle}</h3>
      </div>
      <div className="bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-md">
        {isJuryVoting && (
          <CountryInfo votingCountryIndex={votingCountryIndex} />
        )}
        <VotingButtons />
      </div>
      {isJuryVoting && <VotingPointsInfo votingPoints={votingPoints} />}
    </div>
  );
};

export default ControlsPanel;
