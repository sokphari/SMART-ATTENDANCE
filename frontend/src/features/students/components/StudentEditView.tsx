"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchDepartments, fetchStudent, updateStudent } from "../api";
import type { DepartmentOption, StudentInput } from "../types";

export function StudentEditView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<StudentInput | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const studentId = Number(id);
    if (!Number.isInteger(studentId) || studentId < 1) { setError("Student was not found."); setLoading(false); return; }
    Promise.all([fetchStudent(studentId), fetchDepartments()]).then(([studentResponse, departmentResponse]) => {
      const student = studentResponse.data;
      setDepartments(departmentResponse.data);
      setForm({ name: student.user?.name ?? "", email: student.user?.email ?? "", student_code: student.student_code, department_id: student.department_id, year_level: student.year_level, phone: student.phone ?? "", gender: student.gender, status: student.user?.status ?? "active", password: "" });
    }).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load student details.")).finally(() => setLoading(false));
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true); setError("");
    const payload = { ...form, department_id: Number(form.department_id), year_level: Number(form.year_level) };
    if (!payload.password) delete payload.password;
    try { await updateStudent(Number(id), payload); router.replace(`/students/${id}`); }
    catch (caught) { setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : "Could not update student."); setSaving(false); }
  }

  return <>
    <PageHeader title="Edit student" description="Update student profile and account details." actions={<Button variant="secondary" size="sm" onClick={() => router.push(`/students/${id}`)}><ArrowLeft className="size-4" />Back to profile</Button>} />
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading student…</Card> : form && <Card className="w-full p-5 sm:p-7"><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Input label="Full name" placeholder="e.g. Dara Sok" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label="Email" type="email" placeholder="e.g. dara.sok@example.com" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Input label="Student ID" placeholder="e.g. STU-2026-001" required value={form.student_code} onChange={(event) => setForm({ ...form, student_code: event.target.value })} />
      <Input label="New password (optional)" type="password" placeholder="Leave blank to keep current password" minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <label className="space-y-1.5 text-sm font-semibold">Department<select required value={form.department_id} onChange={(event) => setForm({ ...form, department_id: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink">{departments.map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code})</option>)}</select></label>
      <label className="space-y-1.5 text-sm font-semibold">Year level<select value={form.year_level} onChange={(event) => setForm({ ...form, year_level: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink">{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Year {index + 1}</option>)}</select></label>
      <Input label="Phone (optional)" type="tel" placeholder="e.g. +855 12 345 678" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <label className="space-y-1.5 text-sm font-semibold">Gender<select value={form.gender ?? ""} onChange={(event) => setForm({ ...form, gender: event.target.value || null })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="">Not specified</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select></label>
      <label className="space-y-1.5 text-sm font-semibold">Account status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select></label>
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push(`/students/${id}`)}>Cancel</Button><Button type="submit" loading={saving}><Save className="size-4" />Save changes</Button></div>
    </form></Card>}
  </>;
}
