import { useMemo } from 'react';

import { FlagShape } from '@/theme/types';

export const getFlagOverlayOffsetClassName = (
  flagShape: FlagShape,
  lgOnly: boolean = false,
  roundedCountryContainer: boolean = false,
) => {
  switch (flagShape) {
    case 'round':
    case 'round-border':
      if (lgOnly) {
        return 'left-[36px]';
      }
      return 'lg:left-[36px] md:left-[32px] left-[30px]';
    case 'small-rectangle':
      if (lgOnly) {
        return 'left-[44px]';
      }
      return 'lg:left-[44px] md:left-[40px] left-[36px]';
    case 'square':
      if (lgOnly) {
        return 'left-[36px]';
      }
      return 'lg:left-[36px] md:left-[32px] left-[30px]';
    case 'none':
      return 'left-0';
    default:
      const lgWidthClass = roundedCountryContainer
        ? 'lg:left-[42px]'
        : 'lg:left-[50px]';
      if (lgOnly) {
        return roundedCountryContainer ? 'left-[42px]' : 'left-[50px]';
      }
      return `${lgWidthClass} md:left-12 left-10`;
  }
};

const useFlagClassName = (
  flagShape: FlagShape,
  lgOnly: boolean = false,
  roundedCountryContainer: boolean = false,
) => {
  let baseClassName = roundedCountryContainer
    ? 'shadow-[4px_0_8px_rgba(0,0,0,0.15)]'
    : '';

  const flagClassName = useMemo(() => {
    switch (flagShape) {
      case 'round':
      case 'round-border':
        if (lgOnly) {
          return `w-[28px] h-[28px] aspect-square rounded-full ml-[4px] ${
            flagShape === 'round-border' ? 'border-[1.5px] border-solid' : ''
          }`;
        }
        return `lg:w-[28px] md:w-[25px] w-[22px] lg:h-[28px] md:h-[25px] h-[22px] aspect-square rounded-full ml-[4px] ${
          flagShape === 'round-border' ? 'border-[1.5px] border-solid' : ''
        }`;
      case 'small-rectangle':
        if (lgOnly) {
          return 'w-[34px] h-[23px] ml-[4px] rounded-sm';
        }
        return 'lg:w-[34px] md:w-[30px] w-[26px] lg:h-[23px] md:h-[20px] h-[18px] ml-[5px] rounded-sm';
      case 'square':
        if (lgOnly) {
          return 'w-[36px] h-[36px] aspect-square';
        }
        return 'lg:w-[36px] md:w-[32px] w-[30px] lg:h-[36px] md:h-[32px] h-[30px] aspect-square';
      // 'big-rectangle'
      default:
        const lgWidthClass = roundedCountryContainer
          ? 'lg:w-[42px] md:w-[36px] w-[34px]'
          : 'lg:w-[50px] md:w-12 w-10';

        if (lgOnly) {
          return `${roundedCountryContainer ? 'w-[42px]' : 'w-[50px]'} h-10`;
        }
        return `${lgWidthClass} lg:h-10 md:h-9 h-8`;
    }
  }, [flagShape, lgOnly, roundedCountryContainer]);

  return `${baseClassName} ${flagClassName}`;
};

export default useFlagClassName;
