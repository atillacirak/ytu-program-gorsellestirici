"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Calculator, ShieldCheck, GraduationCap, Compass, Sparkles, Radio, Smartphone, Award, Palette } from 'lucide-react';
import WhatsNewModal from './WhatsNewModal';
import DeviceSyncModal from './DeviceSyncModal';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import {
  DEFAULT_THEME_ID,
  THEMES,
  THEME_STORAGE_KEY,
  ThemeId,
  isValidThemeId
} from '../utils/themes';

const WHATS_NEW_STORAGE_KEY = 'ytudostun_whats_new_v2_5_seen';
const PWA_ACTIVE_TAB_KEY = 'ytu_pwa_active_tab';
const PWA_BOOTED_SESSION_KEY = 'ytu_pwa_booted';

const TAB_TITLES: Record<string, string> = {
  '/': 'YTÜ Dostun',
  '/ortak': 'Ortak Saatler',
  '/uygun-musun': 'Uygun Musun?',
  '/uygun-musun-atilla': 'Uygun Musun',
  '/uygun-musun-neva': 'Uygun Musun',
  '/agno': 'YTÜ AGNO',
  '/harf-notu': 'Harf Notu',
  '/devamsizlik': 'Devamsızlık',
  '/planlama': 'Planlama',
};

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [hasUnseenNews, setHasUnseenNews] = useState(false);
  const [isDeviceSyncOpen, setIsDeviceSyncOpen] = useState(false);
  const [storedTheme, setStoredTheme, isThemeMounted] = useLocalStorageState<ThemeId>(
    THEME_STORAGE_KEY,
    DEFAULT_THEME_ID
  );
  const activeTheme: ThemeId = isValidThemeId(storedTheme) ? storedTheme : DEFAULT_THEME_ID;

  useEffect(() => {
    if (!isThemeMounted) return;
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [isThemeMounted, activeTheme]);

  const handleThemeSwitch = (id: ThemeId) => {
    setStoredTheme(id);
    document.documentElement.setAttribute('data-theme', id);
  };

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
  const isSingle = pathname === '/';
  const isAgno = pathname === '/agno';
  const isHarfNotu = pathname === '/harf-notu';
  const isDevamsizlik = pathname === '/devamsizlik';
  const isPlanlama = pathname === '/planlama';
  const isUygunMusun = pathname === '/uygun-musun' || pathname === '/ortak';

  return (
    <>
      <header
        className="sticky top-0 z-50 no-print transition-colors"
        style={{
          backgroundColor: 'var(--bg-header)',
          color: 'var(--header-text)'
        }}
      >
        {/* Satır 1: Marka Üst Çubuğu + Yardımcı Araçlar (Cihaz Eşle & Yenilikler) */}
        <div className="border-b" style={{ borderColor: 'var(--header-border)' }}>
          <div className="max-w-[1400px] mx-auto px-4 sm:px-5 h-[60px] flex items-center justify-between gap-3">
            {/* Logo */}
            <Link
              href="/"
              onClick={() => handleTabNavClick('/')}
              className="flex items-center space-x-3 text-left group cursor-pointer focus:outline-none shrink-0"
            >
              <div
                className="w-9 h-9 rounded flex items-center justify-center shadow-2xs transition-colors border border-white/20"
                style={{
                  backgroundColor: 'var(--header-logo-bg)',
                  color: 'var(--header-logo-fg)'
                }}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className="text-sm sm:text-base font-bold tracking-tight transition-colors flex items-center gap-1.5"
                    style={{ color: 'var(--header-text)' }}
                  >
                    <span>YTÜ Dostun</span>
                    <span
                      className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'var(--header-pill-bg)',
                        borderColor: 'var(--header-border)',
                        color: 'var(--header-muted)'
                      }}
                    >
                      v2.5
                    </span>
                  </h1>
                </div>
                <p className="text-[11px] font-medium" style={{ color: 'var(--header-muted)' }}>
                  Ders &amp; Not Yönetimi
                </p>
              </div>
            </Link>

            {/* Üst Sağ Aksiyonlar: Minimal Tema Seçici + Cihaz Eşle & Yenilikler */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                role="group"
                aria-label="Tema seçimi"
                title="Site temasını değiştir"
                className="flex items-center gap-1 px-1.5 py-1 rounded border"
                style={{
                  backgroundColor: 'var(--header-pill-bg)',
                  borderColor: 'var(--header-border)'
                }}
              >
                <span
                  className="flex items-center gap-1 text-[10px] font-bold pr-1 border-r"
                  style={{
                    color: 'var(--header-muted)',
                    borderColor: 'var(--header-border)'
                  }}
                >
                  <Palette className="w-3 h-3" />
                  <span className="hidden md:inline">Tema</span>
                </span>
                {THEMES.map((t) => {
                  const selected = t.id === activeTheme;
                  const shortLabel =
                    t.id === 'nordic-yellow'
                      ? 'Nordic'
                      : t.id === 'campuskit'
                        ? 'Campus'
                        : 'Klasik';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleThemeSwitch(t.id)}
                      title={`${t.name} temasına geç`}
                      aria-label={`${t.name} teması`}
                      aria-pressed={selected}
                      className={`h-5 px-1.5 rounded flex items-center gap-1 text-[10px] font-bold transition-all cursor-pointer ${
                        selected
                          ? 'ring-2 ring-amber-400 shadow-2xs'
                          : 'opacity-75 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: t.swatches[0],
                        color: '#FFFFFF'
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: t.swatches[1] }}
                      />
                      <span className="hidden lg:inline">{shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setIsDeviceSyncOpen(true)}
                className="header-util-btn px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Bilgisayar ve telefon arasında programı eşle"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Cihaz Eşle</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWhatsNew}
                className="header-cta-btn relative px-2.5 sm:px-3 py-1.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                title="Siteye eklenen yeni özellikleri gör"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Yenilikler</span>
                {hasUnseenNews && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Satır 2: İkincil Modül Navigasyonu (Kaydırma çubuğu olmadan 6 sade sekme) */}
        <nav
          aria-label="Ana Modüller"
          className="border-b transition-colors"
          style={{
            backgroundColor: 'var(--bg-subnav)',
            borderColor: 'var(--header-border)'
          }}
        >
          <div className="max-w-[1400px] mx-auto px-3 sm:px-5 flex flex-wrap items-center gap-1 sm:gap-2 min-h-[44px] py-1 sm:py-0">
            <Link
              href="/"
              onClick={() => handleTabNavClick('/')}
              className={`subnav-tab px-2.5 sm:px-3 h-9 sm:h-[44px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isSingle ? 'subnav-tab-active' : ''
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Tekli Program</span>
            </Link>

            <Link
              href="/uygun-musun"
              onClick={() => handleTabNavClick('/uygun-musun')}
              className={`subnav-tab px-2.5 sm:px-3 h-9 sm:h-[44px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isUygunMusun ? 'subnav-tab-active' : ''
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isUygunMusun ? 'animate-pulse' : ''}`} />
              <span>Uygun Musun?</span>
              <span className="nav-new-badge text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none">
                Yeni
              </span>
            </Link>

            <Link
              href="/agno"
              onClick={() => handleTabNavClick('/agno')}
              className={`subnav-tab px-2.5 sm:px-3 h-9 sm:h-[44px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isAgno ? 'subnav-tab-active' : ''
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>AGNO Hesapla</span>
            </Link>

            <Link
              href="/harf-notu"
              onClick={() => handleTabNavClick('/harf-notu')}
              className={`subnav-tab px-2.5 sm:px-3 h-9 sm:h-[44px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isHarfNotu ? 'subnav-tab-active' : ''
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Harf Notu</span>
              <span className="nav-new-badge text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none">
                Yeni
              </span>
            </Link>

            <Link
              href="/devamsizlik"
              onClick={() => handleTabNavClick('/devamsizlik')}
              className={`subnav-tab px-2.5 sm:px-3 h-9 sm:h-[44px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isDevamsizlik ? 'subnav-tab-active' : ''
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Devamsızlık Takibi</span>
            </Link>

            <Link
              href="/planlama"
              onClick={() => handleTabNavClick('/planlama')}
              className={`subnav-tab px-2.5 sm:px-3 h-9 sm:h-[44px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isPlanlama ? 'subnav-tab-active' : ''
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Akademik Planlama</span>
            </Link>
          </div>
        </nav>
      </header>

      <WhatsNewModal isOpen={isWhatsNewOpen} onClose={handleCloseWhatsNew} />
      <DeviceSyncModal isOpen={isDeviceSyncOpen} onClose={() => setIsDeviceSyncOpen(false)} />
    </>
  );
}

