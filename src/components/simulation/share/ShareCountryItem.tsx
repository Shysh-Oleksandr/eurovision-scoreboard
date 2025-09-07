import React, { useMemo } from 'react';

import CountryPlaceNumber from '@/components/countryItem/CountryPlaceNumber';
import { useQualificationStatus } from '@/components/countryItem/hooks/useQualificationStatus';
import RoundedTriangle from '@/components/RoundedTriangle';
import { getFlagPath } from '@/helpers/getFlagPath';
import { Country } from '@/models';

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
  const shouldShowAsNonQualified = useQualificationStatus(
    country,
    isVotingOver,
  );

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
      name: 'text-sm truncate flex-1 min-w-[7rem] max-w-[11rem]',
      points: 'w-8',
      pointsText: 'text-sm',
      margin: 'mb-1',
    },
    md: {
      button: 'mb-1 h-8',
      flag: 'w-10 h-8 min-w-[40px]',
      name: 'text-sm min-w-[7rem] max-w-[20rem]',
      points: 'w-9',
      pointsText: 'text-base',
      margin: 'mb-1',
    },
    lg: {
      button: 'mb-[6px] h-10',
      flag: 'w-[50px] h-10 min-w-[50px]',
      name: 'text-lg min-w-[9rem] max-w-full',
      points: 'w-[2.57rem]',
      pointsText: 'text-[16px]',
      margin: 'mb-[6px]',
    },
    xl: {
      button: 'mb-[6px] h-12',
      flag: 'w-[56px] h-12 min-w-[56px]',
      name: 'text-xl min-w-[10rem] max-w-full',
      points: 'w-[3rem]',
      pointsText: 'text-[18px]',
      margin: 'mb-[6px]',
    },
    '2xl': {
      button: 'mb-2 h-14',
      flag: 'w-[64px] h-14 min-w-[64px]',
      name: 'text-2xl min-w-[12rem] max-w-full',
      points: 'w-[3.5rem]',
      pointsText: 'text-2xl',
      margin: 'mb-[6px]',
    },
  };

  const currentSize = sizeStyles[size];
  const buttonClassName = `relative flex justify-between shadow-md w-full overflow-hidden rounded-sm ${currentSize.button} ${buttonColors}`;

  const pointsBgClass =
    'bg-countryItem-televoteFinishedPointsBg text-countryItem-televoteFinishedPointsBg';
  const pointsTextClass = 'text-countryItem-televoteFinishedPointsText';

  return (
    <div className="flex relative">
      {showRankings && (
        <CountryPlaceNumber
          shouldShowAsNonQualified={shouldShowAsNonQualified}
          index={index}
          showPlaceAnimation
          points={country.points}
          isJuryVoting={false}
          size={size}
        />
      )}

      <div className={buttonClassName}>
        <div className="flex items-center overflow-hidden flex-1 min-w-0">
          <img
            src={getFlagPath(country)}
            onError={(e) => {
              e.currentTarget.src = getFlagPath('ww');
            }}
            alt={`${country.name} flag`}
            width={48}
            height={36}
            className={`${currentSize.flag} bg-countryItem-juryBg self-start object-cover`}
          />
          <h4
            className={`${currentSize.name} uppercase text-left ml-2 font-bold truncate flex-1 pr-2`}
          >
            {shortCountryNames ? country.name.slice(0, 3) : country.name}
          </h4>
        </div>

        {showPoints && (
          <div className="flex h-full flex-shrink-0">
            {/* Points */}
            <div
              className={`relative h-full z-20 ${currentSize.points} ${pointsBgClass}`}
            >
              <RoundedTriangle className={pointsBgClass} />
              <h6
                className={`font-semibold absolute top-1/2 -translate-y-1/2 right-0.5 z-30 w-full h-full items-center flex justify-center ${currentSize.pointsText} ${pointsTextClass}`}
              >
                {country.points === -1 ? 'NQ' : country.points}
              </h6>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareCountryItem;
