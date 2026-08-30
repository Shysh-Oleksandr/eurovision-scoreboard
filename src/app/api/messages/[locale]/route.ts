import { normalizeLocale } from '@/i18n/catalog';
import { getMergedMessages } from '@/i18n/serverMessages';

/**
 * Serves the merged message catalog for a locale. Two jobs:
 * - dev-mode source for AppIntlProvider (`next dev` runs no prebuild, so the
 *   hashed static files under public/messages may not exist);
 * - production fallback for the deploy race (a still-open tab holds a
 *   document naming a pruned hash → the static file 404s → this route is
 *   always current).
 * Deliberately no-store: the immutable caching lives on /messages/* only.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  const messages = await getMergedMessages(normalizeLocale(locale));

  return Response.json(messages, {
    headers: { 'cache-control': 'no-store' },
  });
}
