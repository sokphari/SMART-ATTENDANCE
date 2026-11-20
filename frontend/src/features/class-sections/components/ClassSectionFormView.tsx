"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Save, Plus, Trash2 } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClassSection, fetchClassSection, fetchCoursesOptions, fetchSemestersOptions, fetchSetupOptions, type SetupOption, updateClassSection } from "../api";
import type { ClassSectionInput, CourseOption, SemesterOption } from "../types";

type TeacherOption = { id: number; department_id: number; teacher_code: string; user?: { name: string; status: string } | null };
type RoomOption = SetupOption & { room_code?: string; floor_details?: { building?: { id: number }; id: number } };
type ScheduleRow = { day_of_week: number; start_time: string; end_time: string; classroom_id: number };
const days = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const stepNames = ["Class Information", "Teacher & Capacity", "Timetable & Location", "Review & Create"];
const blankSection: ClassSectionInput = { course_id: 0, semester_id: 0, section_code: "", capacity: 35, status: "active" };
const NOTICE_KEY = "sa_class_section_notice";
const fieldClass = "h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-100";

export function ClassSectionFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params?.id);
  const [form, setForm] = useState<ClassSectionInput>(blankSection);
  const [departmentId, setDepartmentId] = useState(0);
  const [programId, setProgramId] = useState(0);
  const [yearLevel, setYearLevel] = useState(0);
  const [teacherId, setTeacherId] = useState(0);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([{ day_of_week: 1, start_time: "08:00", end_time: "09:30", classroom_id: 0 }]);
  const [selectedBuilding, setSelectedBuilding] = useState(0);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [step, setStep] = useState(0);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [departments, setDepartments] = useState<SetupOption[]>([]);
  const [programs, setPrograms] = useState<SetupOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [buildings, setBuildings] = useState<SetupOption[]>([]);
  const [floors, setFloors] = useState<SetupOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetchCoursesOptions().then(r => setCourses(r.data)),
      fetchSemestersOptions().then(r => setSemesters(r.data)),
      fetchSetupOptions("departments").then(r => setDepartments(r.data)),
      fetchSetupOptions("programs").then(r => setPrograms(r.data)),
      apiFetch<{ data: TeacherOption[] }>("/api/v1/admin/teachers?per_page=100").then(r => setTeachers(r.data.filter(t => t.user?.status === "active"))),
      fetchSetupOptions("buildings").then(r => setBuildings(r.data)),
    ]).catch(caught => setError(caught instanceof ApiError ? caught.message : "Could not load class setup options."));
    if (mode === "edit") {
      if (!Number.isInteger(id) || id < 1) { setError("Section not found."); setLoading(false); return; }
      fetchClassSection(id).then(({ data }) => {
        setForm({ course_id: data.course_id, semester_id: data.semester_id, section_code: data.section_code, capacity: data.capacity, status: data.status });
        setDateRange({ start: data.class_start_date ?? "", end: data.class_end_date ?? "" });
      }).catch(caught => setError(caught instanceof ApiError ? caught.message : "Could not load class section.")).finally(() => setLoading(false));
    }
  }, [id, mode]);

  useEffect(() => {
    if (!selectedBuilding) { setFloors([]); setSelectedFloor(0); return; }
    apiFetch<{ data: SetupOption[] }>(`/api/v1/admin/buildings/${selectedBuilding}/floors?status=active&per_page=100`).then(r => setFloors(r.data)).catch(() => setFloors([]));
    setSelectedFloor(0);
    setRooms([]);
  }, [selectedBuilding]);

  useEffect(() => {
    if (!selectedFloor) { setRooms([]); return; }
    apiFetch<{ data: RoomOption[] }>(`/api/v1/admin/classrooms?floor_id=${selectedFloor}&status=active&per_page=100`).then(r => setRooms(r.data)).catch(() => setRooms([]));
    setScheduleRows(rows => rows.map(row => ({ ...row, classroom_id: 0 })));
  }, [selectedFloor]);

  const departmentPrograms = useMemo(() => programs.filter(p => !p.department_id || p.department_id === departmentId), [programs, departmentId]);
  const departmentCourses = useMemo(() => courses.filter(c => !departmentId || c.department_id === departmentId), [courses, departmentId]);
  const departmentTeachers = useMemo(() => teachers.filter(t => !departmentId || t.department_id === departmentId), [teachers, departmentId]);
  const selectedRoom = (roomId: number) => rooms.find(r => r.id === roomId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "create") {
      if (!form.course_id || !form.semester_id || !departmentId || !teacherId || !scheduleRows.length || scheduleRows.some(r => !r.classroom_id)) {
        setError("Complete the course, semester, teacher, and classroom schedule fields before creating the class."); return;
      }
      if (!dateRange.start || !dateRange.end) { setError("Select the class date range."); return; }
    }
    setSaving(true); setError("");
    const payload: ClassSectionInput = {
      ...form,
      ...(mode === "create" ? {
        program_id: programId || null,
        year_level: yearLevel || null,
        teacher_id: teacherId,
        class_start_date: dateRange.start,
        class_end_date: dateRange.end,
        schedules: scheduleRows,
      } : {}),
    };
    try {
      if (mode === "create") { await createClassSection(payload); window.sessionStorage.setItem(NOTICE_KEY, "Class and timetable created successfully."); }
      else { await updateClassSection(id, payload); window.sessionStorage.setItem(NOTICE_KEY, "Class section updated successfully."); }
      router.replace("/class-sections");
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : `Could not ${mode} class section.`); setSaving(false);
    }
  }

  const title = mode === "create" ? "Create Class" : "Edit Class Section";
  const select = (label: string, value: number, onChange: (value: number) => void, options: { id: number; label: string }[], placeholder: string, disabled = false) => (
    <label className="space-y-1.5 text-sm font-semibold">{label}<select disabled={disabled} value={value || ""} onChange={e => onChange(Number(e.target.value))} className={fieldClass}><option value="">{placeholder}</option>{options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
  );

  return <>
    <PageHeader title={title} description={mode === "create" ? "Set up the class, assigned teacher, room, and weekly timetable." : "Update class section details."} actions={<Button variant="secondary" size="sm" onClick={() => router.push("/class-sections")}><ArrowLeft className="size-4"/>Back to sections</Button>}/>
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading section details…</Card> : <Card className="w-full p-5 sm:p-7">
      {mode === "create" && <ol aria-label="Class setup progress" className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">{stepNames.map((name, index) => <li key={name}><button type="button" onClick={() => setStep(index)} aria-current={step === index ? "step" : undefined} className={`w-full rounded-control border px-3 py-2 text-left text-xs font-semibold ${step === index ? "border-brand-500 bg-brand-50 text-brand-700" : "border-hairline text-muted"}`}><span className="mr-2">{index + 1}</span>{name}</button></li>)}</ol>}
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        {(mode === "edit" || step === 0) && <>
          {select("1. Department", departmentId, setDepartmentId, departments.map(d => ({ id: d.id, label: `${d.code ?? ""} ${d.name}`.trim() })), "Select department")}
          {select("2. Program", programId, setProgramId, departmentPrograms.map(p => ({ id: p.id, label: `${p.code ?? ""} ${p.name}`.trim() })), "Select program (optional)", !departmentId)}
          <label className="space-y-1.5 text-sm font-semibold">Student year<select value={yearLevel || ""} onChange={e => setYearLevel(Number(e.target.value))} className={fieldClass}><option value="">Any year</option>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>Year {i + 1}</option>)}</select></label>
          {select("3. Subject / Course", form.course_id, value => setForm({ ...form, course_id: value }), departmentCourses.map(c => ({ id: c.id, label: `${c.course_code} — ${c.name}` })), "Select course", !departmentId)}
          {select("4–5. Academic year / Semester", form.semester_id, value => setForm({ ...form, semester_id: value }), semesters.map(s => ({ id: s.id, label: `${s.academic_year?.name ?? "Academic year"} · ${s.name}` })), "Select semester")}
          <Input label="6. Section" placeholder="e.g. A or 01" required maxLength={30} value={form.section_code} onChange={e => setForm({ ...form, section_code: e.target.value.toUpperCase() })}/>
        </>}
        {(mode === "edit" || step === 1) && <>
          {select("7. Assigned teacher", teacherId, setTeacherId, departmentTeachers.map(t => ({ id: t.id, label: `${t.user?.name ?? t.teacher_code} (${t.teacher_code})` })), "Select teacher", !departmentId)}
          <Input label="8. Maximum student capacity" type="number" min={1} max={500} required value={String(form.capacity)} onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}/>
        </>}
        {(mode === "edit" || step === 2) && <>
          {select("9. Building", selectedBuilding, setSelectedBuilding, buildings.map(b => ({ id: b.id, label: `${b.code ?? ""} ${b.name}`.trim() })), "Select building")}
          {select("10. Floor", selectedFloor, setSelectedFloor, floors.map(f => ({ id: f.id, label: f.name })), "Select floor", !selectedBuilding)}
          <div className="space-y-3 sm:col-span-2">
            <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">12. Weekly timetable</h3><Button type="button" variant="secondary" size="sm" onClick={() => setScheduleRows(rows => [...rows, { day_of_week: 1, start_time: "08:00", end_time: "09:30", classroom_id: 0 }])}><Plus className="size-4"/>Add session</Button></div>
            {scheduleRows.map((row, index) => <div key={index} className="grid gap-3 rounded-control border border-hairline p-3 sm:grid-cols-4">
              <label className="space-y-1 text-xs font-semibold">Day<select className={fieldClass} value={row.day_of_week} onChange={e => setScheduleRows(rows => rows.map((r, i) => i === index ? { ...r, day_of_week: Number(e.target.value) } : r))}>{days.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select></label>
              <Input label="Start time" type="time" value={row.start_time} onChange={e => setScheduleRows(rows => rows.map((r, i) => i === index ? { ...r, start_time: e.target.value } : r))}/>
              <Input label="End time" type="time" value={row.end_time} onChange={e => setScheduleRows(rows => rows.map((r, i) => i === index ? { ...r, end_time: e.target.value } : r))}/>
              <div className="flex items-end gap-2">{select("11. Classroom", row.classroom_id, value => setScheduleRows(rows => rows.map((r, i) => i === index ? { ...r, classroom_id: value } : r)), rooms.map(room => ({ id: room.id, label: `${room.room_code ?? room.name} · ${room.capacity ?? "?"} seats` })), selectedFloor ? "Select classroom" : "Select building and floor", !selectedFloor)}{scheduleRows.length > 1 && <button type="button" aria-label="Remove schedule row" className="mb-0.5 rounded border border-hairline p-3 text-danger" onClick={() => setScheduleRows(rows => rows.filter((_, i) => i !== index))}><Trash2 className="size-4"/></button>}</div>
              {row.classroom_id > 0 && selectedRoom(row.classroom_id) && <p className="text-xs text-muted sm:col-span-4">Room capacity: {selectedRoom(row.classroom_id)?.capacity} seats</p>}
            </div>)}
          </div>
          <Input label="13. Class start date" type="date" required value={dateRange.start} onChange={e => setDateRange(v => ({ ...v, start: e.target.value }))}/>
          <Input label="Class end date" type="date" required value={dateRange.end} onChange={e => setDateRange(v => ({ ...v, end: e.target.value }))}/>
        </>}
        {(mode === "edit" || step === 3) && <>
          <div className="rounded-control bg-canvas-subtle p-4 text-sm sm:col-span-2"><h3 className="font-semibold">Review class setup</h3><p className="mt-2 text-muted">{courses.find(c => c.id === form.course_id)?.name ?? "Course not selected"} · {form.section_code || "Section not set"}</p><p className="text-muted">{semesters.find(s => s.id === form.semester_id)?.name ?? "Semester not selected"} · Capacity {form.capacity}</p><p className="text-muted">{departmentTeachers.find(t => t.id === teacherId)?.user?.name ?? "Teacher not selected"} · {scheduleRows.length} weekly session(s)</p><p className="text-muted">Date range: {dateRange.start || "—"} to {dateRange.end || "—"}</p></div>
        </>}
        {mode === "edit" && <label className="space-y-1.5 text-sm font-semibold sm:col-span-2">Status<select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as "active" | "inactive" })} className={fieldClass}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
        {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
        <div className="flex justify-between gap-2 border-t border-hairline pt-4 sm:col-span-2">
          {mode === "create" ? <Button type="button" variant="secondary" disabled={step === 0} onClick={() => setStep(n => Math.max(0, n - 1))}><ArrowLeft className="size-4"/>Previous</Button> : <span/>}
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => router.push("/class-sections")}>Cancel</Button>{mode === "create" && step < 3 ? <Button type="button" onClick={() => { setError(""); setStep(n => Math.min(3, n + 1)); }} >Continue<ArrowRight className="size-4"/></Button> : <Button type="submit" loading={saving}><Save className="size-4"/>{mode === "create" ? "Create class" : "Save changes"}</Button>}</div>
        </div>
      </form>
    </Card>}
  </>;
}
