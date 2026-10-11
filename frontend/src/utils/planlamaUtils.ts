import {
  CurriculumCourse,
  ElectiveOption,
  MoveValidationResult,
  SemesterBucket
} from '@/types/planlama';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

// Memoized cache for prerequisite code extraction so regex runs at most once per unique string
const _prereqCodeCache = new Map<string, string[]>();

export function extractPrereqCodes(prereqStr?: string): string[] {
  if (!prereqStr) return [];
  const cached = _prereqCodeCache.get(prereqStr);
  if (cached) return cached;

  const matches = prereqStr.toUpperCase().match(/\b[A-ZÇĞİÖŞÜ]{2,5}\s?\d{3,4}[A-Z]?\b/g);
  const result = matches
    ? Array.from(new Set(matches.map((m) => m.replace(/\s+/g, ''))))
    : [];
  _prereqCodeCache.set(prereqStr, result);
  return result;
}

export function normCourseCode(str?: string): string {
  return (str || '').toUpperCase().replace(/\s+/g, '');
}

// Build an O(1) lookup map from normalized elective course code -> official prerequisite string
export function buildElectivePrereqMap(
  electivePools: Record<string, ElectiveOption[]>
): Map<string, string> {
  const map = new Map<string, string>();
  Object.values(electivePools).forEach((pList) => {
    pList.forEach((opt) => {
      if (opt.prereq) {
        const key = normCourseCode(opt.code);
        if (key && !map.has(key)) {
          map.set(key, opt.prereq);
        }
      }
    });
  });
  return map;
}

// Resolve effective prerequisite string for any course (including chosen elective) in O(1)
export function resolveEffectivePrereqText(
  course: CurriculumCourse,
  electivePrereqMap: Map<string, string>
): string {
  if (course.selectedElectivePrereq) return course.selectedElectivePrereq;
  if (course.selectedElectiveCode) {
    const found = electivePrereqMap.get(normCourseCode(course.selectedElectiveCode));
    if (found) return found;
  }
  return course.prereq || '';
}

// Helper: Staj or 0-credit courses can be placed in ANY semester or summer school without restrictions
export function isStajOrZeroCreditCourse(c: {
  code?: string;
  name?: string;
  credits?: number;
}): boolean {
  const code = (c.code || '').toLocaleLowerCase('tr-TR');
  const name = (c.name || '').toLocaleLowerCase('tr-TR');
  return (
    code.includes('stj') ||
    code.includes('staj') ||
    name.includes('staj') ||
    Number(c.credits) === 0
  );
}

