'use client';
import React, { useCallback, useRef, useState } from 'react';

import { editorHistory, useEditorStore } from './editorStore';
import {
  HandleId,
  Point,
  Rect,
  resizeRect,
  rotateRect,
  roundRect,
  snapRect,
  SnapGuide,
} from './geometry';

const SNAP_SCREEN_PX = 6;

const toRect = (el: {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}): Rect => ({ x: el.x, y: el.y, w: el.w, h: el.h, rotation: el.rotation });

interface GestureCtx {
  kind: 'move' | 'resize' | 'rotate';
  id: string;
  start: Rect;
  startPointer: Point; // screen px
  handle?: HandleId;
  pivot?: Point; // screen px, for rotate
  shift: boolean;
  /** History is paused right after the first tracked set of the gesture. */
  paused: boolean;
}

/**
 * Pointer gestures for the PoC stage. Deltas are measured in screen pixels
 * and divided by the stage zoom.
 *
 * One undo entry per gesture: the first set of a gesture is tracked (zundo
 * pushes the pre-gesture state), then the history is paused for the rest of
 * the drag and resumed on release. The final rounding set must not push the
 * last dragged position, so its push is reverted.
 */
export function useGestures(stageRef: React.RefObject<HTMLDivElement | null>) {
  const [guides, setGuides] = useState<SnapGuide[]>([]);
  const [active, setActive] = useState<GestureCtx['kind'] | null>(null);
  const ctxRef = useRef<GestureCtx | null>(null);

  const finish = useCallback(() => {
    const ctx = ctxRef.current;

    ctxRef.current = null;
    setGuides([]);
    setActive(null);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', finish);
    if (!ctx) return;

    editorHistory.getState().resume();
    const { design, updateElement, bumpOps } = useEditorStore.getState();
    const el = design.elements.find((e) => e.id === ctx.id);

    if (el) {
      // Round the final coordinates (kills float drift) without adding a
      // second history entry for this gesture.
      const { pastStates } = editorHistory.getState();

      updateElement(ctx.id, roundRect(toRect(el)));
      editorHistory.setState({ pastStates });
    }
    bumpOps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMove = useCallback((e: PointerEvent) => {
    const ctx = ctxRef.current;

    if (!ctx) return;
    const {
      zoom,
      design,
      updateElement: rawUpdate,
    } = useEditorStore.getState();
    const dx = (e.clientX - ctx.startPointer.x) / zoom;
    const dy = (e.clientY - ctx.startPointer.y) / zoom;
    const shift = e.shiftKey || ctx.shift;
    const updateElement: typeof rawUpdate = (id, patch) => {
      const before = editorHistory.getState().pastStates.length;

      rawUpdate(id, patch);
      // Pause once the pre-gesture state has been pushed.
      if (!ctx.paused && editorHistory.getState().pastStates.length > before) {
        ctx.paused = true;
        editorHistory.getState().pause();
      }
    };

    if (ctx.kind === 'move') {
      const moved: Rect = {
        ...ctx.start,
        x: ctx.start.x + dx,
        y: ctx.start.y + dy,
      };
      const others = design.elements
        .filter((o) => o.id !== ctx.id && !o.hidden)
        .map(toRect);
      const snapped = shift
        ? { rect: moved, guides: [] }
        : snapRect(moved, design.canvas, others, SNAP_SCREEN_PX / zoom);

      setGuides(snapped.guides);
      updateElement(ctx.id, { x: snapped.rect.x, y: snapped.rect.y });

      return;
    }

    if (ctx.kind === 'resize' && ctx.handle) {
      const next = resizeRect(
        ctx.start,
        ctx.handle,
        { x: dx, y: dy },
        {
          keepAspect: shift,
        },
      );

      updateElement(ctx.id, next);

      return;
    }

    if (ctx.kind === 'rotate' && ctx.pivot) {
      const next = rotateRect(
        ctx.start,
        ctx.pivot,
        ctx.startPointer,
        { x: e.clientX, y: e.clientY },
        shift ? 15 : undefined,
      );

      updateElement(ctx.id, { rotation: next.rotation });
    }
  }, []);

  const begin = useCallback(
    (ctx: GestureCtx) => {
      ctxRef.current = ctx;
      setActive(ctx.kind);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    },
    [onMove, finish],
  );

  const getElement = (id: string) =>
    useEditorStore.getState().design.elements.find((e) => e.id === id);

  const startMove = useCallback(
    (e: React.PointerEvent, id: string) => {
      const el = getElement(id);

      if (!el || el.locked) return;
      e.preventDefault();
      begin({
        kind: 'move',
        id,
        start: toRect(el),
        startPointer: { x: e.clientX, y: e.clientY },
        shift: e.shiftKey,
        paused: false,
      });
    },
    [begin],
  );

  const startResize = useCallback(
    (e: React.PointerEvent, id: string, handle: HandleId) => {
      const el = getElement(id);

      if (!el || el.locked) return;
      e.preventDefault();
      e.stopPropagation();
      begin({
        kind: 'resize',
        id,
        handle,
        start: toRect(el),
        startPointer: { x: e.clientX, y: e.clientY },
        shift: e.shiftKey,
        paused: false,
      });
    },
    [begin],
  );

  const startRotate = useCallback(
    (e: React.PointerEvent, id: string) => {
      const el = getElement(id);
      const stage = stageRef.current;

      if (!el || el.locked || !stage) return;
      e.preventDefault();
      e.stopPropagation();
      const { zoom } = useEditorStore.getState();
      const box = stage.getBoundingClientRect();
      const pivot = {
        x: box.left + (el.x + el.w / 2) * zoom,
        y: box.top + (el.y + el.h / 2) * zoom,
      };

      begin({
        kind: 'rotate',
        id,
        pivot,
        start: toRect(el),
        startPointer: { x: e.clientX, y: e.clientY },
        shift: e.shiftKey,
        paused: false,
      });
    },
    [begin, stageRef],
  );

  return { startMove, startResize, startRotate, guides, active };
}
