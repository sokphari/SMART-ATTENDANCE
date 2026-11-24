"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building,
  BookOpen,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  Clock,
  Pencil,
  MoreVertical,
  Eye,
  ChevronLeft,
  ChevronRight,
  TriangleAlert,
  Plus,
  Search,
  Settings2,
  Save,
  Users,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/status";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { chooseInitialSemester, fetchClassroomOptions, fetchSchedules, fetchSemesterOptions, fetchTimetableConfiguration, fetchTimetableSummary, setScheduleStatus, updateTimeSlot, updateTimetableSettings } from "../api";
import type { ClassroomOption, ClassSchedule, SemesterOption, TimetableConfig, TimetableSummary } from "../types";
import { apiFetch } from "@/lib/api/client";

const DAYS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

const NOTICE_KEY = "sa_schedule_notice";
const PERIOD_COLORS: Record<string, string> = { blue: "#2563eb", amber: "#d97706", violet: "#7c3aed", green: "#059669", rose: "#e11d48" };
function currentWeekStart(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function mondayFor(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function weekForSemester(semester: SemesterOption, currentWeek: string): string {
  const weekEnd = moveWeek(currentWeek, 0);
  const end = new Date(`${weekEnd}T12:00:00`);
  end.setDate(end.getDate() + 6);
  const currentEnd = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  if (semester.start_date <= currentEnd && semester.end_date >= currentWeek) return currentWeek;
  return mondayFor(semester.start_date > currentEnd ? semester.start_date : semester.end_date);
}
function moveWeek(value: string, offset: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + offset * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function weekLabel(value: string): string {
  const start = new Date(`${value}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const monthDay = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  return `${monthDay.format(start)} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(end)}`;
}
function findVisibleConflicts(items: ClassSchedule[], config: TimetableConfig | null): Set<number> {
  const conflicts = new Set<number>();
  const breakSlots = config?.periods.flatMap((period) => period.time_slots.filter((slot) => slot.is_break && slot.is_active)) ?? [];
  items.forEach((item) => {
    if (item.status !== "active") return;
    if (breakSlots.some((slot) => item.start_time < slot.ends_at && item.end_time > slot.starts_at)) conflicts.add(item.id);
  });
  for (let leftIndex = 0; leftIndex < items.length; leftIndex++) {
    const left = items[leftIndex];
    if (left.status !== "active") continue;
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex++) {
      const right = items[rightIndex];
      if (right.status !== "active" || left.day_of_week !== right.day_of_week || left.start_time >= right.end_time || left.end_time <= right.start_time) continue;
      const leftTeachers = left.class_section?.teachers?.map((teacher) => teacher.id) ?? [];
      const rightTeachers = right.class_section?.teachers?.map((teacher) => teacher.id) ?? [];
      if (left.class_section_id === right.class_section_id || left.classroom_id === right.classroom_id || leftTeachers.some((id) => rightTeachers.includes(id))) {
        conflicts.add(left.id);
        conflicts.add(right.id);
      }
    }
  }
  return conflicts;
}

export function SchedulesView() {
  const { t } = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<ClassSchedule[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [semesterId, setSemesterId] = useState("");
  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
  const [semesterReady, setSemesterReady] = useState(false);
  const scheduleRequestId = useRef(0);
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [summary, setSummary] = useState<TimetableSummary | null>(null);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [summaryVersion, setSummaryVersion] = useState(0);
  const [teachers, setTeachers] = useState<{ id: number; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [status, setStatus] = useState("");
  const [view, setView] = useState<"table" | "week">("table");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSlotId, setSavingSlotId] = useState<number | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [pendingStatusSchedule, setPendingStatusSchedule] = useState<ClassSchedule | null>(null);
  const [mutatingStatusId, setMutatingStatusId] = useState<number | null>(null);
  const statusDialogRef = useRef<HTMLDialogElement>(null);
  const detailDialogRef = useRef<HTMLDialogElement>(null);
  const [detailsSchedule, setDetailsSchedule] = useState<ClassSchedule | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const visibleConflicts = findVisibleConflicts(items, config);
  const [maxHours, setMaxHours] = useState(30);
  const [maxSections, setMaxSections] = useState("");
  const [automaticAttendance, setAutomaticAttendance] = useState(false);
  const [lateAfterMinutes, setLateAfterMinutes] = useState(15);
  const [checkInWindowMinutes, setCheckInWindowMinutes] = useState(30);
  const [geofencingEnabled, setGeofencingEnabled] = useState(true);
  const [gpsAccuracyThreshold, setGpsAccuracyThreshold] = useState(30);
  const [search, setSearch] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    message: string;
    kind: "success" | "error";
  } | null>(null);

  const loadSchedules = useCallback(async () => {
    const requestId = ++scheduleRequestId.current;
    if (!semesterReady || !semesterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (dayOfWeek) params.set("day_of_week", dayOfWeek);
    if (classroomId) params.set("classroom_id", classroomId);
    if (teacherId) params.set("teacher_id", teacherId);
    if (departmentId) params.set("department_id", departmentId);
    if (periodId) params.set("study_period_id", periodId);
    if (status) params.set("status", status);
    if (semesterId) params.set("semester_id", semesterId);
    params.set("week_start", weekStart);
    params.set("per_page", view === "week" ? "100" : "10");

    try {
      const result = await fetchSchedules(params);
      if (requestId !== scheduleRequestId.current) return;
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      if (requestId !== scheduleRequestId.current) return;
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load class schedules.",
      );
    } finally {
      if (requestId === scheduleRequestId.current) setLoading(false);
    }
  }, [classroomId, dayOfWeek, page, search, teacherId, departmentId, periodId, status, semesterId, semesterReady, view, weekStart]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    void fetchSemesterOptions().then(({ data }) => {
      setSemesterOptions(data);
      const chosen = chooseInitialSemester(data);
      if (chosen) {
        const id = String(chosen.id);
        setSemesterId(id);
        setWeekStart((current) => weekForSemester(chosen, current));
        window.localStorage.setItem("sa_selected_semester_id", id);
      } else {
        setError(data.length === 0
          ? t("No semester is available. Create an academic year and semester first.")
          : t("Select a semester in the header to view the timetable."));
      }
      setSemesterReady(true);
    }).catch((caught) => {
      setError(caught instanceof ApiError ? caught.message : "Could not load academic semesters.");
      setSemesterReady(true);
    });

    Promise.all([
      fetchClassroomOptions(), fetchTimetableConfiguration(),
      apiFetch<{ data: { id: number; name: string }[] }>("/api/v1/admin/departments?per_page=100"),
      apiFetch<{ data: { id: number; user?: { name?: string } }[] }>("/api/v1/admin/teachers?per_page=100"),
    ]).then(([rooms, timetable, departmentResult, teacherResult]) => {
      setClassrooms(rooms.data);
      setConfig(timetable.data);
      setMaxHours(timetable.data.max_weekly_teaching_hours);
      setMaxSections(timetable.data.max_assigned_sections ? String(timetable.data.max_assigned_sections) : "");
      setAutomaticAttendance(timetable.data.automatic_attendance_enabled);
      setLateAfterMinutes(timetable.data.late_after_minutes);
      setCheckInWindowMinutes(timetable.data.check_in_window_minutes);
      setGeofencingEnabled(timetable.data.geofencing_enabled);
      setGpsAccuracyThreshold(timetable.data.gps_accuracy_threshold_meters);
      setDepartments(departmentResult.data);
      setTeachers(teacherResult.data.map((teacher) => ({ id: teacher.id, name: teacher.user?.name ?? `Teacher ${teacher.id}` })));
    }).catch(() => {
      fetchClassroomOptions().then((res) => setClassrooms(res.data)).catch(() => setClassrooms([]));
      setConfig(null);
    });

    const notice = window.sessionStorage.getItem(NOTICE_KEY);
    if (notice) {
      setFeedback({ message: notice, kind: "success" });
      window.sessionStorage.removeItem(NOTICE_KEY);
    }
  }, []);

  useEffect(() => {
    const dialog = statusDialogRef.current;
    if (!dialog) return;
    if (pendingStatusSchedule && !dialog.open) dialog.showModal();
    if (!pendingStatusSchedule && dialog.open) dialog.close();
  }, [pendingStatusSchedule]);

  useEffect(() => {
    const dialog = detailDialogRef.current;
    if (!dialog) return;
    if (detailsSchedule && !dialog.open) dialog.showModal();
    if (!detailsSchedule && dialog.open) dialog.close();
  }, [detailsSchedule]);

  useEffect(() => {
    const sync = (event: Event) => {
      const detail = (event as CustomEvent<{ semesterId?: number | null }>).detail;
      if (detail && Object.prototype.hasOwnProperty.call(detail, "semesterId")) {
        if (!detail.semesterId) {
          setSemesterId("");
          setItems([]);
          setTotal(0);
          setLastPage(1);
          setSummary(null);
          setSemesterReady(true);
          setError(t("Select a semester in the header to view the timetable."));
          setPage(1);
          return;
        }
        const id = String(detail.semesterId);
        const semester = semesterOptions.find((option) => option.id === detail.semesterId);
        setSemesterId(id);
        setSemesterReady(true);
        setError("");
        if (semester) setWeekStart((current) => weekForSemester(semester, current));
        setPage(1);
      }
    };
    window.addEventListener("sa-semester-change", sync);
    return () => window.removeEventListener("sa-semester-change", sync);
  }, [semesterOptions]);

  useEffect(() => {
    if (!semesterReady || !semesterId) return;
    const params = new URLSearchParams({ semester_id: semesterId });
    params.set("week_start", weekStart);
    if (teacherId) params.set("teacher_id", teacherId);
    if (departmentId) params.set("department_id", departmentId);
    if (classroomId) params.set("classroom_id", classroomId);
    if (dayOfWeek) params.set("day_of_week", dayOfWeek);
    if (periodId) params.set("study_period_id", periodId);
    void fetchTimetableSummary(params).then((result) => setSummary(result.data)).catch(() => setSummary(null));
  }, [semesterId, semesterReady, weekStart, summaryVersion, teacherId, departmentId, classroomId, dayOfWeek, periodId]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(
      () => setFeedback(null),
      feedback.kind === "error" ? 7000 : 4500,
    );
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function handleStatus(schedule: ClassSchedule) {
    setMutatingStatusId(schedule.id);
    try {
      const updated = await setScheduleStatus(schedule.id, schedule.status === "active" ? "inactive" : "active");
      setItems((prev) => prev.map((item) => item.id === schedule.id ? updated.data : item));
      void loadSchedules();
      setSummaryVersion((version) => version + 1);
      setFeedback({
        message: `Schedule ${updated.data.status === "active" ? "activated" : "deactivated"} successfully.`,
        kind: "success",
      });
      setPendingStatusSchedule(null);
    } catch (caught) {
      setFeedback({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Could not update schedule status.",
        kind: "error",
      });
    } finally {
      setMutatingStatusId(null);
    }
  }

  async function saveSlot(slot: TimetableConfig["periods"][number]["time_slots"][number]) {
    setSavingSlotId(slot.id);
    try {
      await updateTimeSlot(slot.id, { name: slot.name, starts_at: slot.starts_at, ends_at: slot.ends_at, is_active: slot.is_active });
      setFeedback({ message: `${slot.name} updated. Linked class schedules were adjusted after conflict checks.`, kind: "success" });
      const fresh = await fetchTimetableConfiguration();
      setConfig(fresh.data);
    } catch (caught) {
      setFeedback({ message: caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : "Could not update timetable time slot.", kind: "error" });
    } finally { setSavingSlotId(null); }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      await updateTimetableSettings({ max_weekly_teaching_hours: maxHours, max_assigned_sections: maxSections ? Number(maxSections) : null, automatic_attendance_enabled: automaticAttendance, late_after_minutes: lateAfterMinutes, check_in_window_minutes: checkInWindowMinutes, geofencing_enabled: geofencingEnabled, gps_accuracy_threshold_meters: gpsAccuracyThreshold });
      setFeedback({ message: "Timetable and attendance policies saved.", kind: "success" });
    } catch (caught) {
      setFeedback({ message: caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : "Could not save timetable settings.", kind: "error" });
    } finally { setSavingSettings(false); }
  }

  return (
    <>
      <PageHeader
        title={t("Class Timetable")}
        description="Manage weekly class schedules, teacher assignments, classrooms, and study periods."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSettingsOpen((open) => !open)}><Settings2 className="size-4" />{t("Timetable settings")}</Button>
            <Button onClick={() => router.push("/schedules/create")}><Plus className="size-4" />{t("Add schedule")}</Button>
          </div>
        }
      />

      {settingsOpen && <Card className="mb-5 p-5">
        <div className="mb-4"><h2 className="font-display text-lg font-bold">{t("Periods, breaks, and workload limits")}</h2><p className="mt-1 text-sm text-muted">Times use {config?.timezone ?? "Asia/Phnom_Penh"}. Saving a teaching period updates linked schedules after checking for conflicts.</p></div>
        <div className="grid gap-4 xl:grid-cols-3">
          {config?.periods.map((period) => <section key={period.id} className="rounded-control border border-hairline p-4">
            <h3 className="mb-3 font-bold">{period.name}</h3><div className="space-y-3">
              {period.time_slots.map((slot) => <div key={slot.id} className="grid grid-cols-1 items-end gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                <span className={`pb-2 text-xs font-semibold ${slot.is_break ? "text-warning" : "text-muted"}`}>{slot.name}{slot.is_break ? " · break" : ""}</span>
                <Input aria-label={`${period.name} ${slot.name} start time`} type="time" value={slot.starts_at} onChange={(event) => setConfig((current) => current ? ({ ...current, periods: current.periods.map((p) => ({ ...p, time_slots: p.time_slots.map((entry) => entry.id === slot.id ? { ...entry, starts_at: event.target.value } : entry) })) }) : current)} />
                <Input aria-label={`${period.name} ${slot.name} end time`} type="time" value={slot.ends_at} onChange={(event) => setConfig((current) => current ? ({ ...current, periods: current.periods.map((p) => ({ ...p, time_slots: p.time_slots.map((entry) => entry.id === slot.id ? { ...entry, ends_at: event.target.value } : entry) })) }) : current)} />
                <Button size="icon" variant="secondary" aria-label={`Save ${slot.name}`} loading={savingSlotId === slot.id} onClick={() => void saveSlot(slot)}><Save className="size-4" /></Button>
              </div>)}
            </div>
          </section>)}
        </div>
        <div className="mt-4 grid gap-4 rounded-control bg-canvas p-4 sm:grid-cols-3 sm:items-end">
          <Input label={t("Max weekly teaching hours")} type="number" min="1" max="168" value={maxHours} onChange={(event) => setMaxHours(Number(event.target.value))} />
          <Input label={t("Maximum assigned sections (optional)")} type="number" min="1" value={maxSections} onChange={(event) => setMaxSections(event.target.value)} placeholder={t("No limit")} />
          <Button loading={savingSettings} onClick={() => void saveSettings()}>{t("Save workload limits")}</Button>
        </div>
        <div className="mt-4 grid gap-4 rounded-control border border-hairline p-4 sm:grid-cols-2 xl:grid-cols-5 sm:items-end">
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={automaticAttendance} onChange={(event) => setAutomaticAttendance(event.target.checked)} />{t("Automatically open scheduled attendance")}</label>
          <Input label={t("Late after (minutes)")} type="number" min="0" max="240" value={lateAfterMinutes} onChange={(event) => setLateAfterMinutes(Number(event.target.value))} />
          <Input label={t("QR check-in window (minutes)")} type="number" min="1" max="480" value={checkInWindowMinutes} onChange={(event) => setCheckInWindowMinutes(Number(event.target.value))} />
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={geofencingEnabled} onChange={(event) => setGeofencingEnabled(event.target.checked)} />{t("Require classroom location")}</label>
          <Input label={t("Maximum GPS accuracy (meters)")} type="number" min="1" max="500" value={gpsAccuracyThreshold} onChange={(event) => setGpsAccuracyThreshold(Number(event.target.value))} disabled={!geofencingEnabled} />
          <p className="text-xs leading-relaxed text-muted sm:col-span-2 xl:col-span-5">Automatic attendance uses each class’s configured timetable and classroom. A scheduled session appears ahead of class, opens at its start time, stops accepting QR check-ins after the configured window, and is finalized at the class end time. The scheduler must be running on the server.</p>
          <div className="sm:col-span-2 xl:col-span-5"><Button loading={savingSettings} onClick={() => void saveSettings()}>{t("Save attendance policy")}</Button></div>
        </div>
      </Card>}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-brand-50 p-3 text-brand-600">
            <CalendarClock className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">{t("Sessions this week")}</p>
            <p className="font-display mt-1 text-2xl font-bold">{summary?.weekly_sessions ?? (loading ? "—" : total)}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-success-soft p-3 text-success">
            <Clock className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">{t("Active class sections")}</p>
            <p className="font-display mt-1 text-2xl font-bold">{summary?.active_class_sections ?? "—"}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-slate-100 p-3 text-slate-600">
            <Building className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">{t("Assigned teachers")}</p>
            <p className="font-display mt-1 text-2xl font-bold">
              {summary?.assigned_teachers ?? "—"}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-warning-soft p-3 text-warning"><Users className="size-6" /></span>
          <div><p className="text-sm text-muted">{t("Schedule conflicts")}</p><p className="font-display mt-1 text-2xl font-bold">{summary?.scheduling_conflicts ?? "—"}</p></div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label={t("Search schedules")}
              placeholder={t("Search course, section, teacher, or room")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <select
            aria-label={t("Filter by teacher")}
            value={teacherId}
            onChange={(e) => { setTeacherId(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All teachers")}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
          <select
            aria-label={t("Filter by department")}
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All departments")}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select
            aria-label={t("Filter by study period")}
            value={periodId}
            onChange={(e) => { setPeriodId(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All periods")}</option>{config?.periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
          </select>
          <select
            aria-label={t("Filter by status")}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All statuses")}</option><option value="active">{t("Active")}</option><option value="inactive">{t("Inactive")}</option>
          </select>
          <select
            aria-label={t("Filter by day of week")}
            value={dayOfWeek}
            onChange={(e) => {
              setDayOfWeek(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All days")}</option>
            {(config?.weekdays ?? [1, 2, 3, 4, 5]).map((day) => <option key={day} value={day}>{DAYS[day]}</option>)}
          </select>
          <div className="flex shrink-0 gap-1 rounded-control border border-hairline p-1">
            <Button size="sm" variant={view === "table" ? "primary" : "ghost"} onClick={() => setView("table")}><BookOpen className="size-4" />{t("Table")}</Button>
            <Button size="sm" variant={view === "week" ? "primary" : "ghost"} onClick={() => setView("week")}><CalendarDays className="size-4" />{t("Week")}</Button>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-control border border-hairline px-1 py-1">
            <Button size="icon" variant="ghost" aria-label={t("Previous week")} onClick={() => { setWeekStart((value) => moveWeek(value, -1)); setPage(1); }}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-36 text-center text-xs font-semibold text-muted">{weekLabel(weekStart)}</span>
            <Button size="icon" variant="ghost" aria-label={t("Next week")} onClick={() => { setWeekStart((value) => moveWeek(value, 1)); setPage(1); }}><ChevronRight className="size-4" /></Button>
          </div>
          <select
            aria-label={t("Filter by classroom")}
            value={classroomId}
            onChange={(e) => {
              setClassroomId(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All classrooms")}</option>
            {classrooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.room_code} {room.building ? `(${room.building})` : ""}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p
            role="alert"
            className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {error}
          </p>
        )}

        {feedback && (
          <div
            className="pointer-events-none fixed top-20 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] animate-fade-up"
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            <div
              className={`pointer-events-auto flex items-start gap-3 rounded-panel border bg-card p-4 shadow-lift ${
                feedback.kind === "success"
                  ? "border-success/30"
                  : "border-danger/30"
              }`}
            >
              <span
                className={
                  feedback.kind === "success"
                    ? "mt-0.5 text-success"
                    : "mt-0.5 text-danger"
                }
              >
                {feedback.kind === "success" ? (
                  <CheckCircle2 className="size-5" />
                ) : (
                  <AlertCircle className="size-5" />
                )}
              </span>
              <p className="flex-1 text-sm font-semibold text-ink">
                {feedback.message}
              </p>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="rounded-control p-1 text-muted hover:bg-canvas hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}

        {view === "week" ? (
          <div className="grid min-w-[900px] grid-cols-5 divide-x divide-hairline overflow-x-auto">
            {[1, 2, 3, 4, 5].map((day) => (
              <section key={day} className="min-h-72 p-3">
                <h3 className="mb-3 border-b border-hairline pb-2 text-sm font-bold">{DAYS[day]}</h3>
                <div className="space-y-2">
                  {items.filter((item) => item.day_of_week === day).map((item) => (
                    <button key={item.id} type="button" onClick={() => router.push(`/schedules/${item.id}/edit`)} style={{ borderLeftColor: visibleConflicts.has(item.id) ? "#dc2626" : PERIOD_COLORS[item.time_slot?.period?.color ?? ""] ?? "#2563eb" }} className={`block w-full rounded-control border border-l-4 bg-canvas p-3 text-left transition-colors ${visibleConflicts.has(item.id) ? "border-danger/50" : "border-hairline hover:border-brand-300"}`}>
                      <span className="block text-xs font-bold text-brand-600">{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)} · {item.time_slot?.period?.name ?? "Custom"}</span>
                      <span className="mt-1 block text-sm font-bold text-ink">{item.class_section?.course?.course_code} · {item.class_section?.section_code}</span>
                      <span className="block truncate text-xs text-muted">{item.class_section?.course?.name} · {item.classroom?.room_code}</span>
                      <span className="mt-2 block truncate text-xs text-muted">{item.class_section?.teachers?.map((teacher) => teacher.name).join(", ") || "Teacher unassigned"}</span>
                      {visibleConflicts.has(item.id) && <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-danger"><TriangleAlert className="size-3.5" />{t("Schedule conflict")}</span>}
                    </button>
                  ))}
                  {!items.some((item) => item.day_of_week === day) && <p className="py-3 text-xs text-muted">{t("No scheduled sessions")}</p>}
                </div>
              </section>
            ))}
          </div>
        ) : <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">{t("Day")}</th>
                <th className="px-5 py-3">{t("Study Period")}</th>
                <th className="px-5 py-3">{t("Time Window")}</th>
                <th className="px-5 py-3">{t("Course & Section")}</th>
                <th className="px-5 py-3">{t("Teacher")}</th>
                <th className="px-5 py-3">{t("Classroom")}</th>
                <th className="px-5 py-3">{t("Status")}</th>
                <th className="px-5 py-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted">
                    Loading timetable slots…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted">{t("No schedule slots match these filters.")}</td>
                </tr>
              ) : (
                items.map((slot) => (
                  <tr
                    key={slot.id}
                    className="transition-colors hover:bg-canvas/70"
                  >
                    <td className="px-5 py-4 font-semibold text-ink">
                      <Badge tone="brand">
                        {DAYS[slot.day_of_week] ?? `Day ${slot.day_of_week}`}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      {slot.time_slot?.period ? <Badge tone="brand" style={{ color: PERIOD_COLORS[slot.time_slot.period.color] ?? "#2563eb", backgroundColor: `${PERIOD_COLORS[slot.time_slot.period.color] ?? "#2563eb"}18` }}>{slot.time_slot.period.name}</Badge> : <Badge tone="neutral">{t("Custom")}</Badge>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <Clock className="size-3.5 text-muted" />
                        <span>
                          {slot.start_time?.slice(0, 5)} –{" "}
                          {slot.end_time?.slice(0, 5)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <span className="font-semibold text-ink">
                          {slot.class_section?.course?.name ?? "Course"}
                        </span>
                        <div className="text-xs text-muted">
                          Section {slot.class_section?.section_code} (
                          {slot.class_section?.course?.course_code})
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted">
                      <div className="max-w-48 truncate font-medium text-ink">{slot.class_section?.teachers?.map((teacher) => teacher.name).join(", ") || "Unassigned"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-ink">{slot.classroom?.room_code ?? "—"}</span>
                      {slot.classroom?.building && <div className="text-xs text-muted">{slot.classroom.building}{slot.classroom.floor ? `, Fl ${slot.classroom.floor}` : ""}</div>}
                    </td>
                    <td className="px-5 py-4"><div className="flex items-center gap-2"><StatusBadge status={slot.status} context="resource" />{visibleConflicts.has(slot.id) && <Badge tone="danger">{t("Conflict")}</Badge>}</div></td>

                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() =>
                            router.push(`/schedules/${slot.id}/edit`)
                          }
                          aria-label={t("Edit schedule slot")}
                          title={t("Edit slot")}
                          className="
                        border-blue-500/20
                        bg-blue-500/10 text-blue-400
                        shadow-none
                        hover:border-blue-500/30
                        hover:bg-blue-500/20
                        hover:text-blue-300
                      "
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <div className="relative">
                          <Button type="button" variant="secondary" size="icon" aria-label={t("More schedule actions")} aria-haspopup="menu" aria-expanded={actionMenuId === slot.id} onClick={() => setActionMenuId((current) => current === slot.id ? null : slot.id)}><MoreVertical className="size-4" /></Button>
                          {actionMenuId === slot.id && <div role="menu" className="absolute right-0 z-20 mt-1 w-48 rounded-panel border border-hairline bg-card p-1 shadow-lift">
                            <button type="button" role="menuitem" onClick={() => { setDetailsSchedule(slot); setActionMenuId(null); }} className="flex min-h-10 w-full items-center gap-2 rounded-control px-3 text-left text-sm font-medium hover:bg-canvas"><Eye className="size-4" />{t("View details")}</button>
                            <button type="button" role="menuitem" disabled={mutatingStatusId === slot.id} onClick={() => { setActionMenuId(null); slot.status === "active" ? setPendingStatusSchedule(slot) : void handleStatus(slot); }} className="flex min-h-10 w-full items-center rounded-control px-3 text-left text-sm font-medium hover:bg-canvas disabled:opacity-50">{slot.status === "active" ? "Deactivate schedule" : "Activate schedule"}</button>
                          </div>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>}

        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted">
          <span>
            Showing {items.length ? (page - 1) * 10 + 1 : 0}–
            {Math.min(page * 10, total)} of {total} slots
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >{t("Previous")}</Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((v) => v + 1)}
            >{t("Next")}</Button>
          </div>
        </div>
      </Card>
      <dialog ref={statusDialogRef} aria-labelledby="schedule-status-title" onClose={() => setPendingStatusSchedule(null)} className="w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-slate-950/50">
        <div className="p-6">
          <h2 id="schedule-status-title" className="font-display text-lg font-bold">{t("Deactivate this schedule?")}</h2>
          <p className="mt-2 text-sm text-muted">{pendingStatusSchedule?.class_section?.course?.course_code} · {pendingStatusSchedule?.class_section?.section_code} on {DAYS[pendingStatusSchedule?.day_of_week ?? 0] ?? "the selected day"} will no longer appear as an active timetable entry. Existing attendance records will remain unchanged.</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPendingStatusSchedule(null)}>{t("Cancel")}</Button>
            <Button type="button" variant="danger" loading={mutatingStatusId === pendingStatusSchedule?.id} onClick={() => pendingStatusSchedule && void handleStatus(pendingStatusSchedule)}>{t("Deactivate schedule")}</Button>
          </div>
        </div>
      </dialog>
      <dialog ref={detailDialogRef} aria-labelledby="schedule-detail-title" onClose={() => setDetailsSchedule(null)} className="w-[min(36rem,calc(100vw-2rem))] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-slate-950/50">
        {detailsSchedule && <div className="p-6"><div className="flex items-start justify-between gap-4"><div><h2 id="schedule-detail-title" className="font-display text-xl font-bold">{t("Schedule details")}</h2><p className="mt-1 text-sm text-muted">{detailsSchedule.class_section?.course?.course_code} · Section {detailsSchedule.class_section?.section_code}</p></div><StatusBadge status={detailsSchedule.status} context="resource" /></div><dl className="mt-5 grid gap-3 sm:grid-cols-2">{[["Course", detailsSchedule.class_section?.course?.name ?? "—"], ["Department", detailsSchedule.class_section?.course?.department?.name ?? "—"], ["Teacher", detailsSchedule.class_section?.teachers?.map((teacher) => teacher.name).join(", ") || "Unassigned"], ["Day", DAYS[detailsSchedule.day_of_week] ?? "—"], ["Study period", detailsSchedule.time_slot?.period?.name ?? "Custom time"], ["Time", `${detailsSchedule.start_time.slice(0, 5)}–${detailsSchedule.end_time.slice(0, 5)}`], ["Classroom", detailsSchedule.classroom?.room_code ?? "—"], ["Effective dates", detailsSchedule.effective_from || detailsSchedule.effective_until ? `${detailsSchedule.effective_from ?? "Semester start"} to ${detailsSchedule.effective_until ?? "Semester end"}` : "Full semester"]].map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 text-sm font-medium">{value}</dd></div>)}</dl><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDetailsSchedule(null)}>{t("Close")}</Button><Button type="button" onClick={() => { const id = detailsSchedule.id; setDetailsSchedule(null); router.push(`/schedules/${id}/edit`); }}><Pencil className="size-4" />{t("Edit schedule")}</Button></div></div>}
      </dialog>
    </>
  );
}
