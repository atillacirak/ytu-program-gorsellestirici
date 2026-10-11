"use client";

import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  Copy,
  Loader2,
  Upload,
  ShieldCheck,
  CheckCircle2,
  Sun,
  Download,
  FolderOpen,
  Undo2
} from 'lucide-react';
import { CurriculumCourse, ScenarioMeta } from '@/types/planlama';
import { extractPrereqCodes, resolveEffectivePrereqText } from '@/utils/planlamaUtils';

interface PlanlamaToolbarProps {
  scenarios: ScenarioMeta[];
  activeScenarioId: string;
  activeScenarioName: string;
  isUploadingTranscript: boolean;
  exemptCount: number;
  regularMaxLimit: number;
  unitLabel: string;
  isHighGpa: boolean;
  summerMaxCourses: number;
  summerMaxLimit: number;
  unassignedCourses: CurriculumCourse[];
  draggedCourse: { course: CurriculumCourse; fromBucketId: string } | null;
  electivePrereqMap: Map<string, string>;
  onSelectScenario: (id: string) => void;
  onCreateScenario: (cloneCurrent: boolean) => void;
  onDeleteScenario: (id: string, e: React.MouseEvent) => void;
  onRenameScenario: (id: string, newName: string) => void;
  onTriggerTranscriptUpload: () => void;
  onOpenExemptionModal: () => void;
  onChangeRegularMaxLimit: (val: number) => void;
  onToggleHighGpa: () => void;
  onChangeSummerMaxCourses: (val: number) => void;
  onChangeSummerMaxLimit: (val: number) => void;
  onExportPdf: () => void;
  onDropToPool: () => void;
  onCourseDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    course: CurriculumCourse,
    fromBucketId: string
  ) => void;
  onCourseDragEnd: () => void;
  onReturnCourseToDefault: (course: CurriculumCourse, fromId: string) => void;
  onOpenMoveModal: (course: CurriculumCourse, fromBucketId: string) => void;
}

