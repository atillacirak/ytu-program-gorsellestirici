"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Radio,
  Plus,
  Link2,
  Share2,
  QrCode,
  Users,
  Calendar,
  Clock,
  Sparkles,
  Upload,
  Check,
  Copy,
  Bell,
  BellRing,
  Zap,
  Coffee,
  MapPin,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Edit3,
  Send,
  SlidersHorizontal,
  RotateCcw,
  Megaphone,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  LogOut,
  Crown,
  X,
} from 'lucide-react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import {
  CustomStatusOverride,
  DuoPing,
  LobbySummaryItem,
  ProfileColorKey,
  ProfileLiveStatus,
  ProfileSchedulePayload,
  SavedLobbyItem,
  UygunMusunProfile,
  UygunMusunRoomState,
} from '../../types/uygunMusun';
import {
  WEEKDAYS_TR,
  PROFILE_THEMES,
  getTurkishDayNameFromDate,
  minutesToTimeStr,
  formatDurationTr,
  calculateProfileLiveStatus,
  calculateGroupMutualAvailability,
} from '../../utils/uygunMusunEngine';
import { extractMetadataFromPngArrayBuffer } from '../../utils/pngMetadata';
import { parseScheduleImageWithOcr } from '../../utils/pngOcrParser';
import {
  getNotificationPermission,
  isPushNotificationSupported,
  subscribeToPush,
  sendTestPush,
} from '../../utils/pushManager';
import StatusCheckInSheet from '../../components/uygun-musun/StatusCheckInSheet';
import DailyParallelTimeline from '../../components/uygun-musun/DailyParallelTimeline';
import LobbyShareModal from '../../components/uygun-musun/LobbyShareModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

type LobbyViewMode = 'hub' | 'create' | 'join' | 'room';
type RoomSubTab = 'dashboard' | 'timeline' | 'settings';

const AVATAR_OPTIONS = ['👨‍💻', '👩‍🎓', '🦊', '🐱', '🚀', '🌸', '⚡', '☕', '🎧', '🌟', '🦁', '🎨'];
const COLOR_KEYS: ProfileColorKey[] = ['blue', 'violet', 'emerald', 'amber', 'rose', 'cyan'];

const LOBBY_NAME_PRESETS = [
  'Kütüphane Ekibi 📚',
  'Yemek Tayfası 🍕',
  'Orta Bahçe Kahve ☕',
  'Bitirme Projesi 💻',
  'Bölüm Grubu 🎓',
];

const BROADCAST_PRESETS = [
  {
    id: 'coffee',
    emoji: '☕',
    label: 'Orta Bahçe / Kahve?',
    message: 'Orta bahçedeyim, kahveye gelen var mı? ☕',
  },
  {
    id: 'library',
    emoji: '📚',
    label: 'Kütüphanedeyiz',
    message: 'Kütüphanedeyiz, masa hazır! Gelen var mı? 📚',
  },
  {
    id: 'lunch',
    emoji: '🍕',
    label: 'Yemek Vakti?',
    message: 'Yemekhane / yemek vakti! Kimler aç? 🍕',
  },
  {
    id: 'free',
    emoji: '⚡',
    label: 'Boşa Çıktım!',
    message: 'Dersim bitti, şu an boştayım! Kimler kampüste? ⚡',
  },
];

