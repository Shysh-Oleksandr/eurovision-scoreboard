import React from 'react';

import { EventPhase } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';

import CountryInfo from './CountryInfo';
import PresenterSettings from './PresenterSettings';
import VotingButtons from './VotingButtons';
import VotingPointsInfo from './VotingPointsInfo';

const ControlsPanel = (): JSX.Element | null => {
  const {
    votingCountryIndex,
    votingPoints,
    isJuryVoting,
    winnerCountry,
    eventPhase,
    qualifiedCountries,
    presenterSettings,
  } = useScoreboardStore();

  const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;
  const isSemiFinal =
    eventPhase === EventPhase.SEMI_FINAL_1 ||
    eventPhase === EventPhase.SEMI_FINAL_2;

  // In semi-finals, we only have televote (no jury voting)
  const showJuryVoting = !isSemiFinal && isJuryVoting;

  // Show voting points info during jury voting or during presenter mode jury phase
  const showVotingPointsInfo =
    showJuryVoting || (presenterSettings.isAutoPlaying && isJuryVoting);

  if (isVotingOver) {
    return null;
  }

  const votingTitle = !isSemiFinal && isJuryVoting ? 'Jury voting' : 'Televote';

  return (
    <div className="flex-1 mb-[6px] md:pt-1 pt-4">
      <div className="md:pb-3 pb-1">
        <h3 className="lg:text-2xl text-xl text-white">{votingTitle}</h3>
      </div>
      <div className="bg-gradient-to-tr from-[30%] from-primary-950 to-primary-900 rounded-md">
        {showJuryVoting && (
          <CountryInfo votingCountryIndex={votingCountryIndex} />
        )}
        <VotingButtons />
      </div>
      {showVotingPointsInfo && <VotingPointsInfo votingPoints={votingPoints} />}
      <PresenterSettings />
    </div>
  );
};

export default ControlsPanel;
