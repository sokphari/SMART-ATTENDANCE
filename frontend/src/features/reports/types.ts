export type ReportSummary = {
  opportunities: number;
  sessions: number;
  students: number;
  classes: number;
  attendance_records: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  unrecorded: number;
  rate_denominator: number;
  attendance_rate: number | null;
};

export type ReportTrendPoint = { date: string; summary: ReportSummary };
export type ReportSection = ReportSummary & {
  class_section_id: number;
  section_code: string;
  course_code: string;
  course_name: string;
};
export type ReportRow = {
  date: string;
  student_id: number;
  student_code: string;
  student_name: string;
  course_code: string;
  course_name: string;
  section: string;
  session_id: number;
  status: string;
  check_in_time: string | null;
  method: string | null;
  remarks: string | null;
};
export type ReportPage = {
  data: ReportRow[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};
export type ReportOverview = {
  scope: { total_students: number; total_classes: number };
  summary: ReportSummary;
  attendance_trend: ReportTrendPoint[];
  attendance_distribution: { status: string; count: number }[];
  by_section: ReportSection[];
  calculation: { timezone: string; rate_denominator: string; unrecorded: string };
};
export type ReportPeriod = { from: string; to: string };
export type WeeklyReport = {
  period: ReportPeriod;
  summary: ReportSummary;
  daily_trend: ReportTrendPoint[];
  by_section: ReportSection[];
  previous_week: { period: ReportPeriod; summary: ReportSummary };
};
export type MonthlyReport = {
  period: { year: number; month: number; from: string; to: string };
  summary: ReportSummary;
  weekly_breakdown: { week: number; from: string; to: string; summary: ReportSummary }[];
  monthly_trend: ReportTrendPoint[];
  by_section: ReportSection[];
};
export type StudentReport = {
  student: { id: number; name: string; student_code: string; department: string | null };
  summary: ReportSummary;
  attendance_trend: ReportTrendPoint[];
} & ReportPage;
export type ClassReport = {
  class: {
    id: number; course_code: string; course_name: string; section_code: string;
    department: string | null; semester: string | null; academic_year: string | null;
    enrolled_students: number;
  };
  summary: ReportSummary & { students_with_repeated_absences: number; students_with_frequent_late_arrivals: number };
  students: (ReportSummary & { student_id: number; student_code: string; student_name: string })[];
  sessions: (ReportSummary & { attendance_session_id: number; date: string })[];
} & ReportPage;

export type SemesterOption = { id: number; name: string; academic_year?: { name: string } | null };
export type SectionOption = { id: number; section_code: string; course?: { course_code: string; name: string } };
export type StudentOption = { id: number; student_code?: string; user?: { name?: string; email?: string } };
