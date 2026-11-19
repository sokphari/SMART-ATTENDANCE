import { apiFetch } from "@/lib/api/client";
import type { AttendanceRecord, Paginated, SectionOption } from "@/features/attendance/types";
import type { ApiPage, ApiResource, ManualAttendanceRecord, SessionAttendancePage, TeacherAttendanceReport, TeacherAttendanceSession, TeacherClassSection, TeacherCorrection, TeacherDashboardData, TeacherProfile, TeacherRosterStudent, TeacherSchedule } from "./types";

export function getTeacherDashboard() {
  return apiFetch<ApiResource<TeacherDashboardData>>("/api/v1/teacher/dashboard");
}

export function getTeacherProfile() {
  return apiFetch<ApiResource<TeacherProfile>>("/api/v1/teacher/profile");
}

export function updateTeacherProfile(payload: { name: string; email: string; phone: string | null }) {
  return apiFetch<ApiResource<TeacherProfile>>("/api/v1/teacher/profile", {
    method: "PATCH",
    body: payload,
  });
}

export function getTeacherCorrections(filters: { status?: string; page?: number; per_page?: number } = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  query.set("page", String(filters.page ?? 1));
  query.set("per_page", String(filters.per_page ?? 15));
  return apiFetch<ApiPage<TeacherCorrection>>(`/api/v1/teacher/attendance-corrections?${query}`);
}

export function requestTeacherCorrection(payload: { attendance_id: number; requested_status: TeacherCorrection["requested_status"]; reason: string }) {
  return apiFetch<ApiResource<TeacherCorrection>>("/api/v1/teacher/attendance-corrections", {
    method: "POST",
    body: payload,
  });
}

export function getTeacherAttendance(params: URLSearchParams) {
  return apiFetch<Paginated<AttendanceRecord>>(`/api/v1/teacher/attendance?${params}`);
}

export function getTeacherAttendanceReport(params: URLSearchParams) {
  return apiFetch<ApiResource<TeacherAttendanceReport>>(`/api/v1/teacher/reports/attendance?${params}`);
}

export function getTeacherSectionOptions() {
  return getMyClassSections(null).then((response) => ({
    data: response.data.map((section): SectionOption => ({
      id: section.id,
      section_code: section.section_code,
      course: { course_code: section.course.code, name: section.course.name },
    })),
  }));
}

export function getMyClassSections(status: string | null = "active", page = 1, perPage = 100, currentSemester = false) {
  const query = new URLSearchParams({ per_page: "100" });
  query.set("page", String(page));
  query.set("per_page", String(perPage));
  if (status) query.set("status", status);
  if (currentSemester) query.set("current_semester", "1");
  return apiFetch<ApiPage<TeacherClassSection>>(`/api/v1/teacher/class-sections?${query}`);
}

export async function getAllMyClassSections(status: string | null = "active", currentSemester = false) {
  const firstPage = await getMyClassSections(status, 1, 100, currentSemester);
  const sections = [...firstPage.data];
  const lastPage = firstPage.meta?.last_page ?? 1;
  for (let page = 2; page <= lastPage; page += 1) {
    const response = await getMyClassSections(status, page, 100, currentSemester);
    sections.push(...response.data);
  }
  return sections;
}

export function getMyClassSection(id: number) {
  return apiFetch<ApiResource<TeacherClassSection>>(`/api/v1/teacher/class-sections/${id}`);
}

export function getMyClassRoster(id: number) {
  return apiFetch<ApiPage<TeacherRosterStudent>>(`/api/v1/teacher/class-sections/${id}/students?per_page=50`);
}

export function getMyClassSchedules(id: number) {
  return apiFetch<ApiPage<TeacherSchedule>>(`/api/v1/teacher/class-sections/${id}/schedules`);
}

export function getTeacherSessions(filters: { status?: string; per_page?: number; date_from?: string; date_to?: string; class_section_id?: number } = {}) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.date_from) query.set("date_from", filters.date_from);
  if (filters.date_to) query.set("date_to", filters.date_to);
  if (filters.class_section_id) query.set("class_section_id", String(filters.class_section_id));
  query.set("per_page", String(filters.per_page ?? 30));
  return apiFetch<ApiPage<TeacherAttendanceSession>>(`/api/v1/teacher/attendance-sessions?${query}`);
}

export function getTeacherSession(id: number) {
  return apiFetch<ApiResource<TeacherAttendanceSession>>(`/api/v1/teacher/attendance-sessions/${id}`);
}

export function createTeacherSession(payload: {
  class_section_id: number;
  class_schedule_id: number;
  session_date: string;
  starts_at: string;
  late_after: string;
  closes_at: string;
}) {
  return apiFetch<ApiResource<TeacherAttendanceSession>>("/api/v1/teacher/attendance-sessions", {
    method: "POST",
    body: payload,
  });
}

export function getSessionAttendance(id: number, page = 1, filters: { search?: string; status?: string } = {}) {
  const query = new URLSearchParams({ per_page: "50", page: String(page) });
  if (filters.search) query.set("search", filters.search);
  if (filters.status) query.set("status", filters.status);
  return apiFetch<SessionAttendancePage>(`/api/v1/teacher/attendance-sessions/${id}/attendance?${query}`);
}

export function markSessionAttendance(id: number, records: ManualAttendanceRecord[]) {
  return apiFetch<{ data: TeacherAttendanceSession; summary: SessionAttendancePage["summary"] }>(
    `/api/v1/teacher/attendance-sessions/${id}/attendance/manual`,
    { method: "POST", body: { records } },
  );
}

export function generateSessionQrToken(id: number) {
  return apiFetch<ApiResource<{ token: string; expires_at: string }>>(
    `/api/v1/teacher/attendance-sessions/${id}/qr-token`,
    { method: "POST" },
  );
}

export function closeTeacherSession(id: number) {
  return apiFetch<{ data: TeacherAttendanceSession; summary: SessionAttendancePage["summary"] }>(
    `/api/v1/teacher/attendance-sessions/${id}/close`,
    { method: "POST" },
  );
}
