"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, ClipboardCheck } from "lucide-react";
import {
  createTeacherSession,
  getMyClassSection,
  getTeacherSessions,
} from "../api";
import type { TeacherAttendanceSession, TeacherClassSection } from "../types";
import { TeacherSessionDetailView } from "./TeacherSessionDetailView";
import { useLocale } from "@/i18n/LocaleProvider";

function campusDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function campusWeekday(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Phnom_Penh",
    weekday: "long",
  }).format(date);
  return (
    [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].indexOf(weekday) + 1
  );
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

export function TeacherClassAttendanceView({
  sectionId,
}: {
  sectionId: number;
}) {
  const { t } = useLocale();
  const [section, setSection] = useState<TeacherClassSection | null>(null);
  const [session, setSession] = useState<TeacherAttendanceSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    const today = campusDate();
    async function loadAttendancePage() {
      try {
        const [sectionResponse, sessionsResponse] = await Promise.all([
          getMyClassSection(sectionId),
          getTeacherSessions({
            class_section_id: sectionId,
            date_from: today,
            date_to: today,
            per_page: 100,
          }),
        ]);
        if (!current) return;

        const sectionData = sectionResponse.data;
        const todaySessions = sessionsResponse.data;
        const existingSession =
          todaySessions.find((item) => item.status === "open") ??
          todaySessions.find((item) => item.status === "scheduled") ??
          todaySessions.find((item) => item.status === "closed") ??
          null;

        setSection(sectionData);
        if (existingSession) {
          setSession(existingSession);
          return;
        }

        const schedule = sectionData.schedules?.find((item) => {
          if (
            item.status !== "active" ||
            !item.classroom ||
            item.day_of_week !== campusWeekday()
          )
            return false;
          if (item.effective_from && today < item.effective_from) return false;
          if (item.effective_until && today > item.effective_until)
            return false;
          return (
            today >= sectionData.semester.start_date &&
            today <= sectionData.semester.end_date
          );
        });

        if (!schedule) return;

        setCreating(true);
        const startsAt = new Date();
        const created = await createTeacherSession({
          class_section_id: sectionId,
          class_schedule_id: schedule.id,
          session_date: today,
          starts_at: startsAt.toISOString(),
          late_after: addMinutes(startsAt, 15),
          closes_at: addMinutes(startsAt, 120),
        });
        if (current) setSession(created.data);
      } catch (caught) {
        // Another tab may have opened the session between the initial lookup and create request.
        try {
          const latest = await getTeacherSessions({
            class_section_id: sectionId,
            date_from: today,
            date_to: today,
            per_page: 100,
          });
          const existingSession = latest.data.find(
            (item) => item.status === "open" || item.status === "scheduled",
          );
          if (current && existingSession) {
            setSession(existingSession);
            return;
          }
        } catch {
          // Keep the original error for the user.
        }
        if (current)
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not prepare this class attendance page.",
          );
      } finally {
        if (current) {
          setCreating(false);
          setLoading(false);
        }
      }
    }

    void loadAttendancePage();
    return () => {
      current = false;
    };
  }, [sectionId]);

  if (loading || creating)
    return (
      <div className="w-full animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="h-40 rounded-panel bg-slate-100" />
        <div className="h-72 rounded-panel bg-slate-100" />
        <p className="animate-none text-sm text-muted">{t("Preparing today's attendance and student list...")}</p>
      </div>
    );
  if (error)
    return (
      <div className="w-full">
        <Link
          href="/teacher/classes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"
        >
          <ArrowLeft className="size-4" />{t("Back to my classes")}</Link>
        <p
          role="alert"
          className="mt-4 rounded-control bg-danger-soft p-4 text-sm text-danger"
        >
          {error}
        </p>
      </div>
    );
  if (!section) return null;
  if (session) return <TeacherSessionDetailView sessionId={session.id} />;

  const nextSchedule = section.schedules?.find(
    (schedule) => schedule.status === "active" && schedule.classroom,
  );
  return (
    <div className="w-full space-y-6">
      <Link
        href={`/teacher/classes/${section.id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"
      >
        <ArrowLeft className="size-4" />{t("Back to class")}</Link>
      <header>

        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{t("Take attendance")}</h1>
        <p className="mt-2 text-sm text-muted">
          {section.course.code} · Section {section.section_code} ·{" "}
          {section.course.name}
        </p>
      </header>
      <section className="rounded-panel border border-hairline bg-card p-6 shadow-soft sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-control bg-brand-50 text-brand-600">
          <ClipboardCheck className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-xl font-bold">{t("No attendance session for today")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          This class has no active schedule for today. Ask an administrator to
          assign a classroom schedule before taking attendance.
        </p>
        {nextSchedule && (
          <div className="mt-5 flex items-start gap-3 rounded-control bg-canvas p-4 text-sm">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold">{t("Next available schedule")}</p>
              <p className="mt-1 text-muted">
                {
                  [
                    "",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ][nextSchedule.day_of_week]
                }{" "}
                · {nextSchedule.start_time.slice(0, 5)}–
                {nextSchedule.end_time.slice(0, 5)} ·{" "}
                {nextSchedule.classroom?.room_code}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
