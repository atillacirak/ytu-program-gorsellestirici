"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  GraduationCap, 
  BookOpen, 
  AlertCircle,
  Upload,
  RefreshCw,
  RotateCcw,
  Calendar,
  Users,
  Target,
  Trophy
} from 'lucide-react';
import AnimatedCounter from '../../components/AnimatedCounter';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const GRADE_WEIGHTS: Record<string, number | null> = {
  'AA': 4.0,
  'BA': 3.5,
  'BB': 3.0,
  'CB': 2.5,
  'CC': 2.0,
  'DC': 1.5,
  'DD': 1.0,
  'FD': 0.5,
  'FF': 0.0,
  'F0': 0.0,
  'G': null, // Geçer (Ortalamaya katılmaz)
  'K': null, // Kalır (Ortalamaya katılmaz)
  'M': null, // Muaf (Ortalamaya katılmaz)
  'İ': null  // İzinli (Ortalamaya katılmaz)
};
import { extractMetadataFromPngArrayBuffer } from '../../utils/pngMetadata';

interface ScenarioCourse {
  id: string;
  code: string;
  name: string;
  credits: number | string; // placeholder görünmesi için string ('') olabilir
  expectedGrade: string;
  term?: string;
}

export default function GanoCalculator() {
  // Past state
  const [pastCgpa, setPastCgpa] = useState<string>('');
  const [pastTotalCredits, setPastTotalCredits] = useState<string>('');
  const [pastCourses, setPastCourses] = useState<ScenarioCourse[]>([]);

  // Target GPA State
  const [targetCgpa, setTargetCgpa] = useState<string>('3.20');
  const [nextSemesterCredits, setNextSemesterCredits] = useState<string>('16');

  // Current semester courses
  const [currentCourses, setCurrentCourses] = useState<ScenarioCourse[]>([]);

  // Upload States
  const [isUploadingTranscript, setIsUploadingTranscript] = useState(false);
  const [isUploadingSchedule, setIsUploadingSchedule] = useState(false);
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const scheduleInputRef = useRef<HTMLInputElement>(null);
  const hasTrackedScenarioRef = useRef(false);

  // Calculate total credits from current scenario courses
  const currentSemesterTotalCredits = useMemo(() => {
    return currentCourses.reduce((acc, c) => {
      const cr = parseFloat(c.credits?.toString() || '0');
      return acc + (isNaN(cr) ? 0 : cr);
    }, 0);
  }, [currentCourses]);

  // Sync nextSemesterCredits when scenario courses credits change
  useEffect(() => {
    if (currentSemesterTotalCredits > 0) {
      setNextSemesterCredits(currentSemesterTotalCredits.toString());
    }
  }, [currentSemesterTotalCredits]);

  useEffect(() => {
    const isDev = typeof window !== 'undefined' && localStorage.getItem('ytu_ignore_stats') === 'true';
    if (!isDev) {
      fetch(`${API_BASE}/api/stats/gano-visit`, { method: 'POST' }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const isDev = typeof window !== 'undefined' && localStorage.getItem('ytu_ignore_stats') === 'true';
    if (isDev) return;

    const hasContent = pastCourses.length > 0 || currentCourses.some(c => (c.code && c.code.trim()) || (c.expectedGrade && c.credits));
    if (hasContent && !hasTrackedScenarioRef.current) {
      hasTrackedScenarioRef.current = true;
      fetch(`${API_BASE}/api/stats/gano-scenario`, { method: 'POST' }).catch(() => {});
    }
  }, [pastCourses, currentCourses]);

  const handleTranscriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTranscript(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/api/parse-transcript`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('PDF okunamadı.');
      }

      const data = await res.json();
      if (data.status === 'success') {
        if (data.cgpa > 0) setPastCgpa(data.cgpa.toString());
        if (data.total_credits > 0) setPastTotalCredits(data.total_credits.toString());
        
        if (data.courses && Array.isArray(data.courses)) {
           const past: ScenarioCourse[] = [];
           const current: ScenarioCourse[] = [];
           
           data.courses.forEach((c: any, idx: number) => {
              const mappedCourse = {
                id: Math.random().toString(36).substr(2, 9) + idx,
                code: c.code || '',
                name: c.name || '',
                credits: c.credits,
                expectedGrade: c.expectedGrade || '',
                term: c.term || ''
              };
              
              // Eğer harf notu boşsa veya '--' ise bu ders şu an alınıyor demektir
              if (c.expectedGrade === '' || c.expectedGrade === '--' || !c.expectedGrade) {
                mappedCourse.expectedGrade = ''; // Varsayılan olarak boş gelsin
                current.push(mappedCourse);
              } else {
                past.push(mappedCourse);
              }
           });
           
           setPastCourses(past);
           fetch(`${API_BASE}/api/stats/gano-scenario`, { method: 'POST' }).catch(() => {});
           
           if (current.length > 0) {
             setCurrentCourses(prev => {
                const hasOnlyEmpties = prev.length === 0 || (prev.length === 1 && !prev[0].code && !prev[0].name && !prev[0].credits);
                if (hasOnlyEmpties) return current;
                
                const existingCodes = new Set(prev.filter(c => c.code).map(c => c.code));
                const filteredNew = current.filter(nc => !existingCodes.has(nc.code));
                return [...prev, ...filteredNew];
             });
           }
        }
      } else {
        alert("Transkriptten veri çekilemedi. Belgenin YTÜ transkripti veya E-Devlet transkripti olduğundan emin olun.");
      }
    } catch (err: any) {
      console.error('Transcript PDF upload error:', err);
      alert('Transkript yüklenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setIsUploadingTranscript(false);
      e.target.value = '';
    }
  };

  const handleScheduleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSchedule(true);

    try {
      // 1. Önce PNG içindeki gömülü metadatayı frontend'de okumayı deneyelim (sitenin ürettiği programlar için)
      if (file.name.toLowerCase().endsWith('.png')) {
        const buffer = await file.arrayBuffer();
        const payload = extractMetadataFromPngArrayBuffer(buffer);
        
        if (payload && payload.schedule) {
          const uniqueCoursesMap = new Map();
          Object.values(payload.schedule).forEach((dayClasses: any) => {
             if (Array.isArray(dayClasses)) {
                dayClasses.forEach(c => {
                   const key = c.code || c.name;
                   if (key && !uniqueCoursesMap.has(key)) {
                      uniqueCoursesMap.set(key, {
                        id: Math.random().toString(36).substr(2, 9),
                        code: c.code || '',
                        name: c.name || '',
                        credits: '',
                        expectedGrade: ''
                      });
                   }
                });
             }
          });
          
          const newCourses = Array.from(uniqueCoursesMap.values());
          if (newCourses.length > 0) {
            setCurrentCourses(prev => {
              const hasOnlyEmpties = prev.length === 0 || (prev.length === 1 && !prev[0].code && !prev[0].name && !prev[0].credits);
              if (hasOnlyEmpties) return newCourses;
              const existingCodes = new Set(prev.filter(c => c.code).map(c => c.code));
              const existingNames = new Set(prev.filter(c => c.name).map(c => c.name));
              const filteredNew = newCourses.filter((nc: any) => !existingCodes.has(nc.code) && !existingNames.has(nc.name));
              return [...prev, ...filteredNew];
            });
            setIsUploadingSchedule(false);
            fetch(`${API_BASE}/api/stats/gano-scenario`, { method: 'POST' }).catch(() => {});
            e.target.value = '';
            return; // Başarılı, backend'e gitmeye gerek yok!
          }
        }
      }

      // 2. Eğer metadata yoksa veya PDF/JPG ise Backend'e gönder (OCR veya PDF parse için)
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE}/api/parse-schedule-file`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Dosya okunamadı veya sunucu hatası.');
      }

      const data = await res.json();
      let newCourses = [];

      if (data.courses_summary && Array.isArray(data.courses_summary)) {
        newCourses = data.courses_summary.map((course: any, index: number) => ({
          id: Math.random().toString(36).substr(2, 9) + index,
          code: course.code || '',
          name: course.name || '',
          credits: '',
          expectedGrade: ''
        }));
      } else if (data.schedule && typeof data.schedule === 'object') {
        const uniqueCoursesMap = new Map();
        Object.values(data.schedule).forEach((dayClasses: any) => {
           if (Array.isArray(dayClasses)) {
              dayClasses.forEach(c => {
                 const key = c.code || c.name;
                 if (key && !uniqueCoursesMap.has(key)) {
                    uniqueCoursesMap.set(key, {
                      id: Math.random().toString(36).substr(2, 9),
                      code: c.code || '',
                      name: c.name || '',
                      credits: '',
                      expectedGrade: ''
                    });
                 }
              });
           }
        });
        newCourses = Array.from(uniqueCoursesMap.values());
      }

      if (newCourses.length > 0) {
        setCurrentCourses(prev => {
          const hasOnlyEmpties = prev.length === 0 || (prev.length === 1 && !prev[0].code && !prev[0].name && !prev[0].credits);
          if (hasOnlyEmpties) return newCourses;
          
          const existingCodes = new Set(prev.filter(c => c.code).map(c => c.code));
          const existingNames = new Set(prev.filter(c => c.name).map(c => c.name));
          
          const filteredNew = newCourses.filter((nc: any) => {
             const codeExists = nc.code && existingCodes.has(nc.code);
             const nameExists = nc.name && existingNames.has(nc.name);
             return !codeExists && !nameExists;
          });
          
          return [...prev, ...filteredNew];
        });
      } else {
        alert("Ders programından veri çekilemedi. Belgenin OBS programı veya sistemden üretilmiş geçerli bir PNG olduğundan emin olun.");
      }
    } catch (err: any) {
      console.error('Schedule File upload error:', err);
      alert('Ders programı yüklenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setIsUploadingSchedule(false);
      e.target.value = '';
    }
  };

  // Calculate new AGNO
  const calculatedGpa = useMemo(() => {
    const cgpa = parseFloat(pastCgpa) || 0;
    const pastCredits = parseFloat(pastTotalCredits) || 0;

    let totalPoints = cgpa * pastCredits;
    let totalCredits = pastCredits;
    
    // Semester stats
    let termPoints = 0;
    let termCredits = 0;

    currentCourses.forEach(course => {
      const courseCredits = parseFloat(course.credits.toString()) || 0;
      
      if (course.expectedGrade && courseCredits > 0) {
        const weight = GRADE_WEIGHTS[course.expectedGrade];
        
        // Sadece katsayısı olan harf notları (null olmayanlar) AGNO'ya katılır
        if (weight !== undefined && weight !== null) {
          const points = weight * courseCredits;
          
          totalPoints += points;
          totalCredits += courseCredits;
          
          termPoints += points;
          termCredits += courseCredits;
        }
      }
    });

    const newCgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
    const termGpa = termCredits > 0 ? (termPoints / termCredits) : 0;

    return {
      newCgpa: newCgpa,
      termGpa: termGpa,
      termCredits,
      totalCredits
    };
  }, [pastCgpa, pastTotalCredits, currentCourses]);

  const targetCalculation = useMemo(() => {
    const cgpa = parseFloat(pastCgpa.replace(',', '.'));
    const pastCredits = parseFloat(pastTotalCredits.replace(',', '.'));
    const target = parseFloat(targetCgpa.replace(',', '.'));
    const nextCredits = parseFloat(nextSemesterCredits.replace(',', '.'));

    if (isNaN(cgpa) || isNaN(pastCredits) || isNaN(target) || isNaN(nextCredits) || pastCredits <= 0 || nextCredits <= 0) {
      return null;
    }

    const totalCreditsNext = pastCredits + nextCredits;
    const totalRequiredPoints = target * totalCreditsNext;
    const currentPoints = cgpa * pastCredits;
    const requiredPointsNext = totalRequiredPoints - currentPoints;
    const requiredYano = requiredPointsNext / nextCredits;

    return {
      requiredYano,
      target,
      nextCredits,
      isPossible: requiredYano <= 4.00 && requiredYano >= 0,
      isAlreadyAchieved: requiredYano < 0
    };
  }, [pastCgpa, pastTotalCredits, targetCgpa, nextSemesterCredits]);

  const addManualCourse = () => {
    setCurrentCourses([
      ...currentCourses,
      {
        id: Math.random().toString(36).substr(2, 9),
        code: '', 
        name: '', 
        credits: '', 
        expectedGrade: ''
      }
    ]);
  };

  const removeCourse = (id: string) => {
    setCurrentCourses(currentCourses.filter(c => c.id !== id));
  };

  const updateCourse = (id: string, field: keyof ScenarioCourse, value: any) => {
    setCurrentCourses(currentCourses.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const addPastCourse = () => {
    setPastCourses([
      ...pastCourses,
      {
        id: Math.random().toString(36).substr(2, 9),
        code: '', 
        name: '', 
        credits: '', 
        expectedGrade: ''
      }
    ]);
  };

  const removePastCourse = (id: string) => {
    setPastCourses(pastCourses.filter(c => c.id !== id));
  };

  const updatePastCourse = (id: string, field: keyof ScenarioCourse, value: any) => {
    setPastCourses(pastCourses.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const clearAllCourses = () => {
    if(window.confirm('Senaryo tablosundaki tüm dersleri temizlemek istediğinize emin misiniz?')) {
      setCurrentCourses([]);
    }
  };

  const clearPastCourses = () => {
    if(window.confirm('Geçmiş durumdaki tüm dersleri temizlemek istediğinize emin misiniz?')) {
      setPastCourses([]);
    }
  };

  const resetAll = () => {
    if(window.confirm('Tüm verileri (Geçmiş durum dahil) sıfırlamak istediğinize emin misiniz?')) {
      setCurrentCourses([]);
      setPastCourses([]);
      setPastCgpa('');
      setPastTotalCredits('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-0 md:p-0 font-sans">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 shadow-xs mb-8">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <a href="/" className="flex items-center space-x-3.5 group transition-colors">
            <div className="w-10 h-10 rounded-lg bg-[#0c3f79] group-hover:bg-[#00306a] flex items-center justify-center text-white shadow-xs transition-colors">
              <GraduationCap className="w-6 h-6 text-[#e7a240]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#0c3f79] tracking-tight transition-colors flex items-center gap-1.5">
                  <span>YTÜ Dostun</span>
                  <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    v2
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5 hidden sm:block">
                YTÜ&apos;lülerin yeni nesil ders ve not yönetim portalı.
              </p>
            </div>
          </a>
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <a href="/" className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
              <Calendar className="w-3.5 h-3.5" />
              <span>Tekli Program</span>
            </a>
            <a href="/?tab=compare" className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Ortak Boş Saatler (Karşılaştır)</span>
            </a>
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-[#0c3f79] text-white shadow-2xs">
              <Calculator className="w-3.5 h-3.5 text-blue-400" />
              <span>AGNO Hesapla</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto space-y-4 pb-28 px-3 md:px-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
              <Calculator size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">AGNO Hesaplayıcı</h1>
              <p className="text-slate-500 text-xs sm:text-sm">Mevcut notlarınızı girin ve dönem sonu senaryonuzu oluşturun. Transkript yükleyerek verdiğiniz dersleri, ortalamanızı ve bu dönem aldığınız dersleri içe aktarabilirsiniz.</p>
            </div>
          </div>
          
          <button 
            onClick={resetAll}
            className="text-xs flex items-center justify-center gap-1.5 text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-colors font-medium shadow-sm"
          >
            <RotateCcw size={16} />
            Sıfırla
          </button>
        </div>

        {/* Past GPA Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-[#0c3f79]/5 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <GraduationCap size={16} className="text-slate-400" />
                Geçmiş Durum
              </div>
              <div className="text-[11px] text-slate-400 mt-1 md:ml-7">
                OBS'ten veya E-Devlet'ten aldığınız transkripti yükleyebilirsiniz
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept=".pdf" 
                className="hidden" 
                ref={transcriptInputRef}
                onChange={handleTranscriptUpload}
              />
              <button 
                onClick={() => transcriptInputRef.current?.click()}
                disabled={isUploadingTranscript}
                className={`text-xs flex items-center gap-1.5 text-[#8a5611] bg-[#e7a240]/15 hover:bg-[#e7a240]/25 border border-[#e7a240]/30 px-2.5 py-1.5 rounded-lg transition-colors font-medium ${isUploadingTranscript ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploadingTranscript ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                {isUploadingTranscript ? 'Okunuyor...' : 'Transkript Yükle'}
              </button>
              
              {pastCourses.length > 0 && (
                 <button 
                   onClick={clearPastCourses}
                   className="text-xs flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                 >
                   <Trash2 size={16} />
                   Temizle
                 </button>
              )}
              
              <button 
                onClick={addPastCourse}
                className="text-xs flex items-center gap-1.5 text-white bg-[#0c3f79] hover:bg-[#00306a] px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
              >
                <Plus size={14} />
                Ders Ekle
              </button>
            </div>
          </div>
          
          <div className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Mevcut AGNO</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                max="4"
                placeholder="2.85"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-sm"
                value={pastCgpa}
                onChange={(e) => setPastCgpa(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Tamamlanan Toplam Kredi</label>
              <input 
                type="number" 
                step="0.5"
                min="0"
                placeholder="90"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium text-sm"
                value={pastTotalCredits}
                onChange={(e) => setPastTotalCredits(e.target.value)}
              />
            </div>
          </div>
          
          {pastCourses.length > 0 && (
             <div className="px-5 pb-5 md:px-6 md:pb-6">
               <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                 Geçmiş Dönem Dersleri ({pastCourses.length})
               </div>
               <div className="max-h-64 overflow-y-auto overflow-x-auto border border-slate-200 rounded-xl bg-[#0c3f79]/[0.02]">
                  <table className="w-full text-left border-collapse min-w-[600px] text-sm">
                    <thead className="sticky top-0 bg-[#0c3f79]/5 backdrop-blur-sm border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider z-10">
                      <tr>
                        <th className="px-5 py-3 font-medium w-32">Ders Kodu</th>
                        <th className="px-5 py-3 font-medium">Ders Adı</th>
                        <th className="px-5 py-3 font-medium w-24">Kredi</th>
                        <th className="px-5 py-3 font-medium w-32">Not</th>
                        <th className="px-5 py-3 font-medium w-16 text-center">Sil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let lastTerm = '';
                        return pastCourses.map(course => {
                          const termHeader = course.term && course.term !== lastTerm ? (
                            <tr key={`term-${course.term}`} className="bg-[#0c3f79]/5">
                              <td colSpan={5} className="px-5 py-2 text-xs font-bold text-[#0c3f79] uppercase tracking-wider border-y border-[#0c3f79]/10 shadow-[inset_0_1px_0_0_rgba(0,40,85,0.05)]">
                                {course.term}
                              </td>
                            </tr>
                          ) : null;
                          if (course.term) lastTerm = course.term;

                          return (
                            <React.Fragment key={course.id}>
                              {termHeader}
                              <tr className="hover:bg-[#0c3f79]/[0.04] transition-colors">
                          <td className="px-5 py-2">
                            <input 
                              type="text" 
                              value={course.code}
                              onChange={(e) => updatePastCourse(course.id, 'code', e.target.value)}
                              className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 outline-none transition-all uppercase"
                              placeholder="MAT101"
                            />
                          </td>
                          <td className="px-5 py-2">
                            <input 
                              type="text" 
                              value={course.name}
                              onChange={(e) => updatePastCourse(course.id, 'name', e.target.value)}
                              className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 outline-none transition-all"
                              placeholder="Matematik 1"
                            />
                          </td>
                          <td className="px-5 py-2">
                            <input 
                              type="number" 
                              step="0.5"
                              min="0"
                              value={course.credits}
                              onChange={(e) => updatePastCourse(course.id, 'credits', e.target.value)}
                              className="w-full bg-transparent border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 outline-none transition-all text-center"
                              placeholder="3.0"
                            />
                          </td>
                          <td className="px-5 py-2">
                            <select
                              value={course.expectedGrade}
                              onChange={(e) => updatePastCourse(course.id, 'expectedGrade', e.target.value)}
                              className={`w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-1.5 outline-none transition-all appearance-none cursor-pointer font-medium ${['FF', 'FD', 'DD', 'DC', 'F0'].includes(course.expectedGrade) ? 'text-red-500' : 'text-slate-800'}`}
                            >
                              <option value=""></option>
                              {Object.keys(GRADE_WEIGHTS).filter(g => !['G', 'K', 'İ'].includes(g) || g === course.expectedGrade).map(grade => (
                                <option key={grade} value={grade}>
                                  {grade} {GRADE_WEIGHTS[grade] === null && '(Katılmaz)'}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-2 text-center">
                            <button 
                              onClick={() => removePastCourse(course.id)}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
               </div>
             </div>
          )}

          {(!pastCgpa || !pastTotalCredits) && pastCourses.length === 0 && (
             <div className="px-5 pb-5 md:px-6 md:pb-6">
               <div className="bg-[#e7a240]/[0.08] text-[#8a5611] p-2.5 rounded-lg flex gap-2 items-start text-sm border border-[#e7a240]/30">
                 <AlertCircle size={18} className="shrink-0 mt-0.5" />
                 <p>Sadece bu dönemin YANO'sunu hesaplamak istiyorsanız bu alanları boş bırakabilirsiniz.</p>
               </div>
             </div>
          )}
        </div>

        {/* Target GPA Goal Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm sm:text-base">
            <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
              <Trophy size={18} />
            </div>
            <span>Hedefine ulaşmak için ne gerekiyor?</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Hedef AGNO</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="4"
                placeholder="3.20"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium text-sm"
                value={targetCgpa}
                onChange={(e) => setTargetCgpa(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center justify-between">
                <span>Gelecek Dönem Kredi</span>
                {currentSemesterTotalCredits > 0 && (
                  <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-normal border border-purple-200">Derslerden senkronize</span>
                )}
              </label>
              <input
                type="number"
                step="0.5"
                min="1"
                placeholder="16"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-medium text-sm"
                value={nextSemesterCredits}
                onChange={(e) => setNextSemesterCredits(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setTargetCgpa('3.00')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '3.00' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Onur Öğrencisi 3,00
            </button>
            <button
              onClick={() => setTargetCgpa('2.72')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '2.72' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Çift anadal 2,72
            </button>
            <button
              onClick={() => setTargetCgpa('2.50')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '2.50' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Yandal 2,50
            </button>
            <button
              onClick={() => setTargetCgpa('2.40')}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium cursor-pointer ${targetCgpa === '2.40' ? 'bg-purple-100 text-purple-700 border-purple-300 font-semibold' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              Erasmus 2,40
            </button>
          </div>

          {targetCalculation ? (
            targetCalculation.isAlreadyAchieved ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium">
                🎉 Mevcut AGNO&apos;n zaten bu hedefin üzerinde! Gelecek dönem ortalaman 0.00 gelse dahi AGNO&apos;n <strong>{targetCalculation.target.toFixed(2)}</strong> altına düşmez.
              </div>
            ) : targetCalculation.isPossible ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs sm:text-sm font-medium">
                Gelecek dönem <strong>{targetCalculation.nextCredits}</strong> kredide ortalama <strong>{targetCalculation.requiredYano.toFixed(2)}</strong> yaparsan AGNO&apos;n <strong>{targetCalculation.target.toFixed(2)}</strong> olur.
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs sm:text-sm font-medium">
                ⚠️ Bu hedefe <strong>{targetCalculation.nextCredits}</strong> kredide ulaşmak için ortalamanın <strong>{targetCalculation.requiredYano.toFixed(2)}</strong> olması gerekir (4.00 üstü). Tek dönemde ulaşmak mümkün değil.
              </div>
            )
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 text-slate-500 rounded-xl text-xs">
              💡 Hesaplamayı görmek için yukarıdaki &quot;Geçmiş Durum&quot; kartından mevcut AGNO ve tamamlanan kredinizi girin.
            </div>
          )}
        </div>

        {/* Current Semester Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-[#0c3f79]/5 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 font-semibold text-slate-700">
                <BookOpen size={20} className="text-slate-400" />
                Senaryo Dönemi (Alınan Dersler)
              </div>
              <div className="text-[11px] text-slate-400 mt-1 md:ml-7">
                Otomatik doldurmak için OBS PDF'i veya sitemizin ürettiği PNG'yi yükleyebilirsiniz
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
                className={`text-xs flex items-center gap-1.5 text-[#8a5611] bg-[#e7a240]/15 hover:bg-[#e7a240]/25 border border-[#e7a240]/30 px-2.5 py-1.5 rounded-lg transition-colors font-medium ${isUploadingSchedule ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploadingSchedule ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                {isUploadingSchedule ? 'Okunuyor...' : 'Programdan Çek'}
              </button>
              
              {currentCourses.length > 0 && (
                 <button 
                   onClick={clearAllCourses}
                   className="text-xs flex items-center gap-1.5 text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                 >
                   <Trash2 size={16} />
                   Temizle
                 </button>
              )}
              
              <button 
                onClick={addManualCourse}
                className="text-xs flex items-center gap-1.5 text-white bg-[#0c3f79] hover:bg-[#00306a] px-2.5 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
              >
                <Plus size={14} />
                Ders Ekle
              </button>
            </div>
          </div>

          <div className="p-0 overflow-x-auto">
            {currentCourses.length === 0 ? (
              <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <BookOpen size={24} className="text-slate-400" />
                </div>
                <p className="font-medium">Henüz hiç ders eklemediniz.</p>
                <p className="text-sm mt-1">Hesaplama yapmak için ders ekleyin.</p>
                <button 
                  onClick={addManualCourse}
                  className="mt-6 text-sm flex items-center gap-2 text-slate-700 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  <Plus size={14} />
                  İlk Dersi Ekle
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#0c3f79]/5 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="px-5 py-3 font-medium w-32">Ders Kodu</th>
                    <th className="px-5 py-3 font-medium">Ders Adı</th>
                    <th className="px-5 py-3 font-medium w-24">Kredi</th>
                    <th className="px-5 py-3 font-medium w-32">Beklenen Not</th>
                    <th className="px-5 py-3 font-medium w-16 text-center">Sil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {currentCourses.map(course => (
                    <tr key={course.id} className="hover:bg-[#0c3f79]/[0.04] transition-colors">
                      <td className="px-5 py-3">
                        <input 
                          type="text" 
                          value={course.code}
                          onChange={(e) => updateCourse(course.id, 'code', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-2 outline-none transition-all uppercase"
                          placeholder="MAT101"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input 
                          type="text" 
                          value={course.name}
                          onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-2 outline-none transition-all"
                          placeholder="Matematik 1"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input 
                          type="number" 
                          step="0.5"
                          min="0"
                          value={course.credits}
                          onChange={(e) => updateCourse(course.id, 'credits', e.target.value)}
                          className="w-full bg-transparent border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-2 outline-none transition-all text-center"
                          placeholder="3.0"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={course.expectedGrade}
                          onChange={(e) => updateCourse(course.id, 'expectedGrade', e.target.value)}
                          className={`w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 outline-none transition-all appearance-none cursor-pointer font-medium ${['FF', 'FD', 'DD', 'DC', 'F0'].includes(course.expectedGrade) ? 'text-red-500' : 'text-slate-800'}`}
                        >
                          <option value=""></option>
                          {Object.keys(GRADE_WEIGHTS).filter(g => !['G', 'K', 'İ'].includes(g) || g === course.expectedGrade).map(grade => (
                            <option key={grade} value={grade}>
                              {grade} {GRADE_WEIGHTS[grade] === null && '(Katılmaz)'}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button 
                          onClick={() => removeCourse(course.id)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Results */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-3 py-2 sm:p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-4xl mx-auto flex flex-row items-center justify-between gap-2 sm:gap-4">

          <div className="flex items-center gap-3 sm:gap-6">
            <div className="text-center sm:text-left">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Dönem Ort.</div>
              <div className="text-base sm:text-2xl font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-1">
                <AnimatedCounter value={calculatedGpa.termGpa} decimals={2} />
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="text-center sm:text-left">
              <div className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Dönem Krd.</div>
              <div className="text-base sm:text-xl font-bold text-slate-700">
                {calculatedGpa.termCredits}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="text-white px-3 py-1.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm flex items-center gap-3 sm:gap-5" style={{ background: 'linear-gradient(135deg, #e7a240 0%, #d38e2c 100%)' }}>
              <div className="text-right border-r border-white/20 pr-3 sm:pr-5">
                <div className="text-white/80 text-[10px] sm:text-xs font-medium uppercase tracking-wider mb-0.5">Toplam Krd.</div>
                <div className="text-base sm:text-xl font-bold flex items-center justify-end gap-1">
                  {calculatedGpa.totalCredits}
                </div>
              </div>
              <div>
                <div className="text-white/90 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider mb-0">Yeni AGNO</div>
                <div className="text-lg sm:text-2xl font-bold flex items-center gap-1">
                  <AnimatedCounter value={calculatedGpa.newCgpa} decimals={2} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
