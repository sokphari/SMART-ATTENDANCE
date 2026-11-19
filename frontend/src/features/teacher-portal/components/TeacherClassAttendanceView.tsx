"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, ClipboardCheck, QrCode } from "lucide-react";
import { getMyClassSection, getTeacherSessions } from "../api";
import type { TeacherAttendanceSession, TeacherClassSection } from "../types";
import { TeacherSessionDetailView } from "./TeacherSessionDetailView";

function campusDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Phnom_Penh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function TeacherClassAttendanceView({ sectionId }: { sectionId: number }) {
  const [section, setSection] = useState<TeacherClassSection | null>(null);
  const [session, setSession] = useState<TeacherAttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    const today = campusDate();
    Promise.all([
      getMyClassSection(sectionId),
      getTeacherSessions({ class_section_id: sectionId, date_from: today, date_to: today, per_page: 100 }),
    ]).then(([sectionResponse, sessionsResponse]) => {
      if (!current) return;
      setSection(sectionResponse.data);
      const todaySessions = sessionsResponse.data;
      setSession(todaySessions.find((item) => item.status === "open")
        ?? todaySessions.find((item) => item.status === "scheduled")
        ?? todaySessions.find((item) => item.status === "closed")
        ?? null);
    }).catch((caught: unknown) => {
      if (current) setError(caught instanceof Error ? caught.message : "Could not load this class attendance page.");
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [sectionId]);

  if (loading) return <div className="w-full animate-pulse space-y-4"><div className="h-8 w-64 rounded bg-slate-200" /><div className="h-40 rounded-panel bg-slate-100" /><div className="h-72 rounded-panel bg-slate-100" /></div>;
  if (error) return <div className="w-full"><Link href="/teacher/classes" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"><ArrowLeft className="size-4" />Back to my classes</Link><p role="alert" className="mt-4 rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</p></div>;
  if (!section) return null;
  if (session) return <TeacherSessionDetailView sessionId={session.id} />;

  const nextSchedule = section.schedules?.find((schedule) => schedule.status === "active" && schedule.classroom);
  return <div className="w-full space-y-6">
    <Link href={`/teacher/classes/${section.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"><ArrowLeft className="size-4" />Back to class</Link>
    <header><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Take attendance</h1><p className="mt-2 text-sm text-muted">{section.course.code} · Section {section.section_code} · {section.course.name}</p></header>
    <section className="rounded-panel border border-hairline bg-card p-6 shadow-soft sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-control bg-brand-50 text-brand-600"><ClipboardCheck className="size-6" /></span>
      <h2 className="mt-4 font-display text-xl font-bold">No attendance session for today</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">Open a session for this assigned class to take manual attendance or display a rotating student check-in QR code. Attendance is saved to the selected session.</p>
      {nextSchedule && <div className="mt-5 flex items-start gap-3 rounded-control bg-canvas p-4 text-sm"><CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-600" /><div><p className="font-semibold">Next available schedule</p><p className="mt-1 text-muted">{["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][nextSchedule.day_of_week]} · {nextSchedule.start_time.slice(0, 5)}–{nextSchedule.end_time.slice(0, 5)} · {nextSchedule.classroom?.room_code}</p></div></div>}
      <div className="mt-6"><Link href={`/teacher/attendance-sessions/create?class_section_id=${section.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700"><QrCode className="size-4" />Open attendance session</Link></div>
    </section>
  </div>;
}
