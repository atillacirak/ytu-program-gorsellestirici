import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /\/api\/curricula\/.*/i,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'ytu-bologna-curricula-cache',
          expiration: {
            maxEntries: 80,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Gün
          },
        },
      },
      {
        urlPattern: /\/api\/course-lookup.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'ytu-course-lookup-cache',
          expiration: {
            maxEntries: 500,
            maxAgeSeconds: 14 * 24 * 60 * 60, // 14 Gün
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'ytuprogram.vercel.app',
          },
        ],
        destination: 'https://ytudostun.com/:path*',
        permanent: true,
      },
      {
        source: '/gano',
        destination: '/agno',
        permanent: true,
      },
    ];
  },
};

export default withPWA(nextConfig);

