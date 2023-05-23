import React, { forwardRef, useEffect, useRef, useState } from 'react';

import { animated } from '@react-spring/web';

import { ANIMATION_DURATION } from '../../data';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import RoundedTriangle from '../RoundedTriangle';

const PINK_COLOR = '#ec4899';
const BLUE_COLOR = '#2563eb';
const YELLOW_COLOR = '#fde047';

type Props = {
  country: Country;
  isJuryVoting: boolean;
  hasCountryFinishedVoting: boolean;
  isActive: boolean;
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
      onClick,
    }: Props,
    ref: React.ForwardedRef<HTMLButtonElement>,
  ) => {
    const timerId = useRef<NodeJS.Timeout | null>(null);

    const [isVotingFinished, setIsVotingFinished] = useState(false);

    const isVoted =
      country.lastReceivedPoints !== 0 || country.isVotingFinished;
    const isDisabled = (isVoted && !hasCountryFinishedVoting) || !isJuryVoting;

    const shouldShowLastPoints = Boolean(isVoted && !isVotingFinished);

    const { springsContainer, springsText } =
      useAnimatePoints(shouldShowLastPoints);

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

    return (
      <button
        ref={ref}
        className={`flex justify-between shadow-md  lg:mb-[6px] mb-1 lg:h-10 md:h-9 h-8 w-full ${
          isDisabled
            ? ''
            : 'cursor-pointer transition-colors duration-300 hover:bg-sky-100'
        } ${country.isVotingFinished ? 'bg-blue-900' : 'bg-white'} ${
          isActive
            ? 'outline outline-2 outline-blue-500 rounded-sm !bg-blue-700'
            : ''
        }`}
        disabled={isDisabled}
        onClick={() => onClick(country.code)}
      >
        <div className="flex items-center">
          <img
            src={country.flag}
            alt={`${country.name} flag`}
            className="lg:w-14 md:w-12 w-10 lg:h-10 md:h-9 h-8 bg-white self-start"
          />
          <h4
            className={`uppercase text-left ml-1 font-bold xl:text-lg lg:text-[1.05rem] pr-2 sm:text-base md:leading-4 text-[13px] ${
              country.isVotingFinished || isActive
                ? 'text-white'
                : 'text-blue-950'
            }`}
          >
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
              className="text-pink-500 lg:text-lg sm:text-base text-[13px] font-semibold h-full items-center flex justify-center"
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
            <h6 className="text-white lg:text-lg sm:text-base text-[13px] font-semibold h-full items-center flex justify-center">
              {country.points}
            </h6>
          </div>
        </div>
      </button>
    );
  },
);

export default CountryItem;
