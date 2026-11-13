import { apiFetch } from "@/lib/api/client";
import type { AuditLog, Paginated } from "./types";

const AUDIT_LOGS_URL = "/api/v1/admin/audit-logs";

export function fetchAuditLogs(params: URLSearchParams) {
  return apiFetch<Paginated<AuditLog>>(
    `${AUDIT_LOGS_URL}?${params.toString()}`,
  );
}

