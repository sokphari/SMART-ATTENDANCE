import { apiFetch } from "@/lib/api/client";
import type { AttendanceRecord, Paginated, SectionOption } from "./types";

const ATTENDANCE_URL = "/api/v1/admin/attendance";

export function fetchAttendanceRecords(params: URLSearchParams) {
  return apiFetch<Paginated<AttendanceRecord>>(
    `${ATTENDANCE_URL}?${params.toString()}`,
  );
}

export function fetchClassSectionsOptions(semesterId?: number) {
  return apiFetch<Paginated<SectionOption>>(
    `/api/v1/admin/class-sections?status=active&per_page=100${semesterId ? `&semester_id=${semesterId}` : ""}`,
  );
}


export type ActiveQrSession = {
  id: number;
  status: "open" | "closed" | "scheduled";
  starts_at: string;
  closes_at: string;
  class_section?: { section_code: string; course?: { name?: string; course_code?: string; code?: string } } | null;
  classroom?: { room_code: string } | null;
  teacher?: { user?: { name: string } } | null;
};

export type QrTokenData = { token: string; expires_at: string };

export function fetchActiveQrSessions() {
  return apiFetch<{ data: ActiveQrSession[] }>("/api/v1/admin/attendance/qr-sessions");
}

export function generateAdminQrToken(sessionId: number) {
  return apiFetch<{ data: QrTokenData }>(
    `/api/v1/admin/attendance/qr-sessions/${sessionId}/qr-token`,
    { method: "POST" },
  );
}
