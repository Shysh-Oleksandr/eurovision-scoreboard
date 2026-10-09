import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// `yarn build:native` sets NATIVE_EXPORT to produce the static bundle
// Capacitor ships inside the iOS/Android apps (`out/`); it also sets
// NEXT_PUBLIC_NATIVE_APP, the client-side flag (src/native/platform.ts), which
// `yarn dev:native` sets alone. The Cloudflare (web) build sets neither, so
// the web config below is unchanged. See docs/native-apps.md.
const isNativeExport = process.env.NATIVE_EXPORT === '1';

const nativeOverrides: NextConfig = isNativeExport
  ? {
      output: 'export',
      // No image optimizer without a server.
      images: { unoptimized: true },
      // Route handlers (src/app/api/**/route.ts) cannot be exported. Leaving
      // `ts` out of the page extensions drops them from the native build
      // without touching the files; every page/layout/error file is `.tsx`.
      pageExtensions: ['tsx', 'jsx'],
    }
  : {};

const nextConfig: NextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
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
