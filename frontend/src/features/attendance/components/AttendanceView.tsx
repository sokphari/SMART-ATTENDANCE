"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  QrCode,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserX,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchAttendanceRecords, fetchClassSectionsOptions } from "../api";
import type { AttendanceRecord, SectionOption } from "../types";

export function AttendanceView() {
  const [items, setItems] = useState<AttendanceRecord[]>([]);
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

  function getStatusTone(s: string): "success" | "warning" | "danger" | "neutral" {
    switch (s) {
      case "present":
        return "success";
      case "late":
        return "warning";
      case "absent":
        return "danger";
      default:
        return "neutral";
    }
  }

  return (
    <>
      <PageHeader
        title="Attendance Records"
        description="Live log of student check-ins, dynamic QR verification, GPS distance, and final statuses."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Card className="flex min-h-24 items-center gap-3.5 p-4">
          <span className="rounded-panel bg-brand-50 p-2.5 text-brand-600">
            <Layers className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Total records</p>
            <p className="font-display mt-0.5 text-xl font-bold">{total}</p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-3.5 p-4">
          <span className="rounded-panel bg-success-soft p-2.5 text-success">
            <UserCheck className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Present (page)</p>
            <p className="font-display mt-0.5 text-xl font-bold">
              {counts.present}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-3.5 p-4">
          <span className="rounded-panel bg-warning-soft p-2.5 text-amber-600">
            <Clock className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Late (page)</p>
            <p className="font-display mt-0.5 text-xl font-bold">{counts.late}</p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-3.5 p-4">
          <span className="rounded-panel bg-danger-soft p-2.5 text-danger">
            <UserX className="size-5" />
          </span>
          <div>
            <p className="text-xs text-muted">Absent (page)</p>
            <p className="font-display mt-0.5 text-xl font-bold">
              {counts.absent}
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Search records"
              placeholder="Search student code or name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter by section"
            value={sectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">All sections</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.course?.course_code} Sec {s.section_code}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
            <option value="excused">Excused</option>
          </select>
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
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Section & Course</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Verification</th>
                <th className="px-5 py-3">Check-In Time</th>
                <th className="px-5 py-3">Geofence / Accuracy</th>
                <th className="px-5 py-3">Session Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    Loading attendance records…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    No attendance records match these filters.
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
                          {row.student?.user?.name ?? "Student"}
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
                        Section {row.session?.class_section?.section_code}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge tone={getStatusTone(row.status)}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {row.verification_method === "dynamic_qr" && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-50 px-2 py-0.5 text-brand-700">
                            <QrCode className="size-3" />
                            Dynamic QR
                          </span>
                        )}
                        {row.verification_method === "system" && (
                          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-700">
                            Auto Absent
                          </span>
                        )}
                        {row.verification_method === "manual" && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-amber-700">
                            Manual
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
                            {Math.round(row.distance_meters)}m (±
                            {Math.round(row.gps_accuracy_meters ?? 0)}m)
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
            Showing {items.length ? (page - 1) * 15 + 1 : 0}–
            {Math.min(page * 15, total)} of {total} records
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
    </>
  );
}
