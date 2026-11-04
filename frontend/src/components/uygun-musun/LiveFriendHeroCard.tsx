"use client";

import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Zap,
  Calendar,
  ChevronDown,
  ChevronUp,
  Upload,
  Edit3,
} from 'lucide-react';
import { ProfileLiveStatus, UygunMusunProfile } from '../../types/uygunMusun';
import {
  PROFILE_THEMES,
  formatDurationTr,
  isCourseEarlyDismissed,
} from '../../utils/uygunMusunEngine';

interface LiveFriendHeroCardProps {
  profile: UygunMusunProfile;
  liveStatus: ProfileLiveStatus;
  dayName: string;
  currentMinutes: number;
  isMe?: boolean;
  onOpenStatusSheet?: () => void;
  onOpenScheduleUpload?: () => void;
}

export default function LiveFriendHeroCard({
  profile,
  liveStatus,
  dayName,
  currentMinutes,
  isMe = false,
  onOpenStatusSheet,
  onOpenScheduleUpload,
}: LiveFriendHeroCardProps) {
  const [showTodayList, setShowTodayList] = useState(!isMe);
  const theme = PROFILE_THEMES[profile.color] || PROFILE_THEMES.violet;
  const cs = liveStatus.activeCustomStatus;

  // Durum renk şeması
  const isBusy = liveStatus.state === 'IN_CLASS';
  const hasSchedule = liveStatus.state !== 'NO_SCHEDULE';

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
        isMe ? 'border-slate-200' : 'border-slate-200/90 ring-1 ring-slate-900/5'
      }`}
    >
      {/* Üst Başlık Şeridi */}
      <div
        className={`px-4 py-3.5 flex items-center justify-between gap-3 border-b ${
          isBusy
            ? 'bg-gradient-to-r from-rose-50 via-orange-50/60 to-white border-rose-100'
            : hasSchedule
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border-emerald-100'
            : 'bg-slate-50 border-slate-100'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-2xl ${theme.bg} text-white flex items-center justify-center text-xl shadow-xs shrink-0`}
          >
            {profile.avatar || '🎓'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-extrabold text-slate-900 truncate">
                {profile.name}
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isMe
                    ? 'bg-slate-200 text-slate-700'
                    : `${theme.badgeBg}`
                }`}
              >
                {isMe ? 'Senin Durumun' : 'Arkadaşın'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium truncate">
              {dayName} Günü Canlı Durumu
            </p>
          </div>
        </div>

        {/* Canlı Durum Rozeti */}
        {hasSchedule && (
          <div className="shrink-0">
            {isBusy ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-rose-600 text-white shadow-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                DERSTE
              </span>
            ) : liveStatus.isEarlyExitActive ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-amber-500 text-slate-950 shadow-xs">
                <Zap className="w-3.5 h-3.5 fill-current" />
                ERKEN ÇIKTI
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                MÜSAİT
              </span>
            )}
          </div>
        )}
      </div>

      <div className="p-4 space-y-3.5">
        {/* Kişinin Girdiği Canlı Durum / Konum Notu Kutusu */}
        {cs && (
          <div className="rounded-xl bg-amber-50/90 border border-amber-200/90 p-3 flex items-start justify-between gap-2.5 shadow-2xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="text-xl leading-none mt-0.5 shrink-0">{cs.emoji || '💬'}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-extrabold text-amber-950">
                    {cs.label || 'Anlık Durum Notu'}
                  </span>
                  {cs.early_exit && (
                    <span className="text-[10px] font-extrabold bg-amber-200/90 text-amber-950 px-1.5 py-0.5 rounded">
                      Ders Erken Bitti
                    </span>
                  )}
                </div>
                {cs.note && (
                  <p className="text-xs font-semibold text-amber-900 mt-0.5 break-words">
                    “{cs.note}”
                  </p>
                )}
              </div>
            </div>
            {isMe && onOpenStatusSheet && (
              <button
                onClick={onOpenStatusSheet}
                className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                Düzenle
              </button>
            )}
          </div>
        )}

        {/* Program Yüklenmemişse */}
        {!hasSchedule ? (
          <div className="text-center py-5 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-2.5">
            <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-800">
                {profile.name} için henüz ders programı yüklenmedi
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                PDF veya PNG ders programını yükleyerek anlık ders ve boş saat takibini başlatabilirsin.
              </p>
            </div>
            {onOpenScheduleUpload && (
              <button
                onClick={onOpenScheduleUpload}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{profile.name} Programını Yükle</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Ana Durum & Geri Sayım Gösterge Paneli */}
            {liveStatus.state === 'IN_CLASS' && liveStatus.currentClass && (
              <div className="rounded-xl bg-rose-50/70 border border-rose-200/80 p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-rose-700">
                      <BookOpen className="w-3.5 h-3.5" />
                      Şu An Devam Eden Ders
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-0.5 leading-snug">
                      {liveStatus.currentClass.name}
                    </h4>
                    <div className="flex items-center flex-wrap gap-2 mt-1 text-xs font-semibold text-slate-600">
                      <span className="bg-white border border-rose-200 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold text-rose-900">
                        {liveStatus.currentClass.code}
                      </span>
                      <span>
                        🕒 {liveStatus.currentClass.start_time} - {liveStatus.currentClass.end_time}
                      </span>
                      {liveStatus.currentClass.classroom && (
                        <span className="inline-flex items-center gap-1 text-slate-700 bg-white/90 px-2 py-0.5 rounded-md border border-slate-200">
                          <MapPin className="w-3 h-3 text-rose-600" />
                          {liveStatus.currentClass.classroom}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Kalan Dakika Sayacı */}
                  <div className="bg-white border-2 border-rose-200 rounded-xl px-3 py-2 text-center shrink-0 shadow-2xs">
                    <div className="text-[10px] font-bold uppercase text-rose-600 tracking-wide">
                      Bitmesine
                    </div>
                    <div className="text-lg font-black text-rose-700 leading-tight">
                      {formatDurationTr(liveStatus.remainingMinutes)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">
                      Çıkış: {liveStatus.currentClass.end_time}
                    </div>
                  </div>
                </div>

                {/* Ders İlerleme Çubuğu */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Ders İlerlemesi</span>
                    <span className="text-rose-700">%{liveStatus.progressPercent} tamamlandı</span>
                  </div>
                  <div className="w-full h-2.5 bg-rose-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${liveStatus.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Çıkışta ne olacağı bilgisi veya Erken Bitti Aksiyonu */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-rose-200/60 text-xs">
                  <span className="text-slate-600 font-medium">
                    {liveStatus.nextClass ? (
                      <>
                        Sonraki ders:{' '}
                        <strong className="text-slate-800">
                          {liveStatus.nextClass.start_time} ({liveStatus.nextClass.name})
                        </strong>
                      </>
                    ) : (
                      <strong className="text-emerald-700">
                        🎉 Bu dersten sonra bugün başka dersi yok!
                      </strong>
                    )}
                  </span>

                  {isMe && onOpenStatusSheet && (
                    <button
                      onClick={onOpenStatusSheet}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-[11px] shadow-2xs transition-all cursor-pointer"
                    >
                      <Zap className="w-3 h-3 fill-current" />
                      <span>Ders Erken Bitti İşaretle</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {(liveStatus.state === 'FREE_UNTIL_NEXT' ||
              liveStatus.state === 'BEFORE_FIRST_CLASS') && (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {liveStatus.isEarlyExitActive
                        ? 'Ders Erken Bitti • Şu An Boş'
                        : liveStatus.state === 'BEFORE_FIRST_CLASS'
                        ? 'Günün İlk Dersi Başlamadı'
                        : 'Ders Arası • Şu An Boş'}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {liveStatus.freeUntilTime}&apos;a kadar müsait!
                    </h4>
                    {liveStatus.earlyDismissedClass && (
                      <p className="text-xs font-semibold text-amber-800 mt-0.5">
                        ⚡ Normalde {liveStatus.earlyDismissedClass.end_time}&apos;a kadar{' '}
                        {liveStatus.earlyDismissedClass.name} dersindeydi.
                      </p>
                    )}
                  </div>

                  {/* Ne Kadar Boş Sayacı */}
                  <div className="bg-white border-2 border-emerald-200 rounded-xl px-3 py-2 text-center shrink-0 shadow-2xs">
                    <div className="text-[10px] font-bold uppercase text-emerald-700 tracking-wide">
                      Boş Süre
                    </div>
                    <div className="text-lg font-black text-emerald-700 leading-tight">
                      {formatDurationTr(liveStatus.remainingMinutes)}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">
                      {liveStatus.freeUntilTime}&apos;a dek
                    </div>
                  </div>
                </div>

                {liveStatus.nextClass && (
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-2 text-xs text-slate-600">
                    <div className="truncate">
                      <span>Sıradaki ders: </span>
                      <strong className="text-slate-900">
                        {liveStatus.nextClass.start_time} • {liveStatus.nextClass.name}
                      </strong>
                    </div>
                    {liveStatus.nextClass.classroom && (
                      <span className="shrink-0 inline-flex items-center gap-1 font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                        {liveStatus.nextClass.classroom}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {(liveStatus.state === 'DONE_FOR_TODAY' || liveStatus.state === 'DAY_OFF') && (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 flex items-center justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tamamen Serbest
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {liveStatus.headline}
                  </h4>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">
                    {liveStatus.subheadline}
                  </p>
                </div>
                <div className="bg-white border-2 border-emerald-200 rounded-xl px-3 py-2 text-center shrink-0">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">Durum</div>
                  <div className="text-sm font-black text-emerald-700">Gün Boyu Boş</div>
                </div>
              </div>
            )}

            {/* Günün Dersleri Akordiyon Listesi */}
            {liveStatus.todaySlots.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowTodayList(!showTodayList)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {dayName} Programı ({liveStatus.completedClassesCount}/
                      {liveStatus.totalClassesToday} ders tamamlandı)
                    </span>
                  </span>
                  {showTodayList ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showTodayList && (
                  <div className="mt-2 space-y-1.5">
                    {liveStatus.todaySlots.map((slot, idx) => {
                      const isEarly = isCourseEarlyDismissed(
                        slot,
                        liveStatus.activeCustomStatus,
                        dayName
                      );
                      const isPast = slot.end_minutes <= currentMinutes || isEarly;
                      const isCurrent =
                        !isEarly &&
                        currentMinutes >= slot.start_minutes &&
                        currentMinutes < slot.end_minutes;

                      return (
                        <div
                          key={`${slot.code}_${slot.start_time}_${idx}`}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                            isCurrent
                              ? 'bg-rose-50/90 border-rose-300 text-slate-900 font-bold shadow-2xs'
                              : isEarly
                              ? 'bg-amber-50/60 border-amber-200 text-slate-600'
                              : isPast
                              ? 'bg-slate-50 border-slate-200/70 text-slate-400 line-through'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${
                                isCurrent
                                  ? 'bg-rose-600 text-white'
                                  : isEarly
                                  ? 'bg-amber-200 text-amber-950'
                                  : isPast
                                  ? 'bg-slate-200 text-slate-500'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              {slot.start_time} - {slot.end_time}
                            </span>
                            <div className="min-w-0">
                              <p className="font-bold truncate">{slot.name}</p>
                              <p className="text-[10px] opacity-80 truncate">
                                {slot.code}
                                {slot.classroom ? ` • 📍 ${slot.classroom}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isCurrent && (
                              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                Şu An ({slot.end_minutes - currentMinutes} dk)
                              </span>
                            )}
                            {isEarly && (
                              <span className="text-[10px] font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                                ⚡ Erken Bitti
                              </span>
                            )}
                            {!isCurrent && !isEarly && isPast && (
                              <span className="text-[10px] font-bold text-slate-400">Bitti</span>
                            )}
                            {!isCurrent && !isEarly && !isPast && (
                              <span className="text-[10px] font-bold text-emerald-700">
                                {formatDurationTr(slot.start_minutes - currentMinutes)} sonra
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Eğer bu kart "Senin Durumun" kartıysa hızlı durum güncelleme butonu */}
        {isMe && onOpenStatusSheet && (
          <button
            type="button"
            onClick={onOpenStatusSheet}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {cs
                ? 'Durum Notunu / Erken Çıkışı Güncelle'
                : 'Anlık Durum & Not Ekle (Kütüphane, Erken Bitti vb.)'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
