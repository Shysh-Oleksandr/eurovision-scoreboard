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
import { ScoreboardMobileLayout, useGeneralStore } from '@/state/generalStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const FLIP_SPRING = { damping: 5, stiffness: 25, overshootClamping: true };

const Board = (): JSX.Element => {
  // This is needed to trigger a re-render of the board when the event stages change(usually when giving points)
  useScoreboardStore((state) => state.eventStages);

  const scoreboardMobileLayout = useGeneralStore(
    (state) => state.presentationSettings.scoreboardMobileLayout,
  );

  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);
  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const isLastSimulationAnimationFinished = useScoreboardStore(
    (state) => state.isLastSimulationAnimationFinished,
  );
  const { boardAnimationMode: defaultBoardAnimationMode } = useThemeSpecifics();

  const { isOver: isVotingOver, id: currentStageId } = getCurrentStage() || {};

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

  const boardItemAnimationMode = useMemo(() => {
    if (winnerCountry && isLastSimulationAnimationFinished) {
      return 'flip';
    }

    return defaultBoardAnimationMode;
  }, [
    winnerCountry,
    isLastSimulationAnimationFinished,
    defaultBoardAnimationMode,
  ]);

  const {
    delayedSortedCountries,
    finalCountries,
    showPlace,
    flipKey,
    containerRef,
    getCountryAnimationClassName,
    shouldUseFlipAnimationForCountry,
  } = useBoardAnimations(
    sortedCountries,
    wasTheFirstPointsAwarded,
    isDouzePointsAwarded,
    boardItemAnimationMode,
  );

  const renderItem = useCallback(
    (country: Country) => {
      const itemIndex = delayedSortedCountries.findIndex(
        (c) => c.code === country.code,
      );
      const boardAnimationClassName = getCountryAnimationClassName(
        country.code,
      );

      return (
        <Flipped
          key={country.code}
          flipId={country.code}
          shouldFlip={() => shouldUseFlipAnimationForCountry(country.code)}
        >
          {(props) => (
            <CountryItem
              country={country}
              votingCountryCode={votingCountry?.code}
              onClick={onClick}
              index={itemIndex}
              {...props}
              showPlaceAnimation={showPlace}
              hasCountryFinishedVoting={!!hasCountryFinishedVoting}
              boardAnimationClassName={boardAnimationClassName}
            />
          )}
        </Flipped>
      );
    },
    [
      votingCountry?.code,
      onClick,
      showPlace,
      delayedSortedCountries,
      hasCountryFinishedVoting,
      getCountryAnimationClassName,
      shouldUseFlipAnimationForCountry,
    ],
  );

  return (
    <div className="w-full h-full">
      <BoardHeader />
      <div
        ref={containerRef}
        className={`container-wrapping-flipper will-change-all ${
          scoreboardMobileLayout === ScoreboardMobileLayout.TWO_COLUMN
            ? 'two-column'
            : ''
        } ${
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
