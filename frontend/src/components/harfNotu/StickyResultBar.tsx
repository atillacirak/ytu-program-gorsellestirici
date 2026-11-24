"use client";

import React from 'react';
import Link from 'next/link';
import { Calculator, Check, ArrowRight } from 'lucide-react';
import AnimatedCounter from '../AnimatedCounter';
import { EvaluationResult } from '../../types/harfNotu';

interface StickyResultBarProps {
  evaluation: EvaluationResult;
  onExportToAgno: () => void;
  exportedToAgno: boolean;
}

export default function StickyResultBar({
  evaluation,
  onExportToAgno,
  exportedToAgno
}: StickyResultBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xs border-t border-slate-200 px-3 py-2 sm:p-3.5 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] z-50 no-print">
      <div className="max-w-6xl mx-auto flex flex-row items-center justify-between gap-2 sm:gap-4">
        {/* Sol: Ham Not & Sınıf Ort. */}
        <div className="flex items-center gap-3 sm:gap-5 min-w-0">
          <div className="text-left">
            <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
              Ham Not (HBN)
            </div>
            <div className="text-base sm:text-2xl font-black font-mono text-slate-900 flex items-center gap-1">
              <AnimatedCounter value={evaluation.hbn} decimals={2} />
            </div>
          </div>

          {evaluation.weightedClassAvg !== null && (
            <>
              <div className="h-8 w-px bg-slate-200 hidden xs:block sm:block" />
              <div className="text-left hidden sm:block">
                <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
                  Sınıf Ort. &amp; Fark
                </div>
                <div className="text-sm sm:text-base font-bold font-mono text-slate-800 flex items-center gap-1.5">
                  <span>{evaluation.weightedClassAvg.toFixed(1)}</span>
                  {evaluation.diffFromClassAvg !== null && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-extrabold ${
                        evaluation.diffFromClassAvg >= 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {evaluation.diffFromClassAvg >= 0 ? '+' : ''}
                      {evaluation.diffFromClassAvg.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Sağ: Tahmini Harf Notu + Katsayı + AGNO'ya Aktar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="bg-gradient-to-br from-[#0c3f79] to-[#00306a] text-white px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-sm flex items-center gap-3 sm:gap-4 border border-[#0c3f79]">
            <div className="text-right border-r border-white/20 pr-3 sm:pr-4">
              <div className="text-blue-100/80 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                Tahmini Harf
              </div>
              <div className="text-base sm:text-2xl font-black font-mono text-[#e7a240] leading-tight">
                {evaluation.hasAnyScore ? evaluation.gradeRangeLabel : '—'}
              </div>
            </div>
            <div>
              <div className="text-blue-100/80 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider">
                Katsayı
              </div>
              <div className="text-base sm:text-xl font-black font-mono text-white leading-tight">
                {evaluation.hasAnyScore ? evaluation.gpaPoint.toFixed(2) : '0.00'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onExportToAgno}
            disabled={!evaluation.hasAnyScore}
            title="Bu tahmini harf notunu AGNO hesaplayıcıya aktar"
            className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-45 disabled:cursor-not-allowed ${
              exportedToAgno
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-br from-[#e7a240] to-[#d38e2c] hover:brightness-105 text-white'
            }`}
          >
            {exportedToAgno ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">AGNO&apos;ya Aktarıldı</span>
                <span className="sm:hidden">Aktarıldı</span>
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">AGNO&apos;ya Aktar</span>
                <span className="sm:hidden">AGNO</span>
              </>
            )}
          </button>

          {exportedToAgno && (
            <Link
              href="/agno"
              className="hidden md:inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <span>AGNO&apos;ya Git</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
