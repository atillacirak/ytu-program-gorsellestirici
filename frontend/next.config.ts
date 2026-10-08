import type { NextConfig } from 'next';
import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
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
