import { apiFetch } from "@/lib/api/client";
import type {
  ClassroomOption,
  ClassSchedule,
  ClassScheduleInput,
  Paginated,
  SectionOption,
} from "./types";

const SCHEDULES_URL = "/api/v1/admin/class-schedules";

export function fetchSchedules(params: URLSearchParams) {
  return apiFetch<Paginated<ClassSchedule>>(
    `${SCHEDULES_URL}?${params.toString()}`,
  );
}

export function fetchSchedule(id: number) {
  return apiFetch<{ data: ClassSchedule }>(`${SCHEDULES_URL}/${id}`);
}

export function createSchedule(input: ClassScheduleInput) {
  return apiFetch<{ data: ClassSchedule }>(SCHEDULES_URL, {
    method: "POST",
    body: input,
  });
}

export function updateSchedule(
  id: number,
  input: Partial<ClassScheduleInput>,
) {
  return apiFetch<{ data: ClassSchedule }>(`${SCHEDULES_URL}/${id}`, {
    method: "PUT",
    body: input,
  });
}

export function deleteSchedule(id: number) {
  return apiFetch<null>(`${SCHEDULES_URL}/${id}`, {
    method: "DELETE",
  });
}

export function fetchClassroomOptions() {
  return apiFetch<Paginated<ClassroomOption>>(
    "/api/v1/admin/classrooms?status=active&per_page=100",
  );
}

export function fetchSectionOptions() {
  return apiFetch<Paginated<SectionOption>>(
    "/api/v1/admin/class-sections?status=active&per_page=100",
  );
}

