"use client";

import React from 'react';
import {
  Sun,
  Snowflake,
  Flower2,
  Plus,
  Trash2,
  BookOpen,
  CheckCircle2,
  Search,
  Undo2,
  Unlock,
  Lock,
  ArrowRightLeft
} from 'lucide-react';
import {
  CurriculumCourse,
  MoveValidationResult,
  PlanSummary,
  SemesterBucket
} from '@/types/planlama';
import {
  extractPrereqCodes,
  isStajOrZeroCreditCourse,
  resolveEffectivePrereqText
} from '@/utils/planlamaUtils';

interface SemesterBucketCardProps {
  bucket: SemesterBucket;
  limitMetric: 'ects' | 'credits';
  regularMaxLimit: number;
  summerMaxLimit: number;
  summerMaxCourses: number;
  summary: PlanSummary;
  hasElectivePools: boolean;
  electivePrereqMap: Map<string, string>;
  draggedCourse: { course: CurriculumCourse; fromBucketId: string } | null;
  validateMove: (course: CurriculumCourse, targetBucket: SemesterBucket) => MoveValidationResult;
  onDropCourseToBucket: (targetBucketId: string) => void;
  onCourseDragStart: (
    e: React.DragEvent<HTMLDivElement>,
    course: CurriculumCourse,
    fromBucketId: string
  ) => void;
  onCourseDragEnd: () => void;
  onToggleBucketCompleted: (bucketId: string) => void;
  onOpenCustomCourseModal: (bucketId: string) => void;
  onRemoveBucket: (bucketId: string) => void;
  onToggleCourseCompleted: (bucketId: string, courseUid: string) => void;
  onOpenElectiveModal: (course: CurriculumCourse, bucketId: string) => void;
  onReturnCourseToDefault: (course: CurriculumCourse, fromId: string) => void;
  onToggleCourseTermFlexibility: (bucketId: string, courseUid: string) => void;
  onOpenMoveModal: (course: CurriculumCourse, fromBucketId: string) => void;
}

