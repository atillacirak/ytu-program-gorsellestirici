"use client";

import React, { useState, useMemo } from 'react';
import {
  Target,
  BookmarkPlus,
  Trash2,
  RotateCcw,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import {
  CourseGradeProfile,
  EvaluationResult,
  SavedScenario
} from '../../types/harfNotu';
import {
  evaluateCourseGrade,
  generateId,
  getGradeBadgeClasses,
  pickDefaultTargetItemId,
  solveRequiredScoresForTargetGrades
} from '../../utils/harfNotuUtils';

interface ScenarioSimulatorPanelProps {
  course: CourseGradeProfile;
  evaluation: EvaluationResult;
  onUpdateCourse: (patch: Partial<CourseGradeProfile>) => void;
}

export default function ScenarioSimulatorPanel({
  course,
  evaluation,
  onUpdateCourse
}: ScenarioSimulatorPanelProps) {
  const weightedItems = useMemo(
    () => course.items.filter((i) => (Number(i.weight) || 0) > 0),
    [course.items]
  );

  const defaultTargetId = useMemo(
    () => pickDefaultTargetItemId(course.items),
    [course.items]
  );

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const effectiveTargetId =
    selectedTargetId && weightedItems.some((i) => i.id === selectedTargetId)
      ? selectedTargetId
      : defaultTargetId;

  const targetItem = weightedItems.find((i) => i.id === effectiveTargetId) ?? null;

  const targetRows = useMemo(
    () => solveRequiredScoresForTargetGrades(course, effectiveTargetId ?? undefined),
    [course, effectiveTargetId]
  );

  const [scenarioName, setScenarioName] = useState('');

  const handleSaveScenario = (presetName?: string) => {
    const finalName =
      (presetName ?? scenarioName).trim() ||
      `Senaryo ${course.savedScenarios.length + 1}`;
    const scores: Record<string, number | null> = {};
    const classAvgs: Record<string, number | null> = {};
    for (const item of course.items) {
      scores[item.id] = item.score;
      classAvgs[item.id] = item.classAvg;
    }

    const newScenario: SavedScenario = {
      id: generateId('scen'),
      name: finalName,
      scores,
      classAvgs,
      createdAt: new Date().toISOString()
    };

    onUpdateCourse({
      savedScenarios: [newScenario, ...course.savedScenarios].slice(0, 8)
    });
    if (!presetName) setScenarioName('');
  };

  const handleLoadScenario = (scen: SavedScenario) => {
    const nextItems = course.items.map((item) => ({
      ...item,
      score:
        scen.scores && Object.prototype.hasOwnProperty.call(scen.scores, item.id)
          ? scen.scores[item.id]
          : item.score,
      classAvg:
        scen.classAvgs && Object.prototype.hasOwnProperty.call(scen.classAvgs, item.id)
          ? scen.classAvgs[item.id]
          : item.classAvg
    }));
    onUpdateCourse({ items: nextItems });
  };

  const handleDeleteScenario = (scenId: string) => {
    onUpdateCourse({
      savedScenarios: course.savedScenarios.filter((s) => s.id !== scenId)
    });
  };

  const handleApplyTargetScore = (score: number) => {
    if (!targetItem) return;
    const clamped = Math.min(100, Math.max(0, Math.ceil(score * 10) / 10));
    onUpdateCourse({
      items: course.items.map((item) =>
        item.id === targetItem.id ? { ...item, score: clamped } : item
      )
    });
  };

  const scenarioEvaluations = useMemo(() => {
    return course.savedScenarios.map((scen) => {
      const simCourse: CourseGradeProfile = {
        ...course,
        items: course.items.map((item) => ({
          ...item,
          score:
            scen.scores && Object.prototype.hasOwnProperty.call(scen.scores, item.id)
              ? scen.scores[item.id]
              : item.score,
          classAvg:
            scen.classAvgs && Object.prototype.hasOwnProperty.call(scen.classAvgs, item.id)
              ? scen.classAvgs[item.id]
              : item.classAvg
        }))
      };
      return {
        scenario: scen,
        evalResult: evaluateCourseGrade(simCourse)
      };
    });
  }, [course]);

  // Çan skoru görsel konum hesapları (0-100 ölçeği)
  const studentPosPct = Math.min(100, Math.max(0, evaluation.hbn));
  const classAvgPosPct =
    evaluation.weightedClassAvg !== null
      ? Math.min(100, Math.max(0, evaluation.weightedClassAvg))
      : null;

  return (
    <div className="space-y-4">
      {/* 1. Anlık Tahmin & Çan Konumu Kartı */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-[#0c3f79]/[0.03] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#0c3f79] text-[#e7a240] flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Anlık Harf Notu Tahmini
              </h2>
              <p className="text-[11px] text-slate-500">
                {evaluation.effectiveMode === 'relative'
                  ? 'YTÜ Bağıl Değerlendirme (T-Skoru) aktif'
                  : 'Mutlak (Katalog) Değerlendirme aktif'}
              </p>
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-xl text-sm font-black font-mono border ${
              evaluation.hasAnyScore
                ? getGradeBadgeClasses(evaluation.primaryGrade)
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
          >
            {evaluation.hasAnyScore ? evaluation.gradeRangeLabel : '—'}
          </span>
        </div>

        <div className="p-4 space-y-4">
          {/* Özet Metrik Kutuları */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Ham Başarı Notu
              </div>
              <div className="text-xl font-black font-mono text-slate-900 mt-0.5">
                {evaluation.hbn.toFixed(2)}
              </div>
              <div className="text-[10.5px] text-slate-500 mt-0.5">
                Girilen ağırlık: %{evaluation.completedWeight}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              {evaluation.completedAverage !== null &&
              evaluation.completedWeight < evaluation.totalWeight - 0.01 ? (
                <>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Şu Ana Kadarki Ort.
                  </div>
                  <div className="text-xl font-black font-mono text-[#0c3f79] mt-0.5">
                    {evaluation.completedAverage.toFixed(1)}
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">
                    Tahmini Katsayı:{' '}
                    <strong className="text-slate-700 font-mono">
                      {evaluation.minGpaPoint === evaluation.maxGpaPoint
                        ? evaluation.gpaPoint.toFixed(2)
                        : `${evaluation.minGpaPoint.toFixed(1)}–${evaluation.maxGpaPoint.toFixed(1)}`}
                    </strong>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    4&apos;lük Katsayı
                  </div>
                  <div className="text-xl font-black font-mono text-[#0c3f79] mt-0.5">
                    {evaluation.hasAnyScore
                      ? evaluation.minGpaPoint === evaluation.maxGpaPoint
                        ? evaluation.gpaPoint.toFixed(2)
                        : `${evaluation.minGpaPoint.toFixed(1)}–${evaluation.maxGpaPoint.toFixed(1)}`
                      : '0.00'}
                  </div>
                  <div className="text-[10.5px] text-slate-500 mt-0.5">
                    {evaluation.weightedClassAvg !== null
                      ? `Sınıf Ort: ${evaluation.weightedClassAvg.toFixed(1)}`
                      : 'AGNO dönem katkısı'}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Çan Konumu Yatay Skalası (Saf Tailwind) */}
          {evaluation.effectiveMode === 'relative' && classAvgPosPct !== null && (
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#0c3f79]" />
                  <span>Çan Konumun</span>
                </span>
                {evaluation.hasAnyScore && evaluation.diffFromClassAvg !== null ? (
                  <span
                    className={`font-mono font-extrabold px-2 py-0.5 rounded-md text-[11px] ${
                      evaluation.diffFromClassAvg >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {evaluation.diffFromClassAvg >= 0 ? '+' : ''}
                    {evaluation.diffFromClassAvg.toFixed(1)} puan (
                    {evaluation.exactTScore !== null ? `T≈${evaluation.exactTScore.toFixed(1)}` : ''})
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500">
                    Notunuzu girince çan konumunuz görünür
                  </span>
                )}
              </div>

              <div className="relative pt-4 pb-2 px-1.5">
                <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-rose-200 via-amber-200 to-emerald-300 relative">
                  {/* Sınıf Ortalaması İşaretçisi */}
                  <div
                    className="absolute -top-1.5 w-0.5 h-5 bg-slate-700"
                    style={{ left: `${classAvgPosPct}%` }}
                    title={`Sınıf Ortalaması: ${evaluation.weightedClassAvg?.toFixed(1)}`}
                  >
                    <span
                      className={`absolute -top-4 text-[9px] font-mono font-bold text-slate-600 whitespace-nowrap ${
                        classAvgPosPct < 12
                          ? 'left-0'
                          : classAvgPosPct > 88
                            ? 'right-0'
                            : '-translate-x-1/2'
                      }`}
                    >
                      Ort:{evaluation.weightedClassAvg?.toFixed(0)}
                    </span>
                  </div>

                  {/* Öğrenci HBN Noktası */}
                  {evaluation.hasAnyScore && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#0c3f79] border-2 border-white shadow-sm ring-2 ring-[#e7a240]"
                      style={{ left: `${studentPosPct}%` }}
                      title={`Senin HBN: ${evaluation.hbn.toFixed(1)}`}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>

              {/* 3'lü Sapma Bandı Kartları */}
              {evaluation.hasAnyScore && evaluation.bands.length > 0 && (
                <div
                  className={`grid gap-1.5 pt-1 ${
                    evaluation.bands.length === 3 ? 'grid-cols-3' : 'grid-cols-1'
                  }`}
                >
                  {evaluation.bands.map((band) => (
                    <div
                      key={band.stdDev}
                      className={`p-2 rounded-lg border text-center ${
                        band.stdDev === 15 || evaluation.bands.length === 1
                          ? 'bg-white border-[#0c3f79]/40 shadow-2xs'
                          : 'bg-white/70 border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-500">
                        σ = {band.stdDev}
                      </div>
                      <div className="text-sm font-black font-mono text-slate-900 mt-0.5">
                        {band.grade}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        T: {band.tScore.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. "Bu Harf Notu İçin Kaç Almalıyım?" Hedef Puan Çözücü */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-[#0c3f79]/[0.03] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Hedef Puan Tablosu
                </h2>
                <p className="text-[11px] text-slate-500">
                  Seçili sınavdan kaç alırsan hangi harf notu gelir?
                </p>
              </div>
            </div>
          </div>

          {weightedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="target-item-select"
                className="text-[11px] font-bold text-slate-600 shrink-0"
              >
                Hedef Kalem:
              </label>
              <select
                id="target-item-select"
                value={effectiveTargetId ?? ''}
                onChange={(e) => setSelectedTargetId(e.target.value)}
                className="flex-1 bg-white border border-slate-200 focus:border-[#0c3f79] rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                {weightedItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} (%{item.weight})
                    {item.score === null ? ' — Boş' : ` — Mevcut: ${item.score}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4">
          {targetRows.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              Hesaplama için ağırlığı sıfırdan büyük en az bir kalem gerekir.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10.5px] font-bold text-slate-500 uppercase">
                    <th className="py-2 pr-2">Hedef</th>
                    <th className="py-2 px-2">Gereken Puan</th>
                    <th className="py-2 px-2">Durum</th>
                    <th className="py-2 pl-2 text-right">Dene</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targetRows.map((row) => {
                    const isImpossible = row.status === 'impossible';
                    const isGuaranteed = row.status === 'guaranteed';
                    const isHard = row.status === 'hard';
                    const hasRange =
                      row.minBandScore !== undefined &&
                      row.maxBandScore !== undefined &&
                      Math.abs(row.minBandScore - row.maxBandScore) >= 0.5;

                    return (
                      <tr key={row.grade} className="hover:bg-slate-50/70">
                        <td className="py-2 pr-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-mono font-extrabold border text-[11px] ${getGradeBadgeClasses(
                              row.grade
                            )}`}
                          >
                            {row.grade}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-mono font-extrabold text-slate-900">
                          {row.blockedByOtherBaraj ? (
                            <span className="text-slate-400">—</span>
                          ) : isGuaranteed ? (
                            <div>
                              <span className="text-emerald-700">0 (Garanti)</span>
                              {hasRange && row.maxBandScore! > 0 && (
                                <span className="block text-[10px] font-normal text-slate-500">
                                  ({Math.max(0, row.minBandScore!).toFixed(0)}–
                                  {row.maxBandScore! > 100
                                    ? '100+'
                                    : row.maxBandScore!.toFixed(0)}{' '}
                                  arası)
                                </span>
                              )}
                            </div>
                          ) : isImpossible ? (
                            <div>
                              <span className="text-slate-400 line-through">
                                {row.requiredScore.toFixed(1)}
                              </span>
                              {hasRange && (
                                <span className="block text-[10px] font-normal text-slate-500">
                                  ({Math.max(0, row.minBandScore!).toFixed(0)}–
                                  {row.maxBandScore! > 100
                                    ? '100+'
                                    : Math.max(0, row.maxBandScore!).toFixed(0)}{' '}
                                  arası)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span>{Math.max(0, row.requiredScore).toFixed(1)}</span>
                              {hasRange && (
                                <span className="block text-[10px] font-normal text-slate-500">
                                  ({Math.max(0, row.minBandScore!).toFixed(0)}–
                                  {row.maxBandScore! > 100
                                    ? '100+'
                                    : Math.max(0, row.maxBandScore!).toFixed(0)}{' '}
                                  arası)
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {row.blockedByOtherBaraj ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600">
                              <AlertCircle className="w-3 h-3" />
                              Final barajı
                            </span>
                          ) : isGuaranteed ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Garanti
                            </span>
                          ) : isImpossible ? (
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-rose-600">
                              <AlertCircle className="w-3 h-3" />
                              &gt;100
                            </span>
                          ) : isHard ? (
                            <span className="text-[10.5px] font-bold text-amber-700">
                              Zor {row.limitedByBaraj ? '(Baraj)' : ''}
                            </span>
                          ) : (
                            <span className="text-[10.5px] font-bold text-blue-700">
                              Ulaşılabilir {row.limitedByBaraj ? '(Baraj)' : ''}
                            </span>
                          )}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          {!isImpossible && (
                            <button
                              type="button"
                              onClick={() =>
                                handleApplyTargetScore(Math.max(0, row.requiredScore))
                              }
                              title={`${targetItem?.label ?? 'Hedef'} notunu ${Math.max(
                                0,
                                Math.ceil(row.requiredScore * 10) / 10
                              )} yap`}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-[#0c3f79] hover:text-white text-slate-700 text-[10.5px] font-bold transition-colors cursor-pointer inline-flex items-center gap-0.5"
                            >
                              <span>Uygula</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 3. Kayıtlı Senaryolar ("What-If" Kıyaslama) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-[#0c3f79]/[0.03] flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Senaryo Kaydet &amp; Kıyasla
            </h2>
            <p className="text-[11px] text-slate-500">
              Farklı sınav tahminlerini kaydedip yan yana karşılaştırın.
            </p>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {['İyimser', 'Gerçekçi', 'Kötümser'].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => handleSaveScenario(label)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0c3f79] hover:text-white text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
              >
                + {label} Kaydet
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              placeholder="Özel senaryo adı..."
              aria-label="Yeni senaryo adı"
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-[#0c3f79] focus:bg-white rounded-xl px-3 py-1.5 text-xs font-medium text-slate-900 outline-none"
            />
            <button
              type="button"
              onClick={() => handleSaveScenario()}
              className="px-3 py-1.5 rounded-xl bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Kaydet</span>
            </button>
          </div>

          {scenarioEvaluations.length > 0 && (
            <div className="space-y-2 pt-1">
              {scenarioEvaluations.map(({ scenario, evalResult }) => (
                <div
                  key={scenario.id}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {scenario.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      HBN: <strong className="text-slate-700">{evalResult.hbn.toFixed(1)}</strong> ·{' '}
                      Katsayı: <strong className="text-slate-700">{evalResult.gpaPoint.toFixed(2)}</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-extrabold border ${getGradeBadgeClasses(
                        evalResult.primaryGrade
                      )}`}
                    >
                      {evalResult.gradeRangeLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleLoadScenario(scenario)}
                      title="Bu senaryoyu geri yükle"
                      aria-label={`${scenario.name} senaryosunu yükle`}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#0c3f79] text-slate-600 hover:text-[#0c3f79] transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteScenario(scenario.id)}
                      title="Senaryoyu sil"
                      aria-label={`${scenario.name} senaryosunu sil`}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
