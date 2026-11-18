"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarClock, GraduationCap, Users } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fetchClassSection, fetchClassSectionEnrollments } from "../api";
import type { ClassSectionRosterEnrollment } from "../api";
import type { ClassSection } from "../types";

const DAYS: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday" };

export function ClassSectionDetailView({ sectionId }: { sectionId: number }) {
  const [section, setSection] = useState<ClassSection | null>(null);
  const [enrollments, setEnrollments] = useState<ClassSectionRosterEnrollment[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError("");
    try {
      const [sectionResult, rosterResult] = await Promise.all([
        fetchClassSection(sectionId),
        fetchClassSectionEnrollments(sectionId, targetPage),
      ]);
      setSection(sectionResult.data);
      setEnrollments(rosterResult.data);
      setPage(rosterResult.meta?.current_page ?? targetPage);
      setLastPage(rosterResult.meta?.last_page ?? 1);
      setTotal(rosterResult.meta?.total ?? rosterResult.data.length);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load this class roster.");
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => { void load(1); }, [load]);

  if (error && !section) {
    return <div className="w-full"><Link href="/class-sections" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"><ArrowLeft className="size-4" />Back to class sections</Link><p role="alert" className="mt-5 rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</p></div>;
  }

  const teacherNames = section?.teachers?.filter((teacher) => teacher.name && teacher.name !== "Unassigned").map((teacher) => teacher.name) ?? [];

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/class-sections" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"><ArrowLeft className="size-4" />Back to class sections</Link>
        <Button variant="secondary" size="sm" onClick={() => void load(page)} loading={loading}>Refresh roster</Button>
      </div>

      {section ? <Card className="p-5 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{section.course?.course_code ?? "Course"} · Section {section.section_code}</p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{section.course?.name ?? "Class section"}</h1>
            <p className="mt-2 text-sm text-muted">{section.course?.department?.name ?? "Department not assigned"} · {section.semester?.name ?? "Semester not assigned"}</p>
          </div>
          <Badge tone={section.status === "active" ? "success" : section.status === "pending_setup" ? "warning" : "neutral"}>{section.status === "pending_setup" ? "Needs setup" : section.status}</Badge>
        </div>
        <div className="mt-6 grid gap-4 border-t border-hairline pt-5 sm:grid-cols-3">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400"><Users className="size-5" /></span><div><p className="text-xs text-muted">Enrolled students</p><p className="font-semibold">{section.enrolled_count ?? total} / {section.capacity}</p><p className="text-xs text-muted">{Math.max(0, section.capacity - (section.enrolled_count ?? total))} seats available</p></div></div>
          <div className="flex items-center gap-3"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400"><GraduationCap className="size-5" /></span><div><p className="text-xs text-muted">Assigned teacher{teacherNames.length === 1 ? "" : "s"}</p><p className="font-semibold">{teacherNames.length ? teacherNames.join(", ") : "No teacher assigned"}</p></div></div>
          <div className="flex items-center gap-3"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400"><CalendarClock className="size-5" /></span><div><p className="text-xs text-muted">Schedule</p><p className="font-semibold">{section.schedules?.length ? `${section.schedules.length} timetable entr${section.schedules.length === 1 ? "y" : "ies"}` : "No schedule assigned"}</p></div></div>
        </div>
        {section.schedules?.length ? <div className="mt-5 grid gap-2 border-t border-hairline pt-4 sm:grid-cols-2 lg:grid-cols-3">{section.schedules.map((schedule) => <div key={schedule.id} className="rounded-control border border-hairline bg-canvas px-3 py-2.5"><p className="text-sm font-semibold">{DAYS[Number(schedule.day_of_week)] ?? "Class"} · {schedule.period ?? "Custom time"}</p><p className="mt-0.5 text-xs text-muted">{schedule.start_time}–{schedule.end_time} · {schedule.room ?? "Room TBD"}</p></div>)}</div> : null}
      </Card> : <Card className="h-36 animate-pulse" />}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline p-5">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400"><BookOpen className="size-5" /></span><div><h2 className="font-display text-lg font-bold">Class roster</h2><p className="text-sm text-muted">Students enrolled in this section only.</p></div></div>
          <span className="rounded-pill bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">{total} students</span>
        </div>
        {error && <p role="alert" className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
        {loading && !section ? <p role="status" className="p-8 text-center text-sm text-muted">Loading roster…</p>
          : !loading && enrollments.length === 0 ? <div className="p-10 text-center"><Users className="mx-auto size-8 text-muted" /><p className="mt-3 font-semibold">No students enrolled yet</p><p className="mt-1 text-sm text-muted">Students added to this section will appear here.</p></div>
            : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Enrolled</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-hairline">{enrollments.map((enrollment) => <tr key={enrollment.id} className="transition-colors hover:bg-canvas/60"><td className="px-5 py-3"><Link href={`/students/${enrollment.student.id}`} className="font-semibold text-ink hover:text-brand-600">{enrollment.student.user?.name ?? "Unnamed student"}</Link><p className="text-xs text-muted">{enrollment.student.user?.email ?? "No email"}</p></td><td className="px-5 py-3"><span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">{enrollment.student.student_code}</span></td><td className="px-5 py-3 text-muted">{enrollment.student.department?.name ?? section?.course?.department?.name ?? "—"}</td><td className="px-5 py-3 text-muted">{enrollment.enrollment_date}</td><td className="px-5 py-3"><Badge tone="success">Enrolled</Badge></td></tr>)}</tbody></table></div>}
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted"><span>Page {page} of {lastPage}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= lastPage || loading} onClick={() => void load(page + 1)}>Next</Button></div></div>
      </Card>
    </div>
  );
}
