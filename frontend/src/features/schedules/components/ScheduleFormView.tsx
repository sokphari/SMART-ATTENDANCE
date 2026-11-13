"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  createSchedule,
  fetchClassroomOptions,
  fetchSchedule,
  fetchSectionOptions,
  updateSchedule,
} from "../api";
import type { ClassroomOption, ClassScheduleInput, SectionOption } from "../types";

const blankSchedule: ClassScheduleInput = {
  class_section_id: 0,
  classroom_id: 0,
  day_of_week: 1,
  start_time: "08:00:00",
  end_time: "10:00:00",
  effective_from: "",
  effective_until: "",
};

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const NOTICE_KEY = "sa_schedule_notice";

export function ScheduleFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params?.id);

  const [form, setForm] = useState<ClassScheduleInput>(blankSchedule);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchSectionOptions()
      .then((res) => setSections(res.data))
      .catch(() => setSections([]));

    fetchClassroomOptions()
      .then((res) => setClassrooms(res.data))
      .catch(() => setClassrooms([]));

    if (mode === "edit") {
      if (!Number.isInteger(id) || id < 1) {
        setError("Schedule not found.");
        setLoading(false);
        return;
      }
      fetchSchedule(id)
        .then(({ data }) =>
          setForm({
            class_section_id: data.class_section_id,
            classroom_id: data.classroom_id,
            day_of_week: data.day_of_week,
            start_time: data.start_time,
            end_time: data.end_time,
            effective_from: data.effective_from ?? "",
            effective_until: data.effective_until ?? "",
          }),
        )
        .catch((caught) =>
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Could not load timetable slot.",
          ),
        )
        .finally(() => setLoading(false));
    }
  }, [id, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.class_section_id) {
      setError("Please select a class section.");
      return;
    }
    if (!form.classroom_id) {
      setError("Please select a classroom.");
      return;
    }
    setSaving(true);
    setError("");

    // Format start_time and end_time to H:i:s if only H:i entered
    const startTime =
      form.start_time.length === 5 ? `${form.start_time}:00` : form.start_time;
    const endTime =
      form.end_time.length === 5 ? `${form.end_time}:00` : form.end_time;

    const payload: ClassScheduleInput = {
      ...form,
      start_time: startTime,
      end_time: endTime,
      effective_from: form.effective_from ? form.effective_from : null,
      effective_until: form.effective_until ? form.effective_until : null,
    };

    try {
      if (mode === "create") {
        await createSchedule(payload);
        window.sessionStorage.setItem(
          NOTICE_KEY,
          "Timetable slot created successfully.",
        );
      } else {
        await updateSchedule(id, payload);
        window.sessionStorage.setItem(
          NOTICE_KEY,
          "Timetable slot updated successfully.",
        );
      }
      router.replace("/schedules");
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? Object.values(caught.errors).flat()[0] ?? caught.message
          : `Could not ${mode} schedule slot.`,
      );
      setSaving(false);
    }
  }

  const title =
    mode === "create" ? "Add Timetable Slot" : "Edit Timetable Slot";

  return (
    <>
      <PageHeader
        title={title}
        description={
          mode === "create"
            ? "Reserve a classroom and time window for a class section."
            : "Update timing, day, or classroom assignment."
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push("/schedules")}
          >
            <ArrowLeft className="size-4" />
            Back to schedules
          </Button>
        }
      />

      {loading ? (
        <Card className="w-full p-8 text-sm text-muted">
          Loading schedule slot details…
        </Card>
      ) : (
        <Card className="w-full p-5 sm:p-7">
          <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold">
              Class Section <span className="text-danger">*</span>
              <select
                required
                value={form.class_section_id || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    class_section_id: Number(e.target.value),
                  })
                }
                className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
              >
                <option value="">Select a section</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course?.course_code} — {s.course?.name} (Section{" "}
                    {s.section_code})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-semibold">
              Classroom <span className="text-danger">*</span>
              <select
                required
                value={form.classroom_id || ""}
                onChange={(e) =>
                  setForm({ ...form, classroom_id: Number(e.target.value) })
                }
                className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
              >
                <option value="">Select a classroom</option>
                {classrooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.room_code} {r.building ? `(${r.building})` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm font-semibold">
              Day of Week <span className="text-danger">*</span>
              <select
                required
                value={form.day_of_week}
                onChange={(e) =>
                  setForm({ ...form, day_of_week: Number(e.target.value) })
                }
                className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Time"
                type="time"
                required
                value={form.start_time.slice(0, 5)}
                onChange={(e) =>
                  setForm({ ...form, start_time: `${e.target.value}:00` })
                }
              />
              <Input
                label="End Time"
                type="time"
                required
                value={form.end_time.slice(0, 5)}
                onChange={(e) =>
                  setForm({ ...form, end_time: `${e.target.value}:00` })
                }
              />
            </div>

            <Input
              label="Effective From"
              type="date"
              value={form.effective_from ?? ""}
              onChange={(e) =>
                setForm({ ...form, effective_from: e.target.value })
              }
            />

            <Input
              label="Effective Until"
              type="date"
              value={form.effective_until ?? ""}
              onChange={(e) =>
                setForm({ ...form, effective_until: e.target.value })
              }
            />

            {error && (
              <p
                role="alert"
                className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2"
              >
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/schedules")}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                <Save className="size-4" />
                {mode === "create" ? "Add timetable slot" : "Save changes"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}

