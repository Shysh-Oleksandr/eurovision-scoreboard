'use client';
import gsap from 'gsap';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { DrawCopyContext } from './drawCopy';
import { captionFor, groupLabel, groupText, liveText } from './drawCopy';

import { solve } from '@/state/allocationDraw/engine';
import { newDrawCode } from '@/state/allocationDraw/rng';
import type {
  DrawEntrantStep,
  DrawError,
  DrawGroupStep,
  DrawInput,
  DrawPlan,
  DrawPreqStep,
  DrawStep,
} from '@/state/allocationDraw/types';

export const DRAW_SPEEDS = [0.5, 0.75, 1, 2, 5] as const;
export const DRAW_SPEED_LABELS = ['0.5×', '0.75×', '1×', '2×', '5×'] as const;
/** Index of 1× in `DRAW_SPEEDS`. */
export const DEFAULT_SPEED_INDEX = 2;

export type DrawPhase = 'ready' | 'drawing' | 'done' | 'error';

export interface Placement {
  stageId: string;
  half: 0 | 1 | 2;
  pos: number;
  lane: string;
  slot: number;
  fixed: boolean;
}

export interface CeremonyState {
  phase: DrawPhase;
  code: string;
  plan: DrawPlan | null;
  error: DrawError | null;
  at: number;
  placed: Record<string, Placement>;
  votes: Record<string, string[]>;
  group: DrawGroupStep | null;
  last: DrawPreqStep | DrawEntrantStep | null;
  auto: boolean;
  speedIndex: number;
}

export const laneKeyFor = (
  plan: DrawPlan,
  stageId: string,
  half: 0 | 1 | 2,
): string => `${stageId}-${plan.order === 'halves' ? half : 0}`;

const placeEntrant = (
  state: CeremonyState,
  plan: DrawPlan,
  step: Pick<DrawEntrantStep, 'code' | 'stageId' | 'half' | 'pos' | 'fixed'>,
): Record<string, Placement> => {
  const lane = laneKeyFor(plan, step.stageId, step.half);
  const slot =
    plan.order === 'positions'
      ? step.pos - 1
      : Object.values(state.placed).filter((p) => p.lane === lane).length;

  return {
    ...state.placed,
    [step.code]: {
      stageId: step.stageId,
      half: step.half,
      pos: step.pos,
      lane,
      slot,
      fixed: step.fixed,
    },
  };
};

const applyStep = (state: CeremonyState, step: DrawStep): CeremonyState => {
  if (!state.plan) return state;
  if (step.t === 'group') return { ...state, group: step };
  if (step.t === 'preq') {
    return {
      ...state,
      votes: {
        ...state.votes,
        [step.stageId]: [...(state.votes[step.stageId] ?? []), step.code],
      },
      last: step,
    };
  }

  return {
    ...state,
    placed: placeEntrant(state, state.plan, step),
    last: step,
  };
};

const initialPlacement = (plan: DrawPlan | null, input: DrawInput) => {
  const votes: Record<string, string[]> = {};
  let placed: Record<string, Placement> = {};

  if (!plan) return { votes, placed };

  Object.entries(plan.semis).forEach(([id, semi]) => {
    votes[id] = semi.voters.filter((v) => v.fixed).map((v) => v.code);
  });

  if (plan.order === 'none') {
    const base: CeremonyState = {
      phase: 'ready',
      code: plan.code,
      plan,
      error: null,
      at: 0,
      placed,
      votes,
      group: null,
      last: null,
      auto: false,
      speedIndex: DEFAULT_SPEED_INDEX,
    };

    input.entrants
      .filter((e) => e.fixed)
      .forEach((e) => {
        placed = placeEntrant({ ...base, placed }, plan, {
          code: e.code,
          stageId: e.fixed!,
          half: 0,
          pos: 0,
          fixed: true,
        });
      });
  }

  return { votes, placed };
};

export interface DrawDom {
  root: () => HTMLElement | null;
  fly: () => HTMLElement | null;
  live: () => HTMLElement | null;
}

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export const SLOT_GHOST_SRC = TRANSPARENT_PIXEL;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface UseDrawCeremonyArgs {
  open: boolean;
  input: DrawInput;
  copy: DrawCopyContext;
  flagSrcOf: (code: string) => string;
  dom: DrawDom;
}

