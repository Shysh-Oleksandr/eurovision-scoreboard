import React, { forwardRef, useEffect, useRef, useState } from 'react';

import { animated } from '@react-spring/web';

import { ANIMATION_DURATION } from '../../data';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import RoundedTriangle from '../RoundedTriangle';

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

// eslint-disable-next-line react/display-name
const CountryItem = forwardRef(
  (
    {
      country,
      hasCountryFinishedVoting,
      isActive,
      isJuryVoting,
      isVotingCountry,
      onClick,
    }: Props,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    const timerId = useRef<NodeJS.Timeout | null>(null);

    const [isVotingFinished, setIsVotingFinished] = useState(false);

    const isVoted =
      country.lastReceivedPoints !== 0 || country.isVotingFinished;
    const isDisabled =
      (isVoted && !hasCountryFinishedVoting) ||
      isVotingCountry ||
      !isJuryVoting;

    const shouldShowLastPoints = Boolean(isVoted && !isVotingFinished);

    const isDouzePoints = country.lastReceivedPoints === 12;

    const [showDouzePointsAnimation, setShowDouzePointsAnimation] =
      useState(isDouzePoints);

    const {
      springsContainer,
      springsText,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsDouzeContainer,
      springsActive,
    } = useAnimatePoints(
      shouldShowLastPoints,
      isDouzePoints,
      isActive,
      isJuryVoting,
      !!country.isVotingFinished,
    );

    useEffect(() => {
      if (country.isVotingFinished && !timerId.current) {
        timerId.current = setTimeout(() => {
          setIsVotingFinished(true);
        }, ANIMATION_DURATION);
      }

      if (!country.isVotingFinished && timerId.current) {
        clearTimeout(timerId.current);
        timerId.current = null;

        setIsVotingFinished(false);
      }
    }, [country.isVotingFinished]);

    useEffect(() => {
      if (isDouzePoints) {
        setShowDouzePointsAnimation(true);
      } else {
        setTimeout(() => {
          setShowDouzePointsAnimation(false);
        }, 1000);
      }
    }, [isDouzePoints]);

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
          <animated.div
            style={springsDouzeContainer}
            className="absolute overflow-hidden left-0 right-0 top-0 bottom-0 z-40 bg-yellow-300 flex justify-center items-center"
          >
            <h4 className="text-pink-500 lg:text-xl md:text-lg xs:text-base text-sm font-bold">
              12 POINTS
            </h4>
            <animated.div
              style={springsDouzeParallelogramBlue}
              className="absolute h-full w-[25%] bg-blue-700 z-50"
            />
            <animated.div
              style={springsDouzeParallelogramYellow}
              className="absolute -translate-x-28 h-full w-[25%] bg-pink-500 z-50"
            />
          </animated.div>
        )}
        <div className="flex items-center">
          <img
            src={country.flag}
            alt={`${country.name} flag`}
            className="lg:w-14 md:w-12 xs:w-10 w-8 lg:h-10 md:h-9 xs:h-8 h-7 bg-white self-start min-w-[36px]"
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

export default CountryItem;
