'use client';

import React from 'react';
import { ShieldCheck, X, Lock, EyeOff, ServerOff, CheckCircle2 } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative space-y-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0c3f79] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-base sm:text-lg">
            <div className="p-1.5 bg-white/10 rounded-lg text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <span>Gizlilik &amp; Veri Güvenliği</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4 text-slate-700 text-xs sm:text-sm max-h-[75vh] overflow-y-auto">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-medium text-xs sm:text-sm">
              YTÜ Dostun, kullanıcı gizliliğine ve kişisel verilerin korunmasına %100 hassasiyet gösterir. Yüklediğiniz belgeler asla depolanmaz.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {/* Item 1 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0 mt-0.5">
                <ServerOff size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Sıfır Depolama (Zero Retention)</h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Yüklediğiniz OBS PDF ve Transkript dosyaları sunucularımızda saklanmaz. Dosyanız sadece derslerinizi okumak için işlenir ve yaklaşık 0,1 saniye içinde sistemden <strong>anında ve kalıcı olarak silinir</strong>.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0 mt-0.5">
                <EyeOff size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Kişisel Veri Koruması (TC No, İsim vb.)</h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Transkript veya belgelerinizdeki <strong>TC Kimlik No, İsim, Soyisim, Öğrenci No ve Doğum Tarihi</strong> gibi hassas veriler filtrelerimiz tarafından tamamen yok sayılır, okunmaz ve kaydedilmez.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0 mt-0.5">
                <Lock size={18} />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">İstemci Tarafı (Client-Side) Simülasyon</h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Tüm AGNO, YANO, senaryo hesaplamaları ve ders programı özelleştirmeleri doğrudan kendi tarayıcınızda/cihazınızda gerçekleşir.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0c3f79] hover:bg-[#00306a] text-white font-semibold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Anladım, Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
