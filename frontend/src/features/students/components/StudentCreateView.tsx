"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createStudent, fetchDepartments } from "../api";
import type { DepartmentOption, StudentInput } from "../types";

const initialForm: StudentInput = { name: "", email: "", password: "", student_code: "", department_id: 0, year_level: 1, phone: "", gender: null, status: "active" };

export function StudentCreateView() {
  const router = useRouter();
  const [form, setForm] = useState<StudentInput>(initialForm);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDepartments().then((result) => setDepartments(result.data)).catch(() => setError("Could not load departments. Please refresh and try again."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await createStudent({ ...form, department_id: Number(form.department_id), year_level: Number(form.year_level) });
      router.replace(`/students/${result.data.id}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : "Could not create student.");
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Create student" description="Add a student profile and create their sign-in account." actions={<Button variant="secondary" size="sm" onClick={() => router.push("/students")}><ArrowLeft className="size-4" />Back to students</Button>} />
      <Card className="w-full p-5 sm:p-7">
        <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
          <Input label="Full name" placeholder="e.g. Dara Sok" required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Input label="Email" type="email" placeholder="e.g. dara.sok@example.com" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Input label="Student ID" placeholder="e.g. STU-2026-001" required value={form.student_code} onChange={(event) => setForm({ ...form, student_code: event.target.value })} />
          <Input label="Temporary password" type="password" placeholder="At least 8 characters" minLength={8} required autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <label className="space-y-1.5 text-sm font-semibold">Department<select required value={form.department_id || ""} onChange={(event) => setForm({ ...form, department_id: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="" disabled>Select department</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code})</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-semibold">Year level<select value={form.year_level} onChange={(event) => setForm({ ...form, year_level: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink">{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>Year {index + 1}</option>)}</select></label>
          <Input label="Phone (optional)" type="tel" placeholder="e.g. +855 12 345 678" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <label className="space-y-1.5 text-sm font-semibold">Gender<select required value={form.gender ?? ""} onChange={(event) => setForm({ ...form, gender: event.target.value })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="" disabled>Select gender</option><option value="male">Male</option><option value="female">Female</option></select></label>
          <label className="space-y-1.5 text-sm font-semibold">Account status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push("/students")}>Cancel</Button><Button type="submit" loading={saving}><Plus className="size-4" />Create student</Button></div>
        </form>
      </Card>
    </>
  );
}
