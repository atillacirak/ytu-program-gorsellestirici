import {
  NormalizedCourseSlot,
  ProfileLiveStatus,
  ProfileSchedulePayload,
  UygunMusunProfile,
  MutualAvailabilitySummary,
  MutualFreeWindow,
  ProfileColorKey,
  CustomStatusOverride,
} from '../types/uygunMusun';

export const WEEKDAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'] as const;
export const ALL_DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'] as const;

export const PROFILE_THEMES: Record<
  ProfileColorKey,
  {
    name: string;
    bg: string;
    softBg: string;
    text: string;
    border: string;
    ring: string;
    badgeBg: string;
    gradient: string;
  }
> = {
  blue: {
    name: 'Mavi',
    bg: 'bg-blue-600',
    softBg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    ring: 'ring-blue-500',
    badgeBg: 'bg-blue-100 text-blue-800',
    gradient: 'from-blue-600 to-indigo-700',
  },
  violet: {
    name: 'Mor',
    bg: 'bg-violet-600',
    softBg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    ring: 'ring-violet-500',
    badgeBg: 'bg-violet-100 text-violet-800',
    gradient: 'from-violet-600 to-purple-700',
  },
  rose: {
    name: 'Pembe',
    bg: 'bg-rose-600',
    softBg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'ring-rose-500',
    badgeBg: 'bg-rose-100 text-rose-800',
    gradient: 'from-rose-600 to-pink-700',
  },
  emerald: {
    name: 'Yeşil',
    bg: 'bg-emerald-600',
    softBg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    ring: 'ring-emerald-500',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    gradient: 'from-emerald-600 to-teal-700',
  },
  amber: {
    name: 'Kehribar',
    bg: 'bg-amber-500',
    softBg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    ring: 'ring-amber-500',
    badgeBg: 'bg-amber-100 text-amber-900',
    gradient: 'from-amber-500 to-orange-600',
  },
  cyan: {
    name: 'Turkuaz',
    bg: 'bg-cyan-600',
    softBg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    ring: 'ring-cyan-500',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    gradient: 'from-cyan-600 to-sky-700',
  },
};

export interface StatusPresetItem {
  id: string;
  emoji: string;
  label: string;
  defaultNote: string;
  earlyExit?: boolean;
}

export const STATUS_PRESETS: StatusPresetItem[] = [
  {
    id: 'early_exit',
    emoji: '⚡',
    label: 'Ders Erken Bitti',
    defaultNote: 'Hoca dersi erken bıraktı, şu an boşum!',
    earlyExit: true,
  },
  {
    id: 'library',
    emoji: '📚',
    label: 'Kütüphanedeyim',
    defaultNote: 'Merkez kütüphanedeyim, çalışıyorum.',
  },
  {
    id: 'coffee',
    emoji: '☕',
    label: 'Orta Bahçe / Kahve',
    defaultNote: 'Orta bahçedeyim, kahveye beklerim ☕',
  },
  {
    id: 'dining',
    emoji: '🍽️',
    label: 'Yemekhanedeyim',
    defaultNote: 'Yemekhanedeyim, yemeğe geçtim.',
  },
  {
    id: 'on_way',
    emoji: '🚌',
    label: 'Kampüse Geliyorum',
    defaultNote: 'Yoldayım, birazdan kampüste olacağım.',
  },
  {
    id: 'studying',
    emoji: '🎧',
    label: 'Odaklandım',
    defaultNote: 'Kulaklık takılı, derse/projeye odaklandım.',
  },
  {
    id: 'home',
    emoji: '🏠',
    label: 'Kampüste Değilim',
    defaultNote: 'Bugün kampüste değilim / çıktım.',
  },
];

export function normalizeDayKey(d: string): string {
  return (d || '')
    .toLowerCase()
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ç/g, 'c')
    .trim();
}

export function getTurkishDayNameFromDate(date: Date): string {
  const jsDay = date.getDay(); // 0: Pazar, 1: Pazartesi ... 6: Cumartesi
  const map: Record<number, string> = {
    1: 'Pazartesi',
    2: 'Salı',
    3: 'Çarşamba',
    4: 'Perşembe',
    5: 'Cuma',
    6: 'Cumartesi',
    0: 'Pazar',
  };
  return map[jsDay] || 'Pazartesi';
}

