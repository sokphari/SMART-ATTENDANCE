"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { ArrowRight, BookOpen, Building2, CalendarDays, Clock3, ClipboardCheck, MapPin, Search, Users } from "lucide-react";
import { getAllMyClassSections } from "../api";
import type { TeacherClassSection } from "../types";

const DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function TeacherClassesView() {
  const { t } = useLocale();
  const [sections, setSections] = useState<TeacherClassSection[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllMyClassSections("active", true)
      .then(setSections)
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load assigned classes.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = sections.filter((section) =>
    `${section.course.code} ${section.course.name} ${section.section_code} ${section.semester.name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const pageSize = 12;
  const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="w-full space-y-6">
      <header>
        <p className="text-sm font-semibold text-brand-600">{t("Teacher workspace")}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
          {t("My classes")}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t("Review rosters and schedules for your assigned class sections.")}
        </p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={t("Search course, code, section, or semester")}
            className="h-11 w-full rounded-control border border-hairline bg-card pl-10 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
        </div>
        {/* <span className="text-sm text-muted">
          {filtered.length} assigned classes · active semester
        </span> */}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-control bg-danger-soft p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((n) => (
            <div
              key={n}
              className="h-48 animate-pulse rounded-panel border border-hairline bg-card"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-panel border border-hairline bg-card p-10 text-center">
          <BookOpen className="mx-auto size-8 text-muted" />
          <p className="mt-3 font-semibold">
            {sections.length
              ? "No classes match your search"
              : "No assigned classes yet"}
          </p>
          <p className="mt-1 text-sm text-muted">
            Your administrator can assign class sections to your teacher
            account.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visible.map((section) => (
            <article
              key={section.id}
              className="rounded-panel border border-hairline bg-card p-5 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-11 items-center justify-center rounded-control bg-brand-50 text-brand-600">
                  <BookOpen className="size-5" />
                </div>
                <span className="rounded-pill bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">
                  {section.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                  {section.course.code}
                </span>
                <span className="rounded-pill bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Section {section.section_code}
                </span>
                {section.course.department && (
                  <span className="rounded-pill bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {section.course.department}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-display text-lg font-bold">
                {section.course.name}
              </h2>
              <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <CalendarDays className="size-4 text-brand-600" />
                  {section.semester.name}{section.semester.academic_year ? ` · ${section.semester.academic_year}` : ""}
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Users className="size-4 text-brand-600" />
                  {section.enrolled_count}/{section.capacity}
                </span>
              </div>
              <div className="mt-3 space-y-2 border-t border-hairline pt-3 text-sm">
                {(section.schedules ?? []).length ? section.schedules!.map((schedule) => (
                  <div key={schedule.id} className="rounded-control bg-canvas/70 px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <Clock3 className="size-4 shrink-0 text-brand-600" />
                        {t(DAYS[schedule.day_of_week] ?? "Schedule")} {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}
                      </span>
                      {schedule.time_slot?.period?.name && (
                        <span className="rounded-pill bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                          {schedule.time_slot.period.name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-3.5" />
                        {schedule.classroom?.room_code ?? t("Room not assigned")}
                      </span>
                      {schedule.classroom?.building && (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="size-3.5" />{schedule.classroom.building}
                        </span>
                      )}
                      {schedule.classroom?.floor && (
                        <span>{t("Floor")} {schedule.classroom.floor}</span>
                      )}
                    </div>
                  </div>
                )) : (
                  <p className="rounded-control bg-canvas/70 px-3 py-2.5 text-xs text-muted">{t("No schedule assigned")}</p>
                )}
              </div>
              <Link
                href={`/teacher/classes/${section.id}/attendance`}
                className="mt-4 flex min-h-10 items-center justify-center gap-2 rounded-control bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                <ClipboardCheck className="size-4" />
                {t("Take Attendance")}
                <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      )}
      {!loading && filtered.length > pageSize && (
        <div className="flex items-center justify-between border-t border-hairline pt-4 text-sm">
          <span className="text-muted">
            Page {page} of {lastPage}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="min-h-10 rounded-control border border-hairline px-3 font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage((current) => current + 1)}
              className="min-h-10 rounded-control border border-hairline px-3 font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
