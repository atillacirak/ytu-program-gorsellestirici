import type {
  AssessmentItem,
  AssessmentPreset,
  AssessmentType,
  BandEvaluation,
  CatalogThresholds,
  CourseGradeProfile,
  EvaluationResult,
  LetterGrade,
  RelativeClassLevel,
  TargetReachStatus,
  TargetScoreRequirement
} from '../types/harfNotu';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000';

export const HARF_NOTU_STORAGE_KEY = 'ytu_harf_notu_courses_v1';
export const HARF_NOTU_ACTIVE_ID_KEY = 'ytu_harf_notu_active_id_v1';
export const PENDING_HARF_NOTU_KEY = 'ytu_pending_harf_notu_course';
export const AGNO_CURRENT_COURSES_KEY = 'ytu_agno_current_courses';
export const VISUALIZER_DATA_KEY = 'ytu_visualizer_data';

export const GRADE_ORDER: LetterGrade[] = ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FD', 'FF'];

export const PASSING_TARGET_GRADES: Exclude<LetterGrade, 'FD' | 'FF'>[] = [
  'AA',
  'BA',
  'BB',
  'CB',
  'CC',
  'DC',
  'DD'
];

export const GRADE_GPA_POINTS: Record<LetterGrade, number> = {
  AA: 4.0,
  BA: 3.5,
  BB: 3.0,
  CB: 2.5,
  CC: 2.0,
  DC: 1.5,
  DD: 1.0,
  FD: 0.5,
  FF: 0.0
};

export const GRADE_RANK: Record<LetterGrade, number> = {
  FF: 0,
  FD: 1,
  DD: 2,
  DC: 3,
  CC: 4,
  CB: 5,
  BB: 6,
  BA: 7,
  AA: 8
};

export const DEFAULT_CATALOG_CLASSIC: CatalogThresholds = {
  AA: 90,
  BA: 85,
  BB: 80,
  CB: 75,
  CC: 70,
  DC: 60,
  DD: 50,
  FD: 40
};

export const DEFAULT_CATALOG_FLEX: CatalogThresholds = {
  AA: 85,
  BA: 80,
  BB: 75,
  CB: 70,
  CC: 65,
  DC: 55,
  DD: 45,
  FD: 35
};

/**
 * YTÜ Bağıl Değerlendirme (T-Skoru) Sınıf Düzeyleri ve Alt Sınır Tablosu
 */
export const RELATIVE_CLASS_LEVELS: RelativeClassLevel[] = [
  {
    key: 'mukemmel',
    label: 'Mükemmel',
    minAvg: 70,
    maxAvg: 100,
    thresholds: { AA: 59, BA: 54, BB: 49, CB: 44, CC: 39, DC: 34, DD: 29, FD: 24 }
  },
  {
    key: 'cok_iyi',
    label: 'Çok İyi',
    minAvg: 62.5,
    maxAvg: 69.999,
    thresholds: { AA: 61, BA: 56, BB: 51, CB: 46, CC: 41, DC: 36, DD: 31, FD: 26 }
  },
  {
    key: 'iyi',
    label: 'İyi',
    minAvg: 57.5,
    maxAvg: 62.499,
    thresholds: { AA: 63, BA: 58, BB: 53, CB: 48, CC: 43, DC: 38, DD: 33, FD: 28 }
  },
  {
    key: 'ortanin_ustu',
    label: 'Ortanın Üstü',
    minAvg: 52.5,
    maxAvg: 57.499,
    thresholds: { AA: 65, BA: 60, BB: 55, CB: 50, CC: 45, DC: 40, DD: 35, FD: 30 }
  },
  {
    key: 'orta',
    label: 'Orta',
    minAvg: 47.5,
    maxAvg: 52.499,
    thresholds: { AA: 67, BA: 62, BB: 57, CB: 52, CC: 47, DC: 42, DD: 37, FD: 32 }
  },
  {
    key: 'zayif',
    label: 'Zayıf',
    minAvg: 42.5,
    maxAvg: 47.499,
    thresholds: { AA: 69, BA: 64, BB: 59, CB: 54, CC: 49, DC: 44, DD: 39, FD: 34 }
  },
  {
    key: 'kotu',
    label: 'Kötü',
    minAvg: 0,
    maxAvg: 42.499,
    thresholds: { AA: 71, BA: 66, BB: 61, CB: 56, CC: 51, DC: 46, DD: 41, FD: 36 }
  }
];

