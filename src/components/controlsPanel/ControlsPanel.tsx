import React, { type JSX } from 'react';

import { StageVotingMode } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

const ControlsPanel = (): JSX.Element | null => {
  const votingCountryIndex = useScoreboardStore(
    (state) => state.votingCountryIndex,
  );
  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

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
    <div className="w-full">
      <div className="md:pb-2 pb-1 md:h-12 md:flex items-center hidden">
        <h3
          className="lg:text-2xl text-xl text-white"
          style={{ textShadow: '0 0 10px rgba(0, 0, 0, 0.2)' }}
        >
          {votingTitle}
        </h3>
      </div>
      <div className="bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-md">
        {isJuryVoting && (
          <CountryInfo votingCountryIndex={votingCountryIndex} />
        )}
        <VotingButtons />
      </div>
      {isJuryVoting && <VotingPointsInfo />}
    </div>
  );
};

export default ControlsPanel;
