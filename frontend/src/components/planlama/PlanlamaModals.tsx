"use client";

import React, { useState, useMemo } from 'react';
import {
  X,
  Sun,
  ChevronRight,
  FolderOpen,
  ShieldCheck,
  Loader2,
  FileText,
  Search,
  CheckCircle2
} from 'lucide-react';
import {
  CanonicalSemesterGroup,
  CurriculumCourse,
  ElectiveOption,
  MoveValidationResult,
  NewCourseFormState,
  PlanSummary,
  SemesterBucket
} from '@/types/planlama';
import { extractPrereqCodes, getRelevantPoolsForSlot } from '@/utils/planlamaUtils';

/* ============================================================================
 * Modal 1: Move Course To Semester Modal
 * ========================================================================== */
interface MoveCourseModalProps {
  movingCourseModal: { course: CurriculumCourse; fromBucketId: string };
  buckets: SemesterBucket[];
  limitMetric: 'ects' | 'credits';
  regularMaxLimit: number;
  summerMaxLimit: number;
  validateMove: (course: CurriculumCourse, targetBucket: SemesterBucket) => MoveValidationResult;
  onClose: () => void;
  onAddSummerSchool: (year: number) => void;
  onMoveCourse: (course: CurriculumCourse, fromId: string, toId: string) => void;
  onToggleCourseExemption: (course: CurriculumCourse) => void;
}

