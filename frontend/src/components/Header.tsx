"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Calculator, ShieldCheck, GraduationCap } from 'lucide-react';

export default function Header() {
  const pathname = usePathname();
  if (pathname === '/stats') return null;
  const isOrtak = pathname === '/ortak';
  const isSingle = pathname === '/' && !isOrtak;
  const isAgno = pathname === '/agno';
  const isDevamsizlik = pathname === '/devamsizlik';

  return (
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
                <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">v2</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 font-medium">Ders & Not Yönetimi</p>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto hide-scrollbar">
            
            <Link 
              href="/"
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isDevamsizlik
                  ? 'bg-[#0c3f79] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Devamsızlık Takibi</span>
            </Link>

          </div>
        </div>
      </div>
    </header>
  );
}
