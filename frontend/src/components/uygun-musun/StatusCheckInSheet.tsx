"use client";

import React, { useState, useEffect } from 'react';
import {
  Zap,
  MessageSquarePlus,
  Clock,
  Check,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CustomStatusOverride,
  ProfileLiveStatus,
  UygunMusunProfile,
} from '../../types/uygunMusun';
import {
  STATUS_PRESETS,
  PROFILE_THEMES,
  toMinutes,
} from '../../utils/uygunMusunEngine';

interface StatusCheckInSheetProps {
  profiles: UygunMusunProfile[];
  selectedProfileId: string;
  onSelectProfileId: (id: string) => void;
  liveStatuses: Record<string, ProfileLiveStatus>;
  dayName: string;
  currentMinutes: number;
  onSaveStatus: (profileId: string, status: CustomStatusOverride | null) => Promise<void> | void;
  onClose?: () => void;
  isModal?: boolean;
}

type DurationOption = 'next_class' | '30m' | '60m' | '120m' | 'today';

export default function StatusCheckInSheet({
  profiles,
  selectedProfileId,
  onSelectProfileId,
  liveStatuses,
  dayName,
  currentMinutes,
  onSaveStatus,
  onClose,
  isModal = false,
}: StatusCheckInSheetProps) {
  const activeProfile =
    profiles.find((p) => p.id === selectedProfileId) || profiles[0];
  const liveStatus = liveStatuses[activeProfile.id];
  const existingCS = liveStatus?.activeCustomStatus || null;

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    existingCS?.preset_id || ''
  );
  const [emoji, setEmoji] = useState<string>(existingCS?.emoji || '💬');
  const [label, setLabel] = useState<string>(existingCS?.label || 'Durum Notu');
  const [note, setNote] = useState<string>(existingCS?.note || '');
  const [earlyExit, setEarlyExit] = useState<boolean>(
    Boolean(existingCS?.early_exit)
  );
  const [durationOpt, setDurationOpt] = useState<DurationOption>('next_class');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // Profil değiştiğinde mevcut durumu forma yükle (arka plan yenilemelerinde kullanıcının yazdığı notu/seçimi sıfırlama)
  useEffect(() => {
    const cs = liveStatuses[activeProfile.id]?.activeCustomStatus;
    if (cs) {
      setSelectedPresetId(cs.preset_id || '');
      setEmoji(cs.emoji || '💬');
      setLabel(cs.label || 'Durum Notu');
      setNote(cs.note || '');
      setEarlyExit(Boolean(cs.early_exit));
    } else {
      setSelectedPresetId('');
      setEmoji('💬');
      setLabel('Anlık Durum');
      setNote('');
      setEarlyExit(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile.id]);

  // O anki veya erken çıkılabilecek dersi tespit et
  const currentOrActiveSlot =
    liveStatus?.currentClass ||
    liveStatus?.earlyDismissedClass ||
    liveStatus?.todaySlots.find(
      (s) => currentMinutes >= s.start_minutes && currentMinutes < s.end_minutes
    ) ||
    null;

  const handlePresetClick = (preset: (typeof STATUS_PRESETS)[number]) => {
    if (selectedPresetId === preset.id) {
      setSelectedPresetId('');
      if (preset.earlyExit) setEarlyExit(false);
      return;
    }
    setSelectedPresetId(preset.id);
    setEmoji(preset.emoji);
    setLabel(preset.label);
    if (!note.trim() || STATUS_PRESETS.some((p) => p.defaultNote === note)) {
      setNote(preset.defaultNote);
    }
    if (preset.earlyExit) {
      setEarlyExit(true);
    } else if (
      currentOrActiveSlot &&
      ['coffee', 'library', 'dining', 'home'].includes(preset.id)
    ) {
      // Kullanıcı ders saatinde kahve/kütüphane/yemekhane/eve geçtim seçtiyse dersten erken çıkmış demektir
      setEarlyExit(true);
    }
  };

  const computeExpiresAt = (): number | null => {
    const now = Date.now();
    if (durationOpt === '30m') return now + 30 * 60 * 1000;
    if (durationOpt === '60m') return now + 60 * 60 * 1000;
    if (durationOpt === '120m') return now + 120 * 60 * 1000;
    if (durationOpt === 'next_class') {
      if (earlyExit && currentOrActiveSlot) {
        const diffMins = Math.max(30, currentOrActiveSlot.end_minutes - currentMinutes);
        return now + diffMins * 60 * 1000;
      }
      if (liveStatus?.nextClass) {
        const diffMins = Math.max(30, liveStatus.nextClass.start_minutes - currentMinutes);
        return now + diffMins * 60 * 1000;
      }
      if (liveStatus?.currentClass) {
        const diffMins = Math.max(30, liveStatus.currentClass.end_minutes - currentMinutes);
        return now + diffMins * 60 * 1000;
      }
      return now + 120 * 60 * 1000;
    }
    // 'today' -> gece yarısına kadar
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay.getTime();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const targetUntil =
        durationOpt === 'today'
          ? '23:59'
          : earlyExit && currentOrActiveSlot
          ? currentOrActiveSlot.end_time
          : earlyExit && liveStatus?.todaySlots.length
          ? liveStatus.todaySlots[liveStatus.todaySlots.length - 1].end_time
          : '23:59';

      const payload: CustomStatusOverride = {
        type: earlyExit ? 'early_exit' : selectedPresetId ? 'preset' : 'custom',
        preset_id: selectedPresetId || (earlyExit ? 'early_exit' : undefined),
        emoji: earlyExit && emoji === '💬' ? '⚡' : emoji,
        label:
          earlyExit && (!label || label === 'Anlık Durum' || label === 'Durum Notu')
            ? 'Ders Erken Bitti'
            : label || 'Anlık Durum',
        note:
          note.trim() ||
          (earlyExit
            ? currentOrActiveSlot
              ? `${currentOrActiveSlot.name} dersi erken bitti, şu an müsaitim!`
              : 'Dersim erken bitti, şu an müsaitim!'
            : ''),
        early_exit: earlyExit,
        early_exit_until: targetUntil || minutesToEndOfHour(currentMinutes),
        early_exit_day: dayName,
        created_at: Date.now(),
        expires_at: computeExpiresAt(),
      };

      await onSaveStatus(activeProfile.id, payload);
      setSavedToast(true);
      setTimeout(() => {
        setSavedToast(false);
        if (onClose) onClose();
      }, 900);
    } finally {
      setSaving(false);
    }
  };

  const handleClearStatus = async () => {
    setSaving(true);
    try {
      await onSaveStatus(activeProfile.id, null);
      setSelectedPresetId('');
      setNote('');
      setEarlyExit(false);
      if (onClose) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`bg-white ${
        isModal
          ? 'rounded-3xl border border-slate-200 shadow-2xl p-5 max-w-lg w-full mx-auto'
          : 'rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5'
      } space-y-4`}
    >
      {/* Başlık */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-2xs">
            <MessageSquarePlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Canlı Durum &amp; Not Bildir
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Neredesin, ne yapıyorsun veya dersin erken mi bitti?
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Hangi Profil İçin Güncelleniyor? */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
          Kimin Durumunu Güncelliyorsun?
        </label>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {profiles.map((p) => {
            const isSelected = p.id === activeProfile.id;
            const pTheme = PROFILE_THEMES[p.color] || PROFILE_THEMES.blue;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProfileId(p.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                  isSelected
                    ? `${pTheme.bg} text-white border-transparent shadow-xs`
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base">{p.avatar}</span>
                <span className="truncate">{p.name}</span>
                {isSelected && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ⚡ DERS ERKEN BİTTİ ÖZEL KUTUSU */}
        <div
          onClick={() => {
            const nextVal = !earlyExit;
            setEarlyExit(nextVal);
            if (nextVal) {
              setSelectedPresetId('early_exit');
              setEmoji('⚡');
              setLabel('Ders Erken Bitti');
              if (!note) {
                setNote('Hoca dersi erken bıraktı, şu an boşum!');
              }
            }
          }}
          className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
            earlyExit
              ? 'bg-amber-50 border-amber-400 shadow-xs'
              : 'bg-slate-50/80 border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                earlyExit
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <span>⚡ Dersim Erken Bitti / Dersten Çıktım</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                {currentOrActiveSlot
                  ? `Şu anki ${currentOrActiveSlot.name} (${currentOrActiveSlot.start_time}-${currentOrActiveSlot.end_time}) dersini bitti olarak işaretler ve seni MÜSAİT gösterir.`
                  : 'Programda derste görünsen bile durumu anında MÜSAİT (Boş) olarak değiştirir.'}
              </p>
            </div>
          </div>

          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
              earlyExit
                ? 'bg-amber-500 border-amber-600 text-slate-950'
                : 'bg-white border-slate-300'
            }`}
          >
            {earlyExit && <Check className="w-4 h-4 stroke-[3]" />}
          </div>
        </div>

        {/* Hazır Durum & Konum Rozetleri */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Hızlı Konum / Durum Seç (Tek Tık)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {STATUS_PRESETS.filter((p) => p.id !== 'early_exit').map((preset) => {
              const active = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? 'bg-[#0c3f79] text-white border-[#0c3f79] shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-lg shrink-0">{preset.emoji}</span>
                  <span className="text-xs font-bold leading-tight truncate">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ekstra Serbest Not Alanı */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Ekstra Notun (Neredesin / Ne Yapıyorsun?)
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Örn: Kütüphane -1 sessiz alandayım, kahveye çıkabiliriz ☕"
            maxLength={150}
            className="w-full rounded-xl border border-slate-300 focus:border-[#0c3f79] focus:ring-2 focus:ring-[#0c3f79]/20 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-none"
          />
          <div className="flex justify-between text-[10px] font-semibold text-slate-400">
            <span>Arkadaşının ekranında kartının en üstünde görünür.</span>
            <span>{note.length}/150</span>
          </div>
        </div>

        {/* Geçerlilik Süresi */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Bu Durum Ne Kadar Geçerli Kalsın?</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {(
              [
                { id: 'next_class', label: 'Sonraki Derse Dek' },
                { id: '30m', label: '30 Dakika' },
                { id: '60m', label: '1 Saat' },
                { id: '120m', label: '2 Saat' },
                { id: 'today', label: 'Bugün Boyu' },
              ] as { id: DurationOption; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDurationOpt(opt.id)}
                className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  durationOpt === opt.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Kaydet ve Temizle Butonları */}
        <div className="flex items-center gap-2 pt-2">
          {existingCS && (
            <button
              type="button"
              disabled={saving}
              onClick={handleClearStatus}
              className="px-3.5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sıfırla</span>
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 px-4 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
          >
            {savedToast ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Durum Güncellendi!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{saving ? 'Kaydediliyor...' : `${activeProfile.name} Durumunu Paylaş`}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function minutesToEndOfHour(currentM: number): string {
  const h = Math.min(23, Math.floor(currentM / 60) + 1);
  return `${String(h).padStart(2, '0')}:50`;
}
