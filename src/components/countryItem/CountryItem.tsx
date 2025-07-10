import React, { forwardRef } from 'react';

import { animated } from '@react-spring/web';

import { getFlagPath } from '../../helpers/getFlagPath';
import useAnimatePoints from '../../hooks/useAnimatePoints';
import { Country } from '../../models';
import { useScoreboardStore } from '../../state/scoreboardStore';
import RoundedTriangle from '../RoundedTriangle';

import CountryPlaceNumber from './CountryPlaceNumber';
import DouzePointsAnimation from './DouzePointsAnimation';
import { useCountryItemColors } from './hooks/useCountryItemColors';
import useDouzePointsAnimation from './hooks/useDouzePointsAnimation';
import { useItemState } from './hooks/useItemState';
import { useQualificationStatus } from './hooks/useQualificationStatus';
import useVotingFinished from './hooks/useVotingFinished';

const AnimatedButton = animated(
  // eslint-disable-next-line react/display-name
  forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { style?: any }
  >((props, ref) => <button {...props} ref={ref} />),
);

AnimatedButton.displayName = 'AnimatedButton';

const AnimatedDiv = animated.div as React.FC<
  React.HTMLAttributes<HTMLDivElement>
>;
const AnimatedH6 = animated.h6 as React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
>;

type Props = {
  country: Country;
  index: number;
  votingCountryCode?: string;
  onClick: (countryCode: string) => void;
  showPlaceAnimation: boolean;
  hasCountryFinishedVoting: boolean;
};

const CountryItem = forwardRef<HTMLButtonElement, Props>(
  (
    {
      country,
      index,
      votingCountryCode,
      onClick,
      showPlaceAnimation,
      hasCountryFinishedVoting,
      ...props
    },
    ref,
  ) => {
    const { getCurrentStage } = useScoreboardStore();

    const { isJuryVoting, isOver: isVotingOver } = getCurrentStage();

    const isVotingFinished = useVotingFinished(!!country.isVotingFinished);

    const isDouzePoints =
      !country.televotePoints && country.lastReceivedPoints === 12;
    const showDouzePointsAnimationHook = useDouzePointsAnimation(isDouzePoints);

    const shouldShowAsNonQualified = useQualificationStatus(
      country,
      isVotingOver,
    );
    const { isDisabled, buttonClassName, isActive } = useItemState({
      country,
      votingCountryCode,
      isJuryVoting,
      showPlaceAnimation,
      shouldShowAsNonQualified,
      hasCountryFinishedVoting,
    });

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

    return (
      <div className="flex relative" {...props}>
        <CountryPlaceNumber
          shouldShowAsNonQualified={shouldShowAsNonQualified}
          index={index}
          showPlaceAnimation={showPlaceAnimation}
        />

        <AnimatedButton
          ref={ref}
          style={springsPoints}
          className={buttonClassName}
          disabled={isDisabled}
          onClick={() => onClick(country.code)}
        >
          {showDouzePointsAnimationHook && (
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
              width={48}
              height={36}
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
            <AnimatedDiv
              style={
                {
                  ...springsLastPointsContainer,
                  backgroundColor: lastPointsBgColor,
                  display: country.lastReceivedPoints === -1 ? 'none' : 'block',
                } as any
              }
              className={`relative z-10 h-full pr-[0.6rem] lg:w-[2.8rem] md:w-9 w-8`}
            >
              <RoundedTriangle color={lastPointsBgColor} />
              <AnimatedH6
                style={
                  {
                    ...springsLastPointsText,
                    color: lastPointsTextColor,
                  } as any
                }
                className="lg:text-lg md:text-sm text-xs font-semibold h-full items-center flex justify-center"
              >
                {country.lastReceivedPoints}
              </AnimatedH6>
            </AnimatedDiv>

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
        </AnimatedButton>
      </div>
    );
  },
);

CountryItem.displayName = 'CountryItem';

export default React.memo(CountryItem);
