'use client';
import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { FinalTelevoteRevealProps } from './types';

import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * Owns every ref and the full GSAP choreography for the reveal panel:
 * the entrance timeline, the points-driven reveal timeline (phases 2a/2b),
 * and the effect that watches for the last country's televote points.
 *
 * Returns the refs (to be attached by the presentational components) plus the
 * derived `receivedLabelPts` state and `revealDoneRef` used during render.
 */
export const useRevealAnimation = ({
  leaderCountryCode,
  lastCountryCode,
  pointsNeeded,
  onRevealComplete,
}: FinalTelevoteRevealProps) => {
  const leaderCountry = useScoreboardStore(
    (state) =>
      state
        .getCurrentStage()
        ?.countries.find((c) => c.code === leaderCountryCode) ?? null,
  );
  const lastCountry = useScoreboardStore(
    (state) =>
      state
        .getCurrentStage()
        ?.countries.find((c) => c.code === lastCountryCode) ?? null,
  );
  const lastCountryFinished = useScoreboardStore(
    (state) =>
      state.getCurrentStage()?.countries.find((c) => c.code === lastCountryCode)
        ?.isVotingFinished ?? false,
  );
  const lastCountryTelevotePoints = useScoreboardStore(
    (state) =>
      state.getCurrentStage()?.countries.find((c) => c.code === lastCountryCode)
        ?.televotePoints ?? 0,
  );

  const finalRevealAnimationSpeed = useGeneralStore(
    (s) => s.settings.finalRevealAnimationSpeed,
  );
  const finalRevealLinearAnimation = useGeneralStore(
    (s) => s.settings.finalRevealLinearAnimation,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const gradientBarRef = useRef<HTMLDivElement>(null);
  const fillBarRef = useRef<HTMLDivElement>(null);
  const markLineRef = useRef<HTMLDivElement>(null);
  const leaderCardRef = useRef<HTMLDivElement>(null);
  const leaderCardFlagRef = useRef<HTMLImageElement>(null);
  const leaderCardTextRef = useRef<HTMLDivElement>(null);
  const leaderBadgeRef = useRef<HTMLDivElement>(null);
  const leaderFlagRef = useRef<HTMLImageElement>(null);
  const leaderBadgePointsRef = useRef<HTMLSpanElement>(null);
  const leaderBadgeGoldOverlayRef = useRef<HTMLDivElement>(null);
  const lastCardRef = useRef<HTMLDivElement>(null);
  const lastCardFlagRef = useRef<HTMLImageElement>(null);
  const lastCardTextRef = useRef<HTMLDivElement>(null);
  const lastBadgeRef = useRef<HTMLDivElement>(null);
  const lastFlagRef = useRef<HTMLImageElement>(null);
  const lastBadgePointsRef = useRef<HTMLSpanElement>(null);
  const lastBadgeGoldOverlayRef = useRef<HTMLDivElement>(null);
  const needsCountdownRef = useRef<HTMLSpanElement>(null);

  const entranceDoneRef = useRef(false);
  const revealDoneRef = useRef(false);
  const pendingRevealPointsRef = useRef<number | null>(null);

  // Capture initial points at mount (before any reveal)
  const initialLeaderPointsRef = useRef(leaderCountry?.points ?? 0);
  const initialLastCountryPointsRef = useRef(lastCountry?.points ?? 0);

  // Keep animation setting values in refs so triggerRevealAnimation reads them
  // at call time without needing to be recreated when settings change.
  const finalRevealAnimationSpeedRef = useRef(finalRevealAnimationSpeed);

  finalRevealAnimationSpeedRef.current = finalRevealAnimationSpeed;

  const finalRevealLinearAnimationRef = useRef(finalRevealLinearAnimation);

  finalRevealLinearAnimationRef.current = finalRevealLinearAnimation;

  // Keep a stable ref to the callback so GSAP closures always call the latest version
  const onRevealCompleteRef = useRef(onRevealComplete);

  onRevealCompleteRef.current = onRevealComplete;

  // Label that replaces "Needs X pts to win" once the bar finishes rising
  const [receivedLabelPts, setReceivedLabelPts] = useState<number | null>(null);
  const setReceivedLabelPtsRef = useRef(setReceivedLabelPts);

  setReceivedLabelPtsRef.current = setReceivedLabelPts;

  const triggerRevealAnimation = useCallback(
    (receivedPoints: number) => {
      if (revealDoneRef.current) return;
      revealDoneRef.current = true;

      const isWinner = receivedPoints >= pointsNeeded;
      const cappedFillPct = Math.min((receivedPoints / pointsNeeded) * 70, 70);
      const initialLastPts = initialLastCountryPointsRef.current;
      const leaderPts = initialLeaderPointsRef.current;
      const finalLastPts = initialLastPts + receivedPoints;

      // Freeze the badge at the pre-reveal score immediately. The store update that
      // fires when televote is given causes a React re-render (badge shows final total)
      // before this callback runs. Overwriting here ensures the user sees the correct
      // starting value during the 0.5 s fill delay, with no backwards jump when GSAP starts.
      if (lastBadgePointsRef.current) {
        lastBadgePointsRef.current.textContent = String(initialLastPts);
      }

      const speed = finalRevealAnimationSpeedRef.current;
      const isLinear = finalRevealLinearAnimationRef.current;
      const phaseADuration = 9 / speed;
      const phaseBDuration = isWinner ? 0.9 / speed : 0;

      // --- Segment timing: equal thirds when linear, randomised otherwise
      const r1 = isLinear ? 1 / 3 : 0.2 + Math.random() * 0.1;
      const r2 = isLinear ? 1 / 3 : 0.4 + Math.random() * 0.2;
      const segDur1 = phaseADuration * r1;
      const segDur2 = phaseADuration * r2;
      const segDur3 = phaseADuration * (1 - r1 - r2);

      // --- Waypoints: evenly spaced when linear, randomised otherwise
      const pct1Ratio = isLinear ? 1 / 3 : 0.35 + Math.random() * 0.2;
      const pct2Ratio = isLinear ? 2 / 3 : 0.65 + Math.random() * 0.2;
      const segPct1 = cappedFillPct * pct1Ratio;
      const segPct2 = cappedFillPct * pct2Ratio;

      // --- Easing: constant speed when linear, randomised rhythm otherwise
      const pickEase = (arr: string[]) =>
        arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
      const ease1 = isLinear
        ? 'none'
        : pickEase(['power3.out', 'power4.out', 'expo.out', 'circ.out']);
      const ease2 = isLinear
        ? 'none'
        : pickEase(['none', 'power1.inOut', 'power1.out', 'sine.inOut']);
      const ease3 = isLinear
        ? 'none'
        : pickEase(['power2.in', 'power3.in', 'sine.in', 'power1.in']);

      // --- Count-up: waypoints mirror bar fill ratios exactly so they stay in sync
      const countEndA = isWinner ? leaderPts : finalLastPts;
      const countRange = countEndA - initialLastPts;
      const countWp1 = initialLastPts + countRange * pct1Ratio;
      const countWp2 = initialLastPts + countRange * pct2Ratio;
      const countObjA = { value: initialLastPts };
      const updateCountA = () => {
        if (lastBadgePointsRef.current) {
          lastBadgePointsRef.current.textContent = String(
            Math.round(countObjA.value),
          );
        }
      };

      // --- Needs countdown: label counts down with the same easing
      const targetNeeds = Math.max(0, pointsNeeded - receivedPoints);
      const needsRange = pointsNeeded - targetNeeds;
      const needsWp1 = pointsNeeded - needsRange * pct1Ratio;
      const needsWp2 = pointsNeeded - needsRange * pct2Ratio;
      const needsCountObj = { value: pointsNeeded };
      const updateNeedsCount = () => {
        if (needsCountdownRef.current) {
          needsCountdownRef.current.textContent = String(
            Math.round(needsCountObj.value),
          );
        }
      };

      const fillDelay = 1;

      // Swap label 300 ms after phase 2a finishes (accounting for fill delay)
      setTimeout(() => {
        setReceivedLabelPtsRef.current(receivedPoints);
      }, (phaseADuration + fillDelay) * 1000 + 300);

      const tl = gsap.timeline({
        delay: fillDelay,
        onComplete: () => {
          onRevealCompleteRef.current();
        },
      });

      // Phase 2a — fill + badge + count-up + needs-countdown, three segments
      tl.to(fillBarRef.current, {
        height: `${segPct1}%`,
        duration: segDur1,
        ease: ease1,
      })
        .to(
          lastBadgeRef.current,
          { bottom: `${segPct1}%`, duration: segDur1, ease: ease1 },
          '<',
        )
        .to(
          countObjA,
          {
            value: countWp1,
            duration: segDur1,
            ease: ease1,
            onUpdate: updateCountA,
          },
          '<',
        )
        .to(
          needsCountObj,
          {
            value: needsWp1,
            duration: segDur1,
            ease: ease1,
            onUpdate: updateNeedsCount,
          },
          '<',
        )
        .to(fillBarRef.current, {
          height: `${segPct2}%`,
          duration: segDur2,
          ease: ease2,
        })
        .to(
          lastBadgeRef.current,
          { bottom: `${segPct2}%`, duration: segDur2, ease: ease2 },
          '<',
        )
        .to(
          countObjA,
          {
            value: countWp2,
            duration: segDur2,
            ease: ease2,
            onUpdate: updateCountA,
          },
          '<',
        )
        .to(
          needsCountObj,
          {
            value: needsWp2,
            duration: segDur2,
            ease: ease2,
            onUpdate: updateNeedsCount,
          },
          '<',
        )
        .to(fillBarRef.current, {
          height: `${cappedFillPct}%`,
          duration: segDur3,
          ease: ease3,
        })
        .to(
          lastBadgeRef.current,
          { bottom: `${cappedFillPct}%`, duration: segDur3, ease: ease3 },
          '<',
        )
        .to(
          countObjA,
          {
            value: countEndA,
            duration: segDur3,
            ease: ease3,
            onUpdate: updateCountA,
          },
          '<',
        )
        .to(
          needsCountObj,
          {
            value: targetNeeds,
            duration: segDur3,
            ease: ease3,
            onUpdate: updateNeedsCount,
          },
          '<',
        );

      if (!isWinner) {
        // Leader holds on — gold flash on the leader badge
        tl.to(leaderBadgeGoldOverlayRef.current, {
          opacity: 1,
          duration: 0.35,
          ease: 'power2.out',
          delay: 1,
        }).to(
          leaderBadgePointsRef.current,
          { color: '#000', duration: 0.25, ease: 'none' },
          '<',
        );
      }

      if (isWinner) {
        const newGradientPct = (leaderPts / finalLastPts) * 70;
        const countObjB = { value: leaderPts };
        const updateCountB = () => {
          if (lastBadgePointsRef.current) {
            lastBadgePointsRef.current.textContent = String(
              Math.round(countObjB.value),
            );
          }
        };

        // Label end of phase 2a so we can position the gold badge relative to it
        tl.addLabel('phase2aEnd');

        // Phase 2b — dramatic effects start immediately, no pause after phase 2a
        tl.to(gradientBarRef.current, {
          height: `${newGradientPct}%`,
          duration: phaseBDuration,
          ease: 'power3.in',
        })
          .to(
            leaderBadgeRef.current,
            {
              bottom: `${newGradientPct + 4}%`,
              duration: phaseBDuration,
              ease: 'power3.in',
            },
            '<',
          )
          .to(
            markLineRef.current,
            {
              bottom: `${newGradientPct}%`,
              duration: phaseBDuration,
              ease: 'power3.in',
            },
            '<',
          )
          .to(
            fillBarRef.current,
            { height: '82%', duration: 0.5, ease: 'power3.out' },
            '<0.1',
          )
          .to(
            lastBadgeRef.current,
            { bottom: '82%', duration: 0.5, ease: 'power3.out' },
            '<',
          )
          .to(
            countObjB,
            {
              value: finalLastPts,
              duration: 0.5,
              ease: 'power3.out',
              onUpdate: updateCountB,
            },
            '<',
          )
          // Gold badge flash — 1 s after phase 2a ended, overlapping with the tail of phase 2b
          .to(
            lastBadgeGoldOverlayRef.current,
            { opacity: 1, duration: 0.35, ease: 'power2.out' },
            'phase2aEnd+=1',
          )
          .to(
            lastBadgePointsRef.current,
            { color: '#000', duration: 0.25, ease: 'none' },
            '<',
          );
      }
    },
    [pointsNeeded],
  );

  // Keep a stable ref so the GSAP entrance-timeline onComplete can call the latest version
  const triggerRevealAnimationRef = useRef(triggerRevealAnimation);

  triggerRevealAnimationRef.current = triggerRevealAnimation;

  // Entrance animation — runs once on mount
  useGSAP(
    () => {
      gsap.set(leaderCardRef.current, { opacity: 0, x: -40 });
      gsap.set(leaderCardFlagRef.current, { opacity: 0, y: 14, scale: 0.88 });
      gsap.set(leaderCardTextRef.current, { opacity: 0, y: 10 });
      gsap.set(lastCardRef.current, { opacity: 0, x: 40 });
      gsap.set(lastCardFlagRef.current, { opacity: 0, y: 14, scale: 0.88 });
      gsap.set(lastCardTextRef.current, { opacity: 0, y: 10 });
      gsap.set(leaderBadgeRef.current, {
        opacity: 0,
        xPercent: -70,
        x: -16,
        yPercent: 50,
        bottom: '3.5%',
      });
      gsap.set(leaderFlagRef.current, { scale: 0 });
      gsap.set(lastBadgeRef.current, {
        opacity: 0,
        xPercent: 70,
        x: 16,
        yPercent: 50,
        bottom: '3.5%',
      });
      gsap.set(lastFlagRef.current, { scale: 0 });
      gsap.set(gradientBarRef.current, { height: 0 });
      gsap.set(fillBarRef.current, { height: 0 });
      gsap.set(markLineRef.current, {
        scaleX: 0,
        transformOrigin: 'left center',
        bottom: '70%',
      });

      const tl = gsap.timeline({
        onComplete: () => {
          entranceDoneRef.current = true;
          if (pendingRevealPointsRef.current !== null) {
            triggerRevealAnimationRef.current(pendingRevealPointsRef.current);
            pendingRevealPointsRef.current = null;
          }
        },
      });

      const initialDelay = 1;

      // Cards + their content enter before the badge/bar sequence
      tl.to(
        leaderCardRef.current,
        { opacity: 1, x: 0, duration: 0.55, ease: 'power2.out' },
        0.1,
      )
        .to(
          lastCardRef.current,
          { opacity: 1, x: 0, duration: 0.55, ease: 'power2.out' },
          0.2,
        )
        .to(
          leaderCardFlagRef.current,
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' },
          0.4,
        )
        .to(
          lastCardFlagRef.current,
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power2.out' },
          0.5,
        )
        .to(
          leaderCardTextRef.current,
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
          0.55,
        )
        .to(
          lastCardTextRef.current,
          { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
          0.65,
        );

      // Badge + bar sequence
      tl.to(
        leaderBadgeRef.current,
        { opacity: 1, x: 0, duration: 0.4 },
        initialDelay,
      )
        .to(
          leaderFlagRef.current,
          { scale: 1, duration: 0.6 },
          initialDelay + 0.3,
        )
        .to(
          gradientBarRef.current,
          { height: '70%', duration: 1.7, ease: 'power2.out' },
          initialDelay + 1.2,
        )
        .to(
          leaderBadgeRef.current,
          { bottom: '74%', duration: 1.7, ease: 'power2.out' },
          initialDelay + 1.2,
        )
        .to(
          lastBadgeRef.current,
          { opacity: 1, x: 0, duration: 0.4 },
          initialDelay + 3.5,
        )
        .to(
          lastFlagRef.current,
          { scale: 1, duration: 0.6 },
          initialDelay + 4.1,
        )
        .to(
          markLineRef.current,
          { scaleX: 1, duration: 0.4 },
          initialDelay + 4.6,
        );

      return () => {
        tl.kill();
      };
    },
    { scope: containerRef, dependencies: [] },
  );

  // Watch for last country receiving their televote points
  useEffect(() => {
    if (!lastCountryFinished) return;

    if (entranceDoneRef.current) {
      triggerRevealAnimation(lastCountryTelevotePoints);
    } else {
      pendingRevealPointsRef.current = lastCountryTelevotePoints;
    }
  }, [lastCountryFinished, lastCountryTelevotePoints, triggerRevealAnimation]);

  return {
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
  };
};
