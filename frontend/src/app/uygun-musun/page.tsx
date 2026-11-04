"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  MessageSquarePlus,
  Calendar,
  Users,
  Clock,
  SlidersHorizontal,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import {
  CustomStatusOverride,
  ProfileLiveStatus,
  UygunMusunProfile,
  UygunMusunRoomState,
} from '../../types/uygunMusun';
import {
  WEEKDAYS_TR,
  PROFILE_THEMES,
  DEMO_SCHEDULES,
  getTurkishDayNameFromDate,
  minutesToTimeStr,
  calculateProfileLiveStatus,
  calculateMutualAvailability,
} from '../../utils/uygunMusunEngine';
import LiveFriendHeroCard from '../../components/uygun-musun/LiveFriendHeroCard';
import MutualMatchBanner from '../../components/uygun-musun/MutualMatchBanner';
import StatusCheckInSheet from '../../components/uygun-musun/StatusCheckInSheet';
import DailyParallelTimeline from '../../components/uygun-musun/DailyParallelTimeline';
import ProfileScheduleManager from '../../components/uygun-musun/ProfileScheduleManager';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type ActiveMobileTab = 'live' | 'status' | 'timeline' | 'profiles';

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

export default function UygunMusunPage() {
  const [roomCode, setRoomCode] = useLocalStorageState<string>(
    'ytu_uygun_musun_room_code',
    'atilla-neva'
  );
  const [profiles, setProfiles, isMounted] = useLocalStorageState<UygunMusunProfile[]>(
    'ytu_uygun_musun_profiles_v1',
    DEFAULT_PROFILES
  );
  const [myProfileId, setMyProfileId] = useLocalStorageState<string>(
    'ytu_uygun_musun_my_id',
    'atilla'
  );

  const [activeTab, setActiveTab] = useState<ActiveMobileTab>('live');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusTargetProfileId, setStatusTargetProfileId] = useState<string>('atilla');
  const [syncing, setSyncing] = useState(false);

  // Canlı Saat & Test Simülatörü State'i
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const [isSimulatingTime, setIsSimulatingTime] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState<string>('Çarşamba');
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(10 * 60 + 20); // 10:20
  const [timelineDay, setTimelineDay] = useState<string>('Çarşamba');

  // Gerçek zamanlı saat güncellemesi (her 15 saniyede bir)
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

  // URL'de ?oda=... parametresi varsa odayı otomatik ayarla
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const odaParam = params.get('oda');
    if (odaParam && odaParam.trim()) {
      setRoomCode(odaParam.trim().toLowerCase());
    }
  }, [setRoomCode]);

  // Sunucudan oda durumunu çekme (Polling / Sync)
  const fetchRoomFromServer = useCallback(
    async (codeToFetch: string) => {
      if (!codeToFetch) return;
      try {
        setSyncing(true);
        const res = await fetch(
          `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(codeToFetch)}`
        );
        if (!res.ok) return;
        const data: UygunMusunRoomState = await res.json();
        if (data && Array.isArray(data.profiles) && data.profiles.length >= 2) {
          // Sunucuda en az bir profilin programı veya durumu varsa yerel state ile birleştir
          const serverHasAnyData = data.profiles.some(
            (p) => p.schedule || p.custom_status
          );
          if (serverHasAnyData) {
            setProfiles(data.profiles);
          }
        }
      } catch {
        // Çevrimdışı durumda yerel veriyle kesintisiz çalışmaya devam et
      } finally {
        setSyncing(false);
      }
    },
    [setProfiles]
  );

  useEffect(() => {
    if (!isMounted) return;
    fetchRoomFromServer(roomCode);
    const interval = setInterval(() => {
      fetchRoomFromServer(roomCode);
    }, 20000);
    return () => clearInterval(interval);
  }, [isMounted, roomCode, fetchRoomFromServer]);

  // Efektif gün ve dakika
  const realDayName = getTurkishDayNameFromDate(nowDate);
  const realMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

  const activeDayName = isSimulatingTime ? simulatedDay : realDayName;
  const activeMinutes = isSimulatingTime ? simulatedMinutes : realMinutes;
  const nowEpochMs = nowDate.getTime();

  // Tüm profiller için canlı durum haritası
  const liveStatuses = useMemo(() => {
    const map: Record<string, ProfileLiveStatus> = {};
    for (const p of profiles) {
      map[p.id] = calculateProfileLiveStatus(p, activeDayName, activeMinutes, nowEpochMs);
    }
    return map;
  }, [profiles, activeDayName, activeMinutes, nowEpochMs]);

  // Ortak uygunluk özeti
  const mutualSummary = useMemo(() => {
    return calculateMutualAvailability(profiles, activeDayName, activeMinutes, nowEpochMs);
  }, [profiles, activeDayName, activeMinutes, nowEpochMs]);

  // "Ben" ve "Arkadaşlarım" ayrımı
  const myProfile = useMemo(
    () => profiles.find((p) => p.id === myProfileId) || profiles[0],
    [profiles, myProfileId]
  );

  const friendProfiles = useMemo(
    () => profiles.filter((p) => p.id !== myProfile.id),
    [profiles, myProfile]
  );

  // Profil güncelleme (Yerel + Backend)
  const handleUpdateProfile = async (updated: UygunMusunProfile) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        }
      );
    } catch {
      // Offline fallback: localStorage zaten güncellendi
    }
  };

  // Yeni profil ekleme
  const handleAddProfile = async (newProf: UygunMusunProfile) => {
    setProfiles((prev) => [...prev, newProf]);
    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProf),
        }
      );
    } catch {}
  };

  // Profil silme
  const handleRemoveProfile = async (profileId: string) => {
    if (profiles.length <= 2) return;
    setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    if (myProfileId === profileId) {
      const remaining = profiles.filter((p) => p.id !== profileId);
      if (remaining[0]) setMyProfileId(remaining[0].id);
    }
    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(
          roomCode
        )}/profile/${encodeURIComponent(profileId)}`,
        { method: 'DELETE' }
      );
    } catch {}
  };

  // Canlı durum notu / erken çıkış kaydetme
  const handleSaveStatus = async (
    profileId: string,
    customStatus: CustomStatusOverride | null
  ) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === profileId ? { ...p, custom_status: customStatus } : p
      )
    );
    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id: profileId,
            custom_status: customStatus,
          }),
        }
      );
    } catch {}
  };

  // Örnek programları yükleme
  const handleLoadDemoSchedules = async () => {
    const nextProfiles = profiles.map((p, idx) => {
      if (idx === 0) {
        return { ...p, name: p.name || 'Atilla', schedule: DEMO_SCHEDULES.atilla };
      }
      if (idx === 1) {
        return { ...p, name: p.name || 'Neva', schedule: DEMO_SCHEDULES.neva };
      }
      return p;
    });
    setProfiles(nextProfiles);
    for (const np of nextProfiles) {
      try {
        await fetch(
          `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(roomCode)}/profile`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(np),
          }
        );
      } catch {}
    }
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-600">
          <RefreshCw className="w-4 h-4 animate-spin text-[#0c3f79]" />
          <span>Uygun Musun yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/80 pb-24">
      {/* Üst Mobil Uygulama Başlığı (Sticky Top Bar) */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-2xl mx-auto px-3.5 py-2.5 space-y-2.5">
          {/* Üst Satır: Başlık, Canlı Saat ve Simülatör Butonu */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#0c3f79] to-[#002244] text-white flex items-center justify-center shadow-xs">
                <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    Uygun Musun?
                  </h1>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    CANLI
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>
                    {activeDayName} • {minutesToTimeStr(activeMinutes)}
                  </span>
                  {isSimulatingTime && (
                    <span className="text-amber-700 font-bold">(Test Modu)</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsSimulatingTime(!isSimulatingTime)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                  isSimulatingTime
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Farklı gün ve saatleri test etmek için saat simülatörünü aç"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Saat Testi</span>
              </button>

              <button
                type="button"
                onClick={() => fetchRoomFromServer(roomCode)}
                className="p-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Şimdi Eşitle"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-[#0c3f79]' : ''}`} />
              </button>
            </div>
          </div>

          {/* "Ben Kimim?" Perspektif Seçici Çubuğu */}
          <div className="flex items-center justify-between gap-2 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <span className="text-[11px] font-extrabold text-slate-500 pl-2 shrink-0">
              Giriş Yapan:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar">
              {profiles.map((p) => {
                const isMe = p.id === myProfile.id;
                const theme = PROFILE_THEMES[p.color] || PROFILE_THEMES.blue;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setMyProfileId(p.id);
                      setStatusTargetProfileId(p.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                      isMe
                        ? `${theme.bg} text-white shadow-2xs`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{p.avatar}</span>
                    <span>Ben: {p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Saat Simülatörü Çekmecesi (Açıldığında) */}
          {isSimulatingTime && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Zaman Simülatörü (İstediğin Gün &amp; Saati Test Et)
                </span>
                <button
                  type="button"
                  onClick={() => setIsSimulatingTime(false)}
                  className="text-[11px] font-extrabold text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
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
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
                      simulatedDay === d
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white text-slate-700 border border-amber-200'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-amber-950">
                  <span>Simüle Edilen Saat:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-amber-300">
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
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-amber-800">
                  <span>08:00</span>
                  <span>11:00</span>
                  <span>14:00</span>
                  <span>17:00</span>
                  <span>19:00</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ana İçerik Alanı */}
      <main className="max-w-2xl mx-auto px-3.5 pt-4 space-y-4">
        {/* SEKME 1: CANLI DURUM (HOME) */}
        {activeTab === 'live' && (
          <>
            {/* 1. ARKADAŞLARININ CANLI DURUM KARTLARI (Örn: Neva) */}
            <div className="space-y-3.5">
              {friendProfiles.map((friend) => (
                <LiveFriendHeroCard
                  key={friend.id}
                  profile={friend}
                  liveStatus={liveStatuses[friend.id]}
                  dayName={activeDayName}
                  currentMinutes={activeMinutes}
                  isMe={false}
                  onOpenScheduleUpload={() => setActiveTab('profiles')}
                />
              ))}
            </div>

            {/* 2. ORTAK UYGUNLUK & KAHVE VAKTİ BANNER */}
            <MutualMatchBanner
              summary={mutualSummary}
              profiles={profiles}
              dayName={activeDayName}
            />

            {/* 3. SENİN DURUMUN KARTI (Örn: Atilla) */}
            <div className="pt-1">
              <LiveFriendHeroCard
                profile={myProfile}
                liveStatus={liveStatuses[myProfile.id]}
                dayName={activeDayName}
                currentMinutes={activeMinutes}
                isMe={true}
                onOpenStatusSheet={() => {
                  setStatusTargetProfileId(myProfile.id);
                  setStatusModalOpen(true);
                }}
                onOpenScheduleUpload={() => setActiveTab('profiles')}
              />
            </div>

            {/* Kendi Programını Yükleme Kısayol Bilgi Barı */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div className="text-xs text-slate-600 font-medium">
                <strong className="text-slate-900">💡 İpucu:</strong> Kendi USIS PDF/PNG programını veya arkadaşının programını{' '}
                <span className="font-bold text-[#0c3f79]">Profiller</span> sekmesinden yükleyebilirsin.
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('profiles')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Programlar</span>
              </button>
            </div>
          </>
        )}

        {/* SEKME 2: KENDİ DURUMUNU & NOTUNU GİR ("Ders Erken Bitti" / "Kütüphanedeyim") */}
        {activeTab === 'status' && (
          <StatusCheckInSheet
            profiles={profiles}
            selectedProfileId={statusTargetProfileId || myProfile.id}
            onSelectProfileId={setStatusTargetProfileId}
            liveStatuses={liveStatuses}
            dayName={activeDayName}
            currentMinutes={activeMinutes}
            onSaveStatus={handleSaveStatus}
          />
        )}

        {/* SEKME 3: GÜNLÜK PARALEL ZAMAN ÇİZELGESİ */}
        {activeTab === 'timeline' && (
          <DailyParallelTimeline
            profiles={profiles}
            selectedDay={timelineDay}
            onSelectDay={setTimelineDay}
            todayDayName={activeDayName}
            currentMinutes={activeMinutes}
            nowEpochMs={nowEpochMs}
          />
        )}

        {/* SEKME 4: PROFİLLER VE PROGRAM YÜKLEME */}
        {activeTab === 'profiles' && (
          <ProfileScheduleManager
            profiles={profiles}
            myProfileId={myProfile.id}
            onSetMyProfileId={setMyProfileId}
            roomCode={roomCode}
            onChangeRoomCode={setRoomCode}
            onUpdateProfile={handleUpdateProfile}
            onAddProfile={handleAddProfile}
            onRemoveProfile={handleRemoveProfile}
            onLoadDemoSchedules={handleLoadDemoSchedules}
            apiBase={API_BASE}
          />
        )}
      </main>

      {/* Hızlı Durum Güncelleme Modalı */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in duration-150">
          <StatusCheckInSheet
            profiles={profiles}
            selectedProfileId={statusTargetProfileId || myProfile.id}
            onSelectProfileId={setStatusTargetProfileId}
            liveStatuses={liveStatuses}
            dayName={activeDayName}
            currentMinutes={activeMinutes}
            onSaveStatus={handleSaveStatus}
            onClose={() => setStatusModalOpen(false)}
            isModal={true}
          />
        </div>
      )}

      {/* Mobil Alt Navigasyon Çubuğu (Bottom Tab Bar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-2 py-1.5 grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-[#0c3f79] text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span className="text-[11px] font-extrabold">Canlı Durum</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusTargetProfileId(myProfile.id);
              setActiveTab('status');
            }}
            className={`py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'status'
                ? 'bg-[#0c3f79] text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span className="text-[11px] font-extrabold">Durum &amp; Not</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'timeline'
                ? 'bg-[#0c3f79] text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span className="text-[11px] font-extrabold">Günlük Çizelge</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className={`py-2 px-2 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'profiles'
                ? 'bg-[#0c3f79] text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/70'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[11px] font-extrabold">Profiller</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
