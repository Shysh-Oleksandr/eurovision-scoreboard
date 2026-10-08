'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { DesignElement } from '../model/design';
import { findElement, resizeModeOf } from '../model/elements';
import {
  DistanceHint,
  HandleId,
  Point,
  Rect,
  resizeRect,
  rotateRect,
  roundRect,
  snapRect,
  SnapGuide,
} from '../model/geometry';

import { editorHistory, useEditorStore } from './editorStore';
import { BoxMap, boxOf } from './useElementBoxes';

const SNAP_SCREEN_PX = 6;
const MIN_SIZE = 24;
/** At least this much of a moved element stays inside the canvas. */
const MIN_INSIDE = 32;

const clampToCanvas = (
  p: Point,
  box: Rect,
  canvas: { width: number; height: number },
): Point => {
  const keepX = Math.min(MIN_INSIDE, box.w);
  const keepY = Math.min(MIN_INSIDE, box.h);

  return {
    x: Math.max(keepX - box.w, Math.min(canvas.width - keepX, p.x)),
    y: Math.max(keepY - box.h, Math.min(canvas.height - keepY, p.y)),
  };
};

interface MoveCtx {
  kind: 'move';
  ids: string[];
  starts: Record<string, Point>;
  startPointer: Point;
  moved: boolean;
}

interface ResizeCtx {
  kind: 'resize';
  id: string;
  handle: HandleId;
  start: Rect;
  startPointer: Point;
  heightLocked: boolean;
}

interface RotateCtx {
  kind: 'rotate';
  id: string;
  start: Rect;
  pivot: Point;
  startPointer: Point;
}

type GestureCtx = (MoveCtx | ResizeCtx | RotateCtx) & {
  /** History is paused right after the first tracked set of the gesture. */
  paused: boolean;
  pointerId: number;
};

export interface GestureFeedback {
  guides: SnapGuide[];
  hint: DistanceHint | null;
  /** Element the hint belongs to (the one being moved). */
  hintFor: string | null;
  active: GestureCtx['kind'] | null;
}

/**
 * Pointer gestures on the stage. Deltas are measured in screen pixels and
 * divided by the zoom. One undo entry per gesture: the first set of a gesture
 * is tracked (zundo pushes the pre-gesture state), then the history is
 * paused for the rest of the drag and resumed on release; the final rounding
 * set's push is reverted so the last dragged position is not a second entry.
 */