export const MoveCourseModal = React.memo(function MoveCourseModal({
  movingCourseModal,
  buckets,
  limitMetric,
  regularMaxLimit,
  summerMaxLimit,
  validateMove,
  onClose,
  onAddSummerSchool,
  onMoveCourse,
  onToggleCourseExemption
}: MoveCourseModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 bg-[#0c3f79] text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
              Dersi Başka Yarıyıla Taşı
            </span>
            <h3 className="text-sm font-extrabold mt-0.5">
              {movingCourseModal.course.code} — {movingCourseModal.course.name}
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              {movingCourseModal.course.ects} AKTS · {movingCourseModal.course.credits} Kredi ·
              Dönem Kuralı: <strong>{movingCourseModal.course.termType}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 max-h-[65vh] overflow-y-auto space-y-2">
          {/* Quick Add Summer School if none exists */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Hızlı Yaz Okulu Aç:</span>
            {[1, 2, 3, 4].map((yr) => {
              const exists = buckets.some((b) => b.id === `sum-${yr}`);
              if (exists) return null;
              return (
                <button
                  key={yr}
                  onClick={() => onAddSummerSchool(yr)}
                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sun className="w-3 h-3 text-amber-600" />
                  <span>+ {yr}. Sınıf Yaz</span>
                </button>
              );
            })}
          </div>

          {buckets.map((b) => {
            const isCurrent = b.id === movingCourseModal.fromBucketId;
            const check = validateMove(movingCourseModal.course, b);
            const isSum = b.season === 'Yaz';
            const useEcts = !isSum && limitMetric === 'ects';
            const curEcts = b.courses.reduce((s, c) => s + c.ects, 0);
            const curCred = b.courses.reduce((s, c) => s + c.credits, 0);
            const maxLim = b.customLimit ?? (isSum ? summerMaxLimit : regularMaxLimit);
            const curVal = useEcts ? curEcts : curCred;
            const bUnit = useEcts ? 'AKTS' : 'Kredi';

            return (
              <button
                key={b.id}
                disabled={isCurrent || !check.allowed}
                onClick={() => {
                  onMoveCourse(movingCourseModal.course, movingCourseModal.fromBucketId, b.id);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                    : check.allowed
                    ? 'bg-white hover:bg-emerald-50/60 border-slate-200 hover:border-emerald-400 cursor-pointer'
                    : 'bg-rose-50/40 border-rose-200/70 opacity-65 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-900">{b.title}</span>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">
                        Mevcut Dönemi
                      </span>
                    )}
                  </div>
                  {!isCurrent && !check.allowed && (
                    <p className="text-[11px] text-rose-600 font-medium mt-0.5">{check.reason}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {curVal} / {maxLim} {bUnit}
                  </span>
                  {check.allowed && !isCurrent && (
                    <div className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-0.5">
                      <span>Buraya Taşı</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}

          {/* Move to Unassigned Pool or Exemption Pool buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {movingCourseModal.fromBucketId !== 'pool' && (
              <button
                onClick={() => {
                  onMoveCourse(movingCourseModal.course, movingCourseModal.fromBucketId, 'pool');
                  onClose();
                }}
                className="w-full p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Açıkta Kalan Havuza Ayır</span>
              </button>
            )}

            <button
              onClick={() => {
                onToggleCourseExemption(movingCourseModal.course);
                onClose();
              }}
              className="w-full p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bu Dersi Muaf Say (Muafiyet Havuzu)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/* ============================================================================
 * Modal 1.5: Exemption Pool (Muafiyet Havuzu) Modal
 * ========================================================================== */
interface ExemptionPoolModalProps {
  canonicalSemesterGroups: CanonicalSemesterGroup[];
  exemptCourses: CurriculumCourse[];
  exemptUidSet: Set<string>;
  summary: PlanSummary;
  isUploadingTranscript: boolean;
  onClose: () => void;
  onTriggerTranscriptUpload: () => void;
  onBatchExemptByPrefixes: (prefixes: string[], label: string) => void;
  onClearAllExemptions: () => void;
  onToggleCourseExemption: (course: CurriculumCourse, silent?: boolean) => void;
  onToggleSemesterExemption: (semNumber: number, semCourses: CurriculumCourse[]) => void;
}

export const ExemptionPoolModal = React.memo(function ExemptionPoolModal({
  canonicalSemesterGroups,
  exemptCourses,
  exemptUidSet,
  summary,
  isUploadingTranscript,
  onClose,
  onTriggerTranscriptUpload,
  onBatchExemptByPrefixes,
  onClearAllExemptions,
  onToggleCourseExemption,
  onToggleSemesterExemption
}: ExemptionPoolModalProps) {
  const [exemptionSearch, setExemptionSearch] = useState('');
  const [exemptionSemFilter, setExemptionSemFilter] = useState<number | 'all'>('all');

  const filteredExemptionGroups = useMemo(() => {
    const q = exemptionSearch.trim().toLowerCase();
    return canonicalSemesterGroups
      .filter((g) => exemptionSemFilter === 'all' || g.semesterNumber === exemptionSemFilter)
      .map((g) => ({
        ...g,
        courses: q
          ? g.courses.filter(
              (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
            )
          : g.courses
      }))
      .filter((g) => g.courses.length > 0);
  }, [canonicalSemesterGroups, exemptionSearch, exemptionSemFilter]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="p-4 bg-[#0c3f79] text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Muafiyet Havuzu Yönetimi</span>
            </span>
            <h3 className="text-sm sm:text-base font-extrabold mt-0.5">
              Muaf Olduğunuz Dersleri Dönemlere Göre Seçin
            </h3>
            <p className="text-xs text-blue-100 mt-0.5">
              İşaretlediğiniz dersler normal dönemlerinden kaldırılır ve mezuniyet kredinize
              otomatik tamamlanmış olarak eklenir.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Exemption Presets, Search & Semester Filter Pills */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={onTriggerTranscriptUpload}
                disabled={isUploadingTranscript}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {isUploadingTranscript ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3" />
                )}
                <span>
                  {isUploadingTranscript
                    ? 'Analiz Ediliyor...'
                    : 'Transkriptten Otomatik Aktar (PDF)'}
                </span>
              </button>
              <button
                onClick={() => onBatchExemptByPrefixes(['MDB', 'YDB'], 'İngilizce Dersleri')}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[#0c3f79] border border-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
              >
                + İngilizce (MDB1031 & 1032)
              </button>
              <button
                onClick={() =>
                  onBatchExemptByPrefixes(['ATA', 'TDB', 'MDB', 'YDB'], 'Ortak YÖK Dersleri')
                }
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 text-[#0c3f79] border border-slate-300 text-[11px] font-bold cursor-pointer transition-colors"
              >
                + Ortak Dersler (ATA / TDB / MDB)
              </button>
            </div>

            {exemptCourses.length > 0 && (
              <button
                onClick={onClearAllExemptions}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold cursor-pointer"
              >
                Tüm Muafiyetleri Kaldır ({exemptCourses.length})
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ders kodu veya adı ara (Örn: MAT1071, Fizik 1, İleri İngilizce...)"
              value={exemptionSearch}
              onChange={(e) => setExemptionSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0c3f79]"
            />
          </div>

          {/* Semester Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            <button
              onClick={() => setExemptionSemFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-colors ${
                exemptionSemFilter === 'all'
                  ? 'bg-[#0c3f79] text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tüm Dönemler (1-8)
            </button>
            {canonicalSemesterGroups.map((g) => {
              const exemptInSem = g.courses.filter((c) => exemptUidSet.has(c.uid)).length;
              const isActive = exemptionSemFilter === g.semesterNumber;
              return (
                <button
                  key={g.semesterNumber}
                  onClick={() => setExemptionSemFilter(g.semesterNumber)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 cursor-pointer transition-colors flex items-center gap-1 ${
                    isActive
                      ? 'bg-[#0c3f79] text-white'
                      : exemptInSem > 0
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{g.semesterNumber}. Yarıyıl</span>
                  {exemptInSem > 0 && (
                    <span
                      className={`px-1 rounded text-[10px] ${
                        isActive ? 'bg-amber-400 text-slate-950' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {exemptInSem}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currently Exempt Badges */}
        {exemptCourses.length > 0 && (
          <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-200 flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto">
            <span className="text-[11px] font-extrabold text-emerald-900 mr-1">
              Seçili ({exemptCourses.length} Ders · {summary.exemptEcts} AKTS):
            </span>
            {exemptCourses.map((c) => (
              <button
                key={c.uid}
                onClick={() => onToggleCourseExemption(c, true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                title="Muafiyeti kaldırmak ve dönemine geri döndürmek için tıklayın"
              >
                <span>{c.selectedElectiveCode || c.code}</span>
                {c.grade && (
                  <span className="px-1 rounded bg-emerald-800 text-amber-300 text-[9px]">
                    {c.grade}
                  </span>
                )}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        )}

        {/* Grouped By Semester Course List */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {filteredExemptionGroups.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Aramanızla eşleşen ders bulunamadı.
            </p>
          ) : (
            filteredExemptionGroups.map((group) => {
              const exemptCountInGroup = group.courses.filter((c) => exemptUidSet.has(c.uid)).length;
              const allExemptInGroup =
                group.courses.length > 0 && exemptCountInGroup === group.courses.length;

              return (
                <div
                  key={group.semesterNumber}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden"
                >
                  {/* Semester Group Header */}
                  <div className="px-3.5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#0c3f79] text-white font-extrabold text-xs flex items-center justify-center">
                        {group.semesterNumber}
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                          {group.title}
                        </h4>
                      </div>
                      {exemptCountInGroup > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                          {exemptCountInGroup} / {group.courses.length} Muaf
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => onToggleSemesterExemption(group.semesterNumber, group.courses)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                        allExemptInGroup
                          ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:border-[#0c3f79] hover:text-[#0c3f79]'
                      }`}
                    >
                      {allExemptInGroup ? '✓ Dönemin Tümü Muaf' : 'Dönemin Tümünü Muaf Seç'}
                    </button>
                  </div>

                  {/* Courses Grid inside Semester Group */}
                  <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.courses.map((course) => {
                      const isExempt = exemptUidSet.has(course.uid);
                      const exObj = isExempt
                        ? exemptCourses.find((ec) => ec.uid === course.uid)
                        : undefined;
                      return (
                        <button
                          key={course.uid}
                          onClick={() => onToggleCourseExemption(course, true)}
                          className={`text-left p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2.5 cursor-pointer ${
                            isExempt
                              ? 'bg-emerald-50 border-emerald-400'
                              : 'bg-white hover:bg-slate-50 border-slate-200/90'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                isExempt
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'bg-white border-slate-300'
                              }`}
                            >
                              {isExempt && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-extrabold text-slate-900">
                                  {exObj?.selectedElectiveCode || course.code}
                                </span>
                                {isExempt && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold">
                                    {exObj?.grade ? `Verildi (${exObj.grade})` : 'Muaf'}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">
                                {exObj?.selectedElectiveName
                                  ? `${exObj.selectedElectiveName} (${course.name})`
                                  : course.name}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono text-[11px] font-bold text-slate-500">
                            <div>{course.ects} AKTS</div>
                            <div className="text-[10px] font-normal">{course.credits} Kr</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-600 font-medium">
            Toplam <strong>{exemptCourses.length}</strong> ders muaf seçildi (
            <strong>{summary.exemptEcts} AKTS · {summary.exemptCredits} Kredi</strong>)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-[#0c3f79] text-white text-xs font-bold hover:bg-[#092d58] cursor-pointer"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
});

/* ============================================================================
 * Modal 2: Elective Course Pool Picker
 * ========================================================================== */
interface ElectivePickerModalProps {
  electiveModal: { course: CurriculumCourse; bucketId: string };
  electivePools: Record<string, ElectiveOption[]>;
  onClose: () => void;
  onSelectElective: (opt: ElectiveOption) => void;
}

export const ElectivePickerModal = React.memo(function ElectivePickerModal({
  electiveModal,
  electivePools,
  onClose,
  onSelectElective
}: ElectivePickerModalProps) {
  const [electiveSearch, setElectiveSearch] = useState('');
  const [showAllElectivePools, setShowAllElectivePools] = useState(false);

  const relevantElectivePoolNames = useMemo(
    () => getRelevantPoolsForSlot(electiveModal.course, electivePools),
    [electiveModal.course, electivePools]
  );

  const matchingElectiveOptions = useMemo(() => {
    const allowedPools = showAllElectivePools
      ? new Set(Object.keys(electivePools))
      : new Set(relevantElectivePoolNames);
    const allOpts: { poolName: string; opt: ElectiveOption }[] = [];
    Object.entries(electivePools).forEach(([poolName, list]) => {
      if (!allowedPools.has(poolName)) return;
      list.forEach((opt) => {
        allOpts.push({ poolName, opt });
      });
    });
    const q = electiveSearch.trim().toLowerCase();
    if (!q) return allOpts;
    return allOpts.filter(
      (item) =>
        item.opt.code.toLowerCase().includes(q) ||
        item.opt.name.toLowerCase().includes(q) ||
        item.poolName.toLowerCase().includes(q)
    );
  }, [electivePools, electiveSearch, showAllElectivePools, relevantElectivePoolNames]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 bg-[#0c3f79] text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300">
              Bologna Seçmeli Ders Havuzu
            </span>
            <h3 className="text-sm font-extrabold mt-0.5">
              {electiveModal.course.code} ({electiveModal.course.name}) İçin Ders Seçin
            </h3>
            <p className="text-[11px] text-blue-100 mt-0.5">
              Kategori:{' '}
              <strong className="text-amber-300">
                {showAllElectivePools
                  ? 'Tüm Seçmeli Havuzları'
                  : relevantElectivePoolNames.join(' · ')}
              </strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Seçmeli ders kodu veya adı ara (Örn: Yapay Zeka, İTBF, BLM4...)"
              value={electiveSearch}
              onChange={(e) => setElectiveSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0c3f79]"
            />
          </div>

          {Object.keys(electivePools).length > 1 && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-medium">
                {showAllElectivePools
                  ? `Tüm havuzlardan ${matchingElectiveOptions.length} ders listeleniyor`
                  : `Sadece ilgili kategoriden ${matchingElectiveOptions.length} ders listeleniyor`}
              </span>
              <button
                type="button"
                onClick={() => setShowAllElectivePools(!showAllElectivePools)}
                className="font-bold text-[#0c3f79] hover:underline cursor-pointer"
              >
                {showAllElectivePools ? 'Sadece İlgili Havuzu Göster' : 'Tüm Havuzları Göster'}
              </button>
            </div>
          )}
        </div>

        <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
          {matchingElectiveOptions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">
              Aramanızla eşleşen seçmeli ders bulunamadı.
            </p>
          ) : (
            matchingElectiveOptions.slice(0, 80).map(({ poolName, opt }, idx) => (
              <button
                key={`${opt.code}-${idx}`}
                onClick={() => onSelectElective(opt)}
                className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-[#0c3f79] hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-extrabold text-[#0c3f79]">
                      {opt.code}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {poolName}
                    </span>
                    {opt.prereq && (
                      <span
                        title={`Bologna Ön Koşulu: ${opt.prereq}`}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                      >
                        Önk. {extractPrereqCodes(opt.prereq).join(', ') || opt.prereq}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">{opt.name}</p>
                </div>
                <div className="text-right shrink-0 font-mono text-xs font-bold text-slate-600">
                  {opt.ects} AKTS · {opt.credits} Kr
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

/* ============================================================================
 * Modal 3: Add Custom Course Modal
 * ========================================================================== */
interface CustomCourseModalProps {
  onClose: () => void;
  onAddCustomCourse: (form: NewCourseFormState) => void;
}

export const CustomCourseModal = React.memo(function CustomCourseModal({
  onClose,
  onAddCustomCourse
}: CustomCourseModalProps) {
  const [form, setForm] = useState<NewCourseFormState>({
    code: '',
    name: '',
    credits: '3',
    ects: '5',
    termType: 'Her İkisi'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomCourse(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 bg-[#0c3f79] text-white flex items-center justify-between">
          <h3 className="text-sm font-extrabold">Döneme Özel / Ek Ders Ekle</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ders Kodu</label>
              <input
                type="text"
                required
                placeholder="Örn: MAT2011"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dönem Kuralı</label>
              <select
                value={form.termType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    termType: e.target.value as 'Güz' | 'Bahar' | 'Her İkisi'
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
              >
                <option value="Her İkisi">Güz / Bahar Esnek</option>
                <option value="Güz">Sadece Güz (+ Yaz)</option>
                <option value="Bahar">Sadece Bahar (+ Yaz)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Ders Adı</label>
            <input
              type="text"
              required
              placeholder="Örn: Diferansiyel Denklemler"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">AKTS (ECTS)</label>
              <input
                type="number"
                step="0.5"
                required
                value={form.ects}
                onChange={(e) => setForm({ ...form, ects: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Yerel Kredi</label>
              <input
                type="number"
                step="0.5"
                required
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 font-bold"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#0c3f79] text-white font-bold hover:bg-[#092d58] cursor-pointer"
            >
              Dersi Ekle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
