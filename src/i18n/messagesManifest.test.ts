import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { deepMergeMessages, SUPPORTED_LOCALES } from './catalog';
import { MESSAGES_CATALOG } from './messagesManifest.generated';

/**
 * The hashed catalog URLs in the committed manifest must match what the
 * current messages/*.json produce — a translation edit that skipped
 * `yarn gen:messages` would otherwise ship documents pointing at catalogs
 * that no longer exist (the runtime falls back to /api/messages, but the
 * immutable-cache win is lost). Recomputes from source, so it needs no
 * gitignored payload files.
 */
describe('messages manifest', () => {
  it('matches hashes recomputed from messages/*.json', () => {
    const messagesDir = path.join(__dirname, '..', '..', 'messages');
    const read = (locale: string) =>
      JSON.parse(
        readFileSync(path.join(messagesDir, `${locale}.json`), 'utf8'),
      );
    const en = read('en');

    for (const locale of SUPPORTED_LOCALES) {
      const merged = locale === 'en' ? en : deepMergeMessages(en, read(locale));
      const hash = createHash('sha256')
        .update(JSON.stringify(merged), 'utf8')
        .digest('hex')
        .slice(0, 10);

      expect(MESSAGES_CATALOG[locale]).toEqual({
        url: `/messages/${locale}.${hash}.json`,
        hash,
      });
    }
  });
});
