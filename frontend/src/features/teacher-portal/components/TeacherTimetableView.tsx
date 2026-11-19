"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarClock, Clock3, GraduationCap, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getAllMyClassSections, getTeacherSessions } from "../api";
import type { TeacherAttendanceSession, TeacherClassSection, TeacherSchedule } from "../types";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const TIME_ZONE = "Asia/Phnom_Penh";

function dateInCambodia(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return part("year") + "-" + part("month") + "-" + part("day");
}

function mondayOf(value: string) {
  const date = new Date(value + "T12:00:00");
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function shiftWeek(value: string, amount: number) {
  const date = new Date(value + "T12:00:00");
  date.setDate(date.getDate() + amount * 7);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone: TIME_ZONE, month: "short", day: "numeric" }).format(new Date(value + "T12:00:00+07:00"));
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
  const searchParams = useSearchParams();
  const [sections, setSections] = useState<TeacherClassSection[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<TeacherAttendanceSession[]>([]);
  const [weekStart, setWeekStart] = useState(() => mondayOf(dateInCambodia(new Date())));
  const [period, setPeriod] = useState("all");
  const [mode, setMode] = useState<"week" | "day">("week");
  const [day, setDay] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedSectionId = searchParams.get("section_id");

  useEffect(() => {
    let current = true;
    getAllMyClassSections("active", true).then((result) => { if (current) setSections(result); })
      .catch((caught: unknown) => { if (current) setError(caught instanceof Error ? caught.message : "Could not load your timetable."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, []);

  const weekDays = useMemo(() => DAYS.map((_, index) => {
    const date = new Date(weekStart + "T12:00:00");
    date.setDate(date.getDate() + index);
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
  }), [weekStart]);

  useEffect(() => {
    let current = true;
    const loadSessions = () => getTeacherSessions({ date_from: weekDays[0], date_to: weekDays[4], per_page: 100 })
      .then((response) => { if (current) setAttendanceSessions(response.data); })
      .catch(() => { if (current) setAttendanceSessions([]); });
    void loadSessions();
    const timer = window.setInterval(() => void loadSessions(), 15000);
    return () => { current = false; window.clearInterval(timer); };
  }, [weekDays]);
  const periods = useMemo(() => Array.from(new Set(
    sections.flatMap((section) => (section.schedules ?? [])
      .map((schedule) => schedule.time_slot?.period?.name)
      .filter((name): name is string => Boolean(name))),
  )), [sections]);
  const activeSections = useMemo(() => sections.filter((section) => {
    if (selectedSectionId && String(section.id) !== selectedSectionId) return false;
    const text = [section.course.code, section.course.name, section.section_code, section.course.department ?? ""].join(" ").toLowerCase();
    return text.includes(search.toLowerCase()) && weekDays.some((date) => date >= section.semester.start_date && date <= section.semester.end_date);
  }), [sections, selectedSectionId, search, weekDays]);
  const entries = useMemo(() => activeSections.flatMap((section) => (section.schedules ?? [])
    .filter((schedule) => period === "all" || schedule.time_slot?.period?.name === period)
    .flatMap((schedule) => weekDays.map((date) => ({ section: section, schedule: schedule, date: date })).filter((entry) => occursDuring(schedule, entry.date, section))))
    .map((entry) => ({ ...entry, attendanceSession: attendanceSessions.find((session) => session.class_schedule_id === entry.schedule.id && session.session_date === entry.date) }))
    .sort((left, right) => left.schedule.start_time.localeCompare(right.schedule.start_time)), [activeSections, attendanceSessions, period, weekDays]);
  const visibleEntries = mode === "day" ? entries.filter((entry) => new Date(entry.date + "T12:00:00").getDay() === day) : entries;
  const currentDay = weekDays[day - 1];
  const dailyCount = entries.filter((entry) => entry.date === currentDay).length;
  const weeklyHours = entries.reduce((total, entry) => total + durationHours(entry.schedule), 0);
  const uniqueClasses = new Set(entries.map((entry) => entry.section.id)).size;

  return <div className="w-full space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">My timetable</h1><p className="mt-2 text-sm text-muted">Your assigned teaching schedule, shown in {TIME_ZONE}.</p></div><div className="flex items-center gap-2"><Button variant="secondary" size="sm" onClick={() => { setWeekStart(mondayOf(dateInCambodia(new Date()))); setDay(1); }}>Today</Button><Button variant="secondary" size="icon" aria-label="Previous week" onClick={() => setWeekStart((current) => shiftWeek(current, -1))}><ArrowLeft className="size-4" /></Button><span className="min-w-32 text-center text-sm font-semibold">{formatDate(weekStart)} – {formatDate(weekDays[4])}</span><Button variant="secondary" size="icon" aria-label="Next week" onClick={() => setWeekStart((current) => shiftWeek(current, 1))}><ArrowRight className="size-4" /></Button></div></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={GraduationCap} label="Assigned classes" value={uniqueClasses} /><Metric icon={CalendarClock} label="Sessions this week" value={entries.length} /><Metric icon={Clock3} label="Teaching hours" value={weeklyHours.toFixed(1)} /><Metric icon={Users} label="Sessions today" value={dailyCount} /></section>
    <section className="rounded-panel border border-hairline bg-card p-4 shadow-soft"><div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto_auto]"><label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search course, section, or department" className="h-11 w-full rounded-control border border-hairline bg-canvas pl-10 pr-3 text-sm outline-none focus:border-brand-400" /></label><select aria-label="Filter by study period" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-11 rounded-control border border-hairline bg-canvas px-3 text-sm"><option value="all">All study periods</option>{periods.map((name) => <option key={name} value={name}>{name}</option>)}</select><div className="flex rounded-control border border-hairline p-1"><button type="button" onClick={() => setMode("week")} className={mode === "week" ? "min-h-9 rounded-control bg-brand-600 px-3 text-sm font-semibold text-white" : "min-h-9 rounded-control px-3 text-sm font-semibold text-muted"}>Week</button><button type="button" onClick={() => setMode("day")} className={mode === "day" ? "min-h-9 rounded-control bg-brand-600 px-3 text-sm font-semibold text-white" : "min-h-9 rounded-control px-3 text-sm font-semibold text-muted"}>Day</button></div></div>
      {mode === "day" && <div className="mt-3 flex gap-2 overflow-x-auto">{DAYS.map((name, index) => <button key={name} type="button" onClick={() => setDay(index + 1)} className={day === index + 1 ? "min-h-10 rounded-control bg-brand-600 px-3 text-sm font-semibold text-white" : "min-h-10 rounded-control bg-canvas px-3 text-sm font-semibold text-muted"}>{name}</button>)}</div>}
    </section>
    {error && <p role="alert" className="rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</p>}
    {loading ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-72 animate-pulse rounded-panel border border-hairline bg-card" />)}</div> : visibleEntries.length === 0 ? <section className="rounded-panel border border-hairline bg-card p-10 text-center"><CalendarClock className="mx-auto size-8 text-muted" /><h2 className="mt-3 font-semibold">No classes scheduled</h2><p className="mt-1 text-sm text-muted">There are no assigned class sessions for this week and filter.</p></section> : <section className={mode === "week" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-5" : "max-w-3xl"}>
      {(mode === "week" ? DAYS.map((name, index) => ({ name: name, entries: visibleEntries.filter((entry) => new Date(entry.date + "T12:00:00").getDay() === index + 1) })) : [{ name: DAYS[day - 1], entries: visibleEntries }]).map((column) => <div key={column.name} className="min-h-64 rounded-panel border border-hairline bg-card p-3 shadow-soft"><h2 className="mb-3 flex items-center justify-between border-b border-hairline pb-3 text-sm font-bold">{column.name}<span className="text-xs font-medium text-muted">{column.entries.length}</span></h2>{column.entries.length === 0 ? <p className="py-4 text-xs text-muted">No classes</p> : <div className="space-y-3">{column.entries.map(({ section, schedule, date, attendanceSession }) => <article key={String(schedule.id) + date} className="rounded-control border border-hairline bg-canvas p-3"><div className="flex flex-wrap gap-1.5"><span className="rounded-pill bg-brand-50 px-2 py-1 text-[11px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{section.course.code}</span>{schedule.time_slot?.period && <span className="rounded-pill bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{schedule.time_slot.period.name}</span>}<span className={attendanceSession?.status === "open" ? "rounded-pill bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "rounded-pill bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-700 dark:bg-slate-800 dark:text-slate-200"}>{attendanceSession?.status ?? schedule.status ?? "active"}</span></div><h3 className="mt-2 text-sm font-bold">{section.course.name}</h3><p className="mt-1 text-xs text-muted">Section {section.section_code} · {section.course.department ?? "Department not set"}</p><p className="mt-3 flex items-center gap-1.5 text-sm font-semibold"><Clock3 className="size-3.5 text-brand-600" />{schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</p><p className="mt-1 text-xs text-muted">{schedule.classroom?.room_code ?? "Room not assigned"} · {formatDate(date)}</p><div className="mt-3 flex flex-wrap gap-2"><Link href={"/teacher/classes/" + section.id} className="text-xs font-semibold text-brand-600">Roster</Link><Link href={"/teacher/attendance-history?class_section_id=" + section.id} className="text-xs font-semibold text-brand-600">History</Link>{attendanceSession?.status === "open" && <Link href={"/teacher/attendance-sessions/" + attendanceSession.id} className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Live Attendance</Link>}</div></article>)}</div>}</div>)}
    </section>}
  </div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string | number }) {
  return <div className="flex items-center gap-3 rounded-panel border border-hairline bg-card p-4 shadow-soft"><span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Icon className="size-5" /></span><div><p className="text-xs text-muted">{label}</p><p className="mt-1 font-display text-xl font-bold">{value}</p></div></div>;
}
