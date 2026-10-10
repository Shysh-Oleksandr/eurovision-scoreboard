import type { NextConfig } from 'next';

import createNextIntlPlugin from 'next-intl/plugin';

import { liveUpdateBuildEnv } from './scripts/native-runtime.mjs';

// `yarn build:native` sets NATIVE_EXPORT to produce the static bundle
// Capacitor ships inside the iOS/Android apps (`out/`); it also sets
// NEXT_PUBLIC_NATIVE_APP, the client-side flag (src/native/platform.ts), which
// `yarn dev:native` sets alone. The Cloudflare (web) build sets neither and
// only differs from Next's defaults by the `web.tsx` page extension. See
// docs/native-apps.md.
const isNativeExport = process.env.NATIVE_EXPORT === '1';

// `web.tsx` marks website-only pages (`page.web.tsx`); the rest are Next's
// defaults.
const WEB_PAGE_EXTENSIONS = ['web.tsx', 'tsx', 'ts', 'jsx', 'js'];

const nativeOverrides: NextConfig = isNativeExport
  ? {
      output: 'export',
      // No image optimizer without a server.
      images: { unoptimized: true },
      // Route handlers (src/app/api/**/route.ts) cannot be exported. Leaving
      // `ts` out of the page extensions drops them from the native build
      // without touching the files; every page/layout/error file is `.tsx`.
      // Website-only pages (`page.web.tsx`: about, privacy, admin, dev) are
      // dropped the same way.
      pageExtensions: ['tsx', 'jsx'],
      // Live updates: this bundle's version, the native runtime fingerprints
      // it is built against, and where to look for newer bundles
      // (src/native/liveUpdate.ts, docs/native-apps.md §11).
      env: liveUpdateBuildEnv(),
    }
  : {
      pageExtensions: WEB_PAGE_EXTENSIONS,
    };

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // The app bundle ships without them (about half its size); set
  // NATIVE_SOURCEMAPS=1 for a debuggable native build.
  productionBrowserSourceMaps:
    !isNativeExport || process.env.NATIVE_SOURCEMAPS === '1',
  expireTime: 0,
  deploymentId: `${Date.now()}`,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        port: '',
        pathname: '**',
        hostname: '**', // Allows images from all HTTPS domains
      },
      {
        protocol: 'http',
        port: '',
        pathname: '**',
        hostname: '**', // Allows images from all HTTP domains (if needed)
      },
    ],
  },
  ...nativeOverrides,
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
