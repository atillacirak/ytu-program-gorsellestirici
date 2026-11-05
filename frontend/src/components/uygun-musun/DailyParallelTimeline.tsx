"use client";

import React from 'react';
import { Calendar, Coffee, MapPin, Zap, Video } from 'lucide-react';
import { UygunMusunProfile } from '../../types/uygunMusun';
import {
  WEEKDAYS_TR,
  PROFILE_THEMES,
  getDayCourses,
  getActiveCustomStatus,
  isCourseEarlyDismissed,
  toMinutes,
  minutesToTimeStr,
} from '../../utils/uygunMusunEngine';

interface DailyParallelTimelineProps {
  profiles: UygunMusunProfile[];
  selectedDay: string;
  onSelectDay: (day: string) => void;
  todayDayName: string;
  currentMinutes: number;
  nowEpochMs: number;
}

const TIMELINE_HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
];

export default function DailyParallelTimeline({
  profiles,
  selectedDay,
  onSelectDay,
  todayDayName,
  currentMinutes,
  nowEpochMs,
}: DailyParallelTimelineProps) {
  const isViewingToday = selectedDay === todayDayName;
  const loadedProfiles = profiles.filter((p) => p.schedule && p.schedule.schedule);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      {/* Üst Başlık ve Gün Seçici Haplar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#0c3f79]" />
            <h3 className="text-sm font-extrabold text-slate-900">
              Günlük Paralel Zaman Çizelgesi
            </h3>
          </div>
          {isViewingToday && (
            <span className="text-[11px] font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
              Şu An: {minutesToTimeStr(currentMinutes)}
            </span>
          )}
        </div>

        {/* Gün Seçici */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-0.5">
          {WEEKDAYS_TR.map((day) => {
            const active = selectedDay === day;
            const isToday = day === todayDayName;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? 'bg-[#0c3f79] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>{day}</span>
                {isToday && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black uppercase ${
                      active
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    Bugün
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Renk Açıklaması (Legend) */}
      <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-3 flex-wrap text-[11px] font-bold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" />
          <span>Tüm Grup Boş (%100)</span>
        </span>
        {loadedProfiles.length >= 3 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span>Çoğunluk Boş ({loadedProfiles.length - 1}/{loadedProfiles.length})</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
          <span>Online Ders (Müsait)</span>
        </span>
      </div>

      {/* Yatay Kaydırılabilir Çoklu Çizelge Matrisi */}
      <div className="overflow-x-auto">
        <div
          style={{
            minWidth: profiles.length > 2 ? `${62 + profiles.length * 135}px` : '100%',
          }}
        >
          {/* Sütun Başlıkları (Profiller) */}
          <div className="grid grid-cols-[62px_1fr] border-b border-slate-200 bg-slate-100/70">
            <div className="sticky left-0 z-10 bg-slate-100 py-2.5 px-2 text-center text-[10px] font-extrabold uppercase text-slate-500 border-r border-slate-200">
              Saat
            </div>
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, profiles.length)}, minmax(0, 1fr))`,
              }}
            >
              {profiles.map((p, idx) => {
                const theme = PROFILE_THEMES[p.color] || PROFILE_THEMES.blue;
                return (
                  <div
                    key={p.id}
                    className={`py-2 px-2.5 flex items-center justify-center gap-1.5 ${
                      idx < profiles.length - 1 ? 'border-r border-slate-200' : ''
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md ${theme.bg} text-white text-xs flex items-center justify-center shrink-0`}
                    >
                      {p.avatar}
                    </span>
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {p.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saatlik Satırlar */}
          <div className="divide-y divide-slate-100">
            {TIMELINE_HOURS.map((hourStr) => {
              const hrStart = toMinutes(hourStr);
              const hrEnd = hrStart + 50;
              const isCurrentHour =
                isViewingToday && currentMinutes >= hrStart && currentMinutes < hrStart + 60;

              // Her profil için bu saat dilimindeki dersi bul
              const slotPerProfile = profiles.map((p) => {
                const daySlots = getDayCourses(p.schedule, selectedDay);
                const activeCS = isViewingToday ? getActiveCustomStatus(p, nowEpochMs) : null;
                const matching = daySlots.find(
                  (s) => hrStart >= s.start_minutes && hrStart < s.end_minutes
                );
                const early =
                  matching && isViewingToday
                    ? isCourseEarlyDismissed(matching, activeCS, selectedDay)
                    : false;
                const hasSchedule = Boolean(p.schedule && p.schedule.schedule);
                const isBusyPhysical = Boolean(
                  hasSchedule && matching && !early && !matching.is_online
                );
                return { profile: p, slot: matching || null, early, hasSchedule, isBusyPhysical };
              });

              const scheduledMembers = slotPerProfile.filter((x) => x.hasSchedule);
              const busyScheduledCount = scheduledMembers.filter((x) => x.isBusyPhysical).length;

              const isEveryoneFreeThisHour =
                scheduledMembers.length >= 2 && busyScheduledCount === 0;
              const isMajorityFreeThisHour =
                scheduledMembers.length >= 3 && busyScheduledCount === 1;

              return (
                <div
                  key={hourStr}
                  className={`grid grid-cols-[62px_1fr] relative transition-colors ${
                    isCurrentHour
                      ? 'bg-amber-50/40 ring-1 ring-inset ring-rose-300'
                      : isEveryoneFreeThisHour
                      ? 'bg-emerald-50/35'
                      : isMajorityFreeThisHour
                      ? 'bg-amber-50/25'
                      : 'bg-white'
                  }`}
                >
                  {/* Sol Saat Etiketi */}
                  <div
                    className={`sticky left-0 z-10 py-3 px-1.5 flex flex-col items-center justify-center border-r border-slate-100 ${
                      isCurrentHour
                        ? 'bg-rose-50'
                        : isEveryoneFreeThisHour
                        ? 'bg-emerald-50/90'
                        : isMajorityFreeThisHour
                        ? 'bg-amber-50/90'
                        : 'bg-white'
                    }`}
                  >
                    <span
                      className={`font-mono text-xs font-extrabold ${
                        isCurrentHour ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {hourStr}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {minutesToTimeStr(hrEnd)}
                    </span>
                    {isCurrentHour && (
                      <span className="mt-1 text-[9px] font-black uppercase bg-rose-600 text-white px-1.5 py-0.2 rounded-full">
                        ŞU AN
                      </span>
                    )}
                  </div>

                  {/* Profil Hücreleri */}
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(1, profiles.length)}, minmax(0, 1fr))`,
                    }}
                  >
                    {slotPerProfile.map(({ profile, slot, early }, idx) => {
                      const theme = PROFILE_THEMES[profile.color] || PROFILE_THEMES.blue;

                      return (
                        <div
                          key={profile.id}
                          className={`p-2 flex flex-col justify-center min-h-[60px] ${
                            idx < profiles.length - 1 ? 'border-r border-slate-100' : ''
                          }`}
                        >
                          {slot && !early ? (
                            slot.is_online ? (
                              <div
                                className="rounded-xl p-2 border border-rose-300 bg-rose-50/90 text-rose-900 space-y-0.5 shadow-2xs"
                                title="Online Ders (Müsait)"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] font-mono font-extrabold text-rose-700">
                                    {slot.code}
                                  </span>
                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                                    <Video className="w-3 h-3 text-rose-600" />
                                    <span>REC</span>
                                  </span>
                                </div>
                                <p className="text-xs font-extrabold text-rose-950 leading-tight line-clamp-2">
                                  {slot.name}
                                </p>
                              </div>
                            ) : (
                              <div
                                className={`rounded-xl p-2 border ${theme.softBg} ${theme.border} space-y-0.5`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`text-[10px] font-mono font-extrabold ${theme.text}`}
                                  >
                                    {slot.code}
                                  </span>
                                  {slot.classroom && (
                                    <span className="text-[10px] font-bold text-slate-600 bg-white/80 px-1.5 py-0.2 rounded inline-flex items-center gap-0.5 truncate max-w-[90px]">
                                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                                      {slot.classroom}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-extrabold text-slate-900 leading-tight line-clamp-2">
                                  {slot.name}
                                </p>
                              </div>
                            )
                          ) : slot && early ? (
                            <div className="rounded-xl p-2 border border-amber-200 bg-amber-50/70 space-y-0.5">
                              <div className="flex items-center gap-1 text-[10px] font-extrabold text-amber-900">
                                <Zap className="w-3 h-3 fill-current text-amber-600" />
                                <span>Erken Bitti (Boş)</span>
                              </div>
                              <p className="text-[11px] font-semibold text-slate-500 line-through truncate">
                                {slot.name}
                              </p>
                            </div>
                          ) : isEveryoneFreeThisHour ? (
                            <div className="h-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50/80 px-2 py-1.5 flex items-center justify-center gap-1 text-emerald-800">
                              <Coffee className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                              <span className="text-[11px] font-extrabold">Ortak Boş</span>
                            </div>
                          ) : isMajorityFreeThisHour ? (
                            <div className="h-full rounded-xl border border-dashed border-amber-300/90 bg-amber-50/60 px-2 py-1.5 flex items-center justify-center gap-1 text-amber-800">
                              <span className="text-[11px] font-bold">Çoğunluk Boş</span>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <span className="text-[11px] font-semibold text-slate-400">
                                Boş
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
