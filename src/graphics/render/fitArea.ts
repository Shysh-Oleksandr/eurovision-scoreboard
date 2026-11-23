import { RefObject, useEffect, useLayoutEffect, useState } from 'react';

import { useLayoutSignal } from './layoutSignal';

export interface FitArea {
  /** Width of the element's slot. */
  w: number;
  /** Height of the element's box or flow slot (margins and padding included). */
  h: number;
}

const px = (value: string) => parseFloat(value) || 0;

/**
 * The space an auto-fit element (scoreboard, draw) may fill: its own box
 * when it has a height, else (in flow) what a fixed-height stack leaves
 * after its other children. `null` when the space depends on the element
 * itself (content-sized canvas, free element without a height) — the
 * element then keeps its stored sizes.
 */
export function measureFitArea(
  wrapper: HTMLElement,
  hasHeight: boolean,
): FitArea | null {
  const w = wrapper.clientWidth;

  if (hasHeight) return { w, h: wrapper.clientHeight };
  const stack = wrapper.parentElement;

  if (!stack?.hasAttribute('data-stack')) return null;
  if (stack.closest('[data-auto-size]')) return null;
  const cs = getComputedStyle(stack);
  const inner = stack.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);

  if (!cs.flexDirection.startsWith('column')) return { w, h: inner };
  const others = Array.from(stack.children).filter(
    (child): child is HTMLElement =>
      child !== wrapper && child instanceof HTMLElement,
  );
  const taken = others.reduce((sum, child) => {
    const style = getComputedStyle(child);

    return (
      sum + child.offsetHeight + px(style.marginTop) + px(style.marginBottom)
    );
  }, 0);
  const gaps = px(cs.rowGap) * Math.max(0, stack.children.length - 1);

  return { w, h: Math.max(0, inner - taken - gaps) };
}

/**
 * Measures the space of the element whose root is `ref` (its wrapper is the
 * root's parent: the flow or absolute child) and keeps it current. Before
 * the first measurement `measured` is false: the element renders
 * `data-fit-pending` so the editor waits, and it signals the editor once
 * measured (`LayoutSignalContext`).
 */
export function useFitArea(
  ref: RefObject<HTMLElement | null>,
  hasHeight: boolean,
): { area: FitArea | null; measured: boolean } {
  const [area, setArea] = useState<FitArea | null>(null);
  const [measured, setMeasured] = useState(false);
  const signal = useLayoutSignal();

  useLayoutEffect(() => {
    const wrapper = ref.current?.parentElement;

    if (!wrapper) return undefined;
    const measure = () => {
      const next = measureFitArea(wrapper, hasHeight);

      setArea((prev) =>
        prev &&
        next &&
        Math.abs(prev.w - next.w) < 0.5 &&
        Math.abs(prev.h - next.h) < 0.5
          ? prev
          : next,
      );
      setMeasured(true);
    };

    measure();
    const observer = new ResizeObserver(measure);

    observer.observe(wrapper);
    const stack = hasHeight ? null : wrapper.parentElement;

    if (stack?.hasAttribute('data-stack')) {
      observer.observe(stack);
      Array.from(stack.children).forEach((child) => {
        // Our own wrapper grows with the rows it fits: it is the result.
        if (child !== wrapper) observer.observe(child);
      });
    }

    return () => observer.disconnect();
  }, [ref, hasHeight]);

  useEffect(() => {
    if (measured) signal();
  }, [measured, area, signal]);

  return { area, measured };
}
