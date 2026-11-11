import { apiFetch } from "@/lib/api/client";
import type { Course, CourseInput, DepartmentOption, Paginated } from "./types";

const COURSES_URL = "/api/v1/admin/courses";

export function fetchCourses(params: URLSearchParams) {
  return apiFetch<Paginated<Course>>(`${COURSES_URL}?${params.toString()}`);
}

export function fetchCourse(id: number) {
  return apiFetch<{ data: Course }>(`${COURSES_URL}/${id}`);
}

export function fetchCourseDepartments() {
  return apiFetch<Paginated<DepartmentOption>>("/api/v1/admin/departments?per_page=100");
}

export function createCourse(input: CourseInput) {
  return apiFetch<{ data: Course }>(COURSES_URL, { method: "POST", body: input });
}

export function updateCourse(id: number, input: Partial<CourseInput>) {
  return apiFetch<{ data: Course }>(`${COURSES_URL}/${id}`, { method: "PUT", body: input });
}
