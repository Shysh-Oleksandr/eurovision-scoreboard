'use client';

import Image from 'next/image';

import { useGeneralStore } from '@/state/generalStore';

type Props = {
  className?: string;
  snowEffect?: 'left' | 'right' | 'middle' | 'none';
};

const SnowPileEffect = ({ className = '', snowEffect = 'none' }: Props) => {
  const enableWinterEffects = useGeneralStore(
    (state) => state.settings.enableWinterEffects,
  );

  if (snowEffect === 'none' || !enableWinterEffects) return null;

  return (
    <>
      {snowEffect === 'middle' && (
        <Image
          src="/effects/SnowMiddle.png"
          alt="Snow pile"
          className={`absolute -top-2 z-40 left-1/2 -translate-x-1/2 object-fill h-4 xs:w-[220px] w-[470px] ${className}`}
          width={window.innerWidth > 480 ? 290 : 470}
          height={35}
          loading="eager"
        />
      )}
      {snowEffect === 'right' && (
        <Image
          src="/effects/SnowRight.png"
          alt="Snow pile"
          className={`absolute rotate-6 -right-1.5 -top-2 z-40 object-fill h-5 w-[30px] ${className}`}
          width={30}
          height={20}
          loading="eager"
        />
      )}
      {snowEffect === 'left' && (
        <Image
          src="/effects/SnowLeft.png"
          alt="Snow pile"
          className={`absolute -left-1 -rotate-2 -top-2 z-50 object-fill h-5 w-[30px] pointer-events-none ${className}`}
          width={30}
          height={20}
          loading="eager"
        />
      )}
    </>
  );
};

export default SnowPileEffect;
