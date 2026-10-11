"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sun,
  Snowflake,
  Flower2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  X,
  FolderOpen,
  ShieldCheck
} from 'lucide-react';
import {
  CanonicalSemesterGroup,
  CurriculumCourse,
  ElectiveOption,
  FacultyItem,
  MoveValidationResult,
  NewCourseFormState,
  PlanSummary,
  ScenarioMeta,
  SemesterBucket,
  YearGroup
} from '@/types/planlama';
import {
  API_BASE,
  buildCompactPlanPayload,
  buildDefaultBuckets,
  buildElectivePrereqMap,
  getRelevantPoolsForSlot,
  hydrateSavedPlan,
  normCourseCode,
  validateCourseMove,
  validatePoolMove
} from '@/utils/planlamaUtils';
import { exportAcademicPlanPdf } from '@/utils/planlamaPdfExport';
import { PlanlamaHero } from '@/components/planlama/PlanlamaHero';
import { PlanlamaToolbar } from '@/components/planlama/PlanlamaToolbar';
import { SemesterBucketCard } from '@/components/planlama/SemesterBucketCard';
import {
  CustomCourseModal,
  ElectivePickerModal,
  ExemptionPoolModal,
  MoveCourseModal
} from '@/components/planlama/PlanlamaModals';

export default function AcademicPlanningPage() {
  const [faculties, setFaculties] = useState<FacultyItem[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [programName, setProgramName] = useState<string>('');
  const [electivePools, setElectivePools] = useState<Record<string, ElectiveOption[]>>({});
  const [loadingPrograms, setLoadingPrograms] = useState<boolean>(true);
  const [loadingCurriculum, setLoadingCurriculum] = useState<boolean>(false);
  const [isUploadingTranscript, setIsUploadingTranscript] = useState<boolean>(false);
  const transcriptInputRef = useRef<HTMLInputElement>(null);

  // Base curriculum data for instant reset & compact storage hydration
  const [baseSemesters, setBaseSemesters] = useState<Record<string, any[]>>({});

  // Buckets, Unassigned Pool & Exemption Pool
  const [buckets, setBuckets] = useState<SemesterBucket[]>([]);
  const [unassignedCourses, setUnassignedCourses] = useState<CurriculumCourse[]>([]);
  const [exemptCourses, setExemptCourses] = useState<CurriculumCourse[]>([]);

  // Multi-Scenario State (Senaryo 1, Senaryo 2, ...)
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([{ id: 's1', name: 'Senaryo 1' }]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('s1');

  // Settings
  const [limitMetric, setLimitMetric] = useState<'ects' | 'credits'>('credits');
  const [regularMaxLimit, setRegularMaxLimit] = useState<number>(25);
  const [isHighGpa, setIsHighGpa] = useState<boolean>(false);
  const [summerMaxLimit, setSummerMaxLimit] = useState<number>(9);
  const [summerMaxCourses, setSummerMaxCourses] = useState<number>(3);
  const [enforceSeasonRule, setEnforceSeasonRule] = useState<boolean>(true);
  const [enforceCreditLimit, setEnforceCreditLimit] = useState<boolean>(true);
  const [enforcePrereqRule, setEnforcePrereqRule] = useState<boolean>(true);

  // Drag & Drop + Interactive UI State
  const [draggedCourse, setDraggedCourse] = useState<{
    course: CurriculumCourse;
    fromBucketId: string;
  } | null>(null);
  const draggedCourseRef = useRef<{ course: CurriculumCourse; fromBucketId: string } | null>(null);

  const [movingCourseModal, setMovingCourseModal] = useState<{
    course: CurriculumCourse;
    fromBucketId: string;
  } | null>(null);
  const [electiveModal, setElectiveModal] = useState<{
    course: CurriculumCourse;
    bucketId: string;
  } | null>(null);
  const [isExemptionModalOpen, setIsExemptionModalOpen] = useState<boolean>(false);
  const [customCourseModalBucketId, setCustomCourseModalBucketId] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'error' | 'success' | 'info';
  } | null>(null);

  const showToast = useCallback(
    (text: string, type: 'error' | 'success' | 'info' = 'info') => {
      setToastMessage({ text, type });
    },
    []
  );

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 4200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Visit Stat Tracking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('dev')) {
        localStorage.setItem('ytu_ignore_stats', 'true');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      const isDev =
        localStorage.getItem('ytu_ignore_stats') === 'true' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      if (!isDev) {
        fetch(`${API_BASE}/api/stats/planlama-visit`, { method: 'POST' }).catch(() => {});
      }
    }
  }, []);

  const loadProgramCurriculum = useCallback(
    async (progId: string, facName?: string, forceReset = false) => {
      if (!progId) return;
      setLoadingCurriculum(true);
      try {
        const res = await fetch(`${API_BASE}/api/curricula/program/${progId}`);
        if (!res.ok) throw new Error('Müfredat alınamadı');
        const data = await res.json();
        if (data.status === 'success' && data.program) {
          const prog = data.program;
          const rawSems = prog.semesters || {};
          setProgramName(prog.name);
          setElectivePools(prog.electivePools || {});
          setBaseSemesters(rawSems);
          if (facName) setSelectedFaculty(facName);
          setSelectedProgramId(progId);

          let loadedScenarios: ScenarioMeta[] = [{ id: 's1', name: 'Senaryo 1' }];
          let targetScId = 's1';
          try {
            const scRaw = localStorage.getItem(`ytu_scenarios_v2_${progId}`);
            if (scRaw) {
              const scParsed = JSON.parse(scRaw);
              if (Array.isArray(scParsed.list) && scParsed.list.length > 0) {
                loadedScenarios = scParsed.list;
                targetScId =
                  scParsed.active && loadedScenarios.some((s) => s.id === scParsed.active)
                    ? scParsed.active
                    : loadedScenarios[0].id;
              }
            }
          } catch {}

          setScenarios(loadedScenarios);
          setActiveScenarioId(targetScId);

          if (forceReset) {
            try {
              localStorage.removeItem(`ytu_plan_v2_${progId}_${targetScId}`);
              if (targetScId === 's1') localStorage.removeItem(`ytu_plan_v2_${progId}`);
            } catch {}
            setBuckets(buildDefaultBuckets(rawSems));
            setUnassignedCourses([]);
            setExemptCourses([]);
          } else {
            const hydrated = hydrateSavedPlan(rawSems, progId, targetScId);
            setBuckets(hydrated.buckets);
            setUnassignedCourses(hydrated.unassigned);
            setExemptCourses(hydrated.exempt);
          }
        }
      } catch {
        showToast('Bölüm müfredatları yüklenemedi.', 'error');
      } finally {
        setLoadingCurriculum(false);
      }
    },
    [showToast]
  );

  // Load saved preferences from localStorage/cookie + Fetch Faculties
  useEffect(() => {
    let savedProgramId = '';
    let savedFaculty = '';

    try {
      const legacyRaw = localStorage.getItem('ytu_academic_plan_v1');
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy.selectedFaculty) savedFaculty = legacy.selectedFaculty;
        if (legacy.selectedProgramId) savedProgramId = legacy.selectedProgramId;
        localStorage.removeItem('ytu_academic_plan_v1');
      }

      const prefsRaw = localStorage.getItem('ytu_plan_prefs_v2');
      if (prefsRaw) {
        const prefs = JSON.parse(prefsRaw);
        if (prefs.f) savedFaculty = prefs.f;
        if (prefs.p) savedProgramId = prefs.p;
        if (typeof prefs.hg === 'boolean') {
          setIsHighGpa(prefs.hg);
        }
        if (prefs.hg === undefined && (prefs.rl === 42 || prefs.rl === 24)) {
          setLimitMetric('credits');
          setRegularMaxLimit(25);
          setIsHighGpa(false);
        } else {
          if (prefs.m === 'ects' || prefs.m === 'credits') setLimitMetric(prefs.m);
          if (typeof prefs.rl === 'number') setRegularMaxLimit(prefs.rl);
        }
        if (typeof prefs.sl === 'number') setSummerMaxLimit(prefs.sl);
        if (typeof prefs.sc === 'number') setSummerMaxCourses(prefs.sc);
        if (typeof prefs.sr === 'boolean') setEnforceSeasonRule(prefs.sr);
        if (typeof prefs.cl === 'boolean') setEnforceCreditLimit(prefs.cl);
        if (typeof prefs.pr === 'boolean') setEnforcePrereqRule(prefs.pr);
      }
    } catch {}

    fetch(`${API_BASE}/api/curricula/programs`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && Array.isArray(data.faculties)) {
          setFaculties(data.faculties);
          if (savedFaculty && savedProgramId) {
            setSelectedFaculty(savedFaculty);
            setSelectedProgramId(savedProgramId);
            loadProgramCurriculum(savedProgramId, savedFaculty);
          } else if (data.faculties.length > 0) {
            const eef =
              data.faculties.find((f: FacultyItem) => f.faculty.includes('Elektrik')) ||
              data.faculties[0];
            setSelectedFaculty(eef.faculty);
            const blm =
              eef.programs.find((p: { id: string; name: string }) =>
                p.name.includes('Bilgisayar')
              ) || eef.programs[0];
            if (blm) {
              setSelectedProgramId(blm.id);
              loadProgramCurriculum(blm.id, eef.faculty);
            }
          }
        }
      })
      .catch(() => {
        showToast('Fakülte listesi yüklenirken bağlantı hatası oluştu.', 'error');
      })
      .finally(() => {
        setLoadingPrograms(false);
      });
  }, [loadProgramCurriculum, showToast]);

  // Debounced, compact save to localStorage + lightweight cookie
  useEffect(() => {
    if (!selectedProgramId || buckets.length === 0 || loadingCurriculum) return;

    const timer = setTimeout(() => {
      try {
        const prefsPayload = {
          f: selectedFaculty,
          p: selectedProgramId,
          m: limitMetric,
          rl: regularMaxLimit,
          hg: isHighGpa,
          sl: summerMaxLimit,
          sc: summerMaxCourses,
          sr: enforceSeasonRule,
          cl: enforceCreditLimit,
          pr: enforcePrereqRule
        };
        const prefsStr = JSON.stringify(prefsPayload);
        localStorage.setItem('ytu_plan_prefs_v2', prefsStr);
        document.cookie = `ytu_plan_prefs=${encodeURIComponent(
          prefsStr
        )}; path=/; max-age=31536000; SameSite=Lax`;

        localStorage.setItem(
          `ytu_scenarios_v2_${selectedProgramId}`,
          JSON.stringify({ list: scenarios, active: activeScenarioId })
        );

        const compactPlan = buildCompactPlanPayload(buckets, unassignedCourses, exemptCourses);
        const planJson = JSON.stringify(compactPlan);
        localStorage.setItem(`ytu_plan_v2_${selectedProgramId}_${activeScenarioId}`, planJson);
        if (activeScenarioId === 's1') {
          localStorage.setItem(`ytu_plan_v2_${selectedProgramId}`, planJson);
        }
      } catch {}
    }, 250);

    return () => clearTimeout(timer);
  }, [
    selectedFaculty,
    selectedProgramId,
    scenarios,
    activeScenarioId,
    limitMetric,
    regularMaxLimit,
    isHighGpa,
    summerMaxLimit,
    summerMaxCourses,
    enforceSeasonRule,
    enforceCreditLimit,
    enforcePrereqRule,
    buckets,
    unassignedCourses,
    exemptCourses,
    loadingCurriculum
  ]);

  const flushCurrentScenarioToStorage = useCallback(() => {
    if (!selectedProgramId || buckets.length === 0) return;
    try {
      const compactPlan = buildCompactPlanPayload(buckets, unassignedCourses, exemptCourses);
      const planJson = JSON.stringify(compactPlan);
      localStorage.setItem(`ytu_plan_v2_${selectedProgramId}_${activeScenarioId}`, planJson);
      if (activeScenarioId === 's1') {
        localStorage.setItem(`ytu_plan_v2_${selectedProgramId}`, planJson);
      }
    } catch {}
  }, [selectedProgramId, buckets, unassignedCourses, exemptCourses, activeScenarioId]);

  const handleSelectScenario = useCallback(
    (targetId: string) => {
      if (targetId === activeScenarioId) return;
      flushCurrentScenarioToStorage();
      setActiveScenarioId(targetId);

      if (Object.keys(baseSemesters).length > 0 && selectedProgramId) {
        const hydrated = hydrateSavedPlan(baseSemesters, selectedProgramId, targetId);
        setBuckets(hydrated.buckets);
        setUnassignedCourses(hydrated.unassigned);
        setExemptCourses(hydrated.exempt);
        const scName = scenarios.find((s) => s.id === targetId)?.name || 'Senaryo';
        showToast(`✨ "${scName}" yüklendi.`, 'info');
      }
    },
    [activeScenarioId, flushCurrentScenarioToStorage, baseSemesters, selectedProgramId, scenarios, showToast]
  );

  const handleCreateScenario = useCallback(
    (cloneCurrent = false) => {
      if (!selectedProgramId || Object.keys(baseSemesters).length === 0) return;
      flushCurrentScenarioToStorage();

      const nextNum = scenarios.length + 1;
      const newId = `s_${Date.now()}`;
      const newName = cloneCurrent ? `Senaryo ${nextNum} (Kopya)` : `Senaryo ${nextNum}`;
      const nextList = [...scenarios, { id: newId, name: newName }];

      if (cloneCurrent) {
        try {
          const currentPayload = buildCompactPlanPayload(buckets, unassignedCourses, exemptCourses);
          localStorage.setItem(
            `ytu_plan_v2_${selectedProgramId}_${newId}`,
            JSON.stringify(currentPayload)
          );
        } catch {}
      } else {
        const currentExemptUids = new Set(exemptCourses.map((c) => c.uid));
        const freshBuckets = buildDefaultBuckets(baseSemesters).map((b) => ({
          ...b,
          courses: b.courses.filter((c) => !currentExemptUids.has(c.uid))
        }));
        setBuckets(freshBuckets);
        setUnassignedCourses([]);
        try {
          const freshPayload = buildCompactPlanPayload(freshBuckets, [], exemptCourses);
          localStorage.setItem(
            `ytu_plan_v2_${selectedProgramId}_${newId}`,
            JSON.stringify(freshPayload)
          );
        } catch {}
      }

      setScenarios(nextList);
      setActiveScenarioId(newId);
      showToast(
        cloneCurrent
          ? `📋 Mevcut plan "${newName}" olarak kopyalandı.`
          : `✨ "${newName}" oluşturuldu (muafiyetleriniz korundu, dönemler standart düzende).`,
        'success'
      );
    },
    [
      selectedProgramId,
      baseSemesters,
      flushCurrentScenarioToStorage,
      scenarios,
      buckets,
      unassignedCourses,
      exemptCourses,
      showToast
    ]
  );

  const handleDeleteScenario = useCallback(
    (targetId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (scenarios.length <= 1) return;
      const targetName = scenarios.find((s) => s.id === targetId)?.name || 'Senaryo';
      const remaining = scenarios.filter((s) => s.id !== targetId);
      try {
        localStorage.removeItem(`ytu_plan_v2_${selectedProgramId}_${targetId}`);
      } catch {}
      setScenarios(remaining);
      if (targetId === activeScenarioId) {
        const fallback = remaining[0];
        setActiveScenarioId(fallback.id);
        if (Object.keys(baseSemesters).length > 0 && selectedProgramId) {
          const hydrated = hydrateSavedPlan(baseSemesters, selectedProgramId, fallback.id);
          setBuckets(hydrated.buckets);
          setUnassignedCourses(hydrated.unassigned);
          setExemptCourses(hydrated.exempt);
        }
      }
      showToast(`🗑️ "${targetName}" silindi.`, 'info');
    },
    [scenarios, selectedProgramId, activeScenarioId, baseSemesters, showToast]
  );

  const handleRenameScenario = useCallback((targetId: string, trimmedName: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === targetId ? { ...s, name: trimmedName } : s))
    );
  }, []);

  const handleFacultyChange = useCallback(
    (newFaculty: string) => {
      setSelectedFaculty(newFaculty);
      const facObj = faculties.find((f) => f.faculty === newFaculty);
      if (facObj && facObj.programs.length > 0) {
        loadProgramCurriculum(facObj.programs[0].id, newFaculty);
      }
    },
    [faculties, loadProgramCurriculum]
  );

  const handleProgramChange = useCallback(
    (newProgId: string) => {
      loadProgramCurriculum(newProgId, selectedFaculty);
    },
    [loadProgramCurriculum, selectedFaculty]
  );

  // Instant reset of the active scenario to normal 8-semester curriculum order (preserving exemptions)
  const handleResetPlan = useCallback(() => {
    if (!selectedProgramId) return;
    if (Object.keys(baseSemesters).length > 0) {
      const currentExemptUids = new Set(exemptCourses.map((c) => c.uid));
      const freshBuckets = buildDefaultBuckets(baseSemesters).map((b) => ({
        ...b,
        courses: b.courses.filter((c) => !currentExemptUids.has(c.uid))
      }));
      setBuckets(freshBuckets);
      setUnassignedCourses([]);
      try {
        const freshPayload = buildCompactPlanPayload(freshBuckets, [], exemptCourses);
        const planJson = JSON.stringify(freshPayload);
        localStorage.setItem(`ytu_plan_v2_${selectedProgramId}_${activeScenarioId}`, planJson);
        if (activeScenarioId === 's1') {
          localStorage.setItem(`ytu_plan_v2_${selectedProgramId}`, planJson);
        }
      } catch {}
      showToast(
        '🔄 Aktif senaryo sıfırlandı (muafiyetleriniz korundu, kalan dersler orijinal dönemlerine döndürüldü).',
        'info'
      );
    } else {
      loadProgramCurriculum(selectedProgramId, selectedFaculty, true);
      showToast('🔄 Aktif senaryo sıfırlandı.', 'info');
    }
  }, [
    selectedProgramId,
    baseSemesters,
    exemptCourses,
    activeScenarioId,
    showToast,
    loadProgramCurriculum,
    selectedFaculty
  ]);

  // Toggle course exemption (move to/from Muafiyet Havuzu)
  const toggleCourseExemption = useCallback(
    (course: CurriculumCourse, silent = false) => {
      const isCurrentlyExempt = exemptCourses.some((c) => c.uid === course.uid);

      if (isCurrentlyExempt) {
        setExemptCourses((prev) => prev.filter((c) => c.uid !== course.uid));
        const targetSemId = `sem-${course.defaultSemester || 1}`;
        setBuckets((prev) =>
          prev.map((b) =>
            b.id === targetSemId && !b.courses.some((x) => x.uid === course.uid)
              ? { ...b, courses: [...b.courses, course] }
              : b
          )
        );
        if (!silent) {
          showToast(
            `${course.code} muafiyetten çıkarıldı ve ${course.defaultSemester}. Yarıyıla geri eklendi.`,
            'info'
          );
        }
      } else {
        setBuckets((prev) =>
          prev.map((b) =>
            b.courses.some((c) => c.uid === course.uid)
              ? { ...b, courses: b.courses.filter((c) => c.uid !== course.uid) }
              : b
          )
        );
        setUnassignedCourses((prev) =>
          prev.some((c) => c.uid === course.uid) ? prev.filter((c) => c.uid !== course.uid) : prev
        );
        setExemptCourses((prev) => [...prev, course]);
        if (!silent) {
          showToast(
            `🛡️ ${course.code} - ${course.name} muafiyet havuzuna eklendi ve döneminden kaldırıldı.`,
            'success'
          );
        }
      }
    },
    [exemptCourses, showToast]
  );

  // Toggle an entire semester's courses in/out of Muafiyet Havuzu
  const toggleSemesterExemption = useCallback(
    (semNumber: number, semCourses: CurriculumCourse[]) => {
      if (semCourses.length === 0) return;
      const exemptSet = new Set(exemptCourses.map((c) => c.uid));
      const allAlreadyExempt = semCourses.every((c) => exemptSet.has(c.uid));
      const targetUids = new Set(semCourses.map((c) => c.uid));

      if (allAlreadyExempt) {
        setExemptCourses((prev) => prev.filter((c) => !targetUids.has(c.uid)));
        const targetSemId = `sem-${semNumber}`;
        setBuckets((prev) =>
          prev.map((b) => {
            if (b.id !== targetSemId) return b;
            const existingUids = new Set(b.courses.map((x) => x.uid));
            const toAdd = semCourses.filter((c) => !existingUids.has(c.uid));
            return toAdd.length > 0 ? { ...b, courses: [...b.courses, ...toAdd] } : b;
          })
        );
      } else {
        const toExempt = semCourses.filter((c) => !exemptSet.has(c.uid));
        setBuckets((prev) =>
          prev.map((b) =>
            b.courses.some((c) => targetUids.has(c.uid))
              ? { ...b, courses: b.courses.filter((c) => !targetUids.has(c.uid)) }
              : b
          )
        );
        setUnassignedCourses((prev) =>
          prev.some((c) => targetUids.has(c.uid))
            ? prev.filter((c) => !targetUids.has(c.uid))
            : prev
        );
        setExemptCourses((prev) => [...prev, ...toExempt]);
      }
    },
    [exemptCourses]
  );

  // Batch exempt helper by code prefix
  const handleBatchExemptByPrefixes = useCallback(
    (prefixes: string[], label: string) => {
      const allActive = [...buckets.flatMap((b) => b.courses), ...unassignedCourses];
      const toExempt = allActive.filter((c) =>
        prefixes.some((p) => c.code.toUpperCase().startsWith(p))
      );
      if (toExempt.length === 0) {
        showToast(`${label} kapsamındaki dersler zaten muaf havuzunda.`, 'info');
        return;
      }
      const uids = new Set(toExempt.map((c) => c.uid));
      setBuckets((prev) =>
        prev.map((b) =>
          b.courses.some((c) => uids.has(c.uid))
            ? { ...b, courses: b.courses.filter((c) => !uids.has(c.uid)) }
            : b
        )
      );
      setUnassignedCourses((prev) =>
        prev.some((c) => uids.has(c.uid)) ? prev.filter((c) => !uids.has(c.uid)) : prev
      );
      setExemptCourses((prev) => [...prev, ...toExempt]);
      showToast(`🛡️ ${toExempt.length} ders (${label}) muafiyet havuzuna aktarıldı.`, 'success');
    },
    [buckets, unassignedCourses, showToast]
  );

  const handleClearAllExemptions = useCallback(() => {
    if (exemptCourses.length === 0) return;
    const toRestore = [...exemptCourses];
    setExemptCourses([]);
    setBuckets((prev) =>
      prev.map((b) => {
        const matching = toRestore.filter(
          (c) => `sem-${c.defaultSemester || 1}` === b.id && !b.courses.some((x) => x.uid === c.uid)
        );
        return matching.length > 0 ? { ...b, courses: [...b.courses, ...matching] } : b;
      })
    );
    showToast('Tüm muafiyetler kaldırıldı, dersler orijinal dönemlerine döndürüldü.', 'info');
  }, [exemptCourses, showToast]);

  // Upload Transcript PDF to automatically detect passed and exempt courses
  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTranscript(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/parse-transcript`, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) {
        throw new Error('Transkript PDF okunamadı.');
      }
      const data = await res.json();
      if (data.status !== 'success' || !Array.isArray(data.courses)) {
        throw new Error('Transkript verisi ayrıştırılamadı.');
      }

      let targetSemesters = baseSemesters;
      let targetPools = electivePools;
      let deptSwitchedMsg = '';

      if (
        data.detected_program_id &&
        String(data.detected_program_id) !== String(selectedProgramId)
      ) {
        try {
          const progRes = await fetch(
            `${API_BASE}/api/curricula/program/${data.detected_program_id}`
          );
          if (progRes.ok) {
            const progData = await progRes.json();
            if (progData.status === 'success' && progData.program) {
              targetSemesters = progData.program.semesters || {};
              targetPools = progData.program.electivePools || {};
              setBaseSemesters(targetSemesters);
              setElectivePools(targetPools);
              setProgramName(progData.program.name);
              if (data.detected_faculty) setSelectedFaculty(data.detected_faculty);
              setSelectedProgramId(String(data.detected_program_id));
              deptSwitchedMsg = ` (${progData.program.name} otomatik seçildi)`;
            }
          }
        } catch {}
      }

      const freshBuckets = buildDefaultBuckets(targetSemesters);
      const allCurrCourses = freshBuckets.flatMap((b) => b.courses);
      const matchedUids = new Set<string>();
      const matchedExemptList: CurriculumCourse[] = [];
      let passedCount = 0;
      let exemptCount = 0;

      const electiveCodeLookup = new Map<string, { poolName: string; opt: ElectiveOption }[]>();
      Object.entries(targetPools).forEach(([poolName, list]) => {
        list.forEach((opt) => {
          const nCode = normCourseCode(opt.code);
          if (!nCode) return;
          const arr = electiveCodeLookup.get(nCode) || [];
          arr.push({ poolName, opt });
          electiveCodeLookup.set(nCode, arr);
        });
      });

      data.courses.forEach((tc: any) => {
        const grade = String(tc.expectedGrade || '').toUpperCase().trim();
        const termStr = String(tc.term || '');
        const isExempt = ['M', 'MU', 'EX'].includes(grade) || /muaf|intibak/i.test(termStr);
        const isPassed = ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'G', 'BL'].includes(grade);

        if (!isExempt && !isPassed) return;

        const tCode = normCourseCode(tc.code);
        if (!tCode) return;

        const altCode = tCode.startsWith('YDB')
          ? tCode.replace(/^YDB/, 'MDB')
          : tCode.startsWith('MDB')
          ? tCode.replace(/^MDB/, 'YDB')
          : tCode;

        let targetCourse = allCurrCourses.find(
          (c) =>
            !matchedUids.has(c.uid) &&
            (normCourseCode(c.code) === tCode || normCourseCode(c.code) === altCode)
        );

        if (!targetCourse) {
          const poolMatches = electiveCodeLookup.get(tCode);
          if (poolMatches && poolMatches.length > 0) {
            const candidatePoolNames = new Set(poolMatches.map((pm) => pm.poolName));
            targetCourse = allCurrCourses.find((c) => {
              if (!c.isElective || matchedUids.has(c.uid)) return false;
              const slotPools = getRelevantPoolsForSlot(c, targetPools);
              return slotPools.some((sp) => candidatePoolNames.has(sp));
            });

            if (!targetCourse) {
              targetCourse = allCurrCourses.find((c) => c.isElective && !matchedUids.has(c.uid));
            }

            if (targetCourse) {
              targetCourse.selectedElectiveCode = tc.code;
              targetCourse.selectedElectiveName = poolMatches[0].opt.name || tc.name;
              targetCourse.selectedElectivePrereq = poolMatches[0].opt.prereq || '';
            }
          }
        }

        if (targetCourse) {
          matchedUids.add(targetCourse.uid);
          const updatedCourse: CurriculumCourse = {
            ...targetCourse,
            completed: true,
            grade: isExempt ? 'Muaf' : grade
          };
          matchedExemptList.push(updatedCourse);
          if (isExempt) exemptCount++;
          else passedCount++;
        }
      });

      const updatedBuckets = freshBuckets.map((b) => ({
        ...b,
        courses: b.courses.filter((c) => !matchedUids.has(c.uid))
      }));

      setBuckets(updatedBuckets);
      setUnassignedCourses([]);
      setExemptCourses(matchedExemptList);

      if (typeof data.cgpa === 'number' && data.cgpa >= 3.0) {
        setIsHighGpa(true);
        setLimitMetric('credits');
        setRegularMaxLimit(28);
      }

      const totalMatched = passedCount + exemptCount;
      if (totalMatched > 0) {
        showToast(
          `📄 Transkript okundu${deptSwitchedMsg}: ${passedCount} verilen ve ${exemptCount} muaf ders (toplam ${totalMatched} ders) otomatik algılanıp dönemlerinden düşüldü!`,
          'success'
        );
      } else {
        showToast(
          'Transkript okundu ancak seçili bölüm müfredatıyla eşleşen geçilmiş/muaf ders bulunamadı.',
          'info'
        );
      }
    } catch (err: any) {
      showToast(err?.message || 'Transkript yüklenirken bir hata oluştu.', 'error');
    } finally {
      setIsUploadingTranscript(false);
      if (transcriptInputRef.current) {
        transcriptInputRef.current.value = '';
      }
    }
  };

  const handleMetricToggle = useCallback(
    (newMetric: 'ects' | 'credits') => {
      if (newMetric === limitMetric) return;
      setLimitMetric(newMetric);
      if (newMetric === 'ects') {
        setRegularMaxLimit(42);
      } else {
        setRegularMaxLimit(isHighGpa ? 28 : 25);
      }
    },
    [limitMetric, isHighGpa]
  );

  const handleHighGpaToggle = useCallback(() => {
    setIsHighGpa((prev) => {
      const next = !prev;
      setLimitMetric('credits');
      setRegularMaxLimit(next ? 28 : 25);
      return next;
    });
  }, []);

  // Precomputed O(1) lookup structures
  const electivePrereqMap = useMemo(
    () => buildElectivePrereqMap(electivePools),
    [electivePools]
  );

  const exemptUidSet = useMemo(
    () => new Set(exemptCourses.map((c) => c.uid)),
    [exemptCourses]
  );

  const exemptCodeSet = useMemo(
    () =>
      new Set(
        exemptCourses
          .flatMap((ec) => [normCourseCode(ec.code), normCourseCode(ec.selectedElectiveCode)])
          .filter(Boolean)
      ),
    [exemptCourses]
  );

  const validateMove = useCallback(
    (course: CurriculumCourse, targetBucket: SemesterBucket): MoveValidationResult =>
      validateCourseMove(course, targetBucket, {
        buckets,
        unassignedCourses,
        exemptCodeSet,
        electivePrereqMap,
        enforcePrereqRule,
        enforceSeasonRule,
        enforceCreditLimit,
        limitMetric,
        regularMaxLimit,
        summerMaxLimit,
        summerMaxCourses
      }),
    [
      buckets,
      unassignedCourses,
      exemptCodeSet,
      electivePrereqMap,
      enforcePrereqRule,
      enforceSeasonRule,
      enforceCreditLimit,
      limitMetric,
      regularMaxLimit,
      summerMaxLimit,
      summerMaxCourses
    ]
  );

  // Move course between buckets or unassigned pool ('pool')
  const moveCourse = useCallback(
    (course: CurriculumCourse, fromId: string, toId: string) => {
      if (fromId === toId) return;

      if (toId === 'pool') {
        const poolCheck = validatePoolMove(course, buckets, electivePrereqMap, enforcePrereqRule);
        if (!poolCheck.allowed) {
          showToast(poolCheck.reason || 'Ön koşul engeli nedeniyle havuza ayrılamaz.', 'error');
          return;
        }
        setBuckets((prev) =>
          prev.map((b) =>
            b.id === fromId ? { ...b, courses: b.courses.filter((c) => c.uid !== course.uid) } : b
          )
        );
        setUnassignedCourses((prev) =>
          prev.some((c) => c.uid === course.uid) ? prev : [...prev, course]
        );
        showToast(`${course.code} dersi açıkta kalan dersler havuzuna alındı.`, 'info');
        return;
      }

      const targetBucket = buckets.find((b) => b.id === toId);
      if (!targetBucket) return;

      const check = validateMove(course, targetBucket);
      if (!check.allowed) {
        showToast(check.reason || 'Bu döneme taşınamaz.', 'error');
        return;
      }

      if (fromId === 'pool') {
        setUnassignedCourses((prev) => prev.filter((c) => c.uid !== course.uid));
      }

      setBuckets((prev) =>
        prev.map((b) => {
          if (b.id === fromId) {
            return { ...b, courses: b.courses.filter((c) => c.uid !== course.uid) };
          }
          if (b.id === toId) {
            return { ...b, courses: [...b.courses, course] };
          }
          return b;
        })
      );
    },
    [buckets, electivePrereqMap, enforcePrereqRule, validateMove, showToast]
  );

  // Return a moved course directly back to its original default semester
  const returnCourseToDefault = useCallback(
    (course: CurriculumCourse, fromId: string) => {
      const defaultBucketId = `sem-${course.defaultSemester || 1}`;
      if (fromId === defaultBucketId) return;

      const targetBucket = buckets.find((b) => b.id === defaultBucketId);
      if (targetBucket) {
        const check = validateMove(course, targetBucket);
        if (!check.allowed) {
          showToast(check.reason || 'Orijinal dönemine geri gönderilemedi.', 'error');
          return;
        }
      }

      if (fromId === 'pool') {
        setUnassignedCourses((prev) => prev.filter((c) => c.uid !== course.uid));
      }

      setBuckets((prev) =>
        prev.map((b) => {
          if (b.id === fromId) {
            return { ...b, courses: b.courses.filter((c) => c.uid !== course.uid) };
          }
          if (b.id === defaultBucketId && !b.courses.some((c) => c.uid === course.uid)) {
            return { ...b, courses: [...b.courses, course] };
          }
          return b;
        })
      );

      showToast(
        `↩ ${course.code} dersi orijinal dönemine (${course.defaultSemester}. Yarıyıl) geri gönderildi.`,
        'info'
      );
    },
    [buckets, validateMove, showToast]
  );

  // Toggle flexible termType lock on a specific course
  const toggleCourseTermFlexibility = useCallback(
    (bucketId: string, courseUid: string) => {
      const updateCourse = (c: CurriculumCourse): CurriculumCourse => {
        if (c.uid !== courseUid) return c;
        const nextType: 'Güz' | 'Bahar' | 'Her İkisi' =
          c.termType === 'Her İkisi' ? c.strictTerm : 'Her İkisi';
        showToast(
          nextType === 'Her İkisi'
            ? `${c.code} dersi esnek (Güz + Bahar) yapıldı.`
            : `${c.code} dersi sadece ${nextType} dönemine kilitlendi.`,
          'info'
        );
        return { ...c, termType: nextType };
      };

      if (bucketId === 'pool') {
        setUnassignedCourses((prev) => prev.map(updateCourse));
      } else {
        setBuckets((prev) =>
          prev.map((b) => (b.id === bucketId ? { ...b, courses: b.courses.map(updateCourse) } : b))
        );
      }
    },
    [showToast]
  );

  const toggleCourseCompleted = useCallback((bucketId: string, courseUid: string) => {
    setBuckets((prev) =>
      prev.map((b) =>
        b.id === bucketId
          ? {
              ...b,
              courses: b.courses.map((c) =>
                c.uid === courseUid ? { ...c, completed: !c.completed } : c
              )
            }
          : b
      )
    );
  }, []);

  const toggleBucketCompleted = useCallback((bucketId: string) => {
    setBuckets((prev) =>
      prev.map((b) => {
        if (b.id !== bucketId) return b;
        const allDone = b.courses.length > 0 && b.courses.every((c) => c.completed);
        return {
          ...b,
          courses: b.courses.map((c) => ({ ...c, completed: !allDone }))
        };
      })
    );
  }, []);

  const addSummerSchool = useCallback(
    (year: number) => {
      const sumId = `sum-${year}`;
      if (buckets.some((b) => b.id === sumId)) {
        showToast(`${year}. Sınıf Yaz Okulu zaten ekli.`, 'info');
        return;
      }
      const newBucket: SemesterBucket = {
        id: sumId,
        year,
        orderKey: year + 0.3,
        title: `${year}. Sınıf · Yaz Okulu`,
        season: 'Yaz',
        courses: []
      };
      setBuckets((prev) => [...prev, newBucket].sort((a, b) => a.orderKey - b.orderKey));
      showToast(
        `☀️ ${year}. Sınıf Yaz Okulu eklendi! Güz ve Bahar derslerini buraya taşıyabilirsiniz.`,
        'success'
      );
    },
    [buckets, showToast]
  );

  const removeBucket = useCallback(
    (bucketId: string) => {
      const target = buckets.find((b) => b.id === bucketId);
      if (!target) return;
      if (target.courses.length > 0) {
        setUnassignedCourses((prev) => [...prev, ...target.courses]);
        showToast(
          `${target.title} kaldırıldı, içindeki ${target.courses.length} ders açıkta kalan dersler havuzuna aktarıldı.`,
          'info'
        );
      }
      setBuckets((prev) => prev.filter((b) => b.id !== bucketId));
    },
    [buckets, showToast]
  );

  const addExtensionYear = useCallback(() => {
    if (buckets.some((b) => b.year === 5)) {
      showToast('5. Sınıf (Uzatma Yılı) zaten ekli.', 'info');
      return;
    }
    const sem9: SemesterBucket = {
      id: 'sem-9',
      year: 5,
      orderKey: 5.1,
      title: '5. Sınıf · Güz (9. Yarıyıl)',
      season: 'Güz',
      semesterNumber: 9,
      courses: []
    };
    const sem10: SemesterBucket = {
      id: 'sem-10',
      year: 5,
      orderKey: 5.2,
      title: '5. Sınıf · Bahar (10. Yarıyıl)',
      season: 'Bahar',
      semesterNumber: 10,
      courses: []
    };
    setBuckets((prev) => [...prev, sem9, sem10].sort((a, b) => a.orderKey - b.orderKey));
    showToast('5. Sınıf (9. ve 10. Yarıyıl) plana eklendi.', 'success');
  }, [buckets, showToast]);

  const handleSelectElective = useCallback(
    (opt: ElectiveOption) => {
      if (!electiveModal) return;
      const { course, bucketId } = electiveModal;

      const candidateCourse: CurriculumCourse = {
        ...course,
        selectedElectiveCode: opt.code,
        selectedElectiveName: opt.name,
        selectedElectivePrereq: opt.prereq || ''
      };

      if (bucketId !== 'pool' && enforcePrereqRule && opt.prereq) {
        const slotBucket = buckets.find((b) => b.id === bucketId);
        if (slotBucket) {
          const tempBucket: SemesterBucket = {
            ...slotBucket,
            courses: slotBucket.courses.filter((c) => c.uid !== course.uid)
          };
          const check = validateMove(candidateCourse, tempBucket);
          if (!check.allowed && check.warningType === 'prereq') {
            showToast(check.reason || 'Seçilen dersin ön koşulu sağlanmıyor.', 'error');
            return;
          }
        }
      }

      const updateFn = (c: CurriculumCourse): CurriculumCourse =>
        c.uid === course.uid ? candidateCourse : c;

      if (bucketId === 'pool') {
        setUnassignedCourses((prev) => prev.map(updateFn));
      } else {
        setBuckets((prev) =>
          prev.map((b) => (b.id === bucketId ? { ...b, courses: b.courses.map(updateFn) } : b))
        );
      }
      setElectiveModal(null);
      showToast(`${course.code} yuvasına "${opt.code} - ${opt.name}" atandı.`, 'success');
    },
    [electiveModal, enforcePrereqRule, buckets, validateMove, showToast]
  );

  const handleAddCustomCourse = useCallback(
    (form: NewCourseFormState) => {
      if (!customCourseModalBucketId) return;
      const code = form.code.trim().toUpperCase() || 'OZEL101';
      const name = form.name.trim() || 'Özel Eklenen Ders';
      const credits = parseFloat(form.credits) || 3;
      const ects = parseFloat(form.ects) || 5;

      const customCourse: CurriculumCourse = {
        uid: `custom-${Date.now()}`,
        code,
        name,
        credits,
        ects,
        defaultSemester: 1,
        termType: form.termType,
        strictTerm: form.termType === 'Bahar' ? 'Bahar' : 'Güz',
        isElective: false,
        completed: false
      };

      const targetBucket = buckets.find((b) => b.id === customCourseModalBucketId);
      if (targetBucket) {
        const check = validateMove(customCourse, targetBucket);
        if (!check.allowed) {
          showToast(
            check.reason || 'Kredi sınırı veya dönem kuralı nedeniyle eklenemedi.',
            'error'
          );
          return;
        }
        setBuckets((prev) =>
          prev.map((b) =>
            b.id === customCourseModalBucketId
              ? { ...b, courses: [...b.courses, customCourse] }
              : b
          )
        );
        showToast(`${code} - ${name} dersi ${targetBucket.title} dönemine eklendi.`, 'success');
      }
      setCustomCourseModalBucketId(null);
    },
    [customCourseModalBucketId, buckets, validateMove, showToast]
  );

  // Drag & Drop Callbacks
  const handleCourseDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, course: CurriculumCourse, fromBucketId: string) => {
      draggedCourseRef.current = { course, fromBucketId };
      try {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', course.uid);
      } catch {}
      requestAnimationFrame(() => {
        setDraggedCourse({ course, fromBucketId });
      });
    },
    []
  );

  const handleCourseDragEnd = useCallback(() => {
    draggedCourseRef.current = null;
    setDraggedCourse(null);
  }, []);

  const handleDropToPool = useCallback(() => {
    const dc = draggedCourseRef.current || draggedCourse;
    if (dc) {
      moveCourse(dc.course, dc.fromBucketId, 'pool');
      handleCourseDragEnd();
    }
  }, [draggedCourse, moveCourse, handleCourseDragEnd]);

  const handleDropToBucket = useCallback(
    (targetBucketId: string) => {
      const dc = draggedCourseRef.current || draggedCourse;
      if (dc) {
        moveCourse(dc.course, dc.fromBucketId, targetBucketId);
        handleCourseDragEnd();
      }
    },
    [draggedCourse, moveCourse, handleCourseDragEnd]
  );

  const handleOpenMoveModal = useCallback((course: CurriculumCourse, fromBucketId: string) => {
    setMovingCourseModal({ course, fromBucketId });
  }, []);

  const handleOpenElectiveModal = useCallback((course: CurriculumCourse, bucketId: string) => {
    setElectiveModal({ course, bucketId });
  }, []);

  // Graduation & Summary Calculations
  const summary: PlanSummary = useMemo(() => {
    const allPlacedCourses = buckets.flatMap((b) => b.courses);
    const exemptEcts = exemptCourses.reduce((s, c) => s + c.ects, 0);
    const exemptCredits = exemptCourses.reduce((s, c) => s + c.credits, 0);
    const totalPlacedEcts = allPlacedCourses.reduce((s, c) => s + c.ects, 0) + exemptEcts;
    const totalPlacedCredits =
      allPlacedCourses.reduce((s, c) => s + c.credits, 0) + exemptCredits;
    const completedEcts =
      allPlacedCourses.filter((c) => c.completed).reduce((s, c) => s + c.ects, 0) + exemptEcts;

    const activeRegularSemesters = buckets
      .filter((b) => b.season !== 'Yaz' && b.courses.length > 0 && b.semesterNumber)
      .map((b) => b.semesterNumber as number);

    const maxSem =
      activeRegularSemesters.length > 0 ? Math.max(...activeRegularSemesters) : 8;
    const gradYears = (maxSem / 2).toFixed(maxSem % 2 === 1 ? 1 : 0);
    const activeSummers = buckets.filter(
      (b) => b.season === 'Yaz' && b.courses.length > 0
    ).length;

    return {
      totalPlacedEcts,
      totalPlacedCredits,
      completedEcts,
      exemptEcts,
      exemptCredits,
      exemptCount: exemptCourses.length,
      totalPlacedCount: allPlacedCourses.length + exemptCourses.length,
      unassignedCount: unassignedCourses.length,
      maxSem,
      gradYears,
      activeSummers,
      isEarlyGraduation:
        maxSem <= 7 && unassignedCourses.length === 0 && allPlacedCourses.length > 0
    };
  }, [buckets, unassignedCourses, exemptCourses]);

  // Canonical 8 semesters grouped once when baseSemesters loads
  const canonicalSemesterGroups: CanonicalSemesterGroup[] = useMemo(() => {
    const defaultBucks = buildDefaultBuckets(baseSemesters);
    return defaultBucks.map((b) => ({
      semesterNumber: b.semesterNumber || 1,
      year: b.year,
      season: b.season,
      title: `${b.semesterNumber}. Yarıyıl (${b.year}. Sınıf · ${b.season})`,
      courses: b.courses
    }));
  }, [baseSemesters]);

  // Group buckets by academic year (1..5)
  const yearsList: YearGroup[] = useMemo(() => {
    const yrs = Array.from(new Set(buckets.map((b) => b.year))).sort((a, b) => a - b);
    return yrs.map((yr) => ({
      year: yr,
      buckets: buckets.filter((b) => b.year === yr).sort((a, b) => a.orderKey - b.orderKey),
      hasSummer: buckets.some((b) => b.year === yr && b.season === 'Yaz')
    }));
  }, [buckets]);

  const currentFacultyPrograms = useMemo(() => {
    const f = faculties.find((fac) => fac.faculty === selectedFaculty);
    return f ? f.programs : [];
  }, [faculties, selectedFaculty]);

  const unitLabel = limitMetric === 'ects' ? 'AKTS' : 'Kredi';
  const activeScenarioName =
    scenarios.find((s) => s.id === activeScenarioId)?.name || 'Senaryo 1';
  const hasElectivePools = useMemo(
    () => Object.keys(electivePools).length > 0,
    [electivePools]
  );

  const handleExportPdf = useCallback(() => {
    exportAcademicPlanPdf({
      activeScenarioName,
      selectedFaculty,
      programName,
      yearsList,
      exemptCourses,
      summary,
      limitMetric,
      regularMaxLimit,
      summerMaxLimit,
      summerMaxCourses,
      isHighGpa,
      onPopupBlocked: () =>
        showToast('Lütfen tarayıcınızda açılır pencere (pop-up) izni verin.', 'error')
    });
  }, [
    activeScenarioName,
    selectedFaculty,
    programName,
    yearsList,
    exemptCourses,
    summary,
    limitMetric,
    regularMaxLimit,
    summerMaxLimit,
    summerMaxCourses,
    isHighGpa,
    showToast
  ]);

  const handleTriggerTranscriptUpload = useCallback(() => {
    transcriptInputRef.current?.click();
  }, []);

  const handleChangeRegularMaxLimit = useCallback(
    (val: number) => {
      setRegularMaxLimit(val);
      if (limitMetric === 'credits') {
        setIsHighGpa(val >= 28);
      }
    },
    [limitMetric]
  );

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Hidden Transcript File Input */}
      <input
        ref={transcriptInputRef}
        type="file"
        accept=".pdf"
        onChange={handleTranscriptUpload}
        className="hidden"
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-start gap-3 text-xs sm:text-sm font-semibold ${
              toastMessage.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700'
                : toastMessage.type === 'success'
                ? 'bg-emerald-950 text-emerald-100 border-emerald-700'
                : 'bg-slate-900 text-slate-100 border-slate-700'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-snug">{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-auto text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Top Hero & Summary Cards */}
      <PlanlamaHero
        faculties={faculties}
        selectedFaculty={selectedFaculty}
        selectedProgramId={selectedProgramId}
        currentFacultyPrograms={currentFacultyPrograms}
        loadingPrograms={loadingPrograms}
        loadingCurriculum={loadingCurriculum}
        summary={summary}
        limitMetric={limitMetric}
        enforceSeasonRule={enforceSeasonRule}
        enforcePrereqRule={enforcePrereqRule}
        enforceCreditLimit={enforceCreditLimit}
        activeScenarioName={activeScenarioName}
        onFacultyChange={handleFacultyChange}
        onProgramChange={handleProgramChange}
        onOpenExemptionModal={() => setIsExemptionModalOpen(true)}
        onMetricToggle={handleMetricToggle}
        onToggleSeasonRule={() => setEnforceSeasonRule((prev) => !prev)}
        onTogglePrereqRule={() => setEnforcePrereqRule((prev) => !prev)}
        onToggleCreditLimit={() => setEnforceCreditLimit((prev) => !prev)}
        onResetPlan={handleResetPlan}
      />

      {/* Sticky Settings, Scenario Bar & Unassigned Pool */}
      <PlanlamaToolbar
        scenarios={scenarios}
        activeScenarioId={activeScenarioId}
        activeScenarioName={activeScenarioName}
        isUploadingTranscript={isUploadingTranscript}
        exemptCount={exemptCourses.length}
        regularMaxLimit={regularMaxLimit}
        unitLabel={unitLabel}
        isHighGpa={isHighGpa}
        summerMaxCourses={summerMaxCourses}
        summerMaxLimit={summerMaxLimit}
        unassignedCourses={unassignedCourses}
        draggedCourse={draggedCourse}
        electivePrereqMap={electivePrereqMap}
        onSelectScenario={handleSelectScenario}
        onCreateScenario={handleCreateScenario}
        onDeleteScenario={handleDeleteScenario}
        onRenameScenario={handleRenameScenario}
        onTriggerTranscriptUpload={handleTriggerTranscriptUpload}
        onOpenExemptionModal={() => setIsExemptionModalOpen(true)}
        onChangeRegularMaxLimit={handleChangeRegularMaxLimit}
        onToggleHighGpa={handleHighGpaToggle}
        onChangeSummerMaxCourses={setSummerMaxCourses}
        onChangeSummerMaxLimit={setSummerMaxLimit}
        onExportPdf={handleExportPdf}
        onDropToPool={handleDropToPool}
        onCourseDragStart={handleCourseDragStart}
        onCourseDragEnd={handleCourseDragEnd}
        onReturnCourseToDefault={returnCourseToDefault}
        onOpenMoveModal={handleOpenMoveModal}
      />

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* Legend & Helper Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#0c3f79]" />
              <span>Nasıl Kullanılır?</span>
            </span>
            <span className="text-slate-600">
              Dersleri <strong>sürükleyip bırakarak</strong> veya <strong>Taşı (⇄)</strong>{' '}
              butonuyla dağıtabilir, muaf olduğunuz dersleri <strong>Muafiyet Havuzu</strong>{' '}
              butonundan seçerek dönemlerinden kaldırabilirsiniz.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
              <Snowflake className="w-3 h-3 text-sky-600" /> Güz Dersi (Sadece Güz & Yaz)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              <Flower2 className="w-3 h-3 text-emerald-600" /> Bahar Dersi (Sadece Bahar & Yaz)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 font-semibold">
              <Sparkles className="w-3 h-3 text-purple-600" /> Ortak/Seçmeli (Güz, Bahar & Yaz)
            </span>
          </div>
        </div>

        {/* Floating Bottom Drop Bar while dragging */}
        {draggedCourse && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-slate-700">
            <span className="text-xs font-bold text-slate-300 hidden sm:inline">
              Taşınıyor: <strong className="text-amber-300">{draggedCourse.course.code}</strong>
            </span>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropToPool();
              }}
              className="px-3.5 py-1.5 rounded-xl border-2 border-dashed border-amber-400 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-extrabold flex items-center gap-1.5"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Açıkta Kalan Havuza Bırak</span>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                const dc = draggedCourseRef.current || draggedCourse;
                if (dc) {
                  toggleCourseExemption(dc.course);
                  handleCourseDragEnd();
                }
              }}
              className="px-3.5 py-1.5 rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-xs font-extrabold flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Muafiyet Havuzuna Bırak</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loadingCurriculum ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#0c3f79] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-700">Bölüm müfredatı yükleniyor...</p>
          </div>
        ) : (
          /* Academic Years Grid */
          <div className="space-y-8">
            {yearsList.map(({ year, buckets: yearBuckets, hasSummer }) => (
              <section key={year} className="space-y-3">
                {/* Year Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#0c3f79] text-white font-extrabold text-xs flex items-center justify-center shadow-2xs">
                      {year}
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                      {year}. Akademik Yıl {year === 5 ? '(Uzatma Yılı)' : ''}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {!hasSummer && year <= 4 && (
                      <button
                        onClick={() => addSummerSchool(year)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>+ {year}. Sınıf Yaz Okulu Ekle</span>
                      </button>
                    )}
                    {year === 5 && (
                      <button
                        onClick={() => {
                          removeBucket('sem-9');
                          removeBucket('sem-10');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>5. Yılı Kaldır</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Semesters in this Year */}
                <div
                  className={`grid grid-cols-1 gap-4 ${
                    yearBuckets.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
                  }`}
                >
                  {yearBuckets.map((bucket) => (
                    <SemesterBucketCard
                      key={bucket.id}
                      bucket={bucket}
                      limitMetric={limitMetric}
                      regularMaxLimit={regularMaxLimit}
                      summerMaxLimit={summerMaxLimit}
                      summerMaxCourses={summerMaxCourses}
                      summary={summary}
                      hasElectivePools={hasElectivePools}
                      electivePrereqMap={electivePrereqMap}
                      draggedCourse={draggedCourse}
                      validateMove={validateMove}
                      onDropCourseToBucket={handleDropToBucket}
                      onCourseDragStart={handleCourseDragStart}
                      onCourseDragEnd={handleCourseDragEnd}
                      onToggleBucketCompleted={toggleBucketCompleted}
                      onOpenCustomCourseModal={setCustomCourseModalBucketId}
                      onRemoveBucket={removeBucket}
                      onToggleCourseCompleted={toggleCourseCompleted}
                      onOpenElectiveModal={handleOpenElectiveModal}
                      onReturnCourseToDefault={returnCourseToDefault}
                      onToggleCourseTermFlexibility={toggleCourseTermFlexibility}
                      onOpenMoveModal={handleOpenMoveModal}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* Bottom Actions: Add Extension Year */}
            {!buckets.some((b) => b.year === 5) && (
              <div className="pt-2 flex justify-center">
                <button
                  onClick={addExtensionYear}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#0c3f79] text-slate-700 hover:text-[#0c3f79] text-xs font-bold shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ 5. Sınıf (9. ve 10. Uzatma Yarıyılı) Ekle</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal 1: Move Course To Semester Modal */}
      {movingCourseModal && (
        <MoveCourseModal
          movingCourseModal={movingCourseModal}
          buckets={buckets}
          limitMetric={limitMetric}
          regularMaxLimit={regularMaxLimit}
          summerMaxLimit={summerMaxLimit}
          validateMove={validateMove}
          onClose={() => setMovingCourseModal(null)}
          onAddSummerSchool={addSummerSchool}
          onMoveCourse={moveCourse}
          onToggleCourseExemption={toggleCourseExemption}
        />
      )}

      {/* Modal 1.5: Exemption Pool Modal */}
      {isExemptionModalOpen && (
        <ExemptionPoolModal
          canonicalSemesterGroups={canonicalSemesterGroups}
          exemptCourses={exemptCourses}
          exemptUidSet={exemptUidSet}
          summary={summary}
          isUploadingTranscript={isUploadingTranscript}
          onClose={() => setIsExemptionModalOpen(false)}
          onTriggerTranscriptUpload={handleTriggerTranscriptUpload}
          onBatchExemptByPrefixes={handleBatchExemptByPrefixes}
          onClearAllExemptions={handleClearAllExemptions}
          onToggleCourseExemption={toggleCourseExemption}
          onToggleSemesterExemption={toggleSemesterExemption}
        />
      )}

      {/* Modal 2: Elective Course Pool Picker */}
      {electiveModal && (
        <ElectivePickerModal
          electiveModal={electiveModal}
          electivePools={electivePools}
          onClose={() => setElectiveModal(null)}
          onSelectElective={handleSelectElective}
        />
      )}

      {/* Modal 3: Add Custom Course */}
      {customCourseModalBucketId && (
        <CustomCourseModal
          onClose={() => setCustomCourseModalBucketId(null)}
          onAddCustomCourse={handleAddCustomCourse}
        />
      )}
    </main>
  );
}
