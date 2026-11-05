import { NextRequest, NextResponse } from 'next/server';

const ROUTE_MANIFEST_META: Record<
  string,
  { name: string; short_name: string; description: string; start_url: string }
> = {
  '/uygun-musun': {
    name: 'Uygun Musun? • YTÜ Dostun',
    short_name: 'Uygun Musun?',
    description: 'Arkadaş grubunla canlı ders durumu ve ortak boş saat takibi.',
    start_url: '/uygun-musun',
  },
  '/uygun-musun-atilla': {
    name: 'Atilla & Neva • Uygun Musun?',
    short_name: 'Uygun Musun',
    description: 'Atilla & Neva canlı ders ve müsaitlik takibi.',
    start_url: '/uygun-musun-atilla',
  },
  '/uygun-musun-neva': {
    name: 'Neva & Atilla • Uygun Musun?',
    short_name: 'Uygun Musun',
    description: 'Neva & Atilla canlı ders ve müsaitlik takibi.',
    start_url: '/uygun-musun-neva',
  },
  '/ortak': {
    name: 'Ortak Boş Saatler • YTÜ Dostun',
    short_name: 'Ortak Saatler',
    description: 'Arkadaşlarınla ders programlarını karşılaştır ve ortak boş saatleri bul.',
    start_url: '/ortak',
  },
  '/agno': {
    name: 'AGNO Hesapla • YTÜ Dostun',
    short_name: 'YTÜ AGNO',
    description: 'YTÜ AGNO ve hedef ortalama simülatörü.',
    start_url: '/agno',
  },
  '/devamsizlik': {
    name: 'Devamsızlık Takibi • YTÜ Dostun',
    short_name: 'Devamsızlık',
    description: '14 haftalık ders devamsızlık çetelesi ve kalan hak takibi.',
    start_url: '/devamsizlik',
  },
  '/planlama': {
    name: 'Akademik Planlama • YTÜ Dostun',
    short_name: 'Planlama',
    description: 'YTÜ bölüm müfredatı, ön koşullar ve mezuniyet simülatörü.',
    start_url: '/planlama',
  },
};

export async function GET(request: NextRequest) {
  let targetPath = request.nextUrl.searchParams.get('path') || '';

  if (!targetPath) {
    const referer = request.headers.get('referer') || '';
    try {
      if (referer) {
        const refUrl = new URL(referer);
        targetPath = refUrl.pathname;
      }
    } catch {
      targetPath = '/';
    }
  }

  // Normalize path
  const cleanPath = targetPath.split('?')[0].replace(/\/+$/, '') || '/';
  const matched = ROUTE_MANIFEST_META[cleanPath] || {
    name: 'YTÜ Dostun',
    short_name: 'YTÜ Dostun',
    description: "YTÜ'lülerin yeni nesil ders ve not yönetim portalı.",
    start_url: cleanPath !== '/' && cleanPath.startsWith('/') ? cleanPath : '/',
  };

  const manifestData = {
    name: matched.name,
    short_name: matched.short_name,
    description: matched.description,
    start_url: matched.start_url,
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0c3f79',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifestData), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
