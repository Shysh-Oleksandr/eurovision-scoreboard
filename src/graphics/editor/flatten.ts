import { Design, DesignElement, isStack } from '../model/design';
import { resizeModeOf } from '../model/elements';

import { BoxMap } from './useElementBoxes';

/**
 * Turn every stack into free elements at the positions the layout gave
 * them. Templates and share images are built from flow stacks so they stay
 * responsive to the number of rows; the editor flattens them on open so
 * every element can be dragged, resized and reordered like on a blank
 * design (the user can republish the result as their own template).
 * Content-sized elements keep their measured width only (scoreboard) or
 * nothing (stats, branding); a content-sized canvas becomes a fixed one at
 * its measured size.
 */
export function flattenStacks(
  design: Design,
  boxes: BoxMap,
  measured: { width: number; height: number } | null,
): Design {
  if (!design.elements.some(isStack)) return design;
  const out: DesignElement[] = [];
  const place = (el: DesignElement) => {
    if (isStack(el)) {
      el.children.forEach(place);

      return;
    }
    const box = boxes.get(el.id);
    const mode = resizeModeOf(el);
    // Hidden children have no DOM node: give them a visible, centred box
    // so they can be found when shown again.
    const fallbackW = el.w ?? Math.round(design.canvas.width * 0.6);
    const fallbackH = el.h ?? 60;
    const next: DesignElement = {
      ...el,
      x: Math.round(
        box?.x ?? (el.hidden ? (design.canvas.width - fallbackW) / 2 : el.x),
      ),
      y: Math.round(
        box?.y ?? (el.hidden ? (design.canvas.height - fallbackH) / 2 : el.y),
      ),
    };

    if (box) {
      if (mode !== 'none') next.w = Math.max(1, Math.round(box.w));
      if (mode === 'all') next.h = Math.max(1, Math.round(box.h));
    } else if (el.hidden) {
      if (mode !== 'none') next.w = fallbackW;
      if (mode === 'all') next.h = fallbackH;
    }
    out.push(next);
  };

  design.elements.forEach(place);

  const canvas = design.canvas.autoSize
    ? {
        ...design.canvas,
        autoSize: false,
        width: measured?.width ?? design.canvas.width,
        height: measured?.height ?? design.canvas.height,
      }
    : design.canvas;

  return { ...design, canvas, elements: out };
}

/** Ids of the elements that render (hidden subtrees have no DOM node). */
export function visibleElementIds(elements: DesignElement[]): string[] {
  const ids: string[] = [];
  const walk = (list: DesignElement[]) =>
    list.forEach((el) => {
      if (el.hidden) return;
      ids.push(el.id);
      if (isStack(el)) walk(el.children);
    });

  walk(elements);

  return ids;
}

export const hasStacks = (design: Design): boolean =>
  design.elements.some(isStack);