export const ASSESSMENT_PRESETS: AssessmentPreset[] = [
  {
    id: 'standard_2_midterm',
    name: '2 Vize + Final',
    description: '%30 · %30 · %40',
    items: [
      { label: 'Vize 1', type: 'midterm', weight: 30 },
      { label: 'Vize 2', type: 'midterm', weight: 30 },
      { label: 'Final', type: 'final', weight: 40 }
    ]
  },
  {
    id: 'single_midterm',
    name: '1 Vize + Final',
    description: '%40 · %60',
    items: [
      { label: 'Vize', type: 'midterm', weight: 40 },
      { label: 'Final', type: 'final', weight: 60 }
    ]
  },
  {
    id: 'midterm_project_final',
    name: 'Vize + Proje + Final',
    description: '%25 · %25 · %50',
    items: [
      { label: 'Vize', type: 'midterm', weight: 25 },
      { label: 'Proje', type: 'project', weight: 25 },
      { label: 'Final', type: 'final', weight: 50 }
    ]
  },
  {
    id: 'applied_course',
    name: 'Vize + Lab + Ödev + Final',
    description: '%30 · %15 · %15 · %40',
    items: [
      { label: 'Vize', type: 'midterm', weight: 30 },
      { label: 'Laboratuvar', type: 'lab', weight: 15 },
      { label: 'Ödev', type: 'homework', weight: 15 },
      { label: 'Final', type: 'final', weight: 40 }
    ]
  }
];

export const QUICK_ADD_ASSESSMENT_OPTIONS: {
  type: AssessmentType;
  baseLabel: string;
  defaultWeight: number;
}[] = [
  { type: 'midterm', baseLabel: 'Vize', defaultWeight: 25 },
  { type: 'final', baseLabel: 'Final', defaultWeight: 40 },
  { type: 'makeup', baseLabel: 'Bütünleme', defaultWeight: 40 },
  { type: 'project', baseLabel: 'Proje', defaultWeight: 20 },
  { type: 'homework', baseLabel: 'Ödev', defaultWeight: 10 },
  { type: 'lab', baseLabel: 'Laboratuvar', defaultWeight: 15 },
  { type: 'quiz', baseLabel: 'Quiz', defaultWeight: 10 },
  { type: 'attendance', baseLabel: 'Katılım', defaultWeight: 5 },
  { type: 'custom', baseLabel: 'Özel Kalem', defaultWeight: 10 }
];

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function clampScore(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.min(100, Math.max(0, val));
}

export function roundTo1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function roundTo2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function buildPresetItems(presetId: string): AssessmentItem[] {
  const preset =
    ASSESSMENT_PRESETS.find((p) => p.id === presetId) ?? ASSESSMENT_PRESETS[0];
  return preset.items.map((item) => ({
    id: generateId('item'),
    label: item.label,
    type: item.type,
    weight: item.weight,
    score: null,
    classAvg: null
  }));
}

export function getNextQuickLabel(
  existingItems: AssessmentItem[],
  type: AssessmentType,
  baseLabel: string
): string {
  const sameTypeCount = existingItems.filter((i) => i.type === type).length;
  if (sameTypeCount === 0) {
    return type === 'midterm' ? 'Vize 1' : baseLabel;
  }
  return `${baseLabel} ${sameTypeCount + 1}`;
}

export function createDefaultCourseProfile(
  overrides?: Partial<CourseGradeProfile>
): CourseGradeProfile {
  return {
    id: overrides?.id ?? generateId('course'),
    code: overrides?.code ?? '',
    name: overrides?.name ?? 'Örnek Ders 1',
    credits: overrides?.credits ?? '',
    items: overrides?.items ?? buildPresetItems('standard_2_midterm'),
    gradingMode: overrides?.gradingMode ?? 'auto',
    stdDev: overrides?.stdDev !== undefined ? overrides.stdDev : null,
    useFinalBaraj: overrides?.useFinalBaraj ?? true,
    finalBarajScore: overrides?.finalBarajScore ?? 40,
    useHbnFloor: overrides?.useHbnFloor ?? true,
    hbnFloorScore: overrides?.hbnFloorScore ?? 30,
    catalog: overrides?.catalog ? { ...overrides.catalog } : { ...DEFAULT_CATALOG_CLASSIC },
    savedScenarios: overrides?.savedScenarios ?? []
  };
}

