import React from 'react';
import { Calendar } from 'lucide-react';
import { getInstructorAbbreviation } from '../utils/instructors';

const CLEAN_OFFICE_PALETTES = [
  { bg: 'bg-blue-50/90', border: 'border-blue-200/90', text: 'text-blue-950', accent: 'text-blue-700', badge: 'bg-white text-blue-800 border-blue-200' },
  { bg: 'bg-emerald-50/90', border: 'border-emerald-200/90', text: 'text-emerald-950', accent: 'text-emerald-800', badge: 'bg-white text-emerald-800 border-emerald-200' },
  { bg: 'bg-rose-50/90', border: 'border-rose-200/90', text: 'text-rose-950', accent: 'text-rose-800', badge: 'bg-white text-rose-800 border-rose-200' },
  { bg: 'bg-amber-50/90', border: 'border-amber-200/90', text: 'text-amber-950', accent: 'text-amber-800', badge: 'bg-white text-amber-800 border-amber-200' },
  { bg: 'bg-purple-50/90', border: 'border-purple-200/90', text: 'text-purple-950', accent: 'text-purple-800', badge: 'bg-white text-purple-800 border-purple-200' },
  { bg: 'bg-teal-50/90', border: 'border-teal-200/90', text: 'text-teal-950', accent: 'text-teal-800', badge: 'bg-white text-teal-800 border-teal-200' },
  { bg: 'bg-orange-50/90', border: 'border-orange-200/90', text: 'text-orange-950', accent: 'text-orange-800', badge: 'bg-white text-orange-800 border-orange-200' },
  { bg: 'bg-cyan-50/90', border: 'border-cyan-200/90', text: 'text-cyan-950', accent: 'text-cyan-800', badge: 'bg-white text-cyan-800 border-cyan-200' },
  { bg: 'bg-fuchsia-50/90', border: 'border-fuchsia-200/90', text: 'text-fuchsia-950', accent: 'text-fuchsia-800', badge: 'bg-white text-fuchsia-800 border-fuchsia-200' },
  { bg: 'bg-lime-50/90', border: 'border-lime-200/90', text: 'text-lime-950', accent: 'text-lime-800', badge: 'bg-white text-lime-800 border-lime-200' },
];

interface ScheduleTableProps {
  visualizerViewMode: 'table' | 'cards' | 'summary';
  visualizerData: any;
  visualizerScheduleRef: React.RefObject<HTMLDivElement | null>;
  getDocFontClass: () => string;
  selectedPrepClass: string;
  visualizerColorMode: 'colored' | 'monochrome';
  uniqueColorKeysForSchedule: string[];
  showSection: boolean;
  showInstructor: boolean;
  showNotes: boolean;
  isEditMode: boolean;
  handleOpenEditModal: (course: any) => void;
  scheduleFontScale: number;
  courseNotes: Record<string, string>;
}

