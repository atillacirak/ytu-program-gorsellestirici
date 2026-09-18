"use client";

import React, { useState, useRef } from 'react';
import {
  Calendar, Building2, Upload, RefreshCw, FileText,
  AlertCircle, Download, Printer, LayoutGrid, BookOpen, Clock,
  Sparkles, Layers, GraduationCap, Palette
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { getFullInstructorName } from '../utils/instructors';

export default function Home() {
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
  const [visualizerError, setVisualizerError] = useState<string | null>(null);
  const [visualizerViewMode, setVisualizerViewMode] = useState<'table' | 'cards' | 'summary'>('table');
  const [visualizerColorMode, setVisualizerColorMode] = useState<'colored' | 'monochrome'>('colored');
  const visualizerScheduleRef = useRef<HTMLDivElement>(null);
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

      const dataUrl = await toPng(node, {
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
      const link = document.createElement('a');
      link.download = `YTU_A4_Ders_Programi_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG export error:', err);
      alert('PNG görseli oluşturulurken hata oluştu.');
    }
  };
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f8fafc] text-slate-900 transition-colors duration-200">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50 no-print shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#002855] flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  YTÜ Program Görselleştirici
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono rounded font-semibold">
                  OBS
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Öğrenci Haftalık Ders Programı Çizelgesi Portalı
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gönüllü Proje</span>
            </div>

            {visualizerData && (
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
            {!visualizerData ? (
              /* Henüz Belge Yüklenmedi -> Resmi Doküman Yükleme Alanı */
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs relative overflow-hidden space-y-4">
                  <div className="max-w-3xl space-y-2 relative z-10">
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
                          <span>Sade (Renksiz)</span>
                        </button>
                      </div>

                      <button
                        onClick={handleExportVisualizerPNG}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#002855] hover:bg-[#001f42] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PNG Kaydet</span>
                      </button>

                      <button
                        onClick={() => window.print()}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-all cursor-pointer shadow-2xs"
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

                  {/* Özet Göstergeleri */}
                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 flex-wrap text-xs text-slate-600">
                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      Kayıtlı Ders: <strong className="text-slate-900 font-mono">{visualizerData.courses_summary?.length || 0}</strong>
                    </span>

                    <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Haftalık Toplam: <strong className="text-slate-900 font-mono">
                        {visualizerData.courses_summary?.reduce((acc: number, c: any) => acc + (c.time_slots?.length || 0), 0)}
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
                      className="a4-print-target bg-white text-slate-900 p-6 space-y-3 w-full mx-auto rounded-none border-0"
                      style={{ minWidth: '980px', maxWidth: '1120px' }}
                    >
                      {/* Resmi Kurumsal Belge Başlığı */}
                      <div className="border-b border-slate-300 pb-2.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h2 className="font-black text-sm tracking-wide uppercase text-slate-950">
                            YILDIZ TEKNİK ÜNİVERSİTESİ
                          </h2>
                          <h3 className="text-xs font-semibold text-slate-600">
                            Ders Programı - Gönüllü Proje
                          </h3>
                        </div>

                        {visualizerData.term && (
                          <div className="text-right text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                            <p className="text-slate-700 text-[11px] font-mono font-semibold">
                              {visualizerData.term} Yarıyılı
                            </p>
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
                            const VISUALIZER_HOURS = [
                              '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
                            ];

                            const VIS_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

                            const toMinutes = (timeStr: string) => {
                              const parts = timeStr.replace('.', ':').split(':');
                              return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                            };

                            // Sade, Kurumsal ve Baskıya Uygun Ofis Renk Paletleri (Açık Kağıt Üzerinde, Canlı ve Ayırt Edici)
                            const CLEAN_OFFICE_PALETTES = [
                              { bg: 'bg-blue-50/90', border: 'border-blue-200/90', text: 'text-blue-950', accent: 'text-blue-700', badge: 'bg-white text-blue-800 border-blue-200' },
                              { bg: 'bg-emerald-50/90', border: 'border-emerald-200/90', text: 'text-emerald-950', accent: 'text-emerald-800', badge: 'bg-white text-emerald-800 border-emerald-200' },
                              { bg: 'bg-rose-50/90', border: 'border-rose-200/90', text: 'text-rose-950', accent: 'text-rose-800', badge: 'bg-white text-rose-800 border-rose-200' },
                              { bg: 'bg-amber-50/90', border: 'border-amber-200/90', text: 'text-amber-950', accent: 'text-amber-800', badge: 'bg-white text-amber-800 border-amber-200' },
                              { bg: 'bg-indigo-50/90', border: 'border-indigo-200/90', text: 'text-indigo-950', accent: 'text-indigo-800', badge: 'bg-white text-indigo-800 border-indigo-200' },
                              { bg: 'bg-teal-50/90', border: 'border-teal-200/90', text: 'text-teal-950', accent: 'text-teal-800', badge: 'bg-white text-teal-800 border-teal-200' },
                              { bg: 'bg-purple-50/90', border: 'border-purple-200/90', text: 'text-purple-950', accent: 'text-purple-800', badge: 'bg-white text-purple-800 border-purple-200' },
                              { bg: 'bg-sky-50/90', border: 'border-sky-200/90', text: 'text-sky-950', accent: 'text-sky-800', badge: 'bg-white text-sky-800 border-sky-200' },
                              { bg: 'bg-orange-50/90', border: 'border-orange-200/90', text: 'text-orange-950', accent: 'text-orange-800', badge: 'bg-white text-orange-800 border-orange-200' },
                              { bg: 'bg-violet-50/90', border: 'border-violet-200/90', text: 'text-violet-950', accent: 'text-violet-800', badge: 'bg-white text-violet-800 border-violet-200' },
                              { bg: 'bg-cyan-50/90', border: 'border-cyan-200/90', text: 'text-cyan-950', accent: 'text-cyan-800', badge: 'bg-white text-cyan-800 border-cyan-200' },
                              { bg: 'bg-lime-50/90', border: 'border-lime-200/90', text: 'text-lime-950', accent: 'text-lime-800', badge: 'bg-white text-lime-800 border-lime-200' },
                              { bg: 'bg-fuchsia-50/90', border: 'border-fuchsia-200/90', text: 'text-fuchsia-950', accent: 'text-fuchsia-800', badge: 'bg-white text-fuchsia-800 border-fuchsia-200' },
                            ];

                            const MONOCHROME_PALETTE = {
                              bg: 'bg-slate-100',
                              border: 'border-slate-300',
                              text: 'text-slate-900',
                              accent: 'text-slate-950 font-bold',
                              badge: 'bg-white text-slate-900 border-slate-300 font-semibold'
                            };

                            const getCourseColor = (code: string) => {
                              if (visualizerColorMode === 'monochrome') {
                                return MONOCHROME_PALETTE;
                              }
                              const codes = (visualizerData.courses_summary || []).map((c: any) => c.code);
                              const idx = codes.indexOf(code);
                              if (idx !== -1) return CLEAN_OFFICE_PALETTES[idx % CLEAN_OFFICE_PALETTES.length];
                              let hash = 0;
                              for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
                              return CLEAN_OFFICE_PALETTES[Math.abs(hash) % CLEAN_OFFICE_PALETTES.length];
                            };

                            const grid: Record<string, Record<number, any>> = {};
                            VIS_DAYS.forEach(d => { grid[d] = {}; });

                            VIS_DAYS.forEach(day => {
                              const items = visualizerData.schedule[day] || [];
                              items.forEach((it: any) => {
                                const startM = toMinutes(it.start_time);
                                const endM = toMinutes(it.end_time);

                                VISUALIZER_HOURS.forEach((hr, hrIdx) => {
                                  const hrM = toMinutes(hr);
                                  if (hrM >= startM && hrM < endM) {
                                    grid[day][hrIdx] = it;
                                  }
                                });
                              });
                            });

                            const skipCells: Record<string, Set<number>> = {};
                            VIS_DAYS.forEach(d => { skipCells[d] = new Set(); });

                            const SLOT_HEIGHT = 54;

                            return VISUALIZER_HOURS.map((hour, hrIdx) => {
                              const nextHour = `${parseInt(hour.split(':')[0], 10)}:50`;
                              const hourLabel = `${hour} - ${nextHour}`;

                              return (
                                <tr key={hour} className="border-b border-slate-300" style={{ height: `${SLOT_HEIGHT}px` }}>
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
                                      grid[day][hrIdx + span]?.classroom === it.classroom
                                    ) {
                                      skipCells[day].add(hrIdx + span);
                                      span++;
                                    }

                                    const palette = getCourseColor(it.code);

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

                                    return (
                                      <td
                                        key={day}
                                        rowSpan={span}
                                        style={{ height: `${span * SLOT_HEIGHT}px` }}
                                        className={`p-0.5 border-r border-slate-300 align-top h-full ${
                                          isLastCol ? 'border-r-0' : ''
                                        }`}
                                      >
                                        <div className={`h-full w-full p-2 rounded border ${palette.bg} ${palette.border} flex flex-col justify-between ${span === 1 ? 'space-y-0.5' : 'space-y-1.5'} transition-all shadow-xs overflow-hidden`}>
                                          <div className="space-y-0.5 min-w-0">
                                            {/* Başlık, Şube Bilgisi ve Online Kayıt Simgesi */}
                                            <div className="flex items-center justify-between gap-1 min-w-0">
                                              <span className={`font-mono font-bold text-[12px] truncate ${palette.accent}`}>
                                                {it.code} {it.section ? `(Şb. ${it.section})` : ''}
                                              </span>

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

                                            {/* Ders Adı */}
                                            <h4 className={`text-[11px] font-semibold ${palette.text} leading-tight ${span === 1 ? 'line-clamp-1' : 'line-clamp-2'} break-words`}>
                                              {it.name}
                                            </h4>
                                          </div>

                                          {/* Alt Bilgi: Saat ve Derslik Rozeti */}
                                          <div className="pt-1 border-t border-slate-200/80 text-slate-600 space-y-1 min-w-0">
                                            <p className="font-mono text-slate-500 text-[9.5px] font-medium whitespace-nowrap">
                                              {it.start_time} - {it.end_time}
                                            </p>
                                            {it.classroom ? (
                                              <div
                                                className={`inline-block max-w-full px-2 py-0.5 rounded-md border text-[11.5px] font-mono font-bold shadow-2xs ${palette.badge}`}
                                                title={it.classroom}
                                              >
                                                <span className="truncate block">
                                                  {formatClassroomLabel(it.classroom, it.is_lab)}
                                                </span>
                                              </div>
                                            ) : null}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                              const fullInst = getFullInstructorName(it.instructor);
                              return (
                                <div
                                  key={idx}
                                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono font-bold text-xs text-blue-700 whitespace-nowrap">
                                      {it.code} {it.section ? `(Şb. ${it.section})` : ''}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 whitespace-nowrap shrink-0 font-medium">
                                      {it.classroom}
                                    </span>
                                  </div>

                                  <h4 className="text-xs font-semibold text-slate-900">
                                    {it.name}
                                  </h4>

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
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#002855]" />
                        Kayıtlı Dersler ve Derslik Dağılımı Dökümü
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Ders kodları, şubeler ve derslik ortamları listesi</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-800 border-collapse border border-slate-200">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-700 uppercase tracking-wider text-[10px] bg-slate-100">
                            <th className="p-2.5">Ders Kodu</th>
                            <th className="p-2.5">Ders Adı</th>
                            <th className="p-2.5">Şube</th>
                            <th className="p-2.5">Derslik / Ortam</th>
                            <th className="p-2.5">Ders Saatleri</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visualizerData.courses_summary?.map((c: any, idx: number) => {
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

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white no-print">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            YTÜ Program Görselleştirici — Gönüllü Öğrenci Projesi
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
