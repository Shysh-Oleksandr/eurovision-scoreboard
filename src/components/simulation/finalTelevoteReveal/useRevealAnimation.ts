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

  const pendingFinalRevealTelevote = useScoreboardStore(
    (state) => state.pendingFinalRevealTelevote,
  );
  const commitPendingFinalRevealTelevote = useScoreboardStore(
    (state) => state.commitPendingFinalRevealTelevote,
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

      // --- Segment plan: equal thirds when linear, fully randomised otherwise
      const countEndA = isWinner ? leaderPts : finalLastPts;
      const targetNeeds = Math.max(0, pointsNeeded - receivedPoints);

      type SegmentPlan = {
        duration: number;
        fillEnd: number;
        countEnd: number;
        needsEnd: number;
        ease: string;
      };

      let segments: SegmentPlan[];

      if (isLinear) {
        const dur = phaseADuration / 3;
        segments = [1 / 3, 2 / 3, 1].map((ratio) => ({
          duration: dur,
          fillEnd: cappedFillPct * ratio,
          countEnd: initialLastPts + (countEndA - initialLastPts) * ratio,
          needsEnd: pointsNeeded - (pointsNeeded - targetNeeds) * ratio,
          ease: 'none',
        }));
      } else {
        const EASING_POOL = [
          'power1.in',
          'power1.out',
          'power1.inOut',
          'power2.in',
          'power2.out',
          'power2.inOut',
          'power3.in',
          'power3.out',
          'power3.inOut',
          'power4.in',
          'power4.out',
          'expo.in',
          'expo.out',
          'sine.in',
          'sine.out',
          'sine.inOut',
          'circ.out',
          'none',
        ];
        const SEG_COUNT_WEIGHTS = [2, 3, 3, 4, 4, 5];
        const segCount =
          SEG_COUNT_WEIGHTS[
            Math.floor(Math.random() * SEG_COUNT_WEIGHTS.length)
          ]!;

        // Durations: random values normalised to phaseADuration, with 8% minimum floor
        const rawDurs = Array.from(
          { length: segCount },
          () => 0.2 + Math.random() * 0.8,
        );
        const rawTotal = rawDurs.reduce((s, v) => s + v, 0);
        const minDur = phaseADuration * 0.08;
        const floored = rawDurs.map((d) =>
          Math.max((d / rawTotal) * phaseADuration, minDur),
        );
        const floeredTotal = floored.reduce((s, v) => s + v, 0);
        const finalDurations = floored.map(
          (d) => (d / floeredTotal) * phaseADuration,
        );

        // Waypoints: segCount-1 random ratios sorted ascending, then append 1.0
        const midRatios = Array.from({ length: segCount - 1 }, () =>
          Math.random(),
        ).sort((a, b) => a - b);
        const ratios = [...midRatios, 1.0];

        segments = ratios.map((ratio, i) => ({
          duration: finalDurations[i]!,
          fillEnd: cappedFillPct * ratio,
          countEnd: initialLastPts + (countEndA - initialLastPts) * ratio,
          needsEnd: pointsNeeded - (pointsNeeded - targetNeeds) * ratio,
          ease:
            EASING_POOL[Math.floor(Math.random() * EASING_POOL.length)] ??
            'none',
        }));
      }

      const countObjA = { value: initialLastPts };
      const updateCountA = () => {
        if (lastBadgePointsRef.current) {
          lastBadgePointsRef.current.textContent = String(
            Math.round(countObjA.value),
          );
        }
      };

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

      // Phase 2a — fill + badge + count-up + needs-countdown, N randomised segments
      for (const seg of segments) {
        tl.to(fillBarRef.current, {
          height: `${seg.fillEnd}%`,
          duration: seg.duration,
          ease: seg.ease,
        })
          .to(
            lastBadgeRef.current,
            {
              bottom: `${seg.fillEnd}%`,
              duration: seg.duration,
              ease: seg.ease,
            },
            '<',
          )
          .to(
            countObjA,
            {
              value: seg.countEnd,
              duration: seg.duration,
              ease: seg.ease,
              onUpdate: updateCountA,
            },
            '<',
          )
          .to(
            needsCountObj,
            {
              value: seg.needsEnd,
              duration: seg.duration,
              ease: seg.ease,
              onUpdate: updateNeedsCount,
            },
            '<',
          );
      }

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

      // Badge points are updated imperatively (GSAP onUpdate + triggerRevealAnimation)
      // so store-driven re-renders never flash the post-televote total before the
      // reveal animation starts.
      if (leaderBadgePointsRef.current) {
        leaderBadgePointsRef.current.textContent = String(
          initialLeaderPointsRef.current,
        );
      }
      if (lastBadgePointsRef.current) {
        lastBadgePointsRef.current.textContent = String(
          initialLastCountryPointsRef.current,
        );
      }

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

  // The panel only mounts once the reveal is triggered, so it is now safe to
  // apply the last country's televote points that `giveTelevotePoints` buffered
  // (deferred so the board never spoils them). Committing here drives the reveal:
  // the watch effect below then picks up the points and plays the animation.
  // Handles both a buffer set before the panel mounted ("Random" spam during the
  // trigger delay) and one set after (awarding the last country while up).
  useEffect(() => {
    if (pendingFinalRevealTelevote) {
      commitPendingFinalRevealTelevote();
    }
  }, [pendingFinalRevealTelevote, commitPendingFinalRevealTelevote]);

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