// Match an elective curriculum slot (e.g. USS-2G, MES1-3B, SOS1-3B, UMS-4G) to its exact Bologna elective pool(s)
export function getRelevantPoolsForSlot(
  course: CurriculumCourse,
  pools: Record<string, ElectiveOption[]>
): string[] {
  const poolNames = Object.keys(pools);
  if (poolNames.length <= 1) return poolNames;

  const code = course.code.toUpperCase();
  const name = course.name.toLocaleLowerCase('tr-TR');

  // 1. Üniversite Sosyal Seçmeli (USS)
  if (code.startsWith('USS') || (name.includes('üniversite') && name.includes('sosyal'))) {
    const matched = poolNames.filter((p) => {
      const pl = p.toLocaleLowerCase('tr-TR');
      return (pl.includes('üniversite') && pl.includes('sosyal')) || pl.includes('(uss)');
    });
    if (matched.length > 0) return matched;
  }

  // 2. Üniversite Mesleki Seçmeli (UMS)
  if (code.startsWith('UMS') || (name.includes('üniversite') && name.includes('meslek'))) {
    const matched = poolNames.filter((p) => {
      const pl = p.toLocaleLowerCase('tr-TR');
      return (pl.includes('üniversite') && pl.includes('meslek')) || pl.includes('(ums)');
    });
    if (matched.length > 0) return matched;
  }

  // 3. Sosyal Seçmeli (SOS - excluding Üniversite Sosyal)
  if (code.startsWith('SOS') || (name.includes('sosyal') && !name.includes('üniversite'))) {
    const sosPools = poolNames.filter((p) => {
      const pl = p.toLocaleLowerCase('tr-TR');
      return pl.includes('sosyal') && !pl.includes('üniversite');
    });
    const numMatch = code.match(/^SOS(\d+)/) || name.match(/seçmeli\s*(\d+)/);
    if (numMatch && sosPools.length > 1) {
      const grp = numMatch[1];
      const exact = sosPools.filter((p) => new RegExp(`\\b${grp}\\b|SOS${grp}`, 'i').test(p));
      if (exact.length > 0) return exact;
    }
    if (sosPools.length > 0) return sosPools;
  }

  // 4. Alan Seçmeli (ALS)
  if (code.startsWith('ALS') || name.includes('alan')) {
    const alsPools = poolNames.filter((p) => {
      const pl = p.toLocaleLowerCase('tr-TR');
      return pl.includes('alan') || pl.includes('als');
    });
    const numMatch = code.match(/^ALS(\d+)/) || name.match(/seçmeli\s*(\d+)/);
    if (numMatch && alsPools.length > 1) {
      const grp = numMatch[1];
      const exact = alsPools.filter((p) => new RegExp(`\\b${grp}\\b|ALS${grp}`, 'i').test(p));
      if (exact.length > 0) return exact;
    }
    if (alsPools.length > 0) return alsPools;
  }

  // 5. KOOP / İşletmede Mesleki Eğitim
  if (code.includes('KOOP') || name.includes('koop') || name.includes('işletmede')) {
    const koopPools = poolNames.filter((p) => p.toLocaleLowerCase('tr-TR').includes('koop'));
    if (koopPools.length > 0) return koopPools;
  }

  // 6. Mesleki Seçmeli (MES) or numbered Seçmeli
  const mesPools = poolNames.filter((p) => {
    const pl = p.toLocaleLowerCase('tr-TR');
    return (
      !pl.includes('üniversite') &&
      !pl.includes('sosyal') &&
      !pl.includes('koop') &&
      (pl.includes('meslek') ||
        pl.includes('mes') ||
        pl.includes('seçmeli') ||
        pl.includes('seçimlik'))
    );
  });

  const exactCodePool = mesPools.filter((p) => p.toUpperCase().includes(code));
  if (exactCodePool.length > 0) return exactCodePool;

  const grpMatch =
    code.match(/^MES(\d+)/) ||
    code.match(/^SEC(\d+)/) ||
    name.match(/(?:seçmeli|seçimlik)\s*(\d+)/);
  if (grpMatch && mesPools.length > 1) {
    const grp = grpMatch[1];
    const numbered = mesPools.filter((p) =>
      new RegExp(`(?:seçmeli|seçimlik|dersler|mes)\\s*-?\\s*${grp}(?:\\b|\\D)`, 'i').test(p)
    );
    if (numbered.length > 0) return numbered;
  }

  return mesPools.length > 0 ? mesPools : poolNames;
}

// Build standard 8 semesters from raw Bologna semester data
export function buildDefaultBuckets(semestersData: Record<string, any[]>): SemesterBucket[] {
  const initialBuckets: SemesterBucket[] = [];
  for (let sem = 1; sem <= 8; sem++) {
    const yr = Math.ceil(sem / 2);
    const season: 'Güz' | 'Bahar' = sem % 2 === 1 ? 'Güz' : 'Bahar';
    const rawCourses = semestersData[String(sem)] || [];
    const mappedCourses: CurriculumCourse[] = rawCourses.map((c, idx) => {
      const freeMove = isStajOrZeroCreditCourse(c);
      return {
        uid: `${sem}-${c.code}-${idx}`,
        code: c.code,
        name: c.name,
        credits: Number(c.credits) || 0,
        ects: Number(c.ects) || 0,
        prereq: c.prereq || '',
        defaultSemester: sem,
        termType: freeMove ? 'Her İkisi' : c.termType || season,
        strictTerm: freeMove ? 'Her İkisi' : c.strictTerm || season,
        isElective: Boolean(c.isElective),
        completed: false
      };
    });

    initialBuckets.push({
      id: `sem-${sem}`,
      year: yr,
      orderKey: yr + (season === 'Güz' ? 0.1 : 0.2),
      title: `${yr}. Sınıf · ${season} (${sem}. Yarıyıl)`,
      season,
      semesterNumber: sem,
      courses: mappedCourses
    });
  }
  return initialBuckets;
}

