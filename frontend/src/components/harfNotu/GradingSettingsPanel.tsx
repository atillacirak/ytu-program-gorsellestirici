"use client";

import React from 'react';
import {
  Settings2,
  ShieldAlert,
  TrendingUp,
  BookMarked,
  Info,
  CheckCircle2
} from 'lucide-react';
import {
  CatalogThresholds,
  CourseGradeProfile,
  EvaluationResult,
  GradingMode
} from '../../types/harfNotu';
import {
  DEFAULT_CATALOG_CLASSIC,
  DEFAULT_CATALOG_FLEX,
  PASSING_TARGET_GRADES
} from '../../utils/harfNotuUtils';
import NumericDraftInput from './NumericDraftInput';

interface GradingSettingsPanelProps {
  course: CourseGradeProfile;
  evaluation: EvaluationResult;
  onUpdateCourse: (patch: Partial<CourseGradeProfile>) => void;
}

const CATALOG_KEYS: (keyof CatalogThresholds)[] = [
  ...PASSING_TARGET_GRADES,
  'FD'
];

export default function GradingSettingsPanel({
  course,
  evaluation,
  onUpdateCourse
}: GradingSettingsPanelProps) {
  const isCustomStdDev = course.stdDev !== null;

  const handleModeChange = (mode: GradingMode) => {
    onUpdateCourse({ gradingMode: mode });
  };

  const handleCatalogChange = (key: keyof CatalogThresholds, val: number) => {
    onUpdateCourse({
      catalog: {
        ...course.catalog,
        [key]: Math.min(100, Math.max(0, val))
      }
    });
  };

  const showRelativeControls =
    course.gradingMode === 'relative' || evaluation.effectiveMode === 'relative';
  const showAbsoluteControls =
    course.gradingMode === 'absolute' || evaluation.effectiveMode === 'absolute';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-[#0c3f79]/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Settings2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Değerlendirme Sistemi &amp; Baraj Kuralları
            </h2>
            <p className="text-[11px] text-slate-500">
              Otomatik mod, sınıf ortalaması girdiyseniz YTÜ Bağıl (Çan), girmediyseniz Mutlak (Katalog) kullanır.
            </p>
          </div>
        </div>

        {/* Mod Geçiş Düğmeleri */}
        <div
          role="radiogroup"
          aria-label="Değerlendirme modu"
          className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 self-start sm:self-auto"
        >
          {(
            [
              { value: 'auto', label: 'Otomatik' },
              { value: 'relative', label: 'Bağıl (Çan)' },
              { value: 'absolute', label: 'Mutlak (Katalog)' }
            ] as { value: GradingMode; label: string }[]
          ).map((opt) => {
            const active = course.gradingMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleModeChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-5">
        {/* Bağıl (Çan) Bölümü */}
        {showRelativeControls && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#0c3f79]" />
                <span>YTÜ Bağıl Değerlendirme (T-Skoru)</span>
              </h3>
              {evaluation.classLevel && evaluation.weightedClassAvg !== null && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#0c3f79] border border-blue-200">
                  Ort. {evaluation.weightedClassAvg.toFixed(1)} → {evaluation.classLevel.label} Düzey
                </span>
              )}
            </div>

            {!evaluation.hasAnyClassAvg ? (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Sınıf ortalaması henüz girilmedi.</p>
                  <p className="text-amber-800/90 mt-0.5">
                    Bağıl (Çan) tahmini yapabilmek için yukarıdaki tablodan en az bir sınavın{' '}
                    <strong>Sınıf Ort.</strong> kutusunu doldurun. Şu an geçici olarak Mutlak Katalog uygulanıyor.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {evaluation.classAvgCoverageWeight < evaluation.totalWeight && (
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-900 text-[11px] font-medium flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>
                      Sınıf ortalaması şimdilik ağırlığın{' '}
                      <strong>%{evaluation.classAvgCoverageWeight}</strong>&apos;lik kısmı üzerinden
                      normalize edilerek hesaplanıyor.
                    </span>
                  </div>
                )}

                {/* Standart Sapma Kontrolü */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Standart Sapma (σ)
                      </div>
                      <p className="text-[11px] text-slate-500">
                        OBS&apos;de standart sapma görünmüyorsa &ldquo;Bilinmiyor&rdquo; seçili kalsın; 3 olası bant gösterilir.
                      </p>
                    </div>
                    <div className="flex bg-white p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => onUpdateCourse({ stdDev: null })}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                          !isCustomStdDev
                            ? 'bg-[#0c3f79] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Bilinmiyor (3&apos;lü Bant)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateCourse({ stdDev: course.stdDev ?? 15 })
                        }
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                          isCustomStdDev
                            ? 'bg-[#0c3f79] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Kendim Gireceğim
                      </button>
                    </div>
                  </div>

                  {isCustomStdDev && (
                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="range"
                        min="5"
                        max="30"
                        step="0.5"
                        aria-label="Standart sapma değeri"
                        value={course.stdDev ?? 15}
                        onChange={(e) =>
                          onUpdateCourse({ stdDev: Number(e.target.value) })
                        }
                        className="flex-1 h-1.5 accent-[#0c3f79] cursor-pointer"
                      />
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-bold text-slate-500">σ =</span>
                        <NumericDraftInput
                          min={1}
                          max={40}
                          step="0.5"
                          fallbackValue={15}
                          ariaLabel="Standart sapma sayısal giriş"
                          value={course.stdDev ?? 15}
                          onCommit={(nextStd) => onUpdateCourse({ stdDev: nextStd })}
                          className="w-18 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-slate-900 text-center"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sınıf Düzeyi T-Skor Eşik Özeti */}
                  {evaluation.classLevel && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        {evaluation.classLevel.label} Düzeyi T-Skoru Alt Sınırları
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {CATALOG_KEYS.map((g) => (
                          <div
                            key={g}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-center"
                          >
                            <div className="text-[10px] font-bold text-slate-500">{g}</div>
                            <div className="text-xs font-mono font-extrabold text-slate-900">
                              ≥{evaluation.classLevel!.thresholds[g]}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Mutlak (Katalog) Bölümü */}
        {showAbsoluteControls && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
                <span>Mutlak (Katalog) Harf Notu Eşikleri</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCourse({ catalog: { ...DEFAULT_CATALOG_CLASSIC } })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Klasik (90 AA)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateCourse({ catalog: { ...DEFAULT_CATALOG_FLEX } })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Esnek (85 AA)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {CATALOG_KEYS.map((gradeKey) => (
                <div
                  key={gradeKey}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center space-y-1"
                >
                  <label
                    htmlFor={`cat-${course.id}-${gradeKey}`}
                    className="block text-[11px] font-extrabold text-slate-700"
                  >
                    {gradeKey}
                  </label>
                  <NumericDraftInput
                    id={`cat-${course.id}-${gradeKey}`}
                    min={0}
                    max={100}
                    step="1"
                    fallbackValue={0}
                    value={course.catalog[gradeKey]}
                    onCommit={(val) => handleCatalogChange(gradeKey, val)}
                    className="w-full bg-white border border-slate-200 focus:border-[#0c3f79] rounded-lg px-1 py-1 text-xs font-mono font-bold text-center text-slate-900 outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* YTÜ Alt Baraj Kuralları */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>YTÜ Alt Baraj Kontrolleri</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Final Alt Barajı */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
              <label
                htmlFor={`baraj-final-${course.id}`}
                className="flex items-start gap-2.5 cursor-pointer flex-1"
              >
                <input
                  id={`baraj-final-${course.id}`}
                  type="checkbox"
                  checked={course.useFinalBaraj}
                  onChange={(e) =>
                    onUpdateCourse({ useFinalBaraj: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 accent-[#0c3f79] cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Final / Büt Alt Barajı
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Altında kalınırsa otomatik FF
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-bold text-slate-400">&lt;</span>
                <NumericDraftInput
                  min={0}
                  max={100}
                  step="1"
                  fallbackValue={40}
                  disabled={!course.useFinalBaraj}
                  ariaLabel="Final baraj puanı"
                  value={course.finalBarajScore}
                  onCommit={(val) => onUpdateCourse({ finalBarajScore: val })}
                  className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 disabled:opacity-40"
                />
              </div>
            </div>

            {/* Ham Not Alt Sınırı */}
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
              <label
                htmlFor={`baraj-hbn-${course.id}`}
                className="flex items-start gap-2.5 cursor-pointer flex-1"
              >
                <input
                  id={`baraj-hbn-${course.id}`}
                  type="checkbox"
                  checked={course.useHbnFloor}
                  onChange={(e) =>
                    onUpdateCourse({ useHbnFloor: e.target.checked })
                  }
                  className="mt-0.5 w-4 h-4 accent-[#0c3f79] cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    Ham Not (HBN) Alt Sınırı
                  </div>
                  <div className="text-[11px] text-slate-500">
                    HBN bu sınırın altındaysa FF
                  </div>
                </div>
              </label>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-bold text-slate-400">&lt;</span>
                <NumericDraftInput
                  min={0}
                  max={100}
                  step="1"
                  fallbackValue={30}
                  disabled={!course.useHbnFloor}
                  ariaLabel="HBN alt sınır puanı"
                  value={course.hbnFloorScore}
                  onCommit={(val) => onUpdateCourse({ hbnFloorScore: val })}
                  className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-center text-slate-900 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

          {evaluation.barajViolation.violated && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{evaluation.barajViolation.message}</span>
            </div>
          )}

          {!evaluation.barajViolation.violated && evaluation.hasAnyScore && (
            <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Şu ana kadar baraj ihlali görünmüyor.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
