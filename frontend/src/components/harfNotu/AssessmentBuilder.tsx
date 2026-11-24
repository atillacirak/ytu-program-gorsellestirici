"use client";

import React from 'react';
import {
  Plus,
  Trash2,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  X,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import { AssessmentItem, AssessmentType } from '../../types/harfNotu';
import {
  ASSESSMENT_PRESETS,
  QUICK_ADD_ASSESSMENT_OPTIONS,
  assignRemainingWeightToItem,
  buildPresetItems,
  generateId,
  getNextQuickLabel,
  normalizeWeightsTo100
} from '../../utils/harfNotuUtils';
import NumericDraftInput from './NumericDraftInput';

interface AssessmentBuilderProps {
  items: AssessmentItem[];
  onChangeItems: (nextItems: AssessmentItem[]) => void;
}

const TYPE_BADGE_STYLES: Record<AssessmentType, { label: string; cls: string }> = {
  midterm: { label: 'Vize', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  final: { label: 'Final', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  makeup: { label: 'Büt', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  project: { label: 'Proje', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  homework: { label: 'Ödev', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  lab: { label: 'Lab', cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  quiz: { label: 'Quiz', cls: 'bg-amber-50 text-amber-800 border-amber-200' },
  attendance: { label: 'Katılım', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  custom: { label: 'Özel', cls: 'bg-slate-100 text-slate-700 border-slate-200' }
};

function parseNullableScore(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return null;
  return Math.min(100, Math.max(0, num));
}

export default function AssessmentBuilder({
  items,
  onChangeItems
}: AssessmentBuilderProps) {
  const totalWeight = items.reduce((acc, i) => acc + Math.max(0, Number(i.weight) || 0), 0);
  const roundedTotalWeight = Math.round(totalWeight * 10) / 10;
  const finalWeight = items
    .filter((i) => i.type === 'final' || i.type === 'makeup')
    .reduce((acc, i) => acc + Math.max(0, Number(i.weight) || 0), 0);
  const inTermWeight = Math.round((totalWeight - finalWeight) * 10) / 10;
  const isWeightValid = Math.abs(roundedTotalWeight - 100) < 0.01;
  const hasActiveFinalAndMakeup =
    items.some((i) => i.type === 'final' && (Number(i.weight) || 0) > 0) &&
    items.some((i) => i.type === 'makeup' && (Number(i.weight) || 0) > 0);

  const preferredRemainderTarget =
    items.find((i) => i.type === 'final') ??
    items.find((i) => i.type === 'makeup') ??
    items[items.length - 1];

  const handleReplaceFinalWithMakeup = () => {
    const activeFinals = items.filter((i) => i.type === 'final');
    if (activeFinals.length === 0) return;
    onChangeItems(items.filter((i) => i.type !== 'final'));
  };

  const handleApplyPreset = (presetId: string) => {
    const newItems = buildPresetItems(presetId);
    onChangeItems(newItems);
  };

  const handleQuickAdd = (type: AssessmentType, baseLabel: string, defaultWeight: number) => {
    const label = getNextQuickLabel(items, type, baseLabel);
    const nextItem: AssessmentItem = {
      id: generateId('item'),
      label,
      type,
      weight: defaultWeight,
      score: null,
      classAvg: null
    };
    onChangeItems([...items, nextItem]);
  };

  const handleUpdateItem = (id: string, patch: Partial<AssessmentItem>) => {
    onChangeItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    onChangeItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Başlık & Hazır Şablonlar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-[#0c3f79]/[0.03] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0c3f79]/10 text-[#0c3f79] flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Değerlendirme Kalemleri &amp; Notlar
              </h2>
              <p className="text-[11px] text-slate-500">
                Hazır şablon seçebilir veya tek tıkla kalem ekleyip çıkararak yüzdeleri özelleştirebilirsiniz.
              </p>
            </div>
          </div>
        </div>

        {/* Tek Tıkla Şablon Seçici */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Şablon:
          </span>
          {ASSESSMENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleApplyPreset(preset.id)}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 hover:border-[#0c3f79]/40 text-[11px] font-semibold text-slate-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>{preset.name}</span>
              <span className="text-[10px] font-mono text-slate-400">({preset.description})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canlı Ağırlık Kontrol Çubuğu */}
      <div
        className={`px-4 py-3 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          isWeightValid
            ? 'bg-emerald-50/50 border-emerald-100'
            : 'bg-amber-50/80 border-amber-200'
        }`}
      >
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span
              className={`font-extrabold flex items-center gap-1.5 ${
                isWeightValid ? 'text-emerald-700' : 'text-amber-900'
              }`}
            >
              {isWeightValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>Toplam Ağırlık: %{roundedTotalWeight}</span>
            </span>
            <span className="text-slate-500 font-medium">
              Yıl İçi: <strong className="text-slate-700 font-mono">%{inTermWeight}</strong>
            </span>
            <span className="text-slate-500 font-medium">
              Final/Büt: <strong className="text-slate-700 font-mono">%{Math.round(finalWeight * 10) / 10}</strong>
            </span>
          </div>

          <div className="w-full max-w-md h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isWeightValid
                  ? 'bg-emerald-500'
                  : roundedTotalWeight > 100
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, roundedTotalWeight))}%` }}
            />
          </div>
        </div>

        {!isWeightValid && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {hasActiveFinalAndMakeup && (
              <button
                type="button"
                onClick={handleReplaceFinalWithMakeup}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Final&apos;i Kaldır (Büt Kullan)
              </button>
            )}
            <button
              type="button"
              onClick={() => onChangeItems(normalizeWeightsTo100(items))}
              className="px-3 py-1.5 rounded-lg bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Orantılı %100&apos;e Dengele</span>
            </button>
            {preferredRemainderTarget && (
              <button
                type="button"
                onClick={() =>
                  onChangeItems(assignRemainingWeightToItem(items, preferredRemainderTarget.id))
                }
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer"
              >
                {roundedTotalWeight < 100
                  ? `Kalan %${Math.round((100 - roundedTotalWeight) * 10) / 10}'i ${preferredRemainderTarget.label}'e Ekle`
                  : `Fazlayı ${preferredRemainderTarget.label}'den Düş`}
              </button>
            )}
          </div>
        )}
      </div>

      {hasActiveFinalAndMakeup && isWeightValid && (
        <div className="px-4 py-2 bg-purple-50/70 border-b border-purple-200 text-purple-900 text-[11px] font-medium flex flex-wrap items-center justify-between gap-2">
          <span>
            Hem Final hem Bütünleme aktif. Bütünleme finalin yerine geçiyorsa Final kalemini kaldırabilirsiniz.
          </span>
          <button
            type="button"
            onClick={handleReplaceFinalWithMakeup}
            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            Final&apos;i Kaldır
          </button>
        </div>
      )}

      {/* Masaüstü Semantik Tablo */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3 min-w-[150px]">Kalem Adı</th>
              <th className="px-3 py-3 w-24 min-w-[92px]">Ağırlık (%)</th>
              <th className="px-3 py-3 min-w-[140px]">Benim Notum (0–100)</th>
              <th className="px-3 py-3 w-36 min-w-[125px]">
                <div className="flex items-center gap-1">
                  <span>Sınıf Ort.</span>
                  <span
                    title="Çan (Bağıl) hesabı için opsiyonel sınav ortalaması"
                    className="text-slate-400 cursor-help"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </div>
              </th>
              <th className="px-3 py-3 w-12 text-center">Sil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {items.map((item) => {
              const badge = TYPE_BADGE_STYLES[item.type] || TYPE_BADGE_STYLES.custom;
              const isEmptyFinal =
                (item.type === 'final' || item.type === 'makeup') && item.score === null;

              return (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors align-top">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                        <input
                          type="text"
                          aria-label={`${item.label} kalem adı`}
                          value={item.label}
                          onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-[#0c3f79] focus:bg-white rounded-lg px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 outline-none transition-all"
                        />
                      </div>
                      {isEmptyFinal && (
                        <p className="text-[10.5px] text-indigo-600 font-medium pl-1">
                          Boş bırakılırsa hedef puan tablosu hesaplanır
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="relative">
                      <NumericDraftInput
                        min={0}
                        max={100}
                        step="1"
                        fallbackValue={0}
                        ariaLabel={`${item.label} ağırlık yüzdesi`}
                        value={item.weight}
                        onCommit={(nextWeight) =>
                          handleUpdateItem(item.id, { weight: nextWeight })
                        }
                        className="w-full min-w-[74px] bg-slate-50 border border-slate-200 focus:border-[#0c3f79] focus:bg-white rounded-xl pl-2.5 pr-6 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                        %
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          placeholder="Boş"
                          aria-label={`${item.label} benim notum`}
                          value={item.score === null ? '' : item.score}
                          onChange={(e) =>
                            handleUpdateItem(item.id, {
                              score: parseNullableScore(e.target.value)
                            })
                          }
                          className="w-28 bg-white border border-slate-200 focus:border-[#0c3f79] rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {item.score !== null && (
                          <button
                            type="button"
                            onClick={() => handleUpdateItem(item.id, { score: null })}
                            title="Notu temizle (boş bırak)"
                            aria-label={`${item.label} notunu temizle`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        aria-label={`${item.label} not kaydırıcı`}
                        value={item.score ?? 0}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            score: parseNullableScore(e.target.value)
                          })
                        }
                        className="w-full max-w-[200px] h-1.5 accent-[#0c3f79] cursor-pointer block"
                      />
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        placeholder="Opsiyonel"
                        aria-label={`${item.label} sınıf ortalaması`}
                        value={item.classAvg === null ? '' : item.classAvg}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            classAvg: parseNullableScore(e.target.value)
                          })
                        }
                        className="w-24 bg-slate-50 border border-slate-200 focus:border-[#0c3f79] focus:bg-white rounded-xl px-2.5 py-2 text-xs sm:text-sm font-mono font-semibold text-slate-800 outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      {item.classAvg !== null && (
                        <button
                          type="button"
                          onClick={() => handleUpdateItem(item.id, { classAvg: null })}
                          title="Sınıf ortalamasını temizle"
                          aria-label={`${item.label} sınıf ortalamasını temizle`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      title={
                        items.length <= 1
                          ? 'En az 1 değerlendirme kalemi kalmalıdır'
                          : `${item.label} kalemini sil`
                      }
                      aria-label={`${item.label} kalemini sil`}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobil Kart Görünümü */}
      <div className="md:hidden divide-y divide-slate-100">
        {items.map((item) => {
          const badge = TYPE_BADGE_STYLES[item.type] || TYPE_BADGE_STYLES.custom;
          return (
            <div key={item.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <input
                    type="text"
                    aria-label={`${item.label} kalem adı`}
                    value={item.label}
                    onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#0c3f79] focus:bg-white rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={items.length <= 1}
                  aria-label={`${item.label} kalemini sil`}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label
                    htmlFor={`mobile-weight-${item.id}`}
                    className="block text-[10px] font-bold text-slate-500 uppercase mb-1"
                  >
                    Ağırlık %
                  </label>
                  <NumericDraftInput
                    id={`mobile-weight-${item.id}`}
                    min={0}
                    max={100}
                    step="1"
                    fallbackValue={0}
                    value={item.weight}
                    onCommit={(nextWeight) =>
                      handleUpdateItem(item.id, { weight: nextWeight })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-sm font-mono font-bold text-slate-900 outline-none focus:border-[#0c3f79]"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`mobile-score-${item.id}`}
                    className="block text-[10px] font-bold text-slate-500 uppercase mb-1"
                  >
                    Notum
                  </label>
                  <input
                    id={`mobile-score-${item.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Boş"
                    value={item.score === null ? '' : item.score}
                    onChange={(e) =>
                      handleUpdateItem(item.id, {
                        score: parseNullableScore(e.target.value)
                      })
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-sm font-mono font-bold text-slate-900 outline-none focus:border-[#0c3f79]"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`mobile-avg-${item.id}`}
                    className="block text-[10px] font-bold text-slate-500 uppercase mb-1"
                  >
                    Sınıf Ort.
                  </label>
                  <input
                    id={`mobile-avg-${item.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Ops."
                    value={item.classAvg === null ? '' : item.classAvg}
                    onChange={(e) =>
                      handleUpdateItem(item.id, {
                        classAvg: parseNullableScore(e.target.value)
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-sm font-mono font-semibold text-slate-800 outline-none focus:border-[#0c3f79]"
                  />
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="1"
                aria-label={`${item.label} not kaydırıcı`}
                value={item.score ?? 0}
                onChange={(e) =>
                  handleUpdateItem(item.id, {
                    score: parseNullableScore(e.target.value)
                  })
                }
                className="w-full h-1.5 accent-[#0c3f79] cursor-pointer"
              />
            </div>
          );
        })}
      </div>

      {/* Hızlı Kalem Ekleme Çubuğu */}
      <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold text-slate-500 mr-1">+ Kalem Ekle:</span>
        {QUICK_ADD_ASSESSMENT_OPTIONS.map((opt) => (
          <button
            key={opt.type}
            type="button"
            onClick={() => handleQuickAdd(opt.type, opt.baseLabel, opt.defaultWeight)}
            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#0c3f79] hover:text-white border border-slate-200 hover:border-[#0c3f79] text-slate-700 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>{opt.baseLabel}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
