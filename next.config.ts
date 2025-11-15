import type { NextConfig } from 'next';

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
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/**',
      },
    ],
  },
};

export default nextConfig;