/**
 * Mevcut değerlendirme kalemlerinin ağırlıklarını orantılı biçimde tam %100'e yuvarlar.
 * Hamilton (en büyük kalan) yöntemiyle toplam her zaman tam 100 olur.
 */
export function normalizeWeightsTo100(items: AssessmentItem[]): AssessmentItem[] {
  if (items.length === 0) return items;

  const positiveWeights = items.map((i) => Math.max(0, Number(i.weight) || 0));
  const total = positiveWeights.reduce((acc, w) => acc + w, 0);

  if (total <= 0) {
    const base = Math.floor(100 / items.length);
    let rem = 100 - base * items.length;
    return items.map((item) => {
      const extra = rem > 0 ? 1 : 0;
      if (rem > 0) rem -= 1;
      return { ...item, weight: base + extra };
    });
  }

  const exacts = positiveWeights.map((w) => (w / total) * 100);
  const floors = exacts.map((e) => Math.floor(e));
  let remainder = 100 - floors.reduce((acc, f) => acc + f, 0);

  const indexedRemainders = exacts
    .map((e, idx) => ({ idx, frac: e - floors[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < indexedRemainders.length && remainder > 0; i++) {
    floors[indexedRemainders[i].idx] += 1;
    remainder -= 1;
  }

  return items.map((item, idx) => ({
    ...item,
    weight: floors[idx]
  }));
}

/**
 * %100'den eksik veya fazla kalan ağırlık farkını seçili kaleme (ör. Final) ekler/çıkarır.
 */
export function assignRemainingWeightToItem(
  items: AssessmentItem[],
  targetId: string
): AssessmentItem[] {
  if (items.length === 0) return items;
  const total = items.reduce((acc, i) => acc + Math.max(0, Number(i.weight) || 0), 0);
  const diff = 100 - total;
  if (diff === 0) return items;

  return items.map((item) => {
    if (item.id !== targetId) return item;
    const nextWeight = Math.min(100, Math.max(0, Math.round((Number(item.weight) || 0) + diff)));
    return { ...item, weight: nextWeight };
  });
}

export function calculateWeightedScore(items: AssessmentItem[]): {
  totalWeight: number;
  completedWeight: number;
  earnedContribution: number;
  completedAverage: number | null;
  hbn: number;
  hasAnyScore: boolean;
} {
  let totalWeight = 0;
  let completedWeight = 0;
  let weightedSum = 0;
  let hasAnyScore = false;

  for (const item of items) {
    const w = Math.max(0, Number(item.weight) || 0);
    totalWeight += w;
    if (item.score !== null && item.score !== undefined && Number.isFinite(item.score)) {
      hasAnyScore = true;
      const s = clampScore(item.score);
      completedWeight += w;
      weightedSum += s * w;
    }
  }

  const earnedContribution = roundTo2(weightedSum / 100);
  const completedAverage = completedWeight > 0 ? roundTo2(weightedSum / completedWeight) : null;
  const hbn = totalWeight > 0 ? roundTo2(weightedSum / totalWeight) : 0;

  return {
    totalWeight: roundTo1(totalWeight),
    completedWeight: roundTo1(completedWeight),
    earnedContribution,
    completedAverage,
    hbn,
    hasAnyScore
  };
}

export function calculateWeightedClassAverage(items: AssessmentItem[]): {
  weightedClassAvg: number | null;
  classAvgCoverageWeight: number;
  hasAnyClassAvg: boolean;
} {
  let avgWeightSum = 0;
  let avgWeightedSum = 0;
  let hasAnyClassAvg = false;

  for (const item of items) {
    const w = Math.max(0, Number(item.weight) || 0);
    if (
      w > 0 &&
      item.classAvg !== null &&
      item.classAvg !== undefined &&
      Number.isFinite(item.classAvg)
    ) {
      hasAnyClassAvg = true;
      const avg = clampScore(item.classAvg);
      avgWeightSum += w;
      avgWeightedSum += avg * w;
    }
  }

  return {
    weightedClassAvg: avgWeightSum > 0 ? roundTo2(avgWeightedSum / avgWeightSum) : null,
    classAvgCoverageWeight: roundTo1(avgWeightSum),
    hasAnyClassAvg
  };
}

export function getRelativeClassLevel(weightedClassAvg: number): RelativeClassLevel {
  for (const level of RELATIVE_CLASS_LEVELS) {
    if (weightedClassAvg >= level.minAvg) {
      return level;
    }
  }
  return RELATIVE_CLASS_LEVELS[RELATIVE_CLASS_LEVELS.length - 1];
}

export function computeTScore(hbn: number, classAvg: number, stdDev: number): number {
  const safeStd = Math.max(1, stdDev);
  return roundTo2(50 + 10 * ((hbn - classAvg) / safeStd));
}

export function evaluateTScoreGrade(
  tScore: number,
  classLevel: RelativeClassLevel
): LetterGrade {
  const t = classLevel.thresholds;
  if (tScore >= t.AA) return 'AA';
  if (tScore >= t.BA) return 'BA';
  if (tScore >= t.BB) return 'BB';
  if (tScore >= t.CB) return 'CB';
  if (tScore >= t.CC) return 'CC';
  if (tScore >= t.DC) return 'DC';
  if (tScore >= t.DD) return 'DD';
  if (tScore >= t.FD) return 'FD';
  return 'FF';
}

export function evaluateAbsoluteGrade(
  hbn: number,
  catalog: CatalogThresholds
): LetterGrade {
  if (hbn >= catalog.AA) return 'AA';
  if (hbn >= catalog.BA) return 'BA';
  if (hbn >= catalog.BB) return 'BB';
  if (hbn >= catalog.CB) return 'CB';
  if (hbn >= catalog.CC) return 'CC';
  if (hbn >= catalog.DC) return 'DC';
  if (hbn >= catalog.DD) return 'DD';
  if (hbn >= catalog.FD) return 'FD';
  return 'FF';
}

function checkBarajViolation(
  profile: CourseGradeProfile,
  hbn: number,
  completedWeight: number,
  totalWeight: number,
  hasAnyScore: boolean
): EvaluationResult['barajViolation'] {
  const weightedItems = profile.items.filter((i) => (Number(i.weight) || 0) > 0);

  if (profile.useFinalBaraj) {
    // Bütünleme notu girilmişse final yerine bütünleme barajı esas alınır
    const enteredMakeups = weightedItems.filter(
      (i) => i.type === 'makeup' && i.score !== null && Number.isFinite(i.score)
    );
    const enteredFinals = weightedItems.filter(
      (i) => i.type === 'final' && i.score !== null && Number.isFinite(i.score)
    );

    const activeFinals = enteredMakeups.length > 0 ? enteredMakeups : enteredFinals;
    for (const f of activeFinals) {
      if ((f.score as number) < profile.finalBarajScore) {
        return {
          violated: true,
          reason: 'final',
          message: `${f.label} notu (${f.score}) alt barajın (${profile.finalBarajScore}) altında olduğu için otomatik FF.`
        };
      }
    }
  }

  // HBN alt sınırı sadece tüm kalemler girildiğinde veya final/büt girildiğinde tetiklenir
  const hasFinalOrMakeupScore = weightedItems.some(
    (i) =>
      (i.type === 'final' || i.type === 'makeup') &&
      i.score !== null &&
      Number.isFinite(i.score)
  );
  const isAllEntered = totalWeight > 0 && completedWeight >= totalWeight - 0.01;

  if (
    profile.useHbnFloor &&
    hasAnyScore &&
    (isAllEntered || hasFinalOrMakeupScore) &&
    hbn < profile.hbnFloorScore
  ) {
    return {
      violated: true,
      reason: 'hbn',
      message: `Ham Başarı Notu (${hbn.toFixed(1)}) alt sınırın (${profile.hbnFloorScore}) altında olduğu için otomatik FF.`
    };
  }

  return {
    violated: false,
    reason: null,
    message: null
  };
}

export function evaluateCourseGrade(profile: CourseGradeProfile): EvaluationResult {
  const scoreStats = calculateWeightedScore(profile.items);
  const avgStats = calculateWeightedClassAverage(profile.items);

  const effectiveMode: 'relative' | 'absolute' =
    profile.gradingMode === 'relative'
      ? avgStats.hasAnyClassAvg
        ? 'relative'
        : 'absolute'
      : profile.gradingMode === 'absolute'
        ? 'absolute'
        : avgStats.hasAnyClassAvg
          ? 'relative'
          : 'absolute';

  const barajViolation = checkBarajViolation(
    profile,
    scoreStats.hbn,
    scoreStats.completedWeight,
    scoreStats.totalWeight,
    scoreStats.hasAnyScore
  );

  if (effectiveMode === 'relative' && avgStats.weightedClassAvg !== null) {
    const classAvg = avgStats.weightedClassAvg;
    const classLevel = getRelativeClassLevel(classAvg);
    const diffFromClassAvg = roundTo2(scoreStats.hbn - classAvg);

    const stdSpecs: { stdDev: number; label: string }[] =
      profile.stdDev !== null && Number.isFinite(profile.stdDev) && profile.stdDev > 0
        ? [{ stdDev: profile.stdDev, label: `Özel (σ=${profile.stdDev})` }]
        : [
            { stdDev: 10, label: 'Dar Dağılım (σ=10)' },
            { stdDev: 15, label: 'Normal Dağılım (σ=15)' },
            { stdDev: 20, label: 'Geniş Dağılım (σ=20)' }
          ];

    const bands: BandEvaluation[] = stdSpecs.map((spec) => {
      const tScore = computeTScore(scoreStats.hbn, classAvg, spec.stdDev);
      const grade: LetterGrade = barajViolation.violated
        ? 'FF'
        : evaluateTScoreGrade(tScore, classLevel);
      return {
        stdDev: spec.stdDev,
        bandLabel: spec.label,
        tScore,
        grade,
        gpaPoint: GRADE_GPA_POINTS[grade]
      };
    });

    // Primary: tek σ ise o, 3 bant ise ortadaki (σ=15)
    const primaryBand = bands.length === 1 ? bands[0] : bands[1];

    let minBand = bands[0];
    let maxBand = bands[0];
    for (const b of bands) {
      if (GRADE_RANK[b.grade] < GRADE_RANK[minBand.grade]) minBand = b;
      if (GRADE_RANK[b.grade] > GRADE_RANK[maxBand.grade]) maxBand = b;
    }

    const gradeRangeLabel =
      minBand.grade === maxBand.grade
        ? minBand.grade
        : `${minBand.grade} – ${maxBand.grade}`;

    return {
      effectiveMode: 'relative',
      totalWeight: scoreStats.totalWeight,
      completedWeight: scoreStats.completedWeight,
      earnedContribution: scoreStats.earnedContribution,
      completedAverage: scoreStats.completedAverage,
      hbn: scoreStats.hbn,
      weightedClassAvg: classAvg,
      classAvgCoverageWeight: avgStats.classAvgCoverageWeight,
      diffFromClassAvg,
      classLevel,
      exactTScore: primaryBand.tScore,
      bands,
      primaryGrade: primaryBand.grade,
      minGrade: minBand.grade,
      maxGrade: maxBand.grade,
      gradeRangeLabel,
      gpaPoint: primaryBand.gpaPoint,
      minGpaPoint: minBand.gpaPoint,
      maxGpaPoint: maxBand.gpaPoint,
      barajViolation,
      hasAnyScore: scoreStats.hasAnyScore,
      hasAnyClassAvg: avgStats.hasAnyClassAvg
    };
  }

  // Mutlak (Katalog) Değerlendirme
  const grade: LetterGrade = barajViolation.violated
    ? 'FF'
    : evaluateAbsoluteGrade(scoreStats.hbn, profile.catalog);
  const gpaPoint = GRADE_GPA_POINTS[grade];

  return {
    effectiveMode: 'absolute',
    totalWeight: scoreStats.totalWeight,
    completedWeight: scoreStats.completedWeight,
    earnedContribution: scoreStats.earnedContribution,
    completedAverage: scoreStats.completedAverage,
    hbn: scoreStats.hbn,
    weightedClassAvg: avgStats.weightedClassAvg,
    classAvgCoverageWeight: avgStats.classAvgCoverageWeight,
    diffFromClassAvg:
      avgStats.weightedClassAvg !== null
        ? roundTo2(scoreStats.hbn - avgStats.weightedClassAvg)
        : null,
    classLevel:
      avgStats.weightedClassAvg !== null
        ? getRelativeClassLevel(avgStats.weightedClassAvg)
        : null,
    exactTScore: null,
    bands: [],
    primaryGrade: grade,
    minGrade: grade,
    maxGrade: grade,
    gradeRangeLabel: grade,
    gpaPoint,
    minGpaPoint: gpaPoint,
    maxGpaPoint: gpaPoint,
    barajViolation,
    hasAnyScore: scoreStats.hasAnyScore,
    hasAnyClassAvg: avgStats.hasAnyClassAvg
  };
}

/**
 * Varsayılan hedef çözücü kalemini seçer:
 * Önce skoru boş bir Final/Büt, yoksa ilk skoru boş kalem, yoksa ilk Final, yoksa son kalem.
 */
export function pickDefaultTargetItemId(items: AssessmentItem[]): string | null {
  const weighted = items.filter((i) => (Number(i.weight) || 0) > 0);
  if (weighted.length === 0) return items[0]?.id ?? null;

  const emptyFinal = weighted.find(
    (i) => (i.type === 'final' || i.type === 'makeup') && i.score === null
  );
  if (emptyFinal) return emptyFinal.id;

  const anyEmpty = weighted.find((i) => i.score === null);
  if (anyEmpty) return anyEmpty.id;

  const anyFinal = weighted.find((i) => i.type === 'final' || i.type === 'makeup');
  if (anyFinal) return anyFinal.id;

  return weighted[weighted.length - 1].id;
}

function classifyReachStatus(requiredScore: number): TargetReachStatus {
  if (requiredScore > 100) return 'impossible';
  if (requiredScore <= 0) return 'guaranteed';
  if (requiredScore > 80) return 'hard';
  return 'achievable';
}

/**
 * Seçili hedef kalem (örn. Final) dışındaki notları sabit tutarak,
 * AA..DD harf notları için hedef kalemden alınması gereken minimum puanı çözer.
 */
export function solveRequiredScoresForTargetGrades(
  profile: CourseGradeProfile,
  targetItemId?: string
): TargetScoreRequirement[] {
  const chosenId = targetItemId ?? pickDefaultTargetItemId(profile.items);
  if (!chosenId) return [];

  const targetItem = profile.items.find((i) => i.id === chosenId);
  if (!targetItem || (Number(targetItem.weight) || 0) <= 0) return [];

  const totalWeight = profile.items.reduce(
    (acc, i) => acc + Math.max(0, Number(i.weight) || 0),
    0
  );
  if (totalWeight <= 0) return [];

  let otherWeightedSum = 0;
  for (const item of profile.items) {
    if (item.id === targetItem.id) continue;
    const w = Math.max(0, Number(item.weight) || 0);
    const s =
      item.score !== null && item.score !== undefined && Number.isFinite(item.score)
        ? clampScore(item.score)
        : 0;
    otherWeightedSum += s * w;
  }

  const targetWeight = Math.max(0, Number(targetItem.weight) || 0);
  const isFinalLike = targetItem.type === 'final' || targetItem.type === 'makeup';
  const avgStats = calculateWeightedClassAverage(profile.items);

  const weightedItems = profile.items.filter((i) => (Number(i.weight) || 0) > 0);
  const enteredPassingMakeup = weightedItems.some(
    (i) =>
      i.id !== targetItem.id &&
      i.type === 'makeup' &&
      i.score !== null &&
      Number.isFinite(i.score) &&
      i.score >= profile.finalBarajScore
  );
  const otherBlockedByFinalBaraj =
    profile.useFinalBaraj &&
    weightedItems.some((i) => {
      if (i.id === targetItem.id) return false;
      if (i.score === null || !Number.isFinite(i.score)) return false;
      if (i.type === 'makeup') {
        return i.score < profile.finalBarajScore;
      }
      if (i.type === 'final') {
        if (targetItem.type === 'makeup' || enteredPassingMakeup) return false;
        return i.score < profile.finalBarajScore;
      }
      return false;
    });

  if (otherBlockedByFinalBaraj) {
    return PASSING_TARGET_GRADES.map((grade) => ({
      grade,
      gpaPoint: GRADE_GPA_POINTS[grade],
      requiredScore: 101,
      status: 'impossible',
      limitedByBaraj: true,
      blockedByOtherBaraj: true
    }));
  }

  const useRelative =
    (profile.gradingMode === 'relative' || profile.gradingMode === 'auto') &&
    avgStats.weightedClassAvg !== null;

  const solveForRequiredHbn = (reqHbn: number): { score: number; limitedByBaraj: boolean } => {
    const clampedHbn = profile.useHbnFloor ? Math.max(reqHbn, profile.hbnFloorScore) : reqHbn;
    const algebraic = (clampedHbn * totalWeight - otherWeightedSum) / targetWeight;

    if (isFinalLike && profile.useFinalBaraj && algebraic < profile.finalBarajScore) {
      return {
        score: roundTo1(profile.finalBarajScore),
        limitedByBaraj: true
      };
    }

    return {
      score: roundTo1(algebraic),
      limitedByBaraj: false
    };
  };

  if (useRelative && avgStats.weightedClassAvg !== null) {
    const classAvg = avgStats.weightedClassAvg;
    const classLevel = getRelativeClassLevel(classAvg);
    const primaryStdDev =
      profile.stdDev !== null && Number.isFinite(profile.stdDev) && profile.stdDev > 0
        ? profile.stdDev
        : 15;

    return PASSING_TARGET_GRADES.map((grade) => {
      const tThreshold = classLevel.thresholds[grade];
      const reqHbnPrimary = classAvg + ((tThreshold - 50) * primaryStdDev) / 10;
      const primarySolved = solveForRequiredHbn(reqHbnPrimary);

      let minBandScore: number | undefined;
      let maxBandScore: number | undefined;
      if (profile.stdDev === null) {
        const s10 = solveForRequiredHbn(classAvg + ((tThreshold - 50) * 10) / 10).score;
        const s15 = primarySolved.score;
        const s20 = solveForRequiredHbn(classAvg + ((tThreshold - 50) * 20) / 10).score;
        minBandScore = Math.min(s10, s15, s20);
        maxBandScore = Math.max(s10, s15, s20);
      }

      return {
        grade,
        gpaPoint: GRADE_GPA_POINTS[grade],
        requiredScore: primarySolved.score,
        minBandScore,
        maxBandScore,
        status: classifyReachStatus(primarySolved.score),
        limitedByBaraj: primarySolved.limitedByBaraj
      };
    });
  }

  // Mutlak Katalog Çözümü
  return PASSING_TARGET_GRADES.map((grade) => {
    const threshold = profile.catalog[grade];
    const solved = solveForRequiredHbn(threshold);
    return {
      grade,
      gpaPoint: GRADE_GPA_POINTS[grade],
      requiredScore: solved.score,
      status: classifyReachStatus(solved.score),
      limitedByBaraj: solved.limitedByBaraj
    };
  });
}

export function getGradeBadgeClasses(grade: LetterGrade): string {
  switch (grade) {
    case 'AA':
    case 'BA':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'BB':
    case 'CB':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'CC':
      return 'bg-sky-100 text-sky-800 border-sky-300';
    case 'DC':
    case 'DD':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'FD':
    case 'FF':
      return 'bg-rose-100 text-rose-800 border-rose-300';
  }
}

export async function lookupCourseInfo(
  code?: string,
  name?: string
): Promise<{ code: string; name: string; credits: number; ects?: number } | null> {
  const cleanCode = (code || '').trim().replace(/\s+/g, '').toUpperCase();
  const cleanName = (name || '').trim();
  if (!cleanCode && !cleanName) return null;
  if (cleanCode && cleanCode.length < 4 && !cleanName) return null;
  if (cleanName && cleanName.length < 3 && !cleanCode) return null;

  try {
    const params = new URLSearchParams();
    if (cleanCode) params.append('code', cleanCode);
    if (cleanName) params.append('name', cleanName);

    const res = await fetch(`${API_BASE}/api/course-lookup?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.status === 'success' && data?.found && data?.course) {
      return data.course;
    }
  } catch {
    // Sessizce yoksay (offline / backend kapalı)
  }
  return null;
}

export function normalizeCourseCode(code?: string): string {
  return (code || '').trim().replace(/\s+/g, '').toUpperCase();
}
