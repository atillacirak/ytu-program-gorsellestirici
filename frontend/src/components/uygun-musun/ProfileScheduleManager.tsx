"use client";

import React, { useState } from 'react';
import {
  Upload,
  UserPlus,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Share2,
  Copy,
  Check,
  FileText,
  AlertCircle,
  Download,
} from 'lucide-react';
import {
  ProfileColorKey,
  ProfileSchedulePayload,
  UygunMusunProfile,
} from '../../types/uygunMusun';
import {
  PROFILE_THEMES,
  DEMO_SCHEDULES,
} from '../../utils/uygunMusunEngine';
import { extractMetadataFromPngArrayBuffer } from '../../utils/pngMetadata';
import { parseScheduleImageWithOcr } from '../../utils/pngOcrParser';

interface ProfileScheduleManagerProps {
  profiles: UygunMusunProfile[];
  myProfileId: string;
  onSetMyProfileId: (id: string) => void;
  roomCode: string;
  onChangeRoomCode: (code: string) => void;
  onUpdateProfile: (profile: UygunMusunProfile) => Promise<void> | void;
  onAddProfile: (newProfile: UygunMusunProfile) => Promise<void> | void;
  onRemoveProfile: (profileId: string) => Promise<void> | void;
  onLoadDemoSchedules: () => Promise<void> | void;
  apiBase: string;
}

const AVATAR_OPTIONS = ['👨‍💻', '👩‍🎓', '🦊', '🐱', '🚀', '🌸', '⚡', '☕', '🎧', '🌟'];
const COLOR_KEYS: ProfileColorKey[] = ['blue', 'violet', 'rose', 'emerald', 'amber', 'cyan'];

