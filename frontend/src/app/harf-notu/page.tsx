"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Award, RotateCcw, ShieldCheck, Info } from 'lucide-react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import { CourseGradeProfile, EvaluationResult } from '../../types/harfNotu';
import {
  AGNO_CURRENT_COURSES_KEY,
  API_BASE,
  HARF_NOTU_ACTIVE_ID_KEY,
  HARF_NOTU_STORAGE_KEY,
  PENDING_HARF_NOTU_KEY,
  VISUALIZER_DATA_KEY,
  createDefaultCourseProfile,
  evaluateCourseGrade,
  generateId,
  lookupCourseInfo,
  normalizeCourseCode
} from '../../utils/harfNotuUtils';
import CourseTabsBar from '../../components/harfNotu/CourseTabsBar';
import AssessmentBuilder from '../../components/harfNotu/AssessmentBuilder';
import GradingSettingsPanel from '../../components/harfNotu/GradingSettingsPanel';
import ScenarioSimulatorPanel from '../../components/harfNotu/ScenarioSimulatorPanel';
import StickyResultBar from '../../components/harfNotu/StickyResultBar';
import PrivacyModal from '../../components/PrivacyModal';

const INITIAL_DEFAULT_COURSE: CourseGradeProfile = createDefaultCourseProfile({
  id: 'default_course_1',
  name: 'Örnek Ders 1'
});

interface AgnoStoredCourse {
  id?: string;
  code?: string;
  name?: string;
  credits?: number | string;
  expectedGrade?: string;
}

interface VisualizerStoredCourse {
  code?: string;
  name?: string;
  credits?: number | string;
}

interface VisualizerStoredData {
  courses_summary?: VisualizerStoredCourse[];
  schedule?: Record<string, VisualizerStoredCourse[]>;
}

function isUntouchedDefaultCourse(course: CourseGradeProfile): boolean {
  return (
    course.id === 'default_course_1' &&
    course.code.trim() === '' &&
    course.name === 'Örnek Ders 1' &&
    course.items.every((i) => i.score === null && i.classAvg === null)
  );
}

