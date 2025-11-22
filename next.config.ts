import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

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
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
