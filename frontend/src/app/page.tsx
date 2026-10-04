"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, Building2, Upload, RefreshCw, FileText,
  AlertCircle, Download, Printer, LayoutGrid, BookOpen, Clock,
  Sparkles, Layers, GraduationCap, Palette, Pencil, X, Check,
  Trash2, StickyNote, Users, Edit3, RotateCcw, Calculator
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getFullInstructorName, getInstructorAbbreviation } from '../utils/instructors';
import CompareView from '../components/CompareView';
import AnimatedCounter from '../components/AnimatedCounter';
import { injectMetadataToPngDataUrl } from '../utils/pngMetadata';
import prepDataRaw from '../data/prepSchedules.json';

const prepData: Record<string, any> = prepDataRaw;

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
  const [activeTab, setActiveTab] = useState<'single' | 'compare'>('single');
  const [visualizerPdfUploading, setVisualizerPdfUploading] = useState(false);
  const [visualizerData, setVisualizerData] = useState<{
    student_id: string;
    student_name: string;
    department?: string;
    term: string;
    title: string;
    schedule: Record<string, any[]>;
    courses_summary: any[];
  } | null>(null);
  const [originalVisualizerData, setOriginalVisualizerData] = useState<any | null>(null);
  const [visualizerError, setVisualizerError] = useState<string | null>(null);
  const [visualizerViewMode, setVisualizerViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const [visualizerColorMode, setVisualizerColorMode] = useState<'colored' | 'monochrome'>('colored');
  const [showInstructor, setShowInstructor] = useState<boolean>(false);
  const [showSection, setShowSection] = useState<boolean>(true);
  const [showNotes, setShowNotes] = useState<boolean>(true);
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
  const [courseNotes, setCourseNotes] = useState<Record<string, string>>({});
  const [scheduleFontFamily, setScheduleFontFamily] = useState<'default' | 'inter' | 'lora' | 'mono'>('default');
  const [scheduleFontScale, setScheduleFontScale] = useState<number>(1.0);

  const [selectedPrepLevel, setSelectedPrepLevel] = useState<string>('');
  const [selectedPrepClass, setSelectedPrepClass] = useState<string>('');

  const [editingCourse, setEditingCourse] = useState<any | null>(null);
  const [editingCourseForm, setEditingCourseForm] = useState<{
    originalCode: string;
    originalSection: string;
    code: string;
    name: string;
    section: string;
    classroom: string;
    instructor: string;
    note: string;
  }>({
    originalCode: '',
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
    try {
      localStorage.setItem('ytu_show_instructor', 'true');
    } catch (e) {}
  };

  useEffect(() => {
    try {
      const savedNotes = localStorage.getItem('ytu_schedule_notes');
      if (savedNotes) {
        setCourseNotes(JSON.parse(savedNotes));
      }
      const savedShowInst = localStorage.getItem('ytu_show_instructor');
      if (savedShowInst !== null) {
        setShowInstructor(savedShowInst === 'true');
      } else {
        setShowInstructor(false);
      }
      const savedShowSec = localStorage.getItem('ytu_show_section');
      if (savedShowSec !== null) {
        setShowSection(savedShowSec === 'true');
      }
      const savedShowNot = localStorage.getItem('ytu_show_notes');
      if (savedShowNot !== null) {
        setShowNotes(savedShowNot === 'true');
      }
      const savedFont = localStorage.getItem('ytu_schedule_font');
      if (savedFont) {
        if (savedFont === 'default') setScheduleFontFamily('default');
        else if (savedFont === 'sans' || savedFont === 'outfit' || savedFont === 'inter') setScheduleFontFamily('inter');
        else if (savedFont === 'serif' || savedFont === 'lora') setScheduleFontFamily('lora');
        else if (savedFont === 'mono') setScheduleFontFamily('mono');
      }
      const savedScale = localStorage.getItem('ytu_schedule_scale');
      if (savedScale) {
        setScheduleFontScale(parseFloat(savedScale) || 1.0);
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, []);

  const handleToggleShowInstructor = (checked: boolean) => {
    setShowInstructor(checked);
    try {
      localStorage.setItem('ytu_show_instructor', String(checked));
    } catch (e) {}
  };

  const handleToggleShowSection = (checked: boolean) => {
    setShowSection(checked);
    try {
      localStorage.setItem('ytu_show_section', String(checked));
    } catch (e) {}
  };

  const handleToggleShowNotes = (checked: boolean) => {
    setShowNotes(checked);
    try {
      localStorage.setItem('ytu_show_notes', String(checked));
    } catch (e) {}
  };

  const handleChangeFontFamily = (family: 'default' | 'inter' | 'lora' | 'mono') => {
    setScheduleFontFamily(family);
    try {
      localStorage.setItem('ytu_schedule_font', family);
    } catch (e) {}
  };

  const handleChangeFontScale = (scale: number) => {
    setScheduleFontScale(scale);
    try {
      localStorage.setItem('ytu_schedule_scale', String(scale));
    } catch (e) {}
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
        if (it.code === originalCode) {
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
      if (c.code === originalCode) {
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
    try {
      localStorage.setItem('ytu_schedule_notes', JSON.stringify(newNotes));
    } catch (e) {}

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
    try {
      localStorage.setItem('ytu_schedule_notes', JSON.stringify(newNotes));
    } catch (e) {}
  };
  const handleResetChanges = () => {
    if (!window.confirm("Yapılan tüm ders bilgisi düzenlemeleri, özel notlar ve yazı tipi ayarları orijinal haline sıfırlanacak. Onaylıyor musunuz?")) {
      return;
    }

    if (originalVisualizerData) {
      setVisualizerData(JSON.parse(JSON.stringify(originalVisualizerData)));
    }
    setCourseNotes({});
    try {
      localStorage.removeItem('ytu_schedule_notes');
    } catch (e) {}

    setScheduleFontFamily('default');
    try {
      localStorage.setItem('ytu_schedule_font', 'default');
    } catch (e) {}

    setScheduleFontScale(1.0);
    try {
      localStorage.setItem('ytu_schedule_scale', '1.0');
    } catch (e) {}

    setShowInstructor(false);
    try {
      localStorage.setItem('ytu_show_instructor', 'false');
    } catch (e) {}

    setShowSection(true);
    try {
      localStorage.setItem('ytu_show_section', 'true');
    } catch (e) {}

    setShowNotes(true);
    try {
      localStorage.setItem('ytu_show_notes', 'true');
    } catch (e) {}

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

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f8fafc] text-slate-900 transition-colors duration-200">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 no-print shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setVisualizerData(null);
              setActiveTab('single');
              setIsEditMode(false);
              setVisualizerError(null);
            }}
            className="flex items-center space-x-3.5 text-left group cursor-pointer focus:outline-none"
            title="Yeni belge yükleme sayfasına dön"
          >
            <div className="w-10 h-10 rounded-lg bg-[#002855] group-hover:bg-[#001f42] flex items-center justify-center text-white shadow-xs transition-colors">
              <GraduationCap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#002855] tracking-tight transition-colors flex items-center gap-1.5">
                  <span>YTÜ Dostun</span>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    v2
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                YTÜ&apos;lülerin yeni nesil ders ve not yönetim portalı.
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {/* Sekme Değiştirici */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'single'
                    ? 'bg-[#002855] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tekli Program</span>
              </button>
              <button
                onClick={() => setActiveTab('compare')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'compare'
                    ? 'bg-[#002855] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>Ortak Boş Saatler (Karşılaştır)</span>
              </button>
              <a
                href="/gano"
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <Calculator className="w-3.5 h-3.5 text-blue-500" />
                <span>GANO Hesapla</span>
              </a>
            </div>

            {visualizerData && activeTab === 'single' && (
              <label className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Yeni Belge Yükle</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleVisualizerPdfUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            {activeTab === 'compare' ? (
              <CompareView />
            ) : !visualizerData ? (
              /* Henüz Belge Yüklenmedi -> Resmi Doküman Yükleme Alanı */
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-6">
                  <div className="flex flex-col md:flex-row items-center gap-6 justify-between relative z-10">
                    <div className="max-w-2xl space-y-2 text-center md:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold">
                        <GraduationCap className="w-4 h-4 text-amber-500" />
                        <span>Yıldız Teknik Üniversitesi — Öğrenci Bilgi Sistemi (OBS)</span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                        Öğrenci Haftalık Ders Programı <span className="text-[#002855]">Çizelgesi</span>
                      </h2>

                      <p className="text-sm text-slate-600 leading-relaxed">
                        OBS sistemi üzerinden temin ettiğiniz resmi <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Report.pdf</span> (Öğrenci Ders Programı) belgesini sisteme yükleyiniz. Belgedeki ders kodları, şube numaraları, teori ve laboratuvar derslikleri ile öğretim elemanları otomatik olarak çözümlenerek resmi A4 haftalık akademik çizelge formatında görselleştirilecektir.
                      </p>
                    </div>

                    <div className="flex-shrink-0 w-full md:w-auto hidden sm:flex">
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1 w-48 shadow-2xs">
                        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Bugüne Kadar</div>
                        <div className="text-3xl font-black text-[#002855] font-mono tracking-tighter">
                          {stats ? <AnimatedCounter value={stats.total_generated} /> : '...'}
                        </div>
                        <div className="text-xs font-medium text-slate-600">YTÜ'lü Program Çıkardı</div>
                      </div>
                    </div>
                  </div>

                  {/* OBS Belge Alma Talimatı */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-left">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <FileText className="w-4 h-4 text-[#002855]" />
                      <span>OBS Üzerinden Ders Programı PDF'i Nasıl Alınır?</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                      <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                        <span><strong>OBS</strong> sistemine giriş yapınız ve <strong>Ders Programı</strong> ekranını açınız.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                        <span>Sayfadaki <strong>"Yazdır"</strong> butonunu seçip açılan ekranda <strong>"Save / Kaydet"</strong> tuşuna basarak PDF belgesini indiriniz.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                        <span className="w-5 h-5 rounded-full bg-[#002855] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                        <span>İndirdiğiniz bu <strong>Report.pdf</strong> dosyasını aşağıdaki alana yükleyiniz.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Yükleme Alanı */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs text-center space-y-6">
                  {visualizerError && (
                    <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm max-w-xl mx-auto text-left">
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-bold">Belge Ayrıştırma Hatası</p>
                        <p className="text-xs text-rose-600 mt-0.5">{visualizerError}</p>
                      </div>
                    </div>
                  )}

                  <label className={`block border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer max-w-2xl mx-auto ${
                    visualizerPdfUploading
                      ? 'border-[#002855] bg-blue-50/40'
                      : 'border-slate-300 hover:border-[#002855] bg-slate-50/70 hover:bg-slate-100/70'
                  }`}>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleVisualizerPdfUpload}
                      disabled={visualizerPdfUploading}
                      className="hidden"
                    />

                    {visualizerPdfUploading ? (
                      <div className="py-8 flex flex-col items-center justify-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-[#002855] animate-spin" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">Belge Analiz Ediliyor...</p>
                          <p className="text-xs text-slate-500">Ders kayıtları, derslikler ve öğretim üyeleri eşleştirilmektedir</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-[#002855] shadow-xs">
                          <FileText className="w-7 h-7" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800">
                            Öğrenci Ders Programı Dokümanını (Report.pdf) Seçiniz
                          </p>
                          <p className="text-xs text-slate-500">
                            Dosyayı bu alana sürükleyebilir veya tıklayarak dosya seçebilirsiniz
                          </p>
                        </div>
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-xs transition-all">
                            <Upload className="w-4 h-4" />
                            <span>PDF Belgesi Yükle</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </label>

                  {/* Hazırlık Öğrencileri İçin Menü */}
                  <div className="max-w-2xl mx-auto mt-6 pt-6 border-t border-slate-200 text-left">
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-800">Hazırlık Öğrencisi Misin?</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">1. Kur / Program Seçin</label>
                        <select
                          value={selectedPrepLevel}
                          onChange={(e) => {
                            setSelectedPrepLevel(e.target.value);
                            setSelectedPrepClass('');
                          }}
                          className="w-full text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#002855] focus:border-[#002855] outline-none transition-all cursor-pointer"
                        >
                          <option value="">Seçiniz...</option>
                          {prepLevels.map(lvl => (
                            <option key={lvl} value={lvl}>{lvl} (Kur)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">2. Sınıf Seçin</label>
                        <div className="flex gap-2">
                          <select
                            value={selectedPrepClass}
                            onChange={(e) => setSelectedPrepClass(e.target.value)}
                            disabled={!selectedPrepLevel}
                            className="flex-1 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-2.5 focus:ring-2 focus:ring-[#002855] focus:border-[#002855] outline-none disabled:opacity-50 transition-all cursor-pointer"
                          >
                            <option value="">Sınıf Seçin</option>
                            {prepClassesForLevel.map(cls => {
                               const clsNo = cls.split('/')[0].split('-')[1];
                               const room = cls.split('/')[1] || '';
                               return (
                                 <option key={cls} value={cls}>Sınıf {clsNo} (Derslik: {room})</option>
                               );
                            })}
                          </select>
                          <button
                            onClick={handlePrepClassSelect}
                            disabled={!selectedPrepClass}
                            className="px-5 py-2.5 bg-[#002855] hover:bg-[#001f42] disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                          >
                            Getir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Resmi Bilgi Kartları */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                      <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#002855]" />
                        Haftalık Akademik Çizelge
                      </div>
                      <p className="text-[11px] text-slate-500">Ders saatleri bloklar halinde haftalık resmi şablona yerleştirilir.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                      <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#002855]" />
                        Derslik ve Laboratuvarlar
                      </div>
                      <p className="text-[11px] text-slate-500">Teorik derslikler ve LAB ortamları açık ve net şekilde belirtilir.</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
                      <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#002855]" />
                        Ders ve Şube Bilgileri
                      </div>
                      <p className="text-[11px] text-slate-500">Belgedeki tüm ders kodları ve şubeler çizelgeye eksiksiz yerleştirilir.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Belge Yüklendi -> Resmi Çizelge Görünümü */
              <div className="space-y-6">
                {/* Üst Yönetim Paneli */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 no-print text-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Program Başlık Alanı */}
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[#002855] font-bold text-base shadow-2xs">
                        <Calendar className="w-5 h-5 text-[#002855]" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900">
                          Haftalık Ders Programı
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {visualizerData.term ? `${visualizerData.term} Öğretim Yarıyılı` : 'Görsel Çizelge'}
                        </p>
                      </div>
                    </div>

                    {/* Eylem Butonları */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Görünüm Seçici */}
                      <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <button
                          onClick={() => setVisualizerViewMode('table')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            visualizerViewMode === 'table'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 inline mr-1" />
                          Haftalık Çizelge
                        </button>
                        <button
                          onClick={() => setVisualizerViewMode('cards')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            visualizerViewMode === 'cards'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5 inline mr-1" />
                          Günlük Dağılım
                        </button>
                        <button
                          onClick={() => setVisualizerViewMode('summary')}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                            visualizerViewMode === 'summary'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 inline mr-1" />
                          Ders Listesi & Derslikler
                        </button>
                      </div>

                      {/* Renk Seçici (Renkli / Sade) */}
                      <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <button
                          onClick={() => setVisualizerColorMode('colored')}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            visualizerColorMode === 'colored'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Renkli Görünüm"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>Renkli</span>
                        </button>
                        <button
                          onClick={() => setVisualizerColorMode('monochrome')}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            visualizerColorMode === 'monochrome'
                              ? 'bg-[#002855] text-white shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                          title="Standart Renksiz / Sade Görünüm"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Sade</span>
                        </button>
                      </div>

                      {/* Görünüm Tikleri (Hoca Kısaltması, Şube, Notlar) */}
                      <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
                        <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all select-none shadow-2xs" title="Hoca kısaltmalarını göster/gizle">
                          <input
                            type="checkbox"
                            checked={showInstructor}
                            onChange={(e) => handleToggleShowInstructor(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-[#002855] focus:ring-0 cursor-pointer accent-[#002855]"
                          />
                          <GraduationCap className="w-3.5 h-3.5 text-[#002855]" />
                          <span>Hoca</span>
                        </label>

                        <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all select-none shadow-2xs" title="Şube (grup) bilgisini göster/gizle">
                          <input
                            type="checkbox"
                            checked={showSection}
                            onChange={(e) => handleToggleShowSection(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-[#002855] focus:ring-0 cursor-pointer accent-[#002855]"
                          />
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Şube</span>
                        </label>

                        <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all select-none shadow-2xs" title="Ders notlarını göster/gizle">
                          <input
                            type="checkbox"
                            checked={showNotes}
                            onChange={(e) => handleToggleShowNotes(e.target.checked)}
                            className="w-3.5 h-3.5 rounded text-[#002855] focus:ring-0 cursor-pointer accent-[#002855]"
                          />
                          <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                          <span>Notlar</span>
                        </label>
                      </div>

                      {/* Düzenle Modu Butonu */}
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                          isEditMode
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 font-bold'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                        title="Derslere tıklayarak not ekleme / düzenleme modunu aç/kapat"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>{isEditMode ? 'Düzenleme Açık' : 'Not Ekle / Düzenle'}</span>
                      </button>

                      <button
                        onClick={handleExportVisualizerPNG}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PNG Kaydet</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-all cursor-pointer shadow-2xs"
                        title="Yazdır"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Yazdır</span>
                      </button>

                      <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-all cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span>Yeni Belge</span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleVisualizerPdfUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Düzenle Modu Aktif Bilgilendirme ve Özelleştirme Çubuğu */}
                  {isEditMode && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs animate-fade-in no-print">
                      <div className="flex items-center gap-2 font-medium">
                        <Pencil className="w-4 h-4 text-amber-600 shrink-0" />
                        <span><strong>Düzenle Modu Aktif:</strong> Bilgileri veya notu değiştirmek için tablodaki derse tıklayın.</span>
                      </div>

                      <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Font Seçenekleri */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-600 mr-0.5">Yazı Tipi:</span>
                          <button
                            type="button"
                            onClick={() => handleChangeFontFamily('default')}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                              scheduleFontFamily === 'default' ? 'bg-[#002855] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Default (Orijinal düzen - Başlıklar sans, kod/saat mono)"
                          >
                            Default
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChangeFontFamily('inter')}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                              scheduleFontFamily === 'inter' ? 'bg-[#002855] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Modern (Inter Sans - Temiz ve kurumsal)"
                          >
                            Modern
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChangeFontFamily('lora')}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-serif font-semibold transition-all cursor-pointer ${
                              scheduleFontFamily === 'lora' ? 'bg-[#002855] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Zarif (Lora Serif - Prestijli akademik tırnaklı)"
                          >
                            Zarif
                          </button>
                          <button
                            type="button"
                            onClick={() => handleChangeFontFamily('mono')}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                              scheduleFontFamily === 'mono' ? 'bg-[#002855] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Kod (JetBrains Mono - Temiz teknik mono)"
                          >
                            Kod
                          </button>
                        </div>

                        {/* Yazı Boyutu A- / A+ */}
                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-amber-300 shadow-2xs">
                          <span className="text-[11px] font-bold text-slate-600 mr-0.5">Boyut:</span>
                          <button
                            type="button"
                            onClick={() => handleChangeFontScale(Math.max(0.8, Math.round((scheduleFontScale - 0.1) * 10) / 10))}
                            disabled={scheduleFontScale <= 0.8}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold rounded text-[11px] transition-all cursor-pointer"
                            title="Yazıları Küçült"
                          >
                            A-
                          </button>
                          <span className="font-mono text-[11px] font-bold text-slate-800 px-1 min-w-[36px] text-center">
                            %{Math.round(scheduleFontScale * 100)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleChangeFontScale(Math.min(1.4, Math.round((scheduleFontScale + 0.1) * 10) / 10))}
                            disabled={scheduleFontScale >= 1.4}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 font-bold rounded text-[11px] transition-all cursor-pointer"
                            title="Yazıları Büyüt"
                          >
                            A+
                          </button>
                        </div>

                        {/* Sıfırla Butonu */}
                        <button
                          type="button"
                          onClick={handleResetChanges}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 hover:border-rose-300 font-semibold rounded-lg transition-all text-[11px] shrink-0 shadow-2xs cursor-pointer flex items-center gap-1.5"
                          title="Tüm ders düzenlemelerini, notları ve yazı tipi ayarlarını orijinal PDF haline sıfırlar"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Değişiklikleri Sıfırla</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setIsEditMode(false)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-all text-[11px] shrink-0 shadow-2xs cursor-pointer"
                        >
                          Düzenlemeyi Bitir
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Özet Göstergeleri */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap text-xs text-slate-600">
                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      Kayıtlı Ders: <strong className="text-slate-900 font-mono">{visualizerData.courses_summary?.length || 0}</strong>
                    </span>

                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Haftalık Toplam: <strong className="text-slate-900 font-mono">
                        {getTotalWeeklyHours(visualizerData.courses_summary)}
                      </strong> Saat
                    </span>

                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      Derslikler: <strong className="text-slate-900 font-medium">
                        {Array.from(new Set(visualizerData.courses_summary?.flatMap((c: any) => c.classrooms || []) || [])).join(', ') || 'Belirtilmedi'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* GÖRÜNÜM 1: HAFTALIK AKADEMİK ÇİZELGE (A4 & PNG ÇIKTISI) */}
                {visualizerViewMode === 'table' && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 overflow-x-auto">
                    <div
                      id="visualizer-a4-document"
                      ref={visualizerScheduleRef}
                      className={`a4-print-target bg-white text-slate-900 p-6 space-y-3 w-full mx-auto rounded-none border-0 transition-all ${getDocFontClass()}`}
                      style={{
                        minWidth: '980px',
                        maxWidth: '1120px',
                      }}
                    >
                      {/* Resmi Kurumsal Belge Başlığı */}
                      <div className="border-b border-slate-300 pb-2.5 flex items-center justify-between">
                        <div className="space-y-0.5 min-w-[200px]">
                          <h2 className="font-black text-sm tracking-wide uppercase text-slate-950">
                            YILDIZ TEKNİK ÜNİVERSİTESİ
                          </h2>
                          <h3 className="text-xs font-semibold text-slate-600">
                            Ders Programı - Gönüllü Proje
                          </h3>
                        </div>

                        {visualizerData?.courses_summary?.some((c: any) => c.code === "HAZIRLIK") && selectedPrepClass && (
                          <div className="text-center px-4 flex flex-col items-center justify-center">
                            <span className="text-[9px] font-bold tracking-[0.25em] text-slate-500 uppercase mb-0.5">
                              İNGİLİZCE HAZIRLIK
                            </span>
                            <span className="font-black text-xl text-[#002855] tracking-tight leading-none">
                              {selectedPrepClass.replace('/', ' / ')}
                            </span>
                          </div>
                        )}

                        {visualizerData.term && (
                          <div className="min-w-[200px] flex justify-end">
                            <div className="text-right text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                              <p className="text-slate-700 text-[11px] font-mono font-semibold">
                                {visualizerData.term.trim()} Yarıyılı
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Resmi Tablo Gövdesi */}
                      <table className="w-full border-collapse text-xs select-none table-fixed border border-slate-300">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-700 bg-slate-100">
                            <th className="p-2 w-24 text-center font-bold text-[11.5px] border-r border-slate-300 uppercase tracking-wider">
                              Saat
                            </th>
                            {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'].map((day, dIdx) => (
                              <th
                                key={day}
                                className={`p-2 text-center font-bold text-[12.5px] border-r border-slate-300 uppercase tracking-wider text-slate-800 ${
                                  dIdx === 4 ? 'border-r-0' : ''
                                }`}
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const isPrep = visualizerData.courses_summary?.some((c: any) => c.code === "HAZIRLIK");
                            const VISUALIZER_HOURS = isPrep ? [
                              { start: '07:30', end: '08:15' },
                              { start: '08:30', end: '09:15' },
                              { start: '09:30', end: '10:15' },
                              { start: '10:30', end: '11:15' },
                              { start: '11:30', end: '12:15' },
                              { start: '12:15', end: '13:15', isBreak: true, label: 'ÖĞLE ARASI' },
                              { start: '13:15', end: '14:00' },
                              { start: '14:15', end: '15:00' },
                              { start: '15:15', end: '16:00' }
                            ] : [
                              { start: '08:00', end: '08:50' },
                              { start: '09:00', end: '09:50' },
                              { start: '10:00', end: '10:50' },
                              { start: '11:00', end: '11:50' },
                              { start: '12:00', end: '12:50' },
                              { start: '13:00', end: '13:50' },
                              { start: '14:00', end: '14:50' },
                              { start: '15:00', end: '15:50' },
                              { start: '16:00', end: '16:50' },
                              { start: '17:00', end: '17:50' },
                              { start: '18:00', end: '18:50' },
                              { start: '19:00', end: '19:50' },
                              { start: '20:00', end: '20:50' }
                            ];

                            const VIS_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

                            const toMinutes = (timeStr: string) => {
                              const parts = timeStr.replace('.', ':').split(':');
                              return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                            };

                            // Sade, Kurumsal ve Baskıya Uygun Ofis Renk Paletleri (Açık Kağıt Üzerinde, Canlı ve Ayırt Edici)
                            // Birbirine benzeyen tonlar (indigo, sky, violet) çıkarılarak net 10 renk bırakılmıştır.
                            const CLEAN_OFFICE_PALETTES = [
                              { bg: 'bg-blue-50/90', border: 'border-blue-200/90', text: 'text-blue-950', accent: 'text-blue-700', badge: 'bg-white text-blue-800 border-blue-200' },
                              { bg: 'bg-emerald-50/90', border: 'border-emerald-200/90', text: 'text-emerald-950', accent: 'text-emerald-800', badge: 'bg-white text-emerald-800 border-emerald-200' },
                              { bg: 'bg-rose-50/90', border: 'border-rose-200/90', text: 'text-rose-950', accent: 'text-rose-800', badge: 'bg-white text-rose-800 border-rose-200' },
                              { bg: 'bg-amber-50/90', border: 'border-amber-200/90', text: 'text-amber-950', accent: 'text-amber-800', badge: 'bg-white text-amber-800 border-amber-200' },
                              { bg: 'bg-purple-50/90', border: 'border-purple-200/90', text: 'text-purple-950', accent: 'text-purple-800', badge: 'bg-white text-purple-800 border-purple-200' },
                              { bg: 'bg-teal-50/90', border: 'border-teal-200/90', text: 'text-teal-950', accent: 'text-teal-800', badge: 'bg-white text-teal-800 border-teal-200' },
                              { bg: 'bg-orange-50/90', border: 'border-orange-200/90', text: 'text-orange-950', accent: 'text-orange-800', badge: 'bg-white text-orange-800 border-orange-200' },
                              { bg: 'bg-cyan-50/90', border: 'border-cyan-200/90', text: 'text-cyan-950', accent: 'text-cyan-800', badge: 'bg-white text-cyan-800 border-cyan-200' },
                              { bg: 'bg-fuchsia-50/90', border: 'border-fuchsia-200/90', text: 'text-fuchsia-950', accent: 'text-fuchsia-800', badge: 'bg-white text-fuchsia-800 border-fuchsia-200' },
                              { bg: 'bg-lime-50/90', border: 'border-lime-200/90', text: 'text-lime-950', accent: 'text-lime-800', badge: 'bg-white text-lime-800 border-lime-200' },
                            ];

                            const MONOCHROME_PALETTE = {
                              bg: 'bg-slate-100',
                              border: 'border-slate-300',
                              text: 'text-slate-900',
                              accent: 'text-slate-950 font-bold',
                              badge: 'bg-white text-slate-900 border-slate-300 font-semibold'
                            };

                            const activePalettes = isPrep 
                              ? CLEAN_OFFICE_PALETTES.filter(p => !p.bg.includes('amber') && !p.bg.includes('orange'))
                              : CLEAN_OFFICE_PALETTES;

                            const getCourseColor = (code: string, instructor?: string) => {
                              if (visualizerColorMode === 'monochrome') {
                                return MONOCHROME_PALETTE;
                              }
                              
                              const colorKey = instructor && instructor.trim() ? instructor.trim() : code;
                              
                              // Tabloda var olan eşsiz hoca/ders sayısına göre sırayla dağıt (çakışmayı önler)
                              const idx = uniqueColorKeysForSchedule.indexOf(colorKey);
                              if (idx !== -1) {
                                return activePalettes[idx % activePalettes.length];
                              }
                              
                              // Fallback hash
                              let hash = 0;
                              for (let i = 0; i < colorKey.length; i++) {
                                hash = colorKey.charCodeAt(i) + ((hash << 5) - hash);
                              }
                              return activePalettes[Math.abs(hash) % activePalettes.length];
                            };

                            const grid: Record<string, Record<number, any>> = {};
                            VIS_DAYS.forEach(d => { grid[d] = {}; });

                            VIS_DAYS.forEach(day => {
                              const items = visualizerData.schedule[day] || [];
                              items.forEach((it: any) => {
                                const startM = toMinutes(it.start_time);
                                const endM = toMinutes(it.end_time);

                                VISUALIZER_HOURS.forEach((hrSlot, hrIdx) => {
                                  if ((hrSlot as any).isBreak) return;
                                  const hrM = toMinutes(hrSlot.start);
                                  if (hrM >= startM && hrM < endM) {
                                    grid[day][hrIdx] = it;
                                  }
                                });
                              });
                            });

                            const skipCells: Record<string, Set<number>> = {};
                            VIS_DAYS.forEach(d => { skipCells[d] = new Set(); });

                            const SLOT_HEIGHT = 54;

                            return VISUALIZER_HOURS.map((hrSlot: any, hrIdx) => {
                              if (hrSlot.isBreak) {
                                return (
                                  <tr key={hrSlot.start} className="border-b border-slate-300" style={{ height: `${Math.round(SLOT_HEIGHT * 0.7)}px` }}>
                                    <td
                                      className="p-1 border-r border-slate-300 text-center font-mono text-[11px] font-medium text-slate-600 bg-slate-50 align-middle whitespace-nowrap"
                                      style={{ height: `${Math.round(SLOT_HEIGHT * 0.7)}px` }}
                                    >
                                      {hrSlot.start} - {hrSlot.end}
                                    </td>
                                    <td colSpan={5} className="p-1 bg-amber-50/70 border-amber-200 text-amber-700 text-center uppercase h-full relative">
                                      <div className="flex items-center justify-center gap-2 w-full h-full">
                                        <span className="font-bold text-xs tracking-[0.2em]">{hrSlot.label}</span>
                                        <span className="font-normal text-xs tracking-normal opacity-90">
                                          ({hrSlot.start} - {hrSlot.end})
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              const hourLabel = `${hrSlot.start} - ${hrSlot.end}`;

                              return (
                                <tr key={hrSlot.start} className="border-b border-slate-300" style={{ height: `${SLOT_HEIGHT}px` }}>
                                  <td
                                    className="p-1 border-r border-slate-300 text-center font-mono text-[11px] font-medium text-slate-600 bg-slate-50 align-middle whitespace-nowrap"
                                    style={{ height: `${SLOT_HEIGHT}px` }}
                                  >
                                    {hourLabel}
                                  </td>

                                  {VIS_DAYS.map((day, dayIdx) => {
                                    if (skipCells[day].has(hrIdx)) return null;

                                    const it = grid[day][hrIdx];
                                    const isLastCol = dayIdx === 4;

                                    if (!it) {
                                      return (
                                        <td
                                          key={day}
                                          style={{ height: `${SLOT_HEIGHT}px` }}
                                          className={`p-0.5 border-r border-slate-300 align-top ${
                                            isLastCol ? 'border-r-0' : ''
                                          }`}
                                        />
                                      );
                                    }

                                    let span = 1;
                                    while (
                                      hrIdx + span < VISUALIZER_HOURS.length &&
                                      grid[day][hrIdx + span]?.code === it.code &&
                                      grid[day][hrIdx + span]?.section === it.section &&
                                      grid[day][hrIdx + span]?.classroom === it.classroom &&
                                      grid[day][hrIdx + span]?.instructor === it.instructor
                                    ) {
                                      skipCells[day].add(hrIdx + span);
                                      span++;
                                    }

                                    const displayEndTime = grid[day][hrIdx + span - 1]?.end_time || it.end_time;

                                    const palette = getCourseColor(it.code, it.instructor);

                                    const formatClassroomLabel = (cr: string, isLab: boolean) => {
                                      if (!cr) return 'Derslik';
                                      const clean = cr
                                        .replace(/Davutpaşa Diğer/gi, 'D.Paşa Diğer')
                                        .replace(/Davutpaşa/gi, 'D.Paşa');
                                      return isLab ? `LAB (${clean})` : clean;
                                    };

                                    const isOnline = Boolean(
                                      it.is_online ||
                                      (it.classroom && /sanal|online|uzaktan|uzem/i.test(it.classroom)) ||
                                      (it.name && /uzaktan/i.test(it.name))
                                    );

                                    const isMonochrome = visualizerColorMode === 'monochrome';
                                    const noteText = courseNotes[it.code];
                                    const instInfo = getInstructorAbbreviation(it.instructor);

                                    return (
                                      <td
                                        key={day}
                                        rowSpan={span}
                                        style={{ height: `${span * SLOT_HEIGHT}px` }}
                                        className={`p-0.5 border-r border-slate-300 align-top h-full ${
                                          isLastCol ? 'border-r-0' : ''
                                        }`}
                                      >
                                        <div
                                          onClick={() => {
                                            if (isEditMode) handleOpenEditModal(it);
                                          }}
                                          className={`h-full w-full p-2 rounded border ${palette.bg} ${palette.border} flex flex-col justify-between ${
                                            span === 1 ? 'space-y-0.5' : 'space-y-1.5'
                                          } transition-all shadow-xs overflow-hidden relative ${
                                            isEditMode
                                              ? 'cursor-pointer ring-2 ring-amber-400 ring-offset-1 hover:brightness-95 hover:shadow-md'
                                              : ''
                                          }`}
                                        >
                                          <div className="space-y-1 min-w-0">
                                            {/* Başlık, Şube Bilgisi, Düzenle ve Online Simgeleri */}
                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                              <span
                                                style={{ fontSize: `${Math.round(12 * scheduleFontScale)}px` }}
                                                className={`font-mono font-bold whitespace-nowrap ${palette.accent}`}
                                              >
                                                {it.code} {showSection && it.section ? `(Şb. ${it.section})` : ''}
                                              </span>

                                              <div className="flex items-center gap-1 shrink-0">
                                                {isEditMode && (
                                                  <span
                                                    className="p-0.5 rounded bg-amber-400 text-slate-950 text-[9px] shadow-2xs font-bold leading-none"
                                                    title="Not Ekle / Düzenle"
                                                  >
                                                    ✏️
                                                  </span>
                                                )}

                                                {isOnline && (
                                                  <span
                                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-mono shrink-0 shadow-2xs ${
                                                      isMonochrome
                                                        ? 'bg-white border-slate-300 text-slate-800'
                                                        : 'bg-rose-50/80 border-rose-300 text-rose-600'
                                                    }`}
                                                    title="Online / Sanal Ders"
                                                  >
                                                    <span
                                                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                        isMonochrome ? 'bg-slate-700' : 'bg-rose-500 animate-pulse'
                                                      }`}
                                                    />
                                                    <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                                                      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                                    </svg>
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Ders Adı */}
                                            <h4
                                              style={{ fontSize: `${Math.round(11 * scheduleFontScale)}px`, lineHeight: 1.25 }}
                                              className={`font-semibold ${palette.text} break-words whitespace-normal leading-snug`}
                                            >
                                              {it.name}
                                            </h4>

                                            {/* Not Kısmı: Ders Adı ile Saat/Derslik Arasında */}
                                            {showNotes && (
                                              noteText ? (
                                                <div
                                                  onClick={(e) => {
                                                    if (isEditMode) {
                                                      e.stopPropagation();
                                                      handleOpenEditModal(it);
                                                    }
                                                  }}
                                                  style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-semibold max-w-full shadow-2xs ${
                                                    isEditMode ? 'cursor-pointer hover:bg-amber-200/90' : ''
                                                  } ${
                                                    isMonochrome
                                                      ? 'bg-white border-slate-300 text-slate-800'
                                                      : 'bg-amber-100/90 border-amber-300 text-amber-950'
                                                  }`}
                                                  title={`Not: ${noteText}`}
                                                >
                                                  <span className="shrink-0">📌</span>
                                                  <span className="truncate max-w-[130px]">{noteText}</span>
                                                </div>
                                              ) : isEditMode ? (
                                                <div
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditModal(it);
                                                  }}
                                                  style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-amber-400 bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 font-medium cursor-pointer transition-colors max-w-full shadow-2xs"
                                                  title="Bu derse not ekle"
                                                >
                                                  <span className="text-[9px]">✏️</span>
                                                  <span className="truncate">+ Not ekle...</span>
                                                </div>
                                              ) : null
                                            )}
                                          </div>

                                          {/* Alt Bilgi: Saat, Derslik Rozeti ve Hoca Kısaltması */}
                                          <div className="pt-1 border-t border-slate-200/80 text-slate-600 space-y-1 min-w-0">
                                            <p
                                              style={{ fontSize: `${Math.round(9.5 * scheduleFontScale)}px` }}
                                              className="font-mono text-slate-500 font-medium whitespace-nowrap"
                                            >
                                              {it.start_time} - {displayEndTime}
                                            </p>

                                            <div className="flex items-center gap-1 flex-wrap">
                                              {it.classroom ? (
                                                <div
                                                  style={{ fontSize: `${Math.round(10.5 * scheduleFontScale)}px` }}
                                                  className={`inline-block px-1.5 py-0.5 rounded-md border font-mono font-bold shadow-2xs whitespace-nowrap shrink-0 ${palette.badge}`}
                                                >
                                                  <span>
                                                    {formatClassroomLabel(it.classroom, it.is_lab)}
                                                  </span>
                                                </div>
                                              ) : null}

                                              {showInstructor && it.instructor ? (
                                                <div
                                                  style={{ fontSize: `${Math.round(10.5 * scheduleFontScale)}px` }}
                                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-mono font-bold shadow-2xs whitespace-nowrap shrink-0 ${palette.badge}`}
                                                >
                                                  <span className="text-[9.5px]">👤</span>
                                                  <span>{it.instructor.trim()}</span>
                                                </div>
                                              ) : null}
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* GÖRÜNÜM 2: GÜNLÜK DERS DAĞILIMI */}
                {visualizerViewMode === 'cards' && (
                  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${getDocFontClass()}`}>
                    {['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'].map(day => {
                      const dayItems = visualizerData.schedule[day] || [];
                      if (dayItems.length === 0) return null;

                      return (
                        <div key={day} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 text-slate-900">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                              {day}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-700 font-mono font-semibold">
                              {dayItems.length} Ders
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {dayItems.map((it: any, idx: number) => {
                              const noteText = courseNotes[it.code];
                              const instInfo = getInstructorAbbreviation(it.instructor);

                              return (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (isEditMode) handleOpenEditModal(it);
                                  }}
                                  className={`p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs ${
                                    isEditMode ? 'cursor-pointer ring-2 ring-amber-400 ring-offset-1 hover:brightness-95' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span
                                      style={{ fontSize: `${Math.round(12 * scheduleFontScale)}px` }}
                                      className="font-mono font-bold text-blue-700 whitespace-nowrap"
                                    >
                                      {it.code} {showSection && it.section ? `(Şb. ${it.section})` : ''}
                                    </span>
                                    <div className="flex items-center gap-1 flex-wrap">
                                      {it.classroom && (
                                        <span
                                          style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                          className="font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 whitespace-nowrap shrink-0 font-medium"
                                        >
                                          {it.classroom}
                                        </span>
                                      )}
                                      {showInstructor && it.instructor && (
                                        <span
                                          style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                          className="font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-800 whitespace-nowrap shrink-0 font-bold flex items-center gap-1"
                                        >
                                          <span>👤</span>
                                          <span>{it.instructor.trim()}</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <h4
                                    style={{ fontSize: `${Math.round(12 * scheduleFontScale)}px` }}
                                    className="font-semibold text-slate-900"
                                  >
                                    {it.name}
                                  </h4>

                                  {showNotes && noteText && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditModal(it);
                                      }}
                                      style={{ fontSize: `${Math.round(10.5 * scheduleFontScale)}px` }}
                                      className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-medium flex items-center gap-1 cursor-pointer"
                                    >
                                      <span className="shrink-0">📌</span>
                                      <span className="truncate">{noteText}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                                    <span className="font-mono text-slate-600 font-medium">
                                      {it.start_time} - {it.end_time}
                                    </span>
                                    {it.is_lab && <span className="text-[10px] text-emerald-600 font-bold">Laboratuvar</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* GÖRÜNÜM 3: DERSLİK VE DERS LİSTESİ */}
                {visualizerViewMode === 'summary' && (
                  <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900 ${getDocFontClass()}`}>
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#002855]" />
                        Kayıtlı Dersler, Öğretim Üyeleri ve Derslik Dağılımı Dökümü
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Ders kodları, hocalar, şubeler, derslik ortamları ve özel notlar listesi</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-800 border-collapse border border-slate-200">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px] bg-slate-100">
                            <th className="p-2.5">Ders Kodu</th>
                            <th className="p-2.5">Ders Adı</th>
                            <th className="p-2.5">Şube</th>
                            <th className="p-2.5">Öğr. Üyesi / Kısaltma</th>
                            <th className="p-2.5">Derslik / Ortam</th>
                            <th className="p-2.5">Ders Saatleri</th>
                            <th className="p-2.5">Özel Not</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visualizerData.courses_summary?.map((c: any, idx: number) => {
                            const noteText = courseNotes[c.code];

                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                                  {c.code}
                                </td>
                                <td className="p-2.5 font-medium text-slate-900">
                                  {c.name}
                                </td>
                                <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">
                                  Şb. {c.section}
                                </td>
                                <td className="p-2.5 whitespace-nowrap font-mono text-slate-800">
                                  {c.instructor ? (
                                    <span className="font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                                      {c.instructor}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">-</span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {c.classrooms?.map((cr: string, cidx: number) => (
                                      <span
                                        key={cidx}
                                        className="px-2 py-0.5 rounded border text-[11px] font-mono bg-slate-50 border-slate-300 text-slate-700"
                                      >
                                        {cr}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-2.5 font-mono text-slate-600">
                                  <div className="space-y-0.5">
                                    {c.time_slots?.map((ts: any, tidx: number) => (
                                      <div key={tidx} className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700">{ts.day}:</span>
                                        <span>{ts.start_time} - {ts.end_time}</span>
                                        {ts.is_lab && <span className="text-[10px] text-emerald-600 font-bold">(Lab)</span>}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  {noteText ? (
                                    <button
                                      onClick={() => handleOpenEditModal(c)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-[10.5px] font-medium text-left max-w-xs cursor-pointer"
                                    >
                                      <span>📌</span>
                                      <span className="truncate">{noteText}</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleOpenEditModal(c)}
                                      className="text-[11px] text-slate-400 hover:text-blue-600 underline cursor-pointer"
                                    >
                                      + Not Ekle
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
      </main>

      {/* DERS BİLGİLERİ VE NOT DÜZENLEME MODALI */}
      {editingCourse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className={`bg-white rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 relative ${getDocFontClass()}`}>
            <button
              onClick={() => setEditingCourse(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Başlık */}
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-[#002855]">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Ders Bilgilerini Düzenle & Not Ekle
                </h3>
                <p className="text-[11.5px] text-slate-500">
                  Ders kodunu, dersliğini, hocasını veya ismini güncelleyebilir, programa not ekleyebilirsiniz.
                </p>
              </div>
            </div>

            {/* Düzenlenebilir Ders Alanları */}
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ders Kodu
                  </label>
                  <input
                    type="text"
                    value={editingCourseForm.code}
                    onChange={(e) => setEditingCourseForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="Örn: BLM1011"
                    className="w-full text-xs font-mono font-semibold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#002855] focus:ring-1 focus:ring-[#002855] focus:outline-none uppercase"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Şube (Grup)
                  </label>
                  <input
                    type="text"
                    value={editingCourseForm.section}
                    onChange={(e) => setEditingCourseForm(prev => ({ ...prev, section: e.target.value }))}
                    placeholder="Örn: 1 veya A"
                    className="w-full text-xs font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#002855] focus:ring-1 focus:ring-[#002855] focus:outline-none"
                  />
                </div>
                <div className="col-span-5">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Hoca Kısaltması</span>
                    <span className="text-[10px] text-slate-400 font-normal">(👤)</span>
                  </label>
                  <input
                    type="text"
                    value={editingCourseForm.instructor}
                    onChange={(e) => setEditingCourseForm(prev => ({ ...prev, instructor: e.target.value }))}
                    placeholder="Örn: ACK, MEK"
                    className="w-full text-xs font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#002855] focus:ring-1 focus:ring-[#002855] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-8">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ders Adı
                  </label>
                  <input
                    type="text"
                    value={editingCourseForm.name}
                    onChange={(e) => setEditingCourseForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Dersin tam veya kısa adı"
                    className="w-full text-xs font-medium text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#002855] focus:ring-1 focus:ring-[#002855] focus:outline-none"
                  />
                </div>
                <div className="col-span-4">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Derslik
                  </label>
                  <input
                    type="text"
                    value={editingCourseForm.classroom}
                    onChange={(e) => setEditingCourseForm(prev => ({ ...prev, classroom: e.target.value }))}
                    placeholder="Örn: D-201, Lab 3"
                    className="w-full text-xs font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#002855] focus:ring-1 focus:ring-[#002855] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Not Giriş Alanı */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-amber-500" />
                <span>Bu Derse Özel Not / Hatırlatıcı (Programda Gözükür):</span>
              </label>
              <textarea
                rows={2}
                value={editingCourseForm.note}
                onChange={(e) => setEditingCourseForm(prev => ({ ...prev, note: e.target.value }))}
                placeholder="Örn: Vize %40, Proje %30 | Yoklama zorunlu | Teams kodu: abc123"
                className="w-full text-xs text-slate-900 p-2.5 rounded-xl border border-slate-300 focus:border-[#002855] focus:ring-1 focus:ring-[#002855] focus:outline-none transition-all placeholder:text-slate-400"
              />

              {/* Hızlı Not Şablonları */}
              <div className="space-y-1">
                <span className="text-[10.5px] font-medium text-slate-500">Hızlı Ekle:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Lablar 2 haftada bir',
                    'Uygulama saati',
                    'Ekipman ile gel',
                    'Yoklama zorunlu',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setEditingCourseForm(prev => ({
                          ...prev,
                          note: prev.note ? `${prev.note} | ${tag}` : tag,
                        }));
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-all cursor-pointer border border-slate-200"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alt Butonlar */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <div>
                {(courseNotes[editingCourseForm.originalCode] || editingCourseForm.note) && (
                  <button
                    type="button"
                    onClick={handleDeleteNoteFromForm}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Notu Temizle</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-all cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSaveCourseForm}
                  className="px-4 py-2 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            YTÜ Dostun — Gönüllü Öğrenci Projesi
          </p>
          <p className="text-[11px] text-slate-400">
            <a
              href="https://github.com/atillacirak"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 hover:underline transition-colors"
            >
              github.com/atillacirak
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
