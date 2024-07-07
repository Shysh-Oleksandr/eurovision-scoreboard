import React, { forwardRef } from 'react';

import { animated } from '@react-spring/web';

import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import RoundedTriangle from '../RoundedTriangle';

import DouzePointsAnimation from './DouzePointsAnimation';
import { useVotingFinished, useDouzePointsAnimation } from './hooks';

const PINK_COLOR = '#fd0184';
const BLUE_COLOR = '#0041fd';
const YELLOW_COLOR = '#fef700';

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
      country.lastReceivedPoints !== 0 && !isVotingFinished,
      isDouzePoints,
      isActive,
      isJuryVoting,
      !!country.isVotingFinished,
    );

    const isVoted =
      country.lastReceivedPoints !== 0 || country.isVotingFinished;
    const isDisabled =
      (isVoted && !hasCountryFinishedVoting) ||
      isVotingCountry ||
      !isJuryVoting;

    return (
      <animated.button
        ref={ref}
        style={springsActive}
        className={`relative bg-white outline outline-blue-500 flex justify-between shadow-md lg:mb-[6px] mb-1 lg:h-10 md:h-9 xs:h-8 h-7 w-full ${
          isDisabled
            ? ''
            : 'cursor-pointer transition-colors duration-300 hover:bg-sky-100'
        } ${isActive ? 'rounded-sm' : ''}`}
        disabled={isDisabled}
        onClick={() => onClick(country.code)}
      >
        {showDouzePointsAnimation && (
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
          <h4 className="uppercase text-left ml-1 font-bold xl:text-lg lg:text-[1.05rem] xs:pr-2 pr-0 sm:text-base md:leading-4 xs:text-[13px] text-xs xs:break-normal break-all">
            {country.name}
          </h4>
        </div>
        <div className="flex h-full">
          <animated.div
            className="bg-yellow-300 relative z-10 h-full pr-[0.6rem] lg:w-[2.8rem] md:w-9 w-8"
            style={springsContainer}
          >
            <RoundedTriangle color={YELLOW_COLOR} />
            <animated.h6
              className="text-pink-500 lg:text-lg sm:text-base xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center"
              style={springsText}
            >
              {country.lastReceivedPoints}
            </animated.h6>
          </animated.div>
          <div
            className={`relative h-full z-20 lg:w-[2.57rem] pr-1 md:w-9 w-8 ${
              country.isVotingFinished ? 'bg-blue-600' : 'bg-pink-500'
            }`}
          >
            <RoundedTriangle
              color={country.isVotingFinished ? BLUE_COLOR : PINK_COLOR}
            />
            <h6 className="text-white lg:text-lg sm:text-base xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center">
              {country.points}
            </h6>
          </div>
        </div>
      </animated.button>
    );
  },
);

CountryItem.displayName = 'CountryItem';

export default CountryItem;
