export type ClassSchedule = {
  id: number;
  class_section_id: number;
  class_section: {
    id: number;
    section_code: string;
    course?: { id: number; course_code: string; name: string; department?: { id: number; name: string } };
    semester?: { id: number; name: string; start_date?: string; end_date?: string; academic_year?: { name: string } };
    teachers?: { id: number; name: string; code?: string }[];
  } | null;
  classroom_id: number;
  classroom: { id: number; room_code: string; building?: string | null; floor?: string | null; allowed_radius_meters: number } | null;
  time_slot_id: number | null;
  time_slot?: { id: number; name: string; starts_at: string; ends_at: string; period: { id: number; name: string; color: string } | null } | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_until: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type ClassScheduleInput = {
  class_section_id: number;
  classroom_id: number;
  time_slot_id?: number | null;
  day_of_week?: number;
  days_of_week?: number[];
  start_time?: string;
  end_time?: string;
  effective_from?: string | null;
  effective_until?: string | null;
  status?: "active" | "inactive";
};

export type ClassroomOption = { id: number; room_code: string; building: string | null; floor: string | null };
export type SectionOption = {
  id: number;
  semester_id: number;
  section_code: string;
  status: "active" | "inactive";
  course?: { id: number; department_id?: number; course_code: string; name: string; department?: { id: number; name: string } };
  semester?: { id: number; name: string; start_date: string; end_date: string; academic_year?: { name: string } };
  teachers?: { id: number; name: string; code?: string }[];
};
export type SemesterOption = { id: number; name: string; status: string; start_date: string; end_date: string; academic_year?: { name: string } | null };
export type TimetableConfig = {
  timezone: string;
  weekdays: number[];
  max_weekly_teaching_hours: number;
  max_assigned_sections: number | null;
  periods: { id: number; code: string; name: string; color: string; is_active: boolean; time_slots: { id: number; code: string; name: string; starts_at: string; ends_at: string; is_break: boolean; is_active: boolean }[] }[];
};
export type TimetableSummary = { week_start: string; week_end: string; weekly_sessions: number; active_class_sections: number; assigned_teachers: number; scheduling_conflicts: number };
export type TeacherWorkload = {
  teacher: { id: number; name: string; teacher_code: string };
  available_time_slots: { day_of_week: number; time_slot_id: number; period: string; slot: string; starts_at: string; ends_at: string }[];
  limits: { max_weekly_teaching_hours: number; max_assigned_sections: number | null; over_weekly_hours_limit: boolean; over_section_limit: boolean };
};
export type Paginated<T> = { data: T[]; meta?: { current_page: number; last_page: number; total: number; per_page: number } };
