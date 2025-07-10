import React, { useCallback, type JSX } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

import { animated, type AnimatedProps } from '@react-spring/web';

import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import CountryItem from '../countryItem/CountryItem';

import BoardHeader from './BoardHeader';
import { useBoardAnimations } from './hooks/useBoardAnimations';
import { useCountryDisplay } from './hooks/useCountryDisplay';
import { useCountrySorter } from './hooks/useCountrySorter';
import { useVoting } from './hooks/useVoting';

const AnimatedDiv = animated.div as React.FC<
  AnimatedProps<
    { style?: React.CSSProperties } & React.HTMLAttributes<HTMLDivElement>
  >
>;

const Board = (): JSX.Element => {
  const { getCurrentStage, restartCounter } = useScoreboardStore();

  const { isOver: isVotingOver, id: currentStageId } = getCurrentStage();

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

  const { showAllParticipants } = useScoreboardStore();

  return (
    <div className={`${isVotingOver ? '' : 'md:w-2/3'} w-full h-full`}>
      <BoardHeader onClick={onClick} />
      <AnimatedDiv
        style={containerAnimation}
        className={`container-wrapping-flipper ${
          showAllParticipants ? 'show-all-participants' : ''
        }`}
      >
        <Flipper
          key={`${currentStageId}-${restartCounter}-${showAllParticipants}`}
          flipKey={flipKey}
          spring={{ damping: 5, stiffness: 25, overshootClamping: true }}
        >
          {finalCountries.map(renderItem)}
        </Flipper>
      </AnimatedDiv>
    </div>
  );
};

export default React.memo(Board);
