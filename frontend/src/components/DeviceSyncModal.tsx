"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Smartphone,
  Laptop,
  QrCode,
  KeyRound,
  Check,
  Copy,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Download,
  UploadCloud,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Users,
  Calculator,
  ClipboardList,
  Layers
} from 'lucide-react';
import { generateQrMatrix } from '../utils/qrCodeGenerator';

interface DeviceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSchedule?: any;
  onSyncSuccess?: (payload: any) => void;
}

export default function DeviceSyncModal({
  isOpen,
  onClose,
  currentSchedule,
  onSyncSuccess,
}: DeviceSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'instant' | 'pin'>('instant');
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // Instant Transfer State
  const [transferCode, setTransferCode] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(300);
  const [isGenerating, setIsGenerating] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  // PIN Backup State
  const [pinMode, setPinMode] = useState<'backup' | 'restore'>('backup');
  const [studentId, setStudentId] = useState('');
  const [pin, setPin] = useState('');
  const [isPinLoading, setIsPinLoading] = useState(false);

  // UI Toast & Error
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Cihaz türü tespiti (Ekran genişliği + UserAgent)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isMob = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    setIsMobileDevice(isMob);
  }, []);

  // Mevcut yerel verileri topla (Tüm platform: Program, AGNO, Akademik Plan, Lobiler, Devamsızlık, Notlar)
  const collectLocalPayload = () => {
    let schedule = currentSchedule || null;
    let term = '2026-2027 Güz';
    let student_id = '';
    let student_name = '';
    let department = '';
    let courses_summary: any[] = [];

    // 1. Ders Programı & Öğrenci Bilgisi
    try {
      const raw = localStorage.getItem('ytu_schedule_data') || localStorage.getItem('ytu_visualizer_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          if (!schedule && parsed.schedule) schedule = parsed.schedule;
          term = parsed.term || term;
          student_id = parsed.student_id || student_id;
          student_name = parsed.student_name || student_name;
          department = parsed.department || department;
          courses_summary = parsed.courses_summary || courses_summary;
        }
      }
    } catch {}

    // Transkript önbelleğinden öğrenci no / isim çekmeyi dene (eğer program yoksa)
    try {
      const rawCache = localStorage.getItem('ytu_parsed_transcript_cache');
      if (rawCache) {
        const cacheParsed = JSON.parse(rawCache);
        if (cacheParsed) {
          if (!student_id && cacheParsed.student_id) student_id = cacheParsed.student_id;
          if (!student_name && cacheParsed.student_name) student_name = cacheParsed.student_name;
          if (!department && cacheParsed.department) department = cacheParsed.department;
        }
      }
    } catch {}

    // 2. Arkadaş Lobileri & Aktif Oda
    let saved_lobbies: any[] = [];
    try {
      const rawLobbies = localStorage.getItem('ytu_uygun_musun_saved_lobbies_v1') || localStorage.getItem('ytu_saved_lobbies_v1');
      if (rawLobbies) {
        const parsed = JSON.parse(rawLobbies);
        if (Array.isArray(parsed)) saved_lobbies = parsed;
      }
    } catch {}

    let active_room_code: string | null = null;
    try {
      const rawActive = localStorage.getItem('ytu_uygun_musun_active_lobby_v1') || localStorage.getItem('ytu_active_room_code');
      if (rawActive) active_room_code = JSON.parse(rawActive);
    } catch {}

    let duo_profiles: any[] = [];
    try {
      const rawDuo = localStorage.getItem('ytu_duo_profiles_v2');
      if (rawDuo) duo_profiles = JSON.parse(rawDuo);
    } catch {}

    // 3. Notlar
    let course_notes: Record<string, any> = {};
    try {
      const rawNotes = localStorage.getItem('ytu_course_notes_v1') || localStorage.getItem('ytu_schedule_notes');
      if (rawNotes) course_notes = JSON.parse(rawNotes);
    } catch {}

    // 4. Görselleştirici Tercihleri
    let visualizer_settings: Record<string, any> = {};
    try {
      const getVal = (k: string) => {
        const v = localStorage.getItem(k);
        if (!v) return null;
        try { return JSON.parse(v); } catch { return v; }
      };
      visualizer_settings = {
        view_mode: getVal('ytu_visualizer_view_mode'),
        color_mode: getVal('ytu_visualizer_color_mode'),
        show_instructor: getVal('ytu_show_instructor'),
        show_section: getVal('ytu_show_section'),
        show_notes: getVal('ytu_show_notes'),
        font_family: getVal('ytu_schedule_font'),
        font_scale: getVal('ytu_schedule_scale'),
      };
    } catch {}

    // 5. AGNO Simülatörü
    let agno: Record<string, any> = {};
    try {
      const parseItem = (k: string) => {
        const v = localStorage.getItem(k);
        if (!v) return null;
        try { return JSON.parse(v); } catch { return v; }
      };
      agno = {
        past_cgpa: parseItem('ytu_agno_past_cgpa'),
        past_credits: parseItem('ytu_agno_past_credits'),
        past_courses: parseItem('ytu_agno_past_courses') || [],
        target_cgpa: parseItem('ytu_agno_target_cgpa'),
        target_credits: parseItem('ytu_agno_target_credits'),
        current_courses: parseItem('ytu_agno_current_courses') || [],
        transcript_cache: parseItem('ytu_parsed_transcript_cache'),
      };
    } catch {}

    // 6. Akademik Planlama (4 Yıllık)
    let academic_plan: Record<string, any> = {};
    try {
      const prefs = localStorage.getItem('ytu_plan_prefs_v2');
      const scenarios: Record<string, any> = {};
      const plans: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (key.startsWith('ytu_scenarios_v2_')) {
          const val = localStorage.getItem(key);
          if (val) scenarios[key] = val;
        } else if (key.startsWith('ytu_plan_v2_')) {
          const val = localStorage.getItem(key);
          if (val) plans[key] = val;
        }
      }
      academic_plan = {
        prefs: prefs ? (prefs.startsWith('{') ? JSON.parse(prefs) : prefs) : null,
        scenarios,
        plans,
      };
    } catch {}

    // 7. Devamsızlık Takibi
    let absence: Record<string, any> = {};
    try {
      const parseItem = (k: string) => {
        const v = localStorage.getItem(k);
        if (!v) return null;
        try { return JSON.parse(v); } catch { return v; }
      };
      absence = {
        courses: parseItem('ytu_absence_courses') || [],
        settings: parseItem('ytu_absence_settings') || null,
      };
    } catch {}

    return {
      student_id,
      student_name,
      department,
      term,
      schedule,
      courses_summary,
      saved_lobbies,
      active_room_code,
      duo_profiles,
      course_notes,
      visualizer_settings,
      agno,
      academic_plan,
      absence,
      exported_at: Date.now()
    };
  };

  // Herhangi bir yedeklenebilir veri var mı kontrolü
  const hasAnyBackupData = (payload: any): boolean => {
    const hasSched = Boolean(payload.schedule && Object.keys(payload.schedule).length > 0);
    const hasLobb = Boolean(
      (payload.saved_lobbies && payload.saved_lobbies.length > 0) ||
      payload.active_room_code ||
      (payload.duo_profiles && payload.duo_profiles.length > 0)
    );
    const hasNot = Boolean(payload.course_notes && Object.keys(payload.course_notes).length > 0);
    const hasAg = Boolean(
      payload.agno && (
        (payload.agno.past_courses && payload.agno.past_courses.length > 0) ||
        (payload.agno.current_courses && payload.agno.current_courses.length > 0) ||
        payload.agno.past_cgpa
      )
    );
    const hasPl = Boolean(
      payload.academic_plan && (
        payload.academic_plan.prefs ||
        (payload.academic_plan.plans && Object.keys(payload.academic_plan.plans).length > 0) ||
        (payload.academic_plan.scenarios && Object.keys(payload.academic_plan.scenarios).length > 0)
      )
    );
    const hasAbs = Boolean(
      payload.absence && payload.absence.courses && payload.absence.courses.length > 0
    );

    return hasSched || hasLobb || hasNot || hasAg || hasPl || hasAbs;
  };

  // Yerel veri envanteri (UI durum çipi için)
  const [localInventory, setLocalInventory] = useState<any>(null);

  // Öğrenci numarasını ve envanteri otomatik doldur (eğer varsa)
  useEffect(() => {
    if (isOpen) {
      const local = collectLocalPayload();
      setLocalInventory(local);
      if (local.student_id && !studentId) {
        setStudentId(local.student_id);
      }
      setStatusMsg(null);
    }
  }, [isOpen]);

  // Anlık Transfer Kodu Oluştur (Bilgisayar tarafı)
  const handleGenerateTransfer = async () => {
    setIsGenerating(true);
    setStatusMsg(null);
    try {
      const payload = collectLocalPayload();
      if (!hasAnyBackupData(payload)) {
        throw new Error('Aktarılacak herhangi bir veri (Ders Programı, AGNO, Akademik Plan veya Lobi) bulunamadı.');
      }

      const res = await fetch(`${apiBase}/api/sync/transfer/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Transfer kodu üretilemedi.');
      }

      const data = await res.json();
      setTransferCode(data.transfer_code);
      setExpiresIn(data.expires_in || 300);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Bir hata oluştu.' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Geri sayım sayacı
  useEffect(() => {
    if (!transferCode || expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTransferCode(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [transferCode, expiresIn]);

  // Alınan veriyi tarayıcıya kaydet (Tüm modülleri geri yükler)
  const applyImportedPayload = (payload: any) => {
    // 1. Ders Programı
    if (payload.schedule) {
      const mainData = {
        term: payload.term || 'Aktif Dönem',
        student_id: payload.student_id || '',
        student_name: payload.student_name || '',
        department: payload.department || '',
        schedule: payload.schedule,
        courses_summary: payload.courses_summary || [],
      };
      localStorage.setItem('ytu_schedule_data', JSON.stringify(mainData));
      localStorage.setItem('ytu_visualizer_data', JSON.stringify(mainData));
    }

    // 2. Notlar
    if (payload.course_notes) {
      try {
        localStorage.setItem('ytu_course_notes_v1', JSON.stringify(payload.course_notes));
        localStorage.setItem('ytu_schedule_notes', JSON.stringify(payload.course_notes));
      } catch {}
    }

    // 3. Görselleştirici Tercihleri
    if (payload.visualizer_settings) {
      const s = payload.visualizer_settings;
      if (s.view_mode) localStorage.setItem('ytu_visualizer_view_mode', JSON.stringify(s.view_mode));
      if (s.color_mode) localStorage.setItem('ytu_visualizer_color_mode', JSON.stringify(s.color_mode));
      if (typeof s.show_instructor === 'boolean') localStorage.setItem('ytu_show_instructor', JSON.stringify(s.show_instructor));
      if (typeof s.show_section === 'boolean') localStorage.setItem('ytu_show_section', JSON.stringify(s.show_section));
      if (typeof s.show_notes === 'boolean') localStorage.setItem('ytu_show_notes', JSON.stringify(s.show_notes));
      if (s.font_family) localStorage.setItem('ytu_schedule_font', JSON.stringify(s.font_family));
      if (s.font_scale) localStorage.setItem('ytu_schedule_scale', JSON.stringify(s.font_scale));
    }

    // 4. Arkadaş Lobileri & Aktif Oda
    if (payload.saved_lobbies && Array.isArray(payload.saved_lobbies)) {
      try {
        const existingRaw = localStorage.getItem('ytu_uygun_musun_saved_lobbies_v1') || localStorage.getItem('ytu_saved_lobbies_v1');
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        const mergedMap = new Map();
        existing.forEach((l: any) => mergedMap.set(l.room_code, l));
        payload.saved_lobbies.forEach((l: any) => mergedMap.set(l.room_code, l));
        const mergedArr = Array.from(mergedMap.values());
        localStorage.setItem('ytu_uygun_musun_saved_lobbies_v1', JSON.stringify(mergedArr));
        localStorage.setItem('ytu_saved_lobbies_v1', JSON.stringify(mergedArr));
      } catch {}
    }
    if (payload.active_room_code) {
      try {
        localStorage.setItem('ytu_uygun_musun_active_lobby_v1', JSON.stringify(payload.active_room_code));
        localStorage.setItem('ytu_active_room_code', JSON.stringify(payload.active_room_code));
      } catch {}
    }
    if (payload.duo_profiles && Array.isArray(payload.duo_profiles)) {
      try {
        localStorage.setItem('ytu_duo_profiles_v2', JSON.stringify(payload.duo_profiles));
      } catch {}
    }

    // 5. AGNO Simülatörü
    if (payload.agno) {
      try {
        const a = payload.agno;
        if (a.past_cgpa !== undefined && a.past_cgpa !== null) localStorage.setItem('ytu_agno_past_cgpa', JSON.stringify(a.past_cgpa));
        if (a.past_credits !== undefined && a.past_credits !== null) localStorage.setItem('ytu_agno_past_credits', JSON.stringify(a.past_credits));
        if (a.past_courses && Array.isArray(a.past_courses)) localStorage.setItem('ytu_agno_past_courses', JSON.stringify(a.past_courses));
        if (a.target_cgpa !== undefined && a.target_cgpa !== null) localStorage.setItem('ytu_agno_target_cgpa', JSON.stringify(a.target_cgpa));
        if (a.target_credits !== undefined && a.target_credits !== null) localStorage.setItem('ytu_agno_target_credits', JSON.stringify(a.target_credits));
        if (a.current_courses && Array.isArray(a.current_courses)) localStorage.setItem('ytu_agno_current_courses', JSON.stringify(a.current_courses));
        if (a.transcript_cache) localStorage.setItem('ytu_parsed_transcript_cache', JSON.stringify(a.transcript_cache));
      } catch {}
    }

    // 6. Akademik Planlama (4 Yıllık)
    if (payload.academic_plan) {
      try {
        const p = payload.academic_plan;
        if (p.prefs) localStorage.setItem('ytu_plan_prefs_v2', typeof p.prefs === 'string' ? p.prefs : JSON.stringify(p.prefs));
        if (p.scenarios && typeof p.scenarios === 'object') {
          Object.entries(p.scenarios).forEach(([k, v]) => {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          });
        }
        if (p.plans && typeof p.plans === 'object') {
          Object.entries(p.plans).forEach(([k, v]) => {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          });
        }
      } catch {}
    }

    // 7. Devamsızlık Takibi
    if (payload.absence) {
      try {
        if (payload.absence.courses && Array.isArray(payload.absence.courses)) {
          localStorage.setItem('ytu_absence_courses', JSON.stringify(payload.absence.courses));
        }
        if (payload.absence.settings) {
          localStorage.setItem('ytu_absence_settings', JSON.stringify(payload.absence.settings));
        }
      } catch {}
    }

    if (onSyncSuccess) {
      onSyncSuccess(payload);
    }
  };

  // Transfer Kodunu Çöz ve Al (Mobil tarafı)
  const handleClaimTransfer = async (codeToClaim?: string) => {
    const targetCode = (codeToClaim || inputCode).replace(/\s+/g, '').trim();
    if (targetCode.length < 6) {
      setStatusMsg({ type: 'error', text: 'Lütfen 6 haneli transfer kodunu eksiksiz girin.' });
      return;
    }

    setIsClaiming(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/sync/transfer/${encodeURIComponent(targetCode)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Transfer kodu geçersiz veya süresi dolmuş.');
      }

      const data = await res.json();
      if (data && data.payload) {
        applyImportedPayload(data.payload);
        setStatusMsg({
          type: 'success',
          text: `Harika! ${data.payload.student_name ? data.payload.student_name + ' verileri' : 'Tüm verileriniz'} başarıyla bu cihaza aktarıldı! 🎉`
        });
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Kod aktarılırken hata oluştu.' });
    } finally {
      setIsClaiming(false);
    }
  };

  // PIN ile Buluta Yedekle
  const handlePinBackup = async () => {
    const cleanId = studentId.replace(/\D/g, '').trim();
    const cleanPin = pin.trim();

    if (cleanId.length < 5) {
      setStatusMsg({ type: 'error', text: 'Lütfen geçerli bir öğrenci numarası girin.' });
      return;
    }
    if (cleanPin.length < 4) {
      setStatusMsg({ type: 'error', text: 'PIN kodu en az 4 haneli olmalıdır.' });
      return;
    }

    setIsPinLoading(true);
    setStatusMsg(null);
    try {
      const payload = collectLocalPayload();
      if (!hasAnyBackupData(payload)) {
        throw new Error('Yedeklenecek herhangi bir veri (Ders Programı, AGNO, Akademik Plan veya Lobi) bulunamadı.');
      }

      const res = await fetch(`${apiBase}/api/sync/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: cleanId,
          pin: cleanPin,
          payload,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Bulut yedekleme başarısız oldu.');
      }

      setStatusMsg({
        type: 'success',
        text: 'Programınız, AGNO, akademik planınız ve lobileriniz PIN şifrenizle buluta güvenle yedeklendi! ☁️'
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Yedekleme sırasında hata oluştu.' });
    } finally {
      setIsPinLoading(false);
    }
  };

  // PIN ile Buluttan Geri Yükle
  const handlePinRestore = async () => {
    const cleanId = studentId.replace(/\D/g, '').trim();
    const cleanPin = pin.trim();

    if (cleanId.length < 5) {
      setStatusMsg({ type: 'error', text: 'Lütfen geçerli bir öğrenci numarası girin.' });
      return;
    }
    if (cleanPin.length < 4) {
      setStatusMsg({ type: 'error', text: 'PIN kodu en az 4 haneli olmalıdır.' });
      return;
    }

    setIsPinLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/sync/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: cleanId,
          pin: cleanPin,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Geri yükleme başarısız. PIN hatalı olabilir.');
      }

      const data = await res.json();
      if (data && data.payload) {
        applyImportedPayload(data.payload);
        setStatusMsg({
          type: 'success',
          text: `Yedek bulundu! ${data.payload.student_name ? data.payload.student_name + ' verileri' : 'Tüm verileriniz'} başarıyla yüklendi! 🎉`
        });
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Geri yükleme hatası.' });
    } finally {
      setIsPinLoading(false);
    }
  };

  // QR Kod Matrisi
  const syncUrl = useMemo(() => {
    if (!transferCode || typeof window === 'undefined') return '';
    return `${window.location.origin}/uygun-musun?sync=${transferCode}`;
  }, [transferCode]);

  const qrMatrix = useMemo(() => {
    if (!syncUrl) return [];
    try {
      return generateQrMatrix(syncUrl);
    } catch {
      return [];
    }
  }, [syncUrl]);

  if (!isOpen) return null;

  const matrixSize = qrMatrix.length || 29;
  const quietZone = 2;
  const viewBoxSize = matrixSize + quietZone * 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-linear-to-r from-[#0c3f79] via-[#0a3466] to-[#002855] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Cihaz Senkronizasyonu</h3>
              <p className="text-xs text-blue-200/90">Bilgisayar & Telefon Arasında Anında Eşle</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sekmeler */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('instant'); setStatusMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-black transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'instant'
                ? 'border-[#0c3f79] text-[#0c3f79]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Hızlı Aktar (QR & Kod)</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('pin'); setStatusMsg(null); }}
            className={`pb-2.5 px-3 text-xs font-black transition-all flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === 'pin'
                ? 'border-[#0c3f79] text-[#0c3f79]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Kalıcı Bulut Yedek (PIN)</span>
          </button>
        </div>

        {/* İçerik Alanı */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-800">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs font-extrabold animate-in fade-in ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Cihaz Veri Envanteri Özeti */}
          {localInventory && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Layers className="w-3.5 h-3.5 text-[#0c3f79]" />
                  <span>Bu Cihazdaki Veriler</span>
                </span>
                <span className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
                  Otomatik Eşleme
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {localInventory.schedule && Object.keys(localInventory.schedule).length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>Ders Programı</span>
                  </span>
                ) : null}

                {localInventory.agno && (
                  (localInventory.agno.past_courses?.length > 0) ||
                  (localInventory.agno.current_courses?.length > 0) ||
                  localInventory.agno.past_cgpa
                ) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-semibold">
                    <Calculator className="w-3 h-3 text-blue-600" />
                    <span>AGNO ({((localInventory.agno.past_courses?.length || 0) + (localInventory.agno.current_courses?.length || 0))} Ders)</span>
                  </span>
                ) : null}

                {localInventory.academic_plan && (
                  localInventory.academic_plan.prefs ||
                  Object.keys(localInventory.academic_plan.plans || {}).length > 0 ||
                  Object.keys(localInventory.academic_plan.scenarios || {}).length > 0
                ) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-semibold">
                    <GraduationCap className="w-3 h-3 text-purple-600" />
                    <span>Akademik Plan</span>
                  </span>
                ) : null}

                {((localInventory.saved_lobbies && localInventory.saved_lobbies.length > 0) || localInventory.active_room_code) ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                    <Users className="w-3 h-3 text-amber-600" />
                    <span>{Math.max(localInventory.saved_lobbies?.length || 0, localInventory.active_room_code ? 1 : 0)} Lobi</span>
                  </span>
                ) : null}

                {localInventory.absence && localInventory.absence.courses?.length > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-semibold">
                    <ClipboardList className="w-3 h-3 text-rose-600" />
                    <span>Devamsızlık Takibi</span>
                  </span>
                ) : null}

                {!hasAnyBackupData(localInventory) ? (
                  <span className="text-slate-400 italic text-[11px] py-0.5">
                    Henüz bu cihazda kayıtlı bir veri bulunmuyor.
                  </span>
                ) : null}
              </div>
            </div>
          )}

          {/* TAB 1: INSTANT TRANSFER */}
          {activeTab === 'instant' && (
            <div className="space-y-4">
              {!isMobileDevice ? (
                /* MASAÜSTÜ GÖRÜNÜMÜ: QR + 6 Haneli Kod Üret */
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700 text-xs font-bold">
                      <Laptop className="w-3.5 h-3.5 text-blue-600" />
                      <span>Bilgisayardan Telefona Tek Tıkla Aktar</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Aşağıdaki butona bastığında tek seferlik 6 haneli kod ve QR kod üretilir. Telefonun kamerasıyla QR'ı okutarak saniyeler içinde programını telefona aktarabilirsin.
                    </p>

                    {!transferCode ? (
                      <button
                        type="button"
                        onClick={handleGenerateTransfer}
                        disabled={isGenerating}
                        className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-[#0c3f79] to-[#0a3466] hover:from-[#0a3466] hover:to-[#002855] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {isGenerating ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-amber-300" />
                        )}
                        <span>{isGenerating ? 'Kod Hazırlanıyor...' : '⚡ Telefona Aktarma Kodunu Üret'}</span>
                      </button>
                    ) : (
                      <div className="space-y-3 pt-2">
                        {/* 6 Haneli Büyük Kod */}
                        <div className="bg-white border-2 border-[#0c3f79]/20 rounded-2xl p-3 flex items-center justify-between">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Aktarma Kodu</div>
                            <div className="text-2xl font-black font-mono tracking-widest text-[#0c3f79]">
                              {transferCode.slice(0, 3)} {transferCode.slice(3)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(transferCode);
                              setCopiedCode(true);
                              setTimeout(() => setCopiedCode(false), 2000);
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode ? 'Kopyalandı' : 'Kopyala'}</span>
                          </button>
                        </div>

                        {/* QR Kod */}
                        {qrMatrix.length > 0 && (
                          <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs inline-block">
                            <svg
                              viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                              className="w-40 h-40 mx-auto"
                              shapeRendering="crispEdges"
                            >
                              <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
                              {qrMatrix.map((row, rIdx) =>
                                row.map((cell, cIdx) =>
                                  cell ? (
                                    <rect
                                      key={`${rIdx}-${cIdx}`}
                                      x={cIdx + quietZone}
                                      y={rIdx + quietZone}
                                      width={1}
                                      height={1}
                                      fill="#0c3f79"
                                    />
                                  ) : null
                                )
                              )}
                            </svg>
                          </div>
                        )}

                        <div className="text-xs text-slate-500 font-medium">
                          Geçerlilik süresi: <span className="font-mono font-bold text-amber-600">{Math.floor(expiresIn / 60)}:{(expiresIn % 60).toString().padStart(2, '0')}</span> (5 dakika sonra otomatik silinir)
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* MOBİL GÖRÜNÜMÜ: 6 Haneli Kodu Gir */
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-slate-700 text-xs font-bold">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Bilgisayardaki Kodu Buraya Gir</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Bilgisayarında <strong>"Cihaz Eşle"</strong> ekranında gördüğün 6 haneli kodu yazarak tüm derslerini ve lobilerini bu telefona çekebilirsin.
                    </p>

                    <div className="max-w-xs mx-auto space-y-3 pt-2">
                      <input
                        type="text"
                        maxLength={7}
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Örn: 842190"
                        className="w-full text-center text-2xl font-black font-mono tracking-widest py-3 px-4 rounded-xl border-2 border-slate-300 focus:border-[#0c3f79] focus:outline-hidden bg-white"
                      />

                      <button
                        type="button"
                        onClick={() => handleClaimTransfer()}
                        disabled={isClaiming || inputCode.length < 6}
                        className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        {isClaiming ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>{isClaiming ? 'Aktarılıyor...' : '📥 Programı Bu Telefona İndir'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PIN ILE BULUT YEDEKLEME */}
          {activeTab === 'pin' && (
            <div className="space-y-4">
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setPinMode('backup'); setStatusMsg(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    pinMode === 'backup'
                      ? 'bg-white text-[#0c3f79] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Buluta Yedekle</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setPinMode('restore'); setStatusMsg(null); }}
                  className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    pinMode === 'restore'
                      ? 'bg-white text-[#0c3f79] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Buluttan Geri Çek</span>
                </button>
              </div>

              <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Öğrenci Numarası</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Örn: 26012345"
                    className="w-full text-sm font-bold py-2 px-3 rounded-xl border border-slate-300 focus:border-[#0c3f79] focus:outline-hidden bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Yeni OBS PDF'i yüklediyseniz numaranız otomatik gelir.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {pinMode === 'backup' ? '4 Haneli Güvenlik PIN Kodu Belirle' : '4 Haneli PIN Kodunu Gir'}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center text-lg font-mono font-black py-2 px-3 rounded-xl border border-slate-300 focus:border-[#0c3f79] focus:outline-hidden bg-white tracking-widest"
                  />
                </div>

                {pinMode === 'backup' ? (
                  <button
                    type="button"
                    onClick={handlePinBackup}
                    disabled={isPinLoading || studentId.length < 5 || pin.length < 4}
                    className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-[#0c3f79] to-[#0a3466] hover:from-[#0a3466] hover:to-[#002855] disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isPinLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    <span>{isPinLoading ? 'Yedekleniyor...' : 'Buluta Güvenle Yedekle'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePinRestore}
                    disabled={isPinLoading || studentId.length < 5 || pin.length < 4}
                    className="w-full py-2.5 px-4 rounded-xl bg-linear-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {isPinLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{isPinLoading ? 'Geri Yükleniyor...' : 'Yedeği Cihaza Yükle'}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Alt Bilgi */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Kişisel şifre gerektirmez, veriler uçtan uca korunur.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