export default function ProfileScheduleManager({
  profiles,
  myProfileId,
  onSetMyProfileId,
  roomCode,
  onChangeRoomCode,
  onUpdateProfile,
  onAddProfile,
  onRemoveProfile,
  onLoadDemoSchedules,
  apiBase,
}: ProfileScheduleManagerProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string | null>>({});
  const [roomInput, setRoomInput] = useState(roomCode);
  const [copiedLink, setCopiedLink] = useState(false);

  const parseScheduleFile = async (file: File): Promise<ProfileSchedulePayload> => {
    let parsedData: any = null;

    if (file.name.toLowerCase().endsWith('.png')) {
      const buffer = await file.arrayBuffer();
      parsedData = extractMetadataFromPngArrayBuffer(buffer);
    }

    if (!parsedData && file.name.toLowerCase().match(/\.(png|jpg|jpeg)$/)) {
      try {
        parsedData = await parseScheduleImageWithOcr(file);
      } catch (ocrErr) {
        console.warn('OCR fallback error:', ocrErr);
      }
    }

    if (!parsedData) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiBase}/api/parse-schedule-file`, {
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

  const handleFileChange = async (profile: UygunMusunProfile, file: File) => {
    setUploadingId(profile.id);
    setErrorById((prev) => ({ ...prev, [profile.id]: null }));
    try {
      const schedulePayload = await parseScheduleFile(file);
      await onUpdateProfile({
        ...profile,
        schedule: schedulePayload,
      });
    } catch (err: any) {
      setErrorById((prev) => ({
        ...prev,
        [profile.id]: err.message || 'Yükleme hatası',
      }));
    } finally {
      setUploadingId(null);
    }
  };

  const handleImportFromMainPage = async (profile: UygunMusunProfile) => {
    try {
      const raw = window.localStorage.getItem('ytu_visualizer_data');
      if (!raw) {
        alert('Ana sayfada kayıtlı bir ders programı bulunamadı. Lütfen PDF veya PNG seçin.');
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.schedule) {
        alert('Ana sayfadaki program verisi geçersiz.');
        return;
      }
      await onUpdateProfile({
        ...profile,
        schedule: {
          term: parsed.term || 'Aktif Dönem',
          title: parsed.title || 'Ana Sayfa Programı',
          schedule: parsed.schedule,
          courses_summary: parsed.courses_summary || [],
        },
      });
    } catch {
      alert('Program aktarılırken bir hata oluştu.');
    }
  };

  const handleAddNewFriend = async () => {
    if (profiles.length >= 6) {
      alert('En fazla 6 profil eklenebilir.');
      return;
    }
    const idx = profiles.length;
    const newProfile: UygunMusunProfile = {
      id: `friend_${Date.now()}`,
      name: `${idx + 1}. Arkadaş`,
      color: COLOR_KEYS[idx % COLOR_KEYS.length],
      avatar: AVATAR_OPTIONS[idx % AVATAR_OPTIONS.length],
      schedule: null,
      custom_status: null,
    };
    await onAddProfile(newProfile);
  };

  const handleCopyShareLink = () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/uygun-musun?oda=${encodeURIComponent(roomCode)}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Oda / Eşleşme Kodu ve Paylaşım Kartı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0c3f79] text-white flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Ortak Oda Kodu &amp; Eşleşme
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Arkadaşınla aynı oda kodunu kullanarak programları ve anlık durum notlarını iki telefonda canlı eşitle.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Kopyalandı!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-700" />
                <span>Davet Linkini Kopyala</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            placeholder="Örn: atilla-neva"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-[#0c3f79] outline-none"
          />
          <button
            type="button"
            onClick={() => onChangeRoomCode(roomInput.trim() || 'atilla-neva')}
            className="px-4 py-2 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0"
          >
            Odayı Değiştir
          </button>
        </div>
      </div>

      {/* Hızlı Örnek Veri Yükleme ve Yeni Profil Ekleme */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          type="button"
          onClick={onLoadDemoSchedules}
          className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Örnek Programları Yükle (Hemen Test Et)</span>
        </button>

        <button
          type="button"
          onClick={handleAddNewFriend}
          disabled={profiles.length >= 6}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
        >
          <UserPlus className="w-3.5 h-3.5 text-amber-400" />
          <span>+ Yeni Profil Ekle ({profiles.length}/6)</span>
        </button>
      </div>

      {/* Profil Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {profiles.map((profile) => {
          const theme = PROFILE_THEMES[profile.color] || PROFILE_THEMES.blue;
          const isMe = profile.id === myProfileId;
          const hasSchedule = Boolean(profile.schedule && profile.schedule.schedule);
          const totalClasses = hasSchedule
            ? Object.values(profile.schedule!.schedule).reduce(
                (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
                0
              )
            : 0;
          const isUploading = uploadingId === profile.id;
          const errMsg = errorById[profile.id];

          return (
            <div
              key={profile.id}
              className={`rounded-2xl border bg-white p-4 shadow-xs space-y-3.5 transition-all ${
                isMe ? 'border-[#0c3f79] ring-2 ring-[#0c3f79]/15' : 'border-slate-200'
              }`}
            >
              {/* Üst Satır: Avatar, İsim Düzenleme ve "Bu Benim" Seçimi */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Avatar Seçici */}
                  <button
                    type="button"
                    title="Avatarı Değiştir"
                    onClick={() => {
                      const curIdx = AVATAR_OPTIONS.indexOf(profile.avatar);
                      const nextAvatar =
                        AVATAR_OPTIONS[(curIdx + 1) % AVATAR_OPTIONS.length];
                      onUpdateProfile({ ...profile, avatar: nextAvatar });
                    }}
                    className={`w-10 h-10 rounded-xl ${theme.bg} text-white text-lg flex items-center justify-center shrink-0 shadow-2xs cursor-pointer hover:scale-105 transition-transform`}
                  >
                    {profile.avatar}
                  </button>

                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) =>
                        onUpdateProfile({ ...profile, name: e.target.value })
                      }
                      className="w-full text-sm font-extrabold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0c3f79] outline-none truncate"
                      placeholder="İsim girin..."
                    />
                    <div className="flex items-center gap-1.5 mt-1">
                      {COLOR_KEYS.map((ck) => (
                        <button
                          key={ck}
                          type="button"
                          onClick={() => onUpdateProfile({ ...profile, color: ck })}
                          className={`w-3.5 h-3.5 rounded-full ${PROFILE_THEMES[ck].bg} cursor-pointer ${
                            profile.color === ck ? 'ring-2 ring-offset-1 ring-slate-900' : 'opacity-60'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSetMyProfileId(profile.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
                      isMe
                        ? 'bg-[#0c3f79] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isMe ? '✓ Benim Profilim' : 'Benim Seç'}
                  </button>

                  {profiles.length > 2 && (
                    <button
                      type="button"
                      onClick={() => onRemoveProfile(profile.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Profili Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Program Durumu */}
              <div
                className={`rounded-xl p-3 border text-xs ${
                  hasSchedule
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                {hasSchedule ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-extrabold truncate">
                          Program Yüklü ({totalClasses} ders bloğu)
                        </p>
                        <p className="text-[10px] text-emerald-700 truncate">
                          {profile.schedule?.title || profile.schedule?.term || 'Aktif Dönem'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="font-semibold">
                      Henüz ders programı yüklenmedi.
                    </span>
                  </div>
                )}
              </div>

              {errMsg && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 flex items-center gap-2 text-xs text-rose-700 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errMsg}</span>
                </div>
              )}

              {/* Yükleme Aksiyonları */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex-1 py-2 px-3 rounded-xl bg-[#0c3f79] hover:bg-[#002855] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer">
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Okunuyor...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>{hasSchedule ? 'Programı Güncelle (PDF/PNG)' : 'PDF veya PNG Yükle'}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={isUploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleFileChange(profile, f);
                        e.target.value = '';
                      }
                    }}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleImportFromMainPage(profile)}
                  className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Ana sayfada yüklü olan ders programını bu profile aktar"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ana Sayfadan Al</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
