import React from 'react';
import Link from 'next/link';
import {
  Upload, AlertCircle, GraduationCap, ChevronDown, Compass, Calculator, ShieldCheck, Users, Sparkles, ArrowRight, Award
} from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface UploadScreenProps {
  stats: { total_generated: number; total_visits: number } | null;
  visualizerError: string | null;
  visualizerPdfUploading: boolean;
  handleVisualizerPdfUpload: (file: File) => void;
  selectedPrepLevel: string;
  setSelectedPrepLevel: (val: string) => void;
  selectedPrepClass: string;
  setSelectedPrepClass: (val: string) => void;
  prepLevels: string[];
  prepClassesForLevel: string[];
  handlePrepClassSelect: () => void;
}

export default function UploadScreen({
  stats,
  visualizerError,
  visualizerPdfUploading,
  handleVisualizerPdfUpload,
  selectedPrepLevel,
  setSelectedPrepLevel,
  selectedPrepClass,
  setSelectedPrepClass,
  prepLevels,
  prepClassesForLevel,
  handlePrepClassSelect
}: UploadScreenProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!visualizerPdfUploading && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (visualizerPdfUploading) return;

    const file = e.dataTransfer.files[0];
    if (file) handleVisualizerPdfUpload(file);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4" aria-labelledby="schedule-upload-title">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h2 id="schedule-upload-title" className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Haftalık ders programını oluştur
            </h2>
            <p className="text-sm text-slate-600">
              Güncel OBS veya eski USIS ders programı PDF’ini yükle, haftalık çizelgeni görüntüle.
            </p>
          </div>
          {stats && (
            <p className="hidden shrink-0 text-right text-xs text-slate-600 md:block">
              <strong className="block text-lg text-[#0c3f79]"><AnimatedCounter value={stats.total_generated} /></strong>
              Oluşturulan program
            </p>
          )}
        </div>

        {/* Yükleme Alanı */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-4 sm:p-6 ${isDragging ? 'border-[#0c3f79] bg-blue-50' : 'border-slate-300 bg-slate-50/70'}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            disabled={visualizerPdfUploading}
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (file) handleVisualizerPdfUpload(file);
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!visualizerPdfUploading) fileInputRef.current?.click();
            }}
            aria-disabled={visualizerPdfUploading}
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-[#0c3f79] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00306a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c3f79] aria-disabled:opacity-60"
          >
            <Upload aria-hidden="true" className="size-4 shrink-0" />
            Ders programı PDF’ini yükle
          </button>
          <p className="mt-2 text-xs text-slate-600">PDF dosyanı bu alana sürükleyebilirsin.</p>
          <p role="status" className={visualizerPdfUploading ? 'mt-2 text-sm font-semibold text-slate-800' : 'sr-only'}>
            {visualizerPdfUploading ? 'Belge analiz ediliyor…' : ''}
          </p>
          {visualizerError && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
              {visualizerError}
            </p>
          )}
        </div>

        {/* OBS Belge Alma Talimatı */}
        <details className="group rounded-lg border border-slate-200 px-3">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-slate-800 focus-visible:outline-2">
            PDF’yi nereden alırım?
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" />
          </summary>
          <ol className="list-decimal space-y-1.5 pb-3 pl-5 text-sm text-slate-700">
            <li>OBS’ye giriş yap ve <strong>Ders Programı</strong> ekranını aç.</li>
            <li><strong>Yazdır</strong> menüsünden <strong>Detay Yazdır</strong> seçeneğine tıkla.</li>
            <li>Yazıcı penceresinde <strong>Hedef: PDF Olarak Kaydet</strong> seç ve dosyayı yükle.</li>
          </ol>
        </details>

        <figure className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
          <figcaption className="mb-2 text-sm font-bold text-slate-800">Örnek çizelge</figcaption>
          <table className="w-full table-fixed text-left text-xs text-slate-700">
            <thead>
              <tr><th scope="col">Saat</th><th scope="col">Pazartesi</th><th scope="col">Salı</th></tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className="py-2 font-medium">09.00</th>
                <td className="rounded bg-blue-100 px-1.5 text-blue-900">Matematik</td>
                <td className="px-1.5">Boş</td>
              </tr>
              <tr>
                <th scope="row" className="py-2 font-medium">10.00</th>
                <td className="px-1.5">Boş</td>
                <td className="rounded bg-amber-100 px-1.5 text-amber-900">Fizik Lab</td>
              </tr>
            </tbody>
          </table>
        </figure>

        {/* Hazırlık Öğrencileri İçin Menü */}
        <div className="max-w-2xl mx-auto mt-6 pt-6 border-t border-slate-200 text-left">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-800">Hazırlık Öğrencisi Misin?</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prep-level" className="block text-xs font-semibold text-slate-700 mb-1.5">1. Kur / Program Seçin</label>
              <select
                id="prep-level"
                value={selectedPrepLevel}
                onChange={(e) => {
                  setSelectedPrepLevel(e.target.value);
                  setSelectedPrepClass('');
                }}
                className="w-full text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0c3f79] focus:border-[#0c3f79] outline-none transition-all cursor-pointer"
              >
                <option value="">Seçiniz...</option>
                {prepLevels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl} (Kur)</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="prep-class" className="block text-xs font-semibold text-slate-700 mb-1.5">2. Sınıf Seçin</label>
              <div className="flex gap-2">
                <select
                  id="prep-class"
                  value={selectedPrepClass}
                  onChange={(e) => setSelectedPrepClass(e.target.value)}
                  disabled={!selectedPrepLevel}
                  className="min-w-0 flex-1 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-2.5 focus:ring-2 focus:ring-[#0c3f79] focus:border-[#0c3f79] outline-none disabled:opacity-50 transition-all cursor-pointer"
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
                  type="button"
                  onClick={() => handlePrepClassSelect()}
                  disabled={!selectedPrepClass}
                  className="px-5 py-2.5 bg-[#0c3f79] hover:bg-[#00306a] disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                >
                  Getir
                </button>
              </div>
            </div>
          </div>
        </div>

      </section>

      {/* YTÜ Dostun Araç Vitrini (Cross-Promotion Grid) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-extrabold text-slate-900">YTÜ Dostun Araçları</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
            Ders programı haricinde kullanabileceğiniz diğer öğrenci araçları
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Araç 0: Harf Notu & Çan Simülatörü (YENİ) */}
          <Link
            href="/harf-notu"
            className="group relative rounded-xl border-2 border-sky-500/35 bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40 p-4 hover:border-sky-500/65 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0c3f79] text-[#e7a240] flex items-center justify-center shadow-2xs">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-sky-600 text-white leading-tight">
                  Yeni
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0c3f79] transition-colors">
                  Harf Notu &amp; Çan Hesaplayıcı
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Vize, final, proje ve lab yüzdelerini özelleştir. Sınıf ortalamalarına göre YTÜ Çan / Katalog harf notunu ve hedef final puanını hesapla.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#0c3f79] group-hover:gap-1.5 transition-all">
              <span>Notunu Simüle Et</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Araç 1: Akademik Planlama */}
          <Link
            href="/planlama"
            className="group relative rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 p-4 hover:border-emerald-500/60 hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Akademik Planlama &amp; Mezuniyet
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Bölüm müfredatını, Bologna ön koşullarını ve seçmeli ders havuzlarını gör. 3 veya 3.5 yılda erken mezuniyeti simüle et.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700 group-hover:gap-1.5 transition-all">
              <span>Planlamaya Başla</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Araç 2: AGNO Hesaplayıcı */}
          <Link
            href="/agno"
            className="group rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  AGNO &amp; Hedef Simülatörü
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Transkript PDF'ini yükleyerek notlarını aktar, dönem sonu ortalamanı ve hedefin için gereken YANO'yu hesapla.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-indigo-700 group-hover:gap-1.5 transition-all">
              <span>AGNO Hesapla</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>

          {/* Araç 3: Devamsızlık Takibi */}
          <Link
            href="/devamsizlik"
            className="group rounded-xl border border-slate-200 bg-slate-50/60 p-4 hover:border-slate-300 hover:bg-white hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                  Devamsızlık Takibi
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  14 haftalık çizelgede kaç ders kaçırdığını işaretle; sınırını aşmadan hangi derse girip girmeyeceğini bil.
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-amber-700 group-hover:gap-1.5 transition-all">
              <span>Devamsızlığa Bak</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
