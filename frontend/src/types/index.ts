export interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
  classroom?: string;
  is_lab?: boolean;
}

export interface CourseSummaryItem {
  code: string;
  name: string;
  section: string;
  instructor?: string;
  classrooms: string[];
  time_slots: {
    day: string;
    start_time: string;
    end_time: string;
    classroom: string;
    is_lab: boolean;
  }[];
}

export interface StudentScheduleResponse {
  status: string;
  student_id: string;
  student_name: string;
  term: string;
  title: string;
  schedule: Record<string, {
    section: string;
    code: string;
    name: string;
    classroom: string;
    instructor: string;
    start_time: string;
    end_time: string;
    is_lab: boolean;
  }[]>;
  courses_summary: CourseSummaryItem[];
}

