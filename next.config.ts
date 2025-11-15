import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false,
  productionBrowserSourceMaps: true,
  expireTime: 0,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allows images from all HTTPS domains
      },
      {
        protocol: 'http',
        hostname: '**', // Allows images from all HTTP domains (if needed)
      },
    ],
  },
};

export default nextConfig;