export default function UygunMusunLobbyPage() {
  // Tarayıcıda kayıtlı lobiler
  const [savedLobbies, setSavedLobbies, isMounted] = useLocalStorageState<SavedLobbyItem[]>(
    'ytu_uygun_musun_saved_lobbies_v1',
    []
  );
  const [activeRoomCode, setActiveRoomCode] = useLocalStorageState<string>(
    'ytu_uygun_musun_active_lobby_v1',
    ''
  );
  const [deviceToken] = useLocalStorageState<string>(
    'ytu_uygun_musun_device_token_v1',
    `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );

  // Görünüm Modu: 'hub' (Karşılama/Lobilerim), 'create' (Yeni Lobi Kur), 'join' (Koda Katıl), 'room' (Lobi İçi)
  const [viewMode, setViewMode] = useState<LobbyViewMode>('hub');
  const [roomTab, setRoomTab] = useState<RoomSubTab>('dashboard');

  // Aktif Lobi Verisi (Sunucudan)
  const [roomState, setRoomState] = useState<UygunMusunRoomState | null>(null);
  const [lobbySummaries, setLobbySummaries] = useState<Record<string, LobbySummaryItem>>({});
  const [syncing, setSyncing] = useState(false);

  // Lobi Kurma / Katılma Sihirbazı State'leri
  const [wizardLobbyTitle, setWizardLobbyTitle] = useState('Kütüphane Ekibi 📚');
  const [wizardJoinCode, setWizardJoinCode] = useState('');
  const [wizardName, setWizardName] = useState('');
  const [wizardAvatar, setWizardAvatar] = useState('👨‍💻');
  const [wizardColor, setWizardColor] = useState<ProfileColorKey>('blue');
  const [wizardSchedule, setWizardSchedule] = useState<ProfileSchedulePayload | null>(null);
  const [wizardUploading, setWizardUploading] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);
  const [joinPreviewRoom, setJoinPreviewRoom] = useState<UygunMusunRoomState | null>(null);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);

  // Lobi İçi Etkileşim State'leri
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [customBroadcastMsg, setCustomBroadcastMsg] = useState('');
  const [sendingPing, setSendingPing] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [uploadingMySchedule, setUploadingMySchedule] = useState(false);

  // Web Push Bildirim State'leri
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<string>('default');
  const [pushLoading, setPushLoading] = useState(false);
  const [iosNeedsHomeScreen, setIosNeedsHomeScreen] = useState(false);

  // Canlı Saat & Simülatör State'i
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  const [isSimulatingTime, setIsSimulatingTime] = useState(false);
  const [simulatedDay, setSimulatedDay] = useState<string>('Çarşamba');
  const [simulatedMinutes, setSimulatedMinutes] = useState<number>(13 * 60 + 30);
  const [timelineDay, setTimelineDay] = useState<string>('Çarşamba');

  const fileInputWizardRef = useRef<HTMLInputElement | null>(null);
  const fileInputRoomRef = useRef<HTMLInputElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  // Saat güncellemesi
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

  // Dosyadan Ders Programı Ayrıştırıcı (PNG Metadata -> OCR -> Backend PDF/Image)
  const parseScheduleFile = async (file: File): Promise<ProfileSchedulePayload> => {
    let parsedData: any = null;

    if (file.name.toLowerCase().endsWith('.png')) {
      const buffer = await file.arrayBuffer();
      parsedData = extractMetadataFromPngArrayBuffer(buffer);
    }

    if (!parsedData && file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) {
      try {
        parsedData = await parseScheduleImageWithOcr(file);
      } catch {
        // Fallback to backend
      }
    }

    if (!parsedData) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/parse-schedule-file`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Dosya okunamadı.');
      }
      parsedData = await res.json();
    }

    if (!parsedData || !parsedData.schedule) {
      throw new Error('Dosyadan ders programı ayrıştırılamadı.');
    }

    return {
      term: parsedData.term || 'Aktif Dönem',
      title: parsedData.title || file.name,
      schedule: parsedData.schedule,
      courses_summary: parsedData.courses_summary || [],
    };
  };

  // URL ?join=KOD veya ?oda=KOD kontrolü ve İlk Yükleme
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const joinParam = (params.get('join') || params.get('oda') || '').trim().toLowerCase();

    if (joinParam && joinParam !== 'atilla-neva') {
      const existingSaved = savedLobbies.find((l) => l.room_code.toLowerCase() === joinParam);
      if (existingSaved) {
        setActiveRoomCode(existingSaved.room_code);
        setViewMode('room');
      } else {
        setWizardJoinCode(joinParam.toUpperCase());
        setViewMode('join');
      }
      return;
    }

    if (activeRoomCode) {
      const hasSaved = savedLobbies.some((l) => l.room_code === activeRoomCode);
      if (hasSaved) {
        setViewMode('room');
      } else {
        setActiveRoomCode('');
        setViewMode('hub');
      }
    } else {
      setViewMode('hub');
    }
  }, [isMounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Katılım ekranında girilen kodu canlı önizle
  useEffect(() => {
    const clean = wizardJoinCode.trim().toLowerCase();
    if (viewMode !== 'join' || clean.length < 3) {
      setJoinPreviewRoom(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setJoinPreviewLoading(true);
        const res = await fetch(
          `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(clean)}?strict=true`
        );
        if (!res.ok) {
          if (!cancelled) setJoinPreviewRoom(null);
          return;
        }
        const data: UygunMusunRoomState = await res.json();
        if (!cancelled) {
          setJoinPreviewRoom(data);
        }
      } catch {
        if (!cancelled) setJoinPreviewRoom(null);
      } finally {
        if (!cancelled) setJoinPreviewLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [wizardJoinCode, viewMode]);

  // "Lobilerim" özetlerini sunucudan çek
  const fetchMyLobbiesSummary = useCallback(async () => {
    if (!savedLobbies.length) return;
    try {
      const codes = savedLobbies.map((l) => l.room_code);
      const res = await fetch(`${API_BASE}/api/uygun-musun/my-rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_codes: codes }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.rooms)) {
        const map: Record<string, LobbySummaryItem> = {};
        for (const r of data.rooms) {
          map[r.room_code] = r;
        }
        setLobbySummaries(map);
      }
    } catch {
      // Offline fallback
    }
  }, [savedLobbies]);

  useEffect(() => {
    if (!isMounted) return;
    if (viewMode === 'hub') {
      fetchMyLobbiesSummary();
    }
  }, [isMounted, viewMode, fetchMyLobbiesSummary]);

  // Aktif Lobi Verisini Çekme (Polling)
  const fetchActiveRoom = useCallback(async (code: string) => {
    if (!code) return;
    try {
      setSyncing(true);
      const res = await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(code)}?strict=true`
      );
      if (res.status === 404) {
        setSavedLobbies((prev) => prev.filter((x) => x.room_code !== code));
        setActiveRoomCode('');
        setRoomState(null);
        setViewMode('hub');
        showToast('Bu lobi grup lideri tarafından kapatıldı.');
        return;
      }
      if (!res.ok) return;
      const data: UygunMusunRoomState = await res.json();
      if (data && Array.isArray(data.profiles)) {
        const savedEntry = savedLobbies.find((l) => l.room_code === code);
        if (
          savedEntry?.my_profile_id &&
          data.profiles.length > 0 &&
          !data.profiles.some((p) => p.id === savedEntry.my_profile_id)
        ) {
          setSavedLobbies((prev) => prev.filter((x) => x.room_code !== code));
          setActiveRoomCode('');
          setRoomState(null);
          setViewMode('hub');
          showToast('Gruptan çıkarıldın veya kaydın silindi.');
          return;
        }

        setRoomState(data);
        if (data.title) {
          setSavedLobbies((prev) =>
            prev.map((item) =>
              item.room_code === code && item.title !== data.title
                ? { ...item, title: data.title! }
                : item
            )
          );
        }
      }
    } catch {
      // Offline
    } finally {
      setSyncing(false);
    }
  }, [savedLobbies, setSavedLobbies]);

  useEffect(() => {
    if (!isMounted || viewMode !== 'room' || !activeRoomCode) return;
    fetchActiveRoom(activeRoomCode);
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchActiveRoom(activeRoomCode);
    }, 12000);
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        fetchActiveRoom(activeRoomCode);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isMounted, viewMode, activeRoomCode, fetchActiveRoom]);

  // Web Push durumunu kontrol et
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as any).standalone);
    setIosNeedsHomeScreen(isIos && !isStandalone);

    const supported = isPushNotificationSupported();
    setPushSupported(supported);
    const perm = getNotificationPermission();
    setPushPermission(perm);
    if (supported && perm === 'granted') {
      navigator.serviceWorker?.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushSubscribed(Boolean(sub)))
        .catch(() => {});
    }
  }, [activeRoomCode, viewMode]);

  // Aktif Lobideki Kendi Profilim
  const activeSavedEntry = useMemo(
    () => savedLobbies.find((l) => l.room_code === activeRoomCode) || null,
    [savedLobbies, activeRoomCode]
  );

  const profiles = useMemo(() => roomState?.profiles || [], [roomState]);

  const myProfile = useMemo(() => {
    if (!profiles.length) return null;
    if (activeSavedEntry?.my_profile_id) {
      const found = profiles.find((p) => p.id === activeSavedEntry.my_profile_id);
      if (found) return found;
    }
    return profiles[0];
  }, [profiles, activeSavedEntry]);

  // Grup Lideri (Kurucu) Tespiti
  const ownerProfileId = useMemo(() => {
    if (roomState?.owner_profile_id) return roomState.owner_profile_id;
    const explicitOwner = profiles.find((p) => p.role === 'owner');
    if (explicitOwner) return explicitOwner.id;
    return profiles[0]?.id || null;
  }, [roomState, profiles]);

  const isRoomLeader = useMemo(() => {
    if (!myProfile) return Boolean(activeSavedEntry?.admin_token);
    return (
      myProfile.id === ownerProfileId ||
      myProfile.role === 'owner' ||
      Boolean(activeSavedEntry?.admin_token)
    );
  }, [myProfile, ownerProfileId, activeSavedEntry]);

  // Efektif Gün & Dakika
  const realDayName = getTurkishDayNameFromDate(nowDate);
  const realMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const activeDayName = isSimulatingTime ? simulatedDay : realDayName;
  const activeMinutes = isSimulatingTime ? simulatedMinutes : realMinutes;
  const nowEpochMs = nowDate.getTime();

  // Tüm üyelerin canlı durumları
  const liveStatuses = useMemo(() => {
    const map: Record<string, ProfileLiveStatus> = {};
    for (const p of profiles) {
      map[p.id] = calculateProfileLiveStatus(p, activeDayName, activeMinutes, nowEpochMs);
    }
    return map;
  }, [profiles, activeDayName, activeMinutes, nowEpochMs]);

  // N-Kişilik Grup Nabzı ve Ortak Boşluk Özeti
  const groupSummary = useMemo(() => {
    return calculateGroupMutualAvailability(profiles, activeDayName, activeMinutes, nowEpochMs);
  }, [profiles, activeDayName, activeMinutes, nowEpochMs]);

  // Gelen Aktif Çağrılar / Dürtüler (Son 2 saat, kapatılmamış)
  const activePings = useMemo(() => {
    const raw = roomState?.pings || [];
    const twoHoursAgo = nowEpochMs - 2 * 3600 * 1000;
    const myId = myProfile?.id;
    return raw
      .filter((p) => {
        if (p.dismissed || p.created_at <= twoHoursAgo) return false;
        if (myId && Array.isArray(p.dismissed_by) && p.dismissed_by.includes(myId)) {
          return false;
        }
        return p.to_id === 'all' || (myId && p.to_id === myId);
      })
      .sort((a, b) => b.created_at - a.created_at);
  }, [roomState, nowEpochMs, myProfile]);

  // Sihirbaz: Ana Sayfadan Program Aktar
  const handleWizardImportMainPage = () => {
    try {
      const raw = window.localStorage.getItem('ytu_visualizer_data');
      if (!raw) {
        setWizardError('Ana sayfada kayıtlı bir ders programı bulunamadı. Lütfen PDF veya PNG seçin.');
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.schedule) {
        setWizardError('Ana sayfadaki program verisi geçersiz.');
        return;
      }
      setWizardSchedule({
        term: parsed.term || 'Aktif Dönem',
        title: parsed.title || 'Ana Sayfa Programım',
        schedule: parsed.schedule,
        courses_summary: parsed.courses_summary || [],
      });
      setWizardError(null);
      showToast('Ana sayfadaki ders programın başarıyla aktarıldı! 🎉');
    } catch {
      setWizardError('Program aktarılırken bir hata oluştu.');
    }
  };

  // Sihirbaz: Yeni Lobi Oluştur
  const handleCreateLobbySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardName.trim()) {
      setWizardError('Lütfen lobide görünecek adını yaz.');
      return;
    }
    if (!wizardLobbyTitle.trim()) {
      setWizardError('Lütfen bir lobi adı belirle.');
      return;
    }

    setWizardSubmitting(true);
    setWizardError(null);
    try {
      const res = await fetch(`${API_BASE}/api/uygun-musun/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: wizardLobbyTitle.trim(),
          device_token: deviceToken,
          profile: {
            name: wizardName.trim(),
            avatar: wizardAvatar,
            color: wizardColor,
            schedule: wizardSchedule,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Lobi oluşturulamadı.');
      }
      const data = await res.json();
      const newEntry: SavedLobbyItem = {
        room_code: data.room_code,
        title: data.title,
        my_profile_id: data.my_profile_id,
        admin_token: data.admin_token,
        joined_at: Date.now(),
      };
      setSavedLobbies((prev) => [
        newEntry,
        ...prev.filter((x) => x.room_code !== data.room_code),
      ]);
      setActiveRoomCode(data.room_code);
      setRoomState(data.room);
      setViewMode('room');
      setRoomTab('dashboard');
      setShareModalOpen(true); // Kurulum biter bitmez paylaşım ekranını aç
      showToast(`"${data.title}" lobisi kuruldu! Şimdi arkadaşlarını davet et 🎉`);
    } catch (err: any) {
      setWizardError(err.message || 'Lobi oluşturulurken hata oluştu.');
    } finally {
      setWizardSubmitting(false);
    }
  };

  // Sihirbaz: Mevcut Lobiye Katıl
  const handleJoinLobbySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = wizardJoinCode.trim().toLowerCase();
    if (!cleanCode) {
      setWizardError('Lütfen 6 haneli lobi kodunu gir.');
      return;
    }
    if (!wizardName.trim()) {
      setWizardError('Lütfen lobide görünecek adını yaz.');
      return;
    }

    setWizardSubmitting(true);
    setWizardError(null);
    try {
      const res = await fetch(`${API_BASE}/api/uygun-musun/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: cleanCode,
          device_token: deviceToken,
          profile: {
            name: wizardName.trim(),
            avatar: wizardAvatar,
            color: wizardColor,
            schedule: wizardSchedule,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Bu koda ait bir lobi bulunamadı.');
      }
      const data = await res.json();
      const newEntry: SavedLobbyItem = {
        room_code: data.room_code,
        title: data.title,
        my_profile_id: data.my_profile_id,
        joined_at: Date.now(),
      };
      setSavedLobbies((prev) => [
        newEntry,
        ...prev.filter((x) => x.room_code !== data.room_code),
      ]);
      setActiveRoomCode(data.room_code);
      setRoomState(data.room);
      setViewMode('room');
      setRoomTab('dashboard');
      // URL'deki ?join parametresini temizle
      if (typeof window !== 'undefined' && window.location.search) {
        window.history.replaceState({}, '', '/uygun-musun');
      }
      showToast(`"${data.title}" lobisine katıldın! 🎉`);
    } catch (err: any) {
      setWizardError(err.message || 'Lobiye katılınamadı.');
    } finally {
      setWizardSubmitting(false);
    }
  };

  // Mevcut lobideki bir profili "Bu Benim" olarak seçip katılma (cihaz değiştirirken)
  const handleClaimExistingProfile = (profile: UygunMusunProfile) => {
    if (!joinPreviewRoom) return;
    const code = joinPreviewRoom.room_code;
    const title = joinPreviewRoom.title || `Lobi #${code.toUpperCase()}`;
    const newEntry: SavedLobbyItem = {
      room_code: code,
      title,
      my_profile_id: profile.id,
      joined_at: Date.now(),
    };
    setSavedLobbies((prev) => [newEntry, ...prev.filter((x) => x.room_code !== code)]);
    setActiveRoomCode(code);
    setRoomState(joinPreviewRoom);
    setViewMode('room');
    setRoomTab('dashboard');
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', '/uygun-musun');
    }
    showToast(`Hoş geldin ${profile.name}! Lobiye bağlandın.`);
  };

  // Tek Dokunuşla Yerel Paylaşım (Header'daki hızlı paylaş butonu için)
  const handleQuickNativeShare = async (code: string, title: string) => {
    const upper = code.toUpperCase();
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/uygun-musun?join=${encodeURIComponent(upper)}`
        : `https://ytudostun.com/uygun-musun?join=${encodeURIComponent(upper)}`;
    const text = `👋 YTÜ Dostun'da '${title}' lobisi kurdum! Programını ekle, ne zaman boş olduğumuzu canlı görelim: ${url}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${title} • YTÜ Dostun`,
          text: `👋 YTÜ Dostun'da '${title}' lobisi kurdum! Programını ekle, ne zaman boş olduğumuzu canlı görelim:`,
          url,
        });
        return;
      } catch (err: any) {
        if (err && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Bağlantı kopyalandı! Arkadaşlarına gönderebilirsin 📋');
    } catch {
      setShareModalOpen(true);
    }
  };

  // Kendi Durumumu Güncelle (Erken Çıkış / Özel Durum)
  const handleSaveMyStatus = async (status: CustomStatusOverride | null) => {
    if (!myProfile || !activeRoomCode) return;
    setRoomState((prev) =>
      prev
        ? {
            ...prev,
            profiles: prev.profiles.map((p) =>
              p.id === myProfile.id ? { ...p, custom_status: status } : p
            ),
          }
        : prev
    );
    try {
      const res = await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(activeRoomCode)}/status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile_id: myProfile.id,
            custom_status: status,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setRoomState(updated);
      }
      showToast(status ? 'Durumun tüm gruba bildirildi! ✨' : 'Durum notun temizlendi.');
    } catch {
      showToast('Durum yerel olarak güncellendi.');
    }
  };

  // Tek Tıkla "Dersim Erken Bitti!" Aksiyonu
  const handleOneTapEarlyExit = async () => {
    if (!myProfile) return;
    const myStatus = liveStatuses[myProfile.id];
    const currentCls = myStatus?.currentClass;
    const statusObj: CustomStatusOverride = {
      type: 'early_exit',
      preset_id: 'early_exit',
      emoji: '⚡',
      label: 'Ders Erken Bitti',
      note: currentCls
        ? `${currentCls.name} dersi erken bitti, şu an boşum!`
        : 'Dersim erken bitti, şu an müsaitim!',
      early_exit: true,
      early_exit_until: currentCls ? currentCls.end_time : undefined,
      early_exit_day: activeDayName,
      created_at: Date.now(),
      expires_at: Date.now() + 3 * 3600 * 1000,
    };
    await handleSaveMyStatus(statusObj);
  };

  // Gruba Genel Seslen (Broadcast Ping) veya Bireysel Dürtme
  const handleSendPing = async (
    toId: string,
    type: string,
    emoji: string,
    message: string
  ) => {
    if (!myProfile || !activeRoomCode || sendingPing) return;
    setSendingPing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(activeRoomCode)}/ping`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from_id: myProfile.id,
            to_id: toId,
            type,
            emoji,
            message,
          }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setRoomState(updated);
      }
      if (toId === 'all') {
        showToast(`${emoji} Gruba çağrı gönderildi!`);
        setCustomBroadcastMsg('');
      } else {
        const targetName = profiles.find((p) => p.id === toId)?.name || 'Arkadaşına';
        showToast(`${emoji} ${targetName} dürtüldü!`);
      }
    } catch {
      showToast('Çağrı gönderilemedi.');
    } finally {
      setSendingPing(false);
    }
  };

  // Çağrı Bildirimini Kapat
  const handleDismissPing = async (pingId: string) => {
    if (!activeRoomCode) return;
    const myId = myProfile?.id;
    setRoomState((prev) =>
      prev
        ? {
            ...prev,
            pings: (prev.pings || []).map((p) => {
              if (p.id !== pingId) return p;
              if (myId && p.to_id === 'all' && p.from_id !== myId) {
                const db = Array.isArray(p.dismissed_by) ? [...p.dismissed_by, myId] : [myId];
                return { ...p, dismissed_by: db };
              }
              return { ...p, dismissed: true };
            }),
          }
        : prev
    );
    try {
      await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(
          activeRoomCode
        )}/ping/${encodeURIComponent(pingId)}/dismiss`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_id: myId || '' }),
        }
      );
    } catch {
      // ignore
    }
  };

  // Kendi Profilimi / Programımı Güncelle
  const handleUpdateMemberProfile = async (updatedProfile: UygunMusunProfile) => {
    if (!activeRoomCode) return;
    setRoomState((prev) =>
      prev
        ? {
            ...prev,
            profiles: prev.profiles.map((p) =>
              p.id === updatedProfile.id ? updatedProfile : p
            ),
          }
        : prev
    );
    try {
      const res = await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(activeRoomCode)}/profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProfile),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRoomState(data);
      }
    } catch {
      // ignore
    }
  };

  // Lobi Adını Güncelle
  const handleSaveRoomTitle = async () => {
    if (!activeRoomCode || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    const clean = titleDraft.trim();
    setEditingTitle(false);
    setRoomState((prev) => (prev ? { ...prev, title: clean } : prev));
    setSavedLobbies((prev) =>
      prev.map((l) => (l.room_code === activeRoomCode ? { ...l, title: clean } : l))
    );
    try {
      await fetch(`${API_BASE}/api/uygun-musun/room/${encodeURIComponent(activeRoomCode)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: clean }),
      });
      showToast('Lobi adı güncellendi!');
    } catch {
      // ignore
    }
  };

  // Web Push Bildirimlerini Aç
  const handleEnablePush = async () => {
    if (!activeRoomCode || !myProfile) return;
    setPushLoading(true);
    try {
      const res = await subscribeToPush(activeRoomCode, myProfile.id, API_BASE);
      setPushPermission(getNotificationPermission());
      if (res.success) {
        setPushSubscribed(true);
        showToast('🔔 Kilit ekranı bildirimleri açıldı!');
      } else if (res.error) {
        showToast(res.error);
      }
    } finally {
      setPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    if (!activeRoomCode || !myProfile) return;
    const res = await sendTestPush(activeRoomCode, myProfile.id, API_BASE);
    if (res.success) {
      showToast('🔔 Test bildirimi gönderildi! Telefonunu kontrol et.');
    } else {
      showToast(res.message || 'Test bildirimi gönderilemedi.');
    }
  };

  // Gruptan Çık (Kendi Profilimi Lobiden Sil ve Ayrıl)
  const handleLeaveRoom = async (targetCode?: string, targetProfileId?: string, targetTitle?: string) => {
    const code = targetCode || activeRoomCode;
    const pid = targetProfileId || myProfile?.id;
    const rTitle = targetTitle || currentRoomTitle;
    if (!code) return;

    const isCurrentActive = code === activeRoomCode;
    const isSoleMember = isCurrentActive && profiles.length <= 1;
    const nextLeader = isCurrentActive
      ? profiles.find((p) => p.id !== pid)?.name
      : undefined;

    const confirmMsg = isSoleMember
      ? `"${rTitle}" lobisindeki tek üye sensin. Çıkarsan lobi tamamen kapatılacak. Onaylıyor musun?`
      : isCurrentActive && isRoomLeader && nextLeader
      ? `"${rTitle}" grubundan çıkmak istiyor musun? Grup liderliği otomatik olarak "${nextLeader}" adlı üyeye devredilecek.`
      : `"${rTitle}" grubundan çıkmak istediğine emin misin?`;

    if (!window.confirm(confirmMsg)) return;

    if (pid) {
      try {
        await fetch(
          `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(
            code
          )}/profile/${encodeURIComponent(pid)}`,
          { method: 'DELETE' }
        );
      } catch {
        // Offline olsa da yerel listeden kaldır
      }
    }

    setSavedLobbies((prev) => prev.filter((x) => x.room_code !== code));
    if (activeRoomCode === code) {
      setActiveRoomCode('');
      setRoomState(null);
      setViewMode('hub');
    }
    showToast(`"${rTitle}" grubundan ayrıldın.`);
  };

  // Lider Olarak Grubu Tamamen Kapat (Tüm Lobiyi Sil)
  const handleCloseRoom = async (targetCode?: string, targetTitle?: string) => {
    const code = targetCode || activeRoomCode;
    const rTitle = targetTitle || currentRoomTitle;
    if (!code) return;

    const savedItem = savedLobbies.find((x) => x.room_code === code);
    const pid = (code === activeRoomCode ? myProfile?.id : savedItem?.my_profile_id) || '';
    const token = savedItem?.admin_token || '';

    if (
      !window.confirm(
        `👑 Grup Lideri olarak "${rTitle}" lobisini tamamen kapatmak istiyor musun?\n\nBu işlem geri alınamaz ve tüm üyeler için grup silinir.`
      )
    ) {
      return;
    }

    try {
      const qs = new URLSearchParams();
      if (pid) qs.set('profile_id', pid);
      if (token) qs.set('admin_token', token);
      const res = await fetch(
        `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(code)}?${qs.toString()}`,
        { method: 'DELETE' }
      );
      if (!res.ok && res.status === 403) {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || 'Sadece grup lideri lobiyi kapatabilir.');
        return;
      }
    } catch {
      // ignore
    }

    setSavedLobbies((prev) => prev.filter((x) => x.room_code !== code));
    if (activeRoomCode === code) {
      setActiveRoomCode('');
      setRoomState(null);
      setViewMode('hub');
    }
    showToast(`🗑️ "${rTitle}" grubu tamamen kapatıldı.`);
  };

  const currentRoomTitle =
    roomState?.title || activeSavedEntry?.title || `Lobi #${activeRoomCode.toUpperCase()}`;
  const myLiveStatus = myProfile ? liveStatuses[myProfile.id] : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col pb-24 md:pb-12">
      {/* Üst Bildirim Toast */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] rounded-2xl bg-slate-900/95 text-white px-4 py-3 shadow-xl border border-slate-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs font-extrabold">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ANA İÇERİK */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 pt-5 space-y-5">
        {/* =====================================================================
            EKRAN 1: LOBİ KARŞILAMA MERKEZİ (HUB)
           ===================================================================== */}
        {viewMode === 'hub' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Hero Kartı */}
            <div className="rounded-3xl bg-linear-to-br from-[#0c3f79] via-[#0a3362] to-[#002855] text-white p-6 sm:p-8 shadow-lg border border-blue-900/40 relative overflow-hidden">
              <div className="max-w-2xl space-y-3 relative z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-extrabold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Kampüs Sosyal Müsaitlik Platformu</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                  Arkadaşlarınla Ne Zaman Buluşabileceğini Tek Tıkla Gör!
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 font-medium leading-relaxed">
                  Kütüphane ekibini, yemek tayfanı veya proje grubunu kur; davet linkini paylaş.
                  Herkesin şu an hangi derste olduğunu, ne zaman boşa çıkacağını ve tüm grubun
                  ortak boş saatlerini canlı takip et.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWizardError(null);
                      setViewMode('create');
                    }}
                    className="px-5 py-3.5 rounded-2xl bg-[#e7a240] hover:bg-amber-400 text-slate-950 text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Yeni Grup Lobisi Kur</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWizardError(null);
                      setViewMode('join');
                    }}
                    className="px-5 py-3.5 rounded-2xl bg-white/12 hover:bg-white/20 border border-white/20 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-amber-300" />
                    <span>Koda Sahip misin? Katıl</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Kayıtlı Lobilerim Listesi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0c3f79]" />
                  <h3 className="text-base font-black text-slate-900">
                    Kayıtlı Lobilerim ({savedLobbies.length})
                  </h3>
                </div>
                {savedLobbies.length > 0 && (
                  <button
                    type="button"
                    onClick={fetchMyLobbiesSummary}
                    className="text-xs font-extrabold text-[#0c3f79] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Yenile</span>
                  </button>
                )}
              </div>

              {savedLobbies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0c3f79] flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900">
                      Henüz Bir Lobiye Katılmadın
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      30 saniyede kendi arkadaş lobini kurup linkini paylaşabilir veya arkadaşının
                      gönderdiği 6 haneli kodla mevcut bir lobiye katılabilirsin.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {savedLobbies.map((item) => {
                    const summary = lobbySummaries[item.room_code];
                    const title = summary?.title || item.title;
                    const memberCount = summary?.member_count ?? 1;
                    const members = summary?.members || [];

                    return (
                      <div
                        key={item.room_code}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-[#0c3f79]/50 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-[#0c3f79] border border-slate-200">
                                #{item.room_code.toUpperCase()}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                {memberCount} Üye
                              </span>
                              {item.admin_token && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                                  <Crown className="w-3 h-3 text-amber-600" />
                                  <span>Lider</span>
                                </span>
                              )}
                            </div>
                            <h4 className="mt-1.5 text-base font-black text-slate-900 truncate">
                              {title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {item.admin_token ? (
                              <button
                                type="button"
                                title="Grubu Tamamen Kapat"
                                onClick={() => handleCloseRoom(item.room_code, title)}
                                className="px-2 py-1 rounded-lg text-[11px] font-extrabold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Grubu Kapat</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Gruptan Çık"
                                onClick={() =>
                                  handleLeaveRoom(item.room_code, item.my_profile_id, title)
                                }
                                className="px-2 py-1 rounded-lg text-[11px] font-extrabold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Çık</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Üye Avatarları */}
                        {members.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {members.map((m) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold"
                              >
                                <span>{m.avatar}</span>
                                <span className="truncate max-w-[80px]">{m.name}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (activeRoomCode !== item.room_code) {
                                setRoomState(null);
                              }
                              setActiveRoomCode(item.room_code);
                              setViewMode('room');
                            }}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-black flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Lobiye Gir</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleQuickNativeShare(item.room_code, title)}
                            className="py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5 text-amber-700" />
                            <span>Paylaş</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            EKRAN 2: YENİ LOBİ KURMA VEYA KODA KATILMA SİHİRBAZI
           ===================================================================== */}
        {(viewMode === 'create' || viewMode === 'join') && (
          <div className="max-w-xl mx-auto space-y-4 animate-in fade-in duration-200">
            <button
              type="button"
              onClick={() => setViewMode(activeRoomCode ? 'room' : 'hub')}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Geri Dön</span>
            </button>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-linear-to-r from-[#0c3f79] to-[#002855] px-6 py-5 text-white">
                <div className="flex items-center gap-2 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
                  {viewMode === 'create' ? (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>30 Saniyede Yeni Lobi Kur</span>
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      <span>Arkadaş Lobisine Katıl</span>
                    </>
                  )}
                </div>
                <h2 className="mt-1 text-xl font-black">
                  {viewMode === 'create'
                    ? 'Grubunu Oluştur & Linki Paylaş'
                    : joinPreviewRoom
                    ? `🎉 "${joinPreviewRoom.title}" Lobisine Katıl`
                    : '6 Haneli Lobi Kodunu Gir'}
                </h2>
              </div>

              <form
                onSubmit={
                  viewMode === 'create' ? handleCreateLobbySubmit : handleJoinLobbySubmit
                }
                className="p-6 space-y-5"
              >
                {wizardError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 flex items-center gap-2 text-xs font-bold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{wizardError}</span>
                  </div>
                )}

                {/* Mod: Yeni Lobi Adı */}
                {viewMode === 'create' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      1. Lobi / Grup Adı
                    </label>
                    <input
                      type="text"
                      value={wizardLobbyTitle}
                      onChange={(e) => setWizardLobbyTitle(e.target.value)}
                      placeholder="Örn: Kütüphane Ekibi 📚"
                      maxLength={45}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-[#0c3f79] outline-none"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      {LOBBY_NAME_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setWizardLobbyTitle(preset)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                            wizardLobbyTitle === preset
                              ? 'bg-[#0c3f79] text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mod: Koda Katıl & Canlı Önizleme */}
                {viewMode === 'join' && (
                  <div className="space-y-3">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      1. Lobi Kodu
                    </label>
                    <input
                      type="text"
                      value={wizardJoinCode}
                      onChange={(e) => setWizardJoinCode(e.target.value.toUpperCase())}
                      placeholder="Örn: KTU92X"
                      maxLength={16}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-base font-black tracking-widest uppercase text-[#0c3f79] focus:border-[#0c3f79] outline-none"
                    />

                    {joinPreviewLoading && (
                      <p className="text-xs text-slate-500 font-medium">Lobi aranıyor...</p>
                    )}

                    {joinPreviewRoom && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-950">
                            ✅ {joinPreviewRoom.title} ({joinPreviewRoom.profiles.length} Üye)
                          </span>
                        </div>
                        {joinPreviewRoom.profiles.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-emerald-800 font-semibold">
                              Zaten listede ismin var mı? Тek dokunuşla profilini seçebilir veya aşağıdan yeni profil oluşturabilirsin:
                            </p>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {joinPreviewRoom.profiles.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleClaimExistingProfile(p)}
                                  className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-xs font-extrabold text-slate-900 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                >
                                  <span>{p.avatar}</span>
                                  <span>{p.name} (Bu Benim)</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Kendi Profil Bilgilerin */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    2. Senin Profilin
                  </label>
                  <input
                    type="text"
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    placeholder="Adın veya Takma Adın (Örn: Ahmet)"
                    maxLength={25}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-extrabold text-slate-900 focus:border-[#0c3f79] outline-none"
                  />

                  {/* Avatar Seçimi */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Avatar Seç:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {AVATAR_OPTIONS.map((av) => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setWizardAvatar(av)}
                          className={`w-9 h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer ${
                            wizardAvatar === av
                              ? 'bg-[#0c3f79] text-white ring-2 ring-[#0c3f79]/30 scale-105'
                              : 'bg-slate-100 hover:bg-slate-200'
                          }`}
                        >
                          {av}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Renk Seçimi */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500">Kart Rengi:</span>
                    <div className="flex items-center gap-2">
                      {COLOR_KEYS.map((ck) => {
                        const t = PROFILE_THEMES[ck];
                        return (
                          <button
                            key={ck}
                            type="button"
                            onClick={() => setWizardColor(ck)}
                            className={`w-7 h-7 rounded-full ${t.bg} transition-transform cursor-pointer ${
                              wizardColor === ck
                                ? 'scale-110 ring-2 ring-offset-2 ring-slate-900'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            title={t.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Ders Programı Ekleme */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600">
                      3. Ders Programın (İsteğe Bağlı)
                    </label>
                    {wizardSchedule && (
                      <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Program Hazır</span>
                      </span>
                    )}
                  </div>

                  <input
                    ref={fileInputWizardRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setWizardUploading(true);
                      setWizardError(null);
                      try {
                        const sched = await parseScheduleFile(f);
                        setWizardSchedule(sched);
                        showToast('Ders programın başarıyla okundu! ✅');
                      } catch (err: any) {
                        setWizardError(err.message || 'Dosya okunamadı.');
                      } finally {
                        setWizardUploading(false);
                      }
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      disabled={wizardUploading}
                      onClick={() => fileInputWizardRef.current?.click()}
                      className="py-2.5 px-3.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-[#0c3f79]" />
                      <span>
                        {wizardUploading
                          ? 'Program Okunuyor...'
                          : wizardSchedule
                          ? 'Başka PDF / PNG Seç'
                          : 'USIS PDF / PNG Yükle'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleWizardImportMainPage}
                      className="py-2.5 px-3.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Ana Sayfadan Aktar</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Şu an yanında PDF yoksa boş geçebilir, lobiye girdikten sonra da yükleyebilirsin.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={wizardSubmitting || wizardUploading}
                  className="w-full py-3.5 px-5 rounded-2xl bg-[#0c3f79] hover:bg-[#002855] text-white text-sm font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {wizardSubmitting ? (
                    <span>İşleniyor...</span>
                  ) : viewMode === 'create' ? (
                    <>
                      <Plus className="w-4 h-4 text-amber-400" />
                      <span>Lobiyi Kur ve Başla</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-amber-400" />
                      <span>Lobiye Katıl</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* =====================================================================
            EKRAN 3: ÇOK KİŞİLİ CANLI LOBİ PANELİ (DASHBOARD)
           ===================================================================== */}
        {viewMode === 'room' && activeRoomCode && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Lobi Üst Bilgi & Paylaşım Barı */}
            <div className="rounded-3xl bg-white border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setViewMode('hub')}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Lobilerim</span>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingTitle ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={titleDraft}
                          onChange={(e) => setTitleDraft(e.target.value)}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-sm font-black text-slate-900 outline-none focus:border-[#0c3f79]"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={handleSaveRoomTitle}
                          className="px-2.5 py-1 rounded-lg bg-[#0c3f79] text-white text-xs font-bold cursor-pointer"
                        >
                          Kaydet
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 truncate">
                          {currentRoomTitle}
                        </h2>
                        <button
                          type="button"
                          title="Lobi Adını Düzenle"
                          onClick={() => {
                            setTitleDraft(currentRoomTitle);
                            setEditingTitle(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(activeRoomCode.toUpperCase())
                          .catch(() => {});
                        showToast(`Lobi kodu (#${activeRoomCode.toUpperCase()}) kopyalandı!`);
                      }}
                      className="font-mono text-[11px] font-black uppercase px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0c3f79] border border-slate-200 flex items-center gap-1 cursor-pointer"
                      title="Kodu Kopyala"
                    >
                      <span>#{activeRoomCode.toUpperCase()}</span>
                      <Copy className="w-3 h-3 text-slate-400" />
                    </button>

                    {isRoomLeader && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg">
                        <Crown className="w-3 h-3 text-amber-600" />
                        <span>Grup Lideri</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 font-semibold">
                    {profiles.length} Üye • {activeDayName} {minutesToTimeStr(activeMinutes)}
                    {syncing ? ' • Eşitleniyor...' : ''}
                  </p>
                </div>
              </div>

              {/* Sağ Paylaşım, Davet & Ayrılma Aksiyonları */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickNativeShare(activeRoomCode, currentRoomTitle)}
                  className="px-3.5 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Linki Paylaş</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">QR &amp; Davet</span>
                </button>

                {/* Gruptan Çık / Liderse Grubu Kapat Butonları */}
                {isRoomLeader ? (
                  <>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleLeaveRoom()}
                        title="Gruptan çık ve liderliği sıradaki üyeye devret"
                        className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Gruptan Çık</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCloseRoom()}
                      title="Grup lideri olarak bu lobiyi herkes için tamamen kapat"
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Grubu Kapat</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLeaveRoom()}
                    title="Bu lobiden ayrıl"
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Gruptan Çık</span>
                  </button>
                )}
              </div>
            </div>

            {/* Masaüstü / Üst Sekme Seçici */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setRoomTab('dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    roomTab === 'dashboard'
                      ? 'bg-[#0c3f79] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Canlı Lobi ({profiles.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRoomTab('timeline')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    roomTab === 'timeline'
                      ? 'bg-[#0c3f79] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Paralel Çizelge</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRoomTab('settings')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    roomTab === 'settings'
                      ? 'bg-[#0c3f79] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Program &amp; Üyeler</span>
                </button>
              </div>

              {/* Zaman Simülatörü Aç/Kapat */}
              <button
                type="button"
                onClick={() => setIsSimulatingTime((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isSimulatingTime
                    ? 'bg-amber-100 border-amber-300 text-amber-950'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#0c3f79]" />
                <span>{isSimulatingTime ? 'Simülatör Açık' : 'Farklı Gün/Saat Test Et'}</span>
              </button>
            </div>

            {/* Zaman Simülatörü Çubuğu */}
            {isSimulatingTime && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>
                      Zaman Simülatörü: {simulatedDay} • {minutesToTimeStr(simulatedMinutes)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSimulatingTime(false)}
                    className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-[11px] font-extrabold text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Canlı Saate Dön</span>
                  </button>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {WEEKDAYS_TR.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setSimulatedDay(d);
                        setTimelineDay(d);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold cursor-pointer ${
                        simulatedDay === d
                          ? 'bg-[#0c3f79] text-white'
                          : 'bg-white text-slate-700 border border-amber-200'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={8 * 60}
                  max={20 * 60}
                  step={5}
                  value={simulatedMinutes}
                  onChange={(e) => setSimulatedMinutes(Number(e.target.value))}
                  className="w-full accent-[#0c3f79] cursor-pointer"
                />
              </div>
            )}

            {/* Gelen Canlı Çağrılar / Grup Duyuruları */}
            {activePings.length > 0 && (
              <div className="space-y-2">
                {activePings.map((ping) => {
                  const sender = profiles.find((p) => p.id === ping.from_id);
                  const sName = ping.from_name || sender?.name || 'Arkadaşın';
                  const sAvatar = ping.from_avatar || sender?.avatar || '👋';
                  const isBroadcast = ping.to_id === 'all';

                  return (
                    <div
                      key={ping.id}
                      className="rounded-2xl border border-amber-300 bg-linear-to-r from-amber-50 via-orange-50/70 to-amber-50 p-3.5 shadow-xs flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/30 border border-amber-300 flex items-center justify-center text-lg shrink-0">
                          {ping.emoji || sAvatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900">
                              {sAvatar} {sName}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-full bg-amber-200/80 text-amber-950">
                              {isBroadcast ? 'Gruba Seslendi' : 'Seni Dürttü'}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 mt-0.5">
                            {ping.message}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismissPing(ping.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-amber-200 text-xs font-extrabold text-slate-700 shrink-0 cursor-pointer"
                      >
                        Tamam
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* =================================================================
                ALT SEKME 1: CANLI LOBİ DASHBOARD
               ================================================================= */}
            {roomTab === 'dashboard' && (
              <div className="space-y-4">
                {/* 1. GRUP NABZI (GROUP PULSE ISLAND) */}
                <div
                  className={`rounded-3xl p-5 shadow-md border text-white relative overflow-hidden ${
                    groupSummary.allAvailableNow
                      ? 'bg-linear-to-br from-emerald-600 via-teal-700 to-emerald-800 border-emerald-500/40'
                      : 'bg-linear-to-br from-[#0c3f79] via-[#0a3362] to-[#002855] border-blue-900/40'
                  }`}
                >
                  <div className="space-y-3.5 relative z-10">
                    {/* Canlı Dağılım Rozetleri */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>Grup Nabzı • Canlı Özet</span>
                      </span>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/25 border border-emerald-300/30 text-white text-xs font-black">
                          🟢 {groupSummary.availableCount + groupSummary.onlineClassCount} Müsait
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/25 border border-rose-300/30 text-white text-xs font-black">
                          🔴 {groupSummary.inClassCount} Derste
                        </span>
                        {groupSummary.onlineClassCount > 0 && (
                          <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold">
                            💻 {groupSummary.onlineClassCount} Online
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ana Başlık & Detay */}
                    <div>
                      <h3 className="text-lg sm:text-xl font-black leading-snug">
                        {groupSummary.headline}
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-white/85 font-medium">
                        {groupSummary.detail}
                      </p>
                    </div>

                    {/* Çoğunluk Önerisi (N-1 Overlap) */}
                    {groupSummary.majoritySuggestion && (
                      <div className="rounded-2xl bg-amber-400/20 border border-amber-300/40 px-3.5 py-2.5 text-xs font-extrabold text-amber-100">
                        {groupSummary.majoritySuggestion}
                      </div>
                    )}

                    {/* Günün Tam Kadro Ortak Boşluk Pencereleri */}
                    {groupSummary.fullOverlapWindows.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-white/75">
                          Bugünkü %100 Tam Kadro Ortak Boş Saatler:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {groupSummary.fullOverlapWindows.map((win) => (
                            <span
                              key={`${win.start_time}-${win.end_time}`}
                              className={`px-2.5 py-1 rounded-xl text-xs font-mono font-black border ${
                                win.is_current
                                  ? 'bg-[#e7a240] text-slate-950 border-amber-300 shadow-xs'
                                  : 'bg-white/12 text-white border-white/20'
                              }`}
                            >
                              {win.start_time} - {win.end_time} ({formatDurationTr(win.duration_minutes)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Çoğunluk (N-1) Pencereleri */}
                    {groupSummary.majorityOverlapWindows.length > 0 && (
                      <div className="pt-0.5 space-y-1">
                        <span className="block text-[10px] font-extrabold uppercase tracking-wider text-amber-200/90">
                          Çoğunluk Boş Saatler ({groupSummary.activeScheduleCount - 1}/
                          {groupSummary.activeScheduleCount} Kişi):
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {groupSummary.majorityOverlapWindows.slice(0, 4).map((win) => (
                            <span
                              key={`maj-${win.start_time}-${win.end_time}`}
                              className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white/10 text-amber-100 border border-white/15"
                            >
                              {win.start_time} - {win.end_time} ({win.missing_names.join(', ')} derste)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. KENDİ CANLI DURUMUM & BİLDİRİM KARTI */}
                {myProfile && myLiveStatus && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#0c3f79] text-white text-xl flex items-center justify-center shrink-0 shadow-2xs">
                          {myProfile.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black uppercase tracking-wider text-[#0c3f79]">
                              Senin Görünümün ({myProfile.name})
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                myLiveStatus.isAvailableNow
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {myLiveStatus.state === 'ONLINE_CLASS'
                                ? '💻 Online Ders (Müsait)'
                                : myLiveStatus.isAvailableNow
                                ? '🟢 Müsait Görünüyorsun'
                                : '🔴 Derste Görünüyorsun'}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">
                            {myLiveStatus.activeCustomStatus
                              ? `${myLiveStatus.activeCustomStatus.emoji} ${myLiveStatus.activeCustomStatus.label}: ${myLiveStatus.activeCustomStatus.note}`
                              : myLiveStatus.headline}
                          </p>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {myLiveStatus.subheadline}
                          </p>
                        </div>
                      </div>

                      {/* Kendi Hızlı Aksiyonlarım */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {myLiveStatus.state === 'IN_CLASS' && (
                          <button
                            type="button"
                            onClick={handleOneTapEarlyExit}
                            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Dersim Erken Bitti!</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setStatusModalOpen(true)}
                          className="px-3.5 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5 text-amber-400" />
                          <span>Durum / Konum Yaz</span>
                        </button>

                        {myLiveStatus.activeCustomStatus && (
                          <button
                            type="button"
                            onClick={() => handleSaveMyStatus(null)}
                            className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            Temizle
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Kilit Ekranı Bildirim (Web Push) Çubuğu */}
                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      {iosNeedsHomeScreen ? (
                        <div className="flex items-center gap-2 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 w-full">
                          <Smartphone className="w-4 h-4 text-amber-700 shrink-0" />
                          <span>
                            iPhone&apos;da kilit ekranı bildirimleri için Safari&apos;de{' '}
                            <strong>Paylaş → Ana Ekrana Ekle</strong> yapıp uygulamayı oradan açmalısın.
                          </span>
                        </div>
                      ) : pushSupported ? (
                        <>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            {pushSubscribed ? (
                              <>
                                <BellRing className="w-4 h-4 text-emerald-600" />
                                <span className="text-emerald-800">
                                  Kilit ekranı bildirimleri aktif (Erken çıkış &amp; grup çağrıları)
                                </span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4 text-amber-600" />
                                <span>
                                  Gruptan biri dersten çıkınca veya seslenince telefonuna bildirim düşsün mü?
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {!pushSubscribed ? (
                              <button
                                type="button"
                                disabled={pushLoading}
                                onClick={handleEnablePush}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                <span>{pushLoading ? 'Açılıyor...' : 'Bildirimleri Aç'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleTestPush}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                              >
                                <BellRing className="w-3.5 h-3.5 text-[#0c3f79]" />
                                <span>🔔 Test Et</span>
                              </button>
                            )}
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* 3. GRUBA GENEL SESLEN (BROADCAST PING) */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-4 h-4 text-[#0c3f79]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Gruba Genel Seslen (Tüm Üyelere Bildirim Gider)
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {BROADCAST_PRESETS.map((bp) => (
                      <button
                        key={bp.id}
                        type="button"
                        disabled={sendingPing}
                        onClick={() => handleSendPing('all', bp.id, bp.emoji, bp.message)}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-blue-50/60 hover:border-[#0c3f79]/30 text-left transition-all cursor-pointer flex items-center gap-2 group"
                      >
                        <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">
                          {bp.emoji}
                        </span>
                        <span className="text-xs font-extrabold text-slate-800 leading-tight">
                          {bp.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Özel Grup Çağrısı */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!customBroadcastMsg.trim()) return;
                      handleSendPing('all', 'custom', '📢', customBroadcastMsg.trim());
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={customBroadcastMsg}
                      onChange={(e) => setCustomBroadcastMsg(e.target.value)}
                      placeholder="Gruba hızlı mesaj fırlat (Örn: Kantindeyiz, çaya gelin!)"
                      maxLength={100}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 focus:border-[#0c3f79] focus:bg-white outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!customBroadcastMsg.trim() || sendingPing}
                      className="px-3.5 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 text-amber-400" />
                      <span>Seslen</span>
                    </button>
                  </form>
                </div>

                {/* 4. ÜYE DURUM IZGARASI (MEMBER CARDS GRID) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#0c3f79]" />
                      <span>Lobi Üyeleri ({profiles.length})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(true)}
                      className="text-xs font-extrabold text-[#0c3f79] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Arkadaş Davet Et</span>
                    </button>
                  </div>

                  {/* Gizli Dosya Seçici (Kendi Programını Hızlı Yüklemek İçin) */}
                  <input
                    ref={fileInputRoomRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f || !myProfile) return;
                      setUploadingMySchedule(true);
                      try {
                        const sched = await parseScheduleFile(f);
                        await handleUpdateMemberProfile({
                          ...myProfile,
                          schedule: sched,
                        });
                        showToast('Ders programın başarıyla güncellendi! 🎉');
                      } catch (err: any) {
                        showToast(err.message || 'Program yüklenemedi.');
                      } finally {
                        setUploadingMySchedule(false);
                      }
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {profiles.map((member) => {
                      const status = liveStatuses[member.id];
                      const theme = PROFILE_THEMES[member.color] || PROFILE_THEMES.blue;
                      const isMe = myProfile?.id === member.id;
                      const isExpanded = expandedMemberId === member.id;
                      const hasSchedule = Boolean(member.schedule && member.schedule.schedule);

                      return (
                        <div
                          key={member.id}
                          className={`rounded-2xl border bg-white p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                            isMe
                              ? 'border-[#0c3f79] ring-2 ring-[#0c3f79]/10'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Üst Satır: Avatar, İsim ve Canlı Durum Rozeti */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-11 h-11 rounded-2xl ${theme.bg} text-white text-xl flex items-center justify-center shrink-0 shadow-2xs`}
                                >
                                  {member.avatar}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-sm font-black text-slate-900 truncate">
                                      {member.name}
                                    </h4>
                                    {isMe && (
                                      <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded-md bg-[#0c3f79] text-white">
                                        Sen
                                      </span>
                                    )}
                                    {(member.id === ownerProfileId || member.role === 'owner') && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                                        <Crown className="w-2.5 h-2.5 text-amber-600" />
                                        <span>Lider</span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-500 truncate">
                                    {status?.headline}
                                  </p>
                                </div>
                              </div>

                              {/* Durum Hapı */}
                              <span
                                className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${
                                  status?.state === 'NO_SCHEDULE'
                                    ? 'bg-slate-100 text-slate-600'
                                    : status?.state === 'ONLINE_CLASS'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : status?.isEarlyExitActive
                                    ? 'bg-amber-100 text-amber-900'
                                    : status?.isAvailableNow
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {status?.state === 'NO_SCHEDULE'
                                  ? '📅 Program Yok'
                                  : status?.state === 'ONLINE_CLASS'
                                  ? '💻 Online (Müsait)'
                                  : status?.isEarlyExitActive
                                  ? '⚡ Erken Çıktı'
                                  : status?.isAvailableNow
                                  ? '🟢 Müsait'
                                  : '🔴 Derste'}
                              </span>
                            </div>

                            {/* Özel Durum Notu Varsa */}
                            {status?.activeCustomStatus && (
                              <div className="rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-2 flex items-start gap-2">
                                <span className="text-sm shrink-0">
                                  {status.activeCustomStatus.emoji}
                                </span>
                                <div className="min-w-0 text-xs">
                                  <span className="font-black text-amber-950">
                                    {status.activeCustomStatus.label}:{' '}
                                  </span>
                                  <span className="font-semibold text-amber-900">
                                    {status.activeCustomStatus.note}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Ders / Boşluk Detay Kutusu */}
                            {status?.currentClass ? (
                              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[11px] font-black text-[#0c3f79]">
                                    {status.currentClass.code}
                                  </span>
                                  {status.currentClass.classroom && (
                                    <span className="text-[11px] font-extrabold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-rose-600" />
                                      {status.currentClass.classroom}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-black text-slate-900 leading-snug">
                                  {status.currentClass.name}
                                </p>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                                    <span>
                                      {status.currentClass.start_time} - {status.currentClass.end_time}
                                    </span>
                                    <span className="text-rose-600 font-extrabold">
                                      {formatDurationTr(status.remainingMinutes)} kaldı
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div
                                      className="h-full bg-[#0c3f79] rounded-full transition-all"
                                      style={{ width: `${status.progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : hasSchedule ? (
                              <div className="rounded-xl bg-emerald-50/50 border border-emerald-200/60 px-3 py-2.5 text-xs text-emerald-950 font-semibold">
                                {status?.subheadline}
                              </div>
                            ) : (
                              <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-3 py-2.5 flex items-center justify-between gap-2">
                                <span className="text-xs text-slate-500 font-medium">
                                  Henüz ders programı eklenmedi.
                                </span>
                                {isMe && (
                                  <button
                                    type="button"
                                    disabled={uploadingMySchedule}
                                    onClick={() => fileInputRoomRef.current?.click()}
                                    className="px-2.5 py-1 rounded-lg bg-[#0c3f79] text-white text-[11px] font-extrabold cursor-pointer shrink-0"
                                  >
                                    {uploadingMySchedule ? 'Yükleniyor...' : 'PDF / PNG Yükle'}
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Açılır Günlük Ders Listesi */}
                            {isExpanded && status && (
                              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                  {activeDayName} Günü Dersleri ({status.todaySlots.length})
                                </span>
                                {status.todaySlots.length === 0 ? (
                                  <p className="text-xs text-slate-500 font-medium">
                                    Bugün kayıtlı ders yok.
                                  </p>
                                ) : (
                                  status.todaySlots.map((s, i) => (
                                    <div
                                      key={`${s.code}-${i}`}
                                      className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg bg-slate-50"
                                    >
                                      <div className="min-w-0">
                                        <span className="font-mono font-black text-[#0c3f79] mr-1.5">
                                          {s.start_time}-{s.end_time}
                                        </span>
                                        <span className="font-bold text-slate-800 truncate">
                                          {s.name}
                                        </span>
                                      </div>
                                      {s.classroom && (
                                        <span className="text-[10px] font-bold text-slate-500 shrink-0">
                                          {s.classroom}
                                        </span>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Kart Alt Aksiyon Butonları */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            {!isMe ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={sendingPing}
                                  onClick={() =>
                                    handleSendPing(
                                      member.id,
                                      'poke',
                                      '👉',
                                      `${myProfile?.name || 'Arkadaşın'} seni dürttü: "Dersin nasıl gidiyor, ne zaman çıkıyorsun?"`
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>👉 Dürt</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={sendingPing}
                                  onClick={() =>
                                    handleSendPing(
                                      member.id,
                                      'coffee',
                                      '☕',
                                      `${myProfile?.name || 'Arkadaşın'}: "Müsait olunca bir kahve içelim mi?"`
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>☕ Kahve?</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => fileInputRoomRef.current?.click()}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>{hasSchedule ? 'Programı Yenile' : 'Program Yükle'}</span>
                                </button>
                              </div>
                            )}

                            {hasSchedule && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedMemberId(isExpanded ? null : member.id)
                                }
                                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                              >
                                <span>Dersler ({status?.todaySlots.length || 0})</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                ALT SEKME 2: ÇOKLU PARALEL ÇİZELGE (GROUP TIMELINE MATRIX)
               ================================================================= */}
            {roomTab === 'timeline' && (
              <DailyParallelTimeline
                profiles={profiles}
                selectedDay={timelineDay}
                onSelectDay={setTimelineDay}
                todayDayName={activeDayName}
                currentMinutes={activeMinutes}
                nowEpochMs={nowEpochMs}
              />
            )}

            {/* =================================================================
                ALT SEKME 3: PROGRAM & ÜYE AYARLARI
               ================================================================= */}
            {roomTab === 'settings' && (
              <div className="space-y-4">
                {/* Kendi Profilimi & Programımı Düzenle Kartı */}
                {myProfile && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          Senin Profilin ({myProfile.name})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Avatarını, kart rengini veya ders programını buradan anında değiştirebilirsin.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={uploadingMySchedule}
                          onClick={() => fileInputRoomRef.current?.click()}
                          className="px-3.5 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            {uploadingMySchedule ? 'Yükleniyor...' : 'USIS PDF / PNG Yükle'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const raw = window.localStorage.getItem('ytu_visualizer_data');
                              if (!raw) {
                                showToast('Ana sayfada kayıtlı program bulunamadı.');
                                return;
                              }
                              const parsed = JSON.parse(raw);
                              if (!parsed || !parsed.schedule) {
                                showToast('Ana sayfadaki program verisi geçersiz.');
                                return;
                              }
                              await handleUpdateMemberProfile({
                                ...myProfile,
                                schedule: {
                                  term: parsed.term || 'Aktif Dönem',
                                  title: parsed.title || 'Ana Sayfa Programım',
                                  schedule: parsed.schedule,
                                  courses_summary: parsed.courses_summary || [],
                                },
                              });
                              showToast('Ana sayfadaki programın lobiye aktarıldı! 🎉');
                            } catch {
                              showToast('Program aktarılırken hata oluştu.');
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Ana Sayfadan Aktar</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      {/* Avatar Seçici */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500">Avatarın:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {AVATAR_OPTIONS.map((av) => (
                            <button
                              key={av}
                              type="button"
                              onClick={() =>
                                handleUpdateMemberProfile({ ...myProfile, avatar: av })
                              }
                              className={`w-8 h-8 rounded-xl text-sm flex items-center justify-center transition-all cursor-pointer ${
                                myProfile.avatar === av
                                  ? 'bg-[#0c3f79] text-white ring-2 ring-[#0c3f79]/30 scale-105'
                                  : 'bg-slate-100 hover:bg-slate-200'
                              }`}
                            >
                              {av}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Renk Seçici */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500">Kart Rengin:</span>
                        <div className="flex items-center gap-2 pt-1">
                          {COLOR_KEYS.map((ck) => {
                            const t = PROFILE_THEMES[ck];
                            return (
                              <button
                                key={ck}
                                type="button"
                                onClick={() =>
                                  handleUpdateMemberProfile({ ...myProfile, color: ck })
                                }
                                className={`w-7 h-7 rounded-full ${t.bg} transition-transform cursor-pointer ${
                                  myProfile.color === ck
                                    ? 'scale-110 ring-2 ring-offset-2 ring-slate-900'
                                    : 'opacity-70 hover:opacity-100'
                                }`}
                                title={t.name}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Lobi Üyeleri ({profiles.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Lobideki tüm üyeleri görüntüleyebilir veya yeni arkadaş davet edebilirsin.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShareModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#0c3f79] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Yeni Üye Davet Et</span>
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {profiles.map((p) => {
                      const isMe = myProfile?.id === p.id;
                      const isMemberOwner = p.id === ownerProfileId || p.role === 'owner';
                      const hasSched = Boolean(p.schedule && p.schedule.schedule);
                      return (
                        <div
                          key={p.id}
                          className="py-3 flex items-center justify-between gap-3 flex-wrap"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                              {p.avatar}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-black text-slate-900">
                                  {p.name}
                                </span>
                                {isMe && (
                                  <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-blue-100 text-[#0c3f79]">
                                    Bu Sensin
                                  </span>
                                )}
                                {isMemberOwner && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                    <Crown className="w-3 h-3 text-amber-600" />
                                    <span>Grup Lideri</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">
                                {hasSched ? '✅ Ders programı yüklü' : '⚠️ Program yüklenmedi'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!isMe && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSavedLobbies((prev) =>
                                    prev.map((item) =>
                                      item.room_code === activeRoomCode
                                        ? { ...item, my_profile_id: p.id }
                                        : item
                                    )
                                  );
                                  showToast(`Aktif profilin "${p.name}" olarak değiştirildi.`);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                              >
                                Bu Benim
                              </button>
                            )}

                            {/* Lider diğer üyeleri çıkarabilir */}
                            {!isMe && isRoomLeader && (
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!window.confirm(`${p.name} adlı üyeyi gruptan çıkarmak istiyor musun?`))
                                    return;
                                  try {
                                    const res = await fetch(
                                      `${API_BASE}/api/uygun-musun/room/${encodeURIComponent(
                                        activeRoomCode
                                      )}/profile/${encodeURIComponent(p.id)}`,
                                      { method: 'DELETE' }
                                    );
                                    if (res.ok) {
                                      const data = await res.json();
                                      setRoomState(data);
                                      showToast(`${p.name} gruptan çıkarıldı.`);
                                    }
                                  } catch {
                                    // ignore
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold text-rose-600 hover:bg-rose-50 border border-rose-200 flex items-center gap-1 cursor-pointer"
                                title="Üyeyi Gruptan Çıkar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Çıkar</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gruptan Çık & Liderse Grubu Kapat Yönetim Kartı */}
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      {isRoomLeader ? (
                        <>
                          <Crown className="w-4 h-4 text-amber-600" />
                          <span>Grup Lideri Yönetimi &amp; Ayrılma</span>
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4 text-rose-600" />
                          <span>Gruptan Ayrıl</span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {isRoomLeader
                        ? profiles.length > 1
                          ? 'Gruptan çıkarsan liderlik sıradaki üyeye devredilir. Grubu kapatırsan lobi tüm üyeler için kalıcı olarak silinir.'
                          : 'Bu gruptaki tek üye sensin. Grubu kapattığında lobi tamamen silinir.'
                        : 'Gruptan çıktığında ders programın ve profilin bu lobiden kaldırılır.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    {(!isRoomLeader || profiles.length > 1) && (
                      <button
                        type="button"
                        onClick={() => handleLeaveRoom()}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>{isRoomLeader ? 'Gruptan Çık (Devret)' : 'Gruptan Çık'}</span>
                      </button>
                    )}

                    {isRoomLeader && (
                      <button
                        type="button"
                        onClick={() => handleCloseRoom()}
                        className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Grubu Tamamen Kapat</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobil Alt Hızlı Navigasyon Barı (Lobi İçindeyken) */}
      {viewMode === 'room' && activeRoomCode && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
          <button
            type="button"
            onClick={() => setRoomTab('dashboard')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer ${
              roomTab === 'dashboard' ? 'text-[#0c3f79]' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Canlı Lobi</span>
          </button>

          <button
            type="button"
            onClick={() => setRoomTab('timeline')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-extrabold cursor-pointer ${
              roomTab === 'timeline' ? 'text-[#0c3f79]' : 'text-slate-400'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Çizelge</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusModalOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-extrabold text-amber-600 cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Durum Yaz</span>
          </button>

          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-extrabold text-emerald-700 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Davet Et</span>
          </button>
        </nav>
      )}

      {/* Paylaşım & QR Kod Modalı */}
      <LobbyShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        roomCode={activeRoomCode}
        roomTitle={currentRoomTitle}
      />

      {/* Kendi Durum / Konum Güncelleme Çekmecesi */}
      {statusModalOpen && myProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg">
            <StatusCheckInSheet
              profiles={profiles}
              selectedProfileId={myProfile.id}
              onSelectProfileId={() => {}}
              liveStatuses={liveStatuses}
              dayName={activeDayName}
              currentMinutes={activeMinutes}
              onSaveStatus={async (_pid, status) => {
                await handleSaveMyStatus(status);
              }}
              onClose={() => setStatusModalOpen(false)}
              isModal={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
