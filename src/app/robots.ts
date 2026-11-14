import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/config/seo';

// Website only: `.ts` isn't a page extension in the apps' static export
// (next.config.ts), so this route doesn't exist there.
export const dynamic = 'force-static';

/**
 * Every crawler may read the public pages, search and AI answer engines
 * included. Cloudflare's managed robots.txt prepends its content-signals
 * preamble to this file; bot blocking it adds there comes on top.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/dev/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
