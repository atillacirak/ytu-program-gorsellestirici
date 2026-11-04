"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  MapPin,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Zap,
  Calendar,
  Coffee,
  MessageSquarePlus,
  Send,
  Upload,
  Settings,
  SlidersHorizontal,
  RotateCcw,
  RefreshCw,
  X,
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  Volume2,
  Video,
} from 'lucide-react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import {
  CustomStatusOverride,
  DuoPing,
  NormalizedCourseSlot,
  ProfileColorKey,
  ProfileLiveStatus,
  UygunMusunProfile,
  UygunMusunRoomState,
} from '../../types/uygunMusun';
import {
  WEEKDAYS_TR,
  PROFILE_THEMES,
  STATUS_PRESETS,
  DEMO_SCHEDULES,
  getTurkishDayNameFromDate,
  minutesToTimeStr,
  formatDurationTr,
  calculateProfileLiveStatus,
  calculateMutualAvailability,
  getDayCourses,
  isCourseEarlyDismissed,
  toMinutes,
} from '../../utils/uygunMusunEngine';
import { extractMetadataFromPngArrayBuffer } from '../../utils/pngMetadata';
import { parseScheduleImageWithOcr } from '../../utils/pngOcrParser';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

interface DuoAppViewProps {
  myId: 'atilla' | 'neva';
  partnerId: 'atilla' | 'neva';
  myName: string;
  partnerName: string;
  myDefaultAvatar?: string;
  partnerDefaultAvatar?: string;
  roomCode?: string;
}

const DEFAULT_PROFILES: UygunMusunProfile[] = [
  {
    id: 'atilla',
    name: 'Atilla',
    color: 'blue',
    avatar: '👨‍💻',
    schedule: DEMO_SCHEDULES.atilla,
    custom_status: null,
  },
  {
    id: 'neva',
    name: 'Neva',
    color: 'violet',
    avatar: '👩‍🎓',
    schedule: DEMO_SCHEDULES.neva,
    custom_status: null,
  },
];

