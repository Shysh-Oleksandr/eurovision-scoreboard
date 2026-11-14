import { RefObject, useEffect, useRef } from 'react';

import { detectDevicePlatform } from '@/components/appPromo/appPromoPolicy';

/** Pixels a drag has to travel before it opens or closes a sheet. */
export const DRAG_THRESHOLD = 28;

/**
 * Movement before a press becomes a drag (or is left to a scroll or tap).
 * Under Chrome's own scroll slop (8dp), or its pan would win in the controls.
 */
const DRAG_SLOP = 6;

/**
 * A drag further than a tap's wobble swallows the click it may end in (the
 * browsers still call a press that moved 8-15px a tap): letting go over a
 * random scope after pulling the sheet must not run it.
 */
const TAP_SLOP = 10;

/** Presses here type or slide; they never drag the sheet. */
const NO_DRAG = 'input, textarea, select';

interface SheetDragOptions {
  /** Off: no listeners (the sheet can't move). */
  enabled: boolean;
  /** The finger is `dy` px below where it went down (above: negative). */
  onDrag: (dy: number) => void;
  /** Let go `dy` px from where it went down. */
  onRelease: (dy: number) => void;
  /** The drag was taken away (the browser's own gesture, unmount): settle. */
  onCancel: () => void;
}

interface Gesture {
  pointerId: number;
  x: number;
  y: number;
  /** `pending` until DRAG_SLOP; `ignore`: sideways, or the content scrolls. */
  mode: 'pending' | 'drag' | 'ignore';
  /** The furthest the drag went from its start (px). */
  travel: number;
  /** Scroll containers between the press and the sheet, innermost first. */
  scrollers: HTMLElement[];
}

const scrollersBetween = (target: Element, root: Element) => {
  const found: HTMLElement[] = [];

  for (
    let el: Element | null = target;
    el && el !== root;
    el = el.parentElement
  ) {
    if (el instanceof HTMLElement) {
      const { overflowY } = getComputedStyle(el);

      if (overflowY === 'auto' || overflowY === 'scroll') found.push(el);
    }
  }

  return found;
};

/** Whether a move of `dy` scrolls content instead (down: back to its top). */
const canScroll = (scrollers: HTMLElement[], dy: number) =>
  scrollers.some((el) =>
    dy > 0
      ? el.scrollTop > 0
      : el.scrollTop + el.clientHeight < el.scrollHeight - 1,
  );

/** A vertical move the sheet takes (no scroll under the finger wants it). */
const isSheetMove = (gesture: Gesture, dx: number, dy: number) =>
  Math.abs(dy) > Math.abs(dx) && !canScroll(gesture.scrollers, dy);

/**
 * Drags a bottom sheet from anywhere on `ref`, not just its handle. A press
 * becomes a drag past DRAG_SLOP when the move is vertical and nothing under
 * the finger scrolls that way: scrolled controls scroll back to their top
 * first, then the next pull down moves the sheet. Inputs never drag.
 *
 * Touch scrolling stays native: a non-passive `touchmove` cancels it only
 * for a sheet drag (React's touch listeners are passive, so this can't be
 * `onTouchMove`). A drag past TAP_SLOP swallows the click it may end in, so
 * letting go over a button doesn't press it. The handlers are read fresh on
 * each event; they need not be stable.
 */
export const useSheetDrag = (
  ref: RefObject<HTMLElement | null>,
  { enabled, ...handlers }: SheetDragOptions,
) => {
  const handlersRef = useRef(handlers);

  handlersRef.current = handlers;

  useEffect(() => {
    const root = ref.current;

    if (!enabled || !root) return undefined;

    const isIOS =
      detectDevicePlatform(navigator.userAgent, navigator.maxTouchPoints) ===
      'ios';
    let gesture: Gesture | null = null;
    let swallowClick = false;

    const decide = (x: number, y: number) => {
      if (gesture?.mode !== 'pending') return;

      const dx = x - gesture.x;
      const dy = y - gesture.y;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_SLOP) return;

      gesture.mode = isSheetMove(gesture, dx, dy) ? 'drag' : 'ignore';
    };

    const end = (e: PointerEvent, cancelled: boolean) => {
      if (!gesture || e.pointerId !== gesture.pointerId) return;

      const { mode, y, travel } = gesture;

      gesture = null;

      if (mode !== 'drag') return;

      if (cancelled) {
        handlersRef.current.onCancel();

        return;
      }

      swallowClick = travel >= TAP_SLOP;
      handlersRef.current.onRelease(e.clientY - y);
    };

    const onPointerDown = (e: PointerEvent) => {
      swallowClick = false;

      if (!e.isPrimary || e.button !== 0) return;

      // A new primary press means the last pointer is gone, even if its
      // release happened off the sheet.
      if (gesture?.mode === 'drag') handlersRef.current.onCancel();
      gesture = null;

      const target = e.target as Element;

      if (target.closest(NO_DRAG)) return;

      gesture = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        mode: 'pending',
        travel: 0,
        scrollers: scrollersBetween(target, root),
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!gesture || e.pointerId !== gesture.pointerId) return;

      decide(e.clientX, e.clientY);

      if (gesture.mode !== 'drag') return;

      // From here it is a drag: keep the pointer even off the sheet.
      try {
        if (!root.hasPointerCapture(e.pointerId)) {
          root.setPointerCapture(e.pointerId);
        }
      } catch {
        // The pointer is already gone; the drag still ends on pointerup.
      }

      const dy = e.clientY - gesture.y;

      gesture.travel = Math.max(gesture.travel, Math.abs(dy));
      handlersRef.current.onDrag(dy);
    };

    const onPointerUp = (e: PointerEvent) => end(e, false);
    const onPointerCancel = (e: PointerEvent) => end(e, true);

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches.item(0);

      if (!gesture || !touch || !e.cancelable) return;

      decide(touch.clientX, touch.clientY);

      const dx = touch.clientX - gesture.x;
      const dy = touch.clientY - gesture.y;

      // iOS commits to its own pan (a scroll, the rubber band at the top) on
      // the first touchmove it may run, often before DRAG_SLOP: there a move
      // that would drag the sheet is held from the start. (Chrome only pans
      // past its own, larger slop, so it waits for the decision.)
      if (
        gesture.mode === 'drag' ||
        (isIOS && gesture.mode === 'pending' && isSheetMove(gesture, dx, dy))
      ) {
        e.preventDefault();
      }
    };

    const onClick = (e: MouseEvent) => {
      // Keyboard presses (detail 0) are never a drag's.
      if (!swallowClick || e.detail === 0) return;

      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', onPointerUp);
    root.addEventListener('pointercancel', onPointerCancel);
    root.addEventListener('touchmove', onTouchMove, { passive: false });
    root.addEventListener('click', onClick, true);

    return () => {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', onPointerUp);
      root.removeEventListener('pointercancel', onPointerCancel);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('click', onClick, true);

      if (gesture?.mode === 'drag') handlersRef.current.onCancel();
    };
  }, [ref, enabled]);
};
