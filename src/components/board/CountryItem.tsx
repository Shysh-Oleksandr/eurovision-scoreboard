import React, { forwardRef, useMemo, useState, useEffect } from 'react';

import { animated } from '@react-spring/web';

import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import { useThemeColor } from '../../theme/useThemeColor';
import RoundedTriangle from '../RoundedTriangle';

import DouzePointsAnimation from './DouzePointsAnimation';
import { useDouzePointsAnimation, useVotingFinished } from './hooks';

type Props = {
  country: Country;
  isJuryVoting: boolean;
  hasCountryFinishedVoting: boolean;
  isActive: boolean;
  isVotingCountry: boolean;
  index: number;
  onClick: (countryCode: string) => void;
  isVotingOver: boolean;
};

const CountryItem = forwardRef<HTMLButtonElement, Props>(
  (
    {
      country,
      hasCountryFinishedVoting,
      isActive,
      isJuryVoting,
      isVotingCountry,
      index,
      onClick,
      isVotingOver,
    },
    ref,
  ) => {
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

    useEffect(() => {
      if (isVotingOver) {
        const timer = setTimeout(() => {
          setShowPlaceAnimation(true);
        }, 3050);

        return () => clearTimeout(timer);
      }
      setShowPlaceAnimation(false);
    }, [isVotingOver]);

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

    const handleClick = useMemo(
      () => () => onClick(country.code),
      [onClick, country.code],
    );

    const buttonClassName = useMemo(
      () =>
        `relative outline outline-countryItem-televoteOutline flex justify-between shadow-md lg:mb-[6px] mb-1 lg:h-10 md:h-9 xs:h-8 h-7 w-full ${
          isDisabled
            ? ''
            : 'cursor-pointer transition-colors duration-300 hover:!bg-countryItem-hoverBg'
        } ${isActive ? 'rounded-sm' : ''} ${
          showPlaceAnimation ? 'ml-2' : ''
        } bg-countryItem-bg text-countryItem-text`,
      [isDisabled, isActive, showPlaceAnimation],
    );

    return (
      <div className="flex relative">
        {showPlaceAnimation && (
          <animated.div
            style={springsPlaceContainer}
            className="flex items-center justify-center h-10 rounded-sm bg-countryItem-placeContainerBg text-countryItem-placeText"
          >
            <animated.h4
              style={springsPlaceText}
              className="font-semibold text-lg"
            >
              {index + 1 < 10 ? `0${index + 1}` : index + 1}
            </animated.h4>
          </animated.div>
        )}

        <animated.button
          ref={ref}
          style={springsActive}
          className={buttonClassName}
          disabled={isDisabled}
          onClick={handleClick}
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
              className="lg:w-[50px] md:w-12 xs:w-10 w-8 lg:h-10 md:h-9 xs:h-8 h-7 bg-white self-start lg:min-w-[50px] md:min-w-[48px] xs:min-w-[40px] min-w-[32px]"
            />
            <h4
              className={`uppercase text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] xs:pr-2 pr-0 ${
                country.name.length > 10 && !isVotingOver
                  ? 'md:text-xs'
                  : 'md:text-sm'
              } md:leading-4 text-base xs:break-normal break-all`}
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
