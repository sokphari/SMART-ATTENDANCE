"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity, AlertCircle, BarChart3, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download, RefreshCw, Users, UserX } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { fetchStudents } from "@/features/students/api";
import { getAllMyClassSections, getMyClassRoster } from "@/features/teacher-portal/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { downloadReport, getClassReport, getDaily, getMonthly, getOverview, getReportOptions, getStudentReport, getWeekly, type ReportsRole } from "../api";
import type { ClassReport, MonthlyReport, ReportOverview, ReportPage, ReportSummary, SectionOption, SemesterOption, StudentOption, StudentReport, WeeklyReport } from "../types";

type View = "overview" | "daily" | "weekly" | "monthly" | "student" | "class";
const views: View[] = ["overview", "daily", "weekly", "monthly", "student", "class"];
const emptyPage: ReportPage = { data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Phnom_Penh" });
const monthNow = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Phnom_Penh" }).slice(0, 7);

export function ReportsView({ role = "admin" }: { role?: ReportsRole }) {
  const { t } = useLocale();
  const [view, setView] = useState<View>("overview");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [weekStart, setWeekStart] = useState(today());
  const [month, setMonth] = useState(monthNow());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [daily, setDaily] = useState<{ date: string; summary: ReportSummary } & ReportPage | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null);
  const [studentReport, setStudentReport] = useState<StudentReport | null>(null);
  const [classReport, setClassReport] = useState<ClassReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    if (role === "teacher") {
      void getAllMyClassSections(null).then((result) => {
        if (alive) setSections(result.map((section) => ({ id: section.id, section_code: section.section_code, course: { course_code: section.course.code, name: section.course.name } })));
      }).catch(() => { if (alive) setSections([]); });
    } else {
      void getReportOptions(role).then((result) => {
        if (alive) { setSemesters(result.data); setSections(result.sections); }
      }).catch(() => { if (alive) setError(t("Could not load report filters.")); });
      void fetchStudents(new URLSearchParams({ per_page: "100" })).then((result) => {
        if (alive) setStudents(result.data.map((student) => ({ id: student.id, student_code: student.student_code, user: student.user ?? undefined })));
      }).catch(() => { if (alive) setStudents([]); });
    }
    return () => { alive = false; };
  }, [role, t]);

  useEffect(() => {
    setPage(1);
    setStudentId("");
    if (role === "teacher" && sectionId) {
      void getMyClassRoster(Number(sectionId)).then((result) => setStudents(result.data.map((student) => ({ id: student.id, student_code: student.student_code, user: { name: student.name, email: student.email ?? undefined } })))).catch(() => setStudents([]));
    } else if (role === "teacher") setStudents([]);
  }, [role, sectionId]);

  const filters = useMemo(() => {
    const params = new URLSearchParams({ per_page: "25", page: String(page) });
    if (sectionId) params.set("class_section_id", sectionId);
    if (semesterId) params.set("semester_id", semesterId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    return params;
  }, [dateFrom, dateTo, page, search, sectionId, semesterId, status]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      if (view === "overview") setOverview((await getOverview(role, filters)).data);
      if (view === "daily") {
        const params = new URLSearchParams(filters); params.set("date", selectedDate);
        setDaily((await getDaily(role, params)).data);
      }
      if (view === "weekly") {
        const params = new URLSearchParams(filters); params.set("week_start", weekStart);
        setWeekly((await getWeekly(role, params)).data);
      }
      if (view === "monthly") {
        const [year, monthNum] = month.split("-"); const params = new URLSearchParams(filters);
        params.set("year", year); params.set("month", monthNum);
        setMonthly((await getMonthly(role, params)).data);
      }
      if (view === "student" && studentId) setStudentReport((await getStudentReport(role, Number(studentId), filters)).data);
      if (view === "class" && sectionId) setClassReport((await getClassReport(role, Number(sectionId), filters)).data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : t("Could not load the report."));
      if (view === "overview") setOverview(null);
      if (view === "daily") setDaily(null);
      if (view === "weekly") setWeekly(null);
      if (view === "monthly") setMonthly(null);
      if (view === "student") setStudentReport(null);
      if (view === "class") setClassReport(null);
    } finally { setLoading(false); }
  }, [filters, month, role, sectionId, selectedDate, studentId, t, view, weekStart]);

  useEffect(() => { if ((view === "student" && !studentId) || (view === "class" && !sectionId)) { setLoading(false); return; } void load(); }, [load, sectionId, studentId, view]);

  const exportFile = async (format: "csv" | "xlsx" | "pdf", endpoint = "exports/attendance") => {
    setExporting(true); setError("");
    try {
      const params = new URLSearchParams(filters);
      params.delete("page"); params.delete("per_page");
      if (view === "daily") { params.set("date_from", selectedDate); params.set("date_to", selectedDate); }
      if (view === "weekly") { const range = getWeekRange(weekStart); params.set("date_from", range.from); params.set("date_to", range.to); }
      if (view === "monthly") { const range = getMonthRange(month); params.set("date_from", range.from); params.set("date_to", range.to); }
      const target = endpoint !== "exports/attendance" ? endpoint : view === "student" && studentId ? `exports/students/${studentId}` : view === "class" && sectionId ? `exports/classes/${sectionId}` : endpoint;
      params.set("format", format);
      await downloadReport(role, target, params, `attendance-report.${format}`);
    }
    catch (e) { setError(e instanceof Error ? e.message : t("Export failed.")); }
    finally { setExporting(false); }
  };

  const exportChart = async (format: "svg" | "png") => {
    const svg = chartRef.current?.querySelector("svg");
    if (!svg) return;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    copy.setAttribute("width", "1200");
    copy.setAttribute("height", "400");
    const svgBlob = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml;charset=utf-8" });
    if (format === "svg") return saveBlob(svgBlob, `attendance-trend.${format}`);
    const image = new Image();
    const objectUrl = URL.createObjectURL(svgBlob);
    image.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 400;
      const context = canvas.getContext("2d");
      if (context) { context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height); canvas.toBlob((blob) => { if (blob) saveBlob(blob, `attendance-trend.${format}`); URL.revokeObjectURL(objectUrl); }, "image/png"); }
      else URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  };

  const activeSummary = view === "daily" ? daily?.summary : view === "weekly" ? weekly?.summary : view === "monthly" ? monthly?.summary : view === "student" ? studentReport?.summary : view === "class" ? classReport?.summary : overview?.summary;
  const pageData = view === "daily" ? daily : view === "student" ? studentReport : view === "class" ? classReport : null;
  const chartData = view === "weekly" ? weekly?.daily_trend : view === "monthly" ? monthly?.monthly_trend : overview?.attendance_trend;

  return <div className="w-full space-y-5">
    <PageHeader title={t("Attendance Reports")} description={role === "teacher" ? t("Review attendance for your assigned classes.") : t("Explore attendance performance across students, classes, and time periods.")} />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-hairline bg-card p-3">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("Report type")}>
        {views.map((item) => <button key={item} role="tab" aria-selected={view === item} onClick={() => setView(item)} className={`rounded-control px-3 py-2 text-sm font-semibold transition-colors ${view === item ? "bg-brand-600 text-white" : "text-muted hover:bg-canvas hover:text-ink"}`}>{t(item[0].toUpperCase() + item.slice(1))}</button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" disabled={loading} onClick={() => void load()}><RefreshCw className="mr-2 size-4" />{t("Refresh")}</Button>
        <ExportMenu disabled={exporting || loading} onExport={(format) => void exportFile(format)} t={t} />
      </div>
    </div>

    <Card className="p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {(role === "admin") && <label className="text-xs font-semibold text-muted">{t("Semester")}<select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className={selectClass}><option value="">{t("All semesters")}</option>{semesters.map((item) => <option key={item.id} value={item.id}>{item.name} {item.academic_year?.name ? `· ${item.academic_year.name}` : ""}</option>)}</select></label>}
        {(view === "class" || view === "student" || view === "daily" || view === "weekly" || view === "monthly") && <label className="text-xs font-semibold text-muted">{t("Class section")}<select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={selectClass}><option value="">{role === "teacher" ? t("All my classes") : t("All sections")}</option>{sections.map((item) => <option key={item.id} value={item.id}>{item.course?.course_code} · {item.section_code}</option>)}</select></label>}
        {view === "student" && <label className="text-xs font-semibold text-muted">{t("Student")}<select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={selectClass}><option value="">{t("Select a student")}</option>{students.map((item) => <option key={item.id} value={item.id}>{item.user?.name ?? item.student_code} {item.student_code ? `· ${item.student_code}` : ""}</option>)}</select></label>}
        {(view === "overview" || view === "daily" || view === "student" || view === "class") && <>
          {view === "daily" ? <label className="text-xs font-semibold text-muted">{t("Report date")}<input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={selectClass} /></label> : <label className="text-xs font-semibold text-muted">{t("From date")}<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={selectClass} /></label>}
          {view !== "daily" && <label className="text-xs font-semibold text-muted">{t("To date")}<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={selectClass} /></label>}
          {(view === "daily" || view === "student" || view === "class") && <label className="text-xs font-semibold text-muted">{t("Status")}<select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}><option value="">{t("All statuses")}</option>{["present", "late", "absent", "excused", "unrecorded"].map((s) => <option key={s} value={s}>{t(s[0].toUpperCase() + s.slice(1))}</option>)}</select></label>}
        </>}
        {view === "weekly" && <label className="text-xs font-semibold text-muted">{t("Week containing")}<input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={selectClass} /></label>}
        {view === "monthly" && <label className="text-xs font-semibold text-muted">{t("Month")}<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={selectClass} /></label>}
        {(view === "daily" || view === "student" || view === "class") && <label className="text-xs font-semibold text-muted sm:col-span-2">{t("Search student")}<input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Name, student code, or email")} className={selectClass} /></label>}
      </div>
    </Card>

    {error && <div role="alert" className="flex items-start gap-2 rounded-control border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</div>}
    {loading && <div aria-live="polite" className="rounded-panel border border-hairline bg-card p-10 text-center text-sm text-muted">{t("Loading report…")}</div>}
    {!loading && <>
      {activeSummary && <SummaryCards summary={activeSummary} t={t} />}
      {(view === "overview" || view === "weekly" || view === "monthly") && <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Activity className="size-5 text-brand-600"/><div><h2 className="font-display text-base font-bold">{t("Attendance trend")}</h2><p className="text-xs text-muted">{t("Closed sessions, grouped by local calendar date.")}</p></div></div><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={!chartData?.length} onClick={() => void exportChart("svg")}>SVG</Button><Button variant="secondary" size="sm" disabled={!chartData?.length} onClick={() => void exportChart("png")}>PNG</Button></div></div><div ref={chartRef}><TrendChart points={chartData ?? []} t={t} /></div></Card>
        <Card className="p-5"><h2 className="font-display text-base font-bold">{t("By class section")}</h2><SectionTable rows={view === "weekly" ? weekly?.by_section ?? [] : view === "monthly" ? monthly?.by_section ?? [] : overview?.by_section ?? []} t={t} /></Card>
      </div>}
      {view === "weekly" && weekly && <Card className="p-5"><h2 className="font-display text-base font-bold">{t("Week over week")}</h2><p className="mt-1 text-sm text-muted">{weekly.period.from} – {weekly.period.to} · {t("previous")}: {weekly.previous_week.period.from} – {weekly.previous_week.period.to}</p><Compare current={weekly.summary} previous={weekly.previous_week.summary} t={t} /></Card>}
      {view === "monthly" && monthly && <Card className="overflow-hidden"><div className="border-b border-hairline p-5"><h2 className="font-display text-base font-bold">{t("Weekly breakdown")}</h2></div><SectionTable rows={monthly.weekly_breakdown.map((week) => ({ ...week.summary, class_section_id: week.week, section_code: `${t("Week")} ${week.week}`, course_code: `${week.from} – ${week.to}`, course_name: "" }))} t={t} /></Card>}
      {view === "daily" && <RecordsTable data={daily ?? emptyPage} t={t} page={page} setPage={setPage} />}
      {view === "student" && (studentId ? studentReport ? <><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-brand-600">{studentReport.student.student_code}</p><h2 className="font-display text-xl font-bold">{studentReport.student.name}</h2><p className="text-sm text-muted">{studentReport.student.department ?? t("No department")}</p></div><ExportMenu disabled={exporting} onExport={(format) => void exportFile(format, `exports/students/${studentId}`)} t={t} /></div></Card><RecordsTable data={studentReport} t={t} page={page} setPage={setPage} /></> : <Empty t={t("No student report is available for the selected filters.")} /> : <Empty t={role === "teacher" && !sectionId ? t("Select one of your classes, then choose a student.") : t("Select a student to view their attendance history.")} />)}
      {view === "class" && (sectionId ? classReport ? <><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-brand-600">{classReport.class.course_code} · {classReport.class.section_code}</p><h2 className="font-display text-xl font-bold">{classReport.class.course_name}</h2><p className="text-sm text-muted">{classReport.class.department ?? "—"} · {classReport.class.semester ?? "—"} · {classReport.class.academic_year ?? "—"}</p></div><ExportMenu disabled={exporting} onExport={(format) => void exportFile(format, `exports/classes/${sectionId}`)} t={t} /></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><p className="rounded-control bg-canvas p-3 text-sm">{t("Students with 3+ absences")}: <b>{classReport.summary.students_with_repeated_absences}</b></p><p className="rounded-control bg-canvas p-3 text-sm">{t("Students with 3+ late arrivals")}: <b>{classReport.summary.students_with_frequent_late_arrivals}</b></p></div></Card><Card className="overflow-hidden"><div className="border-b border-hairline p-5"><h2 className="font-display text-base font-bold">{t("Student risk indicators")}</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-canvas text-xs uppercase text-muted"><tr><th className="px-4 py-3">{t("Student")}</th><th className="px-4 py-3">{t("Present")}</th><th className="px-4 py-3">{t("Late")}</th><th className="px-4 py-3">{t("Absent")}</th><th className="px-4 py-3">{t("Unrecorded")}</th><th className="px-4 py-3">{t("Rate")}</th></tr></thead><tbody className="divide-y divide-hairline">{classReport.students.map((student) => <tr key={student.student_id}><td className="px-4 py-3"><b>{student.student_name}</b><span className="block text-xs text-muted">{student.student_code}</span></td><td className="px-4 py-3">{student.present}</td><td className="px-4 py-3">{student.late}</td><td className="px-4 py-3">{student.absent}</td><td className="px-4 py-3">{student.unrecorded}</td><td className="px-4 py-3">{formatRate(student.attendance_rate)}%</td></tr>)}</tbody></table></div></Card><RecordsTable data={classReport} t={t} page={page} setPage={setPage} /></> : <Empty t={t("No class report is available for the selected filters.")} /> : <Empty t={t("Select a class section to view its report.")} />)}
    </>}
  </div>;
}

const selectClass = "mt-1 h-10 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus:border-brand-500";
function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = name; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function getWeekRange(date: string) {
  const value = new Date(`${date}T00:00:00Z`);
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  const from = value.toISOString().slice(0, 10);
  value.setUTCDate(value.getUTCDate() + 6);
  return { from, to: value.toISOString().slice(0, 10) };
}
function getMonthRange(value: string) {
  const [year, month] = value.split("-").map(Number);
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from, to: `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}` };
}
function formatRate(value: number | null) { return value === null ? "—" : value.toFixed(1); }
function SummaryCards({ summary, t }: { summary: ReportSummary; t: (s: string) => string }) {
  const cards = [[t("Attendance rate"), summary.attendance_rate === null ? t("Not available") : `${summary.attendance_rate.toFixed(1)}%`, BarChart3], [t("Present"), summary.present, Check], [t("Late"), summary.late, Clock3], [t("Absent"), summary.absent, UserX], [t("Excused"), summary.excused, Check], [t("Unrecorded"), summary.unrecorded, CalendarDays], [t("Sessions"), summary.sessions, CalendarDays], [t("Students"), summary.students, Users]] as const;
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label} className="flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon className="size-5" /></span><div><p className="text-xs text-muted">{label}</p><p className="font-display text-xl font-bold">{value}</p></div></Card>)}</div>;
}
function TrendChart({ points, t }: { points: { date: string; summary: ReportSummary }[]; t: (s: string) => string }) {
  if (!points.length) return <Empty t={t("No finalized attendance sessions in this period.")} />;
  const width = 720, height = 220, pad = 24; const max = Math.max(100, ...points.map((p) => p.summary.opportunities));
  const x = (i: number) => pad + (points.length < 2 ? (width - 2 * pad) / 2 : i * (width - 2 * pad) / (points.length - 1));
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const line = (key: "present" | "late" | "absent") => points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.summary[key])}`).join(" ");
  return <div className="overflow-x-auto"><svg role="img" aria-label={t("Daily present, late, and absent counts")} viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[600px] w-full"><line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="currentColor" className="text-hairline"/><path d={line("present")} fill="none" stroke="#16a34a" strokeWidth="3"/><path d={line("late")} fill="none" stroke="#f59e0b" strokeWidth="3"/><path d={line("absent")} fill="none" stroke="#ef4444" strokeWidth="3"/>{points.filter((_, i) => points.length < 8 || i % Math.ceil(points.length / 7) === 0 || i === points.length-1).map((point) => <text key={point.date} x={x(points.indexOf(point))} y={height-5} textAnchor="middle" fontSize="10" fill="currentColor" className="text-muted">{point.date.slice(5)}</text>)}</svg><div className="mt-3 flex flex-wrap gap-4 text-xs text-muted"><span className="text-success">● {t("Present")}</span><span className="text-amber-500">● {t("Late")}</span><span className="text-danger">● {t("Absent")}</span></div></div>;
}
function SectionTable({ rows, t }: { rows: { class_section_id: number; section_code: string; course_code: string; course_name: string; opportunities: number; present: number; late: number; absent: number; excused: number; unrecorded: number; attendance_rate: number | null }[]; t: (s: string) => string }) {
  return <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-sm"><thead className="text-xs uppercase text-muted"><tr><th className="py-2">{t("Class")}</th><th>{t("Opportunities")}</th><th>{t("Present")}</th><th>{t("Absent")}</th><th>{t("Rate")}</th></tr></thead><tbody className="divide-y divide-hairline">{rows.map((row) => <tr key={row.class_section_id}><td className="py-3"><b>{row.course_code} · {row.section_code}</b><span className="block text-xs text-muted">{row.course_name}</span></td><td>{row.opportunities}</td><td>{row.present}</td><td>{row.absent}</td><td>{formatRate(row.attendance_rate)}%</td></tr>)}{!rows.length && <tr><td colSpan={5} className="py-8 text-center text-muted">{t("No section data for this period.")}</td></tr>}</tbody></table></div>;
}
function RecordsTable({ data, t, page, setPage }: { data: ReportPage; t: (s: string) => string; page: number; setPage: (n: number) => void }) {
  return <Card className="overflow-hidden"><div className="flex items-center justify-between border-b border-hairline p-4"><div><h2 className="font-display font-bold">{t("Attendance records")}</h2><p className="text-xs text-muted">{t("Unrecorded rows represent missing marks, not absences.")}</p></div><span className="text-xs text-muted">{data.meta.total} {t("rows")}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-canvas text-xs uppercase text-muted"><tr><th className="px-4 py-3">{t("Date")}</th><th className="px-4 py-3">{t("Student")}</th><th className="px-4 py-3">{t("Class")}</th><th className="px-4 py-3">{t("Status")}</th><th className="px-4 py-3">{t("Method")}</th><th className="px-4 py-3">{t("Check-in")}</th><th className="px-4 py-3">{t("Remarks")}</th></tr></thead><tbody className="divide-y divide-hairline">{data.data.map((row) => <tr key={`${row.session_id}-${row.student_id}`}><td className="px-4 py-3">{row.date}</td><td className="px-4 py-3"><b>{row.student_name}</b><span className="block text-xs text-muted">{row.student_code}</span></td><td className="px-4 py-3">{row.course_code} · {row.section}</td><td className="px-4 py-3"><span className="rounded-pill bg-canvas px-2 py-1 text-xs font-semibold">{t(row.status[0]?.toUpperCase()+row.status.slice(1))}</span></td><td className="px-4 py-3">{row.method ?? "—"}</td><td className="px-4 py-3">{row.check_in_time ?? "—"}</td><td className="px-4 py-3">{row.remarks ?? "—"}</td></tr>)}{!data.data.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted">{t("No attendance records match these filters.")}</td></tr>}</tbody></table></div><div className="flex items-center justify-between border-t border-hairline p-4 text-sm"><span className="text-muted">{t("Page")} {data.meta.current_page} {t("of")} {data.meta.last_page}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page-1)}><ChevronLeft className="size-4"/>{t("Previous")}</Button><Button variant="secondary" size="sm" disabled={page >= data.meta.last_page} onClick={() => setPage(page+1)}>{t("Next")}<ChevronRight className="size-4"/></Button></div></div></Card>;
}
function Compare({ current, previous, t }: { current: ReportSummary; previous: ReportSummary; t: (s: string) => string }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-3">{([[t("Attendance rate"), current.attendance_rate, previous.attendance_rate], [t("Present"), current.present, previous.present], [t("Absent"), current.absent, previous.absent]] as const).map(([label, now, before]) => <div key={label} className="rounded-control bg-canvas p-4"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-lg font-bold">{formatRate(now)}{label === t("Attendance rate") ? "%" : ""}</p><p className="text-xs text-muted">{t("Previous")}: {formatRate(before)}{label === t("Attendance rate") ? "%" : ""}</p></div>)}</div>;
}
function Empty({ t }: { t: string }) { return <div className="rounded-control border border-dashed border-hairline p-8 text-center text-sm text-muted">{t}</div>; }
function ExportMenu({ disabled, onExport, t }: { disabled: boolean; onExport: (format: "csv" | "xlsx" | "pdf") => void; t: (s: string) => string }) {
  return <div className="flex flex-wrap gap-2" aria-label={t("Export report")}>{(["xlsx", "csv", "pdf"] as const).map((format) => <Button key={format} variant="secondary" size="sm" disabled={disabled} onClick={() => onExport(format)}><Download className="mr-1.5 size-4"/>{format.toUpperCase()}</Button>)}</div>;
}
