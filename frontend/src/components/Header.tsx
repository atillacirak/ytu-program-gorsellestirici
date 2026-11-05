"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Users, Calculator, ShieldCheck, GraduationCap, Compass, Sparkles, Radio, Smartphone } from 'lucide-react';
import WhatsNewModal from './WhatsNewModal';
import DeviceSyncModal from './DeviceSyncModal';

const WHATS_NEW_STORAGE_KEY = 'ytudostun_whats_new_v2_4_seen';
const PWA_ACTIVE_TAB_KEY = 'ytu_pwa_active_tab';
const PWA_BOOTED_SESSION_KEY = 'ytu_pwa_booted';

const TAB_TITLES: Record<string, string> = {
  '/': 'YTÜ Dostun',
  '/ortak': 'Ortak Saatler',
  '/uygun-musun': 'Uygun Musun?',
  '/uygun-musun-atilla': 'Uygun Musun',
  '/uygun-musun-neva': 'Uygun Musun',
  '/agno': 'YTÜ AGNO',
  '/devamsizlik': 'Devamsızlık',
  '/planlama': 'Planlama',
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [hasUnseenNews, setHasUnseenNews] = useState(false);
  const [isDeviceSyncOpen, setIsDeviceSyncOpen] = useState(false);

  // Mobil PWA (Ana Ekrana Ekle) için aktif sekmeyi ve manifest start_url'ini senkronize et
  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;

    try {
      // 1. <link rel="manifest"> ve iOS başlığını bulunduğun sekmeye göre güncelle
      const manifestHref = `/manifest.webmanifest?path=${encodeURIComponent(pathname)}`;
      let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (manifestLink) {
        if (manifestLink.getAttribute('href') !== manifestHref) {
          manifestLink.setAttribute('href', manifestHref);
        }
      } else {
        manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = manifestHref;
        document.head.appendChild(manifestLink);
      }

      const appTitle = TAB_TITLES[pathname] || 'YTÜ Dostun';
      let appleTitleMeta = document.querySelector(
        'meta[name="apple-mobile-web-app-title"]'
      ) as HTMLMetaElement | null;
      if (!appleTitleMeta) {
        appleTitleMeta = document.createElement('meta');
        appleTitleMeta.name = 'apple-mobile-web-app-title';
        document.head.appendChild(appleTitleMeta);
      }
      appleTitleMeta.content = appTitle;

      // 2. Standalone (Mobil Uygulama) ilk açılışında kaydedilen sekmeyi geri yükle
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        Boolean((window.navigator as any).standalone);
      const alreadyBooted = sessionStorage.getItem(PWA_BOOTED_SESSION_KEY) === '1';

      if (!alreadyBooted) {
        sessionStorage.setItem(PWA_BOOTED_SESSION_KEY, '1');
        if (isStandalone && pathname === '/') {
          const savedTab = localStorage.getItem(PWA_ACTIVE_TAB_KEY);
          if (savedTab && savedTab !== '/' && savedTab.startsWith('/')) {
            router.replace(savedTab);
            return;
          }
        }
      }

      // Kullanıcının aktif bulunduğu sekmeyi kaydet
      if (pathname !== '/stats') {
        localStorage.setItem(PWA_ACTIVE_TAB_KEY, pathname);
      }
    } catch {}
  }, [pathname, router]);

  const handleTabNavClick = (targetPath: string) => {
    try {
      sessionStorage.setItem(PWA_BOOTED_SESSION_KEY, '1');
      localStorage.setItem(PWA_ACTIVE_TAB_KEY, targetPath);
    } catch {}
    if (typeof window !== 'undefined' && pathname !== targetPath) {
      setTimeout(() => {
        if (window.location.pathname !== targetPath) {
          window.location.assign(targetPath);
        }
      }, 450);
    }
  };

  useEffect(() => {
    try {
      const seen = localStorage.getItem(WHATS_NEW_STORAGE_KEY);
      if (!seen) {
        setHasUnseenNews(true);
        const timer = setTimeout(() => {
          setIsWhatsNewOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleCloseWhatsNew = () => {
    setIsWhatsNewOpen(false);
    setHasUnseenNews(false);
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, 'true');
    } catch {}
  };

  const handleOpenWhatsNew = () => {
    setIsWhatsNewOpen(true);
    setHasUnseenNews(false);
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, 'true');
    } catch {}
  };

  if (pathname === '/stats' || pathname.startsWith('/uygun-musun-')) return null;
  const isOrtak = pathname === '/ortak';
  const isSingle = pathname === '/' && !isOrtak;
  const isAgno = pathname === '/agno';
  const isDevamsizlik = pathname === '/devamsizlik';
  const isPlanlama = pathname === '/planlama';
  const isUygunMusun = pathname === '/uygun-musun';

  return (
    <>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 no-print shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo */}
          <Link
            href="/"
            onClick={() => handleTabNavClick('/')}
            className="flex items-center space-x-3.5 text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0c3f79] group-hover:bg-[#00306a] flex items-center justify-center text-white shadow-xs transition-colors">
              <GraduationCap className="w-5 h-5 text-[#e7a240]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0c3f79] tracking-tight transition-colors flex items-center gap-1.5">
                  <span>YTÜ Dostun</span>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">v2.4</span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">Ders &amp; Not Yönetimi</p>
            </div>
          </Link>

          {/* Navigation Tabs + Yenilikler Button */}
          <div className="flex items-center gap-2 max-w-full">
            <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto hide-scrollbar">
              
              <Link 
                href="/"
                onClick={() => handleTabNavClick('/')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isSingle
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tekli Program</span>
              </Link>

              <Link 
                href="/ortak"
                onClick={() => handleTabNavClick('/ortak')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isOrtak
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="sm:hidden">Ortak Saatler</span>
                <span className="hidden sm:inline">Ortak Boş Saatler (Karşılaştır)</span>
              </Link>

              <Link 
                href="/uygun-musun"
                onClick={() => handleTabNavClick('/uygun-musun')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isUygunMusun
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className={`w-3.5 h-3.5 ${isUygunMusun ? 'text-amber-400 animate-pulse' : 'text-rose-500'}`} />
                <span>Uygun Musun?</span>
                <span
                  className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full leading-tight ${
                    isUygunMusun
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#0c3f79] text-amber-300'
                  }`}
                >
                  Yeni
                </span>
              </Link>

              <Link 
                href="/agno"
                onClick={() => handleTabNavClick('/agno')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isAgno
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className={`w-3.5 h-3.5 ${isAgno ? 'text-amber-400' : 'text-blue-500'}`} />
                <span>AGNO Hesapla</span>
              </Link>

              <Link 
                href="/devamsizlik"
                onClick={() => handleTabNavClick('/devamsizlik')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isDevamsizlik
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Devamsızlık Takibi</span>
              </Link>

              <Link 
                href="/planlama"
                onClick={() => handleTabNavClick('/planlama')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isPlanlama
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isPlanlama ? 'text-amber-400' : 'text-emerald-600'}`} />
                <span>Akademik Planlama</span>
              </Link>

            </div>

            <button
              type="button"
              onClick={() => setIsDeviceSyncOpen(true)}
              className="relative px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 border border-slate-200/90 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
              title="Bilgisayar ve telefon arasında programı eşle"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#0c3f79]" />
              <span className="hidden sm:inline">Cihaz Eşle</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsNew}
              className="relative px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 text-amber-900 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
              title="Siteye eklenen yeni özellikleri gör"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Yenilikler</span>
              {hasUnseenNews && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </header>

      <WhatsNewModal isOpen={isWhatsNewOpen} onClose={handleCloseWhatsNew} />
      <DeviceSyncModal isOpen={isDeviceSyncOpen} onClose={() => setIsDeviceSyncOpen(false)} />
    </>
  );
}

