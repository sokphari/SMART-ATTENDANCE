import { apiFetch } from "@/lib/api/client";
import type { Department, DepartmentInput, Paginated } from "./types";

const DEPARTMENTS_URL = "/api/v1/admin/departments";

export function fetchDepartments(params: URLSearchParams) {
  return apiFetch<Paginated<Department>>(`${DEPARTMENTS_URL}?${params.toString()}`);
}

export function fetchDepartment(id: number) {
  return apiFetch<{ data: Department }>(`${DEPARTMENTS_URL}/${id}`);
}

export function createDepartment(input: DepartmentInput) {
  return apiFetch<{ data: Department }>(DEPARTMENTS_URL, { method: "POST", body: input });
}

export function updateDepartment(id: number, input: Partial<DepartmentInput>) {
  return apiFetch<{ data: Department }>(`${DEPARTMENTS_URL}/${id}`, { method: "PUT", body: input });
}
