"use client";

import React, { useState, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Link2,
} from 'lucide-react';
import { generateQrMatrix } from '../../utils/qrCodeGenerator';

interface LobbyShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  roomTitle: string;
}

export default function LobbyShareModal({
  isOpen,
  onClose,
  roomCode,
  roomTitle,
}: LobbyShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const upperCode = (roomCode || '').toUpperCase();

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `https://ytudostun.com/uygun-musun?join=${encodeURIComponent(upperCode)}`;
    }
    return `${window.location.origin}/uygun-musun?join=${encodeURIComponent(upperCode)}`;
  }, [upperCode]);

  const inviteText = `👋 YTÜ Dostun'da '${roomTitle}' lobisi kurdum! Programını ekle, ne zaman boş olduğumuzu canlı görelim: ${shareUrl}`;

  const qrMatrix = useMemo(() => {
    try {
      return generateQrMatrix(shareUrl);
    } catch {
      return [];
    }
  }, [shareUrl]);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setShareToast(msg);
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      triggerToast('Bağlantı kopyalandı! Arkadaşlarına gönderebilirsin 📋');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      triggerToast('Bağlantı kopyalanamadı, lütfen seçip kopyalayın.');
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(upperCode);
      setCopiedCode(true);
      triggerToast(`Lobi kodu (${upperCode}) panoya kopyalandı!`);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${roomTitle} • YTÜ Dostun Uygun Musun?`,
          text: `👋 YTÜ Dostun'da '${roomTitle}' lobisi kurdum! Programını ekle, ne zaman boş olduğumuzu canlı görelim:`,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err && err.name === 'AbortError') return;
      }
    }
    // Masaüstü veya navigator.share desteklemeyen tarayıcılarda otomatik panoya kopyala
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopiedLink(true);
      triggerToast('Bağlantı kopyalandı! Arkadaşlarına gönderebilirsin 📋');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      handleCopyLink();
    }
  };

  const matrixSize = qrMatrix.length || 29;
  const quietZone = 3;
  const viewBoxSize = matrixSize + quietZone * 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        {/* Üst Başlık */}
        <div className="bg-linear-to-r from-[#0c3f79] via-[#0a3466] to-[#002855] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black tracking-tight truncate">
                Arkadaşlarını Lobiye Davet Et
              </h3>
              <p className="text-[11px] text-blue-100/85 font-medium truncate">
                {roomTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Canlı Bildirim Toast */}
          {shareToast && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex items-center gap-2 text-xs font-extrabold text-emerald-900">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{shareToast}</span>
            </div>
          )}

          {/* Masa Başı QR Kod & 6 Haneli Kod Kartı */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col items-center text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100/80 border border-amber-200 text-amber-950 text-[11px] font-extrabold">
              <QrCode className="w-3.5 h-3.5 text-amber-700" />
              <span>Masa Başı Hızlı Katılım QR Kodu</span>
            </div>

            {/* SVG QR Code */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              {qrMatrix.length > 0 ? (
                <svg
                  viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                  className="w-44 h-44"
                  shapeRendering="crispEdges"
                >
                  <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx + quietZone}
                          y={rIdx + quietZone}
                          width={1}
                          height={1}
                          fill="#0c3f79"
                        />
                      ) : null
                    )
                  )}
                </svg>
              ) : null}
            </div>

            <p className="text-[11px] text-slate-500 font-medium max-w-xs">
              Kütüphanede veya kantinde yan yana otururken arkadaşın kamerasını okutup 5 saniyede katılabilir.
            </p>

            {/* 6 Haneli Lobi Kodu */}
            <div className="w-full pt-1 flex items-center justify-between gap-2 bg-white rounded-xl border border-slate-200 px-3.5 py-2">
              <div className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Lobi Katılım Kodu
                </span>
                <span className="font-mono text-base font-black tracking-widest text-[#0c3f79]">
                  {upperCode}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-600" />
                    <span>Kodu Kopyala</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Davet Bağlantısı Kutusu */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5 text-[#0c3f79]" />
              <span>Doğrudan Davet Bağlantısı</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono font-bold text-slate-700 outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kopyalandı!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kopyala</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tek Dokunuşla Yerel Paylaşım Butonu */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full py-3 px-4 rounded-2xl bg-[#0c3f79] hover:bg-[#002855] text-white text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
          >
            <Share2 className="w-4 h-4 text-amber-400" />
            <span>Linki Paylaş</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
