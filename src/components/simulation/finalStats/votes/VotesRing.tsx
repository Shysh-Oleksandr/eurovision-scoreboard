'use client';
import gsap from 'gsap';
import { ArrowLeftRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { layoutRing, RingLayout, RingSlot } from './ringLayout';
import VotesCard from './VotesCard';
import type { VotesDirection, VotesLink, VotesStageData } from './votesData';

import { getFlagPath } from '@/helpers/getFlagPath';
import { toFixedIfDecimalFloat } from '@/helpers/toFixedIfDecimal';

/**
 * Every flag is laid out at this diameter and scaled to its size, so the
 * flag images and numbers are drawn once, at the largest size, and moving
 * or resizing a flag only changes its transform.
 */
const BASE = 150;

/** Where an entering flag comes from: just outside its slot, or the middle. */
const ARRIVE_FROM = 28;

/** How far along its spoke (from the giver) the arrowhead sits. */
const ARROW_AT = 0.62;

type Target = {
  x: number;
  y: number;
  d: number;
  role: 'center' | 'sat';
  link?: VotesLink;
  slot?: RingSlot;
  index: number;
};

type SpokeEls = { g: SVGGElement; line: SVGLineElement; arrow: SVGPathElement };

type TransitionKind = 'enter' | 'change' | 'snap' | 'reveal';

const fmt = (value: number) => String(toFixedIfDecimalFloat(value));

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * A small flag answers taps around it too (up to a 44px target), as far as
 * half the way to its neighbours. In the flag's own 150px units, as the
 * target is scaled with it.
 */
const hitOutset = (d: number, pitch: number) => {
  const radius = Math.max(d / 2, Math.min(22, pitch / 2 - 1));

  return `${((radius - d / 2) * BASE) / d}px`;
};

/** How far outside the flag's rim the pills' centres sit. */
const PILL_OUT = 6;

/** The pills' angle either side of the outward normal: they never touch. */
const pillSpread = (distance: number) =>
  clamp(Math.asin(Math.min(1, 11 / distance)), 0.42, 1.2);

/**
 * A pill's centre: just outside the flag, on its outer side, so it never
 * covers the flag's own number.
 */
const pillPoint = (target: Target, which: 'jury' | 'televote') => {
  const distance = target.d / 2 + PILL_OUT;
  const spread = pillSpread(distance);
  const angle =
    (target.slot?.normal ?? 0) + (which === 'jury' ? -spread : spread);

  return {
    x: target.x + distance * Math.cos(angle),
    y: target.y + distance * Math.sin(angle),
  };
};

/**
 * A spoke from the giver to the one that got the points, stopping short of
 * both flags; the arrowhead sits at the receiving end.
 */
const spokeGeometry = (
  target: Target,
  layout: RingLayout,
  direction: VotesDirection,
) => {
  const dx = target.x - layout.cx;
  const dy = target.y - layout.cy;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const hub = layout.center / 2 + 9;
  const rim = target.d / 2 + 6;
  const inner = { x: layout.cx + ux * hub, y: layout.cy + uy * hub };
  const outer = { x: target.x - ux * rim, y: target.y - uy * rim };
  const length = distance - hub - rim;

  if (length < 10) return null;

  const [from, to] = direction === 'received' ? [outer, inner] : [inner, outer];
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  // The arrowhead rides past the middle of the spoke, where the spokes are
  // far enough apart not to run into each other.
  const arrow = {
    x: from.x + (to.x - from.x) * ARROW_AT,
    y: from.y + (to.y - from.y) * ARROW_AT,
  };

  return { from, to, length, angle, arrow };
};

interface VotesRingProps {
  data: VotesStageData;
  centerCode: string;
  direction: VotesDirection;
  links: VotesLink[];
  showPills: boolean;
  /** A new value plays the entrance again (Replay, a pick from the list). */
  replayToken: number;
  /** The country list covers the ring. */
  hidden: boolean;
  minimalisticFlags: boolean;
  onOpen: (code: string) => void;
  /** Whether the pills would cover the neighbours (see `RingLayout`). */
  onCrowdedChange: (crowded: boolean) => void;
  /**
   * Received ⇄ Given, from a click on the middle flag; absent when the
   * middle only received (an entry that didn't vote) or only gave.
   */
  onToggleDirection?: () => void;
}

/**
 * The voting graphic: the country in the middle and, on a ring around it,
 * everyone who gave it points (or everyone it gave points to), sized by
 * the points and joined to it by a spoke. Every country of the stage has
 * one flag element for the ring's whole life, so a flag that is in both
 * views glides from one place to the other, and the one clicked becomes
 * the middle. GSAP drives positions, sizes, numbers and pills directly on
 * the elements; React only renders them and their labels.
 */
const VotesRing: React.FC<VotesRingProps> = ({
  data,
  centerCode,
  direction,
  links,
  showPills,
  replayToken,
  hidden,
  minimalisticFlags,
  onOpen,
  onCrowdedChange,
  onToggleDirection,
}) => {
  const t = useTranslations('simulation.finalStats.votes');

  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const nodeEls = useRef(new Map<string, HTMLButtonElement>());
  const numEls = useRef(new Map<string, HTMLSpanElement>());
  /** Keyed `code|jury` and `code|televote`. */
  const pillEls = useRef(new Map<string, HTMLSpanElement>());
  const spokeEls = useRef(new Map<string, SpokeEls>());
  const timeline = useRef<gsap.core.Timeline | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  /** Cards wait until the flags have reached their places. */
  const [settled, setSettled] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  /** The middle flag is pointed at or focused: its hint shows. */
  const [centerHover, setCenterHover] = useState(false);
  const lastPointer = useRef<string>('mouse');
  /** Off after a change until the pointer really moves (see `run`). */
  const hoverArmed = useRef(true);
  const hoverTimer = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = stageRef.current;

    if (!el) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);

      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });

    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () =>
      size.w > 40 && size.h > 40
        ? layoutRing({
            width: size.w,
            height: size.h,
            points: links.map((link) => link.total),
            maxPoints: data.maxLink,
            pills: true,
          })
        : null,
    [size, links, data.maxLink],
  );

  const crowded = !!layout?.crowded;

  useEffect(() => {
    onCrowdedChange(crowded);
  }, [crowded, onCrowdedChange]);

  const targets = useMemo(() => {
    const map = new Map<string, Target>();

    if (!layout) return map;

    map.set(centerCode, {
      x: layout.cx,
      y: layout.cy,
      d: layout.center,
      role: 'center',
      index: -1,
    });
    links.forEach((link, index) => {
      const slot = layout.slots[index];

      if (!slot) return;
      map.set(link.code, {
        x: slot.x,
        y: slot.y,
        d: slot.d,
        role: 'sat',
        link,
        slot,
        index,
      });
    });

    return map;
  }, [layout, links, centerCode]);

  const centerTotal = useMemo(
    () => links.reduce((sum, link) => sum + link.total, 0),
    [links],
  );

  // ---- Motion -----------------------------------------------------------

  /** The animated move under way, so a resize can re-aim it. */
  const running = useRef<{
    kind: TransitionKind;
    previousCenter?: string;
  } | null>(null);

  const lastRun = useRef<{
    center: string;
    direction: VotesDirection;
    replay: number;
    hidden: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    if (!layout) return;

    const last = lastRun.current;

    lastRun.current = {
      center: centerCode,
      direction,
      replay: replayToken,
      hidden,
    };

    if (hidden) {
      timeline.current?.progress(1).kill();

      return;
    }

    let kind: TransitionKind = 'snap';

    if (!last || last.replay !== replayToken) kind = 'enter';
    else if (last.center !== centerCode || last.direction !== direction)
      kind = 'change';
    else if (last.hidden) kind = 'reveal';

    // A new size while flags are on their way (the band growing a line as
    // the list closes or the name changes) re-aims the move rather than
    // snapping it to its end.
    if (kind === 'snap' && running.current && timeline.current?.isActive()) {
      run(running.current.kind, running.current.previousCenter);

      return;
    }

    run(kind, last?.center);
    // `run` reads the latest layout and targets; it runs when they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, targets, hidden, replayToken]);

  useEffect(
    () => () => {
      timeline.current?.kill();
      window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const run = (requested: TransitionKind, previousCenter?: string) => {
    if (!layout) return;

    const reduced = prefersReducedMotion();
    const kind: TransitionKind =
      reduced && requested !== 'snap' ? 'reveal' : requested;

    timeline.current?.kill();
    running.current = null;
    setHovered(null);
    setSelected(null);
    // A flag that lands under a resting pointer isn't pointed at.
    if (kind !== 'snap') {
      hoverArmed.current = false;
      setCenterHover(false);
    }

    const nodes = nodeEls.current;
    const count = links.length;
    const isVisible = (el: Element) =>
      Number(gsap.getProperty(el, 'autoAlpha')) > 0.02;

    const allNums = Array.from(numEls.current.values());
    const allPills = Array.from(pillEls.current.values());
    const allSpokes = Array.from(spokeEls.current.values()).map((s) => s.g);

    const placeSpoke = (code: string, target: Target) => {
      const spoke = spokeEls.current.get(code);

      if (!spoke) return 0;
      const geometry =
        target.role === 'sat' ? spokeGeometry(target, layout, direction) : null;

      if (!geometry || !target.link) {
        gsap.set(spoke.g, { autoAlpha: 0 });

        return 0;
      }

      const { from, to, length, angle, arrow } = geometry;
      const strength = Math.sqrt(
        clamp(target.link.total / (data.maxLink || 1), 0, 1),
      );

      spoke.line.setAttribute('x1', String(from.x));
      spoke.line.setAttribute('y1', String(from.y));
      spoke.line.setAttribute('x2', String(to.x));
      spoke.line.setAttribute('y2', String(to.y));
      spoke.line.setAttribute('stroke-opacity', String(0.08 + 0.26 * strength));
      spoke.arrow.setAttribute(
        'transform',
        `translate(${arrow.x} ${arrow.y}) rotate(${angle})`,
      );
      spoke.arrow.setAttribute(
        'stroke-opacity',
        String(0.16 + 0.34 * strength),
      );
      gsap.set(spoke.line, { strokeDasharray: length });

      return length;
    };

    const placePills = (code: string, target: Target) => {
      const shown: HTMLSpanElement[] = [];

      (['jury', 'televote'] as const).forEach((which) => {
        const el = pillEls.current.get(`${code}|${which}`);

        if (!el) return;
        const value = target.link?.[which] ?? 0;

        if (target.role !== 'sat' || !data.split || value <= 0) {
          gsap.set(el, { autoAlpha: 0 });

          return;
        }

        const point = pillPoint(target, which);

        el.textContent = fmt(value);
        gsap.set(el, { x: point.x, y: point.y, xPercent: -50, yPercent: -50 });
        shown.push(el);
      });

      return shown;
    };

    const numberFor = (target: Target) => {
      if (target.role === 'center') {
        return direction === 'received' ? fmt(centerTotal) : '';
      }

      return target.d >= 19 && target.link ? fmt(target.link.total) : '';
    };

    // Everything at its final state at once (a resize, reduced motion).
    const setFinal = () => {
      nodes.forEach((el, code) => {
        const target = targets.get(code);
        const num = numEls.current.get(code);

        if (!target) {
          gsap.set(el, { autoAlpha: 0, scale: 0 });
          const spoke = spokeEls.current.get(code);

          if (spoke) gsap.set(spoke.g, { autoAlpha: 0 });
          (['jury', 'televote'] as const).forEach((which) => {
            const pill = pillEls.current.get(`${code}|${which}`);

            if (pill) gsap.set(pill, { autoAlpha: 0 });
          });

          return;
        }

        gsap.set(el, {
          x: target.x,
          y: target.y,
          scale: target.d / BASE,
          autoAlpha: 1,
        });
        el.style.setProperty(
          '--hit',
          target.role === 'sat' ? hitOutset(target.d, layout.pitch) : '0px',
        );

        if (num) {
          num.textContent = numberFor(target);
          gsap.set(num, { autoAlpha: 1 });
        }

        const length = placeSpoke(code, target);
        const spoke = spokeEls.current.get(code);

        if (spoke && length) {
          gsap.set(spoke.g, { autoAlpha: 1 });
          gsap.set(spoke.line, { strokeDashoffset: 0 });
          gsap.set(spoke.arrow, { autoAlpha: 1 });
        }

        placePills(code, target).forEach((pill) =>
          gsap.set(pill, { autoAlpha: 1, scale: 1 }),
        );
      });
      setSettled(true);
    };

    if (kind === 'snap') {
      setFinal();

      return;
    }

    if (kind === 'reveal') {
      setFinal();
      if (layerRef.current) {
        gsap.fromTo(
          layerRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.22, ease: 'power1.out' },
        );
      }

      return;
    }

    setSettled(false);
    if (layerRef.current) gsap.set(layerRef.current, { autoAlpha: 1 });

    const tl = gsap.timeline({
      onComplete: () => {
        running.current = null;
        setSettled(true);
      },
    });

    running.current = { kind, previousCenter };

    timeline.current = tl;

    const travelScale = layout.travel / BASE;
    const arriveFrom = (target: Target) =>
      direction === 'given' || !target.slot
        ? { x: layout.cx, y: layout.cy }
        : {
            x: target.x + Math.cos(target.slot.normal) * ARRIVE_FROM,
            y: target.y + Math.sin(target.slot.normal) * ARRIVE_FROM,
          };

    // Elliptic polar coordinates around the middle: a flag that stays on the
    // ring travels along it instead of cutting across the middle. Flags going
    // clockwise take an inner lane (a flag's width and more inside the ring,
    // reached early and held), the others stay on the ring, so two flags
    // passing each other never meet.
    const lane = Math.max(
      0.16 * Math.min(layout.a, layout.b),
      layout.travel + 8,
    );
    const smooth = (x: number) => x * x * (3 - 2 * x);
    /** 0 → 1 over the first fifth of the way, back to 0 over the last. */
    const plateau = (k: number) =>
      smooth(Math.min(1, k / 0.2)) * smooth(Math.min(1, (1 - k) / 0.2));
    const toPolar = (x: number, y: number) => {
      const nx = (x - layout.cx) / layout.a;
      const ny = (y - layout.cy) / layout.b;

      return { angle: Math.atan2(ny, nx), r: Math.hypot(nx, ny) };
    };
    const glideAlongRing = (
      el: HTMLElement,
      to: { x: number; y: number },
      at: number,
      duration: number,
    ) => {
      const from = toPolar(
        Number(gsap.getProperty(el, 'x')),
        Number(gsap.getProperty(el, 'y')),
      );
      const end = toPolar(to.x, to.y);
      // The middle has no angle of its own: it leaves along the other end's.
      const startAngle = from.r < 0.05 ? end.angle : from.angle;
      const endAngle = end.r < 0.05 ? startAngle : end.angle;
      const turn =
        ((((endAngle - startAngle + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) %
          (2 * Math.PI)) -
        Math.PI;
      const inLane = Math.min(from.r, end.r) > 0.5 && turn > 0.02;
      const progress = { t: 0 };

      tl.to(
        progress,
        {
          t: 1,
          duration,
          ease: 'power2.inOut',
          onUpdate: () => {
            const { t: k } = progress;
            const angle = startAngle + turn * k;
            const r = from.r + (end.r - from.r) * k;
            let x = layout.cx + Math.cos(angle) * r * layout.a;
            let y = layout.cy + Math.sin(angle) * r * layout.b;

            if (inLane) {
              // Inwards along the ellipse's normal, in pixels.
              const nx = Math.cos(angle) / layout.a;
              const ny = Math.sin(angle) / layout.b;
              const length = Math.hypot(nx, ny) || 1;
              const depth = lane * plateau(k);

              x -= (nx / length) * depth;
              y -= (ny / length) * depth;
            }

            gsap.set(el, { x, y });
          },
        },
        at,
      );
    };

    const isChange = kind === 'change';
    let sweepAt: number;

    if (kind === 'change') {
      // 1. Out: numbers, pills and spokes go; flags shrink to one size.
      tl.to(
        [...allNums, ...allPills, ...allSpokes],
        { autoAlpha: 0, duration: 0.15, ease: 'power1.out', overwrite: true },
        0,
      );

      // The glide starts while the flags shrink, so they leave at once.
      const glideAt = 0.04;
      const glide = 0.5;

      nodes.forEach((el, code) => {
        const target = targets.get(code);
        const wasVisible = isVisible(el);

        if (!target) {
          if (wasVisible) {
            tl.to(
              el,
              {
                scale: 0,
                autoAlpha: 0,
                duration: 0.26,
                ease: 'power2.in',
                overwrite: true,
              },
              0,
            );
          }

          return;
        }

        if (!wasVisible) {
          // 2b. Newcomers arrive at their place as they would on entrance.
          const from = arriveFrom(target);

          tl.fromTo(
            el,
            { x: from.x, y: from.y, scale: 0, autoAlpha: 1 },
            {
              x: target.x,
              y: target.y,
              scale: travelScale,
              duration: 0.45,
              ease: 'power3.out',
              overwrite: true,
            },
            glideAt + 0.2 + Math.min(0.2, target.index * 0.006),
          );

          return;
        }

        if (target.role === 'center') {
          // 2. The new middle comes in and grows on the way.
          tl.to(
            el,
            {
              scale: target.d / BASE,
              duration: glide + 0.05,
              ease: 'power3.inOut',
              overwrite: true,
            },
            glideAt,
          );
          glideAlongRing(el, target, glideAt, glide + 0.05);

          return;
        }

        tl.to(
          el,
          {
            scale: travelScale,
            duration: 0.24,
            ease: 'power2.inOut',
            overwrite: true,
          },
          0,
        );
        // The old middle leaves a beat after the new one sets off, under it.
        const delay =
          code === previousCenter
            ? 0.1
            : Math.min(0.12, Math.max(0, target.index) * 0.004);

        glideAlongRing(el, target, glideAt + delay, glide);
      });

      sweepAt = glideAt + glide - 0.06;
    } else {
      // Entrance: the middle opens, the ring's flags land as small dots.
      nodes.forEach((el, code) => {
        const target = targets.get(code);

        gsap.set(el, { autoAlpha: 0, scale: 0 });
        if (!target) return;

        if (target.role === 'center') {
          tl.fromTo(
            el,
            { x: target.x, y: target.y, scale: 0, autoAlpha: 1 },
            {
              scale: target.d / BASE,
              duration: 0.55,
              ease: 'expo.out',
            },
            0,
          );

          return;
        }

        const from = arriveFrom(target);

        tl.fromTo(
          el,
          { x: from.x, y: from.y, scale: 0, autoAlpha: 1 },
          {
            x: target.x,
            y: target.y,
            scale: travelScale,
            duration: 0.45,
            ease: 'power3.out',
          },
          0.08 + target.index * Math.min(0.012, 0.26 / Math.max(1, count)),
        );
      });
      gsap.set([...allNums, ...allPills, ...allSpokes], { autoAlpha: 0 });
      sweepAt = 0.36;
    }

    // 3. The sweep: clockwise from 12 o'clock each flag grows to its size,
    // its spoke draws in and the middle's total counts up.
    const centerEl = numEls.current.get(centerCode);
    const centerTarget = targets.get(centerCode);
    let tally = 0;

    if (centerEl && centerTarget) {
      tl.call(
        () => {
          tally = 0;
          centerEl.textContent = direction === 'received' ? '0' : '';
        },
        [],
        sweepAt - 0.02,
      );
      tl.to(centerEl, { autoAlpha: 1, duration: 0.2 }, sweepAt);
    }

    // A re-centre is how the graphic is explored: its sweep is quicker (the
    // numbers read within about 0.9s of the click) than the entrance's.
    const sweep = isChange
      ? { span: 0.26, grow: 0.36, line: 0.3, extras: 0.1 }
      : { span: 0.75, grow: 0.55, line: 0.5, extras: 0.22 };
    const step = Math.min(
      isChange ? 0.02 : 0.05,
      sweep.span / Math.max(1, count),
    );

    links.forEach((link) => {
      const target = targets.get(link.code);
      const el = nodes.get(link.code);

      if (!target || !el) return;

      const at = sweepAt + target.index * step;
      const num = numEls.current.get(link.code);
      const spoke = spokeEls.current.get(link.code);

      el.style.setProperty('--hit', hitOutset(target.d, layout.pitch));
      tl.to(
        el,
        { scale: target.d / BASE, duration: sweep.grow, ease: 'expo.out' },
        at,
      );

      tl.call(
        () => {
          if (num) num.textContent = numberFor(target);
          if (centerEl && direction === 'received') {
            tally += link.total;
            centerEl.textContent = fmt(tally);
          }
        },
        [],
        at,
      );

      if (num) tl.to(num, { autoAlpha: 1, duration: 0.22 }, at + 0.04);

      const length = placeSpoke(link.code, target);

      if (spoke && length) {
        tl.set(spoke.arrow, { autoAlpha: 0 }, at);
        tl.fromTo(
          spoke.line,
          { strokeDashoffset: length },
          { strokeDashoffset: 0, duration: sweep.line, ease: 'power2.out' },
          at,
        );
        tl.to(spoke.g, { autoAlpha: 1, duration: 0.12 }, at);
        tl.to(spoke.arrow, { autoAlpha: 1, duration: 0.2 }, at + sweep.extras);
      }

      const pills = placePills(link.code, target);

      if (pills.length) {
        tl.fromTo(
          pills,
          { autoAlpha: 0, scale: 0.4 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.34,
            ease: 'expo.out',
            stagger: 0.05,
          },
          at + sweep.extras,
        );
      }
    });

    if (centerEl && centerTarget) {
      tl.call(
        () => {
          centerEl.textContent = numberFor(centerTarget);
        },
        [],
        sweepAt + Math.max(0, count - 1) * step + 0.05,
      );
    }
  };

  // ---- Pointer and keyboard -------------------------------------------

  const cardCode = selected ?? hovered;

  const handlePointerEnter = (code: string, event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse' || !hoverArmed.current) return;
    if (code === centerCode) {
      setCenterHover(!!onToggleDirection);

      return;
    }
    window.clearTimeout(hoverTimer.current);
    setHovered(code);
  };

  const handlePointerLeave = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse') return;
    setCenterHover(false);
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHovered(null), 70);
  };

  const handleClick = (code: string, event: React.MouseEvent) => {
    // The middle flag switches between Received and Given.
    if (code === centerCode) {
      onToggleDirection?.();

      return;
    }

    // A keyboard press (detail 0) or a mouse click opens at once; a tap
    // first shows the card, a second tap on the same flag opens it.
    const isTap =
      event.detail > 0 &&
      (lastPointer.current === 'touch' || lastPointer.current === 'pen');

    if (isTap && selected !== code) {
      setSelected(code);

      return;
    }

    // The flag is about to become the middle, which can't be focused:
    // keep the focus in the ring.
    if (event.currentTarget === document.activeElement) {
      stageRef.current?.focus({ preventScroll: true });
    }
    onOpen(code);
  };

  const handleFocus = (code: string, event: React.FocusEvent) => {
    if (!event.currentTarget.matches(':focus-visible')) return;
    if (code === centerCode) setCenterHover(!!onToggleDirection);
    else setHovered(code);
  };

  const clearCard = useCallback(() => {
    setHovered(null);
    setSelected(null);
  }, []);

  const order = useMemo(() => {
    const inView = [centerCode, ...links.map((link) => link.code)];
    const rest = Array.from(data.countries.keys()).filter(
      (code) => !inView.includes(code),
    );

    return [...inView, ...rest];
  }, [centerCode, links, data.countries]);

  const linkByCode = useMemo(
    () => new Map(links.map((link) => [link.code, link])),
    [links],
  );

  const center = data.countries.get(centerCode);
  const cardTarget = cardCode ? targets.get(cardCode) : undefined;
  const cardCountry = cardCode ? data.countries.get(cardCode) : undefined;
  const cardLink = cardCode ? linkByCode.get(cardCode) : undefined;

  const ariaFor = (code: string, name: string) => {
    const link = linkByCode.get(code);

    if (!link) return name;
    if (data.split) {
      return t('nodeLabelSplit', {
        country: name,
        points: link.total,
        jury: link.jury,
        televote: link.televote,
      });
    }

    return t('nodeLabel', { country: name, points: link.total });
  };

  const isEmpty = links.length === 0;

  return (
    <div
      ref={stageRef}
      className={`dp-votes-ring ${hidden ? 'is-hidden' : ''} ${
        showPills ? '' : 'is-pills-off'
      }`}
      role="group"
      aria-label={
        center
          ? direction === 'received'
            ? t('ringLabelReceived', { country: center.name })
            : t('ringLabelGiven', { country: center.name })
          : undefined
      }
      tabIndex={-1}
      onPointerMove={(event) => {
        if (event.pointerType !== 'mouse' || hoverArmed.current) return;
        hoverArmed.current = true;
        const node = (event.target as Element).closest<HTMLElement>(
          '.dp-votes-node',
        );
        const code = node?.dataset.code;

        if (code === centerCode) setCenterHover(!!onToggleDirection);
        else if (code) setHovered(code);
      }}
      onPointerDown={(event) => {
        lastPointer.current = event.pointerType;
        // A tap on the background puts a tapped card away.
        if (
          !(event.target as Element).closest('.dp-votes-node, .dp-votes-card')
        ) {
          clearCard();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && cardCode) {
          event.stopPropagation();
          clearCard();
        }
      }}
    >
      <div ref={layerRef} className="dp-votes-layer">
        <svg className="dp-votes-spokes" aria-hidden="true">
          {order.map((code) => (
            <g
              key={code}
              className={cardCode === code ? 'is-hl' : undefined}
              ref={(el) => {
                if (!el) {
                  spokeEls.current.delete(code);

                  return;
                }
                const line = el.querySelector('line');
                const arrow = el.querySelector('path');

                if (line && arrow) {
                  spokeEls.current.set(code, { g: el, line, arrow });
                }
              }}
            >
              <line />
              <path d="M -3 -4 L 2 0 L -3 4" />
            </g>
          ))}
        </svg>

        {order.map((code) => {
          const country = data.countries.get(code);

          if (!country) return null;
          const inView = targets.has(code);
          const isCenter = code === centerCode;
          const isToggle = isCenter && !!onToggleDirection;
          const focusable = inView && !hidden && (!isCenter || isToggle);

          return (
            <button
              key={code}
              type="button"
              ref={(el) => {
                if (el) nodeEls.current.set(code, el);
                else nodeEls.current.delete(code);
              }}
              data-code={code}
              className={`dp-votes-node ${isCenter ? 'is-center' : ''} ${
                isToggle ? 'is-toggle' : ''
              } ${cardCode === code ? 'is-hl' : ''}`}
              tabIndex={focusable ? 0 : -1}
              aria-hidden={!inView || (isCenter && !isToggle) || undefined}
              aria-label={
                isToggle
                  ? t(
                      direction === 'received'
                        ? 'switchToGiven'
                        : 'switchToReceived',
                    )
                  : ariaFor(code, country.name)
              }
              onPointerEnter={(event) => handlePointerEnter(code, event)}
              onPointerLeave={handlePointerLeave}
              onClick={(event) => handleClick(code, event)}
              onFocus={(event) => handleFocus(code, event)}
              onBlur={() => {
                if (isCenter) setCenterHover(false);
                setHovered((prev) => (prev === code ? null : prev));
              }}
            >
              <span className="dp-votes-disc">
                <img
                  className="dp-votes-img"
                  src={getFlagPath(country.country, 'round', minimalisticFlags)}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  width={BASE}
                  height={BASE}
                  onError={(event) => {
                    event.currentTarget.src = getFlagPath('ww');
                  }}
                />
              </span>
              <span
                className="dp-votes-num dp-scoreboard-font"
                aria-hidden="true"
                ref={(el) => {
                  if (el) numEls.current.set(code, el);
                  else numEls.current.delete(code);
                }}
              />
            </button>
          );
        })}

        <div className="dp-votes-pills" aria-hidden="true">
          {order.map((code) => (
            <React.Fragment key={code}>
              {(['jury', 'televote'] as const).map((which) => (
                <span
                  key={which}
                  className={`dp-votes-pill ${
                    which === 'jury' ? 'is-jury' : 'is-tele'
                  }`}
                  ref={(el) => {
                    if (el) pillEls.current.set(`${code}|${which}`, el);
                    else pillEls.current.delete(`${code}|${which}`);
                  }}
                />
              ))}
            </React.Fragment>
          ))}
        </div>

        {centerHover && settled && onToggleDirection && layout && !hidden && (
          <div
            className="dp-votes-hint"
            aria-hidden="true"
            style={{
              left: layout.cx,
              top: layout.cy - layout.center / 2 - 10,
            }}
          >
            <ArrowLeftRight className="size-3.5 flex-none" />
            {t(direction === 'received' ? 'switchToGiven' : 'switchToReceived')}
          </div>
        )}

        {isEmpty && layout && center && (
          <div
            className="dp-votes-empty"
            style={{ top: layout.cy + layout.center / 2 + 14 }}
          >
            {direction === 'received' ? (
              <>
                <p className="dp-votes-empty-title">{t('nulPoints')}</p>
                <p className="dp-votes-empty-text">
                  {t('nobodyGave', { country: center.name })}
                </p>
              </>
            ) : (
              <p className="dp-votes-empty-text">
                {t('gaveNothing', { country: center.name })}
              </p>
            )}
          </div>
        )}
      </div>

      {settled &&
        !hidden &&
        cardCountry &&
        cardTarget &&
        cardLink &&
        center &&
        layout && (
          <VotesCard
            country={cardCountry}
            center={center}
            link={cardLink}
            direction={direction}
            split={data.split}
            target={cardTarget}
            area={{ w: size.w, h: size.h, cx: layout.cx }}
            interactive={!!selected}
            onOpen={() => onOpen(cardCountry.code)}
          />
        )}
    </div>
  );
};

export default VotesRing;
