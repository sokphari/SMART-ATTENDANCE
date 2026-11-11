"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createCourse, fetchCourse, fetchCourseDepartments, updateCourse } from "../api";
import type { CourseInput, DepartmentOption } from "../types";

const blankForm: CourseInput = { department_id: 0, course_code: "", name: "", description: "", credits: 3, status: "active" };
const NOTICE_KEY = "sa_course_notice";

export function CourseFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<CourseInput>(blankForm);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "create") {
      fetchCourseDepartments().then((result) => setDepartments(result.data)).catch(() => setError("Could not load departments."));
      return;
    }
    if (!Number.isInteger(id) || id < 1) { setError("Course was not found."); setLoading(false); return; }
    Promise.all([fetchCourse(id), fetchCourseDepartments()]).then(([courseResult, departmentResult]) => {
      const course = courseResult.data;
      setDepartments(departmentResult.data);
      setForm({ department_id: course.department_id, course_code: course.course_code, name: course.name, description: course.description ?? "", credits: course.credits, status: course.status });
    }).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load course.")).finally(() => setLoading(false));
  }, [id, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, department_id: Number(form.department_id), credits: Number(form.credits) };
      if (mode === "create") await createCourse(payload);
      else await updateCourse(id, payload);
      window.sessionStorage.setItem(NOTICE_KEY, mode === "create" ? "Course created successfully." : "Course updated successfully.");
      router.replace("/courses");
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : `Could not ${mode} course.`);
      setSaving(false);
    }
  }

  return <>
    <PageHeader title={mode === "create" ? "Create course" : "Edit course"} description={mode === "create" ? "Add a course to a department's catalog." : "Update course details and status."} actions={<Button variant="secondary" size="sm" onClick={() => router.push("/courses")}><ArrowLeft className="size-4" />Back to courses</Button>} />
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading course…</Card> : !form.name && mode === "edit" && error ? <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : <Card className="w-full p-5 sm:p-7"><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Input label="Course name" placeholder="e.g. Introduction to Programming" required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label="Course code" placeholder="e.g. CS101" required maxLength={50} value={form.course_code} onChange={(event) => setForm({ ...form, course_code: event.target.value.toUpperCase() })} />
      <label className="space-y-1.5 text-sm font-semibold">Department<select required value={form.department_id || ""} onChange={(event) => setForm({ ...form, department_id: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="" disabled>Select department</option>{departments.filter((department) => department.status === "active" || department.id === form.department_id).map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code}){department.status === "inactive" ? " · Inactive" : ""}</option>)}</select></label>
      <Input label="Credits" type="number" min={1} max={30} required value={form.credits} onChange={(event) => setForm({ ...form, credits: Number(event.target.value) })} />
      <label className="space-y-1.5 text-sm font-semibold sm:col-span-2">Description <span className="font-normal text-muted">(optional)</span><textarea rows={4} placeholder="Briefly describe the course" value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-control border border-hairline bg-card px-3.5 py-3 text-sm font-normal text-ink outline-none placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-brand-100" /></label>
      {mode === "edit" && <label className="space-y-1.5 text-sm font-semibold">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as "active" | "inactive" })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push("/courses")}>Cancel</Button><Button type="submit" loading={saving}><Save className="size-4" />{mode === "create" ? "Create course" : "Save changes"}</Button></div>
    </form></Card>}
  </>;
}
