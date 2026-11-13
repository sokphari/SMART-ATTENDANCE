import { apiFetch } from "@/lib/api/client";
import type { AttendanceRecord, Paginated, SectionOption } from "./types";

const ATTENDANCE_URL = "/api/v1/admin/attendance";

export function fetchAttendanceRecords(params: URLSearchParams) {
  return apiFetch<Paginated<AttendanceRecord>>(
    `${ATTENDANCE_URL}?${params.toString()}`,
  );
}

export function fetchClassSectionsOptions() {
  return apiFetch<Paginated<SectionOption>>(
    "/api/v1/admin/class-sections?status=active&per_page=100",
  );
}

