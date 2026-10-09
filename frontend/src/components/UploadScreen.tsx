import React from 'react';
import { FileText, Upload, RefreshCw, AlertCircle, GraduationCap, Calendar, Building2, Layers } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

interface UploadScreenProps {
  stats: { total_generated: number; total_visits: number } | null;
  visualizerError: string | null;
  visualizerPdfUploading: boolean;
  handleVisualizerPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs relative overflow-hidden space-y-5">
        <div className="flex flex-col md:flex-row items-center gap-6 justify-between relative z-10">
          <div className="max-w-2xl space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold">
              <GraduationCap className="w-4 h-4 text-amber-500" />
              <span>Yıldız Teknik Üniversitesi — Öğrenci Bilgi Sistemi (OBS)</span>
            </div>

            <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
              Öğrenci Haftalık Ders Programı <span className="text-[#0c3f79]">Çizelgesi</span>
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">
              OBS sistemi üzerinden temin ettiğiniz resmi <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Report.pdf</span> (Öğrenci Ders Programı) belgesini sisteme yükleyiniz. Belgedeki ders kodları, şube numaraları, teori ve laboratuvar derslikleri ile öğretim elemanları otomatik olarak çözümlenerek resmi A4 haftalık akademik çizelge formatında görselleştirilecektir.
            </p>
          </div>

          <div className="flex-shrink-0 w-full md:w-auto hidden sm:flex">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-1 w-48 shadow-2xs">
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Bugüne Kadar</div>
              <div className="text-3xl font-black text-[#0c3f79] font-mono tracking-tighter">
                {stats ? <AnimatedCounter value={stats.total_generated} /> : '...'}
              </div>
              <div className="text-xs font-medium text-slate-600">YTÜ'lü Program Çıkardı</div>
            </div>
          </div>
        </div>

        {/* OBS Belge Alma Talimatı */}
        <div className="p-4 bg-[#e7a240]/[0.05] border border-[#e7a240]/30 rounded-xl space-y-2.5 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <FileText className="w-4 h-4 text-[#d38e2c]" />
            <span>OBS Üzerinden Ders Programı PDF'i Nasıl Alınır?</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3 rounded-lg border border-[#e7a240]/25 shadow-2xs">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#e7a240] to-[#d38e2c] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-2xs">1</span>
              <span><strong>OBS</strong> sistemine giriş yapınız ve <strong>Ders Programı</strong> ekranını açınız.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3 rounded-lg border border-[#e7a240]/25 shadow-2xs">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#e7a240] to-[#d38e2c] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-2xs">2</span>
              <span>Sayfadaki <strong>"Yazdır"</strong> butonunu seçip açılan ekranda <strong>"Save / Kaydet"</strong> tuşuna basarak PDF belgesini indiriniz.</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-white p-3 rounded-lg border border-[#e7a240]/25 shadow-2xs">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#e7a240] to-[#d38e2c] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-2xs">3</span>
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
            ? 'border-[#0c3f79] bg-blue-50/40'
            : 'border-slate-300 hover:border-[#0c3f79] bg-slate-50/70 hover:bg-slate-100/70'
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
              <RefreshCw className="w-8 h-8 text-[#0c3f79] animate-spin" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">Belge Analiz Ediliyor...</p>
                <p className="text-xs text-slate-500">Ders kayıtları, derslikler ve öğretim üyeleri eşleştirilmektedir</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-14 h-14 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-[#0c3f79] shadow-xs">
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
                <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-semibold rounded-lg shadow-xs transition-all">
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
                className="w-full text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0c3f79] focus:border-[#0c3f79] outline-none transition-all cursor-pointer"
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
                  className="flex-1 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-lg px-2 py-2.5 focus:ring-2 focus:ring-[#0c3f79] focus:border-[#0c3f79] outline-none disabled:opacity-50 transition-all cursor-pointer"
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
                  className="px-5 py-2.5 bg-[#0c3f79] hover:bg-[#00306a] disabled:bg-slate-300 text-white text-sm font-bold rounded-lg transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
                >
                  Getir
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Resmi Bilgi Kartları */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-1">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
            <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#0c3f79]" />
              Haftalık Akademik Çizelge
            </div>
            <p className="text-[11px] text-slate-500">Ders saatleri bloklar halinde haftalık resmi şablona yerleştirilir.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
            <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#0c3f79]" />
              Derslik ve Laboratuvarlar
            </div>
            <p className="text-[11px] text-slate-500">Teorik derslikler ve LAB ortamları açık ve net şekilde belirtilir.</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1">
            <div className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#0c3f79]" />
              Ders ve Şube Bilgileri
            </div>
            <p className="text-[11px] text-slate-500">Belgedeki tüm ders kodları ve şubeler çizelgeye eksiksiz yerleştirilir.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
