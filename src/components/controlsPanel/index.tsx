import React from 'react';

import { useCountriesStore } from '../../state/countriesStore';
import { useScoreboardStore } from '../../state/scoreboardStore';

import CountryInfo from './CountryInfo';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

const ControlsPanel = (): JSX.Element | null => {
  const { votingCountryIndex, votingPoints, isJuryVoting, winnerCountry } =
    useScoreboardStore();
  const { getCountriesLength } = useCountriesStore();

  const isVotingOver = !!winnerCountry;
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
      <div className="bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-md">
        {isJuryVoting && (
          <CountryInfo votingCountryIndex={votingCountryIndex} />
        )}
        <VotingButtons countriesLeft={countriesLeft} />
      </div>
      {isJuryVoting && <VotingPointsInfo votingPoints={votingPoints} />}
    </div>
  );
};

export default ControlsPanel;
