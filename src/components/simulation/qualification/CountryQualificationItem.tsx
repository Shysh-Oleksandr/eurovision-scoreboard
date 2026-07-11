import { gsap } from 'gsap';
import React, { useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import CountryItemBase from '@/components/countryItem/CountryItemBase';
import useFlagClassName from '@/components/countryItem/hooks/useFlagClassName';
import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import { getRoundedSubtleGlowStyle } from '@/components/countryItem/utils/roundedCountryItemGlow';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

interface CountryQualificationItemProps {
  country: BaseCountry | null;
  hideIfQualified?: boolean;
  shouldAnimate?: boolean;
  isModal?: boolean;
  onClick?: () => void;
  targetStageName?: string;
}

export const CountryQualificationItem: React.FC<
  CountryQualificationItemProps
> = ({
  country,
  onClick,
  hideIfQualified = false,
  shouldAnimate = false,
  isModal = false,
  targetStageName,
}) => {
  const overrides = useGeneralStore((s) => s.customTheme?.overrides || null);
  const themeYear = useGeneralStore(
    (s) => s.customTheme?.baseThemeYear ?? s.themeYear,
  );
  const { uppercaseEntryName, flagShape, roundedCountryContainer } =
    useThemeSpecifics();
  const getCurrentStage = useScoreboardStore((s) => s.getCurrentStage);
  const enableMinimalisticFlags = useGeneralStore(
    (s) => s.settings.enableMinimalisticFlags,
  );
  const itemRef = useRef<HTMLDivElement>(null);

  const itemClassName = roundedCountryContainer
    ? 'bg-countryItem-juryBg text-countryItem-juryCountryText'
    : 'bg-countryItem-televoteFinishedBg text-countryItem-televoteFinishedText';

  const itemSpecialStyle = getSpecialBackgroundStyle(
    itemClassName,
    overrides,
    themeYear,
  );

  const flagClassName = useFlagClassName(
    flagShape,
    false,
    roundedCountryContainer,
  );

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

  const currentStageId = getCurrentStage()?.id;
  const isQualifiedInCurrentStage =
    !!country &&
    !!currentStageId &&
    country.qualifiedFromStageIds?.includes(currentStageId);
  const isDisabled = isQualifiedInCurrentStage && hideIfQualified;

  const [isRoundedGlowHovered, setIsRoundedGlowHovered] = useState(false);
  const isRoundedGlowHoverable =
    roundedCountryContainer && !!onClick && !isDisabled && !!country;

  const roundedContainerStyle = useMemo(() => {
    if (!roundedCountryContainer) return undefined;

    return getRoundedSubtleGlowStyle(
      isRoundedGlowHovered && isRoundedGlowHoverable,
    );
  }, [roundedCountryContainer, isRoundedGlowHovered, isRoundedGlowHoverable]);

  const roundedNameStripSurfaceClasses = roundedCountryContainer
    ? itemClassName
        .split(/\s+/)
        .filter((c) => c.startsWith('bg-') || c.startsWith('opacity-'))
        .join(' ')
    : '';

  const roundedTextClasses = roundedCountryContainer
    ? itemClassName
        .split(/\s+/)
        .filter((c) => c.startsWith('text-'))
        .join(' ')
    : '';

  const useInlineLayout = roundedCountryContainer || !!targetStageName;

  let contentClassName: string | undefined;

  if (roundedCountryContainer) {
    contentClassName = `rounded-full ${roundedNameStripSurfaceClasses} !opacity-100`;
  } else if (useInlineLayout) {
    contentClassName = 'min-w-0';
  }

  if (!country) {
    return (
      <div
        className={`bg-primary-800 bg-gradient-to-r from-[10%] from-primary-700 to-primary-900 rounded-[6px] ${
          roundedCountryContainer ? '!rounded-full' : ''
        } w-full lg:h-10 md:h-9 h-8 shadow-md`}
      ></div>
    );
  }

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
        containerClassName={`flex items-center rounded-[6px] overflow-hidden ${
          roundedCountryContainer ? '!rounded-full !bg-transparent' : ''
        } duration-300 lg:h-10 md:h-9 h-8 relative shadow-md w-full ${
          onClick && !isDisabled
            ? roundedCountryContainer
              ? 'cursor-pointer'
              : 'brighten-on-hover'
            : ''
        } ${roundedCountryContainer ? roundedTextClasses : itemClassName} ${
          useInlineLayout ? 'flex-1 min-w-0 overflow-hidden' : ''
        }`}
        contentClassName={contentClassName}
        useInlineContentLayout={useInlineLayout}
        contentStyle={roundedCountryContainer ? itemSpecialStyle : undefined}
        style={
          roundedCountryContainer ? roundedContainerStyle : itemSpecialStyle
        }
        onClick={onClick ? () => onClick() : undefined}
        onMouseEnter={
          isRoundedGlowHoverable
            ? () => setIsRoundedGlowHovered(true)
            : undefined
        }
        onMouseLeave={
          isRoundedGlowHoverable
            ? () => setIsRoundedGlowHovered(false)
            : undefined
        }
        as="div"
        disabled={isDisabled}
        renderFlag={
          flagShape === 'none'
            ? undefined
            : () => (
                <img
                  loading="lazy"
                  src={getFlagPath(country, flagShape, enableMinimalisticFlags)}
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
            } text-left ml-2 font-bold xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem] truncate flex-1 min-w-0`}
            title={country.name}
          >
            {country.name}
          </span>
        )}
        renderPoints={
          targetStageName
            ? () => (
                <span
                  className="shrink-0 px-2 my-auto font-semibold xl:text-xs lg:text-xs md:text-xs text-[0.7rem] uppercase tracking-wide text-white/70 truncate max-w-[5.5rem] sm:max-w-[6.5rem]"
                  title={targetStageName}
                >
                  {targetStageName}
                </span>
              )
            : undefined
        }
      />
    </div>
  );
};
