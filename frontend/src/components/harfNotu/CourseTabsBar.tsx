"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Download,
  BookOpen,
  Calculator,
  Calendar,
  Sparkles,
  Check,
  ChevronDown,
  Search
} from 'lucide-react';
import { CourseGradeProfile, EvaluationResult } from '../../types/harfNotu';
import { getGradeBadgeClasses, lookupCourseInfo } from '../../utils/harfNotuUtils';

interface CourseTabsBarProps {
  courses: CourseGradeProfile[];
  activeCourse: CourseGradeProfile;
  evaluationsByCourseId: Record<string, EvaluationResult>;
  onSelectCourse: (id: string) => void;
  onAddCourse: () => void;
  onDeleteCourse: (id: string) => void;
  onUpdateCourseMeta: (
    id: string,
    updates: Partial<Pick<CourseGradeProfile, 'code' | 'name' | 'credits'>>
  ) => void;
  onImportFromSchedule: () => { importedCount: number; message: string };
  onImportFromAgno: () => { importedCount: number; message: string };
}

export default function CourseTabsBar({
  courses,
  activeCourse,
  evaluationsByCourseId,
  onSelectCourse,
  onAddCourse,
  onDeleteCourse,
  onUpdateCourseMeta,
  onImportFromSchedule,
  onImportFromAgno
}: CourseTabsBarProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const activeBtn = tabRefs.current[activeCourse.id];
    if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
      activeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [activeCourse.id]);

  useEffect(() => {
    if (!importFeedback) return;
    const t = setTimeout(() => setImportFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [importFeedback]);

  const handleLookupByCodeOrName = async (codeVal?: string, nameVal?: string) => {
    setIsLookingUp(true);
    try {
      const found = await lookupCourseInfo(codeVal, nameVal);
      if (found) {
        onUpdateCourseMeta(activeCourse.id, {
          code: codeVal?.trim() ? codeVal.trim().toUpperCase() : found.code,
          name: found.name || activeCourse.name,
          credits: found.credits ? found.credits : activeCourse.credits
        });
      }
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleScheduleImportClick = () => {
    const res = onImportFromSchedule();
    setImportFeedback(res.message);
    setImportOpen(false);
  };

  const handleAgnoImportClick = () => {
    const res = onImportFromAgno();
    setImportFeedback(res.message);
    setImportOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-visible">
      {/* Üst Satır: Ders Sekmeleri + Yeni Ders + İçe Aktar */}
      <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Kayıtlı dönem dersleri"
          className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1 sm:pb-0 flex-1 min-w-0"
        >
          {courses.map((course, idx) => {
            const isSelected = course.id === activeCourse.id;
            const evalRes = evaluationsByCourseId[course.id];
            const displayTitle =
              course.code.trim() || course.name.trim() || `Ders ${idx + 1}`;
            const badgeText = evalRes?.hasAnyScore ? evalRes.gradeRangeLabel : '—';

            return (
              <button
                key={course.id}
                ref={(el) => {
                  tabRefs.current[course.id] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onSelectCourse(course.id)}
                className={`relative shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-[#0c3f79] text-white border-[#0c3f79] shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <span className="truncate max-w-[140px]">{displayTitle}</span>
                <span
                  className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md border ${
                    isSelected
                      ? 'bg-white/15 text-amber-200 border-white/25'
                      : evalRes?.hasAnyScore
                        ? getGradeBadgeClasses(evalRes.primaryGrade)
                        : 'bg-white text-slate-400 border-slate-200'
                  }`}
                >
                  {badgeText}
                </span>
                {isSelected && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 -bottom-[1px] h-[2.5px] rounded-full bg-[#e7a240]"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onAddCourse}
            className="px-3 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yeni Ders</span>
          </button>

          <div className="relative" ref={importMenuRef}>
            <button
              type="button"
              onClick={() => setImportOpen((prev) => !prev)}
              aria-expanded={importOpen}
              aria-haspopup="menu"
              className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>İçe Aktar</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${importOpen ? 'rotate-180' : ''}`} />
            </button>

            {importOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-40 space-y-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleAgnoImportClick}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-xs transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">AGNO Derslerinden Çek</div>
                    <div className="text-[11px] text-slate-500">
                      /agno senaryo dönemindeki dersleri ekler
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleScheduleImportClick}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-xs transition-colors flex items-start gap-2.5 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-[#0c3f79] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Ders Programından Çek</div>
                    <div className="text-[11px] text-slate-500">
                      Yüklü haftalık programdaki dersleri ekler
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* İçe Aktarma Geri Bildirimi */}
      {importFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2"
        >
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{importFeedback}</span>
        </div>
      )}

      {/* Aktif Ders Meta Bilgileri (Kod / Ad / Kredi / Sil) */}
      <button
        type="button"
        aria-controls="grade-course-details"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen(!detailsOpen)}
        className="flex min-h-11 w-full items-center justify-between gap-2 bg-slate-50/70 px-3.5 text-left text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:-outline-offset-2 md:hidden"
      >
        Ders bilgileri
        <ChevronDown aria-hidden="true" className={`size-4 ${detailsOpen ? 'rotate-180' : ''}`} />
      </button>
      <div
        id="grade-course-details"
        className={`${detailsOpen ? 'flex' : 'hidden'} flex-col justify-between gap-3 bg-slate-50/70 p-3.5 sm:p-4 md:flex lg:flex-row lg:items-end`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 flex-1">
          <div className="sm:col-span-3 space-y-1">
            <label
              htmlFor={`course-code-${activeCourse.id}`}
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider"
            >
              Ders Kodu
            </label>
            <div className="relative">
              <input
                id={`course-code-${activeCourse.id}`}
                type="text"
                value={activeCourse.code}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  onUpdateCourseMeta(activeCourse.id, { code: val });
                }}
                onBlur={(e) => {
                  if (e.target.value.trim().length >= 4) {
                    handleLookupByCodeOrName(e.target.value, undefined);
                  }
                }}
                placeholder="Örn: MAT1071"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="w-full bg-white border border-slate-200 focus:border-[#0c3f79] focus:ring-2 focus:ring-[#0c3f79]/15 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 uppercase outline-none transition-all pr-8"
              />
              <button
                type="button"
                onClick={() => handleLookupByCodeOrName(activeCourse.code, activeCourse.name)}
                disabled={isLookingUp}
                title="Ders kodu/adından YTÜ veritabanında ara"
                aria-label="Ders bilgilerini veritabanından tamamla"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#0c3f79] rounded-md transition-colors cursor-pointer"
              >
                <Search className={`w-3.5 h-3.5 ${isLookingUp ? 'animate-pulse text-[#0c3f79]' : ''}`} />
              </button>
            </div>
          </div>

          <div className="sm:col-span-6 space-y-1">
            <label
              htmlFor={`course-name-${activeCourse.id}`}
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider"
            >
              Ders Adı
            </label>
            <div className="relative">
              <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id={`course-name-${activeCourse.id}`}
                type="text"
                value={activeCourse.name}
                onChange={(e) =>
                  onUpdateCourseMeta(activeCourse.id, { name: e.target.value })
                }
                placeholder="Örn: Matematik I"
                className="w-full bg-white border border-slate-200 focus:border-[#0c3f79] focus:ring-2 focus:ring-[#0c3f79]/15 rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label
              htmlFor={`course-credits-${activeCourse.id}`}
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider"
            >
              Kredi (AGNO İçin)
            </label>
            <input
              id={`course-credits-${activeCourse.id}`}
              type="number"
              step="0.5"
              min="0"
              max="30"
              value={activeCourse.credits}
              onChange={(e) =>
                onUpdateCourseMeta(activeCourse.id, { credits: e.target.value })
              }
              placeholder="3.0"
              className="w-full bg-white border border-slate-200 focus:border-[#0c3f79] focus:ring-2 focus:ring-[#0c3f79]/15 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-slate-900 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-2 pt-1 lg:pt-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1 lg:hidden">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Ders kodu yazınca kredi otomatik aranır
          </span>
          {courses.length > 1 && (
            <button
              type="button"
              onClick={() => onDeleteCourse(activeCourse.id)}
              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Bu dersi sil"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Dersi Sil</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
