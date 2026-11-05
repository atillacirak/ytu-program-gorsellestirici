"use client";

import React from 'react';
import { GraduationCap, X, Calendar, Check } from 'lucide-react';

interface PrepScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPrepLevel: string;
  setSelectedPrepLevel: (val: string) => void;
  selectedPrepClass: string;
  setSelectedPrepClass: (val: string) => void;
  prepLevels: string[];
  prepClassesForLevel: string[];
  handlePrepClassSelect: () => void;
}

export default function PrepScheduleModal({
  isOpen,
  onClose,
  selectedPrepLevel,
  setSelectedPrepLevel,
  selectedPrepClass,
  setSelectedPrepClass,
  prepLevels,
  prepClassesForLevel,
  handlePrepClassSelect
}: PrepScheduleModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrepClass) return;
    handlePrepClassSelect();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#0c3f79] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-bold text-sm sm:text-base">
            <div className="p-1.5 bg-white/10 rounded-lg text-amber-400">
              <GraduationCap size={20} />
            </div>
            <span>İngilizce Hazırlık Ders Programı</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-left">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Yabancı Diller Yüksekokulu haftalık resmi ders programlarından kur ve şubenizi seçerek anında görsel çizelgeye dönüştürebilirsiniz.
          </p>

          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                1. Kur / Program Seçin
              </label>
              <select
                value={selectedPrepLevel}
                onChange={(e) => {
                  setSelectedPrepLevel(e.target.value);
                  setSelectedPrepClass('');
                }}
                className="w-full text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0c3f79] focus:border-[#0c3f79] outline-none transition-all cursor-pointer"
              >
                <option value="">Kur Seçiniz...</option>
                {prepLevels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl} (Kur)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                2. Şube / Sınıf Seçin
              </label>
              <select
                value={selectedPrepClass}
                onChange={(e) => setSelectedPrepClass(e.target.value)}
                disabled={!selectedPrepLevel}
                className="w-full text-sm font-medium text-slate-900 bg-white border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-[#0c3f79] focus:border-[#0c3f79] outline-none disabled:opacity-50 transition-all cursor-pointer"
              >
                <option value="">
                  {selectedPrepLevel ? 'Sınıf Seçiniz...' : 'Önce Kur Seçiniz'}
                </option>
                {prepClassesForLevel.map((cls) => {
                  const clsNo = cls.split('/')[0].split('-')[1];
                  const room = cls.split('/')[1] || '';
                  return (
                    <option key={cls} value={cls}>
                      Sınıf {clsNo} {room ? `(Derslik: ${room})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!selectedPrepClass}
              className="px-5 py-2 bg-[#0c3f79] hover:bg-[#00306a] disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Check size={15} />
              <span>Programı Yükle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
