'use client';
import gsap from 'gsap';
import { RefObject, useEffect, useRef, useState } from 'react';

import { useGSAP } from '@gsap/react';

import {
  BODY_TUCK,
  CAP_W,
  DOT_SHIFT,
  DOT_W,
  FLAG_W,
  HEARTBEAT_FROM,
  INTRO,
  LEADER_TAG_FADE_S,
  MOVE_S,
  RING_HIDE_S,
  RING_POP_DELAY_S,
  RING_POP_S,
  SETTLE_S,
  SWAP_S,
  TAG_H,
  TAG_MASK_H,
  TAG_RISE_S,
  TAG_SINK_S,
  WINNER_TAG_RISE_S,
} from './ladderConstants';
import { climbAt, planLadderCount } from './ladderPacing';
import type { LadderSideRefs } from './LadderParts';
import type { LadderLayout } from './useLadderLayout';

import { playHaptic } from '@/native/haptics';
import { useGeneralStore } from '@/state/generalStore';
import {
  FinalRevealPlaces,
  placeAtPoints,
} from '@/state/scoreboard/finalRevealPlaces';
import { createCountriesComparator } from '@/state/scoreboard/helpers';
import { useScoreboardStore } from '@/state/scoreboardStore';

/**
 * A tag pushed down under its pill's top edge (its mask hides it), a little
 * further than the mask so no antialiased hairline shows at the edge.
 */
const TAG_HIDDEN = (TAG_MASK_H / TAG_H) * 100 + 6;
/** The dot's centre, 30 u outwards from the cap's inner end. */
const DOT_CENTRE = 30;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Writes a number into an element without replacing React's text node, so
 * React never finds its node gone (the count runs 60 times a second here,
 * not through state).
 */
const setText = (el: HTMLElement | null, text: string) => {
  if (!el) return;
  const node = el.firstChild;

  if (node && node.nodeType === Node.TEXT_NODE && !node.nextSibling) {
    (node as Text).data = text;
  } else {
    el.textContent = text;
  }
};

const parseRgb = (color: string): [number, number, number, number] | null => {
  const match = color.match(/rgba?\(([^)]+)\)/);

  if (!match) return null;
  const [r, g, b, a = '1'] = match[1].split(/[\s,/]+/).filter(Boolean);

  return [Number(r), Number(g), Number(b), Number(a)];
};

/** Halfway between two computed colours (the letters' orange glow). */
const mixColors = (a: string, b: string) => {
  const ca = parseRgb(a);
  const cb = parseRgb(b);

  if (!ca || !cb) return b;
  const mix = (i: number) => Math.round((ca[i] + cb[i]) / 2);

  return `rgb(${mix(0)}, ${mix(1)}, ${mix(2)})`;
};

interface Options {
  rootRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<HTMLDivElement | null>;
  toWinNumRef: RefObject<HTMLSpanElement | null>;
  leader: LadderSideRefs;
  last: LadderSideRefs;
  places: FinalRevealPlaces;
  layout: LadderLayout;
  /** Desktop website: motion blur and soft-focus effects. */
  useBlur: boolean;
  leaderBlurId: string;
  lastBlurId: string;
  onRevealComplete: () => void;
}

/**
 * The ladder's whole choreography (docs/final-reveal-ladder-spec.md §4–§6):
 * the intro, then the count that climbs the last country up the places, the
 * heartbeat on its chip, and the swap or the leader's confirmation.
 *
 * Counts and places are written straight into the DOM from GSAP, never
 * through React state, so nothing re-renders per tick. Everything is created
 * inside the useGSAP context (or through `contextSafe`), so unmounting (undo,
 * View scoreboard, a new stage) kills every tween and delayed call.
 */
