import React, { forwardRef, useMemo } from 'react';

import { animated } from '@react-spring/web';

import { POINTS_ARRAY } from '../../data/data';
import { getFlagPath } from '../../helpers/getFlagPath';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country, EventPhase } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import RoundedTriangle from '../RoundedTriangle';

import CountryPlaceNumber from './CountryPlaceNumber';
import DouzePointsAnimation from './DouzePointsAnimation';
import { useCountryItemColors } from './hooks/useCountryItemColors';
import useDouzePointsAnimation from './hooks/useDouzePointsAnimation';
import useVotingFinished from './hooks/useVotingFinished';

type Props = {
  country: Country;
  index: number;
  votingCountryCode?: string;
  onClick: (countryCode: string) => void;
  showPlaceAnimation: boolean;
};

const CountryItem = forwardRef<HTMLButtonElement, Props>(
  (
    {
      country,
      index,
      votingCountryCode,
      onClick,
      showPlaceAnimation,
      ...props
    },
    ref,
  ) => {
    const {
      countries,
      isJuryVoting,
      winnerCountry,
      qualifiedCountries,
      eventPhase,
      showAllParticipants,
    } = useScoreboardStore();

    const isVotingFinished = useVotingFinished(!!country.isVotingFinished);
    const isDouzePoints = country.lastReceivedPoints === 12;
    const showDouzePointsAnimationHook = useDouzePointsAnimation(isDouzePoints);

    const isVotingCountry = country.code === votingCountryCode && isJuryVoting;
    const isActive = country.code === votingCountryCode && !isJuryVoting;
    const isVotingOver = !!winnerCountry || qualifiedCountries.length > 0;

    const {
      pointsBgColor,
      pointsTextColor,
      lastPointsBgColor,
      lastPointsTextColor,
    } = useCountryItemColors({
      isJuryVoting,
      isCountryVotingFinished: !!country.isVotingFinished,
      isActive,
    });

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

    const isNonQualifiedInAllParticipantsMode =
      showAllParticipants &&
      winnerCountry &&
      !country.isQualifiedFromSemi &&
      !country.isAutoQualified;

    const shouldShowAsNonQualified = Boolean(
      isNonQualifiedInSemiFinal || isNonQualifiedInAllParticipantsMode,
    );

    const {
      springsLastPointsContainer,
      springsLastPointsText,
      springsDouzeParallelogramBlue,
      springsDouzeParallelogramYellow,
      springsDouzeContainer,
      springsPoints,
    } = useAnimatePoints({
      shouldShowLastPoints:
        country.lastReceivedPoints !== null && !isVotingFinished,
      isDouzePoints,
      isActive,
      isJuryVoting,
      isCountryVotingFinished: !!country.isVotingFinished,
      isVotingOver,
    });

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
            : 'cursor-pointer transition-colors duration-[400ms] hover:!bg-countryItem-juryHoverBg'
        } ${isActive ? 'rounded-sm' : ''} ${
          showPlaceAnimation ? 'lg:ml-2 ml-1.5' : ''
        } ${
          shouldShowAsNonQualified
            ? `!bg-countryItem-unqualifiedBg opacity-70 ${
                showPlaceAnimation ? '!opacity-70' : ''
              }`
            : ''
        } 
        ${isVotingCountry ? 'opacity-70' : ''}
        `,
      [
        isDisabled,
        isActive,
        showPlaceAnimation,
        shouldShowAsNonQualified,
        isVotingCountry,
      ],
    );

    return (
      <div className="flex relative" {...props}>
        <CountryPlaceNumber
          shouldShowAsNonQualified={shouldShowAsNonQualified}
          index={index}
          showPlaceAnimation={showPlaceAnimation}
        />

        <animated.button
          ref={ref}
          style={springsPoints}
          className={buttonClassName}
          disabled={isDisabled}
          onClick={() => onClick(country.code)}
        >
          {isJuryVoting && showDouzePointsAnimationHook && (
            <DouzePointsAnimation
              springsDouzeContainer={springsDouzeContainer}
              springsDouzeParallelogramBlue={springsDouzeParallelogramBlue}
              springsDouzeParallelogramYellow={springsDouzeParallelogramYellow}
            />
          )}

          <div className="flex items-center">
            <img
              loading="lazy"
              src={getFlagPath(country)}
              onError={(e) => {
                e.currentTarget.src = getFlagPath('ww');
              }}
              alt={`${country.name} flag`}
              className="lg:w-[50px] md:w-12 xs:w-10 w-8 lg:h-10 md:h-9 xs:h-8 h-7 bg-countryItem-juryBg self-start lg:min-w-[50px] md:min-w-[48px] xs:min-w-[40px] min-w-[32px] object-cover"
            />
            <h4
              className={`uppercase text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem] xs:pr-2 pr-0 ${
                country.name.length > 10 && !isVotingOver
                  ? 'md:text-xs'
                  : 'md:text-sm'
              } md:!leading-5 xs:break-normal break-all`}
            >
              {country.name}
            </h4>
          </div>
          <div className="flex h-full">
            {/* Last points */}
            <animated.div
              style={{
                ...springsLastPointsContainer,
                backgroundColor: lastPointsBgColor,
              }}
              className={`relative z-10 h-full pr-[0.6rem] lg:w-[2.8rem] md:w-9 w-8`}
            >
              <RoundedTriangle color={lastPointsBgColor} />
              <animated.h6
                style={{
                  ...springsLastPointsText,
                  color: lastPointsTextColor,
                }}
                className="lg:text-lg md:text-sm text-xs font-semibold h-full items-center flex justify-center"
              >
                {country.lastReceivedPoints}
              </animated.h6>
            </animated.div>

            {/* Points */}
            <div
              className={`relative h-full z-20 lg:w-[2.57rem] pr-1 md:w-9 w-8`}
              style={{
                backgroundColor: pointsBgColor,
              }}
            >
              <RoundedTriangle color={pointsBgColor} />
              <h6
                className={`lg:text-lg sm:text-[0.85rem] xs:text-[13px] text-xs font-semibold h-full items-center flex justify-center`}
                style={{
                  color: pointsTextColor,
                }}
              >
                {country.points === -1 ? 'NQ' : country.points}
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
