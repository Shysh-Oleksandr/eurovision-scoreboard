import { type RefObject, useLayoutEffect, useState } from 'react';

import { paletteFromColors, sampleFlagColors } from './flagPalette';

/**
 * The flag colours of the row `ref` sits in (up to three, very dark ones
 * lifted), for the hand-written douze animations' "Flag colors" option.
 * Reads the row's own flag image (`data-douze-anchor="flag"`), once it has
 * loaded. Null while disabled, and for a flag the canvas can't read
 * (another origin without CORS): the animation keeps its theme colours.
 */
export const useRowFlagColors = (
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
): string[] | null => {
  const [colors, setColors] = useState<string[] | null>(null);

  useLayoutEffect(() => {
    if (!enabled) {
      setColors(null);

      return undefined;
    }

    const flag = ref.current
      ?.closest('[data-douze-anchor="row"]')
      ?.querySelector('[data-douze-anchor="flag"]');

    if (!(flag instanceof HTMLImageElement)) return undefined;

    const read = () => {
      const sampled = sampleFlagColors(flag);

      if (!sampled) {
        setColors(null);

        return;
      }

      const { c1, c2, c3 } = paletteFromColors(sampled);

      setColors([c1, c2, c3].slice(0, sampled.length));
    };

    if (flag.complete) {
      read();

      return undefined;
    }

    flag.addEventListener('load', read, { once: true });

    return () => flag.removeEventListener('load', read);
  }, [ref, enabled]);

  return colors;
};
