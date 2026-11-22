"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, ClipboardList, History, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/status";
import type {
  AttendanceRecord,
  SectionOption,
} from "@/features/attendance/types";
import { getTeacherAttendance, getTeacherSectionOptions } from "../api";

export function TeacherAttendanceHistoryView() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sectionId, setSectionId] = useState(
    () => searchParams.get("class_section_id") ?? "",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), per_page: "15" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (sectionId) params.set("class_section_id", sectionId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    try {
      const response = await getTeacherAttendance(params);
      setRecords(response.data);
      setTotal(response.meta?.total ?? response.data.length);
      setLastPage(response.meta?.last_page ?? 1);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load your attendance history.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, page, search, sectionId, status]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    void getTeacherSectionOptions()
      .then((response) => setSections(response.data))
      .catch(() => setSections([]));
  }, []);

  const resetPage = () => setPage(1);

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>

          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{t("Attendance history")}</h1>
          <p className="mt-2 text-sm text-muted">{t("Review attendance records for your assigned classes.")}</p>
        </div>
        {/* <Link
          href="/teacher/corrections"
          className="inline-flex h-10 items-center gap-2 rounded-control border border-hairline bg-card px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
        >
          <ClipboardList className="size-4" />{t("My correction requests")}</Link> */}
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-panel border border-hairline bg-card p-5 shadow-soft">
          <span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
            <History className="size-5" />
          </span>
          <p className="mt-4 text-sm text-muted">{t("Matching records")}</p>
          <p className="mt-1 font-display text-3xl font-extrabold">
            {total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-panel border border-hairline bg-card p-5 shadow-soft">
          <span className="flex size-10 items-center justify-center rounded-control bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <CalendarDays className="size-5" />
          </span>
          <p className="mt-4 text-sm text-muted">{t("Showing page")}</p>
          <p className="mt-1 font-display text-3xl font-extrabold">
            {page}{" "}
            <span className="text-base font-semibold text-muted">
              of {lastPage}
            </span>
          </p>
        </div>
      </div>

      <section className="rounded-panel border border-hairline bg-card shadow-soft">
        <div className="grid gap-3 border-b border-hairline p-4 sm:grid-cols-2 xl:grid-cols-6">
          <label className="relative sm:col-span-2 xl:col-span-2">
            <span className="sr-only">{t("Search students")}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
              placeholder={t("Search student name, code, or email")}
              className="h-11 w-full rounded-control border border-hairline bg-card pl-10 pr-3 text-sm outline-none focus:border-brand-400"
            />
          </label>
          <label>
            <span className="sr-only">{t("Class section")}</span>
            <select
              value={sectionId}
              onChange={(event) => {
                setSectionId(event.target.value);
                resetPage();
              }}
              className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm"
            >
              <option value="">{t("All my classes")}</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.course?.course_code} · {section.section_code}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t("Attendance status")}</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                resetPage();
              }}
              className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm"
            >
              <option value="">{t("All statuses")}</option>
              <option value="present">{t("Present")}</option>
              <option value="late">{t("Late")}</option>
              <option value="absent">{t("Absent")}</option>
              <option value="excused">{t("Excused")}</option>
            </select>
          </label>
          <label>
            <span className="sr-only">{t("From date")}</span>
            <input
              aria-label={t("From date")}
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                resetPage();
              }}
              className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">{t("To date")}</span>
            <input
              aria-label={t("To date")}
              type="date"
              min={dateFrom || undefined}
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                resetPage();
              }}
              className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm"
            />
          </label>
        </div>
        {error && (
          <p
            role="alert"
            className="m-4 rounded-control bg-danger-soft p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">{t("Student")}</th>
                <th className="px-4 py-3">{t("Class")}</th>
                <th className="px-4 py-3">{t("Session date")}</th>
                <th className="px-4 py-3">{t("Status")}</th>
                <th className="px-4 py-3">{t("Method")}</th>
                <th className="px-4 py-3">{t("Remarks")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">
                    Loading attendance records…
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted">{t("No attendance records match these filters.")}</td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-canvas/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold">
                        {record.student?.user?.name ?? "Student"}
                      </p>
                      <p className="text-xs text-muted">
                        {record.student?.student_code}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {record.session?.class_section?.course?.course_code ??
                          "Class"}{" "}
                        · {record.session?.class_section?.section_code}
                      </p>
                      <p className="text-xs text-muted">
                        {record.session?.class_section?.course?.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {record.session?.session_date
                        ? new Date(
                            `${record.session.session_date}T00:00:00`,
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} context="attendance" />
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-muted">
                      {record.verification_method.replaceAll("_", " ")}
                    </td>
                    <td
                      className="max-w-56 truncate px-4 py-3 text-xs text-muted"
                      title={record.remarks ?? undefined}
                    >
                      {record.remarks || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline p-4">
          <p className="text-sm text-muted">
            {total
              ? `Showing ${(page - 1) * 15 + 1}–${Math.min(page * 15, total)} of ${total}`
              : "No records"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => current - 1)}
            >{t("Previous")}</Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((current) => current + 1)}
            >{t("Next")}</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
