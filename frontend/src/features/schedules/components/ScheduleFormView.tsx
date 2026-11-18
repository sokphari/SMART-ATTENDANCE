"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { chooseInitialSemester, createSchedule, fetchClassroomOptions, fetchSchedule, fetchSectionOptions, fetchSemesterOptions, fetchTeacherWorkload, fetchTimetableConfiguration, MANUAL_SEMESTER_SELECTION_KEY, SELECTED_SEMESTER_KEY, updateSchedule } from "../api";
import type { ClassroomOption, ClassScheduleInput, SectionOption, SemesterOption, TeacherWorkload, TimetableConfig } from "../types";

const DAYS = [{ value: 1, label: "Monday" }, { value: 2, label: "Tuesday" }, { value: 3, label: "Wednesday" }, { value: 4, label: "Thursday" }, { value: 5, label: "Friday" }];
const NOTICE_KEY = "sa_schedule_notice";

export function ScheduleFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params?.id);
  const [form, setForm] = useState<ClassScheduleInput>({ class_section_id: 0, classroom_id: 0, time_slot_id: null, days_of_week: [1], day_of_week: 1, start_time: "08:00", end_time: "10:00", effective_from: "", effective_until: "" });
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [teacherWorkloads, setTeacherWorkloads] = useState<TeacherWorkload[]>([]);
  const [checkingTeacherAvailability, setCheckingTeacherAvailability] = useState(false);
  const [semesterId, setSemesterId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedSection = useMemo(() => sections.find((section) => section.id === form.class_section_id), [sections, form.class_section_id]);
  const departmentOptions = useMemo(() => {
    const unique = new Map(sections.filter((section) => section.course?.department).map((section) => [section.course!.department!.id, section.course!.department!]));
    return [...unique.values()];
  }, [sections]);
  const courseOptions = useMemo(() => {
    const unique = new Map(sections.filter((section) => (!departmentId || String(section.course?.department_id) === departmentId) && section.course).map((section) => [section.course!.id, section.course!]));
    return [...unique.values()];
  }, [departmentId, sections]);
  const visibleSections = useMemo(() => sections.filter((section) => (!departmentId || String(section.course?.department_id) === departmentId) && (!courseId || String(section.course?.id) === courseId)), [courseId, departmentId, sections]);
  const selectedSlot = config?.periods.flatMap((period) => period.time_slots.map((slot) => ({ ...slot, period }))).find((slot) => slot.id === form.time_slot_id);

  useEffect(() => {
    const saved = window.localStorage.getItem(SELECTED_SEMESTER_KEY) ?? "";
    Promise.all([fetchTimetableConfiguration(), fetchClassroomOptions(), fetchSemesterOptions()]).then(([timetable, rooms, termOptions]) => {
      setConfig(timetable.data);
      setClassrooms(rooms.data);
      setSemesters(termOptions.data);
      const chosenSemester = chooseInitialSemester(termOptions.data);
      if (chosenSemester) { setSemesterId(String(chosenSemester.id)); window.localStorage.setItem(SELECTED_SEMESTER_KEY, String(chosenSemester.id)); }
      const firstSlot = timetable.data.periods.flatMap((period) => period.time_slots).find((slot) => slot.is_active && !slot.is_break);
      if (firstSlot) setForm((current) => ({ ...current, time_slot_id: firstSlot.id, start_time: firstSlot.starts_at, end_time: firstSlot.ends_at }));
    }).catch(() => setError("Could not load timetable setup. Refresh and try again."));
    if (mode === "edit") {
      if (!Number.isInteger(id) || id < 1) { setError("Schedule not found."); setLoading(false); return; }
      void fetchSchedule(id).then(({ data }) => {
        setSemesterId(String(data.class_section?.semester?.id ?? saved));
        setForm({ class_section_id: data.class_section_id, classroom_id: data.classroom_id, time_slot_id: data.time_slot_id, day_of_week: data.day_of_week, days_of_week: [data.day_of_week], start_time: data.start_time.slice(0, 5), end_time: data.end_time.slice(0, 5), effective_from: data.effective_from ?? "", effective_until: data.effective_until ?? "", status: data.status });
      }).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load timetable slot.")).finally(() => setLoading(false));
    } else setLoading(false);
  }, [id, mode]);

  useEffect(() => {
    void fetchSectionOptions(semesterId ? Number(semesterId) : undefined, mode === "create").then((res) => setSections(res.data)).catch(() => setSections([]));
  }, [semesterId, mode]);

  useEffect(() => {
    if (mode !== "create" || !selectedSection?.teachers?.length || !semesterId) { setTeacherWorkloads([]); return; }
    let current = true;
    setCheckingTeacherAvailability(true);
    Promise.all(selectedSection.teachers.map((teacher) => fetchTeacherWorkload(teacher.id, Number(semesterId)).then((result) => result.data).catch(() => null)))
      .then((results) => { if (current) setTeacherWorkloads(results.filter((result): result is TeacherWorkload => result !== null)); })
      .finally(() => { if (current) setCheckingTeacherAvailability(false); });
    return () => { current = false; };
  }, [mode, selectedSection, semesterId]);

  const teacherAvailability = useMemo(() => {
    if (!selectedSection?.teachers?.length) return "unassigned";
    if (checkingTeacherAvailability) return "checking";
    if (!form.time_slot_id) return "unknown";
    if (teacherWorkloads.length !== selectedSection.teachers.length) return "unavailable";
    const days = form.days_of_week ?? [form.day_of_week ?? 1];
    return teacherWorkloads.every((workload) => days.every((day) => workload.available_time_slots.some((slot) => slot.day_of_week === day && slot.time_slot_id === form.time_slot_id))) ? "available" : "conflict";
  }, [checkingTeacherAvailability, form.day_of_week, form.days_of_week, form.time_slot_id, selectedSection, teacherWorkloads]);

  function toggleDay(day: number) {
    setForm((current) => {
      const selected = current.days_of_week ?? [current.day_of_week ?? 1];
      const days = selected.includes(day) ? selected.filter((value) => value !== day) : [...selected, day].sort();
      return { ...current, days_of_week: days };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.class_section_id || !form.classroom_id) { setError("Choose a class section and classroom."); return; }
    if (!form.days_of_week?.length) { setError("Choose at least one weekday."); return; }
    setSaving(true); setError("");
    const payload: ClassScheduleInput = {
      class_section_id: form.class_section_id,
      classroom_id: form.classroom_id,
      time_slot_id: form.time_slot_id || null,
      ...(form.time_slot_id ? {} : { start_time: `${form.start_time}:00`, end_time: `${form.end_time}:00` }),
      ...(mode === "create" ? { days_of_week: form.days_of_week } : { day_of_week: form.day_of_week }),
      effective_from: form.effective_from || null,
      effective_until: form.effective_until || null,
      status: form.status,
    };
    try {
      if (mode === "create") { await createSchedule(payload); window.sessionStorage.setItem(NOTICE_KEY, "Timetable schedule created successfully."); }
      else { await updateSchedule(id, payload); window.sessionStorage.setItem(NOTICE_KEY, "Timetable schedule updated successfully."); }
      router.replace("/schedules");
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : `Could not ${mode} the timetable schedule.`);
      setSaving(false);
    }
  }

  return <>
    <PageHeader title={mode === "create" ? "Add timetable schedule" : "Edit timetable schedule"} description="Assign a class section to a weekday, teaching period, and classroom." actions={<Button variant="secondary" size="sm" onClick={() => router.push("/schedules")}><ArrowLeft className="size-4" />Back to timetable</Button>} />
    {loading ? <Card className="p-8 text-sm text-muted">Loading timetable form…</Card> : <Card className="w-full p-5 sm:p-7">
      <form onSubmit={submit} className="grid gap-5 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-semibold">Academic semester
          <select value={semesterId} onChange={(event) => { setSemesterId(event.target.value); window.localStorage.setItem(SELECTED_SEMESTER_KEY, event.target.value); window.localStorage.setItem(MANUAL_SEMESTER_SELECTION_KEY, "true"); setDepartmentId(""); setCourseId(""); setForm((current) => ({ ...current, class_section_id: 0 })); }} className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink">
            {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name} · {semester.academic_year?.name ?? `${semester.start_date}–${semester.end_date}`}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold">Department
          <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setCourseId(""); setForm((current) => ({ ...current, class_section_id: 0 })); }} className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All departments</option>{departmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold">Course
          <select value={courseId} onChange={(event) => { setCourseId(event.target.value); setForm((current) => ({ ...current, class_section_id: 0 })); }} className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All courses</option>{courseOptions.map((course) => <option key={course.id} value={course.id}>{course.course_code} · {course.name}</option>)}</select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold">Class section <span className="text-danger">*</span>
          <select required value={form.class_section_id || ""} onChange={(event) => setForm({ ...form, class_section_id: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink">
            <option value="">Select a section</option>{visibleSections.map((section) => <option key={section.id} value={section.id}>{section.course?.course_code} — {section.course?.name} · Section {section.section_code}</option>)}
          </select>
        </label>
        <div className="rounded-control border border-hairline bg-canvas p-3 text-sm md:col-span-2">
          <p className="font-semibold">Section information</p>
          <p className="mt-1 text-muted">{selectedSection?.course?.department?.name ?? "Department not available"} · {selectedSection?.teachers?.map((teacher) => teacher.name).join(", ") || "No teacher assigned"}</p>
          {mode === "create" && selectedSection?.teachers?.length ? <p className={`mt-2 text-xs font-semibold ${teacherAvailability === "available" ? "text-success" : teacherAvailability === "conflict" ? "text-danger" : "text-muted"}`}>
            {teacherAvailability === "checking" ? "Checking assigned teacher availability…" : teacherAvailability === "available" ? "Assigned teachers are available for the selected period and weekdays." : teacherAvailability === "conflict" ? "At least one assigned teacher has a timetable conflict in the selected period or weekday." : teacherAvailability === "unavailable" ? "Teacher availability could not be verified. Server-side conflict checks will still run when you save." : "Choose a configured period to check teacher availability."}
          </p> : null}
        </div>
        <label className="space-y-1.5 text-sm font-semibold">Classroom <span className="text-danger">*</span>
          <select required value={form.classroom_id || ""} onChange={(event) => setForm({ ...form, classroom_id: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink">
            <option value="">Select a classroom</option>{classrooms.map((room) => <option key={room.id} value={room.id}>{room.room_code}{room.building ? ` · ${room.building}` : ""}</option>)}
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-semibold">Teaching period / time slot
          <select value={form.time_slot_id ?? ""} onChange={(event) => {
            const value = Number(event.target.value) || null;
            const slot = config?.periods.flatMap((period) => period.time_slots).find((item) => item.id === value);
            setForm({ ...form, time_slot_id: value, ...(slot ? { start_time: slot.starts_at, end_time: slot.ends_at } : {}) });
          }} className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink">
            <option value="">Custom time</option>{config?.periods.filter((period) => period.is_active).map((period) => <optgroup key={period.id} label={period.name}>{period.time_slots.filter((slot) => slot.is_active && !slot.is_break).map((slot) => <option key={slot.id} value={slot.id}>{slot.name} · {slot.starts_at}–{slot.ends_at}</option>)}</optgroup>)}
          </select>
          {selectedSlot && <span className="block text-xs font-normal text-muted">{selectedSlot.period.name} session · times follow the configured timetable.</span>}
        </label>
        {mode === "create" ? <fieldset className="space-y-2 md:col-span-2"><legend className="text-sm font-semibold">Weekdays <span className="text-danger">*</span></legend><div className="flex flex-wrap gap-2">{DAYS.map((day) => <label key={day.value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control border border-hairline px-3 text-sm"><input type="checkbox" checked={form.days_of_week?.includes(day.value) ?? false} onChange={() => toggleDay(day.value)} />{day.label}</label>)}</div><p className="text-xs text-muted">One recurring timetable entry will be created for each selected day.</p></fieldset> : <label className="space-y-1.5 text-sm font-semibold">Weekday
          <select value={form.day_of_week} onChange={(event) => setForm({ ...form, day_of_week: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink">{DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select>
        </label>}
        {!form.time_slot_id && <div className="grid grid-cols-2 gap-3"><Input label="Start time" type="time" required value={form.start_time?.slice(0, 5)} onChange={(event) => setForm({ ...form, start_time: event.target.value })} /><Input label="End time" type="time" required value={form.end_time?.slice(0, 5)} onChange={(event) => setForm({ ...form, end_time: event.target.value })} /></div>}
        <Input label="Effective from" type="date" value={form.effective_from ?? ""} min={selectedSection?.semester?.start_date} max={selectedSection?.semester?.end_date} onChange={(event) => setForm({ ...form, effective_from: event.target.value })} />
        <Input label="Effective until" type="date" value={form.effective_until ?? ""} min={form.effective_from || selectedSection?.semester?.start_date} max={selectedSection?.semester?.end_date} onChange={(event) => setForm({ ...form, effective_until: event.target.value })} />
        {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger md:col-span-2">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-hairline pt-4 md:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push("/schedules")}>Cancel</Button><Button type="submit" loading={saving}><Save className="size-4" />{mode === "create" ? "Save schedule" : "Save changes"}</Button></div>
      </form>
    </Card>}
  </>;
}
