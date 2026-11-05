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
  User,
  GraduationCap,
  Bell,
  BellRing
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
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPush,
  sendTestPush,
} from '../../utils/pushManager';

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
  const [statusDuration, setStatusDuration] = useState<number | 'auto'>('auto');
  const [isEarlyExitActive, setIsEarlyExitActive] = useState<boolean>(false);
  const [statusSaveToast, setStatusSaveToast] = useState(false);
  const [pingSentToast, setPingSentToast] = useState<string | null>(null);

  // Push Bildirim Durumu (PWA & Kilit Ekranı)
  const [pushPermission, setPushPermission] = useState<string>('default');
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [pushToast, setPushToast] = useState<string | null>(null);
  const [isIosBrowser, setIsIosBrowser] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const perm = getNotificationPermission();
      setPushPermission(perm);

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone =
        (window.navigator as any).standalone ||
        window.matchMedia('(display-mode: standalone)').matches;
      if (isIOS && !isStandalone) {
        setIsIosBrowser(true);
      }
    }
  }, []);

  const handleEnablePushNotifications = async () => {
    setIsSubscribingPush(true);
    const result = await subscribeToPush(roomCode, myId, API_BASE);
    setIsSubscribingPush(false);
    if (result.success) {
      setPushPermission('granted');
      setPushToast('🎉 Bildirimler açıldı! Erken çıkışlar ve dürtmeler kilit ekranına düşecek.');
      setTimeout(() => setPushToast(null), 4000);
    } else {
      setPushToast(`⚠️ ${result.error || 'Bildirim açılamadı.'}`);
      setTimeout(() => setPushToast(null), 4000);
    }
  };

  const handleTestPushNotification = async () => {
    setPushToast('🔔 Test bildirimi gönderiliyor...');
    const result = await sendTestPush(roomCode, myId, API_BASE);
    setPushToast(result.message || 'Gönderildi!');
    setTimeout(() => setPushToast(null), 4000);
  };

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
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchRoomData();
    }, 15000);
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchRoomData();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
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

  // Kendi durumunu kaydet
  const handleSaveMyStatus = async (overrideEarlyExit?: boolean) => {
    const isEarly = overrideEarlyExit !== undefined ? overrideEarlyExit : isEarlyExitActive;
    let expiresAt: number | null = null;
    if (statusDuration !== 'auto') {
      expiresAt = Date.now() + (statusDuration as number) * 60 * 1000;
    } else if (isEarly && myStatus.currentClass) {
      const parts = myStatus.currentClass.end_time.split(':');
      const endH = parseInt(parts[0], 10);
      const endM = parseInt(parts[1], 10);
      const targetDate = new Date(nowDate);
      targetDate.setHours(endH, endM, 0, 0);
      expiresAt = targetDate.getTime();
    }

    const preset = STATUS_PRESETS.find((p) => p.id === selectedPresetId);

    const payload: CustomStatusOverride = {
      type: isEarly ? 'early_exit' : selectedPresetId ? 'preset' : 'custom',
      preset_id: selectedPresetId || (isEarly ? 'early_exit' : undefined),
      note: statusNote.trim() || (isEarly ? 'Dersim erken bitti / çıktım ⚡' : preset?.defaultNote || ''),
      emoji: preset?.emoji || (isEarly ? '⚡' : '📍'),
      label: isEarly ? 'Dersim Erken Bitti' : preset?.label || 'Özel Durum',
      early_exit: isEarly,
      created_at: Date.now(),
      expires_at: expiresAt,
    };

    const nextProfiles = profiles.map((p) => (p.id === myId ? { ...p, custom_status: payload } : p));
    setProfiles(nextProfiles);

    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/status?profile_id=${encodeURIComponent(myId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
    } catch {}

    setStatusSaveToast(true);
    setTimeout(() => setStatusSaveToast(false), 2500);
  };

  // Kendi durumunu sıfırla
  const handleClearMyStatus = async () => {
    setSelectedPresetId('');
    setStatusNote('');
    setIsEarlyExitActive(false);

    const nextProfiles = profiles.map((p) => (p.id === myId ? { ...p, custom_status: null } : p));
    setProfiles(nextProfiles);

    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/status?profile_id=${encodeURIComponent(myId)}`,
        { method: 'DELETE' }
      );
    } catch {}
  };

  // Partnere Ping Gönder
  const handleSendPing = async (type: string, message: string, emoji: string) => {
    const newPing: DuoPing = {
      id: `ping_${Date.now()}`,
      from_id: myId,
      to_id: partnerId,
      type,
      message,
      emoji,
      created_at: Date.now(),
      dismissed: false,
    };

    setPings((prev) => [newPing, ...prev]);

    try {
      await fetch(`${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_id: myId,
          to_id: partnerId,
          type,
          message,
          emoji,
        }),
      });
    } catch {}

    setPingSentToast(`${partnerName}'ya "${emoji} ${type === 'poke' ? 'Dürtme' : type}" bildirimi gönderildi!`);
    setTimeout(() => setPingSentToast(null), 3000);
  };

  // Ping'i kapat (Dismiss)
  const handleDismissPing = async (pingId: string) => {
    setPings((prev) => prev.filter((p) => p.id !== pingId));
    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/ping/${encodeURIComponent(pingId)}/dismiss`,
        { method: 'POST' }
      );
    } catch {}
  };

  const incomingPing = useMemo(() => {
    return pings.find((p) => p.to_id === myId && !p.dismissed);
  }, [pings, myId]);

  // Dosya Yükleme (PDF veya Görsel)
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
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 font-bold text-slate-600">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0c3f79]" />
          <span>Özel Duo Alanı Yükleniyor...</span>
        </div>
      </div>
    );
  }

  const partnerTheme = PROFILE_THEMES[partner.color] || PROFILE_THEMES.violet;
  const isPartnerBusy = partnerStatus.state === 'IN_CLASS';
  const partnerCS = partnerStatus.activeCustomStatus;

  const isMyBusy = myStatus.state === 'IN_CLASS';
  const isMyOnline = myStatus.state === 'ONLINE_CLASS';
  const myCS = myStatus.activeCustomStatus;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28 select-none font-sans">
      {/* 1. ÜST BAR & DYNAMIC ISLAND BADGE (YTÜ DOSTUN UYUMLU) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Üst Başlık & İsim */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-sm font-black tracking-tight text-slate-900 flex items-center gap-1.5">
                <span className="text-[#0c3f79]">{partnerName}</span>
                <span className="text-slate-400 font-light">&amp;</span>
                <span className="text-[#0c3f79]">{myName}</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5 shadow-2xs">
                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                  Özel
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSimulatingTime(!isSimulatingTime)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  isSimulatingTime
                    ? 'bg-amber-400 text-slate-950 font-black shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Saat simülatörü"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Simüle Et</span>
              </button>

              <button
                type="button"
                onClick={fetchRoomData}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Şimdi Yenile"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#0c3f79]' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Program & Ayarlar"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* DYNAMIC ISLAND CAPSULE (YTÜ Laciverti & Altın Hap) */}
          <div className="w-full bg-[#0c3f79] border border-[#00306a] rounded-full px-4 py-2 flex items-center justify-between gap-3 shadow-md shadow-[#0c3f79]/20">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base shrink-0">{partner.avatar}</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-white truncate flex items-center gap-1.5">
                  <span className="text-amber-300">{partner.name}:</span>
                  {partnerStatus.state === 'ONLINE_CLASS' ? (
                    <span className="text-cyan-300 font-extrabold truncate">
                      💻 Online Ders (Müsait)
                    </span>
                  ) : isPartnerBusy ? (
                    <span className="text-rose-200 font-extrabold truncate">
                      {partnerStatus.currentClass?.name} ({partnerStatus.remainingMinutes} dk)
                    </span>
                  ) : partnerStatus.isEarlyExitActive ? (
                    <span className="text-amber-200 font-extrabold truncate">
                      ⚡ Erken çıktı (Müsait)
                    </span>
                  ) : (
                    <span className="text-emerald-200 font-extrabold truncate">
                      Müsait {partnerStatus.freeUntilTime ? `(${partnerStatus.freeUntilTime}'a dek)` : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-1 font-mono text-[11px] font-bold text-amber-300 bg-white/15 px-2 py-0.5 rounded-full border border-white/20">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{minutesToTimeStr(activeMinutes)}</span>
            </div>
          </div>

          {/* Simülatör Açıldıysa */}
          {isSimulatingTime && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-2 animate-in fade-in duration-150 text-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-xs font-extrabold text-amber-900">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Saat Simülatörü
                </span>
                <button
                  onClick={() => setIsSimulatingTime(false)}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-bold underline flex items-center gap-1 cursor-pointer"
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
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-all ${
                      simulatedDay === d
                        ? 'bg-[#0c3f79] text-white shadow-2xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-slate-700">
                  <span>Simüle Saat:</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded border border-amber-300 text-amber-900">
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
                  className="w-full accent-[#0c3f79] cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 2. ANA İÇERİK ALANI (MOBİL ÖNCELİKLİ & FERAH) */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* BANA GELEN CANLI PİNG (TOAST) */}
        {incomingPing && (
          <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 p-4 shadow-lg shadow-amber-500/20 flex items-start justify-between gap-3 animate-bounce border border-amber-300">
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
          <div className="rounded-xl bg-emerald-600 text-white font-black text-xs px-3.5 py-2.5 flex items-center gap-2 shadow-md animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{pingSentToast}</span>
          </div>
        )}

        {/* PUSH BİLDİRİM TOAST */}
        {pushToast && (
          <div className="rounded-xl bg-slate-900 text-white font-extrabold text-xs px-3.5 py-2.5 flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
            <span>{pushToast}</span>
            <button
              type="button"
              onClick={() => setPushToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* PUSH BİLDİRİM BANNER'I (Henüz Açılmadıysa) */}
        {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border border-blue-200/80 rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#0c3f79]/10 text-[#0c3f79] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 animate-pulse text-[#0c3f79]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <span>Kilit Ekranı Bildirimleri</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-full">
                    Canlı
                  </span>
                </p>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5">
                  {isIosBrowser
                    ? 'iPhone: Paylaş (⎋) -> "Ana Ekrana Ekle" yapıp oradan bildirimleri açabilirsin.'
                    : `${partnerName} erken çıktığında veya dürttüğünde kilit ekranına bildirim düşsün.`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnablePushNotifications}
              disabled={isSubscribingPush}
              className="shrink-0 px-3 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#082a52] text-white text-xs font-black shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubscribingPush ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5" />
              )}
              <span>Aç</span>
            </button>
          </div>
        )}

        {/* PUSH BİLDİRİM AKTİF ROZETİ & TEST BUTONU */}
        {pushPermission === 'granted' && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50/90 border border-emerald-200/80 text-emerald-900 text-xs shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold truncate">Kilit Ekranı Bildirimleri Aktif</span>
            </div>
            <button
              type="button"
              onClick={handleTestPushNotification}
              className="text-[11px] font-black text-[#0c3f79] hover:text-[#082a52] bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer shrink-0"
            >
              🔔 Test Et
            </button>
          </div>
        )}

        {/* 🌟 1. HERO KART: PARTNER ŞU AN NE YAPIYOR? (Neva / Atilla) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs relative overflow-hidden space-y-4">
          {/* Kart Üst Bilgisi */}
          <div className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl ${partnerTheme.bg} text-white flex items-center justify-center text-2xl shadow-sm ring-2 ring-slate-100 shrink-0`}
              >
                {partner.avatar}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-slate-900 truncate">
                    {partner.name}
                  </h2>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    Arkadaşın
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  {activeDayName} Canlı Kampüs Durumu
                </p>
              </div>
            </div>

            {/* Durum Rozeti */}
            <div className="shrink-0">
              {partnerStatus.state === 'ONLINE_CLASS' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-sky-50 text-sky-800 border border-sky-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                  💻 ONLİNE DERS (MÜSAİT)
                </span>
              ) : isPartnerBusy ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  DERSTE
                </span>
              ) : partnerStatus.isEarlyExitActive ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                  <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                  ERKEN ÇIKTI
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  MÜSAİT
                </span>
              )}
            </div>
          </div>

          {/* Partner'ın Bıraktığı Canlı Not / Konum Balonu */}
          {partnerCS && (
            <div className="rounded-2xl bg-amber-50/80 border border-amber-200/90 p-3.5 flex items-start gap-2.5 relative z-10">
              <span className="text-2xl leading-none mt-0.5 shrink-0">{partnerCS.emoji || '💬'}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-900">
                    {partnerCS.label || 'Durum Notu'}
                  </span>
                  {partnerCS.early_exit && (
                    <span className="text-[10px] font-black bg-amber-200/60 text-amber-900 px-1.5 py-0.5 rounded">
                      ⚡ Dersi Erken Bitti
                    </span>
                  )}
                </div>
                {partnerCS.note && (
                  <p className="text-xs font-bold text-amber-950 mt-1 break-words">
                    “{partnerCS.note}”
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Partner Durum Detayı: Derste / Boş / Online */}
          <div className="relative z-10 space-y-3">
            {partnerStatus.state === 'ONLINE_CLASS' && partnerStatus.currentClass && (
              <div className="rounded-2xl bg-sky-50/80 border border-sky-200 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sky-800 flex items-center gap-1">
                      💻 Şu An Online Derste (Fiziksel Olarak Müsait)
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-0.5 leading-snug">
                      {partnerStatus.currentClass.name}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 mt-1 text-xs text-slate-600">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded text-[11px] border border-sky-200 text-sky-900">
                        {partnerStatus.currentClass.code}
                      </span>
                      <span>
                        🕒 {partnerStatus.currentClass.start_time} - {partnerStatus.currentClass.end_time}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sky-900 bg-white px-2 py-0.5 rounded border border-sky-200 font-medium">
                        💻 {partnerStatus.currentClass.classroom || 'Online'}
                      </span>
                    </div>
                    <p className="text-xs text-sky-950/80 mt-1.5 font-medium">
                      ✨ Online ders olduğu için müsait kabul edilir, dilediğin gibi yazabilir veya çağırabilirsin.
                    </p>
                  </div>

                  <div className="bg-white border border-sky-200 rounded-2xl px-3.5 py-2 text-center shrink-0 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-sky-700">
                      Durum
                    </span>
                    <p className="text-sm font-black text-sky-900 leading-tight mt-0.5">
                      Müsait
                    </p>
                    <span className="text-[10px] text-slate-500">
                      Online
                    </span>
                  </div>
                </div>
              </div>
            )}

            {isPartnerBusy && partnerStatus.currentClass && (
              <div className="rounded-2xl bg-rose-50/80 border border-rose-200 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      Şu An Devam Eden Ders
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-0.5 leading-snug">
                      {partnerStatus.currentClass.name}
                    </h3>
                    <div className="flex items-center flex-wrap gap-2 mt-1.5 text-xs text-slate-600">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded text-[11px] border border-rose-200 text-rose-900">
                        {partnerStatus.currentClass.code}
                      </span>
                      <span>
                        🕒 {partnerStatus.currentClass.start_time} - {partnerStatus.currentClass.end_time}
                      </span>
                      {partnerStatus.currentClass.classroom && (
                        <span className="inline-flex items-center gap-1 text-slate-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                          <MapPin className="w-3 h-3 text-rose-600" />
                          {partnerStatus.currentClass.classroom}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Geri Sayım Kutusu */}
                  <div className="bg-white border border-rose-200 rounded-2xl px-3.5 py-2 text-center shrink-0 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-rose-700 tracking-wider">
                      Bitmesine
                    </span>
                    <p className="text-xl font-black text-rose-900 leading-tight mt-0.5 font-mono">
                      {formatDurationTr(partnerStatus.remainingMinutes)}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {partnerStatus.currentClass.end_time}&apos;de
                    </span>
                  </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Ders Tamamlanma</span>
                    <span className="text-rose-700 font-mono">%{partnerStatus.progressPercent}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${partnerStatus.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {!isPartnerBusy && (
              <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {partnerStatus.isEarlyExitActive ? 'Ders Erken Bitti' : 'Şu An Müsait'}
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-0.5">
                      {partnerStatus.freeUntilTime ? `${partnerStatus.freeUntilTime}'a kadar boş!` : 'Bugün dersi yok!'}
                    </h3>
                    {partnerStatus.nextClass ? (
                      <p className="text-xs text-slate-600 mt-1">
                        Sıradaki: <strong className="text-slate-900 font-semibold">{partnerStatus.nextClass.start_time}</strong> -{' '}
                        {partnerStatus.nextClass.name}
                        {partnerStatus.nextClass.classroom ? ` (${partnerStatus.nextClass.classroom})` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-800 font-bold mt-1">
                        🎉 Bugün başka dersi kalmadı, tamamen serbest!
                      </p>
                    )}
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-2xl px-3.5 py-2 text-center shrink-0 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">
                      Boş Süre
                    </span>
                    <p className="text-lg font-black text-emerald-900 leading-tight mt-0.5 font-mono">
                      {partnerStatus.remainingMinutes ? formatDurationTr(partnerStatus.remainingMinutes) : 'Gün Boyu'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TEK TIKLA PARTNER'A ÇAĞRI / DÜRTME BUTONLARI (DUO PINGS) */}
          <div className="pt-3 border-t border-slate-100 space-y-2 relative z-10">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{partner.name}&apos;ya Hızlı Bildirim Bırak:</span>
            </span>

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleSendPing('coffee', 'Kahveye gel, seni bekliyorum ☕', '☕')}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50 text-slate-800 hover:text-amber-900 border border-slate-200 hover:border-amber-300 text-center transition-all cursor-pointer shadow-2xs active:scale-95 group"
              >
                <span className="text-xl block group-hover:scale-110 transition-transform">☕</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Kahve</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPing('location', 'Neredesin? Kampüste misin?', '📍')}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 text-center transition-all cursor-pointer shadow-2xs active:scale-95 group"
              >
                <span className="text-xl block group-hover:scale-110 transition-transform">📍</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Neredesin?</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPing('library', 'Kütüphanedeyim, yanıma gel 📚', '📚')}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200 hover:border-blue-300 text-center transition-all cursor-pointer shadow-2xs active:scale-95 group"
              >
                <span className="text-xl block group-hover:scale-110 transition-transform">📚</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Kütüphane</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPing('poke', 'Seni dürttü! 👋', '👋')}
                className="p-2.5 rounded-2xl bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-900 border border-slate-200 hover:border-purple-300 text-center transition-all cursor-pointer shadow-2xs active:scale-95 group"
              >
                <span className="text-xl block group-hover:scale-110 transition-transform">👋</span>
                <span className="text-[10px] font-extrabold block mt-0.5">Dürt</span>
              </button>
            </div>
          </div>
        </div>

        {/* ☕ 2. ORTAK UYGUNLUK & KAHVE BULUŞMA VAKTİ */}
        <div
          className={`rounded-3xl border p-4 shadow-xs transition-all space-y-2.5 ${
            mutual.allAvailableNow
              ? 'bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 border-amber-300'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                mutual.allAvailableNow
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 text-[#0c3f79]'
              }`}
            >
              <Coffee className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-800">
                {mutual.allAvailableNow ? '🎉 İkiniz De Şu An Boşsunuz!' : 'Ortak Zaman Kesişimi'}
              </h4>
              <p className="text-sm font-extrabold text-slate-900 leading-tight mt-0.5">
                {mutual.headline}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{mutual.detail}</p>
            </div>
          </div>

          {/* Günün Ortak Boşlukları */}
          {mutual.todayMutualWindows.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
              {mutual.todayMutualWindows.map((win, idx) => (
                <span
                  key={idx}
                  className={`text-xs font-bold px-2.5 py-1 rounded-xl font-mono ${
                    win.is_current
                      ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {win.start_time} - {win.end_time} ({formatDurationTr(win.duration_minutes)})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ⚡ 3. BENİM DURUMUM KARTI (KULLANICININ İSTEDİĞİ CANLI DURUM & KUMANDA) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-4">
          {/* Kart Başlığı */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#0c3f79] text-white flex items-center justify-center text-xl shadow-xs">
                {me.avatar}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>Senin Durumun</span>
                  <span className="text-xs font-bold text-slate-500 font-mono">({myName})</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {partnerName}&apos;nın ekranında şu an nasıl görünüyorsun?
                </p>
              </div>
            </div>

            {me.custom_status && (
              <button
                type="button"
                onClick={handleClearMyStatus}
                className="text-[11px] font-extrabold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 cursor-pointer transition-colors"
              >
                Durumu Sıfırla
              </button>
            )}
          </div>

          {/* 🔥 CANLI ÖNİZLEME: KARŞI TARAF SENİ NASIL GÖRÜYOR? */}
          <div className="space-y-2.5">
            {/* Durum A: Online Derste */}
            {myStatus.state === 'ONLINE_CLASS' && myStatus.currentClass && (
              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 space-y-2 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-800 border border-sky-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                    💻 ONLİNE DERS (MÜSAİT GÖRÜNÜYORSUN)
                  </span>
                  <span className="text-[11px] font-mono font-bold text-sky-900">
                    🕒 {myStatus.currentClass.start_time} - {myStatus.currentClass.end_time}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-sm font-black text-slate-900">
                    {myStatus.currentClass.name}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium flex items-center gap-2">
                    <span className="font-mono font-bold bg-white px-1.5 py-0.2 rounded border border-sky-200 text-sky-900 text-[10.5px]">
                      {myStatus.currentClass.code}
                    </span>
                    <span>Derslik: {myStatus.currentClass.classroom || 'Online'}</span>
                  </p>
                </div>

                <p className="text-[11.5px] text-sky-900 font-medium pt-1 border-t border-sky-200/60">
                  ✨ Bu ders online olduğu için {partnerName} seni <strong>fiziksel olarak müsait</strong> olarak görüyor.
                </p>
              </div>
            )}

            {/* Durum B: Erken Çıkış Aktif */}
            {isEarlyExitActive && (
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                    <Zap className="w-3.5 h-3.5 fill-current text-amber-500" />
                    ⚡ DERSTEN ERKEN ÇIKTIN (MÜSAİT)
                  </span>
                  <span className="text-[11px] font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                    Müsait
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  Normalde ders programında ders saati olmasına rağmen &quot;Erken Çıktım&quot; bildirdiğin için {partnerName} seni şu an <strong>MÜSAİT</strong> olarak görüyor.
                </p>
                {myStatus.earlyDismissedClass && (
                  <p className="text-[11px] font-mono text-amber-900 bg-white/80 p-2 rounded-xl border border-amber-200/80">
                    Erken çıkılan ders: <strong>{myStatus.earlyDismissedClass.code}</strong> - {myStatus.earlyDismissedClass.name}
                  </p>
                )}
              </div>
            )}

            {/* Durum C: Fiziksel Derste (ve erken çıkış yapmamış) */}
            {isMyBusy && !isEarlyExitActive && myStatus.currentClass && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 space-y-3 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      🔴 ŞU AN DERSTESİN
                    </span>
                    <h4 className="text-sm font-black text-slate-900 leading-snug">
                      {myStatus.currentClass.name}
                    </h4>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-600">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded text-[11px] border border-rose-200 text-rose-900">
                        {myStatus.currentClass.code}
                      </span>
                      <span>🕒 {myStatus.currentClass.start_time} - {myStatus.currentClass.end_time}</span>
                      {myStatus.currentClass.classroom && (
                        <span className="inline-flex items-center gap-1 text-slate-800 bg-white px-2 py-0.5 rounded border border-rose-200">
                          <MapPin className="w-3 h-3 text-rose-600" />
                          {myStatus.currentClass.classroom}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-rose-200 rounded-2xl px-3 py-2 text-center shrink-0 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase text-rose-700">Bitmesine</span>
                    <p className="text-lg font-black text-rose-900 font-mono leading-tight mt-0.5">
                      {formatDurationTr(myStatus.remainingMinutes)}
                    </p>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {myStatus.currentClass.end_time}&apos;de
                    </span>
                  </div>
                </div>

                {/* İlerleme Çubuğu */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-slate-600">
                    <span>Ders İlerlemesi</span>
                    <span className="text-rose-700 font-mono">%{myStatus.progressPercent}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${myStatus.progressPercent}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 font-medium pt-1 border-t border-rose-200/60">
                  {partnerName} şu an seni <strong>derste</strong> görüyor. Eğer ders erken bittiyse aşağıdaki sarı butona basarak durumunu güncelleyebilirsin.
                </p>
              </div>
            )}

            {/* Durum D: Şu an Müsait / Boşta */}
            {!isMyBusy && !isEarlyExitActive && myStatus.state !== 'ONLINE_CLASS' && (
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 space-y-2 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    🟢 ŞU AN BOŞTASIN (MÜSAİT GÖRÜNÜYORSUN)
                  </span>
                  <span className="text-[11px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                    {myStatus.freeUntilTime ? `${myStatus.freeUntilTime}'a dek` : 'Gün Boyu'}
                  </span>
                </div>

                <h4 className="text-sm font-black text-slate-900">
                  {myStatus.freeUntilTime ? `${myStatus.freeUntilTime}'a kadar dersin yok!` : 'Bugün başka dersin yok!'}
                </h4>

                {myStatus.nextClass ? (
                  <p className="text-xs text-slate-600">
                    Sıradaki dersin: <strong className="text-slate-900 font-semibold">{myStatus.nextClass.start_time}</strong> - {myStatus.nextClass.name} ({myStatus.nextClass.classroom || 'Online'})
                  </p>
                ) : (
                  <p className="text-xs text-emerald-800 font-bold">
                    🎉 Bugünün tüm dersleri bitti veya bugün programın yok.
                  </p>
                )}

                <p className="text-[11px] text-slate-600 font-medium pt-1 border-t border-emerald-200/60">
                  {partnerName} seni şu an <strong>müsait</strong> olarak görüyor.
                </p>
              </div>
            )}

            {/* Yayınlanan Canlı Not Varsa Göster */}
            {me.custom_status?.note && (
              <div className="rounded-xl bg-amber-50/80 border border-amber-200/90 p-2.5 flex items-center gap-2 text-xs text-amber-950 font-bold">
                <span className="text-base">{me.custom_status.emoji || '💬'}</span>
                <span className="truncate">Yayınlanan Notun: &ldquo;{me.custom_status.note}&rdquo;</span>
              </div>
            )}
          </div>

          {/* ⚡ DEV "DERSİM ERKEN BİTTİ" BUTONU (MOBILE ERGONOMİK) */}
          <button
            type="button"
            onClick={() => {
              const nextVal = !isEarlyExitActive;
              setIsEarlyExitActive(nextVal);
              handleSaveMyStatus(nextVal);
            }}
            className={`w-full p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 shadow-xs active:scale-[0.99] ${
              isEarlyExitActive
                ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 border-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 text-left">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                  isEarlyExitActive ? 'bg-slate-950 text-amber-400' : 'bg-white text-amber-500 border border-slate-200'
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
                    isEarlyExitActive ? 'text-amber-950 font-bold' : 'text-slate-500'
                  }`}
                >
                  {isEarlyExitActive
                    ? `Aktif! ${partnerName} seni şu an MÜSAİT olarak görüyor.`
                    : 'Tek dokunuşla ders saatini bitti sayar ve seni Müsait yapar.'}
                </p>
              </div>
            </div>

            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 ${
                isEarlyExitActive ? 'bg-slate-950 text-amber-400 border-slate-950' : 'border-slate-300 bg-white'
              }`}
            >
              {isEarlyExitActive && <Check className="w-4 h-4 stroke-[3]" />}
            </div>
          </button>

          {/* HIZLI KONUM VE DURUM ROZETLERİ */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
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
                    className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95 ${
                      active
                        ? 'bg-[#0c3f79] text-white border-[#0c3f79] font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
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
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              {partnerName}&apos;ya Not Bırak:
            </label>
            <textarea
              rows={2}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Örn: Kütüphane -1 sessiz alandayım, kahveye beklerim ☕"
              maxLength={120}
              className="w-full rounded-2xl bg-slate-50 border border-slate-200 focus:border-[#0c3f79] focus:bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all resize-none"
            />
          </div>

          {/* SÜRE VE KAYDETME */}
          <div className="flex items-center gap-2 pt-1">
            <select
              value={statusDuration}
              onChange={(e: any) => setStatusDuration(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2.5 outline-none cursor-pointer focus:border-[#0c3f79]"
            >
              <option value="auto">Otomatik (Ders Bitimine Kadar)</option>
              <option value={30}>30 Dakika</option>
              <option value={60}>1 Saat</option>
              <option value={120}>2 Saat</option>
              <option value={240}>4 Saat</option>
            </select>

            <button
              type="button"
              onClick={() => handleSaveMyStatus()}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Durumu Yayınla</span>
            </button>
          </div>

          {statusSaveToast && (
            <div className="rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-2 text-center animate-in fade-in">
              ✓ Durumun {partnerName}&apos;ya anında iletildi!
            </div>
          )}
        </div>

        {/* 4. GÜNLÜK İKİLİ PARALEL ÇİZELGE (TIMELINE) */}
        <div className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0c3f79]" />
              <h3 className="text-sm font-black text-slate-900">
                Günün Paralel Zaman Akışı
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 font-mono">
              {timelineDay}
            </span>
          </div>

          {/* Gün Seçici Butonlar */}
          <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1">
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
                      ? 'bg-[#0c3f79] text-white shadow-2xs font-black'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>{day}</span>
                  {isToday && (
                    <span className="text-[8px] font-black uppercase px-1 rounded bg-amber-400 text-slate-950">
                      Bugün
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sütun Başlıkları */}
          <div className="grid grid-cols-[55px_1fr_1fr] gap-2 pt-2 border-t border-slate-100 text-[11px] font-black uppercase text-slate-500">
            <span className="text-center">Saat</span>
            <span className="text-center text-[#0c3f79]">{myName} (Sen)</span>
            <span className="text-center text-purple-700">{partnerName}</span>
          </div>

          {/* Saatlik Akış */}
          <div className="space-y-1.5 divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
            {TIMELINE_HOURS.map((hrStr) => {
              const hrStart = toMinutes(hrStr);
              const isCurrent = timelineDay === activeDayName && activeMinutes >= hrStart && activeMinutes < hrStart + 60;

              const mySlots = getDayCourses(me.schedule, timelineDay);
              const partnerSlots = getDayCourses(partner.schedule, timelineDay);

              const myMatch = mySlots.find((s) => hrStart >= s.start_minutes && hrStart < s.end_minutes);
              const partnerMatch = partnerSlots.find((s) => hrStart >= s.start_minutes && hrStart < s.end_minutes);

              const myEarly = myMatch && timelineDay === activeDayName ? isCourseEarlyDismissed(myMatch, myStatus.activeCustomStatus, timelineDay) : false;
              const partnerEarly = partnerMatch && timelineDay === activeDayName ? isCourseEarlyDismissed(partnerMatch, partnerStatus.activeCustomStatus, timelineDay) : false;

              return (
                <div
                  key={hrStr}
                  className={`grid grid-cols-[55px_1fr_1fr] gap-2 pt-1.5 items-center text-xs rounded-xl px-1 ${
                    isCurrent ? 'bg-amber-50 ring-1 ring-amber-300' : ''
                  }`}
                >
                  <div className="text-center font-mono text-[11px] text-slate-500">
                    <span className={isCurrent ? 'text-amber-700 font-bold' : ''}>{hrStr}</span>
                  </div>

                  {/* Benim Kolonum */}
                  <div className="p-1.5 rounded-xl text-center truncate">
                    {myMatch && !myEarly ? (
                      myMatch.is_online ? (
                        <div
                          className="bg-rose-50 text-rose-800 border border-rose-300 px-2 py-1 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                          title="Online Ders (Fiziksel Olarak Müsait)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          <Video className="w-3 h-3 text-rose-600 shrink-0" />
                          <span className="font-mono font-bold text-[10.5px] truncate">
                            {myMatch.code}
                          </span>
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-white bg-rose-600 px-1 py-0.2 rounded shrink-0">
                            Rec
                          </span>
                        </div>
                      ) : (
                        <span className="bg-blue-50 text-blue-900 border border-blue-200 px-2 py-1 rounded-lg block truncate font-bold text-[11px]">
                          {myMatch.code}
                        </span>
                      )
                    ) : myEarly ? (
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded block text-[10px] font-bold truncate border border-amber-300">
                        ⚡ Çıktı
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Boş</span>
                    )}
                  </div>

                  {/* Partner Kolonu */}
                  <div className="p-1.5 rounded-xl text-center truncate">
                    {partnerMatch && !partnerEarly ? (
                      partnerMatch.is_online ? (
                        <div
                          className="bg-rose-50 text-rose-800 border border-rose-300 px-2 py-1 rounded-xl flex items-center justify-center gap-1.5 shadow-2xs"
                          title="Online Ders (Fiziksel Olarak Müsait)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                          <Video className="w-3 h-3 text-rose-600 shrink-0" />
                          <span className="font-mono font-bold text-[10.5px] truncate">
                            {partnerMatch.code}
                          </span>
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-white bg-rose-600 px-1 py-0.2 rounded shrink-0">
                            Rec
                          </span>
                        </div>
                      ) : (
                        <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-1 rounded-lg block truncate font-bold text-[11px]">
                          {partnerMatch.code}
                        </span>
                      )
                    ) : partnerEarly ? (
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded block text-[10px] font-bold truncate border border-amber-300">
                        ⚡ Çıktı
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Boş</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#0c3f79]" />
                <span>Program &amp; Oda Ayarları</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Kendi Programını Güncelle */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">
                1. Kendi ({myName}) Programını Güncelle:
              </p>
              <div className="flex gap-2">
                <label className="flex-1 py-2.5 px-3 rounded-xl bg-[#0c3f79] hover:bg-[#00306a] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs">
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
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer border border-slate-200"
                  title="Ana sayfadaki programı aktar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Partner Programını Güncelle */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-700">
                2. {partnerName}&apos;nın Programını Güncelle:
              </p>
              <div className="flex gap-2">
                <label className="flex-1 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 shadow-2xs">
                  <Upload className="w-3.5 h-3.5 text-amber-500" />
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
                  className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer border border-slate-200"
                  title="Ana sayfadaki programı aktar"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold mt-2"
            >
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
