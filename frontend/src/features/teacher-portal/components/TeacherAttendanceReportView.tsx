"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CheckCircle2, Clock3, UserX, UserRoundCheck } from "lucide-react";
import { getTeacherAttendanceReport, getTeacherSectionOptions } from "../api";
import type { SectionOption } from "@/features/attendance/types";
import type { TeacherAttendanceReport } from "../types";

export function TeacherAttendanceReportView() {
  const [report, setReport] = useState<TeacherAttendanceReport | null>(null);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (sectionId) params.set("class_section_id", sectionId);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    try {
      const response = await getTeacherAttendanceReport(params);
      setReport(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your attendance report.");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, sectionId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void getTeacherSectionOptions().then((response) => setSections(response.data)).catch(() => setSections([])); }, []);

  const byStatus = report?.by_status;
  const statusRows = [
    { key: "present", label: "Present", value: byStatus?.present ?? 0, color: "bg-emerald-500", icon: UserRoundCheck },
    { key: "late", label: "Late", value: byStatus?.late ?? 0, color: "bg-amber-500", icon: Clock3 },
    { key: "absent", label: "Absent", value: byStatus?.absent ?? 0, color: "bg-rose-500", icon: UserX },
    { key: "excused", label: "Excused", value: byStatus?.excused ?? 0, color: "bg-violet-500", icon: CheckCircle2 },
  ];

  return (
    <div className="w-full space-y-6">
      <header><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Attendance reports</h1><p className="mt-2 text-sm text-muted">Summary and attendance rates from sections assigned to you.</p></header>
      <section className="flex flex-wrap items-end gap-3 rounded-panel border border-hairline bg-card p-4 shadow-soft">
        <label className="min-w-52 flex-1 text-xs font-semibold text-muted">Class section<select value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="mt-1 h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All my classes</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.course?.course_code} · {section.section_code}</option>)}</select></label>
        <label className="text-xs font-semibold text-muted">From date<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="mt-1 h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink" /></label>
        <label className="text-xs font-semibold text-muted">To date<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="mt-1 h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink" /></label>
      </section>
      {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {loading && !report ? <div className="grid gap-4 md:grid-cols-2"><div className="h-48 animate-pulse rounded-panel bg-card" /><div className="h-48 animate-pulse rounded-panel bg-card" /></div> : report && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total records" value={report.total} icon={BarChart3} />
          <Metric label="Attendance rate" value={`${report.attendance_rate.toFixed(1)}%`} icon={CheckCircle2} />
          <Metric label="Present + late" value={report.by_status.present + report.by_status.late} icon={UserRoundCheck} />
          <Metric label="Absent" value={report.by_status.absent} icon={UserX} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6"><h2 className="font-display text-lg font-bold">Records by status</h2><p className="mt-1 text-sm text-muted">Attendance rate counts present and late records.</p><div className="mt-5 space-y-4">{statusRows.map((row) => <div key={row.key}><div className="mb-1.5 flex items-center justify-between text-sm"><span className="inline-flex items-center gap-2 font-medium"><row.icon className="size-4 text-muted" />{row.label}</span><span className="font-semibold">{row.value}</span></div><div className="h-2 overflow-hidden rounded-pill bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-pill ${row.color}`} style={{ width: `${report.total ? (row.value / report.total) * 100 : 0}%` }} /></div></div>)}</div></section>
          <section className="overflow-hidden rounded-panel border border-hairline bg-card shadow-soft"><div className="border-b border-hairline p-5 sm:p-6"><h2 className="font-display text-lg font-bold">By class section</h2><p className="mt-1 text-sm text-muted">Only your assigned sections are included in this report.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-muted"><tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">Records</th><th className="px-4 py-3">Present</th><th className="px-4 py-3">Late</th><th className="px-4 py-3">Absent</th><th className="px-4 py-3">Rate</th></tr></thead><tbody className="divide-y divide-hairline">{report.by_section.length === 0 ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">No attendance records match these filters.</td></tr> : report.by_section.map((row) => <tr key={row.class_section_id}><td className="px-4 py-3 font-semibold">{row.course_code} · {row.section_code}</td><td className="px-4 py-3">{row.total}</td><td className="px-4 py-3">{row.present}</td><td className="px-4 py-3">{row.late}</td><td className="px-4 py-3">{row.absent}</td><td className="px-4 py-3"><span className="rounded-pill bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{row.attendance_rate.toFixed(1)}%</span></td></tr>)}</tbody></table></div></section>
        </div>
      </>}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof CheckCircle2 }) {
  return <div className="rounded-panel border border-hairline bg-card p-5 shadow-soft"><span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon className="size-5" /></span><p className="mt-4 text-sm text-muted">{label}</p><p className="mt-1 font-display text-3xl font-extrabold">{value}</p></div>;
}
