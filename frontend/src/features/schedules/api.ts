import { apiFetch } from "@/lib/api/client";
import type {
  ClassroomOption,
  ClassSchedule,
  ClassScheduleInput,
  Paginated,
  SectionOption,
  SemesterOption,
  TimetableConfig,
  TimetableSummary,
  TeacherWorkload,
} from "./types";

const SCHEDULES_URL = "/api/v1/admin/class-schedules";
export const SELECTED_SEMESTER_KEY = "sa_selected_semester_id";
export const MANUAL_SEMESTER_SELECTION_KEY = "sa_selected_semester_manual";

export function selectGlobalSemester(semesterId: number | null): void {
  window.localStorage.setItem(MANUAL_SEMESTER_SELECTION_KEY, "true");
  if (semesterId) window.localStorage.setItem(SELECTED_SEMESTER_KEY, String(semesterId));
  else window.localStorage.removeItem(SELECTED_SEMESTER_KEY);
  window.dispatchEvent(new CustomEvent("sa-semester-change", { detail: { semesterId } }));
}

export function chooseInitialSemester(semesters: SemesterOption[]): SemesterOption | undefined {
  const storedId = window.localStorage.getItem(SELECTED_SEMESTER_KEY);
  const wasManuallySelected = window.localStorage.getItem(MANUAL_SEMESTER_SELECTION_KEY) === "true";
  if (wasManuallySelected) {
    // Preserve an explicit user's choice. If it is no longer available, leave
    // the selector empty so the user can choose again instead of substituting.
    return storedId ? semesters.find((semester) => String(semester.id) === storedId) : undefined;
  }
  const active = semesters.find((semester) => semester.status === "active");
  return active ?? semesters.find((semester) => semester.status === "upcoming");
}

export function fetchSchedules(params: URLSearchParams) {
  return apiFetch<Paginated<ClassSchedule>>(
    `${SCHEDULES_URL}?${params.toString()}`,
  );
}

export function fetchTimetableConfiguration() {
  return apiFetch<{ data: TimetableConfig }>(`${SCHEDULES_URL}/configuration`);
}

export function fetchTimetableSummary(params: URLSearchParams) {
  return apiFetch<{ data: TimetableSummary }>(`${SCHEDULES_URL}/summary?${params.toString()}`);
}

export async function fetchSemesterOptions() {
  const semesters: SemesterOption[] = [];
  let page = 1;
  let lastPage = 1;
  do {
    const result = await apiFetch<Paginated<SemesterOption>>(`/api/v1/admin/semesters?per_page=100&page=${page}`);
    semesters.push(...result.data);
    lastPage = result.meta?.last_page ?? page;
    page += 1;
  } while (page <= lastPage);

  // Keep every configured term, even empty terms, but exclude archived or
  // malformed records from normal operational selection.
  return {
    data: semesters.filter((semester) =>
      Number.isInteger(semester.id)
      && semester.id > 0
      && Boolean(semester.name)
      && Boolean(semester.start_date)
      && Boolean(semester.end_date)
      && semester.academic_year?.status !== "archived"
      && ["active", "upcoming", "completed"].includes(semester.status),
    ),
  };
}

export function fetchTeacherWorkload(teacherId: number, semesterId: number) {
  return apiFetch<{ data: TeacherWorkload }>(`/api/v1/admin/teachers/${teacherId}/workload?semester_id=${semesterId}`);
}

export function setScheduleStatus(id: number, status: "active" | "inactive") {
  return apiFetch<{ data: ClassSchedule }>(`${SCHEDULES_URL}/${id}`, { method: "PATCH", body: { status } });
}

export function updateTimeSlot(id: number, input: { name?: string; starts_at?: string; ends_at?: string; is_active?: boolean }) {
  return apiFetch<{ data: unknown }>(`${SCHEDULES_URL}/time-slots/${id}`, { method: "PATCH", body: input });
}

export function updateTimetableSettings(input: {
  max_weekly_teaching_hours: number;
  max_assigned_sections: number | null;
  automatic_attendance_enabled: boolean;
  late_after_minutes: number;
  check_in_window_minutes: number;
  geofencing_enabled: boolean;
  gps_accuracy_threshold_meters: number;
}) {
  return apiFetch<{ data: unknown }>(`${SCHEDULES_URL}/settings`, { method: "PATCH", body: input });
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

export function fetchSectionOptions(semesterId?: number, activeOnly = true) {
  return apiFetch<Paginated<SectionOption>>(
    `/api/v1/admin/class-sections?per_page=100${activeOnly ? "&status=active" : ""}${semesterId ? `&semester_id=${semesterId}` : ""}`,
  );
}

