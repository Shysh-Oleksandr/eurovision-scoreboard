import React, { useMemo } from 'react';

import CountryItemBase from '@/components/countryItem/CountryItemBase';
import CountryPlaceNumber from '@/components/countryItem/CountryPlaceNumber';
import { useCountryItemColors } from '@/components/countryItem/hooks/useCountryItemColors';
import { useQualificationStatus } from '@/components/countryItem/hooks/useQualificationStatus';
import PointsSection from '@/components/countryItem/PointsSection';
import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import {
  getFlagPath,
  getFlagPathForImageGeneration,
} from '@/helpers/getFlagPath';
import { Country } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { ItemState } from '@/theme/types';

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

  const viewedStageId = useScoreboardStore((state) => state.viewedStageId);
  const eventStages = useScoreboardStore((state) => state.eventStages);

  const getCurrentStage = useScoreboardStore((state) => state.getCurrentStage);

  const currentStage =
    eventStages.find((s) => s.id === viewedStageId) || getCurrentStage();
  const isJuryVoting = !!currentStage?.isJuryVoting;

  const buttonColors = useMemo(() => {
    if (shouldShowAsNonQualified) {
      return 'bg-countryItem-unqualifiedBg text-countryItem-unqualifiedText opacity-70';
    }

    if (isJuryVoting) {
      return 'bg-countryItem-juryBg text-countryItem-juryCountryText';
    }

    if (country.isVotingFinished) {
      return 'bg-countryItem-televoteFinishedBg text-countryItem-televoteFinishedText';
    }

    return 'bg-countryItem-televoteUnfinishedBg text-countryItem-televoteUnfinishedText';
  }, [shouldShowAsNonQualified, country.isVotingFinished, isJuryVoting]);

  // Size-based styles
  const sizeStyles = {
    sm: {
      button: 'mb-1 h-7',
      flag: 'w-8 h-7',
      name: 'text-sm mr-8',
      points: '!w-8',
      pointsText: '!text-sm',
      margin: 'mb-1',
    },
    md: {
      button: 'mb-1 h-8',
      flag: 'w-10 h-8',
      name: 'text-sm mr-9',
      points: '!w-9',
      pointsText: '!text-base',
      margin: 'mb-1',
    },
    lg: {
      button: 'mb-[6px] h-10',
      flag: 'w-[50px] h-10',
      name: 'text-lg mr-[2.57rem]',
      points: '!w-[2.57rem]',
      pointsText: '!text-[16px]',
      margin: 'mb-[6px]',
    },
    xl: {
      button: 'mb-[6px] h-12',
      flag: 'w-[56px] h-12',
      name: 'text-xl mr-[3rem]',
      points: '!w-[3rem]',
      pointsText: '!text-[18px]',
      margin: 'mb-[6px]',
    },
    '2xl': {
      button: 'mb-2 h-14',
      flag: 'w-[64px] h-14',
      name: 'text-2xl mr-[3.5rem]',
      points: '!w-[3.5rem]',
      pointsText: '!text-2xl',
      margin: 'mb-[6px]',
    },
  };

  const currentSize = sizeStyles[size];
  const buttonClassName = `relative flex justify-between shadow-md w-full overflow-hidden rounded-[1px] ${currentSize.button} ${buttonColors}`;

  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const uppercaseEntryName = useGeneralStore(
    (s) => s.customTheme?.uppercaseEntryName ?? true,
  );
  const pointsContainerShape = useGeneralStore(
    (s) => s.customTheme?.pointsContainerShape ?? 'triangle',
  );
  const flagShape = useGeneralStore(
    (s) => s.customTheme?.flagShape ?? 'big-rectangle',
  );
  const buttonSpecialStyle = getSpecialBackgroundStyle(
    buttonClassName,
    overrides,
  );

  // Helper function to convert Tailwind class to pixels
  const twToPx = (value: string): number => {
    if (value.includes('px')) {
      return parseInt(value.replace(/[[\]px]/g, ''), 10);
    }

    // Tailwind spacing scale: 1 = 3.5px (base font size is 14px)
    const num = parseInt(value, 10);

    return num * 3.5;
  };

  // Generate flag className and style based on shape and size
  const { flagClassName, flagStyle } = useMemo(() => {
    if (flagShape === 'none') {
      return { flagClassName: '', flagStyle: undefined };
    }

    // Extract base dimensions from currentSize.flag
    // currentSize.flag format: 'w-8 h-7' or 'w-[50px] h-10'
    const baseFlagClass = currentSize.flag;
    const widthMatch = baseFlagClass.match(/w-(\d+|\[\d+px\])/);
    const heightMatch = baseFlagClass.match(/h-(\d+|\[\d+px\])/);

    const baseWidth = widthMatch ? widthMatch[1] : '8';
    const baseHeight = heightMatch ? heightMatch[1] : '7';

    const baseWidthPx = twToPx(baseWidth);
    const baseHeightPx = twToPx(baseHeight);

    switch (flagShape) {
      case 'round':
      case 'round-border': {
        // For round, use 85% of the smaller dimension for both width and height
        const size = Math.round(Math.min(baseWidthPx, baseHeightPx) * 0.85);
        const borderClass =
          flagShape === 'round-border' ? 'border-[1.5px] border-solid' : '';

        return {
          flagClassName: `rounded-full ml-[4px] ${borderClass}`.trim(),
          flagStyle: { width: `${size}px`, height: `${size}px` },
        };
      }
      case 'small-rectangle': {
        let height = Math.round(baseWidthPx - 24);

        switch (size) {
          case 'sm':
            height = Math.round(baseWidthPx - 10);
            break;
          case 'md':
            height = Math.round(baseWidthPx - 13);
            break;
          case '2xl':
            height = Math.round(baseWidthPx - 28);
            break;
        }

        return {
          flagClassName: 'ml-[4px] rounded-sm',
          flagStyle: { width: `${baseHeightPx}px`, height: `${height}px` },
        };
      }
      case 'square': {
        // Square: use height for both width and height
        const height = heightMatch ? heightMatch[1] : '8';

        return {
          flagClassName: `${baseFlagClass.replace(
            /w-\S+/g,
            '',
          )} w-${height} aspect-square`.trim(),
          flagStyle: undefined,
        };
      }
      default:
        // 'big-rectangle'
        return { flagClassName: baseFlagClass, flagStyle: undefined };
    }
  }, [flagShape, currentSize.flag, size]);

  const { pointsBgClass, pointsTextClass } = useCountryItemColors({
    isJuryVoting,
    isCountryVotingFinished: !!country.isVotingFinished,
    isActive: false,
    isUnqualified: shouldShowAsNonQualified,
  });

  return (
    <CountryItemBase
      country={country}
      index={index}
      className="flex relative"
      containerClassName={buttonClassName}
      style={buttonSpecialStyle}
      as="div"
      showPlaceNumber={showRankings}
      renderPlaceNumber={(country, index) => {
        // Determine the current state for rank colors
        let currentState: ItemState = 'televoteUnfinished';

        if (shouldShowAsNonQualified) {
          currentState = 'unqualified';
        } else if (isJuryVoting) {
          currentState = 'jury';
        } else if ('isVotingFinished' in country && country.isVotingFinished) {
          currentState = 'televoteFinished';
        } else {
          currentState = 'televoteUnfinished';
        }

        return (
          <CountryPlaceNumber
            shouldShowAsNonQualified={shouldShowAsNonQualified}
            index={index}
            showPlaceAnimation
            points={'points' in country ? country.points : 0}
            isJuryVoting={false}
            size={size}
            state={currentState}
          />
        );
      }}
      renderFlag={
        flagShape === 'none'
          ? undefined
          : () => (
              <img
                loading="lazy"
                src={getFlagPathForImageGeneration(country)}
                onError={(e) => {
                  e.currentTarget.src = getFlagPath('ww');
                }}
                alt={`${country.name} flag`}
                width={48}
                height={36}
                className={`${flagClassName} bg-countryItem-juryBg object-cover`}
                style={flagStyle}
              />
            )
      }
      renderName={() => (
        <h4
          className={`${currentSize.name} ${
            uppercaseEntryName ? 'uppercase' : ''
          } text-left ml-2 font-bold truncate flex-1 pr-2 m`}
        >
          {shortCountryNames ? country.name.slice(0, 3) : country.name}
        </h4>
      )}
      renderPoints={(country) =>
        showPoints ? (
          <PointsSection
            country={country}
            pointsContainerClassName={`!absolute right-0 top-0 ${currentSize.points}`}
            pointsBgClass={pointsBgClass}
            pointsTextClass={`${currentSize.pointsText} ${pointsTextClass}`}
            shouldShowNQLabel={shouldShowNQLabel}
            showLastPoints={false}
            pointsContainerShape={pointsContainerShape}
          />
        ) : null
      }
    />
  );
};

export default ShareCountryItem;
