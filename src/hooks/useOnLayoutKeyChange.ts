import { useLayoutEffect, useRef } from 'react';

/**
 * Runs `onChange` in a layout effect only when `key` changes mid-life — never
 * on the initial render, and never for an empty key.
 *
 * This carries the GSAP layout-key invariant shared by the points/last-points
 * cleanup sites: freshly mounted nodes carry no GSAP inline styles, and
 * `clearProps` wipes gsap's per-element cache (forcing a getComputedStyle
 * reflow per element), so the clear must only run on a real theme/layout
 * change — running it for every row at stage start was a measured cost.
 */
export const useOnLayoutKeyChange = (key: string, onChange: () => void) => {
  const previousKeyRef = useRef(key);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    if (!key) return;
    if (previousKeyRef.current === key) return;

    previousKeyRef.current = key;
    onChangeRef.current();
  }, [key]);
};
