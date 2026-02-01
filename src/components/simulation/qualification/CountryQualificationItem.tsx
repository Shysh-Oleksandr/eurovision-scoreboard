import { gsap } from 'gsap';
import React, { useRef } from 'react';

import { useGSAP } from '@gsap/react';

import CountryItemBase from '@/components/countryItem/CountryItemBase';
import useFlagClassName from '@/components/countryItem/hooks/useFlagClassName';
import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

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
  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const uppercaseEntryName = useGeneralStore(
    (s) => s.customTheme?.uppercaseEntryName ?? true,
  );
  const flagShape = useGeneralStore(
    (s) => s.customTheme?.flagShape ?? 'big-rectangle',
  );
  const getCurrentStage = useScoreboardStore((s) => s.getCurrentStage);

  const itemRef = useRef<HTMLDivElement>(null);

  const itemClassName =
    'bg-countryItem-televoteFinishedBg text-countryItem-televoteFinishedText';

  const itemSpecialStyle = getSpecialBackgroundStyle(itemClassName, overrides);

  const flagClassName = useFlagClassName(flagShape);

  useGSAP(
    () => {
      if (shouldAnimate && itemRef.current) {
        gsap.to(itemRef.current, {
          x: 0,
          opacity: 1,
          duration: 0.2,
          ease: 'power1.in',
        });
      }
    },
    { dependencies: [shouldAnimate], scope: itemRef },
  );

  if (!country) {
    return (
      <div className="bg-primary-800 bg-gradient-to-r from-[10%] from-primary-700 to-primary-900 rounded-[1px] w-full lg:h-10 md:h-9 xs:h-8 h-7 shadow-md"></div>
    );
  }

  const currentStageId = getCurrentStage()?.id;
  const isQualifiedInCurrentStage =
    !!country &&
    !!currentStageId &&
    country.qualifiedFromStageIds?.includes(currentStageId);

  const isDisabled = isQualifiedInCurrentStage && hideIfQualified;

  return (
    <div
      ref={itemRef}
      className={`duration-300 w-full ${
        isDisabled ? 'opacity-50 !cursor-not-allowed' : ''
      } ${shouldAnimate ? 'opacity-0 -translate-x-full' : ''} ${
        isModal ? 'opacity-0' : ''
      }`}
    >
      <CountryItemBase
        country={country}
        containerClassName={`flex items-center rounded-[1px] duration-300 lg:h-10 h-9 relative shadow-md w-full ${
          onClick && !isDisabled ? 'brighten-on-hover' : ''
        } ${itemClassName}`}
        style={itemSpecialStyle}
        onClick={onClick ? () => onClick() : undefined}
        as="div"
        disabled={isDisabled}
        renderFlag={
          flagShape === 'none'
            ? undefined
            : () => (
                <img
                  loading="lazy"
                  src={getFlagPath(country, flagShape)}
                  onError={(e) =>
                    handleFlagError(e.currentTarget, country, flagShape)
                  }
                  alt={`${country.name} flag`}
                  width={48}
                  height={36}
                  className={`${flagClassName} bg-countryItem-juryBg object-cover`}
                />
              )
        }
        renderName={() => (
          <span
            className={`${
              uppercaseEntryName ? 'uppercase' : ''
            } text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem] truncate flex-1`}
            title={country.name}
          >
            {country.name}
          </span>
        )}
      />
    </div>
  );
};
