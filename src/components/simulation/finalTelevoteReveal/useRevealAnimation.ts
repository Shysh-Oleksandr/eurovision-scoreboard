'use client';
import gsap from 'gsap';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import { BADGE_REST_PCT, MARK_PCT } from './constants';
import {
  evaluateRevealPath,
  planRevealPath,
  revealPathDuration,
} from './revealPath';
import { FinalTelevoteRevealProps } from './types';

import {
  createHapticHeartbeat,
  playHaptic,
  type HapticHeartbeat,
} from '@/native/haptics';
import { useGeneralStore } from '@/state/generalStore';
import { useScoreboardStore } from '@/state/scoreboardStore';

/** After a loss's verdict, the leader's badge turns gold this much later. */
const LOSS_FLASH_DELAY = 0.45;

/**
 * Owns every ref and the full GSAP choreography for the reveal panel:
 * the entrance timeline, the points-driven reveal timeline (phases 2a/2b),
 * and the effect that watches for the last country's televote points.
 *
 * Returns the refs (to be attached by the presentational components) plus the
 * derived `receivedLabelPts` state (set once the outcome is shown).
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

  // Haptics: a heartbeat through phase 2a that speeds up as the last
  // country nears the mark (0 at the start, 1 at the points needed).
  const closenessRef = useRef(0);
  const heartbeatRef = useRef<HapticHeartbeat | null>(null);
  const revealTimelineRef = useRef<gsap.core.Timeline | null>(null);

  // The reveal timeline is built outside useGSAP (it starts when the points
  // arrive), so kill it here: an undo mid-reveal must not complete it later.
  useEffect(() => {
    return () => {
      revealTimelineRef.current?.kill();
      revealTimelineRef.current = null;
      heartbeatRef.current?.stop();
      heartbeatRef.current = null;
    };
  }, []);

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

      const initialLastPts = initialLastCountryPointsRef.current;
      const leaderPts = initialLeaderPointsRef.current;
      const finalLastPts = initialLastPts + receivedPoints;

      // The climb is planned without the result (see revealPath.ts), so the
      // fill's pace, beats and crawl are the same whoever wins.
      const { path, isWinner, verdictHold } = planRevealPath({
        pointsNeeded,
        receivedPoints,
        speed: finalRevealAnimationSpeedRef.current,
        linear: finalRevealLinearAnimationRef.current,
      });
      const climbDuration = revealPathDuration(path);
      const outcomeAt = isWinner ? climbDuration : climbDuration + verdictHold;

      // Freeze the badge at the pre-reveal score immediately. The store update that
      // fires when televote is given causes a React re-render (badge shows final total)
      // before this callback runs. Overwriting here ensures the user sees the correct
      // starting value during the fill delay, with no backwards jump when GSAP starts.
      if (lastBadgePointsRef.current) {
        lastBadgePointsRef.current.textContent = String(initialLastPts);
      }

      // Phase 2a: one cursor drives the fill, the badge, the count and the
      // "Needs X" countdown from the same value, so they can't drift apart.
      const setFillHeight = fillBarRef.current
        ? gsap.quickSetter(fillBarRef.current, 'height', '%')
        : null;
      const setBadgeBottom = lastBadgeRef.current
        ? gsap.quickSetter(lastBadgeRef.current, 'bottom', '%')
        : null;
      let shownGained = -1;
      const renderClimb = (value: number) => {
        const fillPct = value * MARK_PCT;

        setFillHeight?.(fillPct);
        // The badge starts a little above the empty bar and joins the fill's
        // top over the first fifth of the climb.
        setBadgeBottom?.(
          fillPct + BADGE_REST_PCT * Math.max(0, 1 - value / 0.2),
        );
        closenessRef.current = value;

        // Whole points only: the count passes the leader exactly at the mark.
        const gained = Math.min(
          pointsNeeded,
          Math.floor(value * pointsNeeded + 1e-6),
        );

        if (gained === shownGained) return;
        shownGained = gained;
        if (lastBadgePointsRef.current) {
          lastBadgePointsRef.current.textContent = String(
            initialLastPts + gained,
          );
        }
        if (needsCountdownRef.current) {
          needsCountdownRef.current.textContent = String(pointsNeeded - gained);
        }
      };
      const cursor = { t: 0 };

      const fillDelay = 1;

      revealTimelineRef.current?.kill();

      const tl = gsap.timeline({
        delay: fillDelay,
        onComplete: () => {
          onRevealCompleteRef.current();
        },
      });

      revealTimelineRef.current = tl;

      if (climbDuration > 0) {
        tl.to(cursor, {
          t: climbDuration,
          duration: climbDuration,
          ease: 'none',
          onUpdate: () => renderClimb(evaluateRevealPath(path, cursor.t).value),
        });
      }

      // The moment the result is certain: the crossing for a winner; for a
      // loser, the end of a still hold longer than any beat, as until then
      // the stop could have been a pause.
      tl.addLabel('revealOutcome', outcomeAt);

      if (!isWinner) {
        tl.call(
          () => setReceivedLabelPtsRef.current(receivedPoints),
          undefined,
          'revealOutcome',
        )
          // Leader holds on — gold flash on the leader badge
          .to(
            leaderBadgeGoldOverlayRef.current,
            { opacity: 1, duration: 0.35, ease: 'power2.out' },
            `revealOutcome+=${LOSS_FLASH_DELAY}`,
          )
          .to(
            leaderBadgePointsRef.current,
            { color: '#000', duration: 0.25, ease: 'none' },
            '<',
          );
      }

      if (isWinner) {
        const phaseBDuration = 0.9 / finalRevealAnimationSpeedRef.current;
        const newGradientPct = (leaderPts / finalLastPts) * MARK_PCT;
        const countObjB = { value: initialLastPts + pointsNeeded };
        const updateCountB = () => {
          if (lastBadgePointsRef.current) {
            lastBadgePointsRef.current.textContent = String(
              Math.round(countObjB.value),
            );
          }
        };

        // Phase 2b — the surge starts as the fill crosses the mark
        tl.to(
          gradientBarRef.current,
          {
            height: `${newGradientPct}%`,
            duration: phaseBDuration,
            ease: 'power3.in',
          },
          'revealOutcome',
        )
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
          .fromTo(
            fillBarRef.current,
            { height: `${MARK_PCT}%` },
            {
              height: '82%',
              duration: 0.5,
              ease: 'power3.out',
              immediateRender: false,
            },
            '<0.1',
          )
          .fromTo(
            lastBadgeRef.current,
            { bottom: `${MARK_PCT}%` },
            {
              bottom: '82%',
              duration: 0.5,
              ease: 'power3.out',
              immediateRender: false,
            },
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
          .call(
            () => setReceivedLabelPtsRef.current(receivedPoints),
            undefined,
            'revealOutcome+=0.3',
          )
          // Gold badge flash — 1 s after the crossing, overlapping the tail of phase 2b
          .to(
            lastBadgeGoldOverlayRef.current,
            { opacity: 1, duration: 0.35, ease: 'power2.out' },
            'revealOutcome+=1',
          )
          .to(
            lastBadgePointsRef.current,
            { color: '#000', duration: 0.25, ease: 'none' },
            '<',
          );
      }

      // Haptics, placed at absolute positions inside the timeline so they
      // never lengthen it: the heartbeat through the climb and any hold
      // (a stop must not feel final before the verdict), then the outcome
      // (crossing + surge, or falling short) and the gold flash on whoever won.
      heartbeatRef.current?.stop();
      closenessRef.current = 0;
      heartbeatRef.current = createHapticHeartbeat(() => closenessRef.current);
      tl.call(() => heartbeatRef.current?.start(), undefined, 0);
      tl.call(
        () => {
          heartbeatRef.current?.stop();
          playHaptic({ id: isWinner ? 'revealCross' : 'revealFall' });
        },
        undefined,
        'revealOutcome',
      );
      tl.call(
        () => playHaptic({ id: isWinner ? 'revealWinnerFlash' : 'revealHold' }),
        undefined,
        isWinner ? 'revealOutcome+=1' : `revealOutcome+=${LOSS_FLASH_DELAY}`,
      );
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
        bottom: `${BADGE_REST_PCT}%`,
      });
      gsap.set(lastFlagRef.current, { scale: 0 });
      gsap.set(gradientBarRef.current, { height: 0 });
      gsap.set(fillBarRef.current, { height: 0 });
      gsap.set(markLineRef.current, {
        scaleX: 0,
        transformOrigin: 'left center',
        bottom: `${MARK_PCT}%`,
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
          { height: `${MARK_PCT}%`, duration: 1.7, ease: 'power2.out' },
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
