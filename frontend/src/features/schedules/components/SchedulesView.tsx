"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building,
  CalendarClock,
  CheckCircle2,
  Clock,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  deleteSchedule,
  fetchClassroomOptions,
  fetchSchedules,
} from "../api";
import type { ClassroomOption, ClassSchedule } from "../types";

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

export function SchedulesView() {
  const router = useRouter();
  const [items, setItems] = useState<ClassSchedule[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
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
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (dayOfWeek) params.set("day_of_week", dayOfWeek);
    if (classroomId) params.set("classroom_id", classroomId);

    try {
      const result = await fetchSchedules(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load class schedules.",
      );
    } finally {
      setLoading(false);
    }
  }, [classroomId, dayOfWeek, page, search]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  useEffect(() => {
    fetchClassroomOptions()
      .then((res) => setClassrooms(res.data))
      .catch(() => setClassrooms([]));

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

  async function handleDelete(schedule: ClassSchedule) {
    if (!confirm("Are you sure you want to remove this timetable slot?")) {
      return;
    }
    setActionMenuId(null);
    try {
      await deleteSchedule(schedule.id);
      setItems((prev) => prev.filter((item) => item.id !== schedule.id));
      setTotal((t) => Math.max(0, t - 1));
      setFeedback({
        message: "Timetable slot deleted successfully.",
        kind: "success",
      });
    } catch (caught) {
      setFeedback({
        message:
          caught instanceof ApiError
            ? caught.message
            : "Could not delete schedule.",
        kind: "error",
      });
    }
  }

  const todayDay = new Date().getDay() || 7; // Sunday=7 in ISO
  const todayCount = useMemo(
    () => items.filter((item) => item.day_of_week === todayDay).length,
    [items, todayDay],
  );

  return (
    <>
      <PageHeader
        title="Class Schedules"
        description="Weekly timetable slots linking sections, classrooms, and time windows."
        actions={
          <Button onClick={() => router.push("/schedules/create")}>
            <Plus className="size-4" />
            Add schedule slot
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-brand-50 p-3 text-brand-600">
            <CalendarClock className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Total timetable slots</p>
            <p className="font-display mt-1 text-2xl font-bold">{total}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-success-soft p-3 text-success">
            <Clock className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Slots today ({DAYS[todayDay]})</p>
            <p className="font-display mt-1 text-2xl font-bold">{todayCount}</p>
          </div>
        </Card>
        <Card className="flex min-h-28 items-center gap-4 p-5">
          <span className="rounded-panel bg-slate-100 p-3 text-slate-600">
            <Building className="size-6" />
          </span>
          <div>
            <p className="text-sm text-muted">Classrooms active</p>
            <p className="font-display mt-1 text-2xl font-bold">
              {classrooms.length}
            </p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label="Search schedules"
              placeholder="Search course or room"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <select
            aria-label="Filter by day of week"
            value={dayOfWeek}
            onChange={(e) => {
              setDayOfWeek(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">All days</option>
            {Object.entries(DAYS).map(([num, name]) => (
              <option key={num} value={num}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by classroom"
            value={classroomId}
            onChange={(e) => {
              setClassroomId(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"
          >
            <option value="">All classrooms</option>
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

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3">Day</th>
                <th className="px-5 py-3">Time Window</th>
                <th className="px-5 py-3">Classroom</th>
                <th className="px-5 py-3">Course & Section</th>
                <th className="px-5 py-3">Effective Dates</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    Loading timetable slots…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted">
                    No schedule slots match these filters.
                  </td>
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
                      <div className="flex items-center gap-1.5 font-medium text-ink">
                        <Clock className="size-3.5 text-muted" />
                        <span>
                          {slot.start_time?.slice(0, 5)} –{" "}
                          {slot.end_time?.slice(0, 5)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-ink">
                        {slot.classroom?.room_code ?? "—"}
                      </span>
                      {slot.classroom?.building && (
                        <div className="text-xs text-muted">
                          {slot.classroom.building}
                          {slot.classroom.floor ? `, Fl ${slot.classroom.floor}` : ""}
                        </div>
                      )}
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
                      {slot.effective_from && slot.effective_until
                        ? `${slot.effective_from} to ${slot.effective_until}`
                        : "Full semester"}
                    </td>
                    <td className="relative px-5 py-3 text-right">
                      <div className="relative inline-block text-left">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setActionMenuId(
                              actionMenuId === slot.id ? null : slot.id,
                            )
                          }
                          aria-label="Actions"
                        >
                          <MoreVertical className="size-4" />
                        </Button>
                        {actionMenuId === slot.id && (
                          <div className="absolute right-0 z-50 mt-1 w-44 rounded-panel border border-hairline bg-card py-1 shadow-lift">
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuId(null);
                                router.push(`/schedules/${slot.id}/edit`);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink hover:bg-canvas"
                            >
                              <Pencil className="size-3.5 text-muted" />
                              Edit slot
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(slot)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-danger hover:bg-danger-soft"
                            >
                              <Trash2 className="size-3.5" />
                              Delete slot
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
            {Math.min(page * 10, total)} of {total} slots
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
