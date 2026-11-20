"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  Layers,
  LayoutGrid,
  Pause,
  Pencil,
  Plus,
  Play,
  RotateCcw,
  Search,
  Table as TableIcon,
  ToggleLeft,
  ToggleRight,
  Users,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  fetchClassSections,
  fetchDepartmentsOptions,
  fetchSemestersOptions,
  updateClassSection,
} from "../api";
import type { ClassSection, SemesterOption } from "../types";

const NOTICE_KEY = "sa_class_section_notice";
const VIEW_MODE_KEY = "sa_class_sections_view_mode";

const DAY_NAMES: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};

function formatDayOfWeek(day: number | string | undefined | null): string {
  if (day === undefined || day === null) return "TBD";
  if (typeof day === "number") return DAY_NAMES[day] ?? `Day ${day}`;
  const parsed = parseInt(String(day), 10);
  if (!Number.isNaN(parsed) && DAY_NAMES[parsed]) return DAY_NAMES[parsed];
  return String(day).slice(0, 3);
}

type DepartmentOption = {
  id: number;
  name: string;
  code: string;
};

export function ClassSectionsView() {
  const { t } = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<ClassSection[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const [search, setSearch] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{
    message: string;
    kind: "success" | "error";
  } | null>(null);

  // Load view mode preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem(VIEW_MODE_KEY);
      if (savedMode === "table" || savedMode === "card") {
        setViewMode(savedMode);
      }
    }
  }, []);

  const setAndSaveViewMode = (mode: "card" | "table") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    }
  };

  const loadSections = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "12" });
    if (search.trim()) params.set("search", search.trim());
    if (semesterId) params.set("semester_id", semesterId);
    if (departmentId) params.set("department_id", departmentId);
    if (status) params.set("status", status);

    try {
      const result = await fetchClassSections(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load class sections.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, semesterId, departmentId, status]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  useEffect(() => {
    fetchSemestersOptions()
      .then((res) => setSemesters(res.data))
      .catch(() => setSemesters([]));

    fetchDepartmentsOptions()
      .then((res) => setDepartments(res.data))
      .catch(() => setDepartments([]));

    const notice = window.sessionStorage.getItem(NOTICE_KEY);
    if (notice) {
      setFeedback({ message: notice, kind: "success" });
      window.sessionStorage.removeItem(NOTICE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(
      () => setFeedback(null),
      feedback.kind === "error" ? 7000 : 4500,
    );
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  async function handleToggleStatus(section: ClassSection) {
    const nextStatus = section.status === "active" ? "inactive" : "active";
    try {
      await updateClassSection(section.id, { status: nextStatus });
      setItems((prev) =>
        prev.map((item) =>
          item.id === section.id ? { ...item, status: nextStatus } : item,
        ),
      );
      setFeedback({
        message:
          nextStatus === "active"
            ? "Section activated."
            : "Section deactivated.",
        kind: "success",
      });
    } catch (caught) {
      setFeedback({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Could not update section status.",
        kind: "error",
      });
    }
  }

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items],
  );

  const totalCapacity = useMemo(
    () => items.reduce((sum, item) => sum + (item.capacity || 0), 0),
    [items],
  );

  const hasFiltersActive = Boolean(
    search.trim() || semesterId || departmentId || status,
  );

  const handleResetFilters = () => {
    setSearch("");
    setSemesterId("");
    setDepartmentId("");
    setStatus("");
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Class Sections"
        description="Control all classes, teachers, schedules, departments, and student rosters"
        actions={
          <Button onClick={() => router.push("/class-sections/create")}>
            <Plus className="size-4" />
            New Class Section
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="flex min-h-24 items-center gap-4 p-4.5">
          <span className="rounded-xl bg-brand-50 dark:bg-brand-950/60 p-3 text-brand-600 dark:text-brand-400">
            <Layers className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-muted">Total sections</p>
            <p className="font-display mt-0.5 text-2xl font-bold text-ink">
              {total}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-4 p-4.5">
          <span className="rounded-xl bg-success-soft dark:bg-emerald-950/60 p-3 text-success dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-muted">Active on this page</p>
            <p className="font-display mt-0.5 text-2xl font-bold text-ink">
              {activeCount}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-24 items-center gap-4 p-4.5">
          <span className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 text-slate-600 dark:text-slate-300">
            <Users className="size-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-muted">Page capacity</p>
            <p className="font-display mt-0.5 text-2xl font-bold text-ink">
              {totalCapacity} seats
            </p>
          </div>
        </Card>
      </div>

      {/* Control Bar: Search, Filters, and View Switcher */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-hairline bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input */}
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input
              type="text"
              aria-label="Search sections"
              placeholder="Search class or teacher..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-xl border border-hairline bg-canvas/60 pr-8 pl-10 text-sm text-ink placeholder:text-muted transition-colors focus:border-brand-500 focus:bg-card focus:outline-hidden"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-ink"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns and View Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Department */}
            <select
              aria-label="Filter by department"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-hairline bg-canvas/60 px-3 text-xs font-medium text-ink transition-colors focus:border-brand-500 focus:bg-card focus:outline-hidden"
            >
              <option value="">Department (All)</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* Semester */}
            <select
              aria-label="Filter by semester"
              value={semesterId}
              onChange={(e) => {
                setSemesterId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-hairline bg-canvas/60 px-3 text-xs font-medium text-ink transition-colors focus:border-brand-500 focus:bg-card focus:outline-hidden"
            >
              <option value="">Semester (All)</option>
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id}>
                  {sem.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              aria-label="Filter by section status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-xl border border-hairline bg-canvas/60 px-3 text-xs font-medium text-ink transition-colors focus:border-brand-500 focus:bg-card focus:outline-hidden"
            >
              <option value="">Status (All)</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending_setup">Needs setup</option>
            </select>

            {/* Reset Filters if active */}
            {hasFiltersActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset all filters"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-hairline bg-canvas/60 px-3 text-xs font-medium text-muted hover:text-ink transition-colors"
              >
                <RotateCcw className="size-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* View Mode Switcher (Card vs Table) */}
            <div className="flex h-10 items-center rounded-xl border border-hairline bg-canvas/60 p-0.5">
              <button
                type="button"
                onClick={() => setAndSaveViewMode("card")}
                aria-label="Card view"
                title="Card View"
                className={`flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "card"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                <LayoutGrid className="size-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setAndSaveViewMode("table")}
                aria-label="Table view"
                title="Table View"
                className={`flex h-full items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-brand-600 text-white shadow-xs"
                    : "text-muted hover:text-ink"
                }`}
              >
                <TableIcon className="size-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      {/* Floating feedback toast */}
      {feedback && (
        <div
          className="pointer-events-none fixed top-20 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] animate-fade-up"
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          <div
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-card p-4 shadow-lift ${
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
              className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content: Card View OR Table View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-hairline bg-card text-muted">
          <Layers className="size-8 animate-pulse text-brand-500 mb-3" />
          <p className="text-sm font-medium">Loading class sections…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-hairline bg-card text-center p-6">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-canvas text-muted mb-3">
            <Layers className="size-6" />
          </span>
          <h3 className="font-display text-base font-bold text-ink">
            No class sections found
          </h3>
          <p className="mt-1 text-xs text-muted max-w-sm">
            {hasFiltersActive
              ? "Try adjusting your search keywords or filter dropdowns."
              : "Get started by creating your first course class section."}
          </p>
          {hasFiltersActive ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResetFilters}
              className="mt-4"
            >
              Clear filters
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => router.push("/class-sections/create")}
              className="mt-4"
            >
              <Plus className="size-4" />
              Create Class Section
            </Button>
          )}
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((section) => {
            const courseCode = section.course?.course_code ?? "";
            const sectionDisplay = courseCode
              ? `${courseCode}-${section.section_code}`
              : `Section ${section.section_code}`;

            const deptOrCourse = section.course?.department?.name ?? section.course?.name ?? "Department not assigned";

            const primaryTeacher =
              section.teachers && section.teachers.length > 0 && section.teachers[0]?.name
                ? section.teachers[0].name
                : "Teacher not assigned";

            const primaryTeacherRole =
              section.teachers && section.teachers.length > 0 && section.teachers[0]?.role
                ? section.teachers[0].role
                : "Teacher assignment";

            const enrolled = section.enrolled_count ?? 0;
            const capacity = section.capacity;
            const availableSeats = Math.max(0, capacity - enrolled);
            const fillRatio = capacity > 0 ? Math.min(100, Math.round((enrolled / capacity) * 100)) : 0;

            return (
              <div
                key={section.id}
                className="group flex flex-col justify-between rounded-2xl border border-hairline bg-card p-6 text-ink shadow-soft transition-all duration-200 hover:border-brand-300 hover:shadow-lift dark:hover:border-brand-700"
              >
                <div>
                  {/* Top Row: Title, Department & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl font-extrabold tracking-tight text-ink">
                        {sectionDisplay}
                      </h3>
                      <p className="mt-0.5 truncate text-sm font-medium text-brand-600 dark:text-brand-400">
                        {deptOrCourse}
                      </p>
                    </div>

                    {section.status === "active" ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 className="size-3.5" />
                        Active
                      </span>
                    ) : section.status === "pending_setup" ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                        <AlertCircle className="size-3.5" />
                        Setup needed
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        <AlertCircle className="size-3.5" />
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Instructor Row */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-brand-600 dark:border-brand-700 dark:bg-brand-950/60 dark:text-brand-400">
                      <GraduationCap className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-ink">
                        {primaryTeacher}
                      </h4>
                      <p className="truncate text-xs text-muted">
                        {primaryTeacherRole}
                      </p>
                    </div>
                  </div>

                  {/* Schedule & Semester Row */}
                  <div className="mt-5 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-medium text-muted">
                        Schedule
                      </span>
                      <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-ink">
                        <Clock className="size-3.5 text-muted" />
                        <span>
                          {section.schedules && section.schedules.length > 0
                            ? `${formatDayOfWeek(section.schedules[0].day_of_week)} ${section.schedules[0].start_time.slice(0, 5)}–${section.schedules[0].end_time.slice(0, 5)}`
                            : "Not scheduled"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-medium text-muted">
                        Semester
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:border-brand-400/30 dark:bg-brand-500/10 dark:text-brand-300">
                        <CalendarDays className="size-3.5" />
                        {section.semester?.name ?? "Not assigned"}
                      </span>
                    </div>
                  </div>

                  {/* Class Capacity Row */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-muted">Class Capacity</span>
                      <span className="font-bold text-ink">
                        {enrolled} / {capacity} Students
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(5, fillRatio))}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-muted">
                      {availableSeats > 0
                        ? `${availableSeats} seats available`
                        : "Class full"}
                    </p>
                  </div>
                </div>

                {/* Divider & Bottom Action Buttons */}
                <div>
                  <div className="mt-5 border-t border-hairline" />
                  <div className="mt-4 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => router.push(`/class-sections/${section.id}`)}
                      className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-600 py-2.5 px-5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
                    >
                      <Users className="size-4" />
                      <span>View Students</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/class-sections/${section.id}/edit`)}
                      className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full border border-hairline bg-canvas py-2.5 px-5 text-sm font-semibold text-ink transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 active:scale-[0.98] dark:hover:border-brand-700 dark:hover:bg-brand-950/60 dark:hover:text-brand-300"
                    >
                      <Pencil className="size-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(section)}
                      aria-label={`${section.status === "active" ? "Deactivate" : "Activate"} section ${sectionDisplay}`}
                      title={section.status === "active" ? "Deactivate section" : "Activate section"}
                      className={`flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition-all active:scale-[0.98] ${section.status === "active" ? "border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20" : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"}`}
                    >
                      {section.status === "active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                      <span>{section.status === "active" ? "Deactivate" : "Activate"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3.5">{t("Course")}</th>
                  <th className="px-5 py-3.5">{t("Section")}</th>
                  <th className="px-5 py-3.5">{t("Semester")}</th>
                  <th className="px-5 py-3.5">{t("Teacher")}</th>
                  <th className="px-5 py-3.5">{t("Capacity")}</th>
                  <th className="px-5 py-3.5">{t("Status")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {items.map((section) => {
                  const enrolled = section.enrolled_count ?? 0;
                  const capacity = section.capacity || 1;
                  const fillRatio = Math.min(100, Math.round((enrolled / capacity) * 100));

                  const primaryTeacher =
                    section.teachers && section.teachers.length > 0
                      ? section.teachers[0].name
                      : "Unassigned";

                  return (
                    <tr
                      key={section.id}
                      className="transition-colors hover:bg-canvas/70"
                    >
                      <td className="px-5 py-4">
                        <div>
                          <span className="font-semibold text-ink">
                            {section.course?.name ?? "—"}
                          </span>
                          <div className="text-xs text-muted">
                            {section.course?.course_code} ·{" "}
                            {section.course?.department?.name ?? "Department"}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
                          {section.section_code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-muted">
                        {section.semester?.name ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="flex size-6 items-center justify-center rounded-full bg-brand-500/10 text-brand-600 text-xs font-bold">
                            {primaryTeacher ? primaryTeacher.charAt(0).toUpperCase() : "U"}
                          </span>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {primaryTeacher}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-28">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-ink">{enrolled}</span>
                            <span className="text-muted">/ {capacity}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full bg-brand-500"
                              style={{ width: `${Math.max(5, fillRatio)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          tone={
                            section.status === "active"
                              ? "success"
                              : section.status === "pending_setup"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {section.status === "pending_setup"
                            ? "Needs setup"
                            : section.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              router.push(`/class-sections/${section.id}`)
                            }
                            aria-label={`View students in section ${section.section_code}`}
                            title="View students"
                            className="border-brand-500/20 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20"
                          >
                            <Users className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() =>
                              router.push(`/class-sections/${section.id}/edit`)
                            }
                            aria-label={`Edit section ${section.section_code}`}
                            title="Edit section"
                            className="border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            onClick={() => handleToggleStatus(section)}
                            aria-label="Toggle section status"
                            className={
                              section.status === "active"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                            }
                          >
                            {section.status === "active" ? (
                              <ToggleRight className="size-5" />
                            ) : (
                              <ToggleLeft className="size-5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination Footer (Works for both Card and Table views) */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-hairline bg-card px-5 py-3 text-sm text-muted">
        <span>
          Showing {items.length ? (page - 1) * 12 + 1 : 0}–
          {Math.min(page * 12, total)} of {total} sections
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((v) => v - 1)}
            className="rounded-xl text-xs"
          >
            Previous
          </Button>
          <span className="flex items-center px-2 text-xs font-medium text-slate-500">
            Page {page} of {lastPage || 1}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= lastPage || loading}
            onClick={() => setPage((v) => v + 1)}
            className="rounded-xl text-xs"
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
