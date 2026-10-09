"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Trash2, BookOpen, Upload, RefreshCw, Calendar, ShieldCheck, Check, X, CalendarDays, Coffee, ChevronLeft, ChevronRight, Copy
} from 'lucide-react';
import { extractMetadataFromPngArrayBuffer } from '../../utils/pngMetadata';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

interface AbsenceCourse {
  id: string;
  code: string;
  name: string;
  calcMode: 'weekly' | 'total';
  weeklyDays: number;
  courseWeeks: number;
  totalDays: number;
  absences: number; // Manual
  requirementPercent: number;
  requirementMode?: 'percent' | 'days' | 'limit';
  requirementDays?: number;
  absenceLimit?: number;
  scheduleDays?: string[];
  attendanceRecords?: Record<string, 'present' | 'absent' | 'holiday'>; 
  frequency?: number;
  frequencyOffset?: number;
}

interface AbsenceSettings {
  totalWeeks: number;
  defaultRequirementPercent: number;
  semesterStartDate: string;
}

const DEFAULT_SETTINGS: AbsenceSettings = {
  totalWeeks: 13,
  defaultRequirementPercent: 70,
  semesterStartDate: '2026-09-28'
};

const CalendarModal = ({ 
  course, 
  settings, 
  onClose, 
  onSave 
}: { 
  course: AbsenceCourse, 
  settings: AbsenceSettings, 
  onClose: () => void, 
  onSave: (records: Record<string, 'present' | 'absent' | 'holiday'>) => void 
}) => {
  const [viewDate, setViewDate] = useState<Date>(
    settings.semesterStartDate ? new Date(settings.semesterStartDate) : new Date()
  );
  const [localRecords, setLocalRecords] = useState<Record<string, 'present' | 'absent' | 'holiday'>>(
    course.attendanceRecords ? { ...course.attendanceRecords } : {}
  );

  const toggleLocalRecord = (recordKey: string) => {
    setLocalRecords(prev => {
      const recs = { ...prev };
      const current = recs[recordKey];
      if (!current) {
        recs[recordKey] = 'present';
      } else if (current === 'present') {
        recs[recordKey] = 'absent';
      } else if (current === 'absent') {
        recs[recordKey] = 'holiday';
      } else {
        delete recs[recordKey];
      }
      return recs;
    });
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let firstDay = new Date(year, month, 1).getDay();
  firstDay = firstDay === 0 ? 6 : firstDay - 1; 

  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

  const start = new Date(settings.semesterStartDate);
  start.setHours(0,0,0,0);
  const diffToMonday = start.getDay() === 0 ? 6 : start.getDay() - 1;
  start.setDate(start.getDate() - diffToMonday); 
  
  const end = new Date(start);
  end.setDate(end.getDate() + (course.courseWeeks * 7) - 1);
  end.setHours(23,59,59,999);

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} className="h-14 bg-transparent"></div>);
  }

  const freq = course.frequency || 1;
  const offset = course.frequencyOffset || 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    cellDate.setHours(12,0,0,0); 
    
    const inSemester = cellDate >= start && cellDate <= end;
    const cellDayName = dayNames[cellDate.getDay() === 0 ? 6 : cellDate.getDay() - 1];
    
    let matchesFrequency = true;
    if (inSemester) {
      const cellStartOfDay = new Date(cellDate);
      cellStartOfDay.setHours(0,0,0,0);
      const msDiff = cellStartOfDay.getTime() - start.getTime();
      const weekNum = Math.floor(msDiff / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      if (weekNum <= offset || (weekNum - 1 - offset) % freq !== 0) {
        matchesFrequency = false;
      }
    }

    const isCourseDay = inSemester && matchesFrequency && course.scheduleDays?.includes(cellDayName);

    const recordKey = cellDate.toISOString().split('T')[0];
    const state = localRecords[recordKey];

    let cellClass = "border border-transparent text-slate-400";
    let content = <span className="text-sm font-medium">{d}</span>;

    if (isCourseDay) {
      if (state === 'present') {
        cellClass = "border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm";
        content = (
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold opacity-70 mb-0.5">{d}</span>
            <Check size={18} className="stroke-[3]" />
          </div>
        );
      } else if (state === 'absent') {
        cellClass = "border-red-500 bg-red-50 text-red-600 shadow-sm";
        content = (
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold opacity-70 mb-0.5">{d}</span>
            <X size={18} className="stroke-[3]" />
          </div>
        );
      } else if (state === 'holiday') {
        cellClass = "border-amber-500 bg-amber-50 text-amber-600 shadow-sm";
        content = (
          <div className="flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] font-bold opacity-70 mb-0.5">{d}</span>
            <Coffee size={16} className="stroke-[2.5]" />
          </div>
        );
      } else {
        cellClass = "border-slate-200 bg-white hover:border-[#0c3f79] hover:text-[#0c3f79] text-slate-800 shadow-sm";
        content = (
           <div className="flex flex-col items-center justify-center w-full h-full pointer-events-none">
             <span className="text-sm font-bold">{d}</span>
             <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1"></div>
           </div>
        );
      }
    } else {
      if (inSemester) {
        cellClass = "text-slate-300";
      } else {
        cellClass = "text-slate-200 opacity-50";
      }
    }

    cells.push(
      <button
        key={d}
        disabled={!isCourseDay}
        onClick={() => toggleLocalRecord(recordKey)}
        className={`h-14 rounded-xl flex items-center justify-center ${cellClass}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="pr-2">
            <h3 className="font-bold text-slate-900 text-base leading-tight line-clamp-1">{course.name}</h3>
            <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
              <CalendarDays size={12} /> Aylık Yoklama Takvimi
            </p>
          </div>
          <button 
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto flex-1 bg-white">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <button 
                onClick={() => {
                  const newDate = new Date(viewDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setViewDate(newDate);
                }}
                disabled={year < start.getFullYear() || (year === start.getFullYear() && month <= start.getMonth())}
                className={`p-2 rounded-full transition-colors ${year < start.getFullYear() || (year === start.getFullYear() && month <= start.getMonth()) ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                <ChevronLeft size={20} />
              </button>
              <h4 className="font-bold text-slate-800 text-lg">
                {monthNames[month]} {year}
              </h4>
              <button 
                onClick={() => {
                  const newDate = new Date(viewDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setViewDate(newDate);
                }}
                disabled={year > end.getFullYear() || (year === end.getFullYear() && month >= end.getMonth())}
                className={`p-2 rounded-full transition-colors ${year > end.getFullYear() || (year === end.getFullYear() && month >= end.getMonth()) ? 'opacity-30 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 text-slate-700'}`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div>
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase">
                <div>Pzt</div><div>Sal</div><div>Çar</div><div>Per</div><div>Cum</div><div>Cmt</div><div>Paz</div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {cells}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
            <div className="flex items-center justify-between gap-1 text-[10px] font-semibold text-slate-600 mb-4 px-1">
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-emerald-50 border border-emerald-500 text-emerald-600 flex items-center justify-center"><Check size={12} className="stroke-[3]"/></div> Gittim</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-red-50 border border-red-500 text-red-600 flex items-center justify-center"><X size={12} className="stroke-[3]"/></div> Devamsız</div>
              <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-amber-50 border border-amber-500 text-amber-600 flex items-center justify-center"><Coffee size={12} className="stroke-[2.5]"/></div> Tatil / Yoklama Alınmadı</div>
            </div>
            <button 
            onClick={() => onSave(localRecords)}
            className="w-full bg-[#0c3f79] hover:bg-[#00306a] text-white py-3 rounded-xl font-bold text-sm transition-colors shadow-sm"
          >
            Kaydet & Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AbsencePage() {
  const [courses, setCourses] = useState<AbsenceCourse[]>([]);
  const [settings, setSettings] = useState<AbsenceSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUploadingSchedule, setIsUploadingSchedule] = useState(false);
  const [calendarModalCourse, setCalendarModalCourse] = useState<AbsenceCourse | null>(null);

  const scheduleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const savedCourses = localStorage.getItem('ytu_absence_courses');
      if (savedCourses) {
        const parsed = JSON.parse(savedCourses);
        const seenIds = new Set<string>();
        const migrated = parsed.map((c: any) => {
          let uniqueId = c.id;
          if (!uniqueId || seenIds.has(uniqueId)) {
            uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
          }
          seenIds.add(uniqueId);
          return {
            ...c,
            id: uniqueId,
            calcMode: c.calcMode || 'weekly',
            weeklyDays: c.weeklyDays !== undefined ? c.weeklyDays : (c.weeklyHours || 1),
            courseWeeks: c.courseWeeks !== undefined ? c.courseWeeks : (c.totalWeeks || 13),
            totalDays: c.totalDays !== undefined ? c.totalDays : ((c.weeklyDays || 1) * 13),
            frequency: c.frequency || 1,
            frequencyOffset: c.frequencyOffset || 0
          };
        });
        setCourses(migrated);
      }
      
      const savedSettings = localStorage.getItem('ytu_absence_settings');
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
    } catch (e) {
      console.error('Error loading absence data:', e);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const timeout = setTimeout(() => {
      localStorage.setItem('ytu_absence_courses', JSON.stringify(courses));
      localStorage.setItem('ytu_absence_settings', JSON.stringify(settings));
    }, 300);
    return () => clearTimeout(timeout);
  }, [courses, settings, isLoaded]);

  const handleGlobalWeeksChange = (val: number) => {
    setSettings({...settings, totalWeeks: val});
  };

  const addManualCourse = () => {
    const newCourse: AbsenceCourse = {
      id: Math.random().toString(36).substring(2, 9),
      code: '',
      name: '',
      calcMode: 'weekly',
      weeklyDays: 1,
      courseWeeks: settings.totalWeeks,
      totalDays: 13,
      absences: 0,
      requirementPercent: settings.defaultRequirementPercent,
      frequency: 1,
      frequencyOffset: 0
    };
    setCourses([...courses, newCourse]);
  };

  const duplicateCourse = (course: AbsenceCourse) => {
    const newCourse: AbsenceCourse = {
      ...course,
      id: Math.random().toString(36).substring(2, 9),
      name: course.name ? `${course.name} (Uygulama/Lab)` : 'Yeni Ders (Lab)',
      attendanceRecords: {},
      absences: 0
    };
    setCourses([...courses, newCourse]);
  };

  const updateCourse = (id: string, field: keyof AbsenceCourse, value: any) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCourse = (id: string) => {
    if(confirm('Bu dersi silmek istediğinize emin misiniz?')) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const incrementAbsence = (id: string) => {
    setCourses(courses.map(c => c.id === id ? { ...c, absences: c.absences + 1 } : c));
  };

  const decrementAbsence = (id: string) => {
    setCourses(courses.map(c => (c.id === id && c.absences > 0) ? { ...c, absences: c.absences - 1 } : c));
  };

  const handleScheduleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSchedule(true);

    try {
      let extractedCourses: any[] = [];

      if (file.name.toLowerCase().endsWith('.png')) {
        const buffer = await file.arrayBuffer();
        const payload = extractMetadataFromPngArrayBuffer(buffer);
        
        if (payload && payload.schedule) {
          const uniqueCoursesMap = new Map();
          Object.entries(payload.schedule).forEach(([dayName, dayClasses]: [string, any]) => {
             if (Array.isArray(dayClasses)) {
                const seenInThisDay = new Set();
                dayClasses.forEach(c => {
                   const key = c.code || c.name;
                   if (!key) return;
                   if (seenInThisDay.has(key)) return;
                   seenInThisDay.add(key);

                   if (!uniqueCoursesMap.has(key)) {
                      uniqueCoursesMap.set(key, {
                        code: c.code || '',
                        name: c.code && c.name && !c.name.includes(c.code) ? `${c.name} (${c.code})` : c.name || '',
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
          extractedCourses = Array.from(uniqueCoursesMap.values());
        }
      }

      if (extractedCourses.length === 0) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/api/parse-schedule-file`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.schedule) {
            const uniqueCoursesMap = new Map();
            Object.entries(data.schedule).forEach(([dayName, dayClasses]: [string, any]) => {
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
            extractedCourses = Array.from(uniqueCoursesMap.values());
          }
        }
      }

      if (extractedCourses.length > 0) {
        const newAbsenceCourses = extractedCourses.map(c => ({
          id: Math.random().toString(36).substring(2, 9),
          code: c.code,
          name: c.name,
          calcMode: 'weekly' as const,
          weeklyDays: c.scheduleDays.length > 0 ? c.scheduleDays.length : 1,
          courseWeeks: settings.totalWeeks,
          totalDays: (c.scheduleDays.length > 0 ? c.scheduleDays.length : 1) * settings.totalWeeks,
          absences: 0,
          requirementPercent: settings.defaultRequirementPercent,
          scheduleDays: c.scheduleDays,
          frequency: 1,
          frequencyOffset: 0
        }));

        setCourses(prev => {
          const existingNames = new Set(prev.map(p => p.name));
          const filteredNew = newAbsenceCourses.filter(n => !existingNames.has(n.name));
          return [...prev, ...filteredNew];
        });
      } else {
        alert("Programdan veri çekilemedi. Geçerli bir dosya yüklediğinizden emin olun.");
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Program yüklenirken hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setIsUploadingSchedule(false);
      if (e.target) e.target.value = '';
    }
  };

  const getComputedAbsences = (course: AbsenceCourse) => {
    if (course.attendanceRecords && Object.keys(course.attendanceRecords).length > 0) {
      return Object.values(course.attendanceRecords).filter(v => v === 'absent').length;
    }
    return course.absences;
  };

  const calculateLimit = (course: AbsenceCourse) => {
    let tDays = course.totalDays;
    
    if (course.calcMode === 'weekly') {
      const freq = course.frequency || 1;
      const offset = course.frequencyOffset || 0;
      let activeWeeks = 0;
      for (let w = 1; w <= course.courseWeeks; w++) {
         if ((w - 1) >= offset && (w - 1 - offset) % freq === 0) {
            activeWeeks++;
         }
      }
      tDays = activeWeeks * course.weeklyDays;
    }
    
    const mode = course.requirementMode || 'percent';
    if (mode === 'limit') {
      return course.absenceLimit || 0;
    } else if (mode === 'days') {
      const req = course.requirementDays || 0;
      return Math.max(0, tDays - req);
    }
    
    const absenceAllowed = tDays * (1 - ((course.requirementPercent !== undefined ? course.requirementPercent : 70) / 100));
    return Math.floor(absenceAllowed);
  };

  if (!isLoaded) return <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20 relative">
      <main className="max-w-4xl mx-auto px-4 py-8">
        
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 mb-5 text-blue-900 shadow-sm items-start">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-blue-800 mb-0.5">Verileriniz Güvende!</p>
            <p className="opacity-90 leading-tight">
              Verileriniz sadece bu cihazda (localStorage) tutulur. Sayfayı kapatsanız dahi kaldığınız yerden devam edebilirsiniz.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-4 mb-5 flex flex-wrap gap-6 items-end justify-between">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Dönem Başlangıcı
              </label>
              <input 
                type="date" 
                value={settings.semesterStartDate || ''}
                onChange={e => setSettings({...settings, semesterStartDate: e.target.value})}
                className="w-36 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c3f79]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Varsayılan Hafta
              </label>
              <input 
                type="number" 
                value={settings.totalWeeks}
                onChange={e => handleGlobalWeeksChange(parseInt(e.target.value) || 13)}
                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c3f79]/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                Zorunluluk (%)
              </label>
              <input 
                type="number" 
                value={settings.defaultRequirementPercent}
                onChange={e => setSettings({...settings, defaultRequirementPercent: parseInt(e.target.value) || 70})}
                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0c3f79]/20"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".pdf,.png,.jpg,.jpeg" 
              className="hidden" 
              ref={scheduleInputRef}
              onChange={handleScheduleUpload}
            />
            <button 
              onClick={() => scheduleInputRef.current?.click()}
              disabled={isUploadingSchedule}
              className={`text-sm flex items-center gap-2 text-[#8a5611] bg-[#e7a240]/15 hover:bg-[#e7a240]/25 border border-[#e7a240]/30 px-4 py-2.5 rounded-xl transition-all font-medium ${isUploadingSchedule ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isUploadingSchedule ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploadingSchedule ? 'Okunuyor...' : 'Programdan Çek'}
            </button>
            
            <button 
              onClick={addManualCourse}
              className="text-sm flex items-center gap-2 text-white bg-[#0c3f79] hover:bg-[#00306a] px-4 py-2.5 rounded-xl transition-all shadow-sm font-medium"
            >
              <Plus size={16} />
              Ders Ekle
            </button>

            {courses.length > 0 && (
              <button 
                onClick={() => {
                  if(confirm('Tüm devamsızlık kayıtlarınızı ve takvim verilerini tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
                    setCourses([]);
                  }
                }}
                className="flex items-center justify-center w-[42px] h-[42px] text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-600 rounded-xl transition-all shadow-sm border border-red-200 shrink-0"
                title="Tüm Kayıtları Temizle"
              >
                <Trash2 size={20} />
              </button>
            )}
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-slate-100">
              <BookOpen size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Devamsızlık Kaydınız Yok</h3>
            <p className="text-slate-500 max-w-sm mx-auto mb-8">
              Kendi programınızı PDF/PNG olarak yükleyerek otomatik çekebilir veya elle ders ekleyerek hemen takibe başlayabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((course) => {
              const limit = calculateLimit(course);
              const currentAbsences = getComputedAbsences(course);
              const remaining = limit - currentAbsences;
              const hasCalendarData = course.scheduleDays && course.scheduleDays.length > 0;
              const isUsingCalendar = course.attendanceRecords && Object.keys(course.attendanceRecords).length > 0;
              
              let progressPercent = 0;
              if (limit > 0) {
                progressPercent = (currentAbsences / limit) * 100;
              }
              if (progressPercent > 100) progressPercent = 100;

              let statusColor = "bg-emerald-500";
              let statusBg = "bg-emerald-50";
              let statusText = "text-emerald-700";
              
              if (remaining < 0) {
                statusColor = "bg-red-500";
                statusBg = "bg-red-50";
                statusText = "text-red-700";
              } else if (remaining <= 2) {
                statusColor = "bg-amber-500";
                statusBg = "bg-amber-50";
                statusText = "text-amber-700";
              }

              return (
                <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden flex flex-col transform translate-z-0">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <textarea 
                        value={course.name}
                        onChange={e => updateCourse(course.id, 'name', e.target.value)}
                        rows={2}
                        placeholder="Ders Adı (Kodu)"
                        className="w-full text-sm leading-snug font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-[#0c3f79] focus:outline-none transition-colors px-1 resize-none"
                      />
                      
                      <div className="flex flex-col gap-2 px-1 text-sm text-slate-600">
                        <div className="flex flex-wrap items-center gap-2">
                          <select 
                            value={course.calcMode}
                            onChange={e => updateCourse(course.id, 'calcMode', e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-[#0c3f79] focus:outline-none focus:border-[#0c3f79]"
                          >
                            <option value="weekly">Haftalık X Hafta</option>
                            <option value="total">Toplam X Gün</option>
                          </select>

                          {course.calcMode === 'weekly' ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="number"
                                value={course.weeklyDays}
                                onChange={e => updateCourse(course.id, 'weeklyDays', parseInt(e.target.value) || 0)}
                                className="w-10 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-[#0c3f79]"
                              />
                              <span className="text-xs">gün x</span>
                              <input 
                                type="number"
                                value={course.courseWeeks}
                                onChange={e => updateCourse(course.id, 'courseWeeks', parseInt(e.target.value) || 0)}
                                className="w-10 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-[#0c3f79]"
                              />
                              <span className="text-xs">hafta</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs">Toplam:</span>
                              <input 
                                type="number"
                                value={course.totalDays}
                                onChange={e => updateCourse(course.id, 'totalDays', parseInt(e.target.value) || 0)}
                                className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-[#0c3f79]"
                              />
                              <span className="text-xs">ders/gün</span>
                            </div>
                          )}
                        </div>

                        {course.calcMode === 'weekly' && (
                          <div className="flex items-center gap-2 pt-0.5 pb-1">
                            <span className="text-xs font-medium opacity-80">Sıklık:</span>
                            <select 
                              value={course.frequency || 1}
                              onChange={e => updateCourse(course.id, 'frequency', parseInt(e.target.value))}
                              className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#0c3f79] focus:outline-none focus:border-[#0c3f79]"
                            >
                               <option value={1}>Her Hafta</option>
                               <option value={2}>2 Haftada 1</option>
                               <option value={3}>3 Haftada 1</option>
                               <option value={4}>4 Haftada 1</option>
                            </select>
                            {(course.frequency || 1) > 1 && (
                              <select 
                                value={course.frequencyOffset || 0}
                                onChange={e => updateCourse(course.id, 'frequencyOffset', parseInt(e.target.value))}
                                className="bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 text-[11px] font-semibold text-orange-700 focus:outline-none focus:border-orange-400"
                              >
                                 <option value={0}>1. Hft'dan başlar</option>
                                 <option value={1}>2. Hft'dan başlar</option>
                                 {(course.frequency || 1) > 2 && <option value={2}>3. Hft'dan başlar</option>}
                                 {(course.frequency || 1) > 3 && <option value={3}>4. Hft'dan başlar</option>}
                              </select>
                            )}
                          </div>
                        )}

                        {(() => {
                          let tDays = course.totalDays;
                          if (course.calcMode === 'weekly') {
                            const freq = course.frequency || 1;
                            const offset = course.frequencyOffset || 0;
                            let activeWeeks = 0;
                            for (let w = 1; w <= course.courseWeeks; w++) {
                               if ((w - 1) >= offset && (w - 1 - offset) % freq === 0) activeWeeks++;
                            }
                            tDays = activeWeeks * course.weeklyDays;
                          }
                          
                          const currentPercent = course.requirementMode === 'limit' 
                            ? Math.round((1 - ((course.absenceLimit || 0) / tDays)) * 100) 
                            : (course.requirementPercent !== undefined ? course.requirementPercent : 70);
                            
                          const currentLimit = course.requirementMode === 'limit'
                            ? (course.absenceLimit || 0)
                            : Math.floor(tDays * (1 - ((course.requirementPercent !== undefined ? course.requirementPercent : 70) / 100)));

                          return (
                            <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-500">Zorunluluk: %</span>
                                <input 
                                  type="number"
                                  value={currentPercent.toString()}
                                  onChange={e => {
                                    let val = e.target.value.replace(/^0+/, '');
                                    if (val === '') val = '0';
                                    setCourses(courses.map(c => 
                                      c.id === course.id ? { ...c, requirementMode: 'percent', requirementPercent: parseInt(val) } : c
                                    ));
                                  }}
                                  className="w-12 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-sm font-bold focus:outline-none focus:border-[#0c3f79]"
                                />
                              </div>
                              <div className="w-px h-3 bg-slate-200"></div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-semibold text-slate-500">Hak:</span>
                                <div className="flex items-center gap-1">
                                  <input 
                                    type="number"
                                    value={currentLimit.toString()}
                                    onChange={e => {
                                      let val = e.target.value.replace(/^0+/, '');
                                      if (val === '') val = '0';
                                      setCourses(courses.map(c => 
                                        c.id === course.id ? { ...c, requirementMode: 'limit', absenceLimit: parseInt(val) } : c
                                      ));
                                    }}
                                    className="w-12 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-sm font-bold focus:outline-none focus:border-[#0c3f79]"
                                  />
                                  <span className="text-[11px] font-medium text-slate-500">gün</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => duplicateCourse(course)}
                        className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="Dersi Çoğalt (Lab/Uygulama Ayırmak İçin)"
                      >
                        <Copy size={18} />
                      </button>
                      <button 
                        onClick={() => removeCourse(course.id)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Dersi Sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-2xl ${statusBg} border border-white/50 shadow-inner shrink-0`}>
                      <span className={`text-2xl font-black ${statusText} tracking-tighter`}>
                        {currentAbsences}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${statusText} opacity-70 mt-0.5`}>
                        Devamsız
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col items-center gap-2">
                      {hasCalendarData && course.calcMode === 'weekly' ? (
                        <div className="flex flex-col items-center gap-1.5 w-full">
                           <button 
                             onClick={() => setCalendarModalCourse(course)}
                             className="w-full flex items-center justify-center gap-1.5 bg-[#0c3f79] hover:bg-[#00306a] text-white px-2 py-1.5 rounded-lg transition-colors shadow-sm font-semibold text-xs"
                           >
                             <CalendarDays size={14} />
                             Takvimi Aç
                           </button>
                           {isUsingCalendar && (
                             <span className="text-[9px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                               Takvim devrede
                             </span>
                           )}
                        </div>
                      ) : null}

                      {(!hasCalendarData || course.calcMode !== 'weekly' || !isUsingCalendar) && (
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => decrementAbsence(course.id)}
                            disabled={currentAbsences === 0 || isUsingCalendar}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-colors shadow-sm border ${
                              isUsingCalendar ? 'opacity-30 cursor-not-allowed bg-slate-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200/50'
                            }`}
                          >
                            -
                          </button>
                          <button 
                            onClick={() => incrementAbsence(course.id)}
                            disabled={isUsingCalendar}
                            className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-colors shadow-md ${
                              isUsingCalendar ? 'opacity-30 cursor-not-allowed bg-slate-200 text-slate-500' : 'bg-[#0c3f79] hover:bg-[#00306a] text-white shadow-[#0c3f79]/20'
                            }`}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="px-4 pb-4 pt-1">
                    <div className="flex justify-between text-xs font-medium mb-2">
                      <span className="text-slate-500">Sınır: {limit} gün</span>
                      <span className={statusText}>
                        {remaining < 0 
                          ? `${Math.abs(remaining)} gün aşıldı (Kaldın)` 
                          : remaining === 0 
                            ? 'Sınırdasın!' 
                            : `${remaining} gün kaldı`}
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${statusColor} transition-all duration-500 ease-out`}
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {calendarModalCourse && (
        <CalendarModal 
          course={calendarModalCourse} 
          settings={settings}
          onClose={() => setCalendarModalCourse(null)} 
          onSave={(records) => {
            updateCourse(calendarModalCourse.id, 'attendanceRecords', records);
            setCalendarModalCourse(null);
          }} 
        />
      )}
    </div>
  );
}