export function toMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const cleaned = timeStr.trim().replace('.', ':');
  const parts = cleaned.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1] || '0', 10) || 0;
  return h * 60 + m;
}

export function minutesToTimeStr(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDurationTr(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes <= 0) return '0 dk';
  const rounded = Math.round(minutes);
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} saat`;
  return `${h} sa ${m} dk`;
}

/**
 * Bir profilin belirli bir gündeki derslerini normalize edilmiş ve sıralı dizi olarak döndürür.
 */
export function getDayCourses(
  schedulePayload: ProfileSchedulePayload | null | undefined,
  dayName: string
): NormalizedCourseSlot[] {
  if (!schedulePayload || !schedulePayload.schedule) return [];

  const targetNorm = normalizeDayKey(dayName);
  const matchingKey = Object.keys(schedulePayload.schedule).find(
    (k) => normalizeDayKey(k) === targetNorm
  );
  if (!matchingKey) return [];

  const rawList = schedulePayload.schedule[matchingKey];
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  const slots: NormalizedCourseSlot[] = [];

  for (const item of rawList) {
    let startStr = item.start_time || '';
    let endStr = item.end_time || '';

    if ((!startStr || !endStr) && typeof item.time === 'string' && item.time.includes('-')) {
      const [s, e] = item.time.split('-').map((x: string) => x.trim());
      startStr = s || '';
      endStr = e || '';
    }

    if (!startStr || !endStr) continue;

    const startM = toMinutes(startStr);
    const endM = toMinutes(endStr);
    if (endM <= startM) continue;

    const isOnline = Boolean(
      item.is_online ||
      (item.classroom && /online/i.test(item.classroom)) ||
      (item.name && /online/i.test(item.name)) ||
      (item.code && /online/i.test(item.code))
    );

    slots.push({
      code: item.code || 'DERS',
      name: item.name || item.code || 'Ders',
      section: item.section || '1',
      classroom: item.classroom || '',
      instructor: item.instructor || '',
      start_time: minutesToTimeStr(startM),
      end_time: minutesToTimeStr(endM),
      start_minutes: startM,
      end_minutes: endM,
      is_lab: Boolean(item.is_lab || (item.classroom && /lab/i.test(item.classroom))),
      is_online: isOnline,
    });
  }

  slots.sort((a, b) => a.start_minutes - b.start_minutes);

  // Aynı dersin arka arkaya (örn. 09:00-09:50 ve 10:00-10:50) parçalı bloklarını birleştir
  const merged: NormalizedCourseSlot[] = [];
  for (const slot of slots) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.code === slot.code &&
      prev.classroom === slot.classroom &&
      slot.start_minutes - prev.end_minutes <= 15
    ) {
      prev.end_minutes = Math.max(prev.end_minutes, slot.end_minutes);
      prev.end_time = minutesToTimeStr(prev.end_minutes);
    } else {
      merged.push({ ...slot });
    }
  }

  return merged;
}

/**
 * Geçerli manuel durum notunu (süresi dolmadıysa) döndürür.
 */
export function getActiveCustomStatus(
  profile: UygunMusunProfile,
  nowEpochMs: number
): CustomStatusOverride | null {
  const cs = profile.custom_status;
  if (!cs) return null;
  if (cs.expires_at && nowEpochMs > cs.expires_at) {
    return null;
  }
  return cs;
}

/**
 * Bir dersin "Ders Erken Bitti" işaretiyle erken sonlandırılıp sonlandırılmadığını kontrol eder.
 */
export function isCourseEarlyDismissed(
  slot: NormalizedCourseSlot,
  activeStatus: CustomStatusOverride | null,
  dayName: string
): boolean {
  if (!activeStatus || !activeStatus.early_exit) return false;
  if (
    activeStatus.early_exit_day &&
    normalizeDayKey(activeStatus.early_exit_day) !== normalizeDayKey(dayName)
  ) {
    return false;
  }
  if (activeStatus.early_exit_until) {
    const untilM = toMinutes(activeStatus.early_exit_until);
    return slot.start_minutes < untilM && slot.end_minutes <= untilM + 5;
  }
  return true;
}

/**
 * Bir profilin o anki canlı ders/boşluk durumunu, kalan dakikasını ve özet mesajını hesaplar.
 */
export function calculateProfileLiveStatus(
  profile: UygunMusunProfile,
  dayName: string,
  currentMinutes: number,
  nowEpochMs: number = Date.now()
): ProfileLiveStatus {
  const activeCustomStatus = getActiveCustomStatus(profile, nowEpochMs);

  if (!profile.schedule || !profile.schedule.schedule) {
    return {
      state: 'NO_SCHEDULE',
      isAvailableNow: true,
      isEarlyExitActive: false,
      earlyDismissedClass: null,
      currentClass: null,
      nextClass: null,
      remainingMinutes: null,
      progressPercent: 0,
      freeUntilTime: null,
      busyUntilTime: null,
      headline: 'Program Yüklenmedi',
      subheadline: `${profile.name} için henüz ders programı eklenmemiş.`,
      activeCustomStatus,
      todaySlots: [],
      completedClassesCount: 0,
      totalClassesToday: 0,
    };
  }

  const todaySlots = getDayCourses(profile.schedule, dayName);

  if (todaySlots.length === 0) {
    return {
      state: 'DAY_OFF',
      isAvailableNow: true,
      isEarlyExitActive: false,
      earlyDismissedClass: null,
      currentClass: null,
      nextClass: null,
      remainingMinutes: null,
      progressPercent: 100,
      freeUntilTime: 'Gün boyu',
      busyUntilTime: null,
      headline: 'Bugün Dersi Yok 🏖️',
      subheadline: `${dayName} günü programda ders görünmüyor, tamamen müsait.`,
      activeCustomStatus,
      todaySlots: [],
      completedClassesCount: 0,
      totalClassesToday: 0,
    };
  }

  // O an içinde bulunulan dersi bul
  let rawCurrentClass: NormalizedCourseSlot | null = null;
  for (const slot of todaySlots) {
    if (currentMinutes >= slot.start_minutes && currentMinutes < slot.end_minutes) {
      rawCurrentClass = slot;
      break;
    }
  }

  let earlyDismissedClass: NormalizedCourseSlot | null = null;
  let effectiveCurrentClass: NormalizedCourseSlot | null = rawCurrentClass;

  if (rawCurrentClass && isCourseEarlyDismissed(rawCurrentClass, activeCustomStatus, dayName)) {
    earlyDismissedClass = rawCurrentClass;
    effectiveCurrentClass = null;
  }

  const completedClassesCount = todaySlots.filter(
    (s) =>
      s.end_minutes <= currentMinutes ||
      (earlyDismissedClass && s.start_minutes === earlyDismissedClass.start_minutes)
  ).length;

  // 1. DURUM: ŞU AN DERSTE
  if (effectiveCurrentClass) {
    const remaining = Math.max(1, effectiveCurrentClass.end_minutes - currentMinutes);
    const totalDur = Math.max(1, effectiveCurrentClass.end_minutes - effectiveCurrentClass.start_minutes);
    const elapsed = Math.max(0, currentMinutes - effectiveCurrentClass.start_minutes);
    const progress = Math.min(100, Math.max(0, Math.round((elapsed / totalDur) * 100)));

    const upcomingAfterCurrent = todaySlots.filter(
      (s) => s.start_minutes >= effectiveCurrentClass!.end_minutes
    );
    const nextClass = upcomingAfterCurrent.length > 0 ? upcomingAfterCurrent[0] : null;

    if (effectiveCurrentClass.is_online) {
      return {
        state: 'ONLINE_CLASS',
        isAvailableNow: true,
        isEarlyExitActive: false,
        earlyDismissedClass: null,
        currentClass: effectiveCurrentClass,
        nextClass,
        remainingMinutes: remaining,
        progressPercent: progress,
        freeUntilTime: nextClass ? nextClass.start_time : 'Gün boyu',
        busyUntilTime: null,
        headline: `💻 Online Ders • ${formatDurationTr(remaining)} kaldı (Müsait)`,
        subheadline: `${effectiveCurrentClass.name} (${effectiveCurrentClass.code}) • Online ders olduğu için müsait sayılır`,
        activeCustomStatus,
        todaySlots,
        completedClassesCount,
        totalClassesToday: todaySlots.length,
      };
    }

    return {
      state: 'IN_CLASS',
      isAvailableNow: false,
      isEarlyExitActive: false,
      earlyDismissedClass: null,
      currentClass: effectiveCurrentClass,
      nextClass,
      remainingMinutes: remaining,
      progressPercent: progress,
      freeUntilTime: null,
      busyUntilTime: effectiveCurrentClass.end_time,
      headline: `Şu an derste • ${formatDurationTr(remaining)} kaldı`,
      subheadline: `${effectiveCurrentClass.name} (${effectiveCurrentClass.code})${
        effectiveCurrentClass.classroom ? ` • 📍 ${effectiveCurrentClass.classroom}` : ''
      } • ${effectiveCurrentClass.end_time}'de bitiyor`,
      activeCustomStatus,
      todaySlots,
      completedClassesCount,
      totalClassesToday: todaySlots.length,
    };
  }

  // Şu an derste değilse, sıradaki ilk dersi bul
  const futureSlots = todaySlots.filter((s) => s.start_minutes > currentMinutes);
  const nextClass = futureSlots.length > 0 ? futureSlots[0] : null;

  // 2. DURUM: GÜNÜN İLK DERSİNDEN ÖNCE VEYA İKİ DERS ARASI BOŞLUK
  if (nextClass) {
    const freeMins = Math.max(1, nextClass.start_minutes - currentMinutes);
    const isBeforeFirst =
      completedClassesCount === 0 && !earlyDismissedClass && currentMinutes < todaySlots[0].start_minutes;

    const stateType = isBeforeFirst ? 'BEFORE_FIRST_CLASS' : 'FREE_UNTIL_NEXT';

    return {
      state: stateType,
      isAvailableNow: true,
      isEarlyExitActive: Boolean(earlyDismissedClass),
      earlyDismissedClass,
      currentClass: null,
      nextClass,
      remainingMinutes: freeMins,
      progressPercent: Math.round((completedClassesCount / todaySlots.length) * 100),
      freeUntilTime: nextClass.start_time,
      busyUntilTime: null,
      headline: earlyDismissedClass
        ? `Erken Çıktı • ${formatDurationTr(freeMins)} boş`
        : `Şu an boş • ${formatDurationTr(freeMins)} müsait`,
      subheadline: `${nextClass.start_time}'da ${nextClass.name} (${nextClass.code}) başlayacak`,
      activeCustomStatus,
      todaySlots,
      completedClassesCount,
      totalClassesToday: todaySlots.length,
    };
  }

  // 3. DURUM: BUGÜNKÜ TÜM DERSLER BİTTİ
  const lastClass = todaySlots[todaySlots.length - 1];
  return {
    state: 'DONE_FOR_TODAY',
    isAvailableNow: true,
    isEarlyExitActive: Boolean(earlyDismissedClass),
    earlyDismissedClass,
    currentClass: null,
    nextClass: null,
    remainingMinutes: null,
    progressPercent: 100,
    freeUntilTime: 'Gün boyu',
    busyUntilTime: null,
    headline: earlyDismissedClass
      ? 'Son Dersi Erken Bitti! 🎉'
      : 'Bugünkü Dersleri Bitti! 🎉',
    subheadline: `Son ders ${lastClass.end_time}'de tamamlandı. Günün geri kalanında serbest.`,
    activeCustomStatus,
    todaySlots,
    completedClassesCount: todaySlots.length,
    totalClassesToday: todaySlots.length,
  };
}

