import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Local echo for a value edited at pointer-move frequency (color picker drags,
 * hue/shade slider drags).
 *
 * The editing component re-renders with `liveValue` on every move — cheap,
 * because only its own small subtree renders — while `onChange` (which lands in
 * CustomizeThemeModal state and re-renders the whole modal) fires on the
 * leading edge and then on a trailing 40 ms throttle, matching the cadence the
 * modal already uses for its live preview (`useDebounce(…, 40)`). The last
 * value always propagates: on the trailing edge, and on unmount.
 */
const PROPAGATE_MS = 40;

export function useThrottledEdit<T>(
  value: T,
  onChange: (value: T) => void,
): [T, (next: T) => void] {
  const [liveValue, setLiveValue] = useState<T>(value);
  // Distinguishes "no pending edit" from "pending edit whose value is undefined".
  const pendingRef = useRef<{ value: T } | null>(null);
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);

  onChangeRef.current = onChange;

  // Adopt external updates (undo buttons, prop-driven resets) whenever no edit
  // of our own is in flight.
  useEffect(() => {
    if (pendingRef.current === null && timerRef.current === null) {
      setLiveValue(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      // Flush the pending edit so closing the editor mid-drag loses nothing.
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingRef.current !== null) {
        onChangeRef.current(pendingRef.current.value);
        pendingRef.current = null;
      }
    };
  }, []);

  const handleChange = useCallback((next: T) => {
    setLiveValue(next);
    if (timerRef.current === null) {
      // Leading edge: propagate immediately so single clicks feel instant.
      onChangeRef.current(next);
      timerRef.current = window.setTimeout(function tick() {
        if (pendingRef.current !== null) {
          const { value: pending } = pendingRef.current;

          pendingRef.current = null;
          onChangeRef.current(pending);
          timerRef.current = window.setTimeout(tick, PROPAGATE_MS);
        } else {
          timerRef.current = null;
        }
      }, PROPAGATE_MS);
    } else {
      pendingRef.current = { value: next };
    }
  }, []);

  return [liveValue, handleChange];
}
