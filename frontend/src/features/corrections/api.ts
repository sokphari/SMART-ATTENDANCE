import { apiFetch } from "@/lib/api/client";
import type { AttendanceCorrection, Paginated } from "./types";

const CORRECTIONS_URL = "/api/v1/admin/attendance-corrections";

export function fetchCorrections(params: URLSearchParams) {
  return apiFetch<Paginated<AttendanceCorrection>>(
    `${CORRECTIONS_URL}?${params.toString()}`,
  );
}

export function reviewCorrection(
  id: number,
  input: { status: "approved" | "rejected"; review_note?: string },
) {
  return apiFetch<{ data: AttendanceCorrection }>(
    `${CORRECTIONS_URL}/${id}/review`,
    {
      method: "POST",
      body: input,
    },
  );
}