export default function ScheduleTable({
  visualizerViewMode,
  visualizerData,
  visualizerScheduleRef,
  getDocFontClass,
  selectedPrepClass,
  visualizerColorMode,
  uniqueColorKeysForSchedule,
  showSection,
  showInstructor,
  showNotes,
  isEditMode,
  handleOpenEditModal,
  scheduleFontScale,
  courseNotes
}: ScheduleTableProps) {
  if (visualizerViewMode !== 'table' && visualizerViewMode !== 'cards') return null;

  return (
    <>
      {visualizerViewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 overflow-x-auto">
          <div
            id="visualizer-a4-document"
            ref={visualizerScheduleRef}
            className={`a4-print-target bg-white text-slate-900 p-6 space-y-3 w-full mx-auto rounded-none border-0 transition-all ${getDocFontClass()}`}
            style={{
              minWidth: '980px',
              maxWidth: '1120px',
            }}
          >
            {/* Resmi Kurumsal Belge Başlığı */}
            <div className="border-b border-slate-300 pb-2.5 flex items-center justify-between">
              <div className="space-y-0.5 min-w-[200px]">
                <h2 className="font-black text-sm tracking-wide uppercase text-slate-950">
                  YILDIZ TEKNİK ÜNİVERSİTESİ
                </h2>
                <h3 className="text-xs font-semibold text-slate-600">
                  Ders Programı - Gönüllü Proje
                </h3>
              </div>

              {visualizerData?.courses_summary?.some((c: any) => c.code === "HAZIRLIK") && selectedPrepClass && (
                <div className="text-center px-4 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-bold tracking-[0.25em] text-slate-500 uppercase mb-0.5">
                    İNGİLİZCE HAZIRLIK
                  </span>
                  <span className="font-black text-xl text-[#0c3f79] tracking-tight leading-none">
                    {selectedPrepClass.replace('/', ' / ')}
                  </span>
                </div>
              )}

              {visualizerData.term && (
                <div className="min-w-[200px] flex justify-end">
                  <div className="text-right text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <p className="text-slate-700 text-[11px] font-mono font-semibold">
                      {visualizerData.term.trim()} Yarıyılı
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Resmi Tablo Gövdesi */}
            <table className="w-full border-collapse text-xs select-none table-fixed border border-slate-300">
              <thead>
                <tr className="border-b border-slate-300 text-slate-700 bg-slate-100 text-[10px]">
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
                  const isPrep = visualizerData.courses_summary?.some((c: any) => c.code === "HAZIRLIK");
                  const VISUALIZER_HOURS = isPrep ? [
                    { start: '07:30', end: '08:15' },
                    { start: '08:30', end: '09:15' },
                    { start: '09:30', end: '10:15' },
                    { start: '10:30', end: '11:15' },
                    { start: '11:30', end: '12:15' },
                    { start: '12:15', end: '13:15', isBreak: true, label: 'ÖĞLE ARASI' },
                    { start: '13:15', end: '14:00' },
                    { start: '14:15', end: '15:00' },
                    { start: '15:15', end: '16:00' }
                  ] : [
                    { start: '08:00', end: '08:50' },
                    { start: '09:00', end: '09:50' },
                    { start: '10:00', end: '10:50' },
                    { start: '11:00', end: '11:50' },
                    { start: '12:00', end: '12:50' },
                    { start: '13:00', end: '13:50' },
                    { start: '14:00', end: '14:50' },
                    { start: '15:00', end: '15:50' },
                    { start: '16:00', end: '16:50' },
                    { start: '17:00', end: '17:50' },
                    { start: '18:00', end: '18:50' },
                    { start: '19:00', end: '19:50' },
                    { start: '20:00', end: '20:50' }
                  ];

                  const VIS_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

                  const toMinutes = (timeStr: string) => {
                    const parts = timeStr.replace('.', ':').split(':');
                    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
                  };

                  const MONOCHROME_PALETTE = {
                    bg: 'bg-slate-100',
                    border: 'border-slate-300',
                    text: 'text-slate-900',
                    accent: 'text-slate-950 font-bold',
                    badge: 'bg-white text-slate-900 border-slate-300 font-semibold'
                  };

                  const activePalettes = isPrep 
                    ? CLEAN_OFFICE_PALETTES.filter(p => !p.bg.includes('amber') && !p.bg.includes('orange'))
                    : CLEAN_OFFICE_PALETTES;

                  const getCourseColor = (code: string, instructor?: string) => {
                    if (visualizerColorMode === 'monochrome') {
                      return MONOCHROME_PALETTE;
                    }
                    
                    const colorKey = instructor && instructor.trim() ? instructor.trim() : code;
                    
                    const idx = uniqueColorKeysForSchedule.indexOf(colorKey);
                    if (idx !== -1) {
                      return activePalettes[idx % activePalettes.length];
                    }
                    
                    let hash = 0;
                    for (let i = 0; i < colorKey.length; i++) {
                      hash = colorKey.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    return activePalettes[Math.abs(hash) % activePalettes.length];
                  };

                  const grid: Record<string, Record<number, any>> = {};
                  VIS_DAYS.forEach(d => { grid[d] = {}; });

                  VIS_DAYS.forEach(day => {
                    const items = visualizerData.schedule[day] || [];
                    items.forEach((it: any) => {
                      const startM = toMinutes(it.start_time);
                      const endM = toMinutes(it.end_time);

                      VISUALIZER_HOURS.forEach((hrSlot, hrIdx) => {
                        if ((hrSlot as any).isBreak) return;
                        const hrM = toMinutes(hrSlot.start);
                        if (hrM >= startM && hrM < endM) {
                          grid[day][hrIdx] = it;
                        }
                      });
                    });
                  });

                  const skipCells: Record<string, Set<number>> = {};
                  VIS_DAYS.forEach(d => { skipCells[d] = new Set(); });

                  const SLOT_HEIGHT = 54;

                  return VISUALIZER_HOURS.map((hrSlot: any, hrIdx) => {
                    if (hrSlot.isBreak) {
                      return (
                        <tr key={hrSlot.start} className="border-b border-slate-300" style={{ height: `${Math.round(SLOT_HEIGHT * 0.7)}px` }}>
                          <td
                            className="p-1 border-r border-slate-300 text-center font-mono text-[11px] font-medium text-slate-600 bg-slate-50 align-middle whitespace-nowrap"
                            style={{ height: `${Math.round(SLOT_HEIGHT * 0.7)}px` }}
                          >
                            {hrSlot.start} - {hrSlot.end}
                          </td>
                          <td colSpan={5} className="p-1 bg-amber-50/70 border-amber-200 text-amber-700 text-center uppercase h-full relative">
                            <div className="flex items-center justify-center gap-2 w-full h-full">
                              <span className="font-bold text-xs tracking-[0.2em]">{hrSlot.label}</span>
                              <span className="font-normal text-xs tracking-normal opacity-90">
                                ({hrSlot.start} - {hrSlot.end})
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const hourLabel = `${hrSlot.start} - ${hrSlot.end}`;

                    return (
                      <tr key={hrSlot.start} className="border-b border-slate-300" style={{ height: `${SLOT_HEIGHT}px` }}>
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
                            grid[day][hrIdx + span]?.classroom === it.classroom &&
                            grid[day][hrIdx + span]?.instructor === it.instructor
                          ) {
                            skipCells[day].add(hrIdx + span);
                            span++;
                          }

                          const displayEndTime = grid[day][hrIdx + span - 1]?.end_time || it.end_time;

                          const palette = getCourseColor(it.code, it.instructor);

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
                          const noteText = courseNotes[it.code];
                          const instInfo = getInstructorAbbreviation(it.instructor);

                          return (
                            <td
                              key={day}
                              rowSpan={span}
                              style={{ height: `${span * SLOT_HEIGHT}px` }}
                              className={`p-0.5 border-r border-slate-300 align-top h-full ${
                                isLastCol ? 'border-r-0' : ''
                              }`}
                            >
                              <div
                                onClick={() => {
                                  if (isEditMode) handleOpenEditModal(it);
                                }}
                                className={`h-full w-full p-2 rounded border ${palette.bg} ${palette.border} flex flex-col justify-between ${
                                  span === 1 ? 'space-y-0.5' : 'space-y-1.5'
                                } transition-all shadow-xs overflow-hidden relative ${
                                  isEditMode
                                    ? 'cursor-pointer ring-2 ring-amber-400 ring-offset-1 hover:brightness-95 hover:shadow-md'
                                    : ''
                                }`}
                              >
                                <div className="space-y-1 min-w-0">
                                  {/* Başlık, Şube Bilgisi, Düzenle ve Online Simgeleri */}
                                  <div className="flex items-center justify-between gap-1 min-w-0">
                                    <span
                                      style={{ fontSize: `${Math.round(12 * scheduleFontScale)}px` }}
                                      className={`font-mono font-bold whitespace-nowrap ${palette.accent}`}
                                    >
                                      {it.code} {showSection && it.section ? `(Şb. ${it.section})` : ''}
                                    </span>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {isEditMode && (
                                        <span
                                          className="p-0.5 rounded bg-amber-400 text-slate-950 text-[9px] shadow-2xs font-bold leading-none"
                                          title="Not Ekle / Düzenle"
                                        >
                                          ✏️
                                        </span>
                                      )}

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
                                  </div>

                                  {/* Ders Adı */}
                                  <h4
                                    style={{ fontSize: `${Math.round(11 * scheduleFontScale)}px`, lineHeight: 1.25 }}
                                    className={`font-semibold ${palette.text} break-words whitespace-normal leading-snug`}
                                  >
                                    {it.name}
                                  </h4>

                                  {/* Not Kısmı: Ders Adı ile Saat/Derslik Arasında */}
                                  {showNotes && (
                                    noteText ? (
                                      <div
                                        onClick={(e) => {
                                          if (isEditMode) {
                                            e.stopPropagation();
                                            handleOpenEditModal(it);
                                          }
                                        }}
                                        style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border font-semibold max-w-full shadow-2xs ${
                                          isEditMode ? 'cursor-pointer hover:bg-amber-200/90' : ''
                                        } ${
                                          isMonochrome
                                            ? 'bg-white border-slate-300 text-slate-800'
                                            : 'bg-amber-100/90 border-amber-300 text-amber-950'
                                        }`}
                                        title={`Not: ${noteText}`}
                                      >
                                        <span className="shrink-0">📌</span>
                                        <span className="truncate max-w-[130px]">{noteText}</span>
                                      </div>
                                    ) : isEditMode ? (
                                      <div
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenEditModal(it);
                                        }}
                                        style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-amber-400 bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 font-medium cursor-pointer transition-colors max-w-full shadow-2xs"
                                        title="Bu derse not ekle"
                                      >
                                        <span className="text-[9px]">✏️</span>
                                        <span className="truncate">+ Not ekle...</span>
                                      </div>
                                    ) : null
                                  )}
                                </div>

                                {/* Alt Bilgi: Saat, Derslik Rozeti ve Hoca Kısaltması */}
                                <div className="pt-1 border-t border-slate-200/80 text-slate-600 space-y-1 min-w-0">
                                  <p
                                    style={{ fontSize: `${Math.round(9.5 * scheduleFontScale)}px` }}
                                    className="font-mono text-slate-500 font-medium whitespace-nowrap"
                                  >
                                    {it.start_time} - {displayEndTime}
                                  </p>

                                  <div className="flex items-center gap-1 flex-wrap">
                                    {it.classroom ? (
                                      <div
                                        style={{ fontSize: `${Math.round(10.5 * scheduleFontScale)}px` }}
                                        className={`inline-block px-1.5 py-0.5 rounded-md border font-mono font-bold shadow-2xs whitespace-nowrap shrink-0 ${palette.badge}`}
                                      >
                                        <span>
                                          {formatClassroomLabel(it.classroom, it.is_lab)}
                                        </span>
                                      </div>
                                    ) : null}

                                    {showInstructor && it.instructor ? (
                                      <div
                                        style={{ fontSize: `${Math.round(10.5 * scheduleFontScale)}px` }}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-mono font-bold shadow-2xs whitespace-nowrap shrink-0 ${palette.badge}`}
                                      >
                                        <span className="text-[9.5px]">👤</span>
                                        <span>{it.instructor.trim()}</span>
                                      </div>
                                    ) : null}
                                  </div>
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

      {visualizerViewMode === 'cards' && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${getDocFontClass()}`}>
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
                    const noteText = courseNotes[it.code];
                    const instInfo = getInstructorAbbreviation(it.instructor);

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (isEditMode) handleOpenEditModal(it);
                        }}
                        className={`p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 shadow-2xs ${
                          isEditMode ? 'cursor-pointer ring-2 ring-amber-400 ring-offset-1 hover:brightness-95' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            style={{ fontSize: `${Math.round(12 * scheduleFontScale)}px` }}
                            className="font-mono font-bold text-blue-700 whitespace-nowrap"
                          >
                            {it.code} {showSection && it.section ? `(Şb. ${it.section})` : ''}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {it.classroom && (
                              <span
                                style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                className="font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-700 whitespace-nowrap shrink-0 font-medium"
                              >
                                {it.classroom}
                              </span>
                            )}
                            {showInstructor && it.instructor && (
                              <span
                                style={{ fontSize: `${Math.round(10 * scheduleFontScale)}px` }}
                                className="font-mono px-1.5 py-0.5 rounded bg-white border border-slate-300 text-slate-800 whitespace-nowrap shrink-0 font-bold flex items-center gap-1"
                              >
                                <span>👤</span>
                                <span>{it.instructor.trim()}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <h4
                          style={{ fontSize: `${Math.round(12 * scheduleFontScale)}px` }}
                          className="font-semibold text-slate-900"
                        >
                          {it.name}
                        </h4>

                        {showNotes && noteText && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(it);
                            }}
                            style={{ fontSize: `${Math.round(10.5 * scheduleFontScale)}px` }}
                            className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-medium flex items-center gap-1 cursor-pointer"
                          >
                            <span className="shrink-0">📌</span>
                            <span className="truncate">{noteText}</span>
                          </div>
                        )}

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
    </>
  );
}
