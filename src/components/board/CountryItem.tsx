import React, { forwardRef, useMemo, useState, useEffect } from 'react';

import { animated } from '@react-spring/web';

import { POINTS_ARRAY } from '../../data/data';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country, EventPhase } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import { useThemeColor } from '../../theme/useThemeColor';
import RoundedTriangle from '../RoundedTriangle';

import DouzePointsAnimation from './DouzePointsAnimation';
import { useDouzePointsAnimation, useVotingFinished } from './hooks';

type Props = {
  country: Country;
  index: number;
  votingCountryCode?: string;
  onClick: (countryCode: string) => void;
};

const CountryItem = forwardRef<HTMLButtonElement, Props>(
  ({ country, index, votingCountryCode, onClick }, ref) => {
    const {
      countries,
      isJuryVoting,
      winnerCountry,
      qualifiedCountries,
      eventPhase,
    } = useScoreboardStore();

    const [juryLastPointsBg, televoteLastPointsBg, televotePointsBg, pointsBg] =
      useThemeColor([
        'countryItem.juryLastPointsBg',
        'countryItem.televoteLastPointsBg',
        'countryItem.televotePointsBg',
        'countryItem.pointsBg',
      ]);
    const isVotingFinished = useVotingFinished(!!country.isVotingFinished);
    const isDouzePoints = country.lastReceivedPoints === 12;
    const showDouzePointsAnimation = useDouzePointsAnimation(isDouzePoints);

    const [showPlaceAnimation, setShowPlaceAnimation] = useState(false);

    const isVotingCountry = country.code === votingCountryCode && isJuryVoting;
    const isActive = country.code === votingCountryCode && !isJuryVoting;
    const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;

    const hasCountryFinishedVoting = useMemo(
      () =>
        countries.filter((country) => country.lastReceivedPoints !== null)
          .length === POINTS_ARRAY.length,
      [countries],
    );

    const isSemiFinalPhase =
      eventPhase === EventPhase.SEMI_FINAL_1 ||
      eventPhase === EventPhase.SEMI_FINAL_2;

    const isQualified = useMemo(
      () => qualifiedCountries.some((c) => c.code === country.code),
      [qualifiedCountries, country.code],
    );

    const isNonQualifiedInSemiFinal =
      isVotingOver && isSemiFinalPhase && !isQualified;

    const {
      springsContainer,
      springsText,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsDouzeContainer,
      springsActive,
      springsPlaceContainer,
      springsPlaceText,
    } = useAnimatePoints(
      country.lastReceivedPoints !== null && !isVotingFinished,
      isDouzePoints,
      isActive,
      isJuryVoting,
      !!country.isVotingFinished,
      showPlaceAnimation,
    );

    const isVoted = useMemo(
      () => country.lastReceivedPoints !== null || country.isVotingFinished,
      [country.lastReceivedPoints, country.isVotingFinished],
    );

    const isDisabled = useMemo(
      () =>
        (isVoted && !hasCountryFinishedVoting) ||
        isVotingCountry ||
        !isJuryVoting,
      [isVoted, hasCountryFinishedVoting, isVotingCountry, isJuryVoting],
    );

    const buttonClassName = useMemo(
      () =>
        `relative outline outline-countryItem-televoteOutline flex justify-between shadow-md lg:mb-[6px] mb-1 lg:h-10 md:h-9 xs:h-8 h-7 w-full ${
          isDisabled
            ? ''
            : 'cursor-pointer transition-colors duration-300 hover:!bg-countryItem-hoverBg'
        } ${isActive ? 'rounded-sm' : ''} ${
          showPlaceAnimation ? 'lg:ml-2 ml-1.5' : ''
        } ${
          isNonQualifiedInSemiFinal
            ? '!bg-primary-900 opacity-70'
            : 'bg-countryItem-bg'
        } 
        ${isVotingCountry ? 'opacity-70' : ''}
        text-countryItem-text`,
      [
        isDisabled,
        isActive,
        showPlaceAnimation,
        isNonQualifiedInSemiFinal,
        isVotingCountry,
      ],
    );

    const placeText = index + 1 < 10 ? `0${index + 1}` : index + 1;

    useEffect(() => {
      if (isVotingOver) {
        const timer = setTimeout(() => {
          setShowPlaceAnimation(true);
        }, 3050);

        return () => clearTimeout(timer);
      }
      setShowPlaceAnimation(false);
    }, [isVotingOver]);

    return (
      <div className="flex relative">
        {showPlaceAnimation && (
          <animated.div
            style={springsPlaceContainer}
            className={`flex items-center justify-center lg:h-10 md:h-9 xs:h-8 h-7 rounded-sm bg-countryItem-placeContainerBg text-countryItem-placeText ${
              isNonQualifiedInSemiFinal ? 'bg-primary-900 opacity-70' : ''
            }`}
          >
            <animated.h4
              style={springsPlaceText}
              className="font-semibold md:text-lg text-base"
            >
              {placeText}
            </animated.h4>
          </animated.div>
        )}

        <animated.button
          ref={ref}
          style={springsActive}
          className={buttonClassName}
          disabled={isDisabled}
          onClick={() => onClick(country.code)}
        >
          {isJuryVoting && showDouzePointsAnimation && (
            <DouzePointsAnimation
              springsDouzeContainer={springsDouzeContainer}
              springsDouzeParallelogramBlue={springsDouzeParallelogramBlue}
              springsDouzeParallelogramYellow={springsDouzeParallelogramYellow}
            />
          )}

          <div className="flex items-center">
            <img
              src={country.flag}
              alt={`${country.name} flag`}
              className="lg:w-[50px] md:w-12 xs:w-10 w-8 lg:h-10 md:h-9 xs:h-8 h-7 bg-white self-start lg:min-w-[50px] md:min-w-[48px] xs:min-w-[40px] min-w-[32px] object-cover"
            />
            <h4
              className={`uppercase text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem] xs:pr-2 pr-0 ${
                country.name.length > 10 && !isVotingOver
                  ? 'md:text-xs'
                  : 'md:text-sm'
              } md:leading-4 xs:break-normal break-all`}
            >
              {country.name}
            </h4>
          </div>
          <div className="flex h-full">
            <animated.div
              style={springsContainer}
              className={`relative z-10 h-full pr-[0.6rem] lg:w-[2.8rem] md:w-9 w-8 ${
                country.isVotingFinished
                  ? `bg-countryItem-televoteLastPointsBg`
                  : `bg-countryItem-juryLastPointsBg`
              }`}
            >
              <RoundedTriangle
                color={
                  country.isVotingFinished
                    ? televoteLastPointsBg
                    : juryLastPointsBg
                }
              />
              <animated.h6
                style={springsText}
                className="lg:text-lg md:text-sm text-xs font-semibold h-full items-center flex justify-center text-countryItem-lastPointsText"
              >
                {country.lastReceivedPoints}
              </animated.h6>
            </animated.div>
            <div
              className={`relative h-full z-20 lg:w-[2.57rem] pr-1 md:w-9 w-8 ${
                country.isVotingFinished
                  ? 'bg-countryItem-televotePointsBg'
                  : 'bg-countryItem-pointsBg'
              }`}
            >
              <RoundedTriangle
                color={country.isVotingFinished ? televotePointsBg : pointsBg}
              />
              <h6
                className={`lg:text-lg sm:text-base xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center text-countryItem-televotePointsText`}
              >
                {country.points}
              </h6>
            </div>
          </div>
        </animated.button>
      </div>
    );
  },
);

CountryItem.displayName = 'CountryItem';

export default React.memo(CountryItem);
