'use client';
import React, { useCallback, useLayoutEffect, useState } from 'react';

import { Design, DesignElement, walkElements } from '../model/design';
import { Rect } from '../model/geometry';

export interface ElementBox extends Rect {
  /** Child of a stack: positioned by flow, not by x/y. */
  inFlow: boolean;
}

export type BoxMap = Map<string, ElementBox>;

const sameBox = (a: ElementBox | undefined, b: ElementBox) =>
  !!a &&
  a.x === b.x &&
  a.y === b.y &&
  a.w === b.w &&
  a.h === b.h &&
  a.rotation === b.rotation &&
  a.inFlow === b.inFlow;

/**
 * The on-canvas box of every element, in design px. Free elements take
 * x/y from the model and their layout size from the DOM (content-sized
 * elements have no `w`/`h`); stack children take everything from the DOM.
 * Re-measured after every render of the design and whenever a measured node
 * resizes (rows arriving, fonts loading).
 */
export function useElementBoxes(
  designNodeRef: React.RefObject<HTMLDivElement | null>,
  design: Design,
  zoom: number,
): { boxes: BoxMap; remeasure: () => void } {
  const [boxes, setBoxes] = useState<BoxMap>(() => new Map());
  const [tick, setTick] = useState(0);
  const remeasure = useCallback(() => setTick((t) => t + 1), []);

  useLayoutEffect(() => {
    const root = designNodeRef.current;

    if (!root) return undefined;
    // One id → element map per measure (the DOM walk is per node already).
    const byId = new Map<string, { el: DesignElement; inFlow: boolean }>();

    walkElements(design.elements, (el, parent) =>
      byId.set(el.id, { el, inFlow: parent !== null }),
    );
    const measure = () => {
      const rootRect = root.getBoundingClientRect();
      const next: BoxMap = new Map();
      const nodes = root.querySelectorAll<HTMLElement>('[data-element-id]');

      nodes.forEach((node) => {
        const id = node.dataset.elementId;

        if (!id) return;
        const found = byId.get(id);

        if (!found) return;
        const { el, inFlow } = found;
        const w = node.offsetWidth;
        const h = node.offsetHeight;
        let { x } = el;
        let { y } = el;

        if (inFlow || (el.type === 'stack' && el.fillCanvas)) {
          const r = node.getBoundingClientRect();
          // Centre of the bounding box is rotation-invariant.
          const cx = (r.left + r.width / 2 - rootRect.left) / zoom;
          const cy = (r.top + r.height / 2 - rootRect.top) / zoom;

          x = cx - w / 2;
          y = cy - h / 2;
        }
        next.set(id, { x, y, w, h, rotation: el.rotation, inFlow });
      });

      setBoxes((prev) => {
        if (prev.size === next.size) {
          let same = true;

          next.forEach((box, id) => {
            if (!sameBox(prev.get(id), box)) same = false;
          });
          if (same) return prev;
        }

        return next;
      });
    };

    measure();
    const observer = new ResizeObserver(() => measure());

    root
      .querySelectorAll<HTMLElement>('[data-element-id]')
      .forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [designNodeRef, design, zoom, tick]);

  return { boxes, remeasure };
}

/** Box for an element, falling back to the model when not yet measured. */
export const boxOf = (
  boxes: BoxMap,
  el: DesignElement,
  inFlow = false,
): ElementBox =>
  boxes.get(el.id) ?? {
    x: el.x,
    y: el.y,
    w: el.w ?? 0,
    h: el.h ?? 0,
    rotation: el.rotation,
    inFlow,
  };
