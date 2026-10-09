"use client";

import React from 'react';
import {
  Calendar, Building2, Upload, Download, Printer, LayoutGrid, BookOpen, Clock,
  Palette, Pencil, X, Check, Trash2, StickyNote, GraduationCap, Layers,
  RotateCcw, Calculator, FileText
} from 'lucide-react';

interface ScheduleToolbarProps {
  visualizerData: any;
  handleTransferToAbsence: () => void;
  handleTransferToAgno: () => void;
  handleExportVisualizerPNG: () => void;
  handleVisualizerPdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setVisualizerData: (val: any) => void;
  setOriginalVisualizerData: (val: any) => void;
  visualizerViewMode: 'table' | 'cards' | 'summary';
  setVisualizerViewMode: (val: 'table' | 'cards' | 'summary') => void;
  visualizerColorMode: 'colored' | 'monochrome';
  setVisualizerColorMode: (val: 'colored' | 'monochrome') => void;
  showInstructor: boolean;
  handleToggleShowInstructor: (val: boolean) => void;
  showSection: boolean;
  handleToggleShowSection: (val: boolean) => void;
  showNotes: boolean;
  handleToggleShowNotes: (val: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  scheduleFontFamily: 'default' | 'inter' | 'lora' | 'mono';
  handleChangeFontFamily: (family: 'default' | 'inter' | 'lora' | 'mono') => void;
  scheduleFontScale: number;
  handleChangeFontScale: (scale: number) => void;
  handleResetChanges: () => void;
  getTotalWeeklyHours: (summary?: any[]) => number;
}

export default function ScheduleToolbar({
  visualizerData,
  handleTransferToAbsence,
  handleTransferToAgno,
  handleExportVisualizerPNG,
  handleVisualizerPdfUpload,
  setVisualizerData,
  setOriginalVisualizerData,
  visualizerViewMode,
  setVisualizerViewMode,
  visualizerColorMode,
  setVisualizerColorMode,
  showInstructor,
  handleToggleShowInstructor,
  showSection,
  handleToggleShowSection,
  showNotes,
  handleToggleShowNotes,
  isEditMode,
  setIsEditMode,
  scheduleFontFamily,
  handleChangeFontFamily,
  scheduleFontScale,
  handleChangeFontScale,
  handleResetChanges,
  getTotalWeeklyHours
}: ScheduleToolbarProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4 no-print text-slate-900">
      {/* Satır 1: Başlık ve Ana Eylem Butonları */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Program Başlık Alanı */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-[#0c3f79] font-bold text-base shadow-2xs">
            <Calendar className="w-5 h-5 text-[#0c3f79]" />
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

        {/* Hızlı Eylemler (Aktar / Kaydet / Yazdır / Değiştir) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTransferToAbsence}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Bu programdaki dersleri Devamsızlık Takibi sayfasına aktarır"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Devamsızlığa Gönder</span>
          </button>

          <button
            onClick={handleTransferToAgno}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
            title="Bu programdaki dersleri AGNO Hesaplama sayfasına aktarır"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>AGNO'ya Gönder</span>
          </button>

          <button
            onClick={handleExportVisualizerPNG}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-semibold rounded-lg shadow-2xs transition-all cursor-pointer"
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

          <button
            onClick={() => { setVisualizerData(null); setOriginalVisualizerData(null); }}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-medium rounded-lg border border-rose-200 transition-all shadow-2xs cursor-pointer"
            title="Kayıtlı Programı Kaldır"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Kaldır</span>
          </button>
        </div>
      </div>

      {/* Satır 2: Görünüm Seçenekleri ve Filtreler */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Görünüm Modu */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
            <button
              onClick={() => setVisualizerViewMode('table')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                visualizerViewMode === 'table'
                  ? 'bg-[#0c3f79] text-white shadow-2xs'
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
                  ? 'bg-[#0c3f79] text-white shadow-2xs'
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
                  ? 'bg-[#0c3f79] text-white shadow-2xs'
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
                  ? 'bg-[#0c3f79] text-white shadow-2xs'
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
                  ? 'bg-[#0c3f79] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Standart Renksiz / Sade Görünüm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sade</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bilgi Göster / Gizle Seçenekleri */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1">
            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all select-none shadow-2xs" title="Hoca kısaltmalarını göster/gizle">
              <input
                type="checkbox"
                checked={showInstructor}
                onChange={(e) => handleToggleShowInstructor(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#0c3f79] focus:ring-0 cursor-pointer accent-[#0c3f79]"
              />
              <GraduationCap className="w-3.5 h-3.5 text-[#0c3f79]" />
              <span>Hoca</span>
            </label>

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all select-none shadow-2xs" title="Şube (grup) bilgisini göster/gizle">
              <input
                type="checkbox"
                checked={showSection}
                onChange={(e) => handleToggleShowSection(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#0c3f79] focus:ring-0 cursor-pointer accent-[#0c3f79]"
              />
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Şube</span>
            </label>

            <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 rounded-md border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-all select-none shadow-2xs" title="Ders notlarını göster/gizle">
              <input
                type="checkbox"
                checked={showNotes}
                onChange={(e) => handleToggleShowNotes(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-[#0c3f79] focus:ring-0 cursor-pointer accent-[#0c3f79]"
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
        </div>
      </div>

      {/* Düzenle Modu Aktif Bilgilendirme ve Özelleştirme Çubuğu */}
      {isEditMode && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs animate-fade-in no-print">
          <div className="flex items-center gap-2 font-medium">
            <Pencil className="w-4 h-4 text-[#d38e2c] shrink-0" />
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
                  scheduleFontFamily === 'default' ? 'bg-[#0c3f79] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Default (Orijinal düzen - Başlıklar sans, kod/saat mono)"
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => handleChangeFontFamily('inter')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  scheduleFontFamily === 'inter' ? 'bg-[#0c3f79] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Modern (Inter Sans - Temiz ve kurumsal)"
              >
                Modern
              </button>
              <button
                type="button"
                onClick={() => handleChangeFontFamily('lora')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-serif font-semibold transition-all cursor-pointer ${
                  scheduleFontFamily === 'lora' ? 'bg-[#0c3f79] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
                }`}
                title="Zarif (Lora Serif - Prestijli akademik tırnaklı)"
              >
                Zarif
              </button>
              <button
                type="button"
                onClick={() => handleChangeFontFamily('mono')}
                className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                  scheduleFontFamily === 'mono' ? 'bg-[#0c3f79] text-white shadow-2xs' : 'text-slate-700 hover:bg-slate-100'
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
  );
}
