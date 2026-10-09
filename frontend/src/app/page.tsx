"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocalStorageState } from '../hooks/useLocalStorageState';

import {
  Calendar, Building2, Upload, RefreshCw, FileText,
  AlertCircle, Download, Printer, LayoutGrid, BookOpen, Clock,
  Sparkles, Layers, GraduationCap, Palette, Pencil, X, Check,
  Trash2, StickyNote, Users, Edit3, RotateCcw, Calculator, ShieldCheck
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getFullInstructorName, getInstructorAbbreviation } from '../utils/instructors';

import AnimatedCounter from '../components/AnimatedCounter';
import PrivacyModal from '../components/PrivacyModal';
import { injectMetadataToPngDataUrl } from '../utils/pngMetadata';


import UploadScreen from '../components/UploadScreen';
import ScheduleTable from '../components/ScheduleTable';
import CourseSummaryTable from '../components/CourseSummaryTable';
import EditCourseModal from '../components/EditCourseModal';
import ScheduleToolbar from '../components/ScheduleToolbar';
// Bir ders slotunun süresini saat cinsinden hesaplar (örn: 09:00 - 10:50 -> 2 saat, 09:00 - 11:50 -> 3 saat, 09:00 - 09:50 -> 1 saat)
const getSlotDurationHours = (startTime?: string, endTime?: string): number => {
  if (!startTime || !endTime) return 0;
  const parseM = (t: string) => {
    const parts = t.replace('.', ':').split(':');
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
  };
  const diffMinutes = parseM(endTime) - parseM(startTime);
  if (diffMinutes <= 0) return 0;
  // YTÜ ders blokları: 50 dk ders periyotları (50 dk -> 1 saat, 110 dk -> 2 saat, 170 dk -> 3 saat, 230 dk -> 4 saat vb.)
  return Math.max(1, Math.round(diffMinutes / 60));
};

// Tüm derslerin haftalık toplam ders saatini dinamik olarak hesaplar
const getTotalWeeklyHours = (coursesSummary?: any[]): number => {
  if (!coursesSummary || !Array.isArray(coursesSummary)) return 0;
  return coursesSummary.reduce((totalAcc: number, course: any) => {
    const courseHours = (course.time_slots || []).reduce((slotAcc: number, slot: any) => {
      return slotAcc + getSlotDurationHours(slot.start_time, slot.end_time);
    }, 0);
    return totalAcc + courseHours;
  }, 0);
};



