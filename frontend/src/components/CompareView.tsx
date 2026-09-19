"use client";

import React, { useState, useRef } from 'react';
import {
  Users, UserPlus, Trash2, Upload, Calendar, Clock,
  CheckCircle2, AlertCircle, RefreshCw, Download, Printer,
  Sparkles, FileText, ChevronRight, X, Info
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { extractMetadataFromPngArrayBuffer } from '../utils/pngMetadata';
import { parseScheduleImageWithOcr } from '../utils/pngOcrParser';

export interface StudentSchedule {
  id: string;
  name: string;
  color: string;
  file?: File;
  loading: boolean;
  error?: string | null;
  data?: {
    student_id: string;
    student_name: string;
    term: string;
    schedule: Record<string, any[]>;
    courses_summary: any[];
  } | null;
}

const STUDENT_COLORS = [
  { bg: 'bg-blue-600', lightBg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  { bg: 'bg-violet-600', lightBg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300' },
  { bg: 'bg-rose-600', lightBg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  { bg: 'bg-amber-600', lightBg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  { bg: 'bg-cyan-600', lightBg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300' },
  { bg: 'bg-fuchsia-600', lightBg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-300' },
];

const HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

const toMinutes = (timeStr: string) => {
  if (!timeStr) return 0;
  const parts = timeStr.replace('.', ':').split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
};

export default function CompareView() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const printRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<StudentSchedule[]>([
    { id: '1', name: '1. Öğrenci', color: STUDENT_COLORS[0].bg, loading: false },
    { id: '2', name: '2. Öğrenci', color: STUDENT_COLORS[1].bg, loading: false },
  ]);

  const [selectedSlotDetails, setSelectedSlotDetails] = useState<{
    day: string;
    hour: string;
    busy: { studentId: string; studentName: string; color: string; course: any }[];
    free: { studentId: string; studentName: string; color: string }[];
  } | null>(null);

  // Yeni öğrenci ekleme
  const handleAddStudent = () => {
    if (students.length >= 6) {
      alert('En fazla 6 kişi karşılaştırılabilir.');
      return;
    }
    const nextIdx = students.length;
    const newId = String(Date.now());
    setStudents([
      ...students,
      {
        id: newId,
        name: `${nextIdx + 1}. Öğrenci`,
        color: STUDENT_COLORS[nextIdx % STUDENT_COLORS.length].bg,
        loading: false,
      }
    ]);
  };

  // Öğrenci silme
  const handleRemoveStudent = (id: string) => {
    if (students.length <= 2) {
      alert('Karşılaştırma için en az 2 kişi gereklidir.');
      return;
    }
    setStudents(students.filter(s => s.id !== id));
  };

  // İsim güncelleme
  const handleNameChange = (id: string, newName: string) => {
    setStudents(students.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  // Tekil dosya ayrıştırma yardımcısı
  const parseSingleFile = async (file: File) => {
    let parsedData: any = null;

    if (file.name.toLowerCase().endsWith('.png')) {
      const buffer = await file.arrayBuffer();
      parsedData = extractMetadataFromPngArrayBuffer(buffer);
    }

    if (!parsedData && file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) {
      try {
        parsedData = await parseScheduleImageWithOcr(file);
      } catch (ocrErr) {
        console.warn('OCR fallback error:', ocrErr);
      }
    }

    if (!parsedData) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/parse-schedule-file`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Dosya okunamadı.');
      }
      parsedData = await res.json();
    }
    return parsedData;
  };

  // Toplu dosya yükleme fonksiyonu (Birden fazla PDF/PNG dosyasını tek seferde işler)
  const handleBatchFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const newStudents: StudentSchedule[] = files.map((file, idx) => ({
      id: String(Date.now() + idx),
      name: file.name.replace(/\.[^/.]+$/, '').substring(0, 15) || `${idx + 1}. Öğrenci`,
      color: STUDENT_COLORS[idx % STUDENT_COLORS.length].bg,
      file,
      loading: true,
      error: null,
      data: null,
    }));

    setStudents(newStudents);

    // Tüm dosyaları sırayla/paralel ayrıştır
    await Promise.all(
      files.map(async (file, idx) => {
        const studentId = newStudents[idx].id;
        try {
          const parsedData = await parseSingleFile(file);
          if (parsedData && parsedData.schedule) {
            setStudents(prev =>
              prev.map(s =>
                s.id === studentId
                  ? {
                      ...s,
                      loading: false,
                      data: parsedData,
                      name: parsedData.student_name ? parsedData.student_name.split(' ')[0] : s.name,
                    }
                  : s
              )
            );
          } else {
            setStudents(prev =>
              prev.map(s => (s.id === studentId ? { ...s, loading: false, error: 'Ayrıştırılamadı.' } : s))
            );
          }
        } catch (err: any) {
          setStudents(prev =>
            prev.map(s =>
              s.id === studentId ? { ...s, loading: false, error: err.message || 'Okuma hatası.' } : s
            )
          );
        }
      })
    );
  };

  // Dosya yükleme ve ayrıştırma (PDF veya PNG)
  const handleFileUpload = async (id: string, file: File) => {
    setStudents(prev => prev.map(s => (s.id === id ? { ...s, file, loading: true, error: null } : s)));

    try {
      const parsedData = await parseSingleFile(file);

      if (parsedData && parsedData.schedule) {
        setStudents(prev =>
          prev.map(s =>
            s.id === id
              ? {
                  ...s,
                  loading: false,
                  data: parsedData,
                  name:
                    s.name === `${students.findIndex(x => x.id === id) + 1}. Öğrenci` && parsedData.student_name
                      ? parsedData.student_name.split(' ')[0]
                      : s.name,
                }
              : s
          )
        );
      } else {
        throw new Error('Dosyadan ders programı okunamadı.');
      }
    } catch (err: any) {
      console.error('File parse error:', err);
      setStudents(prev =>
        prev.map(s => (s.id === id ? { ...s, loading: false, error: err.message || 'Dosya okuma hatası' } : s))
      );
    }
  };

  // Bir saat diliminde öğrencinin derste olup olmadığını döndürür
  const getStudentBusySlot = (studentData: any, day: string, hourStr: string) => {
    if (!studentData || !studentData.schedule) return null;

    const normalizeDay = (d: string) =>
      d.toLowerCase().replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ö/g, 'o').replace(/ü/g, 'u').trim();

    const targetDay = normalizeDay(day);
    const dayKey = Object.keys(studentData.schedule).find(k => normalizeDay(k) === targetDay);
    if (!dayKey || !Array.isArray(studentData.schedule[dayKey])) return null;

    const hrM = toMinutes(hourStr);

    for (const item of studentData.schedule[dayKey]) {
      const startM = toMinutes(item.start_time);
      const endM = toMinutes(item.end_time);
      if (hrM >= startM && hrM < endM) {
        return item;
      }
    }
    return null;
  };

  // Görseli PNG olarak kaydetme
  const handleExportPNG = async () => {
    if (!printRef.current) return;
    try {
      const dataUrl = await toPng(printRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2
      });
      const link = document.createElement('a');
      link.download = `Ortak_Bos_Saatler_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
      alert('PNG oluşturulurken hata meydana geldi.');
    }
  };

  const loadedStudents = students.filter(s => s.data && s.data.schedule);
  const isComparisonReady = loadedStudents.length >= 2;

  // Ortak boş saat aralıklarını hesaplama (En az 1 veya 2 saat kesintisiz)
  const getCommonFreeBlocks = () => {
    if (!isComparisonReady) return [];
    const blocks: { day: string; startHour: string; endHour: string; duration: number }[] = [];

    DAYS.forEach(day => {
      let currentStart: string | null = null;
      let count = 0;

      HOURS.forEach((hour, idx) => {
        const busyStudentsCount = loadedStudents.filter(s => getStudentBusySlot(s.data, day, hour) !== null).length;
        const isEveryoneFree = busyStudentsCount === 0;

        if (isEveryoneFree) {
          if (!currentStart) currentStart = hour;
          count++;
        } else {
          if (currentStart && count >= 1) {
            const endH = `${parseInt(HOURS[idx - 1].split(':')[0], 10)}:50`;
            blocks.push({ day, startHour: currentStart, endHour: endH, duration: count });
          }
          currentStart = null;
          count = 0;
        }
      });

      if (currentStart && count >= 1) {
        const lastH = `${parseInt(HOURS[HOURS.length - 1].split(':')[0], 10)}:50`;
        blocks.push({ day, startHour: currentStart, endHour: lastH, duration: count });
      }
    });

    return blocks;
  };

  const commonFreeBlocks = getCommonFreeBlocks();

  return (
    <div className="space-y-6">
      {/* Üst Bilgilendirme ve Açıklama Kartı */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#002855] text-white flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ortak Boş Saat Bulucu & Program Karşılaştırıcı
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Birden fazla ders programı yükleyip arkadaşlarınızla ortak buluşma saatlerini anında tespit edin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toplu Dosya Yükleme Butonu */}
            <label className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>📂 Toplu Dosya Seç (Birden Çok PDF / PNG)</span>
              <input
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleBatchFilesUpload(e.target.files);
                  }
                }}
                className="hidden"
              />
            </label>

            <button
              onClick={handleAddStudent}
              disabled={students.length >= 6}
              className="px-3.5 py-1.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Tekil Kişi Ekle</span>
            </button>
          </div>
        </div>

        {/* Sürükle Bırak / Toplu Yükleme Dropzone Alanı */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleBatchFilesUpload(e.dataTransfer.files);
            }
          }}
          className="border-2 border-dashed border-amber-300 bg-amber-50/40 hover:bg-amber-50/70 p-4 rounded-xl text-center space-y-1 transition-all cursor-pointer relative"
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleBatchFilesUpload(e.target.files);
              }
            }}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-amber-950">
            <Upload className="w-4 h-4 text-amber-600" />
            <span>Tüm Ders Programı Dosyalarını Buraya Sürükleyip Bırakın veya Tıklayın</span>
          </div>
          <p className="text-[11px] text-amber-800">
            Birden çok Report.pdf veya PNG belgesini tek seferde topluca seçip bırakabilirsiniz
          </p>
        </div>
      </div>

      {/* Kişi Yükleme Kartları Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student, sIdx) => (
          <div
            key={student.id}
            className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 relative overflow-hidden"
          >
            {/* Üst İsim ve Sil Butonu */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2 flex-1">
                <span className={`w-3 h-3 rounded-full ${student.color} flex-shrink-0`} />
                <input
                  type="text"
                  value={student.name}
                  onChange={(e) => handleNameChange(student.id, e.target.value)}
                  className="font-bold text-xs text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#002855] focus:outline-none px-1 py-0.5 w-full"
                  placeholder="İsim giriniz"
                />
              </div>

              {students.length > 2 && (
                <button
                  onClick={() => handleRemoveStudent(student.id)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                  title="Kişiyi Kaldır"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dosya Yükleme Durumu veya Yükleme Butonu */}
            {student.data ? (
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-emerald-900 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Program Yüklendi</span>
                  </span>
                  <label className="text-[10px] text-emerald-700 underline cursor-pointer hover:text-emerald-900">
                    Değiştir
                    <input
                      type="file"
                      accept=".pdf,.png"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(student.id, f);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  {student.data.student_name || 'Öğrenci Belgesi'} ({student.data.courses_summary?.length || 0} Ders)
                </p>
              </div>
            ) : student.loading ? (
              <div className="p-6 text-center space-y-2 border-2 border-dashed border-blue-200 rounded-lg bg-blue-50/30">
                <RefreshCw className="w-6 h-6 text-[#002855] animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Analiz Ediliyor...</p>
              </div>
            ) : (
              <label className="block p-5 border-2 border-dashed border-slate-200 hover:border-[#002855] bg-slate-50/50 hover:bg-slate-100/50 rounded-xl transition-all cursor-pointer text-center space-y-2">
                <input
                  type="file"
                  accept=".pdf,.png"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(student.id, f);
                  }}
                  className="hidden"
                />
                <Upload className="w-5 h-5 text-[#002855] mx-auto" />
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-800">
                    PDF veya PNG Dosyası Yükle
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Report.pdf veya Ders Programı Görseli
                  </p>
                </div>
              </label>
            )}

            {student.error && (
              <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded border border-rose-200 font-medium">
                {student.error}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Karşılaştırma ve Ortak Çizelge Alanı */}
      {isComparisonReady ? (
        <div className="space-y-6">
          {/* Eylem ve İstatistik Barı */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs rounded-lg flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>{loadedStudents.length} Kişinin Programı Eşleştirildi</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPNG}
                className="px-3.5 py-1.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Çizelgeyi PNG Olarak Kaydet</span>
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Yazdır</span>
              </button>
            </div>
          </div>

          {/* En Uygun Ortak Boş Vakitle Özet Listesi */}
          {commonFreeBlocks.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Ortak Buluşmaya Uygun Kesintisiz Zaman Dilimleri
                </h3>
                <span className="text-[11px] font-semibold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200 font-mono">
                  {commonFreeBlocks.length} Uygun Aralık Bulundu
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {commonFreeBlocks.map((blk, bIdx) => (
                  <div
                    key={bIdx}
                    className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 block">
                        {blk.day}
                      </span>
                      <span className="font-mono text-xs text-emerald-700 font-semibold">
                        {blk.startHour} - {blk.endHour}
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-emerald-100/80 text-emerald-900 font-bold text-[11px] rounded-md font-mono">
                      {blk.duration} Saat Boş
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HAFTALIK ORTAK MATRİS ÇİZELGESİ */}
          <div
            ref={printRef}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 overflow-x-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Haftalık Ortak Ders & Boşluk Matrisi
                </h3>
                <p className="text-xs text-slate-500">
                  Yeşil: Tüm grup boş | Sarı: Kısmen boş | Kırmızı: Herkes derste
                </p>
              </div>

              {/* Lejant & Öğrenci Renkleri */}
              <div className="flex items-center gap-3 text-xs font-medium text-slate-700 flex-wrap">
                <div className="flex items-center gap-2 border-r border-slate-200 pr-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-600" />
                    <span>Tam Müsait</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-amber-500" />
                    <span>Kısmen Müsait</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400" />
                    <span>Dolu</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 text-[11px]">Kişi Renkleri:</span>
                  {loadedStudents.map((st) => (
                    <span key={st.id} className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                      <span className={`w-2.5 h-2.5 rounded-full ${st.color}`} />
                      <span>{st.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <table className="w-full border-collapse text-xs select-none table-fixed border border-slate-300">
              <thead>
                <tr className="border-b border-slate-300 text-slate-800 bg-slate-100">
                  <th className="p-2 w-24 text-center font-bold text-[11.5px] border-r border-slate-300 uppercase">
                    Saat
                  </th>
                  {DAYS.map((day, dIdx) => (
                    <th
                      key={day}
                      className={`p-2.5 text-center font-bold text-[12.5px] border-r border-slate-300 uppercase text-slate-900 ${
                        dIdx === DAYS.length - 1 ? 'border-r-0' : ''
                      }`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {HOURS.map((hour) => {
                  const nextHour = `${parseInt(hour.split(':')[0], 10)}:50`;
                  const hourLabel = `${hour} - ${nextHour}`;

                  return (
                    <tr key={hour} className="border-b border-slate-300 h-16">
                      <td className="p-2 border-r border-slate-300 text-center font-mono text-[11px] font-medium text-slate-600 bg-slate-50 whitespace-nowrap align-middle">
                        {hourLabel}
                      </td>

                      {DAYS.map((day, dIdx) => {
                        const busyList: { studentId: string; studentName: string; color: string; course: any }[] = [];
                        const freeList: { studentId: string; studentName: string; color: string }[] = [];

                        loadedStudents.forEach((st) => {
                          const course = getStudentBusySlot(st.data, day, hour);
                          if (course) {
                            busyList.push({ studentId: st.id, studentName: st.name, color: st.color, course });
                          } else {
                            freeList.push({ studentId: st.id, studentName: st.name, color: st.color });
                          }
                        });

                        const isEveryoneFree = busyList.length === 0;
                        const isEveryoneBusy = freeList.length === 0;

                        return (
                          <td
                            key={day}
                            onClick={() => setSelectedSlotDetails({ day, hour: hourLabel, busy: busyList, free: freeList })}
                            className={`p-1.5 border-r border-slate-300 align-top cursor-pointer transition-all hover:opacity-90 ${
                              dIdx === DAYS.length - 1 ? 'border-r-0' : ''
                            } ${
                              isEveryoneFree
                                ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                                : isEveryoneBusy
                                ? 'bg-slate-100/70 text-slate-600'
                                : 'bg-amber-100/60 border-amber-300 text-amber-950'
                            }`}
                          >
                            <div className="h-full flex flex-col justify-between space-y-1">
                              {/* Boş / Dolu Rozeti */}
                              <div className="flex items-center justify-between gap-1">
                                {isEveryoneFree ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/90 border border-emerald-300 text-emerald-800 font-bold text-[10px] shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Tüm Grup Boş
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-300 text-slate-800">
                                    {freeList.length}/{loadedStudents.length} Kişi Boş
                                  </span>
                                )}
                              </div>

                              {/* SADECE Derste Olan Kişilerin Renkli Çemberleri */}
                              {busyList.length > 0 && (
                                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                  {busyList.map((b) => (
                                    <span
                                      key={b.studentId}
                                      className={`w-3.5 h-3.5 rounded-full border border-white shadow-xs flex items-center justify-center text-[8px] font-bold text-white ${b.color}`}
                                      title={`${b.studentName}: Derste (${b.course?.code || b.course?.name || 'Ders'})`}
                                    >
                                      {b.studentName.charAt(0).toUpperCase()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* DETAY MODAL / POPOVER */}
          {selectedSlotDetails && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 relative">
                <button
                  onClick={() => setSelectedSlotDetails(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#002855]" />
                    {selectedSlotDetails.day} ({selectedSlotDetails.hour})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Saat Dilimi Detay Dökümü</p>
                </div>

                {/* Müsait / Boş Olanlar */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Boş / Müsait Kişiler ({selectedSlotDetails.free.length})
                  </h4>
                  {selectedSlotDetails.free.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSlotDetails.free.map((f, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                        >
                          <span className={`w-2 h-2 rounded-full ${f.color}`} />
                          {f.studentName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Bu saatte boş kimse yok.</p>
                  )}
                </div>

                {/* Derste Olanlar */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-600" />
                    Derste Olan Kişiler ({selectedSlotDetails.busy.length})
                  </h4>
                  {selectedSlotDetails.busy.length > 0 ? (
                    <div className="space-y-2">
                      {selectedSlotDetails.busy.map((b, bIdx) => (
                        <div
                          key={bIdx}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs"
                        >
                          <div className="flex items-center justify-between font-bold text-slate-900">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                              {b.studentName}
                            </span>
                            <span className="font-mono text-blue-700">
                              {b.course.code} (Şb. {b.course.section})
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] font-medium">
                            {b.course.name}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                            <span>Derslik: <strong className="text-slate-700">{b.course.classroom}</strong></span>
                            <span>{b.course.start_time} - {b.course.end_time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Bu saatte derste olan kimse yok (Tüm grup boş!).</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Yetersiz Program Yüklendi Uyarı Kartı */
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 text-[#002855] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-800">
              Karşılaştırma Yapabilmek İçin En Az 2 Ders Programı Yükleyin
            </h3>
            <p className="text-xs text-slate-500">
              Yukarıdaki alanlardan 2 veya daha fazla öğrencinin Report.pdf veya PNG ders programını yüklediğinizde ortak boş saatler otomatik olarak burada listelenecektir.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
