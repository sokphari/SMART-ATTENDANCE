"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  Layers,
  MapPin,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserX,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { StatusBadge } from "@/components/ui/status";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchAttendanceRecords, fetchClassSectionsOptions } from "../api";
import { AdminAttendanceQrDialog } from "./AdminAttendanceQrDialog";
import type { AttendanceRecord, SectionOption } from "../types";

export function AttendanceView() {
  const { t } = useLocale();
  const [items, setItems] = useState<AttendanceRecord[]>([]);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (sectionId) params.set("class_section_id", sectionId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    try {
      const result = await fetchAttendanceRecords(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load attendance logs.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, search, sectionId, status]);

  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    fetchClassSectionsOptions()
      .then((res) => setSections(res.data))
      .catch(() => setSections([]));
  }, []);

  const counts = useMemo(() => {
    const present = items.filter((i) => i.status === "present").length;
    const late = items.filter((i) => i.status === "late").length;
    const absent = items.filter((i) => i.status === "absent").length;
    return { present, late, absent };
  }, [items]);

  const hasActiveFilters = Boolean(search || status || sectionId || dateFrom || dateTo);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setSectionId("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const rangeStart = items.length ? (page - 1) * 15 + 1 : 0;
  const rangeEnd = Math.min(page * 15, total);
  const rangeLabel = t("Showing {start}–{end} of {total} records")
    .replace("{start}", String(rangeStart))
    .replace("{end}", String(rangeEnd))
    .replace("{total}", String(total));

  return (
    <>
      <PageHeader
        title={t("Attendance Records")}
        description={t("Review student check-ins, verification methods, and attendance status.")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void loadAttendance()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />{t("Refresh")}
            </Button>
            <Button onClick={() => setQrDialogOpen(true)}><QrCode className="size-4" />{t("Open Student QR")}</Button>
          </div>
        }
      />
      <AdminAttendanceQrDialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex min-h-24 items-center gap-3.5 border-brand-200/70 p-4 dark:border-brand-500/20">
          <span className="rounded-panel bg-brand-50 p-3 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <Layers className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">{t("Matching records")}</p>
            <p className="font-display mt-0.5 text-xl font-bold">{total}</p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-3.5 p-4">
          <span className="rounded-panel bg-success-soft p-3 text-success">
            <UserCheck className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">{t("Present on this page")}</p>
            <p className="font-display mt-0.5 text-xl font-bold">
              {counts.present}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-3.5 p-4">
          <span className="rounded-panel bg-warning-soft p-3 text-amber-600">
            <Clock className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">{t("Late on this page")}</p>
            <p className="font-display mt-0.5 text-xl font-bold">{counts.late}</p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-3.5 p-4">
          <span className="rounded-panel bg-danger-soft p-3 text-danger">
            <UserX className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">{t("Absent on this page")}</p>
            <p className="font-display mt-0.5 text-xl font-bold">
              {counts.absent}
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-hairline bg-canvas-subtle/60 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                <SlidersHorizontal className="size-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold">{t("Filter attendance")}</h2>
                <p className="text-xs text-muted">{t("Narrow records by student, class, status, or date.")}</p>
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                <RotateCcw className="size-3.5" />{t("Clear filters")}
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(15rem,1.5fr)_repeat(2,minmax(10rem,1fr))_repeat(2,minmax(9rem,0.85fr))]">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label={t("Search attendance records")}
              placeholder={t("Search by student name or code")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <select
            aria-label={t("Filter by section")}
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setPage(1);
            }}
            className="h-11 min-w-0 rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100"
          >
            <option value="">{t("All sections")}</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course?.course_code} · {t("Section")} {s.section_code}
              </option>
            ))}
          </select>
          <select
            aria-label={t("Filter by status")}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 min-w-0 rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-100"
          >
            <option value="">{t("All statuses")}</option>
            <option value="present">{t("Present")}</option>
            <option value="late">{t("Late")}</option>
            <option value="absent">{t("Absent")}</option>
            <option value="excused">{t("Excused")}</option>
          </select>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            {t("From date")}
            <Input
              type="date"
              aria-label={t("From date")}
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full text-sm"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted">
            {t("To date")}
            <Input
              type="date"
              aria-label={t("To date")}
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full text-sm"
            />
          </label>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-4 flex items-start gap-2 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error === "Could not load attendance logs." ? t(error) : error}
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">{t("Student")}</th>
                <th className="px-5 py-3">{t("Section & Course")}</th>
                <th className="px-5 py-3">{t("Status")}</th>
                <th className="px-5 py-3">{t("Verification")}</th>
                <th className="px-5 py-3">{t("Check-In Time")}</th>
                <th className="px-5 py-3">{t("Geofence / Accuracy")}</th>
                <th className="px-5 py-3">{t("Session Date")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    {t("Loading attendance records…")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    {t("No attendance records match these filters.")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-canvas/70"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-semibold text-ink">
                          {row.student?.user?.name ?? t("Student")}
                        </span>
                        <div className="text-xs text-muted">
                          {row.student?.student_code}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-medium text-ink">
                        {row.session?.class_section?.course?.course_code ?? "—"}
                      </span>
                      <div className="text-xs text-muted">
                        {t("Section")} {row.session?.class_section?.section_code}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={row.status} context="attendance" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {row.verification_method === "dynamic_qr" && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                            <QrCode className="size-3" />
                            {t("Dynamic QR")}
                          </span>
                        )}
                        {row.verification_method === "system" && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                            {t("Auto Absent")}
                          </span>
                        )}
                        {row.verification_method === "manual" && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                            {t("Manual")}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {row.checked_in_at
                        ? new Date(row.checked_in_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {row.distance_meters !== null ? (
                        <div className="flex items-center gap-1 text-slate-700">
                          <MapPin className="size-3.5 text-muted" />
                          <span>
                            {Math.round(row.distance_meters)} m (±
                            {Math.round(row.gps_accuracy_meters ?? 0)} m)
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      {row.session?.session_date ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted">
          <span>
            {rangeLabel}
          </span>
          <div className="flex gap-2">
            <span className="hidden self-center px-1 text-xs sm:inline">
              {t("Page")} {page} {t("of")} {lastPage}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              {t("Previous")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              {t("Next")}
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