const TIMELINE_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export default function DuoAppView({
  myId,
  partnerId,
  myName,
  partnerName,
  myDefaultAvatar = myId === 'atilla' ? '👨‍💻' : '👩‍🎓',
  partnerDefaultAvatar = partnerId === 'neva' ? '👩‍🎓' : '👨‍💻',
  roomCode = 'atilla-neva',
}: DuoAppViewProps) {
  const [profiles, setProfiles, isMounted] = useLocalStorageState<UygunMusunProfile[]>(
    'ytu_duo_profiles_v2',
    DEFAULT_PROFILES
  );
  const [pings, setPings] = useState<DuoPing[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Sekmeler / Görünüm modları
  const [activeTab, setActiveTab] = useState<'main' | 'timeline' | 'manage'>('main');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTimelineCourses, setShowTimelineCourses] = useState(false);

  // Zaman ve Simülasyon
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const [isSimulatingTime, setIsSimulatingTime] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState<string>('Çarşamba');
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(10 * 60 + 20); // 10:20
  const [timelineDay, setTimelineDay] = useState<string>('Çarşamba');

  // Kendi Durum Formu
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [statusNote, setStatusNote] = useState<string>('');
  const [statusDuration, setStatusDuration] = useState<'next_class' | '60m' | 'today'>('next_class');
  const [isEarlyExitActive, setIsEarlyExitActive] = useState<boolean>(false);
  const [statusSaveToast, setStatusSaveToast] = useState(false);
  const [pingSentToast, setPingSentToast] = useState<string | null>(null);

  // Yükleme durumu
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Periyodik saat güncellemesi
  useEffect(() => {
    const now = new Date();
    setNowDate(now);
    const realDay = getTurkishDayNameFromDate(now);
    const defaultWeekday = WEEKDAYS_TR.includes(realDay as any) ? realDay : 'Pazartesi';
    setSimulatedDay(defaultWeekday);
    setTimelineDay(defaultWeekday);
    setSimulatedMinutes(now.getHours() * 60 + now.getMinutes());

    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Sunucudan odayı ve pingsleri çekme (Polling)
  const fetchRoomData = useCallback(async () => {
    try {
      setSyncing(true);
      const res = await fetch(`${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}`);
      if (!res.ok) return;
      const data: UygunMusunRoomState = await res.json();
      if (data && Array.isArray(data.profiles) && data.profiles.length >= 2) {
        setProfiles(data.profiles);
      }
      if (data && Array.isArray(data.pings)) {
        setPings(data.pings);
      }
    } catch {
      // Çevrimdışıysa yerel veriyi korur
    } finally {
      setSyncing(false);
    }
  }, [roomCode, setProfiles]);

  useEffect(() => {
    if (!isMounted) return;
    fetchRoomData();
    const interval = setInterval(fetchRoomData, 15000);
    return () => clearInterval(interval);
  }, [isMounted, fetchRoomData]);

  // Efektif gün ve dakika
  const realDayName = getTurkishDayNameFromDate(nowDate);
  const realMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const activeDayName = isSimulatingTime ? simulatedDay : realDayName;
  const activeMinutes = isSimulatingTime ? simulatedMinutes : realMinutes;
  const nowEpochMs = nowDate.getTime();

  // Profilleri bul
  const me: UygunMusunProfile = useMemo(() => {
    return profiles.find((p) => p.id === myId) || {
      id: myId,
      name: myName,
      color: (myId === 'atilla' ? 'blue' : 'violet') as ProfileColorKey,
      avatar: myDefaultAvatar,
      schedule: DEMO_SCHEDULES[myId],
      custom_status: null,
    };
  }, [profiles, myId, myName, myDefaultAvatar]);

  const partner: UygunMusunProfile = useMemo(() => {
    return profiles.find((p) => p.id === partnerId) || {
      id: partnerId,
      name: partnerName,
      color: (partnerId === 'neva' ? 'violet' : 'blue') as ProfileColorKey,
      avatar: partnerDefaultAvatar,
      schedule: DEMO_SCHEDULES[partnerId],
      custom_status: null,
    };
  }, [profiles, partnerId, partnerName, partnerDefaultAvatar]);

  // Canlı Durum Hesaplamaları
  const myStatus = useMemo(() => {
    return calculateProfileLiveStatus(me, activeDayName, activeMinutes, nowEpochMs);
  }, [me, activeDayName, activeMinutes, nowEpochMs]);

  const partnerStatus = useMemo(() => {
    return calculateProfileLiveStatus(partner, activeDayName, activeMinutes, nowEpochMs);
  }, [partner, activeDayName, activeMinutes, nowEpochMs]);

  const mutual = useMemo(() => {
    return calculateMutualAvailability([me, partner], activeDayName, activeMinutes, nowEpochMs);
  }, [me, partner, activeDayName, activeMinutes, nowEpochMs]);

  // Kendi formunu mevcuttan güncelle
  useEffect(() => {
    if (me.custom_status) {
      setSelectedPresetId(me.custom_status.preset_id || '');
      setStatusNote(me.custom_status.note || '');
      setIsEarlyExitActive(Boolean(me.custom_status.early_exit));
    } else {
      setSelectedPresetId('');
      setStatusNote('');
      setIsEarlyExitActive(false);
    }
  }, [me.custom_status]);

  // Bana gelen aktif pingleme var mı? (Son 2 saat içinde atılmış ve kapatılmamış)
  const incomingPing = useMemo(() => {
    const twoHoursAgo = nowEpochMs - 2 * 3600 * 1000;
    return pings.find(
      (p) => p.to_id === myId && !p.dismissed && p.created_at > twoHoursAgo
    );
  }, [pings, myId, nowEpochMs]);

  // Ping Kapatma
  const handleDismissPing = async (pingId: string) => {
    setPings((prev) => prev.map((p) => (p.id === pingId ? { ...p, dismissed: true } : p)));
    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/ping/${encodeURIComponent(pingId)}/dismiss`,
        { method: 'POST' }
      );
    } catch {}
  };

  // Partner'a Ping Gönderme (Kahveye gel, neredesin vb.)
  const handleSendPing = async (type: string, message: string, emoji: string) => {
    try {
      setPingSentToast(`${partner.name}'ya iletildi! ${emoji}`);
      setTimeout(() => setPingSentToast(null), 2500);

      const res = await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/ping`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_id: myId,
            to_id: partnerId,
            type,
            message,
            emoji,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.pings)) setPings(data.pings);
      }
    } catch {}
  };

  // Kendi durumunu kaydetme
  const handleSaveMyStatus = async (overrideEarly?: boolean) => {
    const early = overrideEarly !== undefined ? overrideEarly : isEarlyExitActive;
    let expiresAt: number | null = null;
    const now = Date.now();

    if (statusDuration === '60m') {
      expiresAt = now + 60 * 60 * 1000;
    } else if (statusDuration === 'next_class') {
      if (myStatus.currentClass) {
        expiresAt = now + Math.max(15, myStatus.currentClass.end_minutes - activeMinutes) * 60 * 1000;
      } else if (myStatus.nextClass) {
        expiresAt = now + Math.max(15, myStatus.nextClass.start_minutes - activeMinutes) * 60 * 1000;
      } else {
        expiresAt = now + 90 * 60 * 1000;
      }
    } else {
      const eod = new Date();
      eod.setHours(23, 59, 59, 999);
      expiresAt = eod.getTime();
    }

    const preset = STATUS_PRESETS.find((p) => p.id === selectedPresetId);

    const payload: CustomStatusOverride = {
      type: early ? 'early_exit' : preset ? 'preset' : 'custom',
      preset_id: selectedPresetId || undefined,
      emoji: early ? '⚡' : preset?.emoji || '💬',
      label: early ? 'Ders Erken Bitti' : preset?.label || 'Durum Notu',
      note: statusNote.trim() || (early ? 'Hoca dersi erken bıraktı, şu an boşum!' : preset?.defaultNote || ''),
      early_exit: early,
      early_exit_until: myStatus.currentClass?.end_time || '',
      early_exit_day: activeDayName,
      created_at: now,
      expires_at: expiresAt,
    };

    const nextProfiles = profiles.map((p) => (p.id === myId ? { ...p, custom_status: payload } : p));
    setProfiles(nextProfiles);

    setStatusSaveToast(true);
    setTimeout(() => setStatusSaveToast(false), 2000);

    try {
      await fetch(`${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: myId,
          custom_status: payload,
        }),
      });
    } catch {}
  };

  // Kendi durumunu sıfırlama
  const handleClearMyStatus = async () => {
    const nextProfiles = profiles.map((p) => (p.id === myId ? { ...p, custom_status: null } : p));
    setProfiles(nextProfiles);
    setIsEarlyExitActive(false);
    setSelectedPresetId('');
    setStatusNote('');
    try {
      await fetch(`${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: myId, custom_status: null }),
      });
    } catch {}
  };

  // Program Yükleme Fonksiyonu
  const handleFileUpload = async (targetId: 'atilla' | 'neva', file: File) => {
    setUploadingFor(targetId);
    setUploadError(null);
    try {
      let parsedData: any = null;
      if (file.name.toLowerCase().endsWith('.png')) {
        const buffer = await file.arrayBuffer();
        parsedData = extractMetadataFromPngArrayBuffer(buffer);
      }
      if (!parsedData && file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) {
        try {
          parsedData = await parseScheduleImageWithOcr(file);
        } catch {}
      }
      if (!parsedData) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/api/parse-schedule-file`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('Dosya okunamadı.');
        parsedData = await res.json();
      }

      if (!parsedData || !parsedData.schedule) {
        throw new Error('Geçerli bir ders programı bulunamadı.');
      }

      const updatedPayload = {
        term: parsedData.term || 'Aktif Dönem',
        title: parsedData.title || file.name,
        schedule: parsedData.schedule,
        courses_summary: parsedData.courses_summary || [],
      };

      const nextProfiles = profiles.map((p) =>
        p.id === targetId ? { ...p, schedule: updatedPayload } : p
      );
      setProfiles(nextProfiles);

      const targetProfile = nextProfiles.find((p) => p.id === targetId);
      if (targetProfile) {
        await fetch(`${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(targetProfile),
        });
      }
    } catch (err: any) {
      setUploadError(err.message || 'Yükleme sırasında hata oluştu.');
    } finally {
      setUploadingFor(null);
    }
  };

  // Ana sayfadan program çekme
  const handleImportFromHome = async (targetId: 'atilla' | 'neva') => {
    try {
      const raw = window.localStorage.getItem('ytu_visualizer_data');
      if (!raw) {
        alert('Ana sayfada kayıtlı ders programı bulunamadı.');
        return;
      }
      const parsed = JSON.parse(raw);
      const payload = {
        term: parsed.term || 'Aktif Dönem',
        title: parsed.title || 'Ana Sayfa Programı',
        schedule: parsed.schedule,
        courses_summary: parsed.courses_summary || [],
      };
      const nextProfiles = profiles.map((p) => (p.id === targetId ? { ...p, schedule: payload } : p));
      setProfiles(nextProfiles);
      const tp = nextProfiles.find((p) => p.id === targetId);
      if (tp) {
        await fetch(`${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tp),
        });
      }
      alert('Program başarıyla aktarıldı!');
    } catch {
      alert('Program aktarılırken hata oluştu.');
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex items-center gap-3 font-bold text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          <span>Özel Duo Alanı Yükleniyor...</span>
        </div>
      </div>
    );
  }

  const partnerTheme = PROFILE_THEMES[partner.color] || PROFILE_THEMES.violet;
  const isPartnerBusy = partnerStatus.state === 'IN_CLASS';
  const partnerCS = partnerStatus.activeCustomStatus;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 pb-28 select-none">
      {/* 1. ÜST BAR & DYNAMIC ISLAND BADGE */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Üst Başlık & İsim */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{partnerName} &amp; {myName}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  Özel
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSimulatingTime(!isSimulatingTime)}
                className={`px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  isSimulatingTime
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-white/10 hover:bg-white/15 text-slate-300'
                }`}
                title="Saat simülatörü"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Simüle Et</span>
              </button>

              <button
                type="button"
                onClick={fetchRoomData}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                title="Şimdi Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-amber-400' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-colors cursor-pointer"
                title="Program & Ayarlar"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DYNAMIC ISLAND CAPSULE (Apple Stili Canlı Hap) */}
          <div className="w-full bg-black/90 border border-white/15 rounded-full px-4 py-2 flex items-center justify-between gap-3 shadow-xl shadow-black/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">{partner.avatar}</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate flex items-center gap-1.5">
                  <span>{partner.name}:</span>
                  {partnerStatus.state === 'ONLINE_CLASS' ? (
                    <span className="text-cyan-300 font-extrabold truncate">
                      💻 Online Ders (Müsait)
                    </span>
                  ) : isPartnerBusy ? (
                    <span className="text-rose-400 font-extrabold truncate">
                      {partnerStatus.currentClass?.name} ({partnerStatus.remainingMinutes} dk)
                    </span>
                  ) : partnerStatus.isEarlyExitActive ? (
                    <span className="text-amber-300 font-extrabold truncate">
                      ⚡ Erken çıktı (Müsait)
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-extrabold truncate">
                      Müsait {partnerStatus.freeUntilTime ? `(${partnerStatus.freeUntilTime}'a dek)` : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 font-mono text-[11px] font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{minutesToTimeStr(activeMinutes)}</span>
            </div>
          </div>

          {/* Simülatör Açıldıysa */}
          {isSimulatingTime && (
            <div className="rounded-2xl bg-amber-500/15 border border-amber-400/30 p-3 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-extrabold text-amber-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Saat Simülatörü
                </span>
                <button
                  onClick={() => setIsSimulatingTime(false)}
                  className="text-[11px] text-amber-200 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  Gerçek Saate Dön
                </button>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
                {WEEKDAYS_TR.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSimulatedDay(d);
                      setTimelineDay(d);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                      simulatedDay === d
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-amber-200">
                  <span>Simüle Saat:</span>
                  <span className="font-bold bg-black/40 px-2 py-0.5 rounded border border-amber-400/30">
                    {minutesToTimeStr(simulatedMinutes)}
                  </span>
                </div>
                <input
                  type="range"
                  min={8 * 60}
                  max={19 * 60}
                  step={5}
                  value={simulatedMinutes}
                  onChange={(e) => setSimulatedMinutes(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. ANA İÇERİK ALANI */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* BANA GELEN CANLI PİNG (TOAST) */}
        {incomingPing && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 p-4 shadow-xl shadow-amber-500/20 flex items-start justify-between gap-3 animate-bounce">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-2xl leading-none mt-0.5 shrink-0">{incomingPing.emoji || '☕'}</span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wider text-amber-950/80">
                  {partner.name} Sana Çağrı Bıraktı!
                </p>
                <p className="text-sm font-extrabold text-slate-950 mt-0.5 break-words">
                  {incomingPing.message || 'Seni bekliyor!'}
                </p>
                <p className="text-[10px] font-bold text-amber-950/70 mt-1">
                  🕒 {new Date(incomingPing.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDismissPing(incomingPing.id)}
              className="p-1 rounded-lg bg-black/15 hover:bg-black/25 text-slate-950 transition-colors cursor-pointer shrink-0"
              title="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* PİNG GÖNDERİLDİ TOAST BİLDİRİMİ */}
        {pingSentToast && (
          <div className="rounded-xl bg-emerald-500 text-slate-950 font-black text-xs px-3.5 py-2.5 flex items-center gap-2 shadow-lg animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{pingSentToast}</span>
          </div>
        )}

        {/* 🌟 1. HERO KART: PARTNER ŞU AN NE YAPIYOR? (Neva / Atilla) */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 border border-white/15 p-5 shadow-2xl relative overflow-hidden space-y-4">
          {/* Arka Plan Glow */}
          <div
            className={`absolute -top-16 -right-16 w-40 h-40 rounded-full blur-3xl opacity-30 pointer-events-none ${
              isPartnerBusy ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />

          {/* Kart Üst Bilgisi */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl ${partnerTheme.bg} text-white flex items-center justify-center text-2xl shadow-lg ring-2 ring-white/20 shrink-0`}
              >
                {partner.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-white truncate">
                    {partner.name}
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                    Arkadaşın
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  {activeDayName} Canlı Kampüs Durumu
                </p>
              </div>
            </div>

            {/* Durum Rozeti */}
            <div className="shrink-0">
              {partnerStatus.state === 'ONLINE_CLASS' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  💻 ONLİNE DERS (MÜSAİT)
                </span>
              ) : isPartnerBusy ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  DERSTE
                </span>
              ) : partnerStatus.isEarlyExitActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-xs">
                  <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
                  ERKEN ÇIKTI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  MÜSAİT
                </span>
              )}
            </div>
          </div>

          {/* Partner'ın Bıraktığı Canlı Not / Konum Balonu */}
          {partnerCS && (
            <div className="rounded-2xl bg-amber-400/10 border border-amber-400/25 p-3 flex items-start gap-2.5 relative z-10">
              <span className="text-2xl leading-none mt-0.5 shrink-0">{partnerCS.emoji || '💬'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-300">
                    {partnerCS.label || 'Durum Notu'}
                  </span>
                  {partnerCS.early_exit && (
                    <span className="text-[10px] font-black bg-amber-400/30 text-amber-200 px-1.5 py-0.2 rounded">
                      ⚡ Dersi Erken Bitti
                    </span>
                  )}
                </div>
                {partnerCS.note && (
                  <p className="text-xs font-bold text-amber-100 mt-1 break-words">
                    “{partnerCS.note}”
                  </p>
                )}
              </div>
            </div>
          )}

            {/* Partner Durum Detayı: Derste / Boş / Online */}
            <div className="relative z-10 space-y-3">
              {partnerStatus.state === 'ONLINE_CLASS' && partnerStatus.currentClass && (
                <div className="rounded-2xl bg-cyan-950/40 border border-cyan-500/30 p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                        💻 Şu An Online Derste (Fiziksel Olarak Müsait)
                      </span>
                      <h3 className="text-base font-black text-white mt-0.5 leading-snug">
                        {partnerStatus.currentClass.name}
                      </h3>
                      <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-slate-300">
                        <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-[11px]">
                          {partnerStatus.currentClass.code}
                        </span>
                        <span>
                          🕒 {partnerStatus.currentClass.start_time} - {partnerStatus.currentClass.end_time}
                        </span>
                        <span className="inline-flex items-center gap-1 text-cyan-300 bg-cyan-900/40 px-2 py-0.5 rounded border border-cyan-500/30">
                          💻 {partnerStatus.currentClass.classroom || 'Online'}
                        </span>
                      </div>
                      <p className="text-xs text-cyan-200/80 mt-1.5 font-medium">
                        ✨ Online ders olduğu için müsait kabul edilir, dilediğin gibi yazabilir veya çağırabilirsin.
                      </p>
                    </div>

                    <div className="bg-black/60 border border-cyan-500/40 rounded-2xl px-3.5 py-2 text-center shrink-0">
                      <span className="text-[10px] font-bold uppercase text-cyan-400">
                        Durum
                      </span>
                      <p className="text-sm font-black text-cyan-300 leading-tight mt-0.5">
                        Müsait
                      </p>
                      <span className="text-[10px] text-slate-400">
                        Online
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isPartnerBusy && partnerStatus.currentClass && (
              <div className="rounded-2xl bg-rose-950/40 border border-rose-500/30 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Şu An Devam Eden Ders
                    </span>
                    <h3 className="text-base font-black text-white mt-0.5 leading-snug">
                      {partnerStatus.currentClass.name}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-slate-300">
                      <span className="font-mono font-bold bg-white/10 px-2 py-0.5 rounded text-[11px]">
                        {partnerStatus.currentClass.code}
                      </span>
                      <span>
                        🕒 {partnerStatus.currentClass.start_time} - {partnerStatus.currentClass.end_time}
                      </span>
                      {partnerStatus.currentClass.classroom && (
                        <span className="inline-flex items-center gap-1 text-slate-200 bg-white/10 px-2 py-0.5 rounded">
                          <MapPin className="w-3 h-3 text-rose-400" />
                          {partnerStatus.currentClass.classroom}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Geri Sayım Kutusu */}
                  <div className="bg-black/60 border border-rose-500/40 rounded-2xl px-3.5 py-2 text-center shrink-0">
                    <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">
                      Bitmesine
                    </span>
                    <p className="text-xl font-black text-white leading-tight mt-0.5">
                      {formatDurationTr(partnerStatus.remainingMinutes)}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {partnerStatus.currentClass.end_time}&apos;de
                    </span>
                  </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-400">
                    <span>Ders Tamamlanma</span>
                    <span className="text-rose-400 font-mono">%{partnerStatus.progressPercent}</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: `${partnerStatus.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isPartnerBusy && (
              <div className="rounded-2xl bg-emerald-950/40 border border-emerald-500/30 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {partnerStatus.isEarlyExitActive ? 'Ders Erken Bitti' : 'Şu An Müsait'}
                    </span>
                    <h3 className="text-base font-black text-white mt-0.5">
                      {partnerStatus.freeUntilTime}&apos;a kadar boş!
                    </h3>
                    {partnerStatus.nextClass ? (
                      <p className="text-xs text-slate-300 mt-1">
                        Sıradaki: <strong className="text-white">{partnerStatus.nextClass.start_time}</strong> -{' '}
                        {partnerStatus.nextClass.name}
                        {partnerStatus.nextClass.classroom ? ` (${partnerStatus.nextClass.classroom})` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-300 font-bold mt-1">
                        🎉 Bugün başka dersi kalmadı, tamamen serbest!
                      </p>
                    )}
                  </div>

                  <div className="bg-black/60 border border-emerald-500/40 rounded-2xl px-3.5 py-2 text-center shrink-0">
                    <span className="text-[10px] font-bold uppercase text-emerald-400">
                      Boş Süre
                    </span>
                    <p className="text-lg font-black text-white leading-tight mt-0.5">
                      {partnerStatus.remainingMinutes ? formatDurationTr(partnerStatus.remainingMinutes) : 'Gün Boyu'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TEK TIKLA PARTNER'A ÇAĞRI / DÜRTME BUTONLARI (DUO PINGS) */}
          <div className="pt-2 border-t border-white/10 space-y-2 relative z-10">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{partner.name}&apos;ya Hızlı Bildirim Bırak:</span>
            </span>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSendPing('coffee', 'Kahveye gel, seni bekliyorum ☕', '☕')}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-amber-400 hover:text-slate-950 text-white border border-white/10 text-center transition-all cursor-pointer group"
              >
                <span className="text-xl block">☕</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Kahve</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPing('location', 'Neredesin? Kampüste misin?', '📍')}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-emerald-400 hover:text-slate-950 text-white border border-white/10 text-center transition-all cursor-pointer group"
              >
                <span className="text-xl block">📍</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Neredesin?</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPing('library', 'Kütüphanedeyim, yanıma gel 📚', '📚')}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-blue-400 hover:text-slate-950 text-white border border-white/10 text-center transition-all cursor-pointer group"
              >
                <span className="text-xl block">📚</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Kütüphane</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPing('poke', 'Seni dürttü! 👋', '👋')}
                className="p-2.5 rounded-2xl bg-white/10 hover:bg-purple-400 hover:text-slate-950 text-white border border-white/10 text-center transition-all cursor-pointer group"
              >
                <span className="text-xl block">👋</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Dürt</span>
              </button>
            </div>
          </div>
        </div>

        {/* ☕ 2. ORTAK UYGUNLUK & KAHVE BULUŞMA VAKTİ */}
        <div
          className={`rounded-3xl border p-4 shadow-xl transition-all space-y-2.5 ${
            mutual.allAvailableNow
              ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-amber-400/40'
              : 'bg-slate-900/60 border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                mutual.allAvailableNow
                  ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-400/30'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              <Coffee className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                {mutual.allAvailableNow ? '🎉 İkiniz De Şu An Boşsunuz!' : 'Ortak Zaman Kesişimi'}
              </h4>
              <p className="text-sm font-extrabold text-white leading-tight mt-0.5">
                {mutual.headline}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{mutual.detail}</p>
            </div>
          </div>

          {/* Günün Ortak Boşlukları */}
          {mutual.todayMutualWindows.length > 0 && (
            <div className="pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
              {mutual.todayMutualWindows.map((win, idx) => (
                <span
                  key={idx}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl font-mono ${
                    win.is_current
                      ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300/50'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {win.start_time} - {win.end_time} ({formatDurationTr(win.duration_minutes)})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ⚡ 3. BENİM DURUM KUMANDAM (KENDİ DURUMUNU GÜNCELLE) */}
        <div className="rounded-3xl bg-slate-900/90 border border-white/15 p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#0c3f79] text-white flex items-center justify-center text-xl shadow-lg">
                {me.avatar}
              </div>
              <div>
                <h3 className="text-sm font-black text-white">
                  Benim Durumum ({myName})
                </h3>
                <p className="text-xs text-slate-400">
                  {partnerName}&apos;nın ekranında nasıl görüneceksin?
                </p>
              </div>
            </div>

            {me.custom_status && (
              <button
                type="button"
                onClick={handleClearMyStatus}
                className="text-[11px] font-extrabold text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 cursor-pointer"
              >
                Durumu Sıfırla
              </button>
            )}
          </div>

          {/* ⚡ DEV "DERSİM ERKEN BİTTİ" BUTONU */}
          <button
            type="button"
            onClick={() => {
              const nextVal = !isEarlyExitActive;
              setIsEarlyExitActive(nextVal);
              handleSaveMyStatus(nextVal);
            }}
            className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
              isEarlyExitActive
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-amber-300 text-slate-950 shadow-xl shadow-amber-500/30'
                : 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
            }`}
          >
            <div className="flex items-center gap-3 text-left">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isEarlyExitActive ? 'bg-black text-amber-400' : 'bg-white/10 text-amber-400'
                }`}
              >
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div>
                <p className="text-sm font-black leading-tight">
                  ⚡ Dersim Erken Bitti / Çıktım
                </p>
                <p
                  className={`text-[11px] font-medium mt-0.5 ${
                    isEarlyExitActive ? 'text-amber-950 font-bold' : 'text-slate-400'
                  }`}
                >
                  {isEarlyExitActive
                    ? 'Aktif! Neva seni şu an MÜSAİT olarak görüyor.'
                    : 'Tek tıkla ders saatini bitti sayar ve seni Müsait yapar.'}
                </p>
              </div>
            </div>

            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                isEarlyExitActive ? 'bg-black text-amber-400 border-black' : 'border-white/30'
              }`}
            >
              {isEarlyExitActive && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </button>

          {/* HIZLI KONUM VE DURUM ROZETLERİ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Neredesin? Hızlı Seç:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_PRESETS.filter((p) => p.id !== 'early_exit').map((preset) => {
                const active = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setSelectedPresetId('');
                      } else {
                        setSelectedPresetId(preset.id);
                        if (!statusNote) setStatusNote(preset.defaultNote);
                      }
                    }}
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      active
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-md'
                        : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                    }`}
                  >
                    <span className="text-base shrink-0">{preset.emoji}</span>
                    <span className="text-xs font-extrabold truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SERBEST NOT GİRİŞİ */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              {partnerName}&apos;ya Not Bırak:
            </label>
            <textarea
              rows={2}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Örn: Kütüphane -1 sessiz alandayım, kahveye beklerim ☕"
              maxLength={120}
              className="w-full rounded-2xl bg-black/40 border border-white/15 focus:border-amber-400 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 outline-none transition-all resize-none"
            />
          </div>

          {/* SÜRE VE KAYDETME */}
          <div className="flex items-center gap-2 pt-1">
            <select
              value={statusDuration}
              onChange={(e: any) => setStatusDuration(e.target.value)}
              className="bg-white/10 border border-white/15 text-slate-200 text-xs font-bold rounded-xl px-3 py-2.5 outline-none cursor-pointer"
            >
              <option value="next_class" className="bg-slate-900 text-white">Sonraki Derse Kadar</option>
              <option value="60m" className="bg-slate-900 text-white">1 Saat Geçerli</option>
              <option value="today" className="bg-slate-900 text-white">Bugün Boyu</option>
            </select>

            <button
              type="button"
              onClick={() => handleSaveMyStatus()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-400/20 transition-all cursor-pointer"
            >
              {statusSaveToast ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Durum İletildi!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Durumu {partnerName}&apos;ya İlet</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 📅 4. İKİLİ GÜNLÜK PARALEL ÇİZELGE */}
        <div className="rounded-3xl bg-slate-900/90 border border-white/15 p-5 shadow-2xl space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Günün Paralel Çizelgesi</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {timelineDay}
            </span>
          </div>

          {/* Gün Seçici Haplar */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {WEEKDAYS_TR.map((day) => {
              const active = timelineDay === day;
              const isToday = day === activeDayName;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setTimelineDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && (
                    <span className="text-[8px] font-black uppercase px-1 rounded bg-black/20">
                      Bugün
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sütun Başlıkları */}
          <div className="grid grid-cols-[55px_1fr_1fr] gap-2 pt-2 border-t border-white/10 text-[11px] font-black uppercase text-slate-400">
            <span className="text-center">Saat</span>
            <span className="text-center text-blue-300">{myName} (Sen)</span>
            <span className="text-center text-violet-300">{partnerName}</span>
          </div>

          {/* Saatlik Akış */}
          <div className="space-y-1.5 divide-y divide-white/5 max-h-80 overflow-y-auto pr-1">
            {TIMELINE_HOURS.map((hrStr) => {
              const hrStart = toMinutes(hrStr);
              const isCurrent = timelineDay === activeDayName && activeMinutes >= hrStart && activeMinutes < hrStart + 60;

              const mySlots = getDayCourses(me.schedule, timelineDay);
              const partnerSlots = getDayCourses(partner.schedule, timelineDay);

              const myMatch = mySlots.find((s) => hrStart >= s.start_minutes && hrStart < s.end_minutes);
              const partnerMatch = partnerSlots.find((s) => hrStart >= s.start_minutes && hrStart < s.end_minutes);

              const myEarly = myMatch && timelineDay === activeDayName ? isCourseEarlyDismissed(myMatch, myStatus.activeCustomStatus, timelineDay) : false;
              const partnerEarly = partnerMatch && timelineDay === activeDayName ? isCourseEarlyDismissed(partnerMatch, partnerStatus.activeCustomStatus, timelineDay) : false;

              const bothFree = (!myMatch || myEarly) && (!partnerMatch || partnerEarly);

              return (
                <div
                  key={hrStr}
                  className={`grid grid-cols-[55px_1fr_1fr] gap-2 pt-1.5 items-center text-xs rounded-xl px-1 ${
                    isCurrent ? 'bg-amber-400/10 ring-1 ring-amber-400/30' : ''
                  }`}
                >
                  <div className="text-center font-mono text-[11px] text-slate-400">
                    <span className={isCurrent ? 'text-amber-400 font-bold' : ''}>{hrStr}</span>
                  </div>

                  {/* Benim Kolonum */}
                  <div className="p-1.5 rounded-xl text-center truncate">
                    {myMatch && !myEarly ? (
                      myMatch.is_online ? (
                        <div
                          className="bg-rose-500/15 text-rose-200 border border-rose-500/40 px-2 py-1 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                          title="Online Ders (Fiziksel Olarak Müsait)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          <Video className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="font-mono font-bold text-[10.5px] truncate">
                            {myMatch.code}
                          </span>
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-300 bg-rose-950/80 px-1 py-0.2 rounded shrink-0">
                            Rec
                          </span>
                        </div>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-1 rounded-lg block truncate font-bold text-[11px]">
                          {myMatch.code}
                        </span>
                      )
                    ) : myEarly ? (
                      <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded block text-[10px] font-bold truncate">
                        ⚡ Çıktı
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Boş</span>
                    )}
                  </div>

                  {/* Partner Kolonu */}
                  <div className="p-1.5 rounded-xl text-center truncate">
                    {partnerMatch && !partnerEarly ? (
                      partnerMatch.is_online ? (
                        <div
                          className="bg-rose-500/15 text-rose-200 border border-rose-500/40 px-2 py-1 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                          title="Online Ders (Fiziksel Olarak Müsait)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          <Video className="w-3 h-3 text-rose-400 shrink-0" />
                          <span className="font-mono font-bold text-[10.5px] truncate">
                            {partnerMatch.code}
                          </span>
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-300 bg-rose-950/80 px-1 py-0.2 rounded shrink-0">
                            Rec
                          </span>
                        </div>
                      ) : (
                        <span className="bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-1 rounded-lg block truncate font-bold text-[11px]">
                          {partnerMatch.code}
                        </span>
                      )
                    ) : partnerEarly ? (
                      <span className="bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded block text-[10px] font-bold truncate">
                        ⚡ Çıktı
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">Boş</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* 5. AYARLAR & PROGRAM YÜKLEME MODALI */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Program &amp; Oda Ayarları</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Kendi Programını Güncelle */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-300">
                1. Kendi ({myName}) Programını Güncelle:
              </p>
              <div className="flex gap-2">
                <label className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingFor === myId ? 'Yükleniyor...' : 'PDF / PNG Seç'}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={uploadingFor !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(myId, f);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleImportFromHome(myId)}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold cursor-pointer"
                  title="Ana sayfadaki programı aktar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Partner Programını Güncelle */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <p className="text-xs font-bold text-slate-300">
                2. {partnerName}&apos;nın Programını Güncelle:
              </p>
              <div className="flex gap-2">
                <label className="flex-1 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-white/15">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>{uploadingFor === partnerId ? 'Yükleniyor...' : `${partnerName} PDF / PNG`}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={uploadingFor !== null}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(partnerId, f);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleImportFromHome(partnerId)}
                  className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold cursor-pointer"
                  title="Ana sayfadaki programı aktar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold mt-2"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