export function useGestures(
  designNodeRef: React.RefObject<HTMLDivElement | null>,
  boxesRef: React.MutableRefObject<BoxMap>,
  zoomRef: React.MutableRefObject<number>,
) {
  const [feedback, setFeedback] = useState<GestureFeedback>({
    guides: [],
    hint: null,
    hintFor: null,
    active: null,
  });
  const ctxRef = useRef<GestureCtx | null>(null);

  const trackedUpdate = useCallback(
    (
      ctx: GestureCtx,
      apply: (
        update: (id: string, patch: Partial<DesignElement>) => void,
      ) => void,
    ) => {
      const { updateElement } = useEditorStore.getState();
      const before = editorHistory.getState().pastStates.length;

      apply(updateElement);
      // Pause once the pre-gesture state has been pushed.
      if (!ctx.paused && editorHistory.getState().pastStates.length > before) {
        ctx.paused = true;
        editorHistory.getState().pause();
      }
    },
    [],
  );

  const onMove = useCallback(
    (e: PointerEvent) => {
      const ctx = ctxRef.current;

      if (!ctx || e.pointerId !== ctx.pointerId) return;
      const zoom = zoomRef.current;
      const { design } = useEditorStore.getState();
      const dx = (e.clientX - ctx.startPointer.x) / zoom;
      const dy = (e.clientY - ctx.startPointer.y) / zoom;
      const shift = e.shiftKey;

      if (ctx.kind === 'move') {
        if (Math.abs(dx) + Math.abs(dy) > 0.5) ctx.moved = true;
        if (!ctx.moved) return;
        let guides: SnapGuide[] = [];
        let hint: DistanceHint | null = null;
        const patches: Record<string, Point> = {};

        ctx.ids.forEach((id) => {
          patches[id] = {
            x: ctx.starts[id].x + dx,
            y: ctx.starts[id].y + dy,
          };
        });

        if (ctx.ids.length === 1 && !shift) {
          const [id] = ctx.ids;
          const found = findElement(design.elements, id);

          if (found) {
            const box = boxOf(boxesRef.current, found.el);
            const moving: Rect = { ...box, x: patches[id].x, y: patches[id].y };
            const others: Rect[] = design.elements
              .filter((o) => o.id !== id && !o.hidden)
              .map((o) => boxOf(boxesRef.current, o));
            const snapped = snapRect(
              moving,
              design.canvas,
              others,
              SNAP_SCREEN_PX / zoom,
            );

            patches[id] = { x: snapped.rect.x, y: snapped.rect.y };
            ({ guides, hint } = snapped);
          }
        }

        // Never let an element leave the canvas entirely: the canvas clips,
        // so a fully outside element would have nothing left to grab.
        ctx.ids.forEach((id) => {
          const found = findElement(design.elements, id);

          if (!found) return;
          const box = boxOf(boxesRef.current, found.el);

          patches[id] = clampToCanvas(patches[id], box, design.canvas);
        });

        trackedUpdate(ctx, (update) => {
          ctx.ids.forEach((id) =>
            update(id, {
              x: Math.round(patches[id].x),
              y: Math.round(patches[id].y),
            }),
          );
        });
        setFeedback({
          guides,
          hint,
          hintFor: ctx.ids.length === 1 ? ctx.ids[0] : null,
          active: 'move',
        });

        return;
      }

      if (ctx.kind === 'resize') {
        const next = resizeRect(
          ctx.start,
          ctx.handle,
          { x: dx, y: dy },
          { keepAspect: shift && ctx.handle.length === 2, minSize: MIN_SIZE },
        );

        trackedUpdate(ctx, (update) =>
          update(
            ctx.id,
            ctx.heightLocked
              ? { x: next.x, y: next.y, w: next.w }
              : { x: next.x, y: next.y, w: next.w, h: next.h },
          ),
        );
        setFeedback({
          guides: [],
          hint: null,
          hintFor: null,
          active: 'resize',
        });

        return;
      }

      if (ctx.kind === 'rotate') {
        const next = rotateRect(
          ctx.start,
          ctx.pivot,
          ctx.startPointer,
          { x: e.clientX, y: e.clientY },
          shift ? 15 : undefined,
        );
        let { rotation } = next;

        // A small dead zone around 0° so "straight" is easy to hit.
        if (rotation < 3 || rotation > 357) rotation = 0;
        trackedUpdate(ctx, (update) => update(ctx.id, { rotation }));
        setFeedback({
          guides: [],
          hint: null,
          hintFor: null,
          active: 'rotate',
        });
      }
    },
    [boxesRef, zoomRef, trackedUpdate],
  );

  const finish = useCallback(
    (e?: PointerEvent) => {
      const ctx = ctxRef.current;

      if (!ctx || (e && e.pointerId !== ctx.pointerId)) return;
      ctxRef.current = null;
      setFeedback({ guides: [], hint: null, hintFor: null, active: null });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);

      editorHistory.getState().resume();
      const { design, updateElement } = useEditorStore.getState();
      const ids = ctx.kind === 'move' ? ctx.ids : [ctx.id];
      const { pastStates } = editorHistory.getState();

      ids.forEach((id) => {
        const found = findElement(design.elements, id);

        if (!found) return;
        const { el } = found;
        const rounded = roundRect({
          x: el.x,
          y: el.y,
          w: el.w ?? 0,
          h: el.h ?? 0,
          rotation: el.rotation,
        });
        const patch: Partial<DesignElement> = {
          x: rounded.x,
          y: rounded.y,
          rotation: rounded.rotation,
        };

        // Only a resize may touch the size: a click on a 2 px rule must not
        // turn it into a 24 px bar.
        if (ctx.kind === 'resize') {
          if (el.w !== undefined) patch.w = Math.max(MIN_SIZE, rounded.w);
          if (el.h !== undefined) patch.h = Math.max(MIN_SIZE, rounded.h);
        }
        updateElement(id, patch);
      });
      // The rounding set must not add a second history entry.
      editorHistory.setState({ pastStates });
    },
    [onMove],
  );

  useEffect(
    () => () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      // Unmounted mid-drag: never leave the history paused.
      if (ctxRef.current?.paused) editorHistory.getState().resume();
      ctxRef.current = null;
    },
    [onMove, finish],
  );

  const begin = useCallback(
    (ctx: GestureCtx) => {
      ctxRef.current = ctx;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', finish);
      window.addEventListener('pointercancel', finish);
    },
    [onMove, finish],
  );

  /** Start moving the given (top-level, unlocked) elements. */
  const startMove = useCallback(
    (e: React.PointerEvent, ids: string[]) => {
      const { design } = useEditorStore.getState();
      const starts: Record<string, Point> = {};
      const movable = ids.filter((id) => {
        const found = findElement(design.elements, id);

        if (!found || found.parent || found.el.locked) return false;
        if (found.el.type === 'stack' && found.el.fillCanvas) return false;
        starts[id] = { x: found.el.x, y: found.el.y };

        return true;
      });

      if (!movable.length) return;
      e.preventDefault();
      begin({
        kind: 'move',
        ids: movable,
        starts,
        startPointer: { x: e.clientX, y: e.clientY },
        moved: false,
        paused: false,
        pointerId: e.pointerId,
      });
    },
    [begin],
  );

  const startResize = useCallback(
    (e: React.PointerEvent, id: string, handle: HandleId) => {
      const { design } = useEditorStore.getState();
      const found = findElement(design.elements, id);

      if (!found || found.el.locked || found.parent) return;
      const mode = resizeModeOf(found.el);

      if (mode === 'none') return;
      if (mode === 'horizontal' && handle !== 'e' && handle !== 'w') return;
      e.preventDefault();
      e.stopPropagation();
      begin({
        kind: 'resize',
        id,
        handle,
        start: boxOf(boxesRef.current, found.el),
        startPointer: { x: e.clientX, y: e.clientY },
        heightLocked: mode === 'horizontal',
        paused: false,
        pointerId: e.pointerId,
      });
    },
    [begin, boxesRef],
  );

  const startRotate = useCallback(
    (e: React.PointerEvent, id: string) => {
      const { design } = useEditorStore.getState();
      const found = findElement(design.elements, id);
      const node = designNodeRef.current;

      if (!found || found.el.locked || found.parent || !node) return;
      e.preventDefault();
      e.stopPropagation();
      const zoom = zoomRef.current;
      const rect = node.getBoundingClientRect();
      const box = boxOf(boxesRef.current, found.el);
      const pivot = {
        x: rect.left + (box.x + box.w / 2) * zoom,
        y: rect.top + (box.y + box.h / 2) * zoom,
      };

      begin({
        kind: 'rotate',
        id,
        pivot,
        start: box,
        startPointer: { x: e.clientX, y: e.clientY },
        paused: false,
        pointerId: e.pointerId,
      });
    },
    [begin, boxesRef, designNodeRef, zoomRef],
  );

  return { startMove, startResize, startRotate, feedback };
}
