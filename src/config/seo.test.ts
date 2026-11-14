import { existsSync } from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

import { OG_IMAGE_URL, pageMetadata, SITE_URL } from './seo';

import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

const appDir = path.join(__dirname, '..', 'app');

/** Whether a website path has a page file (the home page lives in `(main)`). */
const hasPage = (pathname: string) => {
  const dir =
    pathname === '/'
      ? path.join(appDir, '(main)')
      : path.join(appDir, pathname);

  return ['page.tsx', 'page.web.tsx'].some((file) =>
    existsSync(path.join(dir, file)),
  );
};

describe('pageMetadata', () => {
  it('gives a page its own canonical and full link previews', () => {
    const metadata = pageMetadata({
      path: '/about',
      title: 'About',
      description: 'What it is',
    });

    expect(metadata.alternates).toEqual({ canonical: '/about' });
    expect(metadata.openGraph).toMatchObject({
      url: `${SITE_URL}/about`,
      title: 'About',
      description: 'What it is',
      siteName: 'DouzePoints',
      images: [OG_IMAGE_URL],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      images: [OG_IMAGE_URL],
    });
  });
});

describe('sitemap.xml', () => {
  it('lists only pages that exist, on the public origin', () => {
    const entries = sitemap();

    expect(entries.length).toBeGreaterThan(0);

    for (const { url } of entries) {
      expect(url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(hasPage(new URL(url).pathname)).toBe(true);
    }
  });
});

describe('robots.txt', () => {
  it('allows crawling and points at the sitemap', () => {
    const { rules, sitemap: sitemapUrl } = robots();

    expect(rules).toMatchObject({ userAgent: '*', allow: '/' });
    expect(sitemapUrl).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