export const useLadderRevealAnimation = ({
  rootRef,
  trackRef,
  toWinNumRef,
  leader,
  last,
  places,
  layout,
  useBlur,
  leaderBlurId,
  lastBlurId,
  onRevealComplete,
}: Options) => {
  const lastCountryCode = places.lastCode;
  const lastFinished = useScoreboardStore(
    (state) =>
      state.getCurrentStage()?.countries.find((c) => c.code === lastCountryCode)
        ?.isVotingFinished ?? false,
  );
  const lastPoints = useScoreboardStore(
    (state) =>
      state.getCurrentStage()?.countries.find((c) => c.code === lastCountryCode)
        ?.points ?? 0,
  );
  const pendingFinalRevealTelevote = useScoreboardStore(
    (state) => state.pendingFinalRevealTelevote,
  );
  const commitPendingFinalRevealTelevote = useScoreboardStore(
    (state) => state.commitPendingFinalRevealTelevote,
  );

  // Read when the count starts, so changing them never rebuilds anything.
  const speedRef = useRef(1);
  const linearRef = useRef(false);

  speedRef.current = useGeneralStore(
    (s) => s.settings.finalRevealAnimationSpeed,
  );
  linearRef.current = useGeneralStore(
    (s) => s.settings.finalRevealLinearAnimation,
  );

  const onRevealCompleteRef = useRef(onRevealComplete);

  onRevealCompleteRef.current = onRevealComplete;

  const layoutRef = useRef(layout);

  layoutRef.current = layout;

  const reducedMotionRef = useRef(false);
  const entranceDoneRef = useRef(false);
  const pendingFinalPointsRef = useRef<number | null>(null);
  const revealStartedRef = useRef(false);
  const completedRef = useRef(false);
  const shownRef = useRef(places.startPoints);
  const placeRef = useRef(places.startPlace);
  const retractedRef = useRef(false);
  const swappedRef = useRef(false);
  const heartbeatRef = useRef<{
    on: boolean;
    call: gsap.core.Tween | null;
  }>({ on: false, call: null });
  /** How far the climb is to the mark (0–1): drives the heartbeat. */
  const climbRef = useRef(0);
  const ringHopsRef = useRef<
    Partial<Record<'leader' | 'last', gsap.core.Timeline>>
  >({});

  // Start the intro once the fit has settled for a few frames: the desktop
  // board re-zooms right after the panel mounts, and the hidden offsets are
  // in px.
  const [introGo, setIntroGo] = useState(false);

  useEffect(() => {
    if (!layout.ready || introGo) return undefined;
    let frames = 0;
    let raf = requestAnimationFrame(function wait() {
      frames += 1;
      if (frames >= 5) setIntroGo(true);
      else raf = requestAnimationFrame(wait);
    });

    return () => cancelAnimationFrame(raf);
  }, [layout.ready, introGo]);

  const { contextSafe } = useGSAP({ scope: rootRef });

  /** Micro-animations run twice as fast under reduced motion. */
  const micro = (seconds: number) =>
    reducedMotionRef.current ? seconds / 2 : seconds;
  const blur = (units: number) =>
    useBlur ? `blur(${units * layoutRef.current.u}px)` : 'none';

  const complete = contextSafe(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onRevealCompleteRef.current();
  });

  /** Places in the committed standings (the board's own order). */
  const committedPlaces = () => {
    const stage = useScoreboardStore.getState().getCurrentStage();

    if (!stage) return null;
    const order = stage.countries
      .slice()
      .sort(createCountriesComparator(stage.runningOrder))
      .map((c) => c.code);

    return {
      last: order.indexOf(places.lastCode) + 1,
      leader: order.indexOf(places.leaderCode) + 1,
    };
  };

  /** The ring leaves its old row and pops onto the new one (§6.4). */
  const hopRing = contextSafe(
    (key: 'leader' | 'last', place: number, popDelay = RING_POP_DELAY_S) => {
      const refs = key === 'leader' ? leader : last;
      const pop = refs.ringPop.current;
      const wrap = refs.ringWrap.current;

      if (!pop || !wrap) return;
      ringHopsRef.current[key]?.kill();
      ringHopsRef.current[key] = gsap
        .timeline()
        .to(pop, {
          opacity: 0,
          scale: 0.85,
          duration: micro(RING_HIDE_S),
          ease: 'power1.in',
        })
        .set(wrap, { '--place': place })
        .fromTo(
          pop,
          { scale: 0.6 },
          { scale: 1, duration: micro(RING_POP_S), ease: 'back.out(2)' },
          micro(popDelay),
        )
        .to(
          pop,
          { opacity: 1, duration: micro(0.06), ease: 'none' },
          micro(popDelay),
        );
    },
  );

  const moveLast = contextSafe((place: number) => {
    placeRef.current = place;
    gsap.to(last.group.current, {
      '--place': place,
      duration: micro(MOVE_S),
      ease: 'power2.inOut',
      overwrite: 'auto',
    });
    hopRing('last', place);
    playHaptic({
      id: 'revealClimb',
      closeness:
        places.startPlace > 2 ? 1 - (place - 2) / (places.startPlace - 2) : 1,
    });
  });

  /** The TO WIN tag sinks back into the pill (§6.7). */
  const retractToWin = contextSafe((delay = 0.05) => {
    if (retractedRef.current) return;
    retractedRef.current = true;
    gsap.to(last.tag.current, {
      yPercent: TAG_HIDDEN,
      duration: micro(TAG_SINK_S),
      ease: 'power2.in',
      delay,
    });
  });

  const beat = contextSafe(() => {
    const heartbeat = heartbeatRef.current;

    if (!heartbeat.on) return;
    // Faster and stronger the nearer the climb is to the mark. It follows the
    // climb, which is the same whoever wins, so it never hints at the result.
    const near = clamp01(
      (climbRef.current - HEARTBEAT_FROM) / (1 - HEARTBEAT_FROM),
    );
    const period = gsap.utils.interpolate(0.53, 0.29, near);
    const intensity = gsap.utils.interpolate(0.4, 1, near);
    const up = period * 0.4;
    const down = period * 0.5;
    const flash = last.flash.current;
    const glow = last.glow.current;
    const pulse = last.ringPulse.current;

    gsap
      .timeline()
      .to(flash, { opacity: 0.45 * intensity, duration: up, ease: 'sine.out' })
      .to(glow, { opacity: intensity, duration: up, ease: 'sine.out' }, 0)
      .to(
        pulse,
        { scale: 1 + 0.05 * intensity, duration: up, ease: 'sine.out' },
        0,
      )
      .to([flash, glow], { opacity: 0, duration: down, ease: 'sine.in' }, up)
      .to(pulse, { scale: 1, duration: down, ease: 'sine.in' }, up);
    playHaptic({ id: 'revealBeat', closeness: intensity });
    heartbeat.call = gsap.delayedCall(period, beat);
  });

  const startHeartbeat = contextSafe(() => {
    const heartbeat = heartbeatRef.current;

    if (heartbeat.on || swappedRef.current) return;
    heartbeat.on = true;
    beat();
  });

  const stopHeartbeat = contextSafe(() => {
    const heartbeat = heartbeatRef.current;

    heartbeat.on = false;
    heartbeat.call?.kill();
    heartbeat.call = null;
    gsap.to([last.flash.current, last.glow.current], {
      opacity: 0,
      duration: 0.12,
      overwrite: true,
    });
    gsap.to(last.ringPulse.current, {
      scale: 1,
      duration: 0.12,
      overwrite: true,
    });
  });

  /** Fades the CURRENT LEADER tag where it is (it rides with its pill). */
  const fadeLeaderTag = contextSafe((delay = 0) => {
    gsap.to(leader.tag.current, {
      opacity: 0,
      filter: blur(6),
      duration: micro(LEADER_TAG_FADE_S),
      ease: 'power1.out',
      delay,
    });
  });

  /** The last country overtakes: the pills swap places (§6.6). */
  const swap = contextSafe(() => {
    if (swappedRef.current) return;
    stopHeartbeat();
    swappedRef.current = true;
    retractToWin(0);

    const committed = committedPlaces();
    const lastPlace = committed?.last || 1;
    const leaderPlace = committed?.leader || 2;
    const swapTween = {
      duration: micro(SWAP_S),
      ease: 'back.out(1.4)',
      overwrite: 'auto' as const,
    };

    placeRef.current = lastPlace;
    gsap.to(last.group.current, { '--place': lastPlace, ...swapTween });
    gsap.to(leader.group.current, { '--place': leaderPlace, ...swapTween });
    fadeLeaderTag();
    hopRing('leader', leaderPlace, 0.18);
    hopRing('last', lastPlace, 0.18);
    gsap.fromTo(
      last.winnerTag.current,
      { yPercent: TAG_HIDDEN },
      {
        yPercent: 0,
        duration: micro(WINNER_TAG_RISE_S),
        ease: 'power3.out',
        delay: micro(0.08),
      },
    );
    playHaptic({ id: 'revealCross' });
    gsap.delayedCall(micro(SWAP_S), () =>
      playHaptic({ id: 'revealWinnerFlash' }),
    );
  });

  /** The ladder never ends on a wrong place (§6.10). */
  const reconcile = contextSafe(() => {
    const committed = committedPlaces();

    if (committed?.last && committed.last !== placeRef.current) {
      moveLast(committed.last);
    }
  });

  /** The last country stops short (or ties and loses): §6.8. */
  const resolveNoWin = contextSafe(() => {
    stopHeartbeat();
    retractToWin(0);
    reconcile();
    fadeLeaderTag(micro(0.1));
    gsap.fromTo(
      leader.winnerTag.current,
      { yPercent: TAG_HIDDEN },
      {
        yPercent: 0,
        duration: micro(WINNER_TAG_RISE_S),
        ease: 'power3.out',
        delay: micro(0.18),
      },
    );
    gsap
      .timeline({ delay: micro(0.1) })
      .to(leader.ringPop.current, {
        scale: 1.12,
        duration: micro(0.12),
        ease: 'power2.out',
      })
      .to(leader.ringPop.current, {
        scale: 1,
        duration: micro(0.18),
        ease: 'back.out(2)',
      });
    gsap.delayedCall(micro(0.18), () => playHaptic({ id: 'revealHold' }));
    gsap.delayedCall(0.8, complete);
  });

  /** One tick of the count: digits, the TO WIN number and the place. */
  const showCount = (n: number) => {
    if (n === shownRef.current) return;
    shownRef.current = n;
    setText(last.points.current, String(n));

    const toWin = places.winAt - n;

    if (toWin >= 1) {
      setText(toWinNumRef.current, String(toWin));
    } else {
      retractToWin();
    }

    if (swappedRef.current) return;
    // First place only comes with the swap.
    const place = Math.max(2, placeAtPoints(places, n));

    if (place !== placeRef.current) moveLast(place);
  };

  const triggerReveal = contextSafe((finalPoints: number) => {
    if (revealStartedRef.current) return;
    revealStartedRef.current = true;

    const plan = planLadderCount({
      startPoints: places.startPoints,
      finalPoints,
      winAt: places.winAt,
      speed: speedRef.current,
      linear: linearRef.current,
    });
    const clock = { t: 0 };
    const counter = { v: places.startPoints };

    // The store already holds the final total; the cap keeps the start.
    shownRef.current = places.startPoints;
    setText(last.points.current, String(places.startPoints));

    // A beat to let the column fold away (or the sheet leave) first.
    const tl = gsap.timeline({ delay: SETTLE_S });

    // The climb: the Bar style's result-blind path, in points.
    if (plan.climbEndAt > 0) {
      tl.to(
        clock,
        {
          t: plan.climbEndAt,
          duration: plan.climbEndAt,
          ease: 'none',
          onUpdate: () => {
            const climb = climbAt(plan, clock.t);

            climbRef.current = climb;
            if (climb >= HEARTBEAT_FROM) startHeartbeat();
            showCount(Math.round(places.startPoints + plan.needed * climb));
          },
        },
        0,
      );
    }

    if (plan.win) {
      // Past the mark, the count bursts on to the final total.
      counter.v = places.winAt;
      tl.to(
        counter,
        {
          v: finalPoints,
          duration: plan.burstS,
          ease: 'power2.out',
          onUpdate: () => showCount(Math.round(counter.v)),
        },
        plan.climbEndAt,
      );
      tl.call(swap, undefined, plan.swapAt ?? plan.countEndAt);
      tl.call(
        () => {
          // Land on the exact total, whatever the last frame rounded to.
          showCount(finalPoints);
          reconcile();
        },
        undefined,
        plan.countEndAt + 0.02,
      );
      tl.call(
        complete,
        undefined,
        Math.max(plan.countEndAt, plan.verdictAt) + 0.3,
      );
    } else {
      // The stop could be a beat until the hold is longer than any beat.
      tl.call(
        () => {
          showCount(finalPoints);
          resolveNoWin();
        },
        undefined,
        plan.verdictAt,
      );
    }
  });

  // ── Intro (§4) ──────────────────────────────────────────────────────────

  useGSAP(
    () => {
      if (!introGo) return;

      reducedMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;

      const { u } = layoutRef.current;
      const root = rootRef.current;
      const track = trackRef.current;

      if (!root || !track) return;

      const numerals = gsap.utils.toArray<HTMLElement>(
        '[data-ladder-place]',
        root,
      );
      const sides = [leader.side.current, last.side.current].filter(Boolean);
      const tl = gsap.timeline({
        onComplete: () => {
          entranceDoneRef.current = true;
          if (pendingFinalPointsRef.current !== null) {
            triggerRevealRef.current(pendingFinalPointsRef.current);
            pendingFinalPointsRef.current = null;
          }
        },
      });

      if (reducedMotionRef.current) tl.timeScale(2);

      gsap.set(track, { opacity: 0 });
      gsap.set(sides, { opacity: 0 });
      gsap.set(numerals, { opacity: 0, filter: blur(10) });

      tl.to(track, { opacity: 1, duration: 0.3, ease: 'power1.out' }, 0);
      tl.to(sides, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0);

      // Bottom to top; long ladders squeeze the stagger to land in time.
      const each =
        numerals.length > 1
          ? Math.min(
              INTRO.numeralStagger,
              (INTRO.numeralsEnd - INTRO.numeralsIn - 0.22) /
                (numerals.length - 1),
            )
          : 0;

      tl.to(
        numerals,
        {
          opacity: 1,
          filter: useBlur ? 'blur(0px)' : 'none',
          duration: 0.22,
          ease: 'power2.out',
          stagger: { each, from: 'end' },
          clearProps: 'filter',
        },
        INTRO.numeralsIn,
      );

      const introSide = (
        refs: LadderSideRefs,
        s: 1 | -1,
        at: {
          ring: number;
          dot: number;
          expand: number;
          points: number;
          pointsS: number;
          tag: number;
        },
        blurId: string,
      ) => {
        const cap = refs.cap.current;
        const nameSeg = refs.nameSeg.current;
        const flag = refs.flag.current;
        const bodyClip = refs.bodyClip.current;
        const connector = refs.connector.current;

        if (!cap || !nameSeg || !flag || !bodyClip) return;

        const chars = gsap.utils.toArray<HTMLElement>(
          '[data-ladder-char]',
          nameSeg,
        );
        // Tucked fully behind the dot, which is narrower than the cap and
        // sits nearer the ladder (§4.3: the +48 u).
        const bodyOffset =
          nameSeg.offsetWidth - (CAP_W - DOT_CENTRE) * u + BODY_TUCK * u;
        const flagOffset = (FLAG_W + BODY_TUCK) * u;
        const capColor = getComputedStyle(cap).backgroundColor;
        const textColor = getComputedStyle(nameSeg).color;
        const accent = refs.winnerTag.current
          ? getComputedStyle(refs.winnerTag.current).backgroundColor
          : '';
        const midColor =
          accent && (parseRgb(accent)?.[3] ?? 0) > 0
            ? mixColors(capColor, accent)
            : mixColors(capColor, textColor);

        gsap.set(refs.ringPop.current, { opacity: 0, scale: 0.6 });
        gsap.set([refs.flash.current, refs.glow.current], { opacity: 0 });
        gsap.set(connector, { opacity: 0 });
        gsap.set(cap, {
          '--cap-w': DOT_W,
          '--cap-flat': 1,
          x: s * DOT_SHIFT * u,
          scale: 0.12,
          opacity: 0,
          transformOrigin: '50% 50%',
        });
        // The body hides behind the dot, so nothing shows before the dot.
        gsap.set(bodyClip, { autoAlpha: 0 });
        gsap.set(nameSeg, { x: s * bodyOffset });
        gsap.set(flag, { x: s * flagOffset });
        gsap.set(chars, { opacity: 0 });
        gsap.set(refs.points.current, { opacity: 0 });
        gsap.set([refs.tag.current, refs.winnerTag.current], {
          yPercent: TAG_HIDDEN,
        });

        // The ring pops around the place, the dot beside it 33 ms later.
        tl.to(
          refs.ringPop.current,
          { scale: 1, duration: 0.3, ease: 'back.out(1.7)' },
          at.ring,
        ).to(
          refs.ringPop.current,
          { opacity: 1, duration: 0.06, ease: 'none' },
          at.ring,
        );
        tl.set(connector, { opacity: 1 }, at.dot);
        tl.set(bodyClip, { autoAlpha: 1 }, at.expand);
        tl.fromTo(
          cap,
          { opacity: 0.4 },
          { opacity: 1, duration: 0.08, ease: 'none', immediateRender: false },
          at.dot,
        ).to(cap, { scale: 1, duration: 0.33, ease: 'back.out(1.4)' }, at.dot);

        // The dot unfurls into the pill: the name, then the flag, slide
        // out from behind it while it widens into the cap.
        const E = at.expand;

        tl.to(nameSeg, { x: 0, duration: 0.42, ease: 'power2.out' }, E)
          .to(
            cap,
            {
              '--cap-w': CAP_W,
              '--cap-flat': 0,
              x: 0,
              duration: 0.33,
              ease: 'power2.out',
            },
            E,
          )
          .to(flag, { x: 0, duration: 0.3, ease: 'power2.out' }, E + 0.11);

        if (chars.length) {
          gsap.set(chars, {
            x: s * 10 * u,
            color: capColor,
            filter: blur(3),
          });
          tl.to(
            chars,
            {
              keyframes: {
                '40%': { opacity: 1 },
                '50%': { color: midColor },
                '100%': {
                  opacity: 1,
                  x: 0,
                  color: textColor,
                  filter: useBlur ? 'blur(0px)' : 'none',
                },
                easeEach: 'none',
              },
              duration: 0.14,
              stagger: 0.022,
            },
            E + 0.09,
          );
          // Back to the name's own colour, so a theme change still applies.
          tl.set(
            chars,
            { clearProps: 'color,filter,transform' },
            E + 0.09 + 0.14 + 0.022 * chars.length,
          );
        }

        const blurNode = refs.blur.current;

        if (useBlur && blurNode) {
          // Horizontal smear while the body slides (§7.1).
          tl.set(bodyClip, { filter: `url(#${blurId})` }, E)
            .fromTo(
              blurNode,
              { attr: { stdDeviation: '0 0' } },
              {
                attr: { stdDeviation: `${6 * u} 0` },
                duration: 0.12,
                ease: 'power1.out',
                immediateRender: false,
              },
              E,
            )
            .to(
              blurNode,
              {
                attr: { stdDeviation: '0 0' },
                duration: 0.26,
                ease: 'power1.in',
              },
              E + 0.12,
            )
            .set(bodyClip, { filter: 'none' }, E + 0.4);
        }

        // The points come into focus inside the cap.
        tl.fromTo(
          refs.points.current,
          { opacity: 0, filter: blur(4) },
          {
            opacity: 1,
            filter: useBlur ? 'blur(0px)' : 'none',
            duration: at.pointsS,
            ease: 'power1.out',
            immediateRender: false,
            clearProps: 'filter',
          },
          at.points,
        );

        // The tag rises out of the pill's top edge (§4.4).
        tl.to(
          refs.tag.current,
          { yPercent: 0, duration: TAG_RISE_S, ease: 'power3.out' },
          at.tag,
        );
      };

      const lag = INTRO.lastOffset;

      introSide(
        leader,
        1,
        {
          ring: INTRO.leaderRing,
          dot: INTRO.leaderDot,
          expand: INTRO.leaderExpand,
          points: INTRO.leaderPoints,
          pointsS: 0.13,
          tag: INTRO.leaderTag,
        },
        leaderBlurId,
      );
      introSide(
        last,
        -1,
        {
          ring: INTRO.leaderRing + lag,
          dot: INTRO.leaderDot + lag,
          expand: INTRO.lastExpand,
          points: INTRO.lastPoints,
          pointsS: 0.15,
          tag: INTRO.lastTag,
        },
        lastBlurId,
      );

      tl.to({}, { duration: 0 }, INTRO.done);
    },
    { scope: rootRef, dependencies: [introGo] },
  );

  // ── Wiring to the store ─────────────────────────────────────────────────

  const triggerRevealRef = useRef(triggerReveal);

  triggerRevealRef.current = triggerReveal;

  // The panel is up, so the buffered award can land now
  // (docs/final-televote-reveal.md: the deferred-award guard).
  useEffect(() => {
    if (pendingFinalRevealTelevote) commitPendingFinalRevealTelevote();
  }, [pendingFinalRevealTelevote, commitPendingFinalRevealTelevote]);

  useEffect(() => {
    if (!lastFinished) return;

    if (entranceDoneRef.current) {
      triggerRevealRef.current(lastPoints);
    } else {
      pendingFinalPointsRef.current = lastPoints;
    }
  }, [lastFinished, lastPoints]);

  /** False until the intro has set its starting state: keep the panel hidden. */
  return introGo;
};
