import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Atilla & Neva • Uygun Musun?',
  description: 'Atilla & Neva canlı ders ve müsaitlik takibi.',
  manifest: '/manifest.webmanifest?path=/uygun-musun-atilla',
  appleWebApp: {
    capable: true,
    title: 'Uygun Musun',
    statusBarStyle: 'default',
  },
};

export default function UygunMusunAtillaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