/**
 * Seçili profillerin o günkü ortak boş zaman pencerelerini ve anlık buluşma durumunu hesaplar.
 */
export function calculateMutualAvailability(
  profiles: UygunMusunProfile[],
  dayName: string,
  currentMinutes: number,
  nowEpochMs: number = Date.now()
): MutualAvailabilitySummary {
  const activeProfiles = profiles.filter((p) => p.schedule && p.schedule.schedule);
  if (activeProfiles.length < 2) {
    return {
      allAvailableNow: false,
      sharedFreeMinutesNow: null,
      sharedFreeUntil: null,
      nextSharedWindow: null,
      minutesUntilNextSharedWindow: null,
      headline: 'Ortak Boşluk İçin En Az 2 Program Gerekli',
      detail: 'Hem kendi programını hem de arkadaşının programını yüklediğinde ortak boş saatler burada görünür.',
      todayMutualWindows: [],
    };
  }

  // 08:00 (480) ile 19:00 (1140) arası 10'ar dakikalık dilimlerle herkesin boş olduğu aralıkları tara
  const DAY_START = 8 * 60;
  const DAY_END = 19 * 60;
  const STEP = 5;

  const profileBusyIntervals: { start: number; end: number }[][] = activeProfiles.map((p) => {
    const slots = getDayCourses(p.schedule, dayName);
    const activeCS = getActiveCustomStatus(p, nowEpochMs);
    return slots
      .map((s) => {
        // Online ders fiziksel meşguliyet sayılmaz, müsait kabul edilir
        if (s.is_online) {
          return { start: s.start_minutes, end: s.start_minutes };
        }
        if (isCourseEarlyDismissed(s, activeCS, dayName)) {
          // Ders erken bittiyse şu andan sonrası boş kabul edilir
          const effectiveEnd = Math.min(s.end_minutes, currentMinutes);
          return { start: s.start_minutes, end: effectiveEnd };
        }
        return { start: s.start_minutes, end: s.end_minutes };
      })
      .filter((iv) => iv.end > iv.start);
  });

  const isEveryoneFreeAt = (minuteMark: number): boolean => {
    for (const intervals of profileBusyIntervals) {
      for (const iv of intervals) {
        if (minuteMark >= iv.start && minuteMark < iv.end) {
          return false;
        }
      }
    }
    return true;
  };

  const windows: MutualFreeWindow[] = [];
  let winStart: number | null = null;

  for (let m = DAY_START; m < DAY_END; m += STEP) {
    const free = isEveryoneFreeAt(m);
    if (free) {
      if (winStart === null) winStart = m;
    } else {
      if (winStart !== null) {
        const dur = m - winStart;
        if (dur >= 20) {
          windows.push({
            start_time: minutesToTimeStr(winStart),
            end_time: minutesToTimeStr(m),
            start_minutes: winStart,
            end_minutes: m,
            duration_minutes: dur,
            is_current: currentMinutes >= winStart && currentMinutes < m,
          });
        }
        winStart = null;
      }
    }
  }

  if (winStart !== null) {
    const dur = DAY_END - winStart;
    if (dur >= 20) {
      windows.push({
        start_time: minutesToTimeStr(winStart),
        end_time: minutesToTimeStr(DAY_END),
        start_minutes: winStart,
        end_minutes: DAY_END,
        duration_minutes: dur,
        is_current: currentMinutes >= winStart && currentMinutes < DAY_END,
      });
    }
  }

  const statuses = activeProfiles.map((p) => ({
    profile: p,
    status: calculateProfileLiveStatus(p, dayName, currentMinutes, nowEpochMs),
  }));

  const allAvailableNow = statuses.every((x) => x.status.isAvailableNow);

  if (allAvailableNow) {
    // Bir sonraki ilk başlayacak dersi bul (herhangi bir profil için)
    const nextClassStarts = statuses
      .map((x) => x.status.nextClass?.start_minutes)
      .filter((m): m is number => typeof m === 'number' && m > currentMinutes);

    if (nextClassStarts.length > 0) {
      const earliestNext = Math.min(...nextClassStarts);
      const sharedMins = Math.max(1, earliestNext - currentMinutes);
      const untilStr = minutesToTimeStr(earliestNext);
      const whoHasClass = statuses.find((x) => x.status.nextClass?.start_minutes === earliestNext);

      return {
        allAvailableNow: true,
        sharedFreeMinutesNow: sharedMins,
        sharedFreeUntil: untilStr,
        nextSharedWindow: windows.find((w) => w.is_current) || null,
        minutesUntilNextSharedWindow: 0,
        headline: `İkiniz de şu an uygunsunuz! • ${formatDurationTr(sharedMins)} ortak vakit ☕`,
        detail: `Saat ${untilStr}'a kadar ikiniz de boşsunuz${
          whoHasClass ? ` (${untilStr}'da ${whoHasClass.profile.name} derse girecek)` : ''
        }.`,
        todayMutualWindows: windows,
      };
    }

    return {
      allAvailableNow: true,
      sharedFreeMinutesNow: null,
      sharedFreeUntil: 'Gün boyu',
      nextSharedWindow: windows.find((w) => w.is_current) || null,
      minutesUntilNextSharedWindow: 0,
      headline: 'İkiniz de günün geri kalanında tamamen serbestsiniz! 🎉',
      detail: 'Bugün ikinizin de başka dersi kalmadı, dilediğiniz gibi plan yapabilirsiniz.',
      todayMutualWindows: windows,
    };
  }

  // En az bir kişi dersteyse, bir sonraki ortak boşluğu bul
  const busyProfiles = statuses.filter((x) => !x.status.isAvailableNow);
  const futureWindows = windows.filter((w) => w.end_minutes > currentMinutes);
  const nextWin = futureWindows.length > 0 ? futureWindows[0] : null;
  const minsUntilNext = nextWin ? Math.max(1, nextWin.start_minutes - currentMinutes) : null;

  if (busyProfiles.length === 1) {
    const busyOne = busyProfiles[0];
    const freeOnes = statuses.filter((x) => x.status.isAvailableNow).map((x) => x.profile.name);
    const rem = busyOne.status.remainingMinutes || 0;
    return {
      allAvailableNow: false,
      sharedFreeMinutesNow: 0,
      sharedFreeUntil: null,
      nextSharedWindow: nextWin,
      minutesUntilNextSharedWindow: minsUntilNext,
      headline: `${freeOnes.join(' & ')} müsait, ${busyOne.profile.name} ${formatDurationTr(rem)} sonra çıkıyor`,
      detail: `${busyOne.profile.name} şu an ${busyOne.status.currentClass?.name || 'derste'} (${
        busyOne.status.busyUntilTime
      }'de bitiyor).${
        nextWin ? ` Ortak boşluk: ${nextWin.start_time} - ${nextWin.end_time}.` : ''
      }`,
      todayMutualWindows: windows,
    };
  }

  return {
    allAvailableNow: false,
    sharedFreeMinutesNow: 0,
    sharedFreeUntil: null,
    nextSharedWindow: nextWin,
    minutesUntilNextSharedWindow: minsUntilNext,
    headline: nextWin
      ? `Şu an derstesiniz • ${formatDurationTr(minsUntilNext)} sonra ortak boşluk`
      : 'Şu an ikiniz de derstesiniz',
    detail: nextWin
      ? `İlk ortak boş saat aralığınız: ${nextWin.start_time} - ${nextWin.end_time} (${formatDurationTr(
          nextWin.duration_minutes
        )}).`
      : 'Bugün ders saatleri içinde çakışan başka ortak boşluk görünmüyor.',
    todayMutualWindows: windows,
  };
}

/**
 * Atilla ve Neva'nın gerçek ders programları (Görsellerden çıkarıldı).
 */
export const DEMO_SCHEDULES: Record<'atilla' | 'neva', ProfileSchedulePayload> = {
  atilla: {
    term: '2026-2027 Güz',
    title: 'Atilla Ders Programı',
    schedule: {
      Pazartesi: [
        {
          code: 'BLM2642',
          name: 'Bilgisayar Mühendisleri için Diferansiyel Denklemler',
          section: '2',
          classroom: 'EEF-D-B11',
          instructor: 'MKY',
          start_time: '13:00',
          end_time: '15:50',
          is_lab: false,
          is_online: false,
        },
        {
          code: 'BLM1991',
          name: 'İş Sağlığı ve Güvenliği 1',
          section: '1',
          classroom: 'Online',
          instructor: 'ST',
          start_time: '16:00',
          end_time: '17:50',
          is_lab: false,
          is_online: true,
        },
      ],
      Salı: [
        {
          code: 'BLM2611',
          name: 'Lojik Devreler',
          section: '2',
          classroom: 'EEF-D-012',
          instructor: 'HOI',
          start_time: '13:00',
          end_time: '15:50',
          is_lab: false,
          is_online: false,
        },
        {
          code: 'BLM2611',
          name: 'Lojik Devreler Lab',
          section: '2',
          classroom: 'LAB (BLM LAB)',
          instructor: 'HOI',
          start_time: '16:00',
          end_time: '17:50',
          is_lab: true,
          is_online: false,
        },
      ],
      Çarşamba: [
        {
          code: 'BLM2012',
          name: 'Nesneye Yönelik Programlama',
          section: '2',
          classroom: 'EEF-D-B11',
          instructor: 'FC',
          start_time: '09:00',
          end_time: '11:50',
          is_lab: false,
          is_online: false,
        },
        {
          code: 'BLM2012',
          name: 'Nesneye Yönelik Programlama Lab',
          section: '2',
          classroom: 'LAB (BLM LAB)',
          instructor: 'FC',
          start_time: '15:00',
          end_time: '16:50',
          is_lab: true,
          is_online: false,
        },
      ],
      Perşembe: [
        {
          code: 'BLM1011',
          name: 'Bilgisayar Bilimlerine Giriş',
          section: '1',
          classroom: 'EEF-D-108',
          instructor: 'MAG',
          start_time: '09:00',
          end_time: '11:50',
          is_lab: false,
          is_online: false,
        },
        {
          code: 'BLM1011',
          name: 'Bilgisayar Bilimlerine Giriş Lab',
          section: '1',
          classroom: 'LAB (BLM LAB)',
          instructor: 'MAG',
          start_time: '13:00',
          end_time: '14:50',
          is_lab: true,
          is_online: false,
        },
      ],
      Cuma: [
        {
          code: 'BLM3042',
          name: 'Seminer ve Meslek Etiği',
          section: '1',
          classroom: 'EEF-D-110',
          instructor: 'HTK',
          start_time: '14:00',
          end_time: '16:50',
          is_lab: false,
          is_online: false,
        },
      ],
    },
  },
  neva: {
    term: '2026-2027 Güz',
    title: 'Neva Ders Programı',
    schedule: {
      Pazartesi: [
        {
          code: 'SYP1061',
          name: 'Dijital Ortamda Tasarım Yöntemleri',
          section: '1',
          classroom: 'C2008 (SANAT)',
          instructor: '',
          start_time: '13:00',
          end_time: '16:50',
          is_lab: false,
          is_online: false,
        },
      ],
      Salı: [
        {
          code: 'SYP1041',
          name: 'Sanat Tarihine Giriş',
          section: '1',
          classroom: 'STF B2032',
          instructor: '',
          start_time: '13:00',
          end_time: '14:50',
          is_lab: false,
          is_online: false,
        },
        {
          code: 'TDB1031',
          name: 'Türkçe 1',
          section: '33',
          classroom: 'TDB2[ONLINE]',
          instructor: '',
          start_time: '15:00',
          end_time: '16:50',
          is_lab: false,
          is_online: true,
        },
      ],
      Çarşamba: [
        {
          code: 'SYP1092',
          name: 'Bilgi Yönetimi',
          section: '1',
          classroom: 'STF B1025',
          instructor: '',
          start_time: '10:00',
          end_time: '11:50',
          is_lab: false,
          is_online: false,
        },
        {
          code: 'SYP2111',
          name: 'İşletmeye Giriş',
          section: '1',
          classroom: 'STF B2032',
          instructor: '',
          start_time: '12:00',
          end_time: '13:50',
          is_lab: false,
          is_online: false,
        },
        {
          code: 'SYP1071',
          name: 'Sanat Yönetimi 1',
          section: '1',
          classroom: 'STF B2033',
          instructor: '',
          start_time: '14:00',
          end_time: '16:50',
          is_lab: false,
          is_online: false,
        },
      ],
      Perşembe: [
        {
          code: 'BSP1101',
          name: 'Temel Tasarım 1',
          section: '6',
          classroom: 'STF B2033',
          instructor: '',
          start_time: '09:00',
          end_time: '15:50',
          is_lab: false,
          is_online: false,
        },
      ],
      Cuma: [],
    },
  },
};
