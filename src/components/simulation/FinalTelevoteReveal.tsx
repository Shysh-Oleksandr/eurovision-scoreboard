'use client';
import { useTranslations } from 'next-intl';

import RevealBar from './finalTelevoteReveal/RevealBar';
import RevealCountryCard from './finalTelevoteReveal/RevealCountryCard';
import { FinalTelevoteRevealProps } from './finalTelevoteReveal/types';
import { useRevealAnimation } from './finalTelevoteReveal/useRevealAnimation';
import { useRevealBarStyles } from './finalTelevoteReveal/useRevealBarStyles';

import { useQualifiedCountriesPanelGlowStyle } from '@/theme/useQualifiedCountriesPanelGlowStyle';

const FinalTelevoteReveal = (props: FinalTelevoteRevealProps) => {
  const { pointsNeeded } = props;
  const t = useTranslations('simulation.finalReveal');

  const roundedPanelGlowStyle = useQualifiedCountriesPanelGlowStyle();
  const barStyles = useRevealBarStyles();

  const {
    leaderCountry,
    lastCountry,
    receivedLabelPts,
    revealDoneRef,
    containerRef,
    gradientBarRef,
    fillBarRef,
    markLineRef,
    leaderCardRef,
    leaderCardFlagRef,
    leaderCardTextRef,
    leaderBadgeRef,
    leaderFlagRef,
    leaderBadgePointsRef,
    leaderBadgeGoldOverlayRef,
    lastCardRef,
    lastCardFlagRef,
    lastCardTextRef,
    lastBadgeRef,
    lastFlagRef,
    lastBadgePointsRef,
    lastBadgeGoldOverlayRef,
    needsCountdownRef,
  } = useRevealAnimation(props);

  if (!leaderCountry || !lastCountry) return null;

  const fillBlendExclusion =
    revealDoneRef.current && leaderCountry.points < lastCountry.points;

  const lastLabel =
    receivedLabelPts !== null
      ? t.rich('receivedPointsFromPublic', {
          count: receivedLabelPts,
          span: (chunks) => (
            <span className="font-bold text-white xs:text-base text-sm">
              {chunks}
            </span>
          ),
        })
      : t.rich('needsPointsToWin', {
          count: pointsNeeded,
          span: () => (
            <span
              ref={needsCountdownRef}
              className="font-bold text-white xs:text-base text-sm"
            >
              {pointsNeeded}
            </span>
          ),
        });

  return (
    <div
      ref={containerRef}
      className="w-full flex min-h-[360px] sm:min-h-[400px] rounded-lg"
    >
      <RevealCountryCard
        side="leader"
        country={leaderCountry}
        cardRef={leaderCardRef}
        flagRef={leaderCardFlagRef}
        textRef={leaderCardTextRef}
        glowStyle={roundedPanelGlowStyle}
        label={t('currentLeader')}
      />

      <RevealBar
        leaderCountry={leaderCountry}
        lastCountry={lastCountry}
        barStyles={barStyles}
        fillBlendExclusion={fillBlendExclusion}
        gradientBarRef={gradientBarRef}
        fillBarRef={fillBarRef}
        markLineRef={markLineRef}
        leaderBadgeRef={leaderBadgeRef}
        leaderBadgeGoldOverlayRef={leaderBadgeGoldOverlayRef}
        leaderBadgePointsRef={leaderBadgePointsRef}
        leaderFlagRef={leaderFlagRef}
        lastBadgeRef={lastBadgeRef}
        lastBadgeGoldOverlayRef={lastBadgeGoldOverlayRef}
        lastBadgePointsRef={lastBadgePointsRef}
        lastFlagRef={lastFlagRef}
      />

      <RevealCountryCard
        side="last"
        country={lastCountry}
        cardRef={lastCardRef}
        flagRef={lastCardFlagRef}
        textRef={lastCardTextRef}
        glowStyle={roundedPanelGlowStyle}
        label={lastLabel}
      />
    </div>
  );
};

export default FinalTelevoteReveal;
