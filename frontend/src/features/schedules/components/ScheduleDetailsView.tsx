"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Pencil, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/status";
import { useLocale } from "@/i18n/LocaleProvider";
import { ApiError } from "@/lib/api/client";
import { fetchSchedule } from "../api";
import type { ClassSchedule } from "../types";

const DAYS: Record<number, string> = {
  1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday", 7: "Sunday",
};

export function ScheduleDetailsView() {
  const { t } = useLocale();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const scheduleId = Number(params.id);
  const [schedule, setSchedule] = useState<ClassSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!Number.isInteger(scheduleId) || scheduleId < 1) {
      setError(t("Schedule not found."));
      setLoading(false);
      return;
    }
    let active = true;
    fetchSchedule(scheduleId)
      .then(({ data }) => { if (active) setSchedule(data); })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof ApiError ? caught.message : t("Could not load timetable slot."));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scheduleId, t]);

  const details = schedule ? [
    { label: "Course", value: schedule.class_section?.course?.name ?? "—" },
    { label: "Department", value: schedule.class_section?.course?.department?.name ?? "—" },
    { label: "Teacher", value: schedule.class_section?.teachers?.map((teacher) => teacher.name).join(", ") || t("Unassigned") },
    { label: "Day", value: t(DAYS[schedule.day_of_week] ?? "Day") },
    { label: "Study period", value: schedule.time_slot?.period?.name ?? t("Custom time") },
    { label: "Time", value: `${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}` },
    { label: "Classroom", value: schedule.classroom?.room_code ?? "—" },
    { label: "Building", value: schedule.classroom?.building ?? "—" },
    { label: "Floor", value: schedule.classroom?.floor ?? "—" },
    { label: "Semester", value: schedule.class_section?.semester?.name ?? "—" },
    { label: "Effective dates", value: schedule.effective_from || schedule.effective_until ? `${schedule.effective_from ?? t("Semester start")} – ${schedule.effective_until ?? t("Semester end")}` : t("Full semester") },
  ] : [];

  return <div className="w-full space-y-5">
    <PageHeader
      title={t("Schedule details")}
      description={schedule ? `${schedule.class_section?.course?.course_code ?? ""} · ${t("Section")} ${schedule.class_section?.section_code ?? "—"}` : t("Review the class timetable entry.")}
      actions={<div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => router.push("/schedules")}><ArrowLeft className="size-4" />{t("Back to timetable")}</Button>{schedule && <Button type="button" onClick={() => router.push(`/schedules/${schedule.id}/edit`)}><Pencil className="size-4" />{t("Edit schedule")}</Button>}</div>}
    />

    {loading ? <Card className="animate-pulse p-6"><div className="h-6 w-56 rounded bg-canvas" /><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-14 rounded bg-canvas" />)}</div></Card>
      : error ? <Card className="p-6"><p role="alert" className="rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</p><Button className="mt-4" variant="secondary" onClick={() => router.push("/schedules")}><ArrowLeft className="size-4" />{t("Back to timetable")}</Button></Card>
        : schedule && <>
          <Card className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-wide text-brand-500">{schedule.class_section?.course?.course_code} · {t("Section")} {schedule.class_section?.section_code}</p><h2 className="mt-2 font-display text-2xl font-extrabold">{schedule.class_section?.course?.name ?? t("Course")}</h2><p className="mt-1 text-sm text-muted">{schedule.class_section?.course?.department?.name ?? t("Department not set")} · {schedule.class_section?.semester?.name ?? t("Semester")}</p></div>
              <StatusBadge status={schedule.status} context="resource" />
            </div>
            <div className="mt-6 grid gap-3 border-t border-hairline pt-5 sm:grid-cols-2 lg:grid-cols-3">
              <Summary icon={CalendarDays} label={t("Day")} value={t(DAYS[schedule.day_of_week] ?? "Day")} />
              <Summary icon={Clock3} label={t("Time")} value={`${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`} />
              <Summary icon={MapPin} label={t("Classroom")} value={schedule.classroom?.room_code ?? "—"} />
              <Summary icon={UsersRound} label={t("Teacher")} value={schedule.class_section?.teachers?.map((teacher) => teacher.name).join(", ") || t("Unassigned")} />
            </div>
          </Card>
          <Card className="p-5 sm:p-7">
            <h2 className="font-display text-lg font-bold">{t("Schedule information")}</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{details.map(({ label, value }) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-muted">{t(label)}</dt><dd className="mt-1.5 text-sm font-semibold text-ink">{value}</dd></div>)}</dl>
          </Card>
        </>}
  </div>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-3 rounded-control border border-hairline bg-canvas p-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-brand-500/10 text-brand-500"><Icon className="size-5" /></span><div className="min-w-0"><p className="text-xs text-muted">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></div></div>;
}
