export type ProfileColorKey = 'blue' | 'violet' | 'rose' | 'emerald' | 'amber' | 'cyan';

export interface NormalizedCourseSlot {
  code: string;
  name: string;
  section: string;
  classroom: string;
  instructor: string;
  start_time: string;
  end_time: string;
  start_minutes: number;
  end_minutes: number;
  is_lab: boolean;
  is_online: boolean;
}

export interface CustomStatusOverride {
  type: 'early_exit' | 'preset' | 'custom';
  preset_id?: string;
  emoji: string;
  label: string;
  note: string;
  early_exit: boolean;
  early_exit_until?: string;
  early_exit_day?: string;
  created_at: number;
  expires_at: number | null;
}

export interface ProfileSchedulePayload {
  term?: string;
  title?: string;
  schedule: Record<string, any[]>;
  courses_summary?: any[];
}

export interface UygunMusunProfile {
  id: string;
  name: string;
  color: ProfileColorKey;
  avatar: string;
  schedule: ProfileSchedulePayload | null;
  custom_status: CustomStatusOverride | null;
}

export interface DuoPing {
  id: string;
  from_id: string;
  to_id: string;
  type: string;
  message: string;
  emoji: string;
  created_at: number;
  dismissed: boolean;
}

export interface UygunMusunRoomState {
  room_code: string;
  updated_at: number;
  profiles: UygunMusunProfile[];
  pings?: DuoPing[];
}

export type AvailabilityStateType =
  | 'IN_CLASS'
  | 'ONLINE_CLASS'
  | 'FREE_UNTIL_NEXT'
  | 'BEFORE_FIRST_CLASS'
  | 'DONE_FOR_TODAY'
  | 'DAY_OFF'
  | 'NO_SCHEDULE';

export interface ProfileLiveStatus {
  state: AvailabilityStateType;
  isAvailableNow: boolean;
  isEarlyExitActive: boolean;
  earlyDismissedClass: NormalizedCourseSlot | null;
  currentClass: NormalizedCourseSlot | null;
  nextClass: NormalizedCourseSlot | null;
  remainingMinutes: number | null;
  progressPercent: number;
  freeUntilTime: string | null;
  busyUntilTime: string | null;
  headline: string;
  subheadline: string;
  activeCustomStatus: CustomStatusOverride | null;
  todaySlots: NormalizedCourseSlot[];
  completedClassesCount: number;
  totalClassesToday: number;
}

export interface MutualFreeWindow {
  start_time: string;
  end_time: string;
  start_minutes: number;
  end_minutes: number;
  duration_minutes: number;
  is_current: boolean;
}

export interface MutualAvailabilitySummary {
  allAvailableNow: boolean;
  sharedFreeMinutesNow: number | null;
  sharedFreeUntil: string | null;
  nextSharedWindow: MutualFreeWindow | null;
  minutesUntilNextSharedWindow: number | null;
  headline: string;
  detail: string;
  todayMutualWindows: MutualFreeWindow[];
}
