import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'YTÜ Dostun',
    short_name: 'YTÜ Dostun',
    description: 'YTÜ\'lülerin yeni nesil ders ve not yönetim portalı.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