export default function HarfNotuPage() {
  const [courses, setCourses, isCoursesMounted] = useLocalStorageState<CourseGradeProfile[]>(
    HARF_NOTU_STORAGE_KEY,
    [INITIAL_DEFAULT_COURSE]
  );
  const [activeCourseId, setActiveCourseId, isActiveIdMounted] = useLocalStorageState<string>(
    HARF_NOTU_ACTIVE_ID_KEY,
    'default_course_1'
  );
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [exportedSignature, setExportedSignature] = useState<string | null>(null);

  // Ziyaret sayacı
  useEffect(() => {
    const isDev =
      typeof window !== 'undefined' && localStorage.getItem('ytu_ignore_stats') === 'true';
    if (!isDev) {
      fetch(`${API_BASE}/api/stats/harf-notu-visit`, { method: 'POST' }).catch(() => {});
    }
  }, []);

  // AGNO sayfasından tek tıkla gönderilen dersi yakala
  useEffect(() => {
    if (!isCoursesMounted || !isActiveIdMounted) return;
    try {
      const pendingRaw = localStorage.getItem(PENDING_HARF_NOTU_KEY);
      if (!pendingRaw) return;
      localStorage.removeItem(PENDING_HARF_NOTU_KEY);

      const pending = JSON.parse(pendingRaw) as {
        code?: string;
        name?: string;
        credits?: number | string;
      };
      if (!pending) return;

      const pCode = normalizeCourseCode(pending.code);
      const pName = (pending.name || '').trim();
      const pNameLower = pName.toLowerCase();

      const safePrev = courses.length > 0 ? courses : [INITIAL_DEFAULT_COURSE];
      const existing = safePrev.find((c) => {
        const cCode = normalizeCourseCode(c.code);
        const cName = c.name.trim().toLowerCase();
        return (pCode && cCode === pCode) || (pNameLower && cName === pNameLower);
      });

      if (existing) {
        setCourses(
          safePrev.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  code: c.code || pCode,
                  name: c.name && c.name !== 'Örnek Ders 1' ? c.name : pName || c.name,
                  credits: c.credits || pending.credits || ''
                }
              : c
          )
        );
        setActiveCourseId(existing.id);
        return;
      }

      const newCourse = createDefaultCourseProfile({
        code: pCode,
        name: pName || pCode || 'Yeni Ders',
        credits: pending.credits ?? ''
      });

      const nextCourses =
        safePrev.length === 1 && isUntouchedDefaultCourse(safePrev[0])
          ? [newCourse]
          : [...safePrev, newCourse];

      setCourses(nextCourses);
      setActiveCourseId(newCourse.id);
    } catch {
      // Hatalı payload yoksay
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCoursesMounted, isActiveIdMounted]);

  const safeCourses = useMemo(
    () => (courses.length > 0 ? courses : [INITIAL_DEFAULT_COURSE]),
    [courses]
  );

  const activeCourse = useMemo(
    () => safeCourses.find((c) => c.id === activeCourseId) ?? safeCourses[0],
    [safeCourses, activeCourseId]
  );

  const evaluationsByCourseId = useMemo(() => {
    const map: Record<string, EvaluationResult> = {};
    for (const c of safeCourses) {
      map[c.id] = evaluateCourseGrade(c);
    }
    return map;
  }, [safeCourses]);

  const activeEvaluation = evaluationsByCourseId[activeCourse.id];
  const currentExportSignature = `${activeCourse.id}:${activeEvaluation.primaryGrade}:${activeCourse.code}:${activeCourse.name}:${activeCourse.credits}`;
  const exportedToAgno = exportedSignature === currentExportSignature;

  const handleUpdateCourse = useCallback(
    (courseId: string, patch: Partial<CourseGradeProfile>) => {
      setCourses((prev) => {
        const list = prev.length > 0 ? prev : [INITIAL_DEFAULT_COURSE];
        return list.map((c) => (c.id === courseId ? { ...c, ...patch } : c));
      });
    },
    [setCourses]
  );

  const handleAddCourse = () => {
    const nextIdx = safeCourses.length + 1;
    const newCourse = createDefaultCourseProfile({
      name: `Ders ${nextIdx}`
    });
    setCourses([...safeCourses, newCourse]);
    setActiveCourseId(newCourse.id);
  };

  const handleDeleteCourse = (id: string) => {
    if (safeCourses.length <= 1) return;
    const target = safeCourses.find((c) => c.id === id);
    const label = target?.code || target?.name || 'Bu dersi';
    if (!window.confirm(`${label} silmek istediğinize emin misiniz?`)) return;

    const remaining = safeCourses.filter((c) => c.id !== id);
    setCourses(remaining);
    if (activeCourseId === id && remaining[0]) {
      setActiveCourseId(remaining[0].id);
    }
  };

  const handleResetActiveCourse = () => {
    if (
      !window.confirm(
        'Aktif dersin tüm kalemleri ve notları varsayılan 2 Vize + Final (%30/%30/%40) yapısına sıfırlansın mı?'
      )
    ) {
      return;
    }
    const fresh = createDefaultCourseProfile({
      id: activeCourse.id,
      code: activeCourse.code,
      name: activeCourse.name,
      credits: activeCourse.credits
    });
    handleUpdateCourse(activeCourse.id, fresh);
  };

  const mergeImportedCourses = useCallback(
    (
      incoming: { code: string; name: string; credits?: number | string }[],
      sourceLabel: string
    ): { importedCount: number; message: string } => {
      if (incoming.length === 0) {
        return {
          importedCount: 0,
          message: `${sourceLabel} içinde aktarılacak ders bulunamadı.`
        };
      }

      const current = safeCourses;
      const existingCodes = new Set(
        current.map((c) => normalizeCourseCode(c.code)).filter(Boolean)
      );
      const existingNames = new Set(
        current.map((c) => c.name.trim().toLowerCase()).filter(Boolean)
      );

      const toAdd: CourseGradeProfile[] = [];
      for (const item of incoming) {
        const normCode = normalizeCourseCode(item.code);
        const normName = item.name.trim().toLowerCase();
        if (
          (normCode && existingCodes.has(normCode)) ||
          (normName && existingNames.has(normName))
        ) {
          continue;
        }
        if (normCode) existingCodes.add(normCode);
        if (normName) existingNames.add(normName);

        toAdd.push(
          createDefaultCourseProfile({
            code: normCode,
            name: item.name.trim() || normCode || 'İçe Aktarılan Ders',
            credits: item.credits ?? ''
          })
        );
      }

      if (toAdd.length === 0) {
        return {
          importedCount: 0,
          message: `${sourceLabel} derslerinin tümü zaten listenizde mevcut.`
        };
      }

      const nextCourses =
        current.length === 1 && isUntouchedDefaultCourse(current[0])
          ? toAdd
          : [...current, ...toAdd];

      setCourses(nextCourses);
      setActiveCourseId(toAdd[0].id);

      // Eksik kredileri arka planda SQLite'tan tamamla
      toAdd.forEach((course) => {
        if (!course.credits && (course.code || course.name)) {
          lookupCourseInfo(course.code, course.name).then((found) => {
            if (found && found.credits) {
              setCourses((prev) =>
                prev.map((c) =>
                  c.id === course.id
                    ? {
                        ...c,
                        code: c.code || found.code,
                        name: c.name || found.name,
                        credits: found.credits
                      }
                    : c
                )
              );
            }
          });
        }
      });

      return {
        importedCount: toAdd.length,
        message: `${sourceLabel} kaynağından ${toAdd.length} ders eklendi.`
      };
    },
    [safeCourses, setCourses, setActiveCourseId]
  );

  const handleImportFromAgno = useCallback(() => {
    try {
      const raw = localStorage.getItem(AGNO_CURRENT_COURSES_KEY);
      if (!raw) {
        return {
          importedCount: 0,
          message: 'AGNO sayfasında kayıtlı dönem dersi bulunamadı.'
        };
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return {
          importedCount: 0,
          message: 'AGNO ders listesi okunamadı.'
        };
      }
      const cleaned = (parsed as AgnoStoredCourse[])
        .filter((c) => Boolean((c.code && c.code.trim()) || (c.name && c.name.trim())))
        .map((c) => ({
          code: c.code || '',
          name: c.name || c.code || '',
          credits: c.credits ?? ''
        }));
      return mergeImportedCourses(cleaned, 'AGNO Senaryo Dönemi');
    } catch {
      return {
        importedCount: 0,
        message: 'AGNO verisi okunurken hata oluştu.'
      };
    }
  }, [mergeImportedCourses]);

  const handleImportFromSchedule = useCallback(() => {
    try {
      const raw = localStorage.getItem(VISUALIZER_DATA_KEY);
      if (!raw) {
        return {
          importedCount: 0,
          message: 'Henüz Ana Sayfada yüklenmiş bir ders programı yok.'
        };
      }
      const data = JSON.parse(raw) as VisualizerStoredData;
      const uniqueMap = new Map<string, { code: string; name: string; credits?: number | string }>();

      if (Array.isArray(data?.courses_summary) && data.courses_summary.length > 0) {
        for (const c of data.courses_summary) {
          const key = normalizeCourseCode(c.code) || (c.name || '').trim();
          if (key && !uniqueMap.has(key)) {
            uniqueMap.set(key, {
              code: c.code || '',
              name: c.name || c.code || '',
              credits: c.credits ?? ''
            });
          }
        }
      } else if (data?.schedule && typeof data.schedule === 'object') {
        Object.values(data.schedule).forEach((dayList) => {
          if (Array.isArray(dayList)) {
            dayList.forEach((c) => {
              const key = normalizeCourseCode(c.code) || (c.name || '').trim();
              if (key && !uniqueMap.has(key)) {
                uniqueMap.set(key, {
                  code: c.code || '',
                  name: c.name || c.code || '',
                  credits: ''
                });
              }
            });
          }
        });
      }

      return mergeImportedCourses(Array.from(uniqueMap.values()), 'Ders Programı');
    } catch {
      return {
        importedCount: 0,
        message: 'Ders programı verisi okunurken hata oluştu.'
      };
    }
  }, [mergeImportedCourses]);

  const handleExportToAgno = useCallback(() => {
    if (!activeEvaluation.hasAnyScore) return;
    try {
      const raw = localStorage.getItem(AGNO_CURRENT_COURSES_KEY);
      const existing: unknown = raw ? JSON.parse(raw) : [];
      const list: AgnoStoredCourse[] = Array.isArray(existing) ? [...(existing as AgnoStoredCourse[])] : [];

      const activeCode = normalizeCourseCode(activeCourse.code);
      const activeName = activeCourse.name.trim().toLowerCase();

      const matchIndex = list.findIndex((c) => {
        const cCode = normalizeCourseCode(c.code);
        const cName = (c.name || '').trim().toLowerCase();
        return (activeCode && cCode === activeCode) || (activeName && cName === activeName);
      });

      if (matchIndex >= 0) {
        list[matchIndex] = {
          ...list[matchIndex],
          code: list[matchIndex].code || activeCode,
          name: list[matchIndex].name || activeCourse.name,
          credits: list[matchIndex].credits || activeCourse.credits || '',
          expectedGrade: activeEvaluation.primaryGrade
        };
      } else {
        list.push({
          id: generateId('agno'),
          code: activeCode,
          name: activeCourse.name.trim() || activeCode || 'Ders',
          credits: activeCourse.credits || '',
          expectedGrade: activeEvaluation.primaryGrade
        });
      }

      localStorage.setItem(AGNO_CURRENT_COURSES_KEY, JSON.stringify(list));
      setExportedSignature(currentExportSignature);
    } catch (err) {
      console.error('AGNO export error:', err);
    }
  }, [activeCourse, activeEvaluation, currentExportSignature]);

  if (!isCoursesMounted || !isActiveIdMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-3 border-[#0c3f79] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 pb-32 space-y-5">
        {/* Üst Başlık */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0c3f79] text-[#e7a240] flex items-center justify-center shadow-xs shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Ders Harf Notu &amp; Çan Simülatörü
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Vize, final, proje, lab ve ödev ağırlıklarını özelleştirin; notlarınıza ve sınıf ortalamasına göre tahmini harf notunuzu görün.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetActiveCourse}
            className="self-start sm:self-auto px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Dersi Sıfırla</span>
          </button>
        </div>

        {/* Ders Sekmeleri ve Meta Bilgiler */}
        <CourseTabsBar
          courses={safeCourses}
          activeCourse={activeCourse}
          evaluationsByCourseId={evaluationsByCourseId}
          onSelectCourse={setActiveCourseId}
          onAddCourse={handleAddCourse}
          onDeleteCourse={handleDeleteCourse}
          onUpdateCourseMeta={(id, updates) => handleUpdateCourse(id, updates)}
          onImportFromSchedule={handleImportFromSchedule}
          onImportFromAgno={handleImportFromAgno}
        />

        {/* Ana 2 Sütunlu Çalışma Alanı */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Sol: Kalem Yapılandırma + Sistem Ayarları */}
          <div className="lg:col-span-7 space-y-5">
            <AssessmentBuilder
              items={activeCourse.items}
              onChangeItems={(nextItems) =>
                handleUpdateCourse(activeCourse.id, { items: nextItems })
              }
            />

            <GradingSettingsPanel
              course={activeCourse}
              evaluation={activeEvaluation}
              onUpdateCourse={(patch) => handleUpdateCourse(activeCourse.id, patch)}
            />
          </div>

          {/* Sağ: Çan Konumu, Hedef Puan Çözücü & Senaryolar */}
          <div className="lg:col-span-5">
            <ScenarioSimulatorPanel
              course={activeCourse}
              evaluation={activeEvaluation}
              onUpdateCourse={(patch) => handleUpdateCourse(activeCourse.id, patch)}
            />
          </div>
        </div>

        {/* Bilgilendirme Notu & Footer */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-600">
          <Info className="w-4 h-4 text-[#0c3f79] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Not:</strong> YTÜ Bağıl Değerlendirme (Çan) hesaplamaları resmi T-skoru formülü (
            <span className="font-mono">T = 50 + 10·(HBN − Ort)/σ</span>) ve sınıf düzeyi eşikleri esas alınarak simüle edilir. Dersi veren öğretim üyesinin alt sınır (ör. 15/30 ham not altı öğrencileri çan dışı bırakma) veya katalog takdirine göre nihai OBS notunda ufak farklar oluşabilir.
          </p>
        </div>

        <div className="text-center text-xs text-slate-400 pt-2 pb-4">
          <p className="font-medium">YTÜ Dostun — Ders Harf Notu &amp; Çan Simülatörü</p>
          <p className="text-[11px] mt-1 flex items-center justify-center gap-2">
            <a
              href="https://github.com/atillacirak"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 hover:underline transition-colors"
            >
              github.com/atillacirak
            </a>
            <span>·</span>
            <button
              type="button"
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-emerald-700 text-slate-500 font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Gizlilik &amp; Veri Güvenliği</span>
            </button>
          </p>
        </div>
      </div>

      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />

      <StickyResultBar
        evaluation={activeEvaluation}
        onExportToAgno={handleExportToAgno}
        exportedToAgno={exportedToAgno}
      />
    </div>
  );
}
