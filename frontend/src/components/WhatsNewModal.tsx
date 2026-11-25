"use client";

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowRight,
  X,
  Radio,
  Award,
  Palette
} from 'lucide-react';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps) {
  const router = useRouter();

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => {
    dialogRef.current?.close();
    onClose();
  };

  const handleNavigate = (path: string) => {
    close();
    router.push(path);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="whats-new-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto w-[calc(100%_-_1.5rem)] max-w-lg overflow-visible rounded-2xl bg-transparent backdrop:bg-slate-900/65"
    >
      <div
        data-modal="true"
        className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden flex flex-col max-h-[90dvh]"
      >
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#0c3f79] via-[#124d91] to-[#0f172a] text-white p-4 sm:p-4.5 relative shrink-0">
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-[10px] font-extrabold tracking-wide uppercase">
                <Sparkles className="w-3 h-3" />
                <span>YTÜ Dostun v2.5 Güncellemesi</span>
              </div>
              <h2 id="whats-new-title" className="text-base sm:text-lg font-extrabold tracking-tight">
                Yeni Özellikleri Keşfedin
              </h2>
              <p className="text-[11px] sm:text-xs text-blue-100/90 leading-relaxed">
                Yenilenen arayüz temaları, harf notu simülatörü ve canlı arkadaş lobisi yayında.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Kapat"
              autoFocus
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature Cards Container */}
        <div className="p-3.5 sm:p-4 space-y-2.5 overflow-y-auto overscroll-contain">
          {/* Feature 1: Yeni Temalar */}
          <div className="rounded-xl border border-amber-500/40 bg-amber-50/45 p-3 transition-colors">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#0c3f79] text-[#e7a240] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <Palette className="w-4 h-4" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    Yeni Tasarım Temaları (CampusKit, Nordic &amp; Klasik)
                  </h3>
                  <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 leading-tight">
                    Yeni
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Sağ üst menüdeki <strong>Cihaz Eşle</strong> butonunun hemen solundaki <strong>Tema</strong> seçicisinden (<strong>Campus</strong>, <strong>Nordic</strong>, <strong>Klasik</strong>) tek tıkla görünümü değiştirebilirsin.
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2: Ders Harf Notu & Çan Simülatörü */}
          <div className="group rounded-xl border border-sky-500/40 bg-sky-50/50 p-3 hover:border-sky-500/70 transition-colors">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0c3f79] text-[#e7a240] flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Award className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Ders Harf Notu &amp; Çan Simülatörü
                    </h3>
                    <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-sky-600 text-white leading-tight">
                      Yeni
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Vize, final, proje, lab ve ödev yüzdelerini tek tıkla özelleştir. <strong>Sınıf ortalamalarına göre YTÜ T-Skoru (Çan)</strong> tahminini, hedef final puanlarını gör ve doğrudan <strong>AGNO</strong>&apos;ya aktar.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleNavigate('/harf-notu')}
                className="px-3 py-1 rounded-lg bg-[#0c3f79] hover:bg-[#00306a] text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Harf Notunu Hesapla</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Feature 3: Uygun Musun? */}
          <div className="group rounded-xl border border-blue-500/40 bg-blue-50/40 p-3 hover:border-blue-600/70 transition-colors">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#0c3f79] text-amber-400 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Uygun Musun? — Canlı Arkadaş Lobisi
                    </h3>
                    <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-[#0c3f79] text-amber-300 leading-tight">
                      Yeni
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Arkadaş grubunla lobi kur, <strong>şu an kimin derste/boşta olduğunu</strong> ve <strong>Ortak Boş Saatler</strong> sekmesinden herkesin boş olduğu saatleri anlık takip et.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleNavigate('/uygun-musun')}
                className="px-3 py-1 rounded-lg bg-[#0c3f79] hover:bg-[#00306a] text-white text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Lobiyi Aç</span>
                <ArrowRight className="w-3 h-3 text-amber-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[10.5px] text-slate-500 font-medium">
            Üst menüdeki <strong>&ldquo;Yenilikler&rdquo;</strong> butonundan tekrar açabilirsiniz.
          </span>
          <button
            type="button"
            onClick={close}
            className="px-3.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
          >
            Anladım
          </button>
        </div>
      </div>
    </dialog>
  );
}
