"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, Users } from "lucide-react";
import { getMyClassRoster, getMyClassSchedules, getMyClassSection } from "../api";
import type { TeacherClassSection, TeacherRosterStudent, TeacherSchedule } from "../types";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TeacherClassDetailView({ sectionId }: { sectionId: number }) {
  const [section, setSection] = useState<TeacherClassSection | null>(null);
  const [students, setStudents] = useState<TeacherRosterStudent[]>([]);
  const [schedules, setSchedules] = useState<TeacherSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getMyClassSection(sectionId), getMyClassRoster(sectionId), getMyClassSchedules(sectionId)])
      .then(([sectionResponse, rosterResponse, schedulesResponse]) => {
        setSection(sectionResponse.data);
        setStudents(rosterResponse.data);
        setSchedules(schedulesResponse.data);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load this assigned class."));
  }, [sectionId]);

  if (error) return <div className="w-full"><Link href="/teacher/classes" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"><ArrowLeft className="size-4" />Back to my classes</Link><p role="alert" className="mt-5 rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</p></div>;
  if (!section) return <div className="w-full animate-pulse"><div className="h-8 w-64 rounded bg-slate-200" /><div className="mt-6 h-64 rounded-panel bg-slate-100" /></div>;

  return (
    <div className="w-full space-y-6">
      <Link href="/teacher/classes" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"><ArrowLeft className="size-4" />Back to my classes</Link>
      <header className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-7"><p className="text-xs font-bold uppercase tracking-wide text-brand-600">{section.course.code} · Section {section.section_code}</p><h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{section.course.name}</h1><p className="mt-2 text-sm text-muted">{section.course.department} · {section.semester.name} {section.semester.academic_year ? `· ${section.semester.academic_year}` : ""}</p><div className="mt-5 flex flex-wrap gap-4 text-sm"><span className="inline-flex items-center gap-2"><Users className="size-4 text-brand-600" />{section.enrolled_count} enrolled · Capacity {section.capacity}</span><span className="rounded-pill bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">{section.status}</span></div></header>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-panel border border-hairline bg-card shadow-soft"><div className="border-b border-hairline p-5"><h2 className="font-display text-lg font-bold">Student roster</h2><p className="mt-1 text-sm text-muted">Active enrollments for this section.</p></div>{students.length === 0 ? <p className="p-6 text-sm text-muted">No active students are enrolled in this section.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Enrollment</th></tr></thead><tbody className="divide-y divide-hairline">{students.map((student) => <tr key={student.id}><td className="px-5 py-3"><p className="font-semibold">{student.name}</p><p className="text-xs text-muted">{student.email}</p></td><td className="px-5 py-3">{student.student_code}</td><td className="px-5 py-3"><span className="rounded-pill bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Enrolled</span></td></tr>)}</tbody></table></div>}</section>
        <section className="rounded-panel border border-hairline bg-card shadow-soft"><div className="border-b border-hairline p-5"><h2 className="font-display text-lg font-bold">Class schedule</h2><p className="mt-1 text-sm text-muted">Schedule and classroom details for this class.</p></div>{schedules.length === 0 ? <p className="p-6 text-sm text-muted">No schedules have been added to this section.</p> : <ul className="divide-y divide-hairline">{schedules.map((schedule) => <li key={schedule.id} className="flex gap-3 p-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600"><CalendarClock className="size-5" /></span><div><p className="font-semibold">{DAYS[schedule.day_of_week] ?? "Class"}</p><p className="mt-1 text-sm text-muted">{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</p><p className="mt-1 text-xs text-muted">{schedule.classroom?.room_code ?? "Room not assigned"}{schedule.classroom?.building ? ` · ${schedule.classroom.building}` : ""}</p></div></li>)}</ul>}</section>
      </div>
    </div>
  );
}
