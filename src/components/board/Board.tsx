'use client';
import React, { useCallback, useMemo, type JSX } from 'react';
import { Flipped, Flipper } from 'react-flip-toolkit';

import { useShallow } from 'zustand/shallow';

import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import CountryItem from '../countryItem/CountryItem';

import { useBoardAnimations } from './hooks/useBoardAnimations';
import { useCountryDisplay } from './hooks/useCountryDisplay';
import { useCountrySorter } from './hooks/useCountrySorter';
import { useVoting } from './hooks/useVoting';

import { MIN_COUNTRIES_FOR_3_COLUMNS } from '@/hooks/useReorderCountries';
import { ScoreboardMobileLayout, useGeneralStore } from '@/state/generalStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

const FLIP_SPRING = { damping: 5, stiffness: 25, overshootClamping: true };

const Board = (): JSX.Element => {
  const scoreboardMobileLayout = useGeneralStore(
    (state) => state.presentationSettings.scoreboardMobileLayout,
  );

  const showAllParticipants = useScoreboardStore(
    (state) => state.showAllParticipants,
  );
  const winnerCountry = useScoreboardStore((state) => state.winnerCountry);
  const isLastSimulationAnimationFinished = useScoreboardStore(
    (state) => state.isLastSimulationAnimationFinished,
  );
  const themeYear = useGeneralStore((state) => state.themeYear);
  const customThemeId = useGeneralStore(
    (state) => state.customTheme?._id ?? '',
  );
  const {
    boardAnimationMode: defaultBoardAnimationMode,
    roundedCountryContainer,
    pointsContainerShape,
  } = useThemeSpecifics();

  const countryItemLayoutKey = `${themeYear}:${customThemeId}:${roundedCountryContainer}:${pointsContainerShape}`;

  const { isVotingOver, currentStageId } = useScoreboardStore(
    useShallow((state) => {
      const currentStage = state.getCurrentStage();

      return {
        isVotingOver: currentStage?.isOver,
        currentStageId: currentStage?.id,
      };
    }),
  );

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
    getItemRef,
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
              rootRef={getItemRef(country.code)}
              themeLayoutKey={countryItemLayoutKey}
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
      getItemRef,
      shouldUseFlipAnimationForCountry,
      countryItemLayoutKey,
    ],
  );

  return (
    <div className="w-full h-full">
      <div
        ref={containerRef}
        className={`container-wrapping-flipper ${
          roundedCountryContainer ? 'rounded-design' : ''
        } will-change-all ${
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
          className={roundedCountryContainer ? 'gap-y-[1px]' : ''}
        >
          {finalCountries.map(renderItem)}
        </Flipper>
      </div>
    </div>
  );
};

export default React.memo(Board);
