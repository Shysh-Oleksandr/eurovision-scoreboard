import type { MetadataRoute } from 'next';

import { APP_STORES_LIVE, GET_APP_PATH } from '@/config/appStores';
import { SITE_URL } from '@/config/seo';

// Website only, like robots.ts.
export const dynamic = 'force-static';

/** The indexable pages; share links (`/?contest=…`) all canonicalize to `/`. */
const SITEMAP_PATHS = [
  '/',
  '/about',
  '/privacy',
  '/terms',
  ...(APP_STORES_LIVE ? [GET_APP_PATH] : []),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return SITEMAP_PATHS.map((path) => ({ url: `${SITE_URL}${path}` }));
}
