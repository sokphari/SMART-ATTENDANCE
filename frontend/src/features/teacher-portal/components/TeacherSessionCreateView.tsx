"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { getAllMyClassSections, createTeacherSession } from "../api";
import type { TeacherClassSection, TeacherSchedule } from "../types";
import { useLocale } from "@/i18n/LocaleProvider";

function campusDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Phnom_Penh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function isoCampusTime(date: string, time: string) {
  return `${date}T${time}:00+07:00`;
}

export function TeacherSessionCreateView({
  initialSectionId,
}: {
  initialSectionId?: number;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [sections, setSections] = useState<TeacherClassSection[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState(campusDate);
  const [startsAt, setStartsAt] = useState("08:00");
  const [lateAfter, setLateAfter] = useState("08:15");
  const [closesAt, setClosesAt] = useState("10:00");
  const [loadingSections, setLoadingSections] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getAllMyClassSections("active", true)
      .then((allSections) => {
        const activeSections = allSections.filter(
          (section) => section.status === "active",
        );
        setSections(activeSections);
        const initialSection =
          activeSections.find((section) => section.id === initialSectionId) ??
          activeSections[0];
        if (initialSection) {
          setSectionId(String(initialSection.id));
          const firstSchedule = initialSection.schedules?.find(
            (schedule) => schedule.status === "active" && schedule.classroom,
          );
          if (firstSchedule) selectSchedule(firstSchedule);
        }
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your assigned classes.",
        ),
      )
      .finally(() => setLoadingSections(false));
  }, []);

  const section = useMemo(
    () => sections.find((item) => String(item.id) === sectionId),
    [sections, sectionId],
  );
  const schedules = section?.schedules ?? [];
  const selectedSchedule = schedules.find(
    (item) => String(item.id) === scheduleId,
  );

  function selectSchedule(schedule: TeacherSchedule) {
    setScheduleId(String(schedule.id));
    const start = schedule.start_time.slice(0, 5);
    const end = schedule.end_time.slice(0, 5);
    setStartsAt(start);
    setLateAfter(addMinutes(start, 15));
    setClosesAt(end);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      const response = await createTeacherSession({
        class_section_id: Number(sectionId),
        class_schedule_id: Number(scheduleId),
        session_date: date,
        starts_at: isoCampusTime(date, startsAt),
        late_after: isoCampusTime(date, lateAfter),
        closes_at: isoCampusTime(date, closesAt),
      });
      router.replace(`/teacher/attendance-sessions/${response.data.id}`);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(caught.errors))
          mapped[key] = messages[0];
        setFieldErrors(mapped);
        setError(caught.message);
      } else
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to open the session.",
        );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "mt-1 h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

  return (
    <div className="w-full space-y-6">
      <Link
        href="/teacher/attendance-sessions"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"
      >
        <ArrowLeft className="size-4" />{t("Back to sessions")}</Link>
      <header>

        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{t("Open attendance session")}</h1>
        <p className="mt-2 text-sm text-muted">{t("Select one of your assigned sections and its classroom schedule.")}</p>
      </header>
      <form
        onSubmit={handleSubmit}
        className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-7"
      >
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-control bg-danger-soft p-3 text-sm text-danger"
          >
            {error}
          </div>
        )}
        {loadingSections ? (
          <p className="text-sm text-muted">Loading your assigned classes…</p>
        ) : sections.length === 0 ? (
          <div className="rounded-control bg-canvas p-4 text-sm text-muted">{t("No active assigned classes are available to open a session.")}</div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="text-sm font-semibold">{t("Class section")}<select
                required
                value={sectionId}
                onChange={(event) => {
                  setSectionId(event.target.value);
                  setScheduleId("");
                }}
                className={inputClass}
              >
                <option value="">{t("Choose an assigned class")}</option>
                {sections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.course.code} · {item.course.name} · Section{" "}
                    {item.section_code}
                  </option>
                ))}
              </select>
              {fieldErrors.class_section_id && (
                <span className="mt-1 block text-xs text-danger">
                  {fieldErrors.class_section_id}
                </span>
              )}
            </label>
            <label className="text-sm font-semibold">{t("Schedule and classroom")}<select
                required
                value={scheduleId}
                onChange={(event) => {
                  const schedule = schedules.find(
                    (item) => String(item.id) === event.target.value,
                  );
                  if (schedule) selectSchedule(schedule);
                }}
                className={inputClass}
              >
                <option value="">{t("Choose a class schedule")}</option>
                {schedules.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={!item.classroom}
                  >
                    {
                      [
                        "",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ][item.day_of_week]
                    }{" "}
                    · {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}{" "}
                    · {item.classroom?.room_code ?? "No classroom"}
                  </option>
                ))}
              </select>
              {schedules.length === 0 && (
                <span className="mt-1 block text-xs text-danger">{t("This class has no schedule. Ask an administrator to add one before opening attendance.")}</span>
              )}
              {fieldErrors.class_schedule_id && (
                <span className="mt-1 block text-xs text-danger">
                  {fieldErrors.class_schedule_id}
                </span>
              )}
            </label>
            <label className="text-sm font-semibold">{t("Session date")}<input
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                min={selectedSchedule?.effective_from ?? undefined}
                max={selectedSchedule?.effective_until ?? undefined}
                className={inputClass}
              />
              {fieldErrors.session_date && (
                <span className="mt-1 block text-xs text-danger">
                  {fieldErrors.session_date}
                </span>
              )}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm font-semibold">{t("Starts")}<input
                  required
                  type="time"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold">{t("Late after")}<input
                  required
                  type="time"
                  value={lateAfter}
                  onChange={(event) => setLateAfter(event.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-semibold">{t("Closes")}<input
                  required
                  type="time"
                  value={closesAt}
                  onChange={(event) => setClosesAt(event.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          </div>
        )}
        {section && selectedSchedule?.classroom && (
          <div className="mt-5 flex items-start gap-3 rounded-control bg-brand-50 p-4 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
            <CalendarClock className="mt-0.5 size-4 shrink-0" />
            <p>
              Room {selectedSchedule.classroom.room_code}
              {selectedSchedule.classroom.building
                ? ` · ${selectedSchedule.classroom.building}`
                : ""}
              . The session uses this scheduled classroom.
            </p>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Link
            href="/teacher/attendance-sessions"
            className="inline-flex h-11 items-center rounded-control border border-hairline px-4 text-sm font-semibold"
          >{t("Cancel")}</Link>
          <Button
            type="submit"
            loading={saving}
            disabled={loadingSections || sections.length === 0 || !scheduleId}
          >{t("Open session")}</Button>
        </div>
      </form>
    </div>
  );
}
