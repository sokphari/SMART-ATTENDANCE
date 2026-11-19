"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, Plus, ScanLine } from "lucide-react";
import { getTeacherSessions } from "../api";
import type { TeacherAttendanceSession } from "../types";

const STATUS_STYLES: Record<TeacherAttendanceSession["status"], string> = {
  scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  open: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  cancelled: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};

function sessionLabel(session: TeacherAttendanceSession) {
  const course = session.class_section.course;
  return `${course?.course_code ?? course?.code ?? "Class"} · Section ${session.class_section.section_code}`;
}

export function TeacherSessionsView() {
  const searchParams = useSearchParams();
  const classSectionId = Number(searchParams.get("class_section_id")) || undefined;
  const [sessions, setSessions] = useState<TeacherAttendanceSession[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const loadSessions = () => getTeacherSessions({ status: status || undefined, per_page: 50, class_section_id: classSectionId })
      .then((response) => setSessions(response.data))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load your attendance sessions."));
    void loadSessions().finally(() => setLoading(false));
    const timer = window.setInterval(() => void loadSessions(), 15000);
    return () => window.clearInterval(timer);
  }, [status, classSectionId]);

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Live Attendance</h1><p className="mt-2 text-sm text-muted">Review scheduled and open attendance sessions for your assigned classes.</p></div>
        <Link href="/teacher/attendance-sessions/create" className="inline-flex h-11 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white shadow-soft hover:bg-brand-700"><Plus className="size-4" />Open session</Link>
      </header>

      <div className="flex flex-wrap items-center gap-3"><label htmlFor="session-status" className="text-sm font-semibold">Filter sessions</label><select id="session-status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 min-w-44 rounded-control border border-hairline bg-card px-3 text-sm outline-none focus:border-brand-400"><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="open">Open</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option></select>{classSectionId && <Link href="/teacher/attendance-sessions" className="text-sm font-semibold text-brand-600">Show all classes</Link>}</div>

      {error && <div role="alert" className="rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</div>}
      {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-panel border border-hairline bg-card" />)}</div> : sessions.length === 0 ? <div className="rounded-panel border border-hairline bg-card p-10 text-center"><CalendarClock className="mx-auto size-8 text-muted" /><h2 className="mt-3 font-semibold">No attendance sessions found</h2><p className="mt-1 text-sm text-muted">Open a session from one of your assigned classes to begin taking attendance.</p><Link href="/teacher/attendance-sessions/create" className="mt-4 inline-flex h-10 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white"><Plus className="size-4" />Open session</Link></div> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sessions.map((session) => <Link key={session.id} href={`/teacher/attendance-sessions/${session.id}`} className="rounded-panel border border-hairline bg-card p-5 shadow-soft transition hover:border-brand-300 hover:shadow-lift">
          <div className="flex items-start justify-between gap-3"><span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><ScanLine className="size-5" /></span><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[session.status]}`}>{session.status}</span></div>
          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-brand-600">{sessionLabel(session)}</p><h2 className="mt-1 font-display text-lg font-bold">{session.class_section.course?.name ?? "Attendance session"}</h2>
          <p className="mt-2 text-sm text-muted">{new Date(`${session.session_date}T00:00:00`).toLocaleDateString()}</p><p className="mt-1 text-xs text-muted">{new Date(session.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–{new Date(session.closes_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{session.classroom?.room_code ? ` · ${session.classroom.room_code}` : ""}</p>
        </Link>)}</div>
      )}
    </div>
  );
}
