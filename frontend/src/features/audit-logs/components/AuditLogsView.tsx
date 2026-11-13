"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Clock,
  Eye,
  FileCode,
  Globe,
  ScrollText,
  Search,
  Shield,
  User,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchAuditLogs } from "../api";
import type { AuditLog } from "../types";

export function AuditLogsView() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLog, setActiveLog] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (action.trim()) params.set("action", action.trim());
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    try {
      const result = await fetchAuditLogs(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load system audit logs.",
      );
    } finally {
      setLoading(false);
    }
  }, [action, dateFrom, dateTo, page]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  function getActionTone(act: string): "brand" | "success" | "danger" | "neutral" {
    if (act.includes("approved")) return "success";
    if (act.includes("rejected")) return "danger";
    if (act.includes("requested") || act.includes("created")) return "brand";
    return "neutral";
  }

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Immutable system trail tracking security actions, attendance corrections, and administrative reviews."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex min-h-24 items-center gap-4 p-4">
          <span className="rounded-panel bg-brand-50 p-2.5 text-brand-600">
            <ScrollText className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Total events</p>
            <p className="font-display mt-0.5 text-xl font-bold">{total}</p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-4 p-4">
          <span className="rounded-panel bg-success-soft p-2.5 text-success">
            <Shield className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Audited Actions</p>
            <p className="font-display mt-0.5 text-xl font-bold">100% Verified</p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-4 p-4">
          <span className="rounded-panel bg-slate-100 p-2.5 text-slate-600">
            <Globe className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Client Trace</p>
            <p className="font-display mt-0.5 text-xl font-bold">IP & Actor</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Filter action"
              placeholder="Filter by action name (e.g. attendance_correction.approved)"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Date from"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-11 w-36 text-xs"
            />
            <span className="text-xs text-muted">to</span>
            <Input
              type="date"
              aria-label="Date to"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-11 w-36 text-xs"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Actor / User</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target Entity</th>
                <th className="px-5 py-3">IP Address</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    Loading audit trail…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    No audit records match these filters.
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <tr
                    key={log.id}
                    className="transition-colors hover:bg-canvas/70"
                  >
                    <td className="px-5 py-4 text-xs font-medium text-muted">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-ink">
                        {log.user?.name ?? (log.user_id ? `User #${log.user_id}` : "System")}
                      </span>
                      {log.user?.email && (
                        <div className="text-xs text-muted">
                          {log.user.email}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={getActionTone(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <span className="font-mono text-ink">
                        {log.entity_type?.split("\\").pop()}
                      </span>
                      {log.entity_id && (
                        <span className="text-muted"> #{log.entity_id}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-muted">
                      {log.ip_address ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {(log.old_values || log.new_values) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveLog(log)}
                        >
                          <Eye className="size-3.5" />
                          Inspect diff
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted">
          <span>
            Showing {items.length ? (page - 1) * 15 + 1 : 0}–
            {Math.min(page * 15, total)} of {total} events
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Diff Inspector Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-panel border border-hairline bg-card p-6 shadow-lift animate-fade-up">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  Event Diff: {activeLog.action}
                </h3>
                <p className="text-xs text-muted">
                  Entity: {activeLog.entity_type} #{activeLog.entity_id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="rounded-control p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Old Values
                </span>
                <pre className="mt-1.5 max-h-60 overflow-auto rounded-control bg-canvas p-3 font-mono text-xs text-ink">
                  {activeLog.old_values
                    ? JSON.stringify(activeLog.old_values, null, 2)
                    : "null"}
                </pre>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  New Values
                </span>
                <pre className="mt-1.5 max-h-60 overflow-auto rounded-control bg-canvas p-3 font-mono text-xs text-ink">
                  {activeLog.new_values
                    ? JSON.stringify(activeLog.new_values, null, 2)
                    : "null"}
                </pre>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActiveLog(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
