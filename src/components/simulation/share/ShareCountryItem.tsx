import React, { useMemo } from 'react';

import CountryItemBase from '@/components/countryItem/CountryItemBase';
import CountryPlaceNumber from '@/components/countryItem/CountryPlaceNumber';
import { useQualificationStatus } from '@/components/countryItem/hooks/useQualificationStatus';
import { getGradientBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import RoundedTriangle from '@/components/RoundedTriangle';
import {
  getFlagPath,
  getFlagPathForImageGeneration,
} from '@/helpers/getFlagPath';
import { Country } from '@/models';
import { useGeneralStore } from '@/state/generalStore';

type Props = {
  country: Country;
  index: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showPoints?: boolean;
  showRankings?: boolean;
  shortCountryNames?: boolean;
  isVotingOver?: boolean;
};

const ShareCountryItem: React.FC<Props> = ({
  country,
  index,
  size = 'md',
  showPoints = true,
  showRankings = true,
  shortCountryNames = false,
  isVotingOver = false,
}) => {
  const { shouldShowAsNonQualified, shouldShowNQLabel } =
    useQualificationStatus(country, isVotingOver);

  const buttonColors = useMemo(() => {
    if (shouldShowAsNonQualified) {
      return 'bg-countryItem-unqualifiedBg text-countryItem-unqualifiedText opacity-70';
    }

    if (country.isVotingFinished) {
      return 'bg-countryItem-televoteFinishedBg text-countryItem-televoteFinishedText';
    }

    return 'bg-countryItem-televoteUnfinishedBg text-countryItem-televoteUnfinishedText';
  }, [shouldShowAsNonQualified, country.isVotingFinished]);

  // Size-based styles
  const sizeStyles = {
    sm: {
      button: 'mb-1 h-7',
      flag: 'w-8 h-7 min-w-[32px]',
      name: 'text-sm mr-8',
      points: 'w-8',
      pointsText: 'text-sm',
      margin: 'mb-1',
    },
    md: {
      button: 'mb-1 h-8',
      flag: 'w-10 h-8 min-w-[40px]',
      name: 'text-sm mr-9',
      points: 'w-9',
      pointsText: 'text-base',
      margin: 'mb-1',
    },
    lg: {
      button: 'mb-[6px] h-10',
      flag: 'w-[50px] h-10 min-w-[50px]',
      name: 'text-lg mr-[2.57rem]',
      points: 'w-[2.57rem]',
      pointsText: 'text-[16px]',
      margin: 'mb-[6px]',
    },
    xl: {
      button: 'mb-[6px] h-12',
      flag: 'w-[56px] h-12 min-w-[56px]',
      name: 'text-xl mr-[3rem]',
      points: 'w-[3rem]',
      pointsText: 'text-[18px]',
      margin: 'mb-[6px]',
    },
    '2xl': {
      button: 'mb-2 h-14',
      flag: 'w-[64px] h-14 min-w-[64px]',
      name: 'text-2xl mr-[3.5rem]',
      points: 'w-[3.5rem]',
      pointsText: 'text-2xl',
      margin: 'mb-[6px]',
    },
  };

  const currentSize = sizeStyles[size];
  const buttonClassName = `relative flex justify-between shadow-md w-full overflow-hidden rounded-sm ${currentSize.button} ${buttonColors}`;

  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const buttonGradientStyle = getGradientBackgroundStyle(
    buttonClassName,
    overrides,
  );

  const pointsBgClass =
    'bg-countryItem-televoteFinishedPointsBg text-countryItem-televoteFinishedPointsBg';
  const pointsTextClass = 'text-countryItem-televoteFinishedPointsText';

  return (
    <CountryItemBase
      country={country}
      index={index}
      className="flex relative"
      containerClassName={buttonClassName}
      style={buttonGradientStyle}
      as="div"
      showPlaceNumber={showRankings}
      renderPlaceNumber={(country, index) => (
        <CountryPlaceNumber
          shouldShowAsNonQualified={shouldShowAsNonQualified}
          index={index}
          showPlaceAnimation
          points={'points' in country ? country.points : 0}
          isJuryVoting={false}
          size={size}
        />
      )}
      renderFlag={() => (
        <img
          loading="lazy"
          src={getFlagPathForImageGeneration(country)}
          onError={(e) => {
            e.currentTarget.src = getFlagPath('ww');
          }}
          alt={`${country.name} flag`}
          width={48}
          height={36}
          className={`${currentSize.flag} bg-countryItem-juryBg self-start object-cover`}
        />
      )}
      renderName={() => (
        <h4
          className={`${currentSize.name} uppercase text-left ml-2 font-bold truncate flex-1 pr-2 m`}
        >
          {shortCountryNames ? country.name.slice(0, 3) : country.name}
        </h4>
      )}
      renderPoints={() =>
        showPoints ? (
          <div
            className={`absolute right-0 top-0 h-full z-20 ${currentSize.points} ${pointsBgClass}`}
          >
            <RoundedTriangle className={pointsBgClass} />
            <h6
              className={`font-semibold absolute top-1/2 -translate-y-1/2 right-0.5 z-30 w-full h-full items-center flex justify-center ${currentSize.pointsText} ${pointsTextClass}`}
            >
              {shouldShowNQLabel ? 'NQ' : country.points}
            </h6>
          </div>
        ) : null
      }
    />
  );
};

export default ShareCountryItem;
