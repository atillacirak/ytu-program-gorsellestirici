import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uygun Musun? • YTÜ Dostun',
  description: 'Arkadaş grubunla canlı ders durumu ve ortak boş saat takibi.',
  manifest: '/manifest.webmanifest?path=/uygun-musun',
  appleWebApp: {
    capable: true,
    title: 'Uygun Musun?',
    statusBarStyle: 'default',
  },
};

export default function UygunMusunLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
