import { apiFetch } from "@/lib/api/client";
import type { AcademicYear, AcademicYearInput, Paginated } from "./types";

const URL = "/api/v1/admin/academic-years";

export function fetchAcademicYears(params: URLSearchParams) {
  return apiFetch<Paginated<AcademicYear>>(`${URL}?${params.toString()}`);
}

export function fetchAcademicYear(id: number) {
  return apiFetch<{ data: AcademicYear }>(`${URL}/${id}`);
}

export function createAcademicYear(input: AcademicYearInput) {
  return apiFetch<{ data: AcademicYear }>(URL, { method: "POST", body: input });
}

export function updateAcademicYear(id: number, input: Partial<AcademicYearInput>) {
  return apiFetch<{ data: AcademicYear }>(`${URL}/${id}`, { method: "PUT", body: input });
}
