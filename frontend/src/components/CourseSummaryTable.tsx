import React from 'react';
import { Building2 } from 'lucide-react';
import { getFullInstructorName } from '../utils/instructors';

interface CourseSummaryTableProps {
  visualizerData: any;
  courseNotes: Record<string, string>;
  isEditMode: boolean;
  handleOpenEditModal: (course: any) => void;
  getDocFontClass: () => string;
}

export default function CourseSummaryTable({
  visualizerData,
  courseNotes,
  isEditMode,
  handleOpenEditModal,
  getDocFontClass
}: CourseSummaryTableProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900 ${getDocFontClass()}`}>
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0c3f79]" />
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
              <th className="p-2.5">Derslik (Teori / Lab)</th>
              <th className="p-2.5">Öğretim Elemanı</th>
              <th className="p-2.5 w-1/4">Özel Not</th>
            </tr>
          </thead>
          <tbody>
            {visualizerData.courses_summary?.map((c: any, i: number) => {
              const noteText = courseNotes[c.code];
              const uniqueRooms = Array.from(new Set(c.classrooms || []));
              const roomsText = uniqueRooms.length > 0 ? uniqueRooms.join(', ') : 'Belirtilmedi';

              return (
                <tr
                  key={i}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    isEditMode ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => {
                    if (isEditMode) handleOpenEditModal(c);
                  }}
                >
                  <td className="p-2.5 font-mono font-bold text-[#0c3f79] whitespace-nowrap">{c.code}</td>
                  <td className="p-2.5 font-medium">{c.name}</td>
                  <td className="p-2.5 font-mono">{c.section || '-'}</td>
                  <td className="p-2.5">
                    {uniqueRooms.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {uniqueRooms.map((r: any, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px] text-slate-700">
                            {r}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Belirtilmedi</span>
                    )}
                  </td>
                  <td className="p-2.5 font-medium">
                    {c.instructor ? (
                      <span title={getFullInstructorName(c.instructor)}>
                        {c.instructor}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">-</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    {noteText ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(c);
                        }}
                        className="flex items-start gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded w-full text-left cursor-pointer hover:bg-amber-100 transition-colors border border-amber-100"
                        title="Notu düzenle"
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
  );
}
