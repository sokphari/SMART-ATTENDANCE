import { apiFetch } from "@/lib/api/client";
import type { AcademicYearOption, Paginated, Semester, SemesterInput } from "./types";

const URL = "/api/v1/admin/semesters";

export function fetchSemesters(params: URLSearchParams) {
  return apiFetch<Paginated<Semester>>(`${URL}?${params.toString()}`);
}

export function fetchSemester(id: number) {
  return apiFetch<{ data: Semester }>(`${URL}/${id}`);
}

export function fetchAcademicYearOptions() {
  return apiFetch<Paginated<AcademicYearOption>>("/api/v1/admin/academic-years?per_page=100");
}

export function createSemester(input: SemesterInput) {
  return apiFetch<{ data: Semester }>(URL, { method: "POST", body: input });
}

export function updateSemester(id: number, input: Partial<SemesterInput>) {
  return apiFetch<{ data: Semester }>(`${URL}/${id}`, { method: "PUT", body: input });
}
