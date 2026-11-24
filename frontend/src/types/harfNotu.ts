export type AssessmentType =
  | 'midterm'
  | 'final'
  | 'makeup'
  | 'project'
  | 'homework'
  | 'lab'
  | 'quiz'
  | 'attendance'
  | 'custom';

export interface AssessmentItem {
  id: string;
  label: string;
  type: AssessmentType;
  weight: number; // 0 - 100 (%)
  score: number | null; // 0 - 100 (null = henüz girilmedi / boş)
  classAvg: number | null; // 0 - 100 (opsiyonel, bağıl çan hesabı için)
}

export type GradingMode = 'auto' | 'relative' | 'absolute';

export type LetterGrade = 'AA' | 'BA' | 'BB' | 'CB' | 'CC' | 'DC' | 'DD' | 'FD' | 'FF';

export interface CatalogThresholds {
  AA: number;
  BA: number;
  BB: number;
  CB: number;
  CC: number;
  DC: number;
  DD: number;
  FD: number;
}

export interface SavedScenario {
  id: string;
  name: string;
  scores: Record<string, number | null>;
  classAvgs?: Record<string, number | null>;
  createdAt: string;
}

export interface CourseGradeProfile {
  id: string;
  code: string;
  name: string;
  credits: number | string;
  items: AssessmentItem[];
  gradingMode: GradingMode;
  stdDev: number | null; // null = bilinmiyor -> 3'lü bant (10 / 15 / 20)
  useFinalBaraj: boolean;
  finalBarajScore: number; // varsayılan 40
  useHbnFloor: boolean;
  hbnFloorScore: number; // varsayılan 30
  catalog: CatalogThresholds;
  savedScenarios: SavedScenario[];
}

export interface RelativeClassLevel {
  key: 'mukemmel' | 'cok_iyi' | 'iyi' | 'ortanin_ustu' | 'orta' | 'zayif' | 'kotu';
  label: string;
  minAvg: number;
  maxAvg: number;
  thresholds: Record<Exclude<LetterGrade, 'FF'>, number>; // T-skoru alt sınırları (AA..FD)
}

export interface BandEvaluation {
  stdDev: number;
  bandLabel: string;
  tScore: number;
  grade: LetterGrade;
  gpaPoint: number;
}

export interface EvaluationResult {
  effectiveMode: 'relative' | 'absolute';
  totalWeight: number;
  completedWeight: number;
  earnedContribution: number; // Girilen notların %100 ölçeğindeki toplam katkısı
  completedAverage: number | null; // Sadece girilen kalemler üzerinden ortalama (0-100)
  hbn: number; // Ham Başarı Notu (kısmi girişte mevcut tempo projeksiyonu)
  isProjected: boolean; // Tüm kalemler girilmediği için mevcut ortalamayla projekte edildi mi
  weightedClassAvg: number | null; // Ağırlıklı sınıf ortalaması
  classAvgCoverageWeight: number; // Sınıf ortalaması girilmiş kalemlerin toplam ağırlığı
  diffFromClassAvg: number | null; // HBN - weightedClassAvg
  classLevel: RelativeClassLevel | null;
  exactTScore: number | null;
  bands: BandEvaluation[]; // stdDev bilinmiyorsa 3 bant (10, 15, 20), biliniyorsa tek eleman
  primaryGrade: LetterGrade; // Normal (σ=15 veya kesin σ) ya da Mutlak sonuç
  minGrade: LetterGrade; // En düşük olası harf (3'lü bantta)
  maxGrade: LetterGrade; // En yüksek olası harf (3'lü bantta)
  gradeRangeLabel: string; // örn. "BB" veya "CB – BB"
  gpaPoint: number; // primaryGrade karşılığı 4'lük katsayı
  minGpaPoint: number;
  maxGpaPoint: number;
  barajViolation: {
    violated: boolean;
    reason: 'final' | 'hbn' | null;
    message: string | null;
  };
  hasAnyScore: boolean;
  hasAnyClassAvg: boolean;
}

export type TargetReachStatus = 'guaranteed' | 'achievable' | 'hard' | 'impossible';

export interface TargetScoreRequirement {
  grade: Exclude<LetterGrade, 'FD' | 'FF'>;
  gpaPoint: number;
  requiredScore: number; // Hedef sınavdan alınması gereken minimum puan (normal σ=15 veya mutlak)
  minBandScore?: number; // Bağıl + σ bilinmiyor ise iyimser bant puanı
  maxBandScore?: number; // Bağıl + σ bilinmiyor ise kötümser bant puanı
  status: TargetReachStatus;
  limitedByBaraj: boolean;
  blockedByOtherBaraj?: boolean;
}

export interface AssessmentPreset {
  id: string;
  name: string;
  description: string;
  items: Omit<AssessmentItem, 'id' | 'score' | 'classAvg'>[];
}
