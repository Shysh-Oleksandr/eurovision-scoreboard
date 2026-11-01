import { RefObject, useCallback, useLayoutEffect, useState } from 'react';

/** One layout variant, written to the element as `data-<key>="<value>"`. */
export type FitStep = Readonly<Record<string, string>>;

/** Badge dots and similar decorations may poke out by a few px. */
const OVERFLOW_TOLERANCE = 4;

const MEASURING_ATTRIBUTE = 'data-fit-measuring';

const overflows = (el: Element) =>
  el.scrollWidth - el.clientWidth > OVERFLOW_TOLERANCE;

/**
 * Index of the first step at which `el` (or, with `targets`, every matching
 * descendant) has no horizontal overflow; else the last step.
 */
const measureFitStep = (
  el: HTMLElement,
  steps: readonly FitStep[],
  targets?: string,
) => {
  const keys = new Set(steps.flatMap((step) => Object.keys(step)));
  const saved = new Map<string, string | null>();

  keys.forEach((key) => saved.set(key, el.getAttribute(`data-${key}`)));
  el.setAttribute(MEASURING_ATTRIBUTE, '');

  let fit = steps.length - 1;

  for (let i = 0; i < steps.length - 1; i += 1) {
    Object.entries(steps[i]).forEach(([key, value]) =>
      el.setAttribute(`data-${key}`, value),
    );

    const fits = targets
      ? !Array.from(el.querySelectorAll(targets)).some(overflows)
      : !overflows(el);

    if (fits) {
      fit = i;
      break;
    }
  }

  // React owns these attributes: put back what it rendered.
  saved.forEach((value, key) => {
    if (value === null) el.removeAttribute(`data-${key}`);
    else el.setAttribute(`data-${key}`, value);
  });
  el.removeAttribute(MEASURING_ATTRIBUTE);

  return fit;
};

/**
 * Picks the first of `steps` (roomiest first) at which the element lays out
 * on its width without horizontal overflow: e.g. one row, then two rows,
 * then two rows with fewer labels. CSS keyed on each step's `data-*`
 * attributes decides what a step changes; spread `fitStepAttributes(step)`
 * on the element to render the pick.
 *
 * Use it on an element without horizontal padding: items that run into the
 * padding don't count as overflow (`scrollWidth` stops at the padding box).
 * When the overflow to watch sits inside cells that don't reach the
 * element's edge (a title in one of three grid columns), pass `targets`, a
 * selector for the descendants that must not overflow instead.
 *
 * While measuring, the element carries `data-fit-measuring`: CSS should give
 * every item its natural width then (`flex: none`, no stretching), so a step
 * only "fits" when nothing would have to squeeze. Measuring re-runs after
 * every render of the host, on width changes, when text inside changes (a
 * child that renders on its own, a label) and when web fonts load. Hidden
 * (zero width) elements aren't measured.
 *
 * `steps` must be stable (a module-level constant).
 */
export const useFitStep = (
  ref: RefObject<HTMLElement | null>,
  steps: readonly FitStep[],
  { targets }: { targets?: string } = {},
): number => {
  const [index, setIndex] = useState(0);

  const measure = useCallback(() => {
    const el = ref.current;

    if (!el || el.clientWidth === 0) return;

    setIndex(measureFitStep(el, steps, targets));
  }, [ref, steps, targets]);

  // Every render: the host's own content (labels, chips) may have changed.
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const el = ref.current;

    if (!el) return undefined;

    let lastWidth = el.clientWidth;
    const resizeObserver = new ResizeObserver(() => {
      // Steps change the height; only a new width can change the pick.
      if (el.clientWidth === lastWidth) return;

      lastWidth = el.clientWidth;
      measure();
    });
    const mutationObserver = new MutationObserver(measure);

    resizeObserver.observe(el);
    mutationObserver.observe(el, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    document.fonts?.addEventListener('loadingdone', measure);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      document.fonts?.removeEventListener('loadingdone', measure);
    };
  }, [ref, measure]);

  return index;
};

/** The `data-*` props for a step, to spread on the measured element. */
export const fitStepAttributes = (step: FitStep) =>
  Object.fromEntries(
    Object.entries(step).map(([key, value]) => [`data-${key}`, value]),
  );
