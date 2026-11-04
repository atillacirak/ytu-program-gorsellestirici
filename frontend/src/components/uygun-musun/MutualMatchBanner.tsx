"use client";

import React from 'react';
import { Coffee, Clock, Sparkles, Users } from 'lucide-react';
import { MutualAvailabilitySummary, UygunMusunProfile } from '../../types/uygunMusun';
import { formatDurationTr } from '../../utils/uygunMusunEngine';

interface MutualMatchBannerProps {
  summary: MutualAvailabilitySummary;
  profiles: UygunMusunProfile[];
  dayName: string;
}

export default function MutualMatchBanner({
  summary,
  profiles,
  dayName,
}: MutualMatchBannerProps) {
  const loadedCount = profiles.filter((p) => p.schedule && p.schedule.schedule).length;

  if (loadedCount < 2) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-slate-900">
            {summary.headline}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">{summary.detail}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 shadow-xs transition-all space-y-3 ${
        summary.allAvailableNow
          ? 'bg-gradient-to-br from-[#0c3f79] via-[#0a3362] to-[#002244] border-[#0c3f79] text-white'
          : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              summary.allAvailableNow
                ? 'bg-amber-400 text-slate-950'
                : 'bg-[#0c3f79]/10 text-[#0c3f79]'
            }`}
          >
            {summary.allAvailableNow ? (
              <Coffee className="w-5 h-5" />
            ) : (
              <Clock className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  summary.allAvailableNow
                    ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-300/30'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                Ortak Uygunluk • {profiles.map((p) => p.name).join(' & ')}
              </span>
            </div>
            <h3
              className={`text-sm sm:text-base font-extrabold mt-1 leading-snug ${
                summary.allAvailableNow ? 'text-white' : 'text-slate-900'
              }`}
            >
              {summary.headline}
            </h3>
            <p
              className={`text-xs mt-0.5 font-medium ${
                summary.allAvailableNow ? 'text-blue-100' : 'text-slate-600'
              }`}
            >
              {summary.detail}
            </p>
          </div>
        </div>
      </div>

      {/* Günün Ortak Boş Saat Pencereleri */}
      {summary.todayMutualWindows.length > 0 && (
        <div
          className={`pt-2.5 border-t ${
            summary.allAvailableNow ? 'border-white/15' : 'border-slate-100'
          }`}
        >
          <div
            className={`text-[11px] font-bold mb-2 flex items-center gap-1.5 ${
              summary.allAvailableNow ? 'text-blue-100' : 'text-slate-500'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{dayName} Günü Ortak Boş Saatler (08:00 - 19:00):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {summary.todayMutualWindows.map((win, idx) => (
              <span
                key={`${win.start_time}_${idx}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  win.is_current
                    ? summary.allAvailableNow
                      ? 'bg-amber-400 text-slate-950 shadow-2xs ring-2 ring-white/40'
                      : 'bg-emerald-600 text-white'
                    : summary.allAvailableNow
                    ? 'bg-white/10 text-white border border-white/15'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                <span className="font-mono">
                  {win.start_time} - {win.end_time}
                </span>
                <span className="opacity-75 text-[10px]">
                  ({formatDurationTr(win.duration_minutes)})
                </span>
                {win.is_current && (
                  <span className="text-[9px] uppercase font-black px-1 py-0.2 rounded bg-black/15">
                    ŞU AN
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
