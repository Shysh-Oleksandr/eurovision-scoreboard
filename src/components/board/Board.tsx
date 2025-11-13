'use client';
import React, { useCallback, useMemo, type JSX } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import CountryItem from '../countryItem/CountryItem';

import BoardHeader from './BoardHeader';
import { useBoardAnimations } from './hooks/useBoardAnimations';
import { useCountryDisplay } from './hooks/useCountryDisplay';
import { useCountrySorter } from './hooks/useCountrySorter';
import { useVoting } from './hooks/useVoting';

import { MIN_COUNTRIES_FOR_3_COLUMNS } from '@/hooks/useReorderCountries';

const FLIP_SPRING = { damping: 5, stiffness: 25, overshootClamping: true };

const Board = (): JSX.Element => {
  // This is needed to trigger a re-render of the board when the event stages change(usually when giving points)
  useScoreboardStore((state) => state.eventStages);

  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
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

  const isDouzePointsAwarded = useMemo(() => {
    return sortedCountries.some((country) => country.showDouzePointsAnimation);
  }, [sortedCountries]);

  const {
    delayedSortedCountries,
    finalCountries,
    showPlace,
    flipKey,
    containerRef,
  } = useBoardAnimations(
    sortedCountries,
    wasTheFirstPointsAwarded,
    isDouzePointsAwarded,
  );

  const renderItem = useCallback(
    (country: Country) => (
      <Flipped key={country.code} flipId={country.code}>
        {(props) => (
          <CountryItem
            country={country}
            votingCountryCode={votingCountry?.code}
            onClick={onClick}
            index={delayedSortedCountries.findIndex(
              (c) => c.code === country.code,
            )}
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
      delayedSortedCountries,
      hasCountryFinishedVoting,
    ],
  );

  return (
    <div className="w-full h-full">
      <BoardHeader />
      <div
        ref={containerRef}
        className={`container-wrapping-flipper will-change-all ${
          isVotingOver && finalCountries.length >= MIN_COUNTRIES_FOR_3_COLUMNS
            ? 'is-over'
            : ''
        }`}
      >
        <Flipper
          key={`${currentStageId}-${showAllParticipants}`}
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
