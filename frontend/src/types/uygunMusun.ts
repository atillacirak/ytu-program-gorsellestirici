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
  student_id?: string;
  student_name?: string;
  department?: string;
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
  role?: 'owner' | 'member';
  schedule: ProfileSchedulePayload | null;
  custom_status: CustomStatusOverride | null;
}

export interface DuoPing {
  id: string;
  from_id: string;
  from_name?: string;
  from_avatar?: string;
  to_id: string;
  type: string;
  message: string;
  emoji: string;
  created_at: number;
  dismissed: boolean;
  dismissed_by?: string[];
}

export interface UygunMusunRoomState {
  room_code: string;
  title?: string;
  owner_profile_id?: string;
  created_at?: number;
  updated_at: number;
  profiles: UygunMusunProfile[];
  pings?: DuoPing[];
}

export interface SavedLobbyItem {
  room_code: string;
  title: string;
  my_profile_id: string;
  admin_token?: string;
  joined_at: number;
}

export interface LobbySummaryItem {
  room_code: string;
  title: string;
  owner_profile_id?: string;
  member_count: number;
  members: {
    id: string;
    name: string;
    avatar: string;
    color: ProfileColorKey;
  }[];
  updated_at: number;
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

export interface GroupOverlapWindow {
  start_time: string;
  end_time: string;
  start_minutes: number;
  end_minutes: number;
  duration_minutes: number;
  is_current: boolean;
  free_count: number;
  total_count: number;
  missing_names: string[];
}

export interface GroupAvailabilitySummary {
  totalMembers: number;
  activeScheduleCount: number;
  availableCount: number;
  inClassCount: number;
  onlineClassCount: number;
  noScheduleCount: number;
  allAvailableNow: boolean;
  sharedFreeMinutesNow: number | null;
  sharedFreeUntil: string | null;
  nextFullWindow: GroupOverlapWindow | null;
  minutesUntilNextFullWindow: number | null;
  fullOverlapWindows: GroupOverlapWindow[];
  majorityOverlapWindows: GroupOverlapWindow[];
  majoritySuggestion: string | null;
  headline: string;
  detail: string;
}
