import React from 'react';

import { ROUNDED_SUBTLE_GLOW } from '../../countryItem/utils/roundedCountryItemGlow';

import { GOLD_GRADIENT } from './constants';
import { RevealBarStyles } from './types';

import { handleFlagError } from '@/helpers/getFlagPath';
import { Country } from '@/models';
import { getHostingCountryLogo } from '@/theme/hosting';

type Props = {
  leaderCountry: Country;
  lastCountry: Country;
  barStyles: RevealBarStyles;
  fillBlendExclusion: boolean;
  gradientBarRef: React.RefObject<HTMLDivElement | null>;
  fillBarRef: React.RefObject<HTMLDivElement | null>;
  markLineRef: React.RefObject<HTMLDivElement | null>;
  leaderBadgeRef: React.RefObject<HTMLDivElement | null>;
  leaderBadgeGoldOverlayRef: React.RefObject<HTMLDivElement | null>;
  leaderBadgePointsRef: React.RefObject<HTMLSpanElement | null>;
  leaderFlagRef: React.RefObject<HTMLImageElement | null>;
  lastBadgeRef: React.RefObject<HTMLDivElement | null>;
  lastBadgeGoldOverlayRef: React.RefObject<HTMLDivElement | null>;
  lastBadgePointsRef: React.RefObject<HTMLSpanElement | null>;
  lastFlagRef: React.RefObject<HTMLImageElement | null>;
};

const RevealBar = ({
  leaderCountry,
  lastCountry,
  barStyles,
  fillBlendExclusion,
  gradientBarRef,
  fillBarRef,
  markLineRef,
  leaderBadgeRef,
  leaderBadgeGoldOverlayRef,
  leaderBadgePointsRef,
  leaderFlagRef,
  lastBadgeRef,
  lastBadgeGoldOverlayRef,
  lastBadgePointsRef,
  lastFlagRef,
}: Props) => {
  const { logo: leaderLogo, isExisting: leaderLogoIsHeart } =
    getHostingCountryLogo(leaderCountry);
  const { logo: lastLogo, isExisting: lastLogoIsHeart } =
    getHostingCountryLogo(lastCountry);

  return (
    // Bar section — no z-index, no backdrop-filter; badges escape to z-20 in outer context
    <div className="relative w-16 md:w-20 flex-shrink-0 shadow-sm">
      {/* Gradient bar background */}
      <div
        ref={gradientBarRef}
        className="absolute bottom-0 left-0 right-0"
        style={{ background: barStyles.gradientBarBg }}
      />

      {/* Solid fill bar (last country's received points) */}
      <div
        ref={fillBarRef}
        className={`absolute bottom-0 left-0 right-0 ${
          fillBlendExclusion ? 'mix-blend-exclusion' : ''
        }`}
        style={{ background: barStyles.fillBarBg }}
      />

      {/* Leader badge — overlaps the left card */}
      <div
        ref={leaderBadgeRef}
        className="absolute -left-4 z-20 flex items-center gap-1.5 bg-countryItem-juryPointsBg/95 rounded-full lg:pl-7 xs:pl-6 pl-4 lg:pr-[43px] xs:pr-[36px] pr-[28px] xs:py-2 py-1.5 shadow-lg"
        style={{
          filter: ROUNDED_SUBTLE_GLOW,
          boxShadow: 'inset 0 -0.1px 1px 0.3px #dfe2ebc9',
        }}
      >
        {/* Gold overlay — fades in when leader wins (last country couldn't overtake) */}
        <div
          ref={leaderBadgeGoldOverlayRef}
          className="absolute inset-0 rounded-full opacity-0 pointer-events-none"
          style={{ background: GOLD_GRADIENT }}
        />
        <span
          ref={leaderBadgePointsRef}
          className="font-bold text-countryItem-juryPointsText lg:text-lg text-base tabular-nums !leading-none relative z-10"
        >
          {leaderCountry.points}
        </span>
        <img
          ref={leaderFlagRef}
          src={leaderLogo}
          onError={(e) => handleFlagError(e.currentTarget, leaderCountry)}
          alt={leaderCountry.name}
          className={
            leaderLogoIsHeart
              ? 'lg:w-16 lg:h-16 xs:w-12 w-10 xs:h-12 h-10 absolute lg:right-[-15px] right-[-11px] z-10'
              : 'w-12 h-9 object-cover rounded absolute -right-2 z-10'
          }
        />
      </div>

      {/* Last country badge — overlaps the right card */}
      <div
        ref={lastBadgeRef}
        className="absolute -right-5 z-20 flex items-center gap-1.5 bg-countryItem-juryPointsBg/95 rounded-full lg:pr-7 xs:pr-6 pr-4 lg:pl-[43px] xs:pl-[36px] pl-[28px] xs:py-2 py-1.5 shadow-lg"
        style={{
          filter: ROUNDED_SUBTLE_GLOW,
          boxShadow: 'inset 0 -0.1px 1px 0.3px #dfe2ebc9',
        }}
      >
        {/* Gold overlay — fades in at phase 2b start when last country wins */}
        <div
          ref={lastBadgeGoldOverlayRef}
          className="absolute inset-0 rounded-full opacity-0 pointer-events-none"
          style={{ background: GOLD_GRADIENT }}
        />
        <img
          ref={lastFlagRef}
          src={lastLogo}
          onError={(e) => handleFlagError(e.currentTarget, lastCountry)}
          alt={lastCountry.name}
          className={
            lastLogoIsHeart
              ? 'lg:w-16 lg:h-16 xs:w-12 w-10 xs:h-12 h-10 absolute lg:left-[-13px] left-[-11px] z-10'
              : 'w-12 h-9 object-cover rounded absolute -left-2 z-10'
          }
        />
        <span
          ref={lastBadgePointsRef}
          className="font-bold text-countryItem-juryPointsText lg:text-lg text-base tabular-nums !leading-none relative z-10"
        >
          {lastCountry.points}
        </span>
      </div>

      {/* Leader mark line */}
      <div
        ref={markLineRef}
        className="absolute bottom-[70%] left-0 right-0 h-0.5 bg-white/80 shadow-sm z-10"
      />
    </div>
  );
};

export default RevealBar;
