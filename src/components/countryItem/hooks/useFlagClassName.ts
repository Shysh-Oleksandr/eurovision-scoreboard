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
          return `w-[30px] h-[30px] aspect-square rounded-full ml-[4px] ${
            flagShape === 'round-border' ? 'border-[1.5px] border-solid' : ''
          }`;
        }
        return `lg:w-[30px] md:w-[26px] w-[24px] lg:h-[30px] md:h-[26px] h-[24px] aspect-square rounded-full ml-[4px] ${
          flagShape === 'round-border' ? 'border-[1.5px] border-solid' : ''
        }`;
      case 'small-rectangle':
        if (lgOnly) {
          return 'w-[40px] h-[26px] ml-[4px] rounded-sm';
        }
        return 'lg:w-[40px] md:w-10 w-9 lg:h-[26px] md:h-[22px] h-6 ml-[4px] rounded-sm';
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
