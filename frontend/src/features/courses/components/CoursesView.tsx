"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { StatusFilter } from "@/components/ui/status";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BookOpen, CheckCircle2, Plus, Search, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchCourses, fetchCourseDepartments } from "../api";
import type { Course, DepartmentOption } from "../types";
import { CourseRowActions } from "./CourseRowActions";
import { CourseStatusToggle } from "./CourseStatusToggle";

const NOTICE_KEY = "sa_course_notice";

export function CoursesView() {
  const { t } = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [search, setSearch] = useState("");
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

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (departmentId) params.set("department_id", departmentId);
    if (status) params.set("status", status);
    try {
      const result = await fetchCourses(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : "Could not load courses.",
      );
    } finally {
      setLoading(false);
    }
  }, [departmentId, page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    fetchCourseDepartments()
      .then((result) => setDepartments(result.data))
      .catch(() => setDepartments([]));
    const message = window.sessionStorage.getItem(NOTICE_KEY);
    if (message) {
      setFeedback({ message, kind: "success" });
      window.sessionStorage.removeItem(NOTICE_KEY);
    }
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(
      () => setFeedback(null),
      feedback.kind === "error" ? 7000 : 4500,
    );
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const activeCount = useMemo(
    () => items.filter((item) => item.status === "active").length,
    [items],
  );

  return (
    <>
      <PageHeader
        title="Courses"
        description="Manage the course catalog and department assignments."
        actions={
          <Button onClick={() => router.push("/courses/create")}>
            <Plus className="size-4" />
            Create course
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-brand-50 p-3 text-brand-600">
            <BookOpen className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Matching courses</p>
            <p className="font-display mt-1 text-2xl font-bold">{total}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-success-soft p-3 text-success">
            <BookOpen className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Active on this page</p>
            <p className="font-display mt-1 text-2xl font-bold">
              {activeCount}
            </p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-slate-100 p-3 text-slate-600">
            <BookOpen className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Departments</p>
            <p className="font-display mt-1 text-2xl font-bold">
              {departments.length}
            </p>
          </div>
        </Card>
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Search courses"
              placeholder="Search course name or code"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter by department"
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <StatusFilter value={status} onChange={(value) => { setStatus(value); setPage(1); }} label="Filter by course status" options={[{ value: "active" }, { value: "inactive" }]} />
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
            aria-live={feedback.kind === "error" ? "assertive" : "polite"}
            aria-atomic="true"
          >
            <div
              className={`pointer-events-auto flex items-start gap-3 rounded-panel border bg-card p-4 shadow-lift ${feedback.kind === "success" ? "border-success/30" : "border-danger/30"}`}
            >
              <span className={feedback.kind === "success" ? "mt-0.5 text-success" : "mt-0.5 text-danger"}>
                {feedback.kind === "success" ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}
              </span>
              <p className="flex-1 text-sm font-semibold text-ink">{feedback.message}</p>
              <button
                type="button"
                aria-label="Dismiss notification"
                className="rounded-control p-1 text-muted hover:bg-canvas hover:text-ink"
                onClick={() => setFeedback(null)}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">{t("Course")}</th>
                <th className="px-5 py-3">{t("Code")}</th>
                <th className="px-5 py-3">{t("Department")}</th>
                <th className="px-5 py-3">{t("Credits")}</th>
                <th className="px-5 py-3">{t("Status")}</th>
                <th className="px-5 py-3">{t("Description")}</th>
                <th className="px-5 py-3 text-right">{t("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    Loading courses…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    No courses match these filters.
                  </td>
                </tr>
              ) : (
                items.map((course) => (
                  <tr
                    key={course.id}
                    className="transition-colors hover:bg-canvas/70"
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => router.push(`/courses/${course.id}`)}
                        className="font-semibold hover:text-brand-600"
                      >
                        {course.name}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex whitespace-nowrap rounded-pill border border-blue-300 bg-blue-100 px-2.5 py-1 font-mono text-xs font-bold tracking-wide text-blue-900 dark:border-blue-300/50 dark:bg-blue-500/25 dark:text-blue-100">
                        {course.course_code}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {course.department?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4">{course.credits}</td>
                    <td className="px-5 py-4">
                      <CourseStatusToggle
                        course={course}
                        onUpdated={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))}
                        onFeedback={(message, kind) => setFeedback({ message, kind })}
                      />
                    </td>
                    <td className="max-w-xs px-5 py-4 text-muted">
                      {course.description || "—"}
                    </td>
                    <td className="px-5 py-3">
                      <CourseRowActions
                        course={course}
                        onEdit={() => router.push(`/courses/${course.id}/edit`)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted">
          <span>
            Showing {items.length ? (page - 1) * 10 + 1 : 0}–
            {Math.min(page * 10, total)} of {total} courses
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
