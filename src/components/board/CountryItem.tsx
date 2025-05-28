import React, { forwardRef, useMemo } from 'react';

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
  onClick: (countryCode: string) => void;
};

const CountryItem = forwardRef<HTMLButtonElement, Props>(
  (
    {
      country,
      hasCountryFinishedVoting,
      isActive,
      isJuryVoting,
      isVotingCountry,
      onClick,
    },
    ref,
  ) => {
    const [lastPointsBg, televotePointsBg, pointsBg] = useThemeColor([
      'countryItem.lastPointsBg',
      'countryItem.televotePointsBg',
      'countryItem.pointsBg',
    ]);
    const isVotingFinished = useVotingFinished(!!country.isVotingFinished);
    const isDouzePoints = country.lastReceivedPoints === 12;
    const showDouzePointsAnimation = useDouzePointsAnimation(isDouzePoints);

    const {
      springsContainer,
      springsText,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsDouzeContainer,
      springsActive,
    } = useAnimatePoints(
      country.lastReceivedPoints !== null && !isVotingFinished,
      isDouzePoints,
      isActive,
      isJuryVoting,
      !!country.isVotingFinished,
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
        } ${
          isActive ? 'rounded-sm' : ''
        } bg-countryItem-bg text-countryItem-text`,
      [isDisabled, isActive],
    );

    return (
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
          <h4 className="uppercase text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] xs:pr-2 pr-0 sm:text-base md:leading-4 xs:text-[13px] text-xs xs:break-normal break-all">
            {country.name}
          </h4>
        </div>
        <div className="flex h-full">
          <animated.div
            style={springsContainer}
            className="relative z-10 h-full pr-[0.6rem] lg:w-[2.8rem] md:w-9 w-8 bg-countryItem-lastPointsBg"
          >
            <RoundedTriangle color={lastPointsBg} />
            <animated.h6
              style={springsText}
              className="lg:text-lg sm:text-base xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center text-countryItem-lastPointsText"
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
            <h6 className="lg:text-lg sm:text-base xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center text-countryItem-televoteText">
              {country.points}
            </h6>
          </div>
        </div>
      </animated.button>
    );
  },
);

CountryItem.displayName = 'CountryItem';

export default React.memo(CountryItem);