// Build compact snapshot object for localStorage (~1 KB)
export function buildCompactPlanPayload(
  bList: SemesterBucket[],
  uList: CurriculumCourse[],
  eList: CurriculumCourse[]
) {
  const allCourses = [...bList.flatMap((b) => b.courses), ...uList, ...eList];
  const overrides: Record<string, any> = {};
  const customCourses: CurriculumCourse[] = [];

  allCourses.forEach((c) => {
    if (c.uid.startsWith('custom-')) {
      customCourses.push(c);
    }
    const ov: Record<string, any> = {};
    if (c.completed) ov.d = 1;
    if (c.termType !== c.strictTerm && !(c.termType === 'Her İkisi' && !c.strictTerm)) {
      ov.tf = c.termType;
    }
    if (c.selectedElectiveCode) ov.ec = c.selectedElectiveCode;
    if (c.selectedElectiveName) ov.en = c.selectedElectiveName;
    if (c.selectedElectivePrereq) ov.ep = c.selectedElectivePrereq;
    if (c.grade) ov.g = c.grade;
    if (Object.keys(ov).length > 0) {
      overrides[c.uid] = ov;
    }
  });

  return {
    b: bList.map((b) => ({
      id: b.id,
      yr: b.year,
      ok: b.orderKey,
      t: b.title,
      s: b.season,
      sn: b.semesterNumber,
      ...(b.customLimit !== undefined ? { cl: b.customLimit } : {}),
      c: b.courses.map((c) => c.uid)
    })),
    u: uList.map((c) => c.uid),
    e: eList.map((c) => c.uid),
    ...(Object.keys(overrides).length > 0 ? { o: overrides } : {}),
    ...(customCourses.length > 0 ? { custom: customCourses } : {})
  };
}

// Hydrate compact saved plan onto canonical default buckets (for a specific scenario)
export function hydrateSavedPlan(
  semestersData: Record<string, any[]>,
  progId: string,
  scenarioId = 's1'
): {
  buckets: SemesterBucket[];
  unassigned: CurriculumCourse[];
  exempt: CurriculumCourse[];
  restored: boolean;
} {
  const defaultBuckets = buildDefaultBuckets(semestersData);
  try {
    let raw = localStorage.getItem(`ytu_plan_v2_${progId}_${scenarioId}`);
    if (!raw && scenarioId === 's1') {
      raw = localStorage.getItem(`ytu_plan_v2_${progId}`);
    }
    if (!raw) {
      return { buckets: defaultBuckets, unassigned: [], exempt: [], restored: false };
    }
    const snap = JSON.parse(raw);
    if (!snap || !Array.isArray(snap.b)) {
      return { buckets: defaultBuckets, unassigned: [], exempt: [], restored: false };
    }

    const courseMap = new Map<string, CurriculumCourse>();
    defaultBuckets.forEach((b) =>
      b.courses.forEach((c) => {
        courseMap.set(c.uid, { ...c });
      })
    );

    if (Array.isArray(snap.custom)) {
      snap.custom.forEach((cc: CurriculumCourse) => {
        if (cc && cc.uid) courseMap.set(cc.uid, cc);
      });
    }

    const overrides: Record<string, any> = snap.o || {};
    Object.entries(overrides).forEach(([uid, ov]) => {
      const existing = courseMap.get(uid);
      if (existing && ov) {
        if (ov.d !== undefined) existing.completed = Boolean(ov.d);
        if (ov.tf && !isStajOrZeroCreditCourse(existing)) existing.termType = ov.tf;
        if (ov.ec) existing.selectedElectiveCode = ov.ec;
        if (ov.en) existing.selectedElectiveName = ov.en;
        if (ov.ep) existing.selectedElectivePrereq = ov.ep;
        if (ov.g) existing.grade = ov.g;
      }
    });

    const placedUids = new Set<string>();

    const hydratedBuckets: SemesterBucket[] = snap.b.map((sb: any) => {
      const cList: CurriculumCourse[] = [];
      if (Array.isArray(sb.c)) {
        sb.c.forEach((uid: string) => {
          const cObj = courseMap.get(uid);
          if (cObj && !placedUids.has(uid)) {
            placedUids.add(uid);
            cList.push(cObj);
          }
        });
      }
      return {
        id: sb.id,
        year: sb.yr,
        orderKey: sb.ok,
        title: sb.t,
        season: sb.s,
        semesterNumber: sb.sn,
        customLimit: sb.cl,
        courses: cList
      };
    });

    const hydratedUnassigned: CurriculumCourse[] = [];
    if (Array.isArray(snap.u)) {
      snap.u.forEach((uid: string) => {
        const cObj = courseMap.get(uid);
        if (cObj && !placedUids.has(uid)) {
          placedUids.add(uid);
          hydratedUnassigned.push(cObj);
        }
      });
    }

    const hydratedExempt: CurriculumCourse[] = [];
    if (Array.isArray(snap.e)) {
      snap.e.forEach((uid: string) => {
        const cObj = courseMap.get(uid);
        if (cObj && !placedUids.has(uid)) {
          placedUids.add(uid);
          hydratedExempt.push(cObj);
        }
      });
    }

    courseMap.forEach((cObj, uid) => {
      if (!placedUids.has(uid) && !uid.startsWith('custom-')) {
        const targetSem = hydratedBuckets.find((b) => b.id === `sem-${cObj.defaultSemester}`);
        if (targetSem) {
          targetSem.courses.push(cObj);
        } else {
          hydratedUnassigned.push(cObj);
        }
      }
    });

    return {
      buckets: hydratedBuckets,
      unassigned: hydratedUnassigned,
      exempt: hydratedExempt,
      restored: true
    };
  } catch {
    return { buckets: defaultBuckets, unassigned: [], exempt: [], restored: false };
  }
}

