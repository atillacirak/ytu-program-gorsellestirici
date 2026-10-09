import React from 'react';
import { X, Edit3, StickyNote, Trash2, Check } from 'lucide-react';

interface EditCourseModalProps {
  editingCourse: any;
  editingCourseForm: {
    originalCode: string;
    originalName: string;
    originalSection: string;
    code: string;
    name: string;
    section: string;
    classroom: string;
    instructor: string;
    note: string;
  };
  setEditingCourseForm: React.Dispatch<React.SetStateAction<any>>;
  courseNotes: Record<string, string>;
  handleDeleteNoteFromForm: () => void;
  setEditingCourse: (course: any | null) => void;
  handleSaveCourseForm: () => void;
  getDocFontClass: () => string;
}

export default function EditCourseModal({
  editingCourse,
  editingCourseForm,
  setEditingCourseForm,
  courseNotes,
  handleDeleteNoteFromForm,
  setEditingCourse,
  handleSaveCourseForm,
  getDocFontClass
}: EditCourseModalProps) {
  if (!editingCourse) return null;

  return (
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
          <div className="p-2 rounded-lg bg-blue-50 text-[#0c3f79]">
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
                onChange={(e) => setEditingCourseForm((prev: any) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="Örn: BLM1011"
                className="w-full text-xs font-mono font-semibold text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0c3f79] focus:ring-1 focus:ring-[#0c3f79] focus:outline-none uppercase"
              />
            </div>
            <div className="col-span-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Şube (Grup)
              </label>
              <input
                type="text"
                value={editingCourseForm.section}
                onChange={(e) => setEditingCourseForm((prev: any) => ({ ...prev, section: e.target.value }))}
                placeholder="Örn: 1 veya A"
                className="w-full text-xs font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0c3f79] focus:ring-1 focus:ring-[#0c3f79] focus:outline-none"
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
                onChange={(e) => setEditingCourseForm((prev: any) => ({ ...prev, instructor: e.target.value }))}
                placeholder="Örn: ACK, MEK"
                className="w-full text-xs font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0c3f79] focus:ring-1 focus:ring-[#0c3f79] focus:outline-none"
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
                onChange={(e) => setEditingCourseForm((prev: any) => ({ ...prev, name: e.target.value }))}
                placeholder="Dersin tam veya kısa adı"
                className="w-full text-xs font-medium text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0c3f79] focus:ring-1 focus:ring-[#0c3f79] focus:outline-none"
              />
            </div>
            <div className="col-span-4">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Derslik
              </label>
              <input
                type="text"
                value={editingCourseForm.classroom}
                onChange={(e) => setEditingCourseForm((prev: any) => ({ ...prev, classroom: e.target.value }))}
                placeholder="Örn: D-201, Lab 3"
                className="w-full text-xs font-mono text-slate-900 px-3 py-2 rounded-lg border border-slate-300 focus:border-[#0c3f79] focus:ring-1 focus:ring-[#0c3f79] focus:outline-none"
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
            onChange={(e) => setEditingCourseForm((prev: any) => ({ ...prev, note: e.target.value }))}
            placeholder="Örn: Vize %40, Proje %30 | Yoklama zorunlu | Teams kodu: abc123"
            className="w-full text-xs text-slate-900 p-2.5 rounded-xl border border-slate-300 focus:border-[#0c3f79] focus:ring-1 focus:ring-[#0c3f79] focus:outline-none transition-all placeholder:text-slate-400"
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
                    setEditingCourseForm((prev: any) => ({
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
            {(courseNotes[`${editingCourseForm.originalCode}_${editingCourseForm.originalName}`] || editingCourseForm.note) && (
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
              className="px-4 py-2 bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Değişiklikleri Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
