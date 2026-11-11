import { apiFetch } from "@/lib/api/client";
import type { DepartmentOption, Paginated, Teacher, TeacherInput } from "./types";

const TEACHERS_URL = "/api/v1/admin/teachers";

export function fetchTeachers(params: URLSearchParams) {
  return apiFetch<Paginated<Teacher>>(`${TEACHERS_URL}?${params.toString()}`);
}

export function fetchTeacher(id: number) {
  return apiFetch<{ data: Teacher }>(`${TEACHERS_URL}/${id}`);
}

export function fetchTeacherDepartments() {
  return apiFetch<Paginated<DepartmentOption>>("/api/v1/admin/departments?per_page=100&status=active");
}

export function createTeacher(input: TeacherInput) {
  return apiFetch<{ data: Teacher }>(TEACHERS_URL, { method: "POST", body: input });
}

export function updateTeacher(id: number, input: Partial<TeacherInput>) {
  return apiFetch<{ data: Teacher }>(`${TEACHERS_URL}/${id}`, { method: "PUT", body: input });
}
