"use client";

import React from 'react';
import {
  Compass,
  GraduationCap,
  Layers,
  ShieldCheck,
  ChevronRight,
  SlidersHorizontal,
  Lock,
  Unlock,
  RotateCcw
} from 'lucide-react';
import { FacultyItem, PlanSummary } from '@/types/planlama';

interface PlanlamaHeroProps {
  faculties: FacultyItem[];
  selectedFaculty: string;
  selectedProgramId: string;
  currentFacultyPrograms: { id: string; name: string }[];
  loadingPrograms: boolean;
  loadingCurriculum: boolean;
  summary: PlanSummary;
  limitMetric: 'ects' | 'credits';
  enforceSeasonRule: boolean;
  enforcePrereqRule: boolean;
  enforceCreditLimit: boolean;
  activeScenarioName: string;
  onFacultyChange: (newFaculty: string) => void;
  onProgramChange: (newProgId: string) => void;
  onOpenExemptionModal: () => void;
  onMetricToggle: (newMetric: 'ects' | 'credits') => void;
  onToggleSeasonRule: () => void;
  onTogglePrereqRule: () => void;
  onToggleCreditLimit: () => void;
  onResetPlan: () => void;
}

export const PlanlamaHero = React.memo(function PlanlamaHero({
  faculties,
  selectedFaculty,
  selectedProgramId,
  currentFacultyPrograms,
  loadingPrograms,
  loadingCurriculum,
  summary,
  limitMetric,
  enforceSeasonRule,
  enforcePrereqRule,
  enforceCreditLimit,
  activeScenarioName,
  onFacultyChange,
  onProgramChange,
  onOpenExemptionModal,
  onMetricToggle,
  onToggleSeasonRule,
  onTogglePrereqRule,
  onToggleCreditLimit,
  onResetPlan
}: PlanlamaHeroProps) {
  return (
    <div className="bg-gradient-to-b from-[#0c3f79] to-[#092d58] text-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>YTÜ Bologna Müfredat & Mezuniyet Simülatörü</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Akademik Planlama & Erken Mezuniyet Senaryosu
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl">
              Bölüm müfredatınızı yarıyıllara göre dağıtın, araya <strong>Yaz Okulu</strong> ekleyerek{' '}
              <strong>3.5 yılda mezuniyet</strong> veya üstten ders alma senaryolarınızı kredi ve
              Güz/Bahar kurallarına göre test edin.
            </p>
          </div>

          {/* Faculty & Department Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto lg:min-w-[500px]">
            <div className="bg-white/10 border border-white/15 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-blue-200 mb-1">
                1. Fakülte Seçin
              </label>
              <select
                value={selectedFaculty}
                onChange={(e) => onFacultyChange(e.target.value)}
                disabled={loadingPrograms}
                className="w-full bg-slate-900/70 text-white text-xs font-semibold rounded-lg px-2.5 py-2 border border-white/15 focus:outline-none focus:border-amber-400"
              >
                {faculties.map((f) => (
                  <option key={f.faculty} value={f.faculty} className="bg-slate-900 text-white">
                    {f.faculty}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-xl p-2.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                2. Bölüm / Program Seçin
              </label>
              <select
                value={selectedProgramId}
                onChange={(e) => onProgramChange(e.target.value)}
                disabled={loadingPrograms || loadingCurriculum}
                className="w-full bg-slate-900/70 text-white text-xs font-semibold rounded-lg px-2.5 py-2 border border-white/15 focus:outline-none focus:border-amber-400"
              >
                {currentFacultyPrograms.map((p) => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Graduation Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Graduation Duration */}
          <div
            className={`rounded-xl p-3.5 border transition-all ${
              summary.isEarlyGraduation
                ? 'bg-emerald-500/20 border-emerald-400/50 shadow-sm'
                : 'bg-white/10 border-white/15'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
              <span>Tahmini Mezuniyet Süresi</span>
              <GraduationCap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">
                {summary.gradYears} Yıl
              </span>
              <span className="text-xs font-semibold text-amber-300">
                ({summary.maxSem} Yarıyıl
                {summary.activeSummers > 0 ? ` + ${summary.activeSummers} Yaz` : ''})
              </span>
            </div>
            <p className="text-[11px] text-blue-100/80 mt-1">
              {summary.isEarlyGraduation
                ? '🎉 Erken mezuniyet! Son dönem derslerini başarıyla öne çektiniz.'
                : summary.maxSem > 8
                ? 'Uzatma yarıyılları aktif.'
                : 'Standart 4 yıllık lisans planı.'}
            </p>
          </div>

          {/* 2. Total Planned ECTS / Credits */}
          <div className="rounded-xl p-3.5 bg-white/10 border border-white/15">
            <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
              <span>Planlanan Toplam Yük</span>
              <Layers className="w-4 h-4 text-blue-300" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">
                {summary.totalPlacedEcts} AKTS
              </span>
              <span className="text-xs font-semibold text-blue-200">
                · {summary.totalPlacedCredits} Kredi ({summary.totalPlacedCount} Ders)
              </span>
            </div>
            <p className="text-[11px] text-blue-100/80 mt-1">
              Geçilen / Muaf: <strong>{summary.completedEcts} AKTS</strong>
              {summary.exemptCount > 0 ? ` (${summary.exemptCount} ders muaf)` : ''}
            </p>
          </div>

          {/* 3. Exemption Pool Card (Clickable) */}
          <button
            onClick={onOpenExemptionModal}
            className="rounded-xl p-3.5 bg-white/10 hover:bg-white/15 border border-white/15 hover:border-amber-400/60 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
              <span>Muafiyet Havuzu (Muaf Dersler)</span>
              <ShieldCheck className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-white">
                {summary.exemptCount} Ders
              </span>
              <span className="text-xs font-semibold text-emerald-300">
                ({summary.exemptEcts} AKTS · {summary.exemptCredits} Kredi)
              </span>
            </div>
            <p className="text-[11px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
              <span>Muaf olduğunuz dersleri seçmek için tıklayın</span>
              <ChevronRight className="w-3 h-3" />
            </p>
          </button>

          {/* 4. Rules & Credit Limit Quick Info */}
          <div className="rounded-xl p-3.5 bg-white/10 border border-white/15 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-blue-200 font-medium">
              <span>Planlama Kuralları & Birim</span>
              <SlidersHorizontal className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="flex flex-wrap gap-1.5 my-1.5">
              <button
                onClick={() => onMetricToggle(limitMetric === 'credits' ? 'ects' : 'credits')}
                className="px-2 py-0.5 rounded bg-blue-500/30 hover:bg-blue-500/45 border border-blue-300/40 text-[11px] font-bold text-white transition-colors cursor-pointer"
                title="Sınır birimini Yerel Kredi veya AKTS arasında değiştirin"
              >
                Birim: {limitMetric === 'credits' ? 'Yerel Kredi' : 'AKTS'} ⇄
              </button>
              <button
                onClick={onToggleSeasonRule}
                className={`px-2 py-0.5 rounded border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  enforceSeasonRule
                    ? 'bg-emerald-500/30 border-emerald-300/40 text-emerald-100'
                    : 'bg-white/10 border-white/20 text-slate-300'
                }`}
              >
                {enforceSeasonRule ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                <span>Güz/Bahar: {enforceSeasonRule ? 'Açık' : 'Esnek'}</span>
              </button>
              <button
                onClick={onTogglePrereqRule}
                className={`px-2 py-0.5 rounded border text-[11px] font-bold transition-colors cursor-pointer ${
                  enforcePrereqRule
                    ? 'bg-purple-500/35 border-purple-300/40 text-purple-100'
                    : 'bg-white/10 border-white/20 text-slate-300'
                }`}
                title="Bologna'da tanımlı ön koşul derslerinin kronolojik sırasını zorunlu tut"
              >
                Ön Koşul: {enforcePrereqRule ? 'Açık' : 'Esnek'}
              </button>
              <button
                onClick={onToggleCreditLimit}
                className={`px-2 py-0.5 rounded border text-[11px] font-bold transition-colors cursor-pointer ${
                  enforceCreditLimit
                    ? 'bg-amber-500/30 border-amber-300/40 text-amber-100'
                    : 'bg-white/10 border-white/20 text-slate-300'
                }`}
              >
                Kredi Sınırı: {enforceCreditLimit ? 'Açık' : 'Kapalı'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <span className="text-[11px] text-blue-200">
                Aktif: <strong className="text-amber-300">{activeScenarioName}</strong>
              </span>
              <button
                onClick={onResetPlan}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 text-[11px] font-bold text-rose-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                title="Muafiyetlerinizi koruyarak kalan dersleri standart 8 yarıyıllık düzene döndür"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Senaryoyu Sıfırla</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
