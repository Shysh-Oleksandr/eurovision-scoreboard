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
  const votingPoints = useScoreboardStore((state) => state.votingPoints);
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
    <div className="mb-[6px] md:min-w-[180px] w-full md:max-w-[240px] lg:max-w-[258px] xl:max-w-[335px]">
      <div className="md:pb-2 pb-1 md:h-12 flex items-center">
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
