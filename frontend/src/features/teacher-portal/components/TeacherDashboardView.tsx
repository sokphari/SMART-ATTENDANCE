"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clock3, RotateCw, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/status";
import { getTeacherDashboard } from "../api";
import type { TeacherDashboardData } from "../types";

export function TeacherDashboardView() {
  const [dashboard, setDashboard] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await getTeacherDashboard();
      setDashboard(response.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your Dashboard.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const attendance = dashboard?.summary.attendance_last_7_days;
  const attendanceTotal = attendance ? attendance.present + attendance.late + attendance.absent + attendance.excused : 0;
  const dateLabel = dashboard ? new Intl.DateTimeFormat(undefined, { dateStyle: "full", timeZone: dashboard.timezone }).format(new Date(`${dashboard.date}T12:00:00+07:00`)) : "";
  const nextClass = dashboard?.today_schedule.find((item) => item.status === "in_progress") ?? dashboard?.today_schedule.find((item) => item.status === "upcoming");

  return (
    <div className="w-full space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Your teaching overview</h1><p className="mt-2 text-sm text-muted">{dateLabel || "Your schedule, attendance sessions, and recent activity."}</p></div>
        <Button variant="secondary" size="sm" onClick={() => void load()} loading={loading}><RotateCw className="size-4" />Refresh</Button>
      </header>

      {error && <div role="alert" className="flex items-start gap-3 rounded-panel border border-rose-200 bg-danger-soft p-4 text-sm text-danger"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><div className="flex-1">{error}</div><Button size="sm" variant="secondary" onClick={() => void load()}>Try again</Button></div>}

      {loading && !dashboard ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <div key={item} className="h-32 animate-pulse rounded-panel border border-hairline bg-card" />)}</div> : dashboard && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={BookOpen} label="My assigned classes" value={dashboard.summary.assigned_classes} detail="Active semester" tone="brand" />
            <MetricCard icon={CalendarDays} label="Today's sessions" value={dashboard.summary.today_sessions} detail="Scheduled for today" tone="green" />
            <MetricCard icon={Users} label="Students checked in today" value={dashboard.summary.checked_in_today} detail="Present or late" tone="violet" />
            <MetricCard icon={Clock3} label="Pending attendance reviews" value={dashboard.summary.pending_attendance_reviews} detail="Awaiting teacher review" tone={dashboard.summary.pending_attendance_reviews ? "amber" : "slate"} />
          </section>

          {nextClass && <section className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-brand-200 bg-brand-50 p-5 dark:border-brand-400/20 dark:bg-brand-500/10"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">{nextClass.status === "in_progress" ? "Class in progress" : "Next scheduled class"}</p><h2 className="mt-1 font-display text-lg font-bold">{nextClass.course_code} · {nextClass.class_name}</h2><p className="mt-1 text-sm text-muted">Section {nextClass.section_code} · {nextClass.start_time.slice(0, 5)}–{nextClass.end_time.slice(0, 5)} · {nextClass.classroom}</p></div><Link href={`/teacher/classes/${nextClass.class_section_id}`} className="inline-flex min-h-10 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white">View class <ArrowRight className="size-4" /></Link></section>}

          <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Today’s schedule</h2><p className="mt-1 text-sm text-muted">Only active sections assigned to you are included.</p></div><Link href="/teacher/classes" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">My classes <ArrowRight className="size-4" /></Link></div>
            {dashboard.today_schedule.length === 0 ? <div className="mt-5 rounded-control bg-canvas p-5 text-sm text-muted">No classes are scheduled for today.</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{dashboard.today_schedule.map((item) => <article key={item.id} className="rounded-control border border-hairline p-4"><div className="flex flex-wrap gap-2"><span className="rounded-pill bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{item.course_code}</span><span className="rounded-pill bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">Section {item.section_code}</span><StatusBadge status={item.status} context="teaching" className="min-h-5 px-1.5 text-[10px]" /></div><h3 className="mt-3 font-semibold">{item.class_name}</h3><p className="mt-1 text-xs text-muted">{item.semester}</p><p className="mt-3 text-sm font-semibold">{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}</p><p className="mt-1 text-xs text-muted">{item.classroom}{item.building ? ` · ${item.building}` : ""}</p><div className="mt-4 flex flex-wrap gap-x-3 gap-y-2 border-t border-hairline pt-3 text-xs font-semibold"><Link href={`/teacher/classes/${item.class_section_id}`} className="text-brand-600 hover:text-brand-700">View students</Link><Link href={`/teacher/timetable?section_id=${item.class_section_id}`} className="text-brand-600 hover:text-brand-700">Timetable</Link>{item.attendance_session_id && <Link href={`/teacher/attendance-sessions/${item.attendance_session_id}`} className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-300">Open live attendance</Link>}</div></article>)}</div>}
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Open sessions</h2><p className="mt-1 text-sm text-muted">Continue attendance or close sessions that have ended.</p></div><Link href="/teacher/attendance-sessions" className="text-sm font-semibold text-brand-600 hover:text-brand-700">All sessions</Link></div>
              {dashboard.open_sessions.length === 0 ? <div className="mt-5 rounded-control bg-canvas p-5 text-sm text-muted">No attendance sessions are currently open.</div> : <div className="mt-5 space-y-3">{dashboard.open_sessions.map((session) => <Link key={session.id} href={`/teacher/attendance-sessions/${session.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-control border border-hairline p-4 transition hover:border-brand-300 hover:bg-brand-50/40"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-pill bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{session.course_code}</span><span className="text-sm font-bold">Section {session.section_code}</span>{session.awaiting_closure && <span className="rounded-pill bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Needs closure</span>}</div><p className="mt-2 text-sm font-semibold">{session.class_name}</p><p className="mt-1 text-xs text-muted">Closes {new Date(session.closes_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {session.classroom}</p></div><span className="inline-flex items-center gap-1.5 text-xs text-muted"><CheckCircle2 className="size-4 text-emerald-600" />{session.attendance.present + session.attendance.late} checked in</span></Link>)}</div>}
            </section>

            <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6"><h2 className="font-display text-lg font-bold">Attendance · last 7 days</h2><p className="mt-1 text-sm text-muted">Records from your sessions only.</p><div className="mt-5 space-y-4">{([['Present', attendance?.present ?? 0, "bg-emerald-500"], ['Late', attendance?.late ?? 0, "bg-amber-500"], ['Absent', attendance?.absent ?? 0, "bg-rose-500"], ['Excused', attendance?.excused ?? 0, "bg-violet-500"]] as const).map(([label, value, color]) => <div key={label}><div className="mb-1.5 flex justify-between text-sm"><span className="font-medium">{label}</span><span className="font-semibold">{value}</span></div><div className="h-2 overflow-hidden rounded-pill bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-pill ${color}`} style={{ width: `${attendanceTotal ? (value / attendanceTotal) * 100 : 0}%` }} /></div></div>)}</div></section>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail, tone }: { icon: typeof CalendarDays; label: string; value: number; detail: string; tone: "brand" | "green" | "amber" | "slate" | "violet" }) {
  const tones = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  };
  return <div className="rounded-panel border border-hairline bg-card p-5 shadow-soft"><span className={`flex size-10 items-center justify-center rounded-control ${tones[tone]}`}><Icon className="size-5" /></span><p className="mt-4 text-sm font-medium text-muted">{label}</p><div className="mt-1 flex items-baseline justify-between gap-3"><span className="font-display text-3xl font-extrabold">{value}</span><span className="text-xs text-muted">{detail}</span></div></div>;
}
