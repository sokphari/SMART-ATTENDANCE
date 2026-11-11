import { apiFetch } from "@/lib/api/client";
import type { DashboardSummary } from "./types";

export function fetchDashboardSummary() {
  return apiFetch<{ data: DashboardSummary }>("/api/v1/admin/dashboard");
}
