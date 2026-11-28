"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  ArrowRightLeft,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge, StatusSwitch } from "@/components/ui/status";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { chooseInitialSemester, fetchClassroomOptions, fetchSchedules, fetchSemesterOptions, fetchTimetableConfiguration, fetchTimetableSummary, setScheduleStatus, updateSchedule, updateTimeSlot, updateTimetableSettings } from "../api";
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
function weekLabel(value: string, locale: string): string {
  const start = new Date(`${value}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const language = locale === "km" ? "km-KH" : "en-US";
  const monthDay = new Intl.DateTimeFormat(language, { month: "short", day: "numeric" });
  return `${monthDay.format(start)} – ${new Intl.DateTimeFormat(language, { month: "short", day: "numeric", year: "numeric" }).format(end)}`;
}
type ScheduleConflict = { id: number; other: ClassSchedule; type: "ROOM_CONFLICT" | "TEACHER_CONFLICT" | "SECTION_CONFLICT" };
type ScheduleSuggestion = { day: number; room: ClassroomOption; slot: NonNullable<ClassSchedule["time_slot"]> };

function findScheduleConflicts(items: ClassSchedule[]): Map<number, ScheduleConflict> {
  const conflicts = new Map<number, ScheduleConflict>();
  for (let leftIndex = 0; leftIndex < items.length; leftIndex++) {
    const left = items[leftIndex];
    if (left.status !== "active") continue;
    for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex++) {
      const right = items[rightIndex];
      if (right.status !== "active" || left.day_of_week !== right.day_of_week || left.start_time >= right.end_time || left.end_time <= right.start_time) continue;
      const from = (value: string | null) => value ?? "0000-01-01";
      const until = (value: string | null) => value ?? "9999-12-31";
      if (from(left.effective_from) > until(right.effective_until) || from(right.effective_from) > until(left.effective_until)) continue;
      const leftTeachers = left.class_section?.teachers?.map((teacher) => teacher.id) ?? [];
      const rightTeachers = right.class_section?.teachers?.map((teacher) => teacher.id) ?? [];
      const type = left.classroom_id === right.classroom_id ? "ROOM_CONFLICT"
        : leftTeachers.some((id) => rightTeachers.includes(id)) ? "TEACHER_CONFLICT"
          : left.class_section_id === right.class_section_id ? "SECTION_CONFLICT" : null;
      if (!type) continue;
      if (!conflicts.has(left.id)) conflicts.set(left.id, { id: left.id, other: right, type });
      if (!conflicts.has(right.id)) conflicts.set(right.id, { id: right.id, other: left, type });
    }
  }
  return conflicts;
}

export function SchedulesView() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<ClassSchedule[]>([]);
  const [conflictItems, setConflictItems] = useState<ClassSchedule[]>([]);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [conflictError, setConflictError] = useState(false);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [semesterId, setSemesterId] = useState("");
  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
  const [semesterReady, setSemesterReady] = useState(false);
  const scheduleRequestId = useRef(0);
  const conflictRequestId = useRef(0);
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
  const conflictDialogRef = useRef<HTMLDialogElement>(null);
  const [resolvingSchedule, setResolvingSchedule] = useState<ClassSchedule | null>(null);
  const [applyingSuggestion, setApplyingSuggestion] = useState(false);
  const visibleConflicts = useMemo(() => findScheduleConflicts(conflictItems), [conflictItems]);
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
    if (status === "active" || status === "inactive") params.set("status", status);
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
    const requestId = ++conflictRequestId.current;
    if (!semesterReady || !semesterId) { setConflictItems([]); setConflictLoading(false); setConflictError(false); return; }
    setConflictLoading(true);
    setConflictError(false);
    const params = new URLSearchParams({ page: "1", per_page: "100", semester_id: semesterId, week_start: weekStart, status: "active" });
    const loadAll = async () => {
      const result = await fetchSchedules(params);
      const all = [...result.data];
      const last = result.meta?.last_page ?? 1;
      for (let pageNumber = 2; pageNumber <= last; pageNumber++) {
        params.set("page", String(pageNumber));
        const pageResult = await fetchSchedules(params);
        all.push(...pageResult.data);
      }
      if (requestId === conflictRequestId.current) setConflictItems(all);
    };
    void loadAll().catch(() => { if (requestId === conflictRequestId.current) { setConflictItems([]); setConflictError(true); } })
      .finally(() => { if (requestId === conflictRequestId.current) setConflictLoading(false); });
  }, [semesterReady, semesterId, weekStart, summaryVersion]);

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
    const dialog = conflictDialogRef.current;
    if (!dialog) return;
    if (resolvingSchedule && !dialog.open) dialog.showModal();
    if (!resolvingSchedule && dialog.open) dialog.close();
  }, [resolvingSchedule]);

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

  const selectedConflict = resolvingSchedule ? visibleConflicts.get(resolvingSchedule.id) : undefined;
  const suggestions = useMemo<ScheduleSuggestion[]>(() => {
    if (!resolvingSchedule || !selectedConflict || !config) return [];
    const teachersForSection = resolvingSchedule.class_section?.teachers?.map((teacher) => teacher.id) ?? [];
    const roomOnly = selectedConflict?.type === "ROOM_CONFLICT";
    const days = roomOnly ? [resolvingSchedule.day_of_week] : config.weekdays.length ? config.weekdays : [1, 2, 3, 4, 5, 6];
    const slots = config.periods.flatMap((period) => period.time_slots.filter((slot) => !slot.is_break && slot.is_active).map((slot) => ({ ...slot, period })));
    const choices: ScheduleSuggestion[] = [];
    for (const day of days) {
      for (const slot of slots) {
        if (roomOnly && (slot.starts_at !== resolvingSchedule.start_time || slot.ends_at !== resolvingSchedule.end_time)) continue;
        for (const room of classrooms) {
          if (day === resolvingSchedule.day_of_week && slot.starts_at === resolvingSchedule.start_time && room.id === resolvingSchedule.classroom_id) continue;
          const blocked = conflictItems.some((other) => {
            if (other.id === resolvingSchedule.id || other.status !== "active" || other.day_of_week !== day) return false;
            const overlaps = slot.starts_at < other.end_time && slot.ends_at > other.start_time;
            if (!overlaps) return false;
            const datesOverlap = (resolvingSchedule.effective_from ?? "0000-01-01") <= (other.effective_until ?? "9999-12-31")
              && (other.effective_from ?? "0000-01-01") <= (resolvingSchedule.effective_until ?? "9999-12-31");
            if (!datesOverlap) return false;
            const sharedTeacher = teachersForSection.some((id) => other.class_section?.teachers?.some((teacher) => teacher.id === id));
            return other.classroom_id === room.id || other.class_section_id === resolvingSchedule.class_section_id || sharedTeacher;
          });
          if (!blocked) {
            choices.push({ day, room, slot: { ...slot, period: slot.period } });
            if (!roomOnly) break;
          }
          if (choices.length >= 3) return choices;
        }
      }
    }
    return choices;
  }, [resolvingSchedule, selectedConflict, config, classrooms, conflictItems]);

  async function applySuggestion(suggestion: ScheduleSuggestion) {
    if (!resolvingSchedule) return;
    setApplyingSuggestion(true);
    try {
      const result = await updateSchedule(resolvingSchedule.id, {
        class_section_id: resolvingSchedule.class_section_id,
        classroom_id: suggestion.room.id,
        time_slot_id: suggestion.slot.id,
        day_of_week: suggestion.day,
        start_time: suggestion.slot.starts_at,
        end_time: suggestion.slot.ends_at,
        effective_from: resolvingSchedule.effective_from,
        effective_until: resolvingSchedule.effective_until,
        status: resolvingSchedule.status,
      });
      const mergeUpdatedSchedule = (current: ClassSchedule[]) => current.map((item) => item.id === result.data.id ? {
        ...item,
        ...result.data,
        class_section: result.data.class_section ?? item.class_section,
        classroom: result.data.classroom ?? suggestion.room,
        time_slot: result.data.time_slot ?? suggestion.slot,
      } : item);
      setItems(mergeUpdatedSchedule);
      setConflictItems(mergeUpdatedSchedule);
      setSummaryVersion((version) => version + 1);
      setResolvingSchedule(null);
      setFeedback({ message: t("Schedule conflict resolved successfully."), kind: "success" });
      void loadSchedules();
    } catch (caught) {
      setFeedback({ message: caught instanceof ApiError ? caught.message : t("Could not apply this schedule suggestion."), kind: "error" });
    } finally { setApplyingSuggestion(false); }
  }

  const isConflictView = status === "conflicts" || status === "no_conflicts";
  const matchingItemsByFilters = conflictItems.filter((item) => {
    const query = search.trim().toLowerCase();
    const searchable = [item.class_section?.course?.name, item.class_section?.course?.course_code, item.class_section?.section_code, ...(item.class_section?.teachers?.map((teacher) => teacher.name) ?? []), item.classroom?.room_code, item.classroom?.building].join(" ").toLowerCase();
    const matchesControls = (!query || searchable.includes(query))
      && (!teacherId || item.class_section?.teachers?.some((teacher) => String(teacher.id) === teacherId))
      && (!departmentId || String(item.class_section?.course?.department?.id ?? "") === departmentId)
      && (!periodId || String(item.time_slot?.period?.id ?? "") === periodId)
      && (!dayOfWeek || String(item.day_of_week) === dayOfWeek)
      && (!classroomId || String(item.classroom_id) === classroomId);
    return matchesControls;
  });
  const matchingConflictCount = matchingItemsByFilters.filter((item) => visibleConflicts.has(item.id)).length;
  const filteredItems = matchingItemsByFilters.filter((item) => status === "conflicts" ? visibleConflicts.has(item.id) : status === "no_conflicts" ? !visibleConflicts.has(item.id) : true);
  const displayItems = isConflictView ? filteredItems.slice((page - 1) * 10, page * 10) : items;
  const displayTotal = isConflictView ? filteredItems.length : total;
  const displayLastPage = isConflictView ? Math.max(1, Math.ceil(filteredItems.length / 10)) : lastPage;

  function resetFilters() {
    setSearch(""); setTeacherId(""); setDepartmentId(""); setPeriodId(""); setStatus("");
    setDayOfWeek(""); setClassroomId(""); setPage(1);
  }

  function conflictReason(conflict: ScheduleConflict, schedule: ClassSchedule) {
    const other = conflict.other;
    const reason = conflict.type === "ROOM_CONFLICT" ? t("Same classroom is booked")
      : conflict.type === "TEACHER_CONFLICT" ? t("Same teacher is assigned")
        : t("Same class section is scheduled");
    return `${t(conflict.type)}: ${reason} · ${other.class_section?.course?.name ?? t("another scheduled class")} (${other.start_time.slice(0, 5)}–${other.end_time.slice(0, 5)}); ${t("this class")}: ${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}.`;
  }

  return (
    <>
      <PageHeader
        title={t("Class Timetable")}
        description={t("Manage weekly class schedules, teacher assignments, classrooms, and study periods.")}
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
        <button type="button" onClick={() => { setStatus(""); setPage(1); }} className="rounded-panel text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><Card className="flex min-h-28 items-center gap-4 p-5 transition-colors hover:border-brand-400">
          <span className="rounded-panel bg-blue-500/15 p-3 text-blue-400">
            <CalendarClock className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">{t("Sessions this week")}</p>
            <p className="font-display mt-1 text-2xl font-bold">{summary?.weekly_sessions ?? (loading ? "—" : total)}</p>
          </div>
        </Card></button>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-emerald-500/15 p-3 text-emerald-400">
            <Clock className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">{t("Active class sections")}</p>
            <p className="font-display mt-1 text-2xl font-bold">{summary?.active_class_sections ?? "—"}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-indigo-500/15 p-3 text-indigo-400">
            <Building className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">{t("Assigned teachers")}</p>
            <p className="font-display mt-1 text-2xl font-bold">
              {summary?.assigned_teachers ?? "—"}
            </p>
          </div>
        </Card>
        <button type="button" onClick={() => { setStatus("conflicts"); setPage(1); }} className="rounded-panel text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><Card className={`flex min-h-28 items-center gap-4 p-5 transition-colors hover:border-rose-400 ${visibleConflicts.size ? "border-rose-500/30" : ""}`}>
          <span className="rounded-panel bg-rose-500/15 p-3 text-rose-400"><TriangleAlert className="size-6" /></span>
          <div><p className="text-sm text-muted">{t("Schedule conflicts")}</p><p className="font-display mt-1 text-2xl font-bold">{conflictLoading || conflictError ? "—" : matchingConflictCount}</p></div>
        </Card></button>
      </div>
      {conflictError && <p role="alert" className="-mt-3 mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{t("Could not load schedule conflicts.")}</p>}

      <Card className="overflow-hidden">
        <div className="space-y-3 border-b border-hairline p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[260px] flex-1">
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
          <div className="flex shrink-0 gap-1 rounded-control border border-hairline p-1">
            <Button size="sm" variant={view === "table" ? "primary" : "ghost"} onClick={() => setView("table")}><BookOpen className="size-4" />{t("Table")}</Button>
            <Button size="sm" variant={view === "week" ? "primary" : "ghost"} onClick={() => setView("week")}><CalendarDays className="size-4" />{t("Week")}</Button>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-control border border-hairline px-1 py-1">
            <Button size="icon" variant="ghost" aria-label={t("Previous week")} onClick={() => { setWeekStart((value) => moveWeek(value, -1)); setPage(1); }}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-36 text-center text-xs font-semibold text-muted">{weekLabel(weekStart, locale)}</span>
            <Button size="icon" variant="ghost" aria-label={t("Next week")} onClick={() => { setWeekStart((value) => moveWeek(value, 1)); setPage(1); }}><ChevronRight className="size-4" /></Button>
          </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          <select aria-label={t("Filter by teacher")}
            value={teacherId}
            onChange={(e) => { setTeacherId(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All teachers")}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
          <select aria-label={t("Filter by department")}
            value={departmentId}
            onChange={(e) => { setDepartmentId(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All departments")}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
          <select aria-label={t("Filter by study period")}
            value={periodId}
            onChange={(e) => { setPeriodId(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All periods")}</option>{config?.periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
          </select>
          <select aria-label={t("Filter by status")}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All statuses")}</option><option value="active">{t("Active")}</option><option value="inactive">{t("Inactive")}</option><option value="conflicts">{t("Conflicts only")}</option><option value="no_conflicts">{t("No conflicts")}</option>
          </select>
          <select aria-label={t("Filter by day of week")}
            value={dayOfWeek}
            onChange={(e) => {
              setDayOfWeek(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">{t("All days")}</option>
            {(config?.weekdays ?? [1, 2, 3, 4, 5]).map((day) => <option key={day} value={day}>{t(DAYS[day])}</option>)}
          </select>
          <select aria-label={t("Filter by classroom")}
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
          {Boolean(search || teacherId || departmentId || periodId || status || dayOfWeek || classroomId) && <Button type="button" variant="secondary" onClick={resetFilters}>{t("Reset filters")}</Button>}
          </div>
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
          <div className="grid min-w-0 grid-cols-1 divide-y divide-hairline overflow-x-auto md:grid-cols-2 md:divide-y-0 md:divide-x xl:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((day) => (
              <section key={day} className="min-h-72 p-3">
                <h3 className="mb-3 border-b border-hairline pb-2 text-sm font-bold">{t(DAYS[day])}</h3>
                <div className="space-y-2">
                  {(isConflictView ? filteredItems : items).filter((item) => item.day_of_week === day).map((item) => {
                    const conflict = visibleConflicts.get(item.id);
                    return <article key={item.id} style={{ borderLeftColor: conflict ? "#dc2626" : PERIOD_COLORS[item.time_slot?.period?.color ?? ""] ?? "#2563eb" }} className={`rounded-control border border-l-4 bg-canvas p-3 ${conflict ? "border-danger/40 bg-rose-500/10" : "border-hairline"}`}>
                      <button type="button" onClick={() => router.push(`/schedules/${item.id}/edit`)} className="block w-full text-left">
                      <span className="block text-xs font-bold text-brand-600">{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)} · {item.time_slot?.period?.name ?? "Custom"}</span>
                      <span className="mt-1 block text-sm font-bold text-ink">{item.class_section?.course?.course_code} · {item.class_section?.section_code}</span>
                      <span className="block truncate text-xs text-muted">{item.class_section?.course?.name} · {item.classroom?.room_code}</span>
                      <span className="mt-2 block truncate text-xs text-muted">{item.class_section?.teachers?.map((teacher) => teacher.name).join(", ") || t("Unassigned")}</span>
                      </button>
                      {conflict && <div className="mt-2 flex flex-wrap items-center gap-2"><span title={conflictReason(conflict, item)} className="inline-flex items-center gap-1 text-xs font-bold text-danger"><TriangleAlert className="size-3.5" />{t("Schedule conflict")}</span><Button size="sm" variant="secondary" onClick={() => setResolvingSchedule(item)}>{t("Resolve conflict")}</Button></div>}
                    </article>;
                  })}
                  {!(isConflictView ? filteredItems : items).some((item) => item.day_of_week === day) && <p className="py-3 text-xs text-muted">{t("No scheduled sessions")}</p>}
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
              ) : displayItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted">{t("No schedule slots match these filters.")}</td>
                </tr>
              ) : (
                displayItems.map((slot) => (
                  <tr
                    key={slot.id}
                    className="transition-colors hover:bg-canvas/70"
                  >
                    <td className="px-5 py-4 font-semibold text-ink">
                      <Badge tone="neutral" className="border border-slate-700 bg-slate-800 text-slate-200">
                        {DAYS[slot.day_of_week] ? t(DAYS[slot.day_of_week]) : `${t("Day")} ${slot.day_of_week}`}
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
                    <td className="px-5 py-4"><div className="flex flex-wrap items-center gap-2"><StatusSwitch checked={slot.status === "active"} loading={mutatingStatusId === slot.id} accessibleLabel={slot.class_section?.course?.course_code ?? t("Schedule")} onToggle={() => setPendingStatusSchedule(slot)} />{visibleConflicts.has(slot.id) && <><Badge tone="danger" title={conflictReason(visibleConflicts.get(slot.id)!, slot)}><TriangleAlert className="mr-1 inline size-3" />{t("Conflict")}</Badge><button type="button" onClick={() => setResolvingSchedule(slot)} className="text-xs font-bold text-brand-500 underline-offset-2 hover:underline">{t("Resolve")}</button></>}</div></td>

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
                        <Button type="button" variant="secondary" size="icon" onClick={() => router.push(`/schedules/${slot.id}`)} aria-label={t("View details")} title={t("View details")}>
                          <Eye className="size-4" />
                        </Button>
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
            {t("Showing")} {displayItems.length ? (page - 1) * 10 + 1 : 0}–
            {Math.min(page * 10, displayTotal)} {t("of")} {displayTotal} {t("slots")}
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
              disabled={page >= displayLastPage || loading}
              onClick={() => setPage((v) => v + 1)}
            >{t("Next")}</Button>
          </div>
        </div>
      </Card>
      <dialog ref={statusDialogRef} aria-labelledby="schedule-status-title" onClose={() => setPendingStatusSchedule(null)} className="w-[min(28rem,calc(100vw-2rem))] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-slate-950/50">
        <div className="p-6">
          <h2 id="schedule-status-title" className="font-display text-lg font-bold">{t(pendingStatusSchedule?.status === "active" ? "Deactivate this schedule?" : "Activate this schedule?")}</h2>
          <p className="mt-2 text-sm text-muted">{pendingStatusSchedule?.class_section?.course?.course_code} · {pendingStatusSchedule?.class_section?.section_code} {t("on")} {DAYS[pendingStatusSchedule?.day_of_week ?? 0] ? t(DAYS[pendingStatusSchedule?.day_of_week ?? 0]) : t("the selected day")} {t(pendingStatusSchedule?.status === "active" ? "will no longer appear as an active timetable entry. Existing attendance records will remain unchanged." : "will appear as an active timetable entry again.")}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPendingStatusSchedule(null)}>{t("Cancel")}</Button>
            <Button type="button" variant={pendingStatusSchedule?.status === "active" ? "danger" : "primary"} loading={mutatingStatusId === pendingStatusSchedule?.id} onClick={() => pendingStatusSchedule && void handleStatus(pendingStatusSchedule)}>{t(pendingStatusSchedule?.status === "active" ? "Deactivate schedule" : "Activate schedule")}</Button>
          </div>
        </div>
      </dialog>
      <dialog ref={conflictDialogRef} aria-labelledby="schedule-conflict-title" onClose={() => setResolvingSchedule(null)} className="m-0 ml-auto h-dvh max-h-dvh w-[min(42rem,100vw)] max-w-none border-l border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-slate-950/55">
        {resolvingSchedule && <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-hairline p-5 sm:p-6">
            <div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-400"><TriangleAlert className="size-4" />{t("Conflict resolution")}</p><h2 id="schedule-conflict-title" className="mt-2 font-display text-xl font-bold">{selectedConflict ? t(selectedConflict.type) : t("Conflict")}</h2><p className="mt-2 text-sm text-muted">{selectedConflict ? conflictReason(selectedConflict, resolvingSchedule) : t("This schedule no longer has a detected conflict.")}</p></div>
            <Button type="button" variant="secondary" size="icon" aria-label={t("Close")} onClick={() => setResolvingSchedule(null)}><X className="size-4" /></Button>
          </header>
          <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {selectedConflict && <div className="grid gap-3 sm:grid-cols-2">{[resolvingSchedule, selectedConflict.other].map((schedule, index) => <section key={schedule.id} className="rounded-panel border border-hairline bg-canvas p-4"><p className="text-[11px] font-bold uppercase tracking-wide text-muted">{index === 0 ? t("Selected class") : t("Clashing class")}</p><h3 className="mt-2 font-bold">{schedule.class_section?.course?.course_code} · {schedule.class_section?.section_code}</h3><p className="mt-1 text-sm text-muted">{schedule.class_section?.course?.name ?? t("Course")}</p><dl className="mt-3 space-y-1 text-xs text-muted"><div>{t(DAYS[schedule.day_of_week] ?? "Monday")} · {schedule.start_time.slice(0, 5)}–{schedule.end_time.slice(0, 5)}</div><div>{schedule.classroom?.room_code ?? t("Room not assigned")}</div><div>{schedule.class_section?.teachers?.map((teacher) => teacher.name).join(", ") || t("Unassigned")}</div></dl></section>)}</div>}
            <section><div className="mb-3 flex items-center gap-2"><ArrowRightLeft className="size-4 text-brand-500" /><h3 className="font-bold">{t("Smart suggestions")}</h3></div><p className="mb-3 text-xs text-muted">{selectedConflict?.type === "ROOM_CONFLICT" ? t("Available rooms for this day and time") : t("Next available day, time, and room combinations")}</p>
              {conflictLoading ? <p className="rounded-control border border-hairline p-4 text-sm text-muted">{t("Checking availability…")}</p> : conflictError ? <p role="alert" className="rounded-control border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{t("Could not load schedule conflicts.")}</p> : suggestions.length ? <div className="space-y-2">{suggestions.map((suggestion) => <button key={`${suggestion.day}-${suggestion.slot.id}-${suggestion.room.id}`} type="button" disabled={applyingSuggestion} onClick={() => void applySuggestion(suggestion)} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-control border border-hairline bg-canvas p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-500/5 disabled:opacity-60"><span><span className="block text-sm font-semibold">{t(DAYS[suggestion.day] ?? "Monday")} · {suggestion.slot.starts_at.slice(0, 5)}–{suggestion.slot.ends_at.slice(0, 5)}</span><span className="mt-1 block text-xs text-muted">{suggestion.room.room_code}{suggestion.room.building ? ` · ${suggestion.room.building}` : ""}{suggestion.room.floor ? ` · ${t("Floor")} ${suggestion.room.floor}` : ""}</span></span><span className="shrink-0 text-xs font-bold text-brand-500">{applyingSuggestion ? t("Applying…") : t("Apply")}</span></button>)}</div> : <p className="rounded-control border border-hairline p-4 text-sm text-muted">{t("No available suggestions found. Edit the schedule manually or deactivate this slot.")}</p>}
            </section>
          </div>
          <footer className="flex flex-col-reverse gap-2 border-t border-hairline p-4 sm:flex-row sm:justify-end sm:p-5"><Button type="button" variant="secondary" onClick={() => { const id = resolvingSchedule.id; setResolvingSchedule(null); router.push(`/schedules/${id}/edit`); }}><Pencil className="size-4" />{t("Edit manually")}</Button><Button type="button" variant="danger" disabled={mutatingStatusId === resolvingSchedule.id} onClick={() => { const schedule = resolvingSchedule; setResolvingSchedule(null); setPendingStatusSchedule(schedule); }}><X className="size-4" />{t("Deactivate slot")}</Button></footer>
        </div>}
      </dialog>
    </>
  );
}
