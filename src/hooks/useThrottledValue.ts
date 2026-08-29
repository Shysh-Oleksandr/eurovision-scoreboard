import { useEffect, useRef, useState } from 'react';

/**
 * Throttled mirror of `value`: updates at most once per `interval`, with the
 * final value always emitted (trailing edge).
 *
 * Unlike `useDebounce`, a stream of updates arriving faster than `interval`
 * still produces periodic emissions — a debounce would keep resetting its
 * timer and emit nothing until the stream pauses. Use this for live previews
 * that must keep updating *during* a drag.
 */
export function useThrottledValue<T>(value: T, interval: number): T {
  const [throttled, setThrottled] = useState<T>(value);
  const lastEmitRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const latestRef = useRef(value);

  latestRef.current = value;

  useEffect(() => {
    const elapsed = Date.now() - lastEmitRef.current;

    if (elapsed >= interval) {
      lastEmitRef.current = Date.now();
      setThrottled(value);
    } else if (timerRef.current === null) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        lastEmitRef.current = Date.now();
        setThrottled(latestRef.current);
      }, interval - elapsed);
    }
  }, [value, interval]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return throttled;
}
