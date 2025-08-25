import { gsap } from 'gsap';
import React, { useRef } from 'react';

import { useGSAP } from '@gsap/react';

import { getFlagPath } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';

interface CountryQualificationItemProps {
  country: BaseCountry | null;
  hideIfQualified?: boolean;
  shouldAnimate?: boolean;
  isModal?: boolean;
  onClick?: () => void;
}

export const CountryQualificationItem: React.FC<
  CountryQualificationItemProps
> = ({
  country,
  onClick,
  hideIfQualified = false,
  shouldAnimate = false,
  isModal = false,
}) => {
  const itemRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (shouldAnimate && itemRef.current) {
        gsap.to(itemRef.current, {
          x: 0,
          opacity: 1,
          duration: 0.2,
          ease: 'power3.out',
        });
      }
    },
    { dependencies: [shouldAnimate], scope: itemRef },
  );

  if (!country) {
    return (
      <div className="bg-primary-800 bg-gradient-to-r from-[10%] from-primary-700 to-primary-900 rounded-sm w-full lg:h-10 md:h-9 xs:h-8 h-7 shadow-md"></div>
    );
  }

  return (
    <div
      ref={itemRef}
      className={`flex items-center bg-countryItem-juryBg text-countryItem-juryCountryText rounded-sm transition-all duration-300 relative shadow-md ${
        onClick ? 'cursor-pointer hover:bg-countryItem-juryHoverBg' : ''
      } ${
        country.isQualifiedFromSemi && hideIfQualified
          ? 'opacity-50 !cursor-not-allowed'
          : ''
      } ${shouldAnimate ? 'opacity-0 -translate-x-full' : ''} ${
        isModal ? 'opacity-0' : ''
      }`}
      onClick={onClick}
    >
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
      <span
        className="uppercase text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem] truncate flex-1 min-w-[7rem] sm:min-w-[9rem] md:min-w-0 2cols:max-w-[11rem] sm:max-w-[9rem] xs:max-w-[20rem] 2xs:max-w-[14.7rem] max-w-[11rem] md:max-w-full"
        title={country.name}
      >
        {country.name}
      </span>
    </div>
  );
};
