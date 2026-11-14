import type { Metadata } from 'next';

/** The public website's origin, without a trailing slash. */
export const SITE_URL = 'https://douzepoints.app';

export const SITE_NAME = 'DouzePoints';

/**
 * The link preview image every page shares: `og/og-image.jpg` from
 * `yarn store-screenshots --device og`, uploaded to the CDN by hand. A new
 * image needs a new file name: Facebook, X and LinkedIn cache it by URL.
 */
export const OG_IMAGE_URL =
  'https://cdn.douzepoints.app/general/og-image-2026-v2.jpg';

/**
 * Metadata for a website page other than the home page. Without it a page
 * inherits the root layout's canonical (`/`), title and description, which
 * tells search and answer engines it is a copy of the home page. Next
 * replaces `openGraph` and `twitter` wholesale rather than merging them with
 * the layout's, so they carry the site name and image again.
 */
export function pageMetadata({
  path,
  title,
  description,
}: {
  /** The page's path, starting with `/`. */
  path: string;
  title: string;
  description: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${path}`,
      title,
      description,
      siteName: SITE_NAME,
      images: [OG_IMAGE_URL],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE_URL],
    },
  };
}