export const PlanlamaToolbar = React.memo(function PlanlamaToolbar({
  scenarios,
  activeScenarioId,
  activeScenarioName,
  isUploadingTranscript,
  exemptCount,
  regularMaxLimit,
  unitLabel,
  isHighGpa,
  summerMaxCourses,
  summerMaxLimit,
  unassignedCourses,
  draggedCourse,
  electivePrereqMap,
  onSelectScenario,
  onCreateScenario,
  onDeleteScenario,
  onRenameScenario,
  onTriggerTranscriptUpload,
  onOpenExemptionModal,
  onChangeRegularMaxLimit,
  onToggleHighGpa,
  onChangeSummerMaxCourses,
  onChangeSummerMaxLimit,
  onExportPdf,
  onDropToPool,
  onCourseDragStart,
  onCourseDragEnd,
  onReturnCourseToDefault,
  onOpenMoveModal
}: PlanlamaToolbarProps) {
  const [isScenarioMenuOpen, setIsScenarioMenuOpen] = useState(false);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
  const [editingScenarioName, setEditingScenarioName] = useState('');
  const scenarioMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isScenarioMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (scenarioMenuRef.current && !scenarioMenuRef.current.contains(e.target as Node)) {
        setIsScenarioMenuOpen(false);
        setEditingScenarioId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isScenarioMenuOpen]);

  const handleSaveRename = (id: string) => {
    const trimmed = editingScenarioName.trim();
    if (trimmed) {
      onRenameScenario(id, trimmed);
    }
    setEditingScenarioId(null);
  };

  return (
    <div className="bg-white border-b border-slate-200 sticky top-[61px] z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Scenario Switcher, Data Actions & Limits */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Modern Scenario Picker Dropdown */}
          <div ref={scenarioMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsScenarioMenuOpen(!isScenarioMenuOpen)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-2xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-amber-300" />
              <span>{activeScenarioName}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-bold">
                {scenarios.length}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-indigo-100 transition-transform ${
                  isScenarioMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isScenarioMenuOpen && (
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 overflow-hidden">
                <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Kayıtlı Senaryolar ({scenarios.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Otomatik Kaydedilir
                  </span>
                </div>

                <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                  {scenarios.map((sc) => {
                    const isActive = sc.id === activeScenarioId;
                    const isEditing = editingScenarioId === sc.id;

                    return (
                      <div
                        key={sc.id}
                        onClick={() => {
                          if (!isEditing) {
                            onSelectScenario(sc.id);
                            setIsScenarioMenuOpen(false);
                          }
                        }}
                        className={`group rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              handleSaveRename(sc.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 flex-1"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editingScenarioName}
                              onChange={(e) => setEditingScenarioName(e.target.value)}
                              onBlur={() => handleSaveRename(sc.id)}
                              className="w-full px-2 py-0.5 rounded bg-white text-slate-900 text-xs font-bold border border-amber-400 focus:outline-none"
                            />
                          </form>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isActive ? 'bg-amber-300' : 'bg-slate-300'
                              }`}
                            />
                            <span className="text-xs font-bold truncate">{sc.name}</span>
                            {isActive && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/20 text-amber-200 font-bold shrink-0">
                                Aktif
                              </span>
                            )}
                          </div>
                        )}

                        {!isEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingScenarioId(sc.id);
                                setEditingScenarioName(sc.name);
                              }}
                              className={`p-1 rounded-md transition-colors cursor-pointer ${
                                isActive
                                  ? 'hover:bg-white/15 text-blue-100 hover:text-white'
                                  : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                              }`}
                              title="Senaryo adını değiştir"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            {scenarios.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => onDeleteScenario(sc.id, e)}
                                className={`p-1 rounded-md transition-colors cursor-pointer ${
                                  isActive
                                    ? 'hover:bg-rose-500/30 text-rose-200 hover:text-white'
                                    : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                                }`}
                                title="Senaryoyu sil"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 bg-slate-50 border-t border-slate-200 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onCreateScenario(false);
                      setIsScenarioMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>+ Yeni Senaryo Ekle (Senaryo {scenarios.length + 1})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateScenario(true);
                      setIsScenarioMenuOpen(false);
                    }}
                    className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>Mevcut Senaryoyu Kopyala</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Transcript Upload (Left-aligned) */}
          <button
            onClick={onTriggerTranscriptUpload}
            disabled={isUploadingTranscript}
            className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="e-Devlet veya OBS transkript PDF'inizi yükleyerek verdiğiniz ve muaf olduğunuz dersleri otomatik algılatın"
          >
            {isUploadingTranscript ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            <span>{isUploadingTranscript ? 'Analiz Ediliyor...' : 'Transkript Yükle'}</span>
          </button>

          {/* Exemption Pool (Left-aligned, Orange tone) */}
          <button
            onClick={onOpenExemptionModal}
            className="px-3 py-1.5 rounded-lg text-xs font-extrabold bg-orange-500 hover:bg-orange-600 text-white shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span>Muafiyet Havuzu ({exemptCount})</span>
          </button>

          {/* Normal Semester Max Limit + AGNO >= 3.00 (28 Kredi) Checkbox */}
          <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Dönem Sınırı:</span>
            <input
              type="number"
              min={10}
              max={70}
              value={regularMaxLimit}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value) || 25);
                onChangeRegularMaxLimit(val);
              }}
              className="w-13 text-center font-mono text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-1.5 py-0.5"
            />
            <span className="text-xs font-bold text-slate-700">{unitLabel}</span>

            <label
              onClick={onToggleHighGpa}
              className={`ml-1 pl-2 border-l border-slate-200 flex items-center gap-1.5 text-xs font-bold select-none cursor-pointer transition-colors ${
                isHighGpa ? 'text-emerald-700' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="YTÜ yönetmeliğine göre AGNO 3.00 ve üzeri olduğunda dönemlik yerel kredi sınırı 25'ten 28'e çıkar"
            >
              <span
                className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                  isHighGpa
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-slate-300'
                }`}
              >
                {isHighGpa && <CheckCircle2 className="w-3 h-3" />}
              </span>
              <span>AGNO&apos;m 3&apos;ün üstünde (28)</span>
            </label>
          </div>

          {/* Summer Max Courses & Limit */}
          <div className="flex items-center gap-1.5 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200">
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-900">Yaz:</span>
            <input
              type="number"
              min={1}
              max={6}
              value={summerMaxCourses}
              onChange={(e) =>
                onChangeSummerMaxCourses(Math.max(1, Number(e.target.value) || 3))
              }
              className="w-10 text-center font-mono text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded px-1 py-0.5"
            />
            <span className="text-xs font-bold text-amber-900">Ders /</span>
            <input
              type="number"
              min={1}
              max={30}
              value={summerMaxLimit}
              onChange={(e) =>
                onChangeSummerMaxLimit(Math.max(1, Number(e.target.value) || 9))
              }
              className="w-11 text-center font-mono text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded px-1 py-0.5"
            />
            <span className="text-xs font-bold text-amber-900">Kredi</span>
          </div>
        </div>

        {/* Far-Right: Standalone Blue PDF Export Button */}
        <div className="flex items-center ml-auto">
          <button
            onClick={onExportPdf}
            className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#0c3f79] hover:bg-[#092d58] text-white shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Yaptığınız akademik planı A4 PDF olarak dışa aktarın / indirin"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" />
            <span>PDF İndir</span>
          </button>
        </div>
      </div>

      {/* Sticky Unassigned Courses Pool */}
      {unassignedCourses.length > 0 && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            onDropToPool();
          }}
          className={`border-t transition-colors ${
            draggedCourse
              ? 'bg-amber-100/90 border-amber-400'
              : 'bg-amber-50/95 border-amber-200'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-extrabold text-slate-900">
                  Açıkta Kalan Dersler Havuzu ({unassignedCourses.length})
                </span>
                <span className="text-[11px] text-amber-900/80 hidden sm:inline">
                  — Sayfayı aşağı kaydırıp buradaki dersleri istediğiniz yarıyıla doğrudan sürükleyip bırakabilirsiniz
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
              {unassignedCourses.map((course) => {
                const poolPrereqText = resolveEffectivePrereqText(course, electivePrereqMap);
                const poolPrereqCodes = extractPrereqCodes(poolPrereqText);

                return (
                  <div
                    key={course.uid}
                    draggable
                    onDragStart={(e) => onCourseDragStart(e, course, 'pool')}
                    onDragEnd={onCourseDragEnd}
                    className="bg-white rounded-xl px-2.5 py-2 border border-amber-300 shadow-2xs flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none hover:border-amber-400"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-extrabold text-slate-900">
                          {course.selectedElectiveCode || course.code}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            course.termType === 'Güz'
                              ? 'bg-sky-100 text-sky-800'
                              : course.termType === 'Bahar'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {course.termType === 'Her İkisi' ? 'Güz/Bahar' : course.termType}
                        </span>
                        {poolPrereqCodes.length > 0 && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                            title={`Bologna Ön Koşulu: ${poolPrereqText}`}
                          >
                            Önk. {poolPrereqCodes.join(', ')}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] font-medium text-slate-700 truncate">
                        {course.selectedElectiveName || course.name}
                      </p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {course.ects} AKTS · {course.credits} Kredi
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!course.uid.startsWith('custom-') && (
                        <button
                          onClick={() => onReturnCourseToDefault(course, 'pool')}
                          className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white transition-colors cursor-pointer"
                          title={`Orijinal dönemine (${course.defaultSemester}. Yarıyıl) geri gönder`}
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onOpenMoveModal(course, 'pool')}
                        className="px-2 py-1 rounded-lg bg-[#0c3f79] text-white text-[11px] font-bold hover:bg-[#092d58] shrink-0 cursor-pointer"
                      >
                        Yerleştir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
