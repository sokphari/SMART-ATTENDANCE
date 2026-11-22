"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createTeacher, fetchTeacher, fetchTeacherDepartments, updateTeacher } from "../api";
import type { DepartmentOption, TeacherInput } from "../types";

const blankForm: TeacherInput = { name: "", email: "", password: "", teacher_code: "", department_id: 0, phone: "", qualifications: "", status: "active" };
const NOTICE_KEY = "sa_teacher_notice";

export function TeacherFormView({ mode }: { mode: "create" | "edit" }) {
  const { t } = useLocale();
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<TeacherInput>(blankForm);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "create") {
      fetchTeacherDepartments().then((result) => setDepartments(result.data)).catch(() => setError("Could not load departments."));
      return;
    }
    if (!Number.isInteger(id) || id < 1) { setError("Teacher was not found."); setLoading(false); return; }
    Promise.all([fetchTeacher(id), fetchTeacherDepartments()]).then(([teacherResponse, departmentResponse]) => {
      const teacher = teacherResponse.data;
      setDepartments(departmentResponse.data);
      setForm({ name: teacher.user?.name ?? "", email: teacher.user?.email ?? "", teacher_code: teacher.teacher_code, department_id: teacher.department_id, phone: teacher.phone ?? "", qualifications: teacher.qualifications ?? "", status: teacher.user?.status ?? "active", password: "" });
    }).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load teacher." )).finally(() => setLoading(false));
  }, [id, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const payload = { ...form, department_id: Number(form.department_id) };
    if (mode === "edit" && !payload.password) delete payload.password;
    try {
      if (mode === "create") await createTeacher(payload);
      else await updateTeacher(id, payload);
      window.sessionStorage.setItem(NOTICE_KEY, mode === "create" ? "Teacher created successfully." : "Teacher updated successfully.");
      router.replace("/teachers");
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : `Could not ${mode} teacher.`);
      setSaving(false);
    }
  }

  const title = mode === "create" ? "Create teacher" : "Edit teacher";
  return <>
    <PageHeader title={title} description={mode === "create" ? "Add a teacher profile and login account." : "Update teacher profile and account information."} actions={<Button variant="secondary" size="sm" onClick={() => router.push("/teachers")}><ArrowLeft className="size-4" />{t("Back to teachers")}</Button>} />
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading teacher…</Card> : <Card className="w-full p-5 sm:p-7"><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Input label={t("Full name")} placeholder={t("e.g. Sok Dara")} required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label={t("Email")} type="email" placeholder={t("e.g. dara.sok@example.com")} required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <Input label={t("Teacher ID")} placeholder={t("e.g. TCH-2026-001")} required value={form.teacher_code} onChange={(event) => setForm({ ...form, teacher_code: event.target.value.toUpperCase() })} />
      <Input label={mode === "create" ? "Temporary password" : "New password (optional)"} type="password" placeholder={mode === "create" ? "At least 8 characters" : "Leave blank to keep current password"} minLength={8} required={mode === "create"} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
      <label className="space-y-1.5 text-sm font-semibold">{t("Department")}<select required value={form.department_id || ""} onChange={(event) => setForm({ ...form, department_id: Number(event.target.value) })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="" disabled>{t("Select department")}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code})</option>)}</select></label>
      <Input label={t("Phone (optional)")} type="tel" placeholder={t("e.g. +855 12 345 678")} autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <label className="space-y-1.5 text-sm font-semibold sm:col-span-2">{t("Qualifications")}<span className="font-normal text-muted">(optional)</span><textarea rows={3} placeholder={t("Degrees, certifications, or teaching credentials")} value={form.qualifications ?? ""} onChange={event => setForm({ ...form, qualifications: event.target.value })} className="w-full rounded-control border border-hairline bg-card px-3.5 py-3 text-sm font-normal text-ink outline-none focus-visible:ring-4 focus-visible:ring-brand-100" /></label>
      {mode === "edit" && <label className="space-y-1.5 text-sm font-semibold">{t("Account status")}<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="active">{t("Active")}</option><option value="inactive">{t("Inactive")}</option><option value="suspended">{t("Suspended")}</option></select></label>}
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push("/teachers")}>{t("Cancel")}</Button><Button type="submit" loading={saving}><Save className="size-4" />{mode === "create" ? "Create teacher" : "Save changes"}</Button></div>
    </form></Card>}
  </>;
}
