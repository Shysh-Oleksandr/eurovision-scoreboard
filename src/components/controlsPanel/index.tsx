import React from 'react';

import { ScoreboardAction } from '../../models';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

type Props = {
  votingCountryIndex: number;
  votingPoints: number;
  isJuryVoting: boolean;
  shouldShowLastPoints: boolean;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const ControlsPanel = ({
  votingCountryIndex,
  votingPoints,
  isJuryVoting,
  shouldShowLastPoints,
  dispatch,
}: Props): JSX.Element => {
  return (
    <div className="flex-1 mb-[6px]">
      <div className="pb-2">
        <h3 className="text-2xl text-white">
          {isJuryVoting ? 'Jury voting' : 'Televote'}
        </h3>
      </div>
      {isJuryVoting && <CountryInfo votingCountryIndex={votingCountryIndex} />}
      <VotingButtons
        dispatch={dispatch}
        shouldShowLastPoints={shouldShowLastPoints}
      />
      <VotingPointsInfo votingPoints={votingPoints} />
    </div>
  );
};

export default ControlsPanel;
