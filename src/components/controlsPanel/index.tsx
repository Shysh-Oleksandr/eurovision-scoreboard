import React from 'react';

import { getCountriesLength } from '../../data/data';
import { Country, ScoreboardAction } from '../../models';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

type Props = {
  countries: Country[];
  votingCountryIndex: number;
  votingPoints: number;
  isJuryVoting: boolean;
  shouldShowLastPoints: boolean;
  shouldClearPoints: boolean;
  isVotingOver: boolean;
  dispatch: React.Dispatch<ScoreboardAction>;
};

const ControlsPanel = ({
  countries,
  votingCountryIndex,
  votingPoints,
  isJuryVoting,
  shouldShowLastPoints,
  shouldClearPoints,
  isVotingOver,
  dispatch,
}: Props): JSX.Element | null => {
  const countriesLeft = getCountriesLength() - votingCountryIndex;

  if (isVotingOver) {
    return null;
  }

  return (
    <div className="flex-1 mb-[6px] md:pt-1 pt-4">
      <div className="md:pb-3 pb-1">
        <h3 className="lg:text-2xl text-xl text-white">
          {isJuryVoting ? 'Jury voting' : 'Televote'}
        </h3>
      </div>
      {isJuryVoting && <CountryInfo votingCountryIndex={votingCountryIndex} />}
      <VotingButtons
        dispatch={dispatch}
        countries={countries}
        shouldShowLastPoints={shouldShowLastPoints}
        countriesLeft={countriesLeft}
        isJuryVoting={isJuryVoting}
        votingCountryIndex={votingCountryIndex}
        shouldClearPoints={shouldClearPoints}
      />
      {isJuryVoting && <VotingPointsInfo votingPoints={votingPoints} />}
    </div>
  );
};

export default ControlsPanel;
