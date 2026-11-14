import { gsap } from 'gsap';
import React, { useMemo, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { useBoardLayoutOverride } from '@/components/board/BoardLayoutContext';
import CountryItemBase from '@/components/countryItem/CountryItemBase';
import useFlagClassName from '@/components/countryItem/hooks/useFlagClassName';
import { getSpecialBackgroundStyle } from '@/components/countryItem/utils/gradientUtils';
import {
  getRoundedSubtleGlowStyle,
  ROUNDED_GLOW_CLASS,
} from '@/components/countryItem/utils/roundedCountryItemGlow';
import { getFlagPath, handleFlagError } from '@/helpers/getFlagPath';
import { BaseCountry } from '@/models';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';
import { FlagShape } from '@/theme/types';
import useThemeSpecifics from '@/theme/useThemeSpecifics';

interface CountryQualificationItemProps {
  country: BaseCountry | null;
  hideIfQualified?: boolean;
  shouldAnimate?: boolean;
  isModal?: boolean;
  onClick?: () => void;
  targetStageName?: string;
  /** `button` for rows the user taps (the column layout's board). */
  as?: 'div' | 'button';
  /**
   * No wrapper: the row's root is the theme row itself, as the column
   * layout's board measures it (`.container-wrapping-flipper > div >
   * .dp-scoreboard-font`).
   */
  bare?: boolean;
  /** A 30px row for lists beside the board (the column's qualifiers). */
  compact?: boolean;
  /** The theme's non-qualifier colours (the stage is over). */
  nonQualified?: boolean;
  /** An accent ring: one of the split screen's candidates. */
  highlighted?: boolean;
  /** Extra classes on the row (the column layout's board spacing). */
  rowClassName?: string;
}

/** Compact rows keep each flag shape at a 30px row's scale. */
const COMPACT_FLAG_CLASS: Record<FlagShape, string> = {
  round: '!w-[22px] !h-[22px]',
  'round-border': '!w-[22px] !h-[22px]',
  'small-rectangle': '!w-[24px] !h-[16px]',
  square: '!w-[30px] !h-[30px]',
  'big-rectangle': '!w-[38px] !h-full',
  none: '',
};

export const CountryQualificationItem: React.FC<
  CountryQualificationItemProps
> = ({
  country,
  onClick,
  hideIfQualified = false,
  shouldAnimate = false,
  isModal = false,
  targetStageName,
  as = 'div',
  bare = false,
  compact = false,
  nonQualified = false,
  highlighted = false,
  rowClassName = '',
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
  // A host short of width shows a code ("NOR") in place of the name.
  const shortCode = useBoardLayoutOverride()?.shortCodes?.[country?.code ?? ''];

  let itemClassName = roundedCountryContainer
    ? 'bg-countryItem-juryBg text-countryItem-juryCountryText'
    : 'bg-countryItem-televoteFinishedBg text-countryItem-televoteFinishedText';

  if (nonQualified) {
    itemClassName =
      'bg-countryItem-unqualifiedBg text-countryItem-unqualifiedText';
  }
  const heightClass = compact ? 'h-[30px]' : 'lg:h-10 md:h-9 h-8';

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
        className={`bg-primary-800 bg-gradient-to-r from-[10%] from-primary-700 to-primary-900 rounded-md ${
          roundedCountryContainer ? '!rounded-full' : ''
        } w-full ${heightClass} shadow-md`}
      ></div>
    );
  }

  const row = (
    <CountryItemBase
      className={
        bare
          ? `${isDisabled ? 'opacity-50' : ''} ${
              nonQualified ? 'opacity-70' : ''
            }`
          : undefined
      }
      country={country}
      containerClassName={`flex items-center rounded-md overflow-hidden ${
        roundedCountryContainer
          ? `!rounded-full !bg-transparent ${ROUNDED_GLOW_CLASS}`
          : ''
      } duration-300 ${heightClass} relative shadow-md w-full ${
        highlighted ? 'outline outline-2 outline-offset-2 outline-accent' : ''
      } ${rowClassName} ${
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
      style={roundedCountryContainer ? roundedContainerStyle : itemSpecialStyle}
      onClick={onClick ? () => onClick() : undefined}
      onMouseEnter={
        isRoundedGlowHoverable ? () => setIsRoundedGlowHovered(true) : undefined
      }
      onMouseLeave={
        isRoundedGlowHoverable
          ? () => setIsRoundedGlowHovered(false)
          : undefined
      }
      as={as}
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
                className={`${flagClassName} ${
                  compact ? COMPACT_FLAG_CLASS[flagShape] : ''
                } bg-countryItem-juryBg object-cover`}
              />
            )
      }
      renderName={() => (
        <span
          className={`${uppercaseEntryName ? 'uppercase' : ''} text-left ${
            compact
              ? 'ml-1.5 text-[12.5px]'
              : 'ml-2 xl:text-lg lg:text-[1.05rem] md:text-base xs:text-sm text-[0.9rem]'
          } font-bold truncate flex-1 min-w-0`}
          title={country.name}
          data-entry-name=""
        >
          {shortCode ? (
            <>
              <span aria-hidden="true">{shortCode}</span>
              <span className="sr-only">{country.name}</span>
            </>
          ) : (
            country.name
          )}
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
  );

  if (bare) return row;

  return (
    <div
      ref={itemRef}
      className={`duration-300 w-full ${
        isDisabled ? 'opacity-50 !cursor-not-allowed' : ''
      } ${nonQualified ? 'opacity-70' : ''} ${
        shouldAnimate ? 'opacity-0 -translate-x-full' : ''
      } ${isModal ? 'opacity-0' : ''}`}
    >
      {row}
    </div>
  );
};
