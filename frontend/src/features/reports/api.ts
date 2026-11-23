import { apiFetch } from "@/lib/api/client";
import { getToken } from "@/lib/api/session";
import type { ClassReport, MonthlyReport, ReportOverview, ReportPage, SectionOption, SemesterOption, StudentOption, StudentReport, WeeklyReport } from "./types";

export type ReportsRole = "admin" | "teacher";
const root = (role: ReportsRole) => role === "teacher" ? "/api/v1/teacher/reports" : "/api/v1/admin/reports";
const query = (params: URLSearchParams) => params.toString() ? `?${params}` : "";

export const getOverview = (role: ReportsRole, params: URLSearchParams) => apiFetch<{ data: ReportOverview }>(`${root(role)}/overview${query(params)}`);
export const getDaily = (role: ReportsRole, params: URLSearchParams) => apiFetch<{ data: { date: string; summary: ReportOverview["summary"] } & ReportPage }>(`${root(role)}/daily${query(params)}`);
export const getWeekly = (role: ReportsRole, params: URLSearchParams) => apiFetch<{ data: WeeklyReport }>(`${root(role)}/weekly${query(params)}`);
export const getMonthly = (role: ReportsRole, params: URLSearchParams) => apiFetch<{ data: MonthlyReport }>(`${root(role)}/monthly${query(params)}`);
export const getStudentReport = (role: ReportsRole, id: number, params: URLSearchParams) => apiFetch<{ data: StudentReport }>(`${root(role)}/students/${id}${query(params)}`);
export const getClassReport = (role: ReportsRole, id: number, params: URLSearchParams) => apiFetch<{ data: ClassReport }>(`${root(role)}/classes/${id}${query(params)}`);

export function getReportOptions(role: ReportsRole) {
  if (role === "teacher") return Promise.resolve({ data: [] as SemesterOption[], sections: [] as SectionOption[] });
  return Promise.all([
    apiFetch<{ data: SemesterOption[] }>("/api/v1/admin/semesters?per_page=100"),
    apiFetch<{ data: SectionOption[] }>("/api/v1/admin/class-sections?status=active&per_page=100"),
  ]).then(([semesters, sections]) => ({ data: semesters.data, sections: sections.data }));
}

export async function downloadReport(role: ReportsRole, endpoint: string, params: URLSearchParams, fallbackName: string) {
  const token = getToken();
  const response = await fetch(`${root(role)}/${endpoint}${query(params)}`, {
    headers: { Accept: "application/octet-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? `Export failed (${response.status}).`);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const filename = disposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const name = decodeURIComponent(filename?.[1] ?? filename?.[2] ?? fallbackName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url);
}

export type { SectionOption, SemesterOption, StudentOption };
