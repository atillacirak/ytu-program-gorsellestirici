import React from 'react';
import { Calendar, Users, Calculator, ShieldCheck, GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  activeRoute: 'single' | 'compare' | 'agno' | 'devamsizlik';
  onTabChange?: (tab: 'single' | 'compare') => void;
}

export default function Navbar({ activeRoute, onTabChange }: NavbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto hide-scrollbar">
        
        {/* Tekli Program */}
        {activeRoute === 'single' || activeRoute === 'compare' ? (
          <button
            onClick={() => onTabChange?.('single')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeRoute === 'single'
                ? 'bg-[#0c3f79] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Tekli Program</span>
          </button>
        ) : (
          <Link href="/" className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
            <Calendar className="w-3.5 h-3.5" />
            <span>Tekli Program</span>
          </Link>
        )}

        {/* Ortak Boş Saatler */}
        {activeRoute === 'single' || activeRoute === 'compare' ? (
          <button
            onClick={() => onTabChange?.('compare')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeRoute === 'compare'
                ? 'bg-[#0c3f79] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Ortak Boş Saatler (Karşılaştır)</span>
          </button>
        ) : (
          <Link href="/" className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Ortak Boş Saatler (Karşılaştır)</span>
          </Link>
        )}

        {/* AGNO Hesapla */}
        <Link 
          href="/agno"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeRoute === 'agno'
              ? 'bg-[#0c3f79] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className={`w-3.5 h-3.5 ${activeRoute === 'agno' ? 'text-amber-400' : 'text-blue-500'}`} />
          <span>AGNO Hesapla</span>
        </Link>

        {/* Devamsızlık Takibi */}
        <Link 
          href="/devamsizlik"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeRoute === 'devamsizlik'
              ? 'bg-[#0c3f79] text-white shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>Devamsızlık Takibi</span>
        </Link>
        
      </div>
    </div>
  );
}
