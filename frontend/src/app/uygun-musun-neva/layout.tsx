import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Neva & Atilla • Uygun Musun?',
  description: 'Neva & Atilla canlı ders ve müsaitlik takibi.',
  manifest: '/manifest.webmanifest?path=/uygun-musun-neva',
  appleWebApp: {
    capable: true,
    title: 'Uygun Musun',
    statusBarStyle: 'default',
  },
};

export default function UygunMusunNevaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