export interface ValidateMoveOptions {
  buckets: SemesterBucket[];
  unassignedCourses: CurriculumCourse[];
  exemptCodeSet: Set<string>;
  electivePrereqMap: Map<string, string>;
  enforcePrereqRule: boolean;
  enforceSeasonRule: boolean;
  enforceCreditLimit: boolean;
  limitMetric: 'ects' | 'credits';
  regularMaxLimit: number;
  summerMaxLimit: number;
  summerMaxCourses: number;
}

export function validateCourseMove(
  course: CurriculumCourse,
  targetBucket: SemesterBucket,
  opts: ValidateMoveOptions
): MoveValidationResult {
  const {
    buckets,
    unassignedCourses,
    exemptCodeSet,
    electivePrereqMap,
    enforcePrereqRule,
    enforceSeasonRule,
    enforceCreditLimit,
    limitMetric,
    regularMaxLimit,
    summerMaxLimit,
    summerMaxCourses
  } = opts;

  if (targetBucket.courses.some((c) => c.uid === course.uid)) {
    return { allowed: false, reason: 'Ders zaten bu yarıyılda bulunuyor.' };
  }

  // 0. Official Bologna Prerequisite Check (A -> B chronological order)
  if (enforcePrereqRule) {
    const myCode = normCourseCode(course.selectedElectiveCode || course.code);
    const myTitle = `${course.selectedElectiveCode || course.code} (${
      course.selectedElectiveName || course.name
    })`;

    // 0a. Forward Check: Does `course` (B) have prerequisites (A) that must be completed BEFORE `targetBucket`?
    const prereqText = resolveEffectivePrereqText(course, electivePrereqMap);
    const reqCodes = extractPrereqCodes(prereqText);

    if (reqCodes.length > 0) {
      for (const reqCode of reqCodes) {
        if (exemptCodeSet.has(reqCode)) continue;

        const inPool = unassignedCourses.find(
          (uc) =>
            uc.uid !== course.uid &&
            (normCourseCode(uc.code) === reqCode ||
              normCourseCode(uc.selectedElectiveCode) === reqCode)
        );
        if (inPool) {
          return {
            allowed: false,
            warningType: 'prereq',
            shortHint: `Ön Koşul: ${reqCode} havuzda`,
            reason: `⛔ Ön Koşul Engeli: "${myTitle}" dersinin ön koşulu olan "${reqCode} (${inPool.name})" şu an Açıkta Kalan Dersler Havuzu'nda. Önce "${reqCode}" dersini daha önceki bir döneme yerleştirmelisiniz.`
          };
        }

        for (const b of buckets) {
          const reqCourse = b.courses.find(
            (bc) =>
              bc.uid !== course.uid &&
              (normCourseCode(bc.code) === reqCode ||
                normCourseCode(bc.selectedElectiveCode) === reqCode)
          );
          if (reqCourse) {
            if (targetBucket.orderKey <= b.orderKey) {
              return {
                allowed: false,
                warningType: 'prereq',
                shortHint: `Ön Koşul: Önce ${reqCode} alınmalı`,
                reason: `⛔ Ön Koşul Engeli: "${myTitle}" dersinin ön koşulu olan "${reqCode} (${
                  reqCourse.selectedElectiveName || reqCourse.name
                })" şu an ${b.title} döneminde bulunuyor. Ön koşullu dersi ancak "${reqCode}" dersinden sonraki bir dönemde alabilirsiniz.`
              };
            }
            break;
          }
        }
      }
    }

    // 0b. Reverse Check: Is `course` (A) a prerequisite for another course (B) placed in `targetBucket` or an EARLIER bucket?
    if (myCode) {
      for (const b of buckets) {
        for (const depCourse of b.courses) {
          if (depCourse.uid === course.uid) continue;
          const depReqCodes = extractPrereqCodes(
            resolveEffectivePrereqText(depCourse, electivePrereqMap)
          );
          if (depReqCodes.includes(myCode)) {
            if (targetBucket.orderKey >= b.orderKey) {
              const depCode = depCourse.selectedElectiveCode || depCourse.code;
              const depName = depCourse.selectedElectiveName || depCourse.name;
              return {
                allowed: false,
                warningType: 'prereq',
                shortHint: `${depCode} dersinin ön koşulu`,
                reason: `⛔ Ön Koşul Engeli: "${myCode}" dersi, ${b.title} dönemindeki "${depCode} (${depName})" dersinin ön koşuludur. Ön koşul dersini "${depCode}" dersinden sonraya veya aynı döneme taşıyamazsınız.`
              };
            }
          }
        }
      }
    }
  }

  if (isStajOrZeroCreditCourse(course)) {
    return { allowed: true };
  }

  // 1. Season rule check
  if (enforceSeasonRule && targetBucket.season !== 'Yaz') {
    if (course.termType !== 'Her İkisi' && course.termType !== targetBucket.season) {
      return {
        allowed: false,
        warningType: 'season',
        reason: `"${course.code} - ${course.name}" bir ${course.termType} dönemi dersidir; ${targetBucket.season} yarıyılına konulamaz (Sadece ${course.termType} dönemlerine veya Yaz Okulu'na eklenebilir).`
      };
    }
  }

  // 2. Summer course count check
  if (enforceCreditLimit && targetBucket.season === 'Yaz') {
    const nonStajCount = targetBucket.courses.filter((c) => !isStajOrZeroCreditCourse(c)).length;
    if (nonStajCount >= summerMaxCourses) {
      return {
        allowed: false,
        warningType: 'limit',
        reason: `Yaz Okulu'nda en fazla ${summerMaxCourses} kredili ders alınabilir (Üst ayarlardan sınırı değiştirebilirsiniz).`
      };
    }
  }

  // 3. Credit / ECTS limit check
  if (enforceCreditLimit) {
    const isSummerBucket = targetBucket.season === 'Yaz';
    const useEcts = !isSummerBucket && limitMetric === 'ects';
    const currentTotal = targetBucket.courses.reduce(
      (acc, c) => acc + (useEcts ? c.ects : c.credits),
      0
    );
    const courseVal = useEcts ? course.ects : course.credits;
    const maxAllowed =
      targetBucket.customLimit ?? (isSummerBucket ? summerMaxLimit : regularMaxLimit);
    const bucketUnitLabel = useEcts ? 'AKTS' : 'Kredi';

    if (currentTotal + courseVal > maxAllowed) {
      return {
        allowed: false,
        warningType: 'limit',
        reason: `${targetBucket.title} için ${bucketUnitLabel} sınırı aşılıyor! (Mevcut: ${currentTotal} + Ders: ${courseVal} = ${
          currentTotal + courseVal
        } > Sınır: ${maxAllowed} ${bucketUnitLabel}).`
      };
    }
  }

  return { allowed: true };
}

export function validatePoolMove(
  course: CurriculumCourse,
  buckets: SemesterBucket[],
  electivePrereqMap: Map<string, string>,
  enforcePrereqRule: boolean
): MoveValidationResult {
  if (!enforcePrereqRule) return { allowed: true };

  const myCode = normCourseCode(course.selectedElectiveCode || course.code);
  if (!myCode) return { allowed: true };

  for (const b of buckets) {
    for (const depCourse of b.courses) {
      if (depCourse.uid === course.uid) continue;
      const depReqCodes = extractPrereqCodes(
        resolveEffectivePrereqText(depCourse, electivePrereqMap)
      );
      if (depReqCodes.includes(myCode)) {
        const depCode = depCourse.selectedElectiveCode || depCourse.code;
        const depName = depCourse.selectedElectiveName || depCourse.name;
        return {
          allowed: false,
          warningType: 'prereq',
          reason: `⛔ Ön Koşul Engeli: "${myCode}" dersi, ${b.title} dönemindeki "${depCode} (${depName})" dersinin ön koşuludur. Önce "${depCode}" dersini havuza ayırmalı veya bu dersi planda tutmalısınız.`
        };
      }
    }
  }
  return { allowed: true };
}

