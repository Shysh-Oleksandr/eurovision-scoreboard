import { useState, useEffect, useRef } from 'react';

export function useDebounceWithCancel<T>(
  value: T,
  delay: number,
): [T, () => void] {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    timerRef.current = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timerRef.current!);
    };
  }, [value, delay]);

  return [debouncedValue, cancel];
}
