import { useEffect, useState } from 'react';

import { loadFlagImageColors } from '@/douze/flagPalette';
import { getFlagPathForImageGeneration } from '@/helpers/getFlagPath';

const cache = new Map<string, Promise<string[] | null>>();

/** The flag's colours by URL, read once per session (a failure is retried). */
const readFlag = (flag: string): Promise<string[] | null> => {
  // Foreign links go through the website's image proxy; the CDN (uploads,
  // presets) answers with CORS; `/flags/` paths and data URLs are readable.
  const src = getFlagPathForImageGeneration({
    code: 'custom-colors',
    name: '',
    flag,
  });

  // A staged upload is read as it is, not kept (a big string).
  if (src.startsWith('data:')) return loadFlagImageColors(src);

  let colors = cache.get(src);

  if (!colors) {
    colors = loadFlagImageColors(src, {
      crossOrigin: /^https?:\/\//i.test(src),
    });
    cache.set(src, colors);
    void colors.then((result) => {
      if (!result) cache.delete(src);
    });
  }

  return colors;
};

/**
 * The main colours of the flag being edited (a `/flags/` path, a URL or a
 * staged upload's data URL), in the order rows read them: what Custom
 * colours start from. Null while reading, and when the image can't be read
 * (a foreign link in the apps, which have no proxy).
 */
export const useFlagImageColors = (flag: string): string[] | null => {
  const [read, setRead] = useState<{
    flag: string;
    colors: string[] | null;
  } | null>(null);

  useEffect(() => {
    if (!flag) return undefined;

    let cancelled = false;

    void readFlag(flag).then((colors) => {
      if (!cancelled) setRead({ flag, colors });
    });

    return () => {
      cancelled = true;
    };
  }, [flag]);

  return read?.flag === flag ? read.colors : null;
};
