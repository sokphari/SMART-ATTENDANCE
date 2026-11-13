import { apiFetch } from "@/lib/api/client";
import type { AttendanceReportData, SectionOption, SemesterOption } from "./types";

export function fetchAttendanceReport(params: URLSearchParams) {
  return apiFetch<{ data: AttendanceReportData }>(
    `/api/v1/admin/reports/attendance?${params.toString()}`,
  );
}

export function fetchSemesters() {
  return apiFetch<{ data: SemesterOption[] }>(
    "/api/v1/admin/semesters?per_page=100",
  );
}

export function fetchClassSections() {
  return apiFetch<{ data: SectionOption[] }>(
    "/api/v1/admin/class-sections?status=active&per_page=100",
  );
}

