'use client';

import { useState, useEffect, useCallback } from 'react';
import { Palette, X, ChevronDown, ChevronUp, Copy, Check, RotateCcw } from 'lucide-react';

// Sadece development modunda render edilir
if (process.env.NODE_ENV !== 'development') {
  // Production'da hiçbir şey export etme
}

const DEFAULTS = {
  navy:    '#0c3f79',
  navyDark:'#00306a',
  gold:    '#e7a240',
  goldDark:'#d38e2c',
};

// Hex'i RGB bileşenlerine çevirir (opacity variant'ları için)
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

// Hex'i biraz koyulaştır (hover rengi için)
function darkenHex(hex: string, amount = 20): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export default function DevColorPanel() {
  const [navy, setNavy]       = useState(DEFAULTS.navy);
  const [gold, setGold]       = useState(DEFAULTS.gold);
  const [minimized, setMin]   = useState(false);
  const [copied, setCopied]   = useState(false);

  const applyColors = useCallback((n: string, g: string) => {
    const root = document.documentElement;
    root.style.setProperty('--navy', n);
    root.style.setProperty('--navy-dark', darkenHex(n, 15));
    root.style.setProperty('--gold', g);
    root.style.setProperty('--gold-dark', darkenHex(g, 20));

    // Style tag injection — Tailwind'in hardcoded sınıflarını override eder
    let tag = document.getElementById('dev-color-override') as HTMLStyleElement;
    if (!tag) {
      tag = document.createElement('style');
      tag.id = 'dev-color-override';
      document.head.appendChild(tag);
    }

    const navyRgb = hexToRgb(n);
    const goldRgb = hexToRgb(g);
    const nd = darkenHex(n, 15);
    const gd = darkenHex(g, 20);

    tag.innerHTML = `
      /* ─── Navy overrides ─── */
      .bg-\\[\\#002855\\]                        { background-color: ${n} !important; }
      .hover\\:bg-\\[\\#002855\\]:hover          { background-color: ${n} !important; }
      .bg-\\[\\#001f42\\]                        { background-color: ${nd} !important; }
      .hover\\:bg-\\[\\#001f42\\]:hover          { background-color: ${nd} !important; }
      .text-\\[\\#002855\\]                      { color: ${n} !important; }
      .group:hover .group-hover\\:text-\\[\\#002855\\] { color: ${n} !important; }
      .border-\\[\\#002855\\]                    { border-color: ${n} !important; }
      [class*="bg-\\[\\#002855\\]\\/"]           { --tw-bg-opacity:1; background-color: rgb(${navyRgb} / var(--tw-bg-opacity, 1)) !important; }
      [class*="border-\\[\\#002855\\]\\/"]       { border-color: rgb(${navyRgb} / var(--tw-border-opacity, 1)) !important; }
      .bg-\\[\\#002855\\]\\/5                    { background-color: rgb(${navyRgb} / 0.05) !important; }
      .bg-\\[\\#002855\\]\\/\\[0\\.02\\]            { background-color: rgb(${navyRgb} / 0.02) !important; }
      .bg-\\[\\#002855\\]\\/\\[0\\.03\\]            { background-color: rgb(${navyRgb} / 0.03) !important; }
      .bg-\\[\\#002855\\]\\/\\[0\\.04\\]            { background-color: rgb(${navyRgb} / 0.04) !important; }
      .hover\\:bg-\\[\\#002855\\]\\/\\[0\\.04\\]:hover { background-color: rgb(${navyRgb} / 0.04) !important; }
      .shadow-\\[inset_0_1px_0_0_rgba\\(0\\,40\\,85\\,0\\.05\\)\\] { box-shadow: inset 0 1px 0 0 rgb(${navyRgb} / 0.05) !important; }
      [style*="#002855"]                        { background-color: ${n} !important; }

      /* ─── Gold/Accent overrides ─── */
      .from-amber-500   { --tw-gradient-from: ${g} !important; }
      .to-amber-600     { --tw-gradient-to: ${gd} !important; }
      .bg-amber-500\\/\\[0\\.05\\] { background-color: rgb(${goldRgb} / 0.05) !important; }
      .bg-amber-500\\/\\[0\\.08\\] { background-color: rgb(${goldRgb} / 0.08) !important; }
      .bg-amber-500\\/15        { background-color: rgb(${goldRgb} / 0.15) !important; }
      .hover\\:bg-amber-500\\/25:hover { background-color: rgb(${goldRgb} / 0.25) !important; }
      .border-amber-400\\/30    { border-color: rgb(${goldRgb} / 0.30) !important; }
      .border-amber-200\\/70    { border-color: rgb(${goldRgb} / 0.70) !important; }
      .text-amber-600           { color: ${g} !important; }
      .text-amber-900           { color: ${gd} !important; }
      .text-amber-400           { color: ${g} !important; }

      /* gradient override (GANO sticky bar) */
      [style*="#d97706"], [style*="#b45309"] {
        background: linear-gradient(135deg, ${g} 0%, ${gd} 100%) !important;
      }
    `;
  }, []);

  useEffect(() => {
    applyColors(navy, gold);
  }, [navy, gold, applyColors]);

  const handleReset = () => {
    setNavy(DEFAULTS.navy);
    setGold(DEFAULTS.gold);
  };

  const handleCopy = () => {
    const text = `Navy:     ${navy}\nNavy Dark: ${darkenHex(navy, 15)}\nGold:     ${gold}\nGold Dark: ${darkenHex(gold, 20)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div
      style={{ zIndex: 9999 }}
      className="fixed bottom-24 right-4 bg-white border border-slate-200 rounded-2xl shadow-xl w-64 overflow-hidden select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Palette size={14} />
          <span>Dev · Renk Paneli</span>
        </div>
        <button
          onClick={() => setMin(m => !m)}
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {!minimized && (
        <div className="p-3 space-y-3">
          {/* Navy Color */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Lacivert (Navy)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={navy}
                onChange={e => setNavy(e.target.value)}
                className="w-10 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
              />
              <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1 text-center">
                {navy}
              </span>
              <div
                className="w-8 h-8 rounded-lg border border-slate-200 shadow-xs"
                style={{ background: `linear-gradient(135deg, ${navy}, ${darkenHex(navy, 15)})` }}
              />
            </div>
          </div>

          {/* Gold Color */}
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Altın (Gold Accent)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={gold}
                onChange={e => setGold(e.target.value)}
                className="w-10 h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5"
              />
              <span className="text-xs font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex-1 text-center">
                {gold}
              </span>
              <div
                className="w-8 h-8 rounded-lg border border-slate-200 shadow-xs"
                style={{ background: `linear-gradient(135deg, ${gold}, ${darkenHex(gold, 20)})` }}
              />
            </div>
          </div>

          {/* Preview swatches */}
          <div className="rounded-xl border border-slate-200 overflow-hidden text-[10px]">
            <div className="p-2 flex items-center gap-2" style={{ backgroundColor: `${navy}0d` }}>
              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: navy }}>A</div>
              <span className="font-medium" style={{ color: navy }}>Panel arka planı önizleme</span>
            </div>
            <div className="p-2 flex items-center gap-2" style={{ background: `linear-gradient(135deg, ${gold}, ${darkenHex(gold, 20)})` }}>
              <span className="text-white font-bold">Toplam Krd. · Yeni GANO</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 py-1.5 rounded-lg transition-colors"
            >
              <RotateCcw size={10} />
              Sıfırla
            </button>
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-white py-1.5 rounded-lg transition-colors"
              style={{ backgroundColor: copied ? '#16a34a' : navy }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Kopyalandı!' : 'Değerleri Kopyala'}
            </button>
          </div>
          <p className="text-[9px] text-slate-400 text-center leading-tight">
            Sadece local'de görünür. Beğendiğinde "Değerleri Kopyala"ya bas.
          </p>
        </div>
      )}
    </div>
  );
}
