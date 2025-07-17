import { useEffect, RefObject } from 'react';

type AnyEvent = MouseEvent | TouchEvent;

export const useOnClickOutside = <T extends HTMLElement | null = HTMLElement>(
  ref: RefObject<T>,
  handler: (event: AnyEvent) => void,
  enabled = true,
) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const listener = (event: AnyEvent) => {
      const el = ref?.current;

      if (!el || el.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, enabled]);
};
