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
      {
        source: '/gano',
        destination: '/agno',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
