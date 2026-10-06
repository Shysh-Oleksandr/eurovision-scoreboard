'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface PinchState {
  /** Multiplier on the fit zoom, 1 = fit. */
  scale: number;
  /** Extra translation in screen px, applied after centring. */
  pan: { x: number; y: number };
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 24;

const dist = (a: PointerEvent, b: PointerEvent) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
const mid = (a: PointerEvent, b: PointerEvent) => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
});

/**
 * Phone stage zoom: two fingers pinch (scale around the midpoint) and pan;
 * a double tap toggles between fit and 2.5× around the tap. Attach the
 * returned handlers to the viewport; while two pointers are down the
 * element gestures (move) are suppressed through `isPinching`.
 */
export function usePinchZoom(
  enabled: boolean,
  viewportRef: React.RefObject<HTMLElement | null>,
) {
  const [state, setState] = useState<PinchState>({
    scale: 1,
    pan: { x: 0, y: 0 },
  });
  const pointers = useRef(new Map<number, PointerEvent>());
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    startMid: { x: number; y: number };
    startPan: { x: number; y: number };
  } | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const [isPinching, setPinching] = useState(false);

  const reset = useCallback(() => {
    setState({ scale: 1, pan: { x: 0, y: 0 } });
  }, []);

  useEffect(() => {
    if (!enabled) reset();
  }, [enabled, reset]);

  useEffect(() => {
    const el = viewportRef.current;

    if (!el || !enabled) return undefined;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pointers.current.set(e.pointerId, e);
      if (pointers.current.size === 2) {
        const [a, b] = [...pointers.current.values()];

        pinchRef.current = {
          startDist: dist(a, b),
          startScale: state.scale,
          startMid: mid(a, b),
          startPan: state.pan,
        };
        setPinching(true);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, e);
      const pinch = pinchRef.current;

      if (!pinch || pointers.current.size < 2) return;
      e.preventDefault();
      const [a, b] = [...pointers.current.values()];
      const rect = el.getBoundingClientRect();
      const m = mid(a, b);
      const scale = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, (pinch.startScale * dist(a, b)) / pinch.startDist),
      );
      // Keep the point under the fingers fixed: scale the start midpoint
      // (relative to the viewport centre) and add the finger travel.
      const k = scale / pinch.startScale;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const pan = {
        x:
          (pinch.startPan.x + (pinch.startMid.x - cx)) * k -
          (pinch.startMid.x - cx) +
          (m.x - pinch.startMid.x),
        y:
          (pinch.startPan.y + (pinch.startMid.y - cy)) * k -
          (pinch.startMid.y - cy) +
          (m.y - pinch.startMid.y),
      };

      setState(scale <= 1 ? { scale: 1, pan: { x: 0, y: 0 } } : { scale, pan });
    };
    const onUp = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const wasPinch = !!pinchRef.current;

      pointers.current.delete(e.pointerId);
      if (pointers.current.size < 2) {
        pinchRef.current = null;
        if (wasPinch) {
          // Swallow the taps that end a pinch.
          setTimeout(() => setPinching(false), 50);
          lastTap.current = null;

          return;
        }
      }
      if (pointers.current.size === 0 && e.pointerType === 'touch') {
        const now = Date.now();
        const prev = lastTap.current;

        if (
          prev &&
          now - prev.t < DOUBLE_TAP_MS &&
          Math.hypot(prev.x - e.clientX, prev.y - e.clientY) < DOUBLE_TAP_PX
        ) {
          lastTap.current = null;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;

          setState((s) =>
            s.scale > 1
              ? { scale: 1, pan: { x: 0, y: 0 } }
              : {
                  scale: 2.5,
                  // Bring the tapped point to the centre.
                  pan: {
                    x: -(e.clientX - cx) * 2.5,
                    y: -(e.clientY - cy) * 2.5,
                  },
                },
          );
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
    };

    el.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });

    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onUp, { capture: true });
    };
  }, [enabled, viewportRef, state.scale, state.pan]);

  return { ...state, isPinching, reset };
}
