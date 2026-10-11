export interface ScenarioMeta {
  id: string;
  name: string;
}

export interface CurriculumCourse {
  uid: string;
  code: string;
  name: string;
  credits: number;
  ects: number;
  prereq?: string;
  defaultSemester: number;
  termType: 'Güz' | 'Bahar' | 'Her İkisi';
  strictTerm: 'Güz' | 'Bahar';
  isElective: boolean;
  selectedElectiveCode?: string;
  selectedElectiveName?: string;
  selectedElectivePrereq?: string;
  completed?: boolean;
  grade?: string;
}

export interface ElectiveOption {
  code: string;
  name: string;
  credits: number;
  ects: number;
  prereq?: string;
}

export interface SemesterBucket {
  id: string; // e.g. 'sem-1', 'sem-2', 'sum-1', 'sem-9'
  year: number; // 1..5
  orderKey: number; // e.g. 1.1 for Güz, 1.2 for Bahar, 1.3 for Yaz
  title: string;
  season: 'Güz' | 'Bahar' | 'Yaz';
  semesterNumber?: number; // 1..10 for regular terms
  customLimit?: number;
  courses: CurriculumCourse[];
}

export interface FacultyItem {
  faculty: string;
  programs: { id: string; name: string }[];
}

export interface MoveValidationResult {
  allowed: boolean;
  reason?: string;
  warningType?: 'season' | 'limit' | 'prereq';
  shortHint?: string;
}

export interface PlanSummary {
  totalPlacedEcts: number;
  totalPlacedCredits: number;
  completedEcts: number;
  exemptEcts: number;
  exemptCredits: number;
  exemptCount: number;
  totalPlacedCount: number;
  unassignedCount: number;
  maxSem: number;
  gradYears: string;
  activeSummers: number;
  isEarlyGraduation: boolean;
}

export interface CanonicalSemesterGroup {
  semesterNumber: number;
  year: number;
  season: 'Güz' | 'Bahar' | 'Yaz';
  title: string;
  courses: CurriculumCourse[];
}

export interface YearGroup {
  year: number;
  buckets: SemesterBucket[];
  hasSummer: boolean;
}

export interface NewCourseFormState {
  code: string;
  name: string;
  credits: string;
  ects: string;
  termType: 'Güz' | 'Bahar' | 'Her İkisi';
}
