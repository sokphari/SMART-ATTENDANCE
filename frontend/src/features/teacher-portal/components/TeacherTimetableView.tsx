"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { StatusBadge } from "@/components/ui/status";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckSquare,
  Clock3,
  GraduationCap,
  MapPin,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAllMyClassSections, getTeacherSessions } from "../api";
import type { TeacherAttendanceSession, TeacherClassSection, TeacherSchedule } from "../types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_ZONE = "Asia/Phnom_Penh";

function dateInCambodia(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function mondayOf(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftWeek(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + amount * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateAfter(value: string, offset: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-US", { timeZone: TIME_ZONE, month: "short", day: "numeric" }).format(new Date(`${value}T12:00:00+07:00`));
}

function occursDuring(schedule: TeacherSchedule, date: string, section: TeacherClassSection) {
  return schedule.day_of_week >= 1 && schedule.day_of_week <= 5
    && date >= section.semester.start_date && date <= section.semester.end_date
    && (!schedule.effective_from || date >= schedule.effective_from)
    && (!schedule.effective_until || date <= schedule.effective_until)
    && schedule.status !== "inactive";
}

function durationHours(schedule: TeacherSchedule) {
  const start = schedule.start_time.split(":").map(Number);
  const end = schedule.end_time.split(":").map(Number);
  return ((end[0] * 60 + end[1]) - (start[0] * 60 + start[1])) / 60;
}

export function TeacherTimetableView() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const [sections, setSections] = useState<TeacherClassSection[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<TeacherAttendanceSession[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(dateInCambodia(new Date())));
  const [mode, setMode] = useState<"week" | "day">("week");
  const [day, setDay] = useState(() => Math.max(1, Math.min(5, new Date(`${dateInCambodia(new Date())}T12:00:00`).getDay() || 5)));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedSectionId = searchParams.get("section_id");

  useEffect(() => {
    let current = true;
    getAllMyClassSections("active", true).then((result) => { if (current) setSections(result); })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : t("Could not load your timetable.")); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [t]);

  const weekDays = useMemo(() => DAYS.map((_, index) => dateAfter(weekStart, index)), [weekStart]);

  useEffect(() => {
    let current = true;
    const loadSessions = () => getTeacherSessions({ date_from: weekDays[0], date_to: weekDays[4], per_page: 100 })
      .then((response) => { if (current) setAttendanceSessions(response.data); })
      .catch(() => { if (current) setAttendanceSessions([]); });
    void loadSessions();
    const timer = window.setInterval(() => void loadSessions(), 15000);
    return () => { current = false; window.clearInterval(timer); };
  }, [weekDays]);

  const activeSections = useMemo(() => sections.filter((section) => {
    if (selectedSectionId && String(section.id) !== selectedSectionId) return false;
    const text = [section.course.code, section.course.name, section.section_code, section.course.department ?? ""].join(" ").toLowerCase();
    return text.includes(search.toLowerCase()) && weekDays.some((date) => date >= section.semester.start_date && date <= section.semester.end_date);
  }), [sections, selectedSectionId, search, weekDays]);

  const entries = useMemo(() => activeSections.flatMap((section) => (section.schedules ?? [])
    .flatMap((schedule) => weekDays.map((date) => ({ section, schedule, date })).filter((entry) => occursDuring(schedule, entry.date, section))))
    .map((entry) => ({ ...entry, attendanceSession: attendanceSessions.find((session) => session.class_schedule_id === entry.schedule.id && session.session_date === entry.date) }))
    .sort((left, right) => left.schedule.start_time.localeCompare(right.schedule.start_time)), [activeSections, attendanceSessions, weekDays]);

  const today = dateInCambodia(new Date());
  const todayDay = Math.max(1, Math.min(5, new Date(`${today}T12:00:00`).getDay() || 5));
  const todayCount = entries.filter((entry) => entry.date === today).length;
  const weeklyHours = entries.reduce((total, entry) => total + durationHours(entry.schedule), 0);
  const uniqueClasses = new Set(entries.map((entry) => entry.section.id)).size;
  const visibleDays = mode === "day" ? [day] : [1, 2, 3, 4, 5];
  const rangeLabel = `${formatDate(weekDays[0], locale)} – ${formatDate(weekDays[4], locale)}`;

  function goToToday() {
    setWeekStart(mondayOf(today));
    setDay(todayDay);
  }

  return <div className="w-full space-y-5">
    <div>
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-600">{t("Teacher workspace")}</p>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{t("My timetable")}</h1>
        <p className="mt-1 text-sm text-muted">{t("Your assigned teaching schedule, shown in Asia/Phnom_Penh.")}</p>
      </header>
    </div>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={GraduationCap} label={t("Assigned classes")} value={uniqueClasses} tone="blue" />
      <Metric icon={CalendarDays} label={t("Sessions this week")} value={entries.length} tone="green" />
      <Metric icon={Clock3} label={t("Teaching hours")} value={weeklyHours.toFixed(1)} tone="amber" />
      <Metric icon={Users} label={t("Sessions today")} value={todayCount} tone="purple" />
    </section>

    <section className="rounded-panel border border-hairline bg-card p-3 shadow-soft">
      <div className="grid gap-3 xl:grid-cols-[auto_auto_minmax(10rem,1fr)_auto] xl:items-center">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToToday}>{t("Today")}</Button>
          <Button variant="secondary" size="icon" aria-label={t("Previous week")} onClick={() => setWeekStart((current) => shiftWeek(current, -1))}><ArrowLeft className="size-4" /></Button>
          <span className="min-w-32 rounded-control border border-hairline bg-canvas px-3 py-2 text-center text-xs font-semibold">{rangeLabel}</span>
          <Button variant="secondary" size="icon" aria-label={t("Next week")} onClick={() => setWeekStart((current) => shiftWeek(current, 1))}><ArrowRight className="size-4" /></Button>
        </div>
        <label className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search course, section, or department")} className="h-10 w-full rounded-control border border-hairline bg-canvas pl-10 pr-3 text-sm outline-none focus:border-brand-400" />
        </label>
        <div className="flex rounded-control border border-hairline p-1 xl:justify-self-end">
          <button type="button" onClick={() => setMode("week")} aria-pressed={mode === "week"} className={mode === "week" ? "min-h-8 rounded-control bg-brand-600 px-3 text-xs font-semibold text-white" : "min-h-8 rounded-control px-3 text-xs font-semibold text-muted"}>{t("Week")}</button>
          <button type="button" onClick={() => setMode("day")} aria-pressed={mode === "day"} className={mode === "day" ? "min-h-8 rounded-control bg-brand-600 px-3 text-xs font-semibold text-white" : "min-h-8 rounded-control px-3 text-xs font-semibold text-muted"}>{t("Day")}</button>
        </div>
      </div>
      {mode === "day" && <div className="mt-3 flex gap-2 overflow-x-auto">{DAYS.map((name, index) => <button key={name} type="button" onClick={() => setDay(index + 1)} className={day === index + 1 ? "min-h-9 rounded-control bg-brand-600 px-3 text-xs font-semibold text-white" : "min-h-9 rounded-control bg-canvas px-3 text-xs font-semibold text-muted"}>{t(name)}</button>)}</div>}
    </section>

    {error && <p role="alert" className="rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</p>}
    {loading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-panel border border-hairline bg-card" />)}</div>
      : <section className={mode === "week" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-5" : "mx-auto grid w-full max-w-2xl"}>
        {visibleDays.map((dayNumber) => {
          const dayIndex = dayNumber - 1;
          const dayDate = weekDays[dayIndex];
          const dayEntries = entries.filter((entry) => entry.date === dayDate);
          return <div key={dayNumber} className="min-h-64 rounded-panel border border-hairline bg-card p-3 shadow-soft">
            <h2 className="mb-3 flex items-center justify-between border-b border-hairline pb-3 text-sm font-bold">
              {t(DAYS[dayIndex])}<span className="rounded-pill bg-canvas px-2 py-1 text-[11px] font-semibold text-muted">{formatDate(dayDate, locale)}</span>
            </h2>
            {dayEntries.length === 0 ? <p className="py-4 text-xs text-muted">{t("No classes")}</p> : <div className="space-y-3">
              {dayEntries.map(({ section, schedule, date, attendanceSession }) => <article key={`${schedule.id}-${date}`} className="relative overflow-hidden rounded-control border border-hairline bg-canvas p-3 pl-4">
                <span className="absolute inset-y-0 left-0 w-1 bg-brand-500" />
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-pill bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{section.course.code}</span>
                  {schedule.time_slot?.period?.name && <span className="rounded-pill bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">🌅 {schedule.time_slot.period.name}</span>}
                  <StatusBadge status={attendanceSession?.status ?? schedule.status ?? "active"} context={attendanceSession ? "session" : "resource"} className="min-h-5 px-1.5 text-[10px]" />
                </div>
                <h3 className="mt-2 text-sm font-bold leading-snug">{section.course.name}</h3>
                <p className="mt-1 text-xs text-muted">{t("Section")} {section.section_code} · {section.course.department ?? t("Department not set")}</p>
                <p className="mt-3 flex items-center gap-1.5 text-sm font-bold"><Clock3 className="size-3.5 text-brand-600" />{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{schedule.classroom?.room_code ?? t("Room not assigned")}</span>
                  {schedule.classroom?.building && <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{schedule.classroom.building}</span>}
                  {schedule.classroom?.floor && <span>{t("Floor")} {schedule.classroom.floor}</span>}
                </p>
                <p className="mt-1 text-[11px] text-muted">{section.semester.name}{section.semester.academic_year ? ` · ${section.semester.academic_year}` : ""}</p>
                <div className="mt-3 grid grid-cols-2 gap-1.5 border-t border-hairline pt-2">
                  <Link href={`/teacher/classes/${section.id}/attendance`} className="inline-flex min-h-8 items-center justify-center gap-1 rounded-control bg-brand-600 px-2 text-[11px] font-semibold text-white transition-colors hover:bg-brand-700"><CheckSquare className="size-3.5" />{t("Attendance")}</Link>
                  <Link href={`/teacher/classes/${section.id}`} className="inline-flex min-h-8 items-center justify-center rounded-control bg-slate-100 px-2 text-[11px] font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">{t("Roster")}</Link>
                </div>
              </article>)}
            </div>}
          </div>;
        })}
      </section>}
  </div>;
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof GraduationCap; label: string; value: string | number; tone: "blue" | "green" | "amber" | "purple" }) {
  const tones = {
    blue: "bg-brand-500/15 text-brand-400",
    green: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
    purple: "bg-violet-500/15 text-violet-400",
  };
  return <div className="flex items-center gap-3 rounded-panel border border-hairline bg-card p-4 shadow-soft"><span className={`flex size-10 shrink-0 items-center justify-center rounded-control ${tones[tone]}`}><Icon className="size-5" /></span><div><p className="text-xs text-muted">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div></div>;
}
