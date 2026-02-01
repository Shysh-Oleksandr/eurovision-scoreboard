import { useMemo } from 'react';

import { FlagShape } from '@/theme/types';

const useFlagClassName = (
  flagShape: FlagShape,
  lgOnly: boolean = false,
) => {
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
      default:
        if (lgOnly) {
          return 'w-[50px] h-10';
        }
        return 'lg:w-[50px] md:w-12 w-10 lg:h-10 md:h-9 h-8';
    }
  }, [flagShape, lgOnly]);

  return flagClassName;
};

export default useFlagClassName;
