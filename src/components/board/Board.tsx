import React, { useCallback, type JSX } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import CountryItem from '../countryItem/CountryItem';

import BoardHeader from './BoardHeader';
import { useBoardAnimations } from './hooks/useBoardAnimations';
import { useCountryDisplay } from './hooks/useCountryDisplay';
import { useCountrySorter } from './hooks/useCountrySorter';
import { useVoting } from './hooks/useVoting';

const FLIP_SPRING = { damping: 5, stiffness: 25, overshootClamping: true };

const Board = (): JSX.Element => {
  // This is needed to trigger a re-render of the board when the event stages change(usually when giving points)
  useScoreboardStore((state) => state.eventStages);

  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const restartCounter = useScoreboardStore((state) => state.restartCounter);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );

  const { isOver: isVotingOver, id: currentStageId } = getCurrentStage();

  const allCountriesToDisplay = useCountryDisplay();
  const sortedCountries = useCountrySorter(allCountriesToDisplay);
  const {
    votingCountry,
    wasTheFirstPointsAwarded,
    hasCountryFinishedVoting,
    onClick,
  } = useVoting();

  const { finalCountries, showPlace, flipKey, containerRef } =
    useBoardAnimations(
      sortedCountries,
      isVotingOver,
      wasTheFirstPointsAwarded,
      hasCountryFinishedVoting,
    );

  const renderItem = useCallback(
    (country: Country) => (
      <Flipped key={country.code} flipId={country.code}>
        {(props) => (
          <CountryItem
            country={country}
            votingCountryCode={votingCountry?.code}
            onClick={onClick}
            index={sortedCountries.findIndex((c) => c.code === country.code)}
            {...props}
            showPlaceAnimation={showPlace}
            hasCountryFinishedVoting={hasCountryFinishedVoting}
          />
        )}
      </Flipped>
    ),
    [
      votingCountry?.code,
      onClick,
      showPlace,
      sortedCountries,
      hasCountryFinishedVoting,
    ],
  );

  return (
    <div className={`${isVotingOver ? '' : 'md:w-2/3'} w-full h-full`}>
      <BoardHeader onClick={onClick} />
      <div
        ref={containerRef}
        className={`container-wrapping-flipper will-change-all ${
          showAllParticipants ? 'show-all-participants' : ''
        }`}
      >
        <Flipper
          key={`${currentStageId}-${restartCounter}-${showAllParticipants}`}
          flipKey={flipKey}
          spring={FLIP_SPRING}
        >
          {finalCountries.map(renderItem)}
        </Flipper>
      </div>
    </div>
  );
};

export default React.memo(Board);
