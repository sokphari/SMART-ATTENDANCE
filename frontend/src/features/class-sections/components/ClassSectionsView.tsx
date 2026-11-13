"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  deleteClassSection,
  fetchClassSections,
  fetchSemestersOptions,
} from "../api";
import type { ClassSection, SemesterOption } from "../types";

const NOTICE_KEY = "sa_class_section_notice";

export function ClassSectionsView() {
  const router = useRouter();
  const [items, setItems] = useState<ClassSection[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [search, setSearch] = useState("");
  const [semesterId, setSemesterId] = useState("");
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
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const loadSections = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (semesterId) params.set("semester_id", semesterId);
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
  }, [page, search, semesterId, status]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  useEffect(() => {
    fetchSemestersOptions()
      .then((res) => setSemesters(res.data))
      .catch(() => setSemesters([]));

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

  async function handleDelete(section: ClassSection) {
    if (
      !confirm(
        `Are you sure you want to deactivate section "${section.section_code}" of ${section.course?.course_code ?? "this course"}?`,
      )
    ) {
      return;
    }
    setActionMenuId(null);
    try {
      await deleteClassSection(section.id);
      setItems((prev) =>
        prev.map((item) =>
          item.id === section.id ? { ...item, status: "inactive" } : item,
        ),
      );
      setFeedback({
        message: "Section deactivated successfully.",
        kind: "success",
      });
    } catch (caught) {
      setFeedback({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Could not deactivate section.",
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

  return (
    <>
      <PageHeader
        title="Class Sections"
        description="Manage active course sections, capacity, and semester offerings."
        actions={
          <Button onClick={() => router.push("/class-sections/create")}>
            <Plus className="size-4" />
            Create section
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-brand-50 p-3 text-brand-600">
            <Layers className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Total sections</p>
            <p className="font-display mt-1 text-2xl font-bold">{total}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-success-soft p-3 text-success">
            <Layers className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Active on this page</p>
            <p className="font-display mt-1 text-2xl font-bold">{activeCount}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-slate-100 p-3 text-slate-600">
            <Users className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Page capacity</p>
            <p className="font-display mt-1 text-2xl font-bold">
              {totalCapacity} seats
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Search sections"
              placeholder="Search section code or course name/code"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter by semester"
            value={semesterId}
            onChange={(e) => {
              setSemesterId(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">All semesters</option>
            {semesters.map((sem) => (
              <option key={sem.id} value={sem.id}>
                {sem.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by section status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Section</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Capacity</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    Loading class sections…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted">
                    No class sections match these filters.
                  </td>
                </tr>
              ) : (
                items.map((section) => (
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
                          {section.course?.course_code}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                        Section {section.section_code}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {section.semester?.name ?? "—"}
                    </td>
                    <td className="px-5 py-4 font-medium">
                      {section.capacity} seats
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={
                          section.status === "active" ? "success" : "neutral"
                        }
                      >
                        {section.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {section.course?.department?.name ?? "—"}
                    </td>
                    <td className="relative px-5 py-3 text-right">
                      <div className="relative inline-block text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActionMenuId(
                              actionMenuId === section.id ? null : section.id,
                            )
                          }
                          aria-label="Actions"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                        {actionMenuId === section.id && (
                          <div className="absolute right-0 z-50 mt-1 w-44 rounded-panel border border-hairline bg-card py-1 shadow-lift">
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuId(null);
                                router.push(`/class-sections/${section.id}/edit`);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas"
                            >
                              <Pencil className="size-3.5 text-muted" />
                              Edit section
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(section)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="size-3.5" />
                              Deactivate
                            </button>
                          </div>
                        )}
                      </div>
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
            {Math.min(page * 10, total)} of {total} sections
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((v) => v - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= lastPage || loading}
              onClick={() => setPage((v) => v + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
