"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Compass,
  ShieldCheck,
  Calculator,
  ArrowRight,
  X,
  CheckCircle2,
  Layers
} from 'lucide-react';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/65 p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#0c3f79] via-[#124d91] to-[#0f172a] text-white p-4 sm:p-4.5 relative shrink-0">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-extrabold tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                <span>YTÜ Dostun v2.3 Güncellemesi</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight">
                Yeni Özellikleri Keşfedin 🚀
              </h2>
              <p className="text-[11px] sm:text-xs text-blue-100/90 leading-relaxed">
                Ders programına ek olarak tüm akademik sürecinizi yönetebileceğiniz yeni araçlar eklendi.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature Cards Container - Fits naturally without scrolling */}
        <div className="p-3.5 sm:p-4 space-y-2.5 overflow-y-auto overscroll-contain">
          {/* Feature 1: Akademik Planlama */}
          <div className="group rounded-xl border border-emerald-500/40 bg-emerald-50/40 p-3 hover:border-emerald-500/70 transition-colors">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Compass className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Akademik Planlama &amp; Mezuniyet Simülatörü
                    </h3>
                    <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-600 text-white leading-tight">
                      Yeni
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Bölüm müfredatını, Bologna ön koşullarını ve seçmeli ders havuzlarını gör. Yaz okuluyla <strong>3 veya 3.5 yılda erken mezuniyeti</strong> simüle et ve PDF indir.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                onClick={() => handleNavigate('/planlama')}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Planlamayı Aç</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Feature 2: AGNO Hesaplama */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Calculator className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    AGNO &amp; Hedef Simülatörü
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Transkriptini yükleyerek notlarını aktar; dönem sonu ortalamanı ve hedefin için gereken YANO&apos;yu hesapla.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleNavigate('/agno')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold shrink-0 self-center transition-colors cursor-pointer"
              >
                Hesapla
              </button>
            </div>
          </div>

          {/* Feature 3: Devamsızlık Takibi */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Haftalık Devamsızlık Takibi
                  </h3>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Ders programını tek tıkla aktar, 14 haftalık çizelgede kaç ders hakkının kaldığını anlık takip et.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleNavigate('/devamsizlik')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold shrink-0 self-center transition-colors cursor-pointer"
              >
                Göz At
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10.5px] text-slate-500 font-medium truncate">
            Üst menüdeki <strong>&ldquo;Yenilikler&rdquo;</strong> butonundan tekrar açabilirsiniz.
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
          >
            Anladım
          </button>
        </div>
      </div>
    </div>
  );
}
