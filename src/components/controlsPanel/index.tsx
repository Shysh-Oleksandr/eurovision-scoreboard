import React from 'react';

import { ScoreboardAction } from '../../models';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

type Props = {
  votingCountryIndex: number;
  votingPoints: number;
  isJuryVoting: boolean;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const ControlsPanel = ({
  votingCountryIndex,
  votingPoints,
  isJuryVoting,
  dispatch,
}: Props): JSX.Element => {
  return (
    <div className="flex-1 mb-[6px]">
      {isJuryVoting && <CountryInfo votingCountryIndex={votingCountryIndex} />}
      <VotingButtons dispatch={dispatch} />
      <VotingPointsInfo votingPoints={votingPoints} />
    </div>
  );
};

export default ControlsPanel;
