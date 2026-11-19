export type TeacherSchedule = {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status?: "active" | "inactive";
  effective_from: string | null;
  effective_until: string | null;
  time_slot?: { id: number; name: string; period: { id: number; name: string; color: string } | null } | null;
  classroom: { id: number; room_code: string; building: string | null; floor: string | null } | null;
};

export type TeacherClassSection = {
  id: number;
  section_code: string;
  status: "active" | "inactive";
  capacity: number;
  enrolled_count: number;
  course: { id: number; code: string; name: string; department: string | null };
  semester: { id: number; name: string; start_date: string; end_date: string; academic_year: string | null };
  schedules?: TeacherSchedule[];
};

export type TeacherRosterStudent = {
  id: number;
  student_code: string;
  name: string;
  email: string | null;
  enrollment_status: "enrolled";
};

export type ApiPage<T> = {
  data: T[];
  links?: { next: string | null; prev: string | null };
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
};

export type ApiResource<T> = { data: T };

export type TeacherAttendanceSession = {
  id: number;
  class_section_id: number;
  class_section: {
    id: number;
    section_code: string;
    course?: { course_code?: string; name?: string; code?: string };
    semester?: { name: string };
  };
  class_schedule_id: number | null;
  classroom_id: number;
  classroom?: { room_code: string; building?: string | null; floor?: string | null };
  session_date: string;
  starts_at: string;
  late_after: string;
  closes_at: string;
  session_ends_at?: string | null;
  closed_at: string | null;
  status: "scheduled" | "open" | "closed" | "cancelled";
};

export type SessionAttendanceStatus = "present" | "late" | "absent" | "excused" | "unmarked";

export type SessionAttendance = {
  student_id: number;
  student_code: string;
  name: string;
  email: string | null;
  enrollment_status: "enrolled";
  status: SessionAttendanceStatus;
  verification_method: "dynamic_qr" | "manual" | "system" | null;
  checked_in_at: string | null;
  remarks: string | null;
  marked_by: string | null;
};

export type AttendanceSummary = {
  present: number;
  late: number;
  absent: number;
  excused: number;
  unmarked: number;
  total: number;
};

export type ManualAttendanceRecord = {
  student_id: number;
  status: Exclude<SessionAttendanceStatus, "unmarked">;
  remarks?: string;
};

export type SessionAttendancePage = ApiPage<SessionAttendance> & {
  summary: AttendanceSummary;
};

export type TeacherDashboardData = {
  date: string;
  timezone: string;
  summary: {
    assigned_classes: number;
    today_sessions: number;
    checked_in_today: number;
    pending_attendance_reviews: number;
    classes_today: number;
    open_sessions: number;
    awaiting_closure: number;
    attendance_last_7_days: Pick<AttendanceSummary, "present" | "late" | "absent" | "excused">;
  };
  today_schedule: Array<{
    id: number;
    class_section_id: number;
    attendance_session_id: number | null;
    course_code: string;
    class_name: string;
    section_code: string;
    semester: string;
    start_time: string;
    end_time: string;
    classroom: string;
    building: string | null;
    status: "upcoming" | "in_progress" | "completed";
  }>;
  open_sessions: Array<{
    id: number;
    class_section_id: number;
    class_name: string;
    course_code: string;
    section_code: string;
    session_date: string;
    starts_at: string;
    closes_at: string;
    classroom: string;
    awaiting_closure: boolean;
    attendance: Pick<AttendanceSummary, "present" | "late" | "absent" | "excused">;
  }>;
};

export type TeacherAttendanceReport = {
  total: number;
  by_status: { present: number; late: number; absent: number; excused: number };
  attendance_rate: number;
  by_section: Array<{
    class_section_id: number;
    section_code: string;
    course_code: string;
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attendance_rate: number;
  }>;
};

export type TeacherProfile = {
  id: number;
  teacher_code: string;
  phone: string | null;
  department: { id: number; name: string; code: string } | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: string | null;
    status: string | null;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
  };
};

export type TeacherCorrection = {
  id: number;
  attendance_id: number;
  attendance: import("@/features/attendance/types").AttendanceRecord | null;
  requested_by: number;
  requester: { id: number; name: string; email: string; role: string | null; status: string | null } | null;
  reviewed_by: number | null;
  reviewer: { id: number; name: string; email: string; role: string | null; status: string | null } | null;
  reason: string;
  requested_status: "present" | "late" | "absent" | "excused";
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};
