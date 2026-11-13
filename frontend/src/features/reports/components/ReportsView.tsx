"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Percent,
  TrendingUp,
  UserCheck,
  UserX,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  fetchAttendanceReport,
  fetchClassSections,
  fetchSemesters,
} from "../api";
import type {
  AttendanceReportData,
  SectionOption,
  SemesterOption,
} from "../types";

export function ReportsView() {
  const [report, setReport] = useState<AttendanceReportData | null>(null);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [semesterId, setSemesterId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (semesterId) params.set("semester_id", semesterId);
    if (sectionId) params.set("class_section_id", sectionId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);

    try {
      const res = await fetchAttendanceReport(params);
      setReport(res.data);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load attendance analytics report.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, sectionId, semesterId]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    fetchSemesters()
      .then((res) => setSemesters(res.data))
      .catch(() => setSemesters([]));

    fetchClassSections()
      .then((res) => setSections(res.data))
      .catch(() => setSections([]));
  }, []);

  const rate = report?.attendance_rate ?? 0;

  return (
    <>
      <PageHeader
        title="Attendance Reports"
        description="Aggregated attendance statistics, participation rates, and section-by-section breakdown."
      />

      {/* Filter Bar */}
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1 text-xs font-semibold text-muted">
            FILTER ANALYTICS
          </div>
          <select
            aria-label="Filter by semester"
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            className="h-10 rounded-control border border-hairline bg-card px-3 text-xs text-ink"
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.academic_year ? `(${s.academic_year.name})` : ""}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by section"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="h-10 rounded-control border border-hairline bg-card px-3 text-xs text-ink"
          >
            <option value="">All Class Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.course?.course_code} Sec {sec.section_code}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              aria-label="Date from"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-10 w-36 text-xs"
            />
            <span className="text-xs text-muted">to</span>
            <Input
              type="date"
              aria-label="Date to"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-10 w-36 text-xs"
            />
          </div>
          {(semesterId || sectionId || dateFrom || dateTo) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSemesterId("");
                setSectionId("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </Card>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      {/* KPI Cards */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-panel bg-brand-50 text-brand-600">
            <TrendingUp className="size-6" />
          </div>
          <div>
            <p className="text-xs text-muted">Attendance Rate</p>
            <p className="font-display text-2xl font-bold text-ink">
              {loading ? "…" : `${rate}%`}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-panel bg-success-soft text-success">
            <UserCheck className="size-6" />
          </div>
          <div>
            <p className="text-xs text-muted">Present Total</p>
            <p className="font-display text-2xl font-bold text-ink">
              {loading ? "…" : (report?.by_status.present ?? 0)}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-panel bg-amber-50 text-amber-600">
            <Clock className="size-6" />
          </div>
          <div>
            <p className="text-xs text-muted">Late Arrivals</p>
            <p className="font-display text-2xl font-bold text-ink">
              {loading ? "…" : (report?.by_status.late ?? 0)}
            </p>
          </div>
        </Card>

        <Card className="flex items-center gap-4 p-5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-panel bg-danger-soft text-danger">
            <UserX className="size-6" />
          </div>
          <div>
            <p className="text-xs text-muted">Total Absences</p>
            <p className="font-display text-2xl font-bold text-ink">
              {loading ? "…" : (report?.by_status.absent ?? 0)}
            </p>
          </div>
        </Card>
      </div>

      {/* Visual Rate Bar */}
      <Card className="mb-5 p-5">
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span>Overall Health Indicator</span>
          <span>{rate}% present or late</span>
        </div>
        <div className="mt-2.5 h-3.5 w-full overflow-hidden rounded-full bg-canvas">
          <div
            className={`h-full transition-all duration-500 ${
              rate >= 80
                ? "bg-success"
                : rate >= 60
                  ? "bg-amber-500"
                  : "bg-danger"
            }`}
            style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          <span>0%</span>
          <span>Target: 80%+</span>
          <span>100%</span>
        </div>
      </Card>

      {/* Per-Section Breakdown Table */}
      <Card className="overflow-hidden">
        <div className="border-b border-hairline p-4">
          <h3 className="font-display text-base font-bold text-ink">
            Breakdown by Class Section
          </h3>
          <p className="text-xs text-muted">
            Section-level totals and performance metrics.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Course Code</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3 text-center">Total Check-Ins</th>
                <th className="px-5 py-3 text-center">Present</th>
                <th className="px-5 py-3 text-center">Late</th>
                <th className="px-5 py-3 text-center">Absent</th>
                <th className="px-5 py-3 text-center">Excused</th>
                <th className="px-5 py-3 text-right">Attendance Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted">
                    Loading report breakdown…
                  </td>
                </tr>
              ) : !report?.by_section || report.by_section.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted">
                    No section attendance recorded for this filter.
                  </td>
                </tr>
              ) : (
                report.by_section.map((sec) => (
                  <tr
                    key={sec.class_section_id}
                    className="transition-colors hover:bg-canvas/70"
                  >
                    <td className="px-5 py-4 font-semibold text-ink">
                      {sec.course_code}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">
                        Section {sec.section_code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-medium">
                      {sec.total}
                    </td>
                    <td className="px-5 py-4 text-center text-success font-medium">
                      {sec.present}
                    </td>
                    <td className="px-5 py-4 text-center text-amber-600 font-medium">
                      {sec.late}
                    </td>
                    <td className="px-5 py-4 text-center text-danger font-medium">
                      {sec.absent}
                    </td>
                    <td className="px-5 py-4 text-center text-muted">
                      {sec.excused}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-ink">
                          {sec.attendance_rate}%
                        </span>
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-canvas">
                          <div
                            className={`h-full ${
                              sec.attendance_rate >= 80
                                ? "bg-success"
                                : sec.attendance_rate >= 60
                                  ? "bg-amber-500"
                                  : "bg-danger"
                            }`}
                            style={{ width: `${sec.attendance_rate}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