const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function Home() {
  const [prepData, setPrepData] = useState<Record<string, any>>({});
  useEffect(() => {
    import('../data/prepSchedules.json').then((module) => {
      setPrepData(module.default || module);
    });
  }, []);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [visualizerPdfUploading, setVisualizerPdfUploading] = useState(false);
  const router = useRouter();
  const [visualizerData, setVisualizerData, isDataMounted] = useLocalStorageState<{
    student_id: string;
    student_name: string;
    department?: string;
    term: string;
    title: string;
    schedule: Record<string, any[]>;
    courses_summary: any[];
  } | null>('ytu_visualizer_data', null);
  const [originalVisualizerData, setOriginalVisualizerData] = useLocalStorageState<any | null>('ytu_original_visualizer_data', null);
  const [visualizerError, setVisualizerError] = useState<string | null>(null);
  const [visualizerViewMode, setVisualizerViewMode] = useLocalStorageState<'table' | 'cards' | 'summary'>('ytu_visualizer_view_mode', 'table');
  const [visualizerColorMode, setVisualizerColorMode] = useLocalStorageState<'colored' | 'monochrome'>('ytu_visualizer_color_mode', 'colored');
  const [showInstructor, setShowInstructor] = useLocalStorageState<boolean>('ytu_show_instructor', false);
  const [showSection, setShowSection] = useLocalStorageState<boolean>('ytu_show_section', true);
  const [showNotes, setShowNotes] = useLocalStorageState<boolean>('ytu_show_notes', true);
  const [stats, setStats] = useState<{total_generated: number, total_visits: number} | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    // Geliştirici modu kontrolü
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('dev')) {
        localStorage.setItem('ytu_ignore_stats', 'true');
        alert('Geliştirici Modu Aktif: Artık bu tarayıcıdaki ziyaretleriniz ve oluşturduğunuz programlar sayaca DAHİL EDİLMEYECEK.');
        // Remove param from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const isDev = typeof window !== 'undefined' && localStorage.getItem('ytu_ignore_stats') === 'true';

    if (!isDev) {
      fetch(`${API_BASE}/api/stats/visit`, { method: 'POST' }).catch(() => {});
    }
    
    fetch(`${API_BASE}/api/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});
  }, []);

  const incrementGenerateStat = () => {
    const isDev = typeof window !== 'undefined' && localStorage.getItem('ytu_ignore_stats') === 'true';
    if (!isDev) {
      fetch(`${API_BASE}/api/stats/generate`, { method: 'POST' }).catch(() => {});
      setStats(prev => prev ? { ...prev, total_generated: prev.total_generated + 1 } : null);
    }
  };
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [courseNotes, setCourseNotes] = useLocalStorageState<Record<string, string>>('ytu_schedule_notes', {});
  const [scheduleFontFamily, setScheduleFontFamily] = useLocalStorageState<'default' | 'inter' | 'lora' | 'mono'>('ytu_schedule_font', 'default');
  const [scheduleFontScale, setScheduleFontScale] = useLocalStorageState<number>('ytu_schedule_scale', 1.0);

  const [selectedPrepLevel, setSelectedPrepLevel] = useState<string>('');
  const [selectedPrepClass, setSelectedPrepClass] = useState<string>('');

  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editingCourseForm, setEditingCourseForm] = useState<{
    originalCode: string;
    originalName: string;
    originalSection: string;
    code: string;
    name: string;
    section: string;
    classroom: string;
    instructor: string;
    note: string;
  }>({
    originalCode: '',
    originalName: '',
    originalSection: '',
    code: '',
    name: '',
    section: '',
    classroom: '',
    instructor: '',
    note: '',
  });

  const visualizerScheduleRef = useRef<HTMLDivElement>(null);

  const prepLevels = React.useMemo(() => {
    const levels = new Set<string>();
    Object.keys(prepData).forEach(k => {
      const level = k.split('-')[0];
      if (level) levels.add(level);
    });
    return Array.from(levels).sort();
  }, []);

  const uniqueColorKeysForSchedule = React.useMemo(() => {
    if (!visualizerData) return [];
    const keys = new Set<string>();
    Object.values(visualizerData.schedule).forEach(dayArr => {
      dayArr.forEach((it: any) => {
        const key = it.instructor && it.instructor.trim() ? it.instructor.trim() : it.code;
        keys.add(key);
      });
    });
    return Array.from(keys).sort();
  }, [visualizerData]);

  const prepClassesForLevel = React.useMemo(() => {
    if (!selectedPrepLevel) return [];
    return Object.keys(prepData)
      .filter(k => k.startsWith(selectedPrepLevel + '-'))
      .sort((a, b) => {
        // e.g., P1-01 vs P1-02
        return a.localeCompare(b);
      });
  }, [selectedPrepLevel]);

  const handlePrepClassSelect = () => {
    if (!selectedPrepClass || !prepData[selectedPrepClass]) return;
    const classData = prepData[selectedPrepClass];
    
    // Extract section from label: e.g., P1-01/D-201 -> 01
    let sectionNo = '';
    const parts = selectedPrepClass.split('/');
    if (parts.length > 0) {
      const mainPart = parts[0]; // P1-01
      if (mainPart.includes('-')) {
        sectionNo = mainPart.split('-')[1];
      }
    }

    const mockData = {
      student_id: "-",
      student_name: "Hazırlık Öğrencisi",
      term: "2026-2027 Güz",
      title: `Hazırlık Ders Programı (${selectedPrepClass})`,
      schedule: classData.schedule,
      courses_summary: [
        {
          code: "HAZIRLIK",
          name: "İngilizce Hazırlık",
          instructor: "Hazırlık Okutmanları",
          section: sectionNo,
          classroom: classData.room,
          classrooms: classData.room ? [classData.room] : [],
          time_slots: [] as any[]
        }
      ]
    };
    
    const summarySlots: any[] = [];
    Object.keys(classData.schedule).forEach(day => {
      classData.schedule[day].forEach((slot: any) => {
        summarySlots.push({
          day: day,
          start_time: slot.start_time,
          end_time: slot.end_time
        });
      });
    });
    mockData.courses_summary[0].time_slots = summarySlots;
    
    setVisualizerData(mockData);
    setOriginalVisualizerData(JSON.parse(JSON.stringify(mockData)));
    setVisualizerError(null);
    incrementGenerateStat();
    
    // Hazırlık programında hocalar çok kritik olduğu için varsayılan olarak aç
    setShowInstructor(true);
    
  };

  

  const handleToggleShowInstructor = (checked: boolean) => {
    setShowInstructor(checked);
    
  };

  const handleToggleShowSection = (checked: boolean) => {
    setShowSection(checked);
    
  };

  const handleToggleShowNotes = (checked: boolean) => {
    setShowNotes(checked);
    
  };

  const handleChangeFontFamily = (family: 'default' | 'inter' | 'lora' | 'mono') => {
    setScheduleFontFamily(family);
    
  };

  const handleChangeFontScale = (scale: number) => {
    setScheduleFontScale(scale);
    
  };

  const getDocFontClass = () => {
    if (scheduleFontFamily === 'lora') return 'doc-font-lora';
    if (scheduleFontFamily === 'mono') return 'doc-font-mono';
    if (scheduleFontFamily === 'inter') return 'doc-font-inter';
    return '';
  };

  const handleOpenEditModal = (course: any) => {
    setEditingCourse(course);
    setEditingCourseForm({
      originalCode: course.code,
      originalName: course.name || '',
        originalSection: course.section || '',
      code: course.code,
      name: course.name || '',
      section: course.section || '',
      classroom: course.classroom || '',
      instructor: course.instructor || '',
      note: courseNotes[course.code] || '',
    });
  };

  const handleSaveCourseForm = () => {
    if (!editingCourse || !visualizerData) return;
    const { originalCode, code, name, section, classroom, instructor, note } = editingCourseForm;
    const cleanCode = code.trim().toUpperCase() || originalCode;

    // 1. Update schedule items
    const updatedSchedule: Record<string, any[]> = {};
    Object.keys(visualizerData.schedule).forEach(day => {
      updatedSchedule[day] = (visualizerData.schedule[day] || []).map((it: any) => {
        if (it.code === originalCode && it.name === editingCourseForm.originalName) {
          return {
            ...it,
            code: cleanCode,
            name: name.trim() || it.name,
            section: section.trim(),
            classroom: classroom.trim(),
            instructor: instructor.trim(),
            is_lab: /lab/i.test(classroom),
          };
        }
        return it;
      });
    });

    // 2. Update courses_summary
    const updatedSummary = (visualizerData.courses_summary || []).map((c: any) => {
      if (c.code === originalCode && c.name === editingCourseForm.originalName) {
        return {
          ...c,
          code: cleanCode,
          name: name.trim() || c.name,
          section: section.trim(),
          instructor: instructor.trim(),
          classrooms: [classroom.trim()],
        };
      }
      return c;
    });

    // 3. Update notes
    const newNotes = { ...courseNotes };
    if (originalCode !== cleanCode) {
      delete newNotes[originalCode];
    }
    if (note.trim()) {
      newNotes[cleanCode] = note.trim();
    } else {
      delete newNotes[cleanCode];
    }

    setVisualizerData({
      ...visualizerData,
      schedule: updatedSchedule,
      courses_summary: updatedSummary,
    });

    setCourseNotes(newNotes);
    

    setEditingCourse(null);
  };

  const handleDeleteNoteFromForm = () => {
    if (!editingCourseForm.originalCode) return;
    const cleanCode = editingCourseForm.code.trim().toUpperCase() || editingCourseForm.originalCode;
    const newNotes = { ...courseNotes };
    delete newNotes[editingCourseForm.originalCode];
    delete newNotes[cleanCode];
    setCourseNotes(newNotes);
    setEditingCourseForm(prev => ({ ...prev, note: '' }));
    
  };
  const handleResetChanges = () => {
    if (!window.confirm("Yapılan tüm ders bilgisi düzenlemeleri, özel notlar ve yazı tipi ayarları orijinal haline sıfırlanacak. Onaylıyor musunuz?")) {
      return;
    }

    if (originalVisualizerData) {
      setVisualizerData(JSON.parse(JSON.stringify(originalVisualizerData)));
    }
    setCourseNotes({});
    

    setScheduleFontFamily('default');
    

    setScheduleFontScale(1.0);
    

    setShowInstructor(false);
    

    setShowSection(true);
    

    setShowNotes(true);
    

    setEditingCourse(null);
  };

  const handleVisualizerPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVisualizerPdfUploading(true);
    setVisualizerError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/parse-student-schedule`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'PDF ayrıştırılamadı. Lütfen geçerli bir Öğrenci Ders Programı (Report.pdf) yükleyin.');
      }

      const data = await res.json();
      if (data && data.schedule) {
        setVisualizerData(data);
        setOriginalVisualizerData(JSON.parse(JSON.stringify(data)));
        incrementGenerateStat();
      } else {
        throw new Error('PDF dosyasında ders programı bilgisi bulunamadı.');
      }
    } catch (err: any) {
      console.error('Visualizer PDF upload error:', err);
      setVisualizerError(err.message || 'PDF yüklenirken bir hata oluştu.');
    } finally {
      setVisualizerPdfUploading(false);
      e.target.value = '';
    }
  };
  const handleExportVisualizerPNG = async () => {
    const node = visualizerScheduleRef.current;
    if (!node) return;
    try {
      const fullWidth = Math.max(node.scrollWidth, 1080);
      const fullHeight = node.scrollHeight;

      let dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // 2x Ultra-sharp A4 resolution
        width: fullWidth,
        height: fullHeight,
        style: {
          width: `${fullWidth}px`,
          maxWidth: `${fullWidth}px`,
          minWidth: `${fullWidth}px`,
          borderRadius: '0px',
          border: 'none',
          boxShadow: 'none',
          margin: '0px',
          padding: '24px',
          backgroundColor: '#ffffff',
          color: '#0f172a',
          colorScheme: 'light',
          transform: 'none',
        }
      });

      // İndirilen PNG'ye ders programı JSON metadata'sını göm
      if (visualizerData) {
        dataUrl = injectMetadataToPngDataUrl(dataUrl, visualizerData);
      }

      const link = document.createElement('a');
      link.download = `YTU_A4_Ders_Programi_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
      alert('PNG görseli oluşturulurken hata oluştu.');
    }
  };

  const handleTransferToAbsence = () => {
    if (!visualizerData?.schedule) return;
    const uniqueCoursesMap = new Map();
    Object.entries(visualizerData.schedule).forEach(([dayName, dayClasses]: [string, any]) => {
      if (Array.isArray(dayClasses)) {
        const seenInThisDay = new Set();
        dayClasses.forEach(c => {
          let baseKey = c.code || c.name;
          if (!baseKey) return;

          const isLab = (c.name && (c.name.toLowerCase().includes('lab') || c.name.toLowerCase().includes('uygulama'))) ||
                        (c.class && (c.class.toLowerCase().includes('lab') || c.class.toLowerCase().includes('uyg'))) ||
                        (c.classroom && (c.classroom.toLowerCase().includes('lab') || c.classroom.toLowerCase().includes('uyg'))) ||
                        (c.room && (c.room.toLowerCase().includes('lab') || c.room.toLowerCase().includes('uyg')));

          let key = isLab ? `${baseKey}-LAB` : baseKey;
          if (seenInThisDay.has(key)) return;
          seenInThisDay.add(key);

          if (!uniqueCoursesMap.has(key)) {
            let finalName = c.code && c.name && !c.name.includes(c.code) ? `${c.name} (${c.code})` : c.name || '';
            if (isLab && !finalName.toLowerCase().includes('lab') && !finalName.toLowerCase().includes('uygulama')) {
              finalName = `${finalName} (Lab/Uygulama)`;
            }

            uniqueCoursesMap.set(key, {
              code: c.code || '',
              name: finalName,
              scheduleDays: [dayName]
            });
          } else {
            const existing = uniqueCoursesMap.get(key);
            if (!existing.scheduleDays.includes(dayName)) {
              existing.scheduleDays.push(dayName);
            }
          }
        });
      }
    });

    const extractedCourses = Array.from(uniqueCoursesMap.values());
    if (extractedCourses.length > 0) {
      let existingCourses: any[] = [];
      try {
        const raw = localStorage.getItem('ytu_absence_courses');
        if (raw) existingCourses = JSON.parse(raw);
      } catch {}

      const usedIds = new Set<string>();
      const newAbsenceCourses = extractedCourses.map((c, idx) => {
        const existing = existingCourses.find(ex => ex.name === c.name && !usedIds.has(ex.id));
        let courseId = existing?.id;
        if (!courseId || usedIds.has(courseId)) {
          courseId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : `${Math.random().toString(36).substring(2, 9)}_${Date.now()}_${idx}`;
        }
        usedIds.add(courseId);
        return {
          id: courseId,
          code: c.code,
          name: c.name,
          calcMode: 'weekly' as const,
          weeklyDays: c.scheduleDays.length > 0 ? c.scheduleDays.length : 1,
          courseWeeks: 14,
          totalDays: (c.scheduleDays.length > 0 ? c.scheduleDays.length : 1) * 14,
          absences: existing?.absences || 0,
          attendanceRecords: existing?.attendanceRecords || {},
          requirementPercent: existing?.requirementPercent || 70,
          scheduleDays: c.scheduleDays,
          frequency: existing?.frequency || 1,
          frequencyOffset: existing?.frequencyOffset || 0
        };
      });

      localStorage.setItem('ytu_absence_courses', JSON.stringify(newAbsenceCourses));
      router.push('/devamsizlik');
    }
  };

  const handleTransferToAgno = () => {
    if (!visualizerData) return;
    const uniqueCoursesMap = new Map();
    if (visualizerData.courses_summary && Array.isArray(visualizerData.courses_summary)) {
      visualizerData.courses_summary.forEach((course: any, idx: number) => {
        const key = course.code || course.name;
        if (key && !uniqueCoursesMap.has(key)) {
          uniqueCoursesMap.set(key, {
            id: Math.random().toString(36).substring(2, 9) + idx,
            code: course.code || '',
            name: course.name || '',
            credits: course.credits || '',
            expectedGrade: ''
          });
        }
      });
    } else if (visualizerData.schedule) {
      Object.values(visualizerData.schedule).forEach((dayClasses: any) => {
        if (Array.isArray(dayClasses)) {
          dayClasses.forEach(c => {
            const key = c.code || c.name;
            if (key && !uniqueCoursesMap.has(key)) {
              uniqueCoursesMap.set(key, {
                id: Math.random().toString(36).substring(2, 9),
                code: c.code || '',
                name: c.name || '',
                credits: '',
                expectedGrade: ''
              });
            }
          });
        }
      });
    }
    const coursesToTransfer = Array.from(uniqueCoursesMap.values());
    if (coursesToTransfer.length > 0) {
      localStorage.setItem('ytu_pending_agno_courses', JSON.stringify(coursesToTransfer));
      router.push('/agno');
    }
  };

  if (!isDataMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="w-8 h-8 border-3 border-[#0c3f79] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f8fafc] text-slate-900 transition-colors duration-200">
      

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {!visualizerData ? (
              <UploadScreen
                stats={stats}
                visualizerError={visualizerError}
                visualizerPdfUploading={visualizerPdfUploading}
                handleVisualizerPdfUpload={handleVisualizerPdfUpload}
                selectedPrepLevel={selectedPrepLevel}
                setSelectedPrepLevel={setSelectedPrepLevel}
                selectedPrepClass={selectedPrepClass}
                setSelectedPrepClass={setSelectedPrepClass}
                prepLevels={prepLevels}
                prepClassesForLevel={prepClassesForLevel}
                handlePrepClassSelect={handlePrepClassSelect}
              />
            ) : (
              /* Belge Yüklendi -> Resmi Çizelge Görünümü */
              <div className="space-y-6">
                {/* Üst Yönetim Paneli (Modüler Toolbar) */}
                <ScheduleToolbar
                  visualizerData={visualizerData}
                  handleTransferToAbsence={handleTransferToAbsence}
                  handleTransferToAgno={handleTransferToAgno}
                  handleExportVisualizerPNG={handleExportVisualizerPNG}
                  handleVisualizerPdfUpload={handleVisualizerPdfUpload}
                  setVisualizerData={setVisualizerData}
                  setOriginalVisualizerData={setOriginalVisualizerData}
                  visualizerViewMode={visualizerViewMode}
                  setVisualizerViewMode={setVisualizerViewMode}
                  visualizerColorMode={visualizerColorMode}
                  setVisualizerColorMode={setVisualizerColorMode}
                  showInstructor={showInstructor}
                  handleToggleShowInstructor={handleToggleShowInstructor}
                  showSection={showSection}
                  handleToggleShowSection={handleToggleShowSection}
                  showNotes={showNotes}
                  handleToggleShowNotes={handleToggleShowNotes}
                  isEditMode={isEditMode}
                  setIsEditMode={setIsEditMode}
                  scheduleFontFamily={scheduleFontFamily}
                  handleChangeFontFamily={handleChangeFontFamily}
                  scheduleFontScale={scheduleFontScale}
                  handleChangeFontScale={handleChangeFontScale}
                  handleResetChanges={handleResetChanges}
                  getTotalWeeklyHours={getTotalWeeklyHours}
                />

                <ScheduleTable
                  visualizerViewMode={visualizerViewMode}
                  visualizerData={visualizerData}
                  visualizerScheduleRef={visualizerScheduleRef}
                  getDocFontClass={getDocFontClass}
                  selectedPrepClass={selectedPrepClass}
                  visualizerColorMode={visualizerColorMode}
                  uniqueColorKeysForSchedule={uniqueColorKeysForSchedule}
                  showSection={showSection}
                  showInstructor={showInstructor}
                  showNotes={showNotes}
                  isEditMode={isEditMode}
                  handleOpenEditModal={handleOpenEditModal}
                  scheduleFontScale={scheduleFontScale}
                  courseNotes={courseNotes}
                />

                {visualizerViewMode === 'summary' && (
                  <CourseSummaryTable
                    visualizerData={visualizerData}
                    courseNotes={courseNotes}
                    isEditMode={isEditMode}
                    handleOpenEditModal={handleOpenEditModal}
                    getDocFontClass={getDocFontClass}
                  />
                )}
              </div>
            )}
          </div>
      </main>

      <EditCourseModal
        editingCourse={editingCourse}
        setEditingCourse={setEditingCourse}
        editingCourseForm={editingCourseForm}
        setEditingCourseForm={setEditingCourseForm}
        handleSaveCourseForm={handleSaveCourseForm}
        handleDeleteNoteFromForm={handleDeleteNoteFromForm}
        courseNotes={courseNotes}
        getDocFontClass={getDocFontClass}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            YTÜ Dostun — Gönüllü Öğrenci Projesi
          </p>
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-2">
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
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-emerald-700 text-slate-500 font-medium transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <ShieldCheck size={13} className="text-emerald-500" />
              <span>Gizlilik &amp; Veri Güvenliği</span>
            </button>
          </p>
        </div>
      </footer>
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  );
}
