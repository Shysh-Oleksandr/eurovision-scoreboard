import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { YEARS_WITH_THEME } from './themes';
import { getThemeThumbnail } from './themeThumbnails';

describe('getThemeThumbnail', () => {
  it('has a thumbnail file for every built-in theme', () => {
    const missing = YEARS_WITH_THEME.filter((key) => {
      const thumbnail = getThemeThumbnail(key);

      return (
        !thumbnail || !existsSync(path.join(process.cwd(), 'public', thumbnail))
      );
    });

    // Run `node scripts/theme-thumbnails.mjs` after adding a background.
    expect(missing).toEqual([]);
  });

  it('has none for an unknown key', () => {
    expect(getThemeThumbnail('1999')).toBeUndefined();
  });
});