/**
 * The draw ceremony: solves the plan for a code, steps through it with one
 * GSAP timeline per reveal (auto-play or Draw next), and keeps the placed
 * countries in React state between reveals. The timelines only mutate
 * attributes, text and classes of React-rendered nodes (never their
 * structure), so the re-render after each step lands on the same DOM.
 */
export const useDrawCeremony = ({
  open,
  input,
  copy,
  flagSrcOf,
  dom,
}: UseDrawCeremonyArgs) => {
  const [state, setStateRaw] = useState<CeremonyState>(() => ({
    phase: 'ready',
    code: '',
    plan: null,
    error: null,
    at: 0,
    placed: {},
    votes: {},
    group: null,
    last: null,
    auto: false,
    speedIndex: DEFAULT_SPEED_INDEX,
  }));
  const stateRef = useRef(state);
  const setState = useCallback(
    (
      updater:
        | Partial<CeremonyState>
        | ((prev: CeremonyState) => Partial<CeremonyState>),
    ) => {
      const patch =
        typeof updater === 'function' ? updater(stateRef.current) : updater;
      const next = { ...stateRef.current, ...patch };

      stateRef.current = next;
      setStateRaw(next);
    },
    [],
  );

  const inputRef = useRef(input);

  inputRef.current = input;

  const copyRef = useRef(copy);

  copyRef.current = copy;

  const timeline = useRef<gsap.core.Timeline | null>(null);
  const autoCall = useRef<gsap.core.Tween | null>(null);
  const finishCall = useRef<gsap.core.Tween | null>(null);

  const q = useCallback(
    <T extends HTMLElement = HTMLElement>(selector: string): T | null =>
      dom.root()?.querySelector<T>(selector) ?? null,
    [dom],
  );

  const announce = useCallback(
    (text: string) => {
      const el = dom.live();

      if (!el) return;
      el.textContent = '';
      window.setTimeout(() => {
        el.textContent = text;
      }, 30);
    },
    [dom],
  );

  const killAuto = () => {
    autoCall.current?.kill();
    autoCall.current = null;
  };

  const stopAll = useCallback(() => {
    killAuto();
    finishCall.current?.kill();
    finishCall.current = null;
    timeline.current?.kill();
    timeline.current = null;
    dom
      .fly()
      ?.querySelectorAll('[data-flyer]')
      .forEach((f) => f.remove());
  }, [dom]);

  /** Solve for a code (a new random one, or the current one when rules change). */
  const resolve = useCallback(
    (codeOverride?: string | null) => {
      const inp = inputRef.current;
      const finalCode = codeOverride || stateRef.current.code || newDrawCode();
      const result = solve(inp, finalCode);
      const plan = result.ok ? result.plan : null;
      const { votes, placed } = initialPlacement(plan, inp);

      setState({
        phase: result.ok ? 'ready' : 'error',
        code: finalCode,
        plan,
        error: result.ok ? null : result.error,
        at: 0,
        placed,
        votes,
        group: null,
        last: null,
        auto: false,
      });
    },
    [setState],
  );

  // (Re)solve when the window opens and whenever the input (rules) changes.
  const openedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      stopAll();

      return;
    }

    stopAll();

    const first = !openedRef.current;

    openedRef.current = true;

    resolve(first ? newDrawCode() : stateRef.current.code);
  }, [open, input, resolve, stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  const buildStepTimeline = useCallback(
    (step: DrawStep): gsap.core.Timeline => {
      const tl = gsap.timeline({ paused: true });
      const ctx = copyRef.current;
      const inp = inputRef.current;
      const plan = stateRef.current.plan!;
      const groupEl = q('[data-spot="group"]');
      const groupPill = q('[data-spot="group-pill"]');
      const groupTextEl = q('[data-spot="group-text"]');
      const flagEl = q<HTMLImageElement>('[data-spot="flag"]');
      const nameEl = q('[data-spot="name"]');
      const capEl = q('[data-spot="cap"]');
      const semiChip = q('[data-spot="cap-semi"]');
      const semiChipText = q('[data-spot="cap-semi-text"]');
      const halfChip = q('[data-spot="cap-half"]');
      const reduced = prefersReducedMotion();

      if (step.t === 'group') {
        tl.call(() => {
          dom
            .root()
            ?.querySelectorAll<HTMLElement>('[data-pg]')
            .forEach((pg) =>
              pg.classList.toggle('is-active', pg.dataset.pg === step.key),
            );
          announce(
            `${groupLabel(ctx, step, inp.rules)}. ${groupText(ctx, step, inp)}`,
          );
        });
        tl.to([groupEl, nameEl, capEl, flagEl].filter(Boolean), {
          opacity: 0,
          duration: 0.15,
        });
        tl.call(() => {
          if (groupPill)
            groupPill.textContent = groupLabel(ctx, step, inp.rules);
          if (groupTextEl) groupTextEl.textContent = groupText(ctx, step, inp);
        });
        if (groupEl) {
          tl.fromTo(
            groupEl,
            { opacity: 0, y: 6 },
            { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
          );
        }

        const pg = q(`[data-pg="${step.key}"]`);

        if (pg && !reduced) {
          tl.fromTo(
            pg,
            { scale: 1 },
            {
              scale: 1.03,
              duration: 0.18,
              yoyo: true,
              repeat: 1,
              ease: 'power1.inOut',
            },
            0.15,
          );
        }
        tl.to({}, { duration: 0.45 });

        return tl;
      }

      const name = ctx.nameOf(step.code);
      const src = flagSrcOf(step.code);
      const [capSemi, capHalf] = captionFor(ctx, step);
      const sourceEl = q(
        step.t === 'entrant' && step.fixed
          ? `[data-fx="${step.code}"]`
          : `[data-pc="${step.code}"]`,
      );
      const sourceFlag = sourceEl?.querySelector<HTMLElement>('img') ?? null;
      const panel = q(`[data-panel="${step.stageId}"]`);
      let lane: HTMLElement | null = null;
      let target: HTMLElement | null = null;
      let targetFlag: HTMLElement | null = null;

      if (step.t === 'preq') {
        lane = q(`[data-vl="${step.stageId}"]`);
        target = lane?.querySelector<HTMLElement>('[data-vl-pending]') ?? null;
        lane?.querySelectorAll<HTMLElement>('[data-vl-empty]').forEach((el) => {
          el.style.display = 'none';
        });
        if (target) {
          target.style.display = '';
          target.style.opacity = '0';
          const img = target.querySelector<HTMLImageElement>('img');
          const label = target.querySelector<HTMLElement>('[data-vl-name]');

          if (img) img.src = src;
          if (label) label.textContent = name;
          targetFlag = img;
        }
      } else {
        const laneKey = laneKeyFor(plan, step.stageId, step.half);
        const slot =
          plan.order === 'positions'
            ? step.pos - 1
            : Object.values(stateRef.current.placed).filter(
                (p) => p.lane === laneKey,
              ).length;

        lane = q(`[data-lane="${laneKey}"]`);
        target = q(`[data-slot="${laneKey}-${slot}"]`);
        targetFlag = target?.querySelector<HTMLElement>('img') ?? null;
      }

      const fill = () => {
        if (!target) return;
        if (step.t === 'preq') {
          target.style.opacity = '1';

          return;
        }
        target.classList.add('is-on');
        if (step.fixed) target.classList.add('is-fx');
        const img = target.querySelector<HTMLImageElement>('img');
        const label = target.querySelector<HTMLElement>('[data-slot-name]');
        const pin = target.querySelector<HTMLElement>('[data-slot-pin]');

        if (img) {
          img.src = src;
          img.classList.remove('dp-dw-ghost');
        }
        if (label) label.textContent = name;
        if (pin) pin.style.display = step.fixed ? '' : 'none';
      };
      const setSpot = () => {
        if (flagEl) {
          flagEl.src = src;
          flagEl.style.opacity = '1';
          flagEl.classList.remove('is-settled');
        }
        if (nameEl) nameEl.textContent = name;
        if (semiChipText) semiChipText.textContent = capSemi;
        if (halfChip) {
          halfChip.textContent = capHalf;
          halfChip.style.display = capHalf ? '' : 'none';
        }
        if (capEl) capEl.style.opacity = '1';
      };
      const highlight = (on: boolean) => {
        panel?.classList.toggle('is-hl', on);
        lane?.classList.toggle(
          'is-hl',
          on && step.t === 'entrant' && !!capHalf,
        );
      };

      setSpot();

      if (reduced) {
        gsap.set([flagEl, nameEl, capEl].filter(Boolean), { opacity: 0 });
        tl.call(() => {
          sourceEl?.classList.add('is-taken');
          highlight(true);
          announce(liveText(ctx, step));
        });
        tl.to([flagEl, nameEl, capEl].filter(Boolean), {
          opacity: 1,
          duration: 0.15,
        });
        tl.call(fill, undefined, '+=0.25');
        if (target) {
          tl.fromTo(target, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        }
        tl.to({}, { duration: 0.5 });
        tl.call(() => {
          highlight(false);
          flagEl?.classList.add('is-settled');
        });

        return tl;
      }

      const root = dom.root();
      const fly = dom.fly();
      const relRect = (el: HTMLElement) => {
        const r = el.getBoundingClientRect();
        const R = root!.getBoundingClientRect();

        return {
          x: r.left - R.left,
          y: r.top - R.top,
          w: r.width,
          h: r.height,
        };
      };
      const makeFlyer = (rect: {
        x: number;
        y: number;
        w: number;
        h: number;
      }) => {
        const img = document.createElement('img');

        img.src = src;
        img.alt = '';
        img.setAttribute('data-flyer', '');
        img.className =
          'absolute object-contain pointer-events-none will-change-transform';
        Object.assign(img.style, {
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${rect.w}px`,
          height: `${rect.h}px`,
        });
        fly?.appendChild(img);

        return img;
      };
      const flyTo = (
        from: { x: number; y: number; w: number },
        to: { x: number; y: number; w: number },
      ) => ({ x: to.x - from.x, y: to.y - from.y, scale: to.w / from.w });

      if (!root || !fly || !flagEl) {
        tl.call(() => {
          sourceEl?.classList.add('is-taken');
          fill();
          announce(liveText(ctx, step));
        });

        return tl;
      }

      const spotRect = relRect(flagEl);
      const fromRect = sourceFlag ? relRect(sourceFlag) : spotRect;
      const toRect = targetFlag ? relRect(targetFlag) : spotRect;
      const flyer1 = makeFlyer(fromRect);
      const flyer2 = makeFlyer(spotRect);
      const flyAt = step.t === 'preq' ? 1.78 : 2.08;

      gsap.set([flyer1, flyer2], { opacity: 0, transformOrigin: '0 0' });
      gsap.set([flagEl, nameEl].filter(Boolean), { opacity: 0 });
      if (capEl) gsap.set(capEl, { opacity: 1 });
      gsap.set([semiChip, halfChip].filter(Boolean), { opacity: 0 });

      tl.call(() => sourceEl?.classList.add('is-taken'), undefined, 0.05);
      tl.set(flyer1, { opacity: 1 }, 0);
      tl.to(
        flyer1,
        { ...flyTo(fromRect, spotRect), duration: 0.55, ease: 'power3.out' },
        0,
      );
      tl.set(flagEl, { opacity: 1 }, 0.55);
      tl.set(flyer1, { opacity: 0 }, 0.55);
      if (nameEl) {
        tl.fromTo(
          nameEl,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.25,
            ease: 'power2.out',
            immediateRender: false,
          },
          0.43,
        );
      }
      if (semiChip) {
        tl.fromTo(
          semiChip,
          { opacity: 0, x: -12 },
          {
            opacity: 1,
            x: 0,
            duration: 0.3,
            ease: 'back.out(1.7)',
            immediateRender: false,
          },
          0.88,
        );
      }
      tl.call(
        () => {
          panel?.classList.add('is-hl');
          if (!capHalf) announce(liveText(ctx, step));
        },
        undefined,
        0.88,
      );
      if (capHalf && halfChip) {
        tl.fromTo(
          halfChip,
          { opacity: 0, x: -8 },
          {
            opacity: 1,
            x: 0,
            duration: 0.25,
            ease: 'power2.out',
            immediateRender: false,
          },
          1.33,
        );
        tl.call(
          () => {
            highlight(true);
            announce(liveText(ctx, step));
          },
          undefined,
          1.33,
        );
      }
      tl.set(flyer2, { opacity: 1 }, flyAt);
      tl.to(flagEl, { opacity: 0.28, duration: 0.2 }, flyAt);
      tl.to(
        flyer2,
        { ...flyTo(spotRect, toRect), duration: 0.6, ease: 'power2.inOut' },
        flyAt,
      );
      tl.call(
        () => {
          fill();
          flyer1.remove();
          flyer2.remove();
        },
        undefined,
        flyAt + 0.6,
      );
      if (target) {
        tl.fromTo(
          target,
          { scale: 1.12 },
          {
            scale: 1,
            duration: 0.22,
            ease: 'back.out(2)',
            immediateRender: false,
          },
          flyAt + 0.6,
        );
      }
      tl.call(() => highlight(false), undefined, flyAt + 0.82);

      return tl;
    },
    [announce, dom, flagSrcOf, q],
  );

  const finish = useCallback(() => {
    const { current } = stateRef;

    if (current.phase === 'done' || !current.plan) return;

    stopAll();

    let next = current;

    while (next.at < next.plan!.steps.length) {
      next = { ...applyStep(next, next.plan!.steps[next.at]), at: next.at + 1 };
    }

    setState({ ...next, phase: 'done', auto: false });
    announce(copyRef.current.t('liveComplete'));
  }, [announce, setState, stopAll]);

  const runStepRef = useRef<() => void>(() => undefined);

  const finishStep = useCallback(
    (step: DrawStep) => {
      const { current } = stateRef;
      const { plan } = current;

      if (!plan) return;

      // Hide the pending voter chip before React renders the real one.
      if (step.t === 'preq') {
        const pending = q(`[data-vl="${step.stageId}"] [data-vl-pending]`);

        if (pending) pending.style.display = 'none';
      }

      const next = { ...applyStep(current, step), at: current.at + 1 };

      setState(next);

      if (next.at >= plan.steps.length) {
        finishCall.current = gsap.delayedCall(
          0.6 / DRAW_SPEEDS[next.speedIndex],
          finish,
        );

        return;
      }

      if (next.auto) {
        autoCall.current = gsap.delayedCall(
          0.3 / DRAW_SPEEDS[next.speedIndex],
          () => runStepRef.current(),
        );
      }
    },
    [finish, q, setState],
  );

  const runStep = useCallback(() => {
    // One reveal at a time: a stray auto-play or "Draw next" call while a
    // timeline is still running would start a second flyer for the next step.
    if (timeline.current) return;

    const { current } = stateRef;
    const step = current.plan?.steps[current.at];

    if (!step) {
      finish();

      return;
    }

    const tl = buildStepTimeline(step);

    timeline.current = tl;
    tl.timeScale(DRAW_SPEEDS[current.speedIndex]);
    tl.eventCallback('onComplete', () => {
      if (timeline.current === tl) timeline.current = null;
      finishStep(step);
    });
    tl.play();
  }, [buildStepTimeline, finish, finishStep]);

  runStepRef.current = runStep;

  const start = useCallback(
    (auto: boolean) => {
      if (stateRef.current.phase !== 'ready') return;

      setState({ phase: 'drawing', auto });
      // Let React paint the drawing layout before the first timeline measures it.
      gsap.delayedCall(0.03, () => runStepRef.current());
    },
    [setState],
  );

  const next = useCallback(() => {
    const { current } = stateRef;

    if (current.phase === 'ready') {
      start(false);

      return;
    }
    if (current.phase !== 'drawing') return;

    killAuto();

    if (timeline.current) {
      const tl = timeline.current;

      timeline.current = null;
      tl.progress(1); // fires onComplete → finishStep
      // finishStep re-arms auto-play after the gap; this call owns the
      // follow-up instead, so the next reveal is scheduled exactly once.
      killAuto();
    }

    if (stateRef.current.phase === 'drawing') {
      // After the state commit, so the re-render lands before the next reveal mutates the DOM.
      gsap.delayedCall(0.03, () => {
        if (stateRef.current.phase === 'drawing') runStepRef.current();
      });
    }
  }, [start]);

  const setAuto = useCallback(
    (auto: boolean) => {
      setState({ auto });
      if (auto) {
        if (!timeline.current && stateRef.current.phase === 'drawing') {
          runStepRef.current();
        }
      } else {
        killAuto();
      }
    },
    [setState],
  );

  const setSpeedIndex = useCallback(
    (speedIndex: number) => {
      setState({ speedIndex });
      timeline.current?.timeScale(DRAW_SPEEDS[speedIndex]);
    },
    [setState],
  );

  const instant = useCallback(() => {
    if (stateRef.current.phase !== 'ready') return;
    setState({ phase: 'drawing', auto: false });
    finish();
  }, [finish, setState]);

  const redraw = useCallback(() => {
    stopAll();
    resolve(newDrawCode());
  }, [resolve, stopAll]);

  const progress = useMemo(() => {
    if (!state.plan) return { done: 0, total: 0 };

    return {
      done: state.plan.steps.slice(0, state.at).filter((s) => s.t !== 'group')
        .length,
      total: state.plan.total,
    };
  }, [state.plan, state.at]);

  return {
    state,
    progress,
    start,
    next,
    finish,
    instant,
    redraw,
    setAuto,
    setSpeedIndex,
    stopAll,
  };
};
