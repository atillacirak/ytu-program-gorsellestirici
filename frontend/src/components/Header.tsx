"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Calculator, ShieldCheck, GraduationCap, Compass, Sparkles } from 'lucide-react';
import WhatsNewModal from './WhatsNewModal';

const WHATS_NEW_STORAGE_KEY = 'ytudostun_whats_new_v2_3_seen';

export default function Header() {
  const pathname = usePathname();
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const [hasUnseenNews, setHasUnseenNews] = useState(false);

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

  if (pathname === '/stats') return null;
  const isOrtak = pathname === '/ortak';
  const isSingle = pathname === '/' && !isOrtak;
  const isAgno = pathname === '/agno';
  const isDevamsizlik = pathname === '/devamsizlik';
  const isPlanlama = pathname === '/planlama';

  return (
    <>
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 no-print shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3.5 text-left group cursor-pointer focus:outline-none">
            <div className="w-9 h-9 rounded-lg bg-[#0c3f79] group-hover:bg-[#00306a] flex items-center justify-center text-white shadow-xs transition-colors">
              <GraduationCap className="w-5 h-5 text-[#e7a240]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-[#0c3f79] tracking-tight transition-colors flex items-center gap-1.5">
                  <span>YTÜ Dostun</span>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">v2.3</span>
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
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isOrtak
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Ortak Boş Saatler (Karşılaştır)</span>
              </Link>

              <Link 
                href="/agno"
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
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isPlanlama
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isPlanlama ? 'text-amber-400' : 'text-emerald-600'}`} />
                <span>Akademik Planlama</span>
                <span
                  className={`text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full leading-tight ${
                    isPlanlama
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  Yeni
                </span>
              </Link>

            </div>

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
    </>
  );
}