export const SemesterBucketCard = React.memo(function SemesterBucketCard({
  bucket,
  limitMetric,
  regularMaxLimit,
  summerMaxLimit,
  summerMaxCourses,
  summary,
  hasElectivePools,
  electivePrereqMap,
  draggedCourse,
  validateMove,
  onDropCourseToBucket,
  onCourseDragStart,
  onCourseDragEnd,
  onToggleBucketCompleted,
  onOpenCustomCourseModal,
  onRemoveBucket,
  onToggleCourseCompleted,
  onOpenElectiveModal,
  onReturnCourseToDefault,
  onToggleCourseTermFlexibility,
  onOpenMoveModal
}: SemesterBucketCardProps) {
  const isSummer = bucket.season === 'Yaz';
  const useEcts = !isSummer && limitMetric === 'ects';
  const totalEcts = bucket.courses.reduce((s, c) => s + c.ects, 0);
  const totalCredits = bucket.courses.reduce((s, c) => s + c.credits, 0);
  const currentMetricVal = useEcts ? totalEcts : totalCredits;
  const maxLimit = bucket.customLimit ?? (isSummer ? summerMaxLimit : regularMaxLimit);
  const bucketUnit = useEcts ? 'AKTS' : 'Kredi';
  const fillPct = Math.min(100, Math.round((currentMetricVal / Math.max(1, maxLimit)) * 100));
  const isOverLimit = currentMetricVal > maxLimit;

  let dragStatus: 'neutral' | 'valid' | 'invalid-season' | 'invalid-limit' | 'invalid-prereq' =
    'neutral';
  let dragHint = '';
  if (draggedCourse && draggedCourse.fromBucketId !== bucket.id) {
    const v = validateMove(draggedCourse.course, bucket);
    if (v.allowed) {
      dragStatus = 'valid';
      dragHint = 'Buraya bırakabilirsiniz ✓';
    } else if (v.warningType === 'prereq') {
      dragStatus = 'invalid-prereq';
      dragHint = v.shortHint || '⛔ Ön koşul sağlanmıyor';
    } else if (v.warningType === 'season') {
      dragStatus = 'invalid-season';
      dragHint = `${draggedCourse.course.termType} dersi ${bucket.season} dönemine konulamaz`;
    } else {
      dragStatus = 'invalid-limit';
      dragHint = 'Kredi / Ders sınırı aşılıyor';
    }
  }

  const allCompleted = bucket.courses.length > 0 && bucket.courses.every((c) => c.completed);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropCourseToBucket(bucket.id);
      }}
      className={`relative rounded-2xl border transition-colors flex flex-col ${
        dragStatus === 'valid'
          ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20'
          : dragStatus === 'invalid-prereq'
          ? 'border-rose-400 bg-rose-50/40 opacity-75'
          : dragStatus === 'invalid-season'
          ? 'border-rose-300 bg-rose-50/30 opacity-65'
          : dragStatus === 'invalid-limit'
          ? 'border-amber-400 bg-amber-50/30'
          : isSummer
          ? 'bg-gradient-to-b from-amber-50/70 to-white border-amber-200 shadow-xs'
          : 'bg-white border-slate-200 shadow-xs'
      }`}
    >
      {dragStatus !== 'neutral' && (
        <div
          className={`pointer-events-none absolute -top-2.5 right-3 z-10 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs border ${
            dragStatus === 'valid'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {dragHint}
        </div>
      )}

      {/* Bucket Header */}
      <div
        className={`p-3.5 border-b rounded-t-2xl ${
          isSummer
            ? 'bg-amber-100/60 border-amber-200'
            : bucket.season === 'Güz'
            ? 'bg-slate-50 border-slate-200/80'
            : 'bg-emerald-50/40 border-slate-200/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isSummer ? (
              <Sun className="w-4 h-4 text-amber-600 shrink-0" />
            ) : bucket.season === 'Güz' ? (
              <Snowflake className="w-4 h-4 text-sky-600 shrink-0" />
            ) : (
              <Flower2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <h3 className="text-sm font-extrabold text-slate-900">{bucket.title}</h3>
          </div>

          <div className="flex items-center gap-1.5">
            {bucket.courses.length > 0 && (
              <button
                onClick={() => onToggleBucketCompleted(bucket.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                  allCompleted
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-emerald-500'
                }`}
                title="Bu dönemdeki tüm dersleri tamamlandı (geçildi) olarak işaretle"
              >
                {allCompleted ? '✓ Tamamlandı' : 'Dönemi Tamamla'}
              </button>
            )}

            <button
              onClick={() => onOpenCustomCourseModal(bucket.id)}
              className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-[#0c3f79] hover:border-slate-300 cursor-pointer"
              title="Bu döneme özel ders ekle"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            {isSummer && (
              <button
                onClick={() => onRemoveBucket(bucket.id)}
                className="p-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                title="Yaz Okulunu Kaldır"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Credit / ECTS Progress Bar */}
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-600">
              {isSummer
                ? `${bucket.courses.filter((c) => !isStajOrZeroCreditCourse(c)).length}/${summerMaxCourses}`
                : bucket.courses.length}{' '}
              Ders · <strong>{totalEcts} AKTS</strong> · <strong>{totalCredits} Kredi</strong>
            </span>
            <span
              className={`font-mono font-bold ${isOverLimit ? 'text-rose-600' : 'text-slate-700'}`}
            >
              {currentMetricVal} / {maxLimit} {bucketUnit}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                isOverLimit
                  ? 'bg-rose-600'
                  : fillPct >= 88
                  ? 'bg-amber-500'
                  : isSummer
                  ? 'bg-amber-500'
                  : 'bg-[#0c3f79]'
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Courses List inside Bucket */}
      <div className="p-3 space-y-2 flex-1">
        {bucket.courses.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-4 text-slate-400">
            <BookOpen className="w-5 h-5 mb-1 opacity-60" />
            <span className="text-xs font-semibold">
              {bucket.semesterNumber &&
              bucket.semesterNumber > summary.maxSem &&
              summary.isEarlyGraduation
                ? `🎉 ${bucket.semesterNumber}. Yarıyıl tamamen boşaltıldı! (${summary.gradYears} Yılda Mezuniyet)`
                : 'Bu dönemde ders bulunmuyor.'}
            </span>
            <span className="text-[11px] mt-0.5">
              Buraya ders sürükleyebilir veya &ldquo;Taşı&rdquo; menüsüyle ekleyebilirsiniz.
            </span>
          </div>
        ) : (
          bucket.courses.map((course) => {
            const isMovedFromDefault =
              bucket.season === 'Yaz' ||
              (bucket.semesterNumber && bucket.semesterNumber !== course.defaultSemester);
            const coursePrereqText = resolveEffectivePrereqText(course, electivePrereqMap);
            const coursePrereqCodes = extractPrereqCodes(coursePrereqText);

            return (
              <div
                key={course.uid}
                draggable
                onDragStart={(e) => onCourseDragStart(e, course, bucket.id)}
                onDragEnd={onCourseDragEnd}
                className={`group rounded-xl p-2.5 border transition-colors cursor-grab active:cursor-grabbing select-none flex items-start justify-between gap-2 ${
                  course.completed
                    ? 'bg-emerald-50/50 border-emerald-200 opacity-75'
                    : isMovedFromDefault
                    ? 'bg-amber-50/40 border-amber-300/80 hover:border-amber-400 shadow-2xs'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-2 min-w-0 flex-1">
                  {/* Completed Checkbox */}
                  <button
                    onClick={() => onToggleCourseCompleted(bucket.id, course.uid)}
                    className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 cursor-pointer transition-colors ${
                      course.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-slate-300 hover:border-emerald-500'
                    }`}
                    title="Dersi verdim / tamamladım olarak işaretle"
                  >
                    {course.completed && <CheckCircle2 className="w-3 h-3" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-extrabold text-slate-900">
                        {course.selectedElectiveCode || course.code}
                      </span>

                      {/* Season Badge */}
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          course.termType === 'Güz'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : course.termType === 'Bahar'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}
                      >
                        {course.termType === 'Her İkisi' ? 'Güz/Bahar' : course.termType}
                      </span>

                      {/* Official Bologna Prerequisite Badge */}
                      {coursePrereqCodes.length > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold"
                          title={`Bologna Ön Koşulu: ${coursePrereqText}`}
                        >
                          Önk. {coursePrereqCodes.join(', ')}
                        </span>
                      )}

                      {/* Original Semester Tag if moved */}
                      {isMovedFromDefault && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold">
                          Normali: {course.defaultSemester}. Yarıyıl
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs font-semibold mt-0.5 leading-snug ${
                        course.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {course.selectedElectiveName
                        ? `${course.selectedElectiveName} (${course.name})`
                        : course.name}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500 font-medium">
                      <span className="font-mono font-bold text-slate-700">{course.ects} AKTS</span>
                      <span>·</span>
                      <span className="font-mono">{course.credits} Kredi</span>

                      {/* Elective Picker Trigger */}
                      {course.isElective && hasElectivePools && (
                        <button
                          onClick={() => onOpenElectiveModal(course, bucket.id)}
                          className="text-[10px] font-bold text-[#0c3f79] hover:underline flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 cursor-pointer"
                        >
                          <Search className="w-2.5 h-2.5" />
                          <span>
                            {course.selectedElectiveCode
                              ? 'Seçmeliyi Değiştir'
                              : 'Havuzdan Ders Seç'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Course Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  {isMovedFromDefault && !course.uid.startsWith('custom-') && (
                    <button
                      onClick={() => onReturnCourseToDefault(course, bucket.id)}
                      className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-500 text-amber-900 hover:text-white transition-colors cursor-pointer"
                      title={`Orijinal dönemine (${course.defaultSemester}. Yarıyıl) geri gönder`}
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onToggleCourseTermFlexibility(bucket.id, course.uid)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title={
                      course.termType === 'Her İkisi'
                        ? 'Bu ders şu an hem Güz hem Bahar dönemine konulabilir (Kilitlemek için tıklayın)'
                        : `Bu ders şu an sadece ${course.termType} dönemine kilitli (Her iki döneme açmak için tıklayın)`
                    }
                  >
                    {course.termType === 'Her İkisi' ? (
                      <Unlock className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => onOpenMoveModal(course, bucket.id)}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-[#0c3f79] text-slate-700 hover:text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="Başka bir yarıyıla veya Yaz Okulu'na taşı"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>Taşı</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});
