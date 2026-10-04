import type { NextConfig } from 'next';

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
    ];
  },
  async rewrites() {
    return [
      {
        source: '/agno',
        destination: '/gano',
      },
    ];
  },
};

export default nextConfig;
