import React, { useCallback } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

import { animated } from '@react-spring/web';

import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';

import BoardHeader from './BoardHeader';
import CountryItem from './CountryItem';
import { useBoardAnimations } from './hooks/useBoardAnimations';
import { useCountryDisplay } from './hooks/useCountryDisplay';
import { useCountrySorter } from './hooks/useCountrySorter';
import { useVoting } from './hooks/useVoting';

const Board = (): JSX.Element => {
  const { winnerCountry, qualifiedCountries, eventPhase, restartCounter } =
    useScoreboardStore();

  const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;

  const allCountriesToDisplay = useCountryDisplay();
  const sortedCountries = useCountrySorter(allCountriesToDisplay);
  const {
    votingCountry,
    wasTheFirstPointsAwarded,
    hasCountryFinishedVoting,
    onClick,
  } = useVoting();

  const { finalCountries, showPlace, flipKey, containerAnimation } =
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
          />
        )}
      </Flipped>
    ),
    [votingCountry?.code, onClick, showPlace, sortedCountries],
  );

  const { showAllParticipants } = useScoreboardStore();

  return (
    <div className={`${isVotingOver ? '' : 'md:w-2/3'} w-full h-full`}>
      <BoardHeader onClick={onClick} />
      <animated.div
        style={containerAnimation}
        className={`container-wrapping-flipper ${
          showAllParticipants ? 'show-all-participants' : ''
        }`}
      >
        <Flipper
          key={`${eventPhase}-${restartCounter}-${showAllParticipants}`}
          flipKey={flipKey}
          spring={{ damping: 5, stiffness: 25, overshootClamping: true }}
        >
          {finalCountries.map(renderItem)}
        </Flipper>
      </animated.div>
    </div>
  );
};

export default React.memo(Board);
