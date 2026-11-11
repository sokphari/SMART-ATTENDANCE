"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createDepartment, fetchDepartment, updateDepartment } from "../api";
import type { DepartmentInput } from "../types";

const blankDepartment: DepartmentInput = { name: "", code: "", description: "", status: "active" };
const DEPARTMENT_NOTICE_KEY = "sa_department_notice";

export function DepartmentFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<DepartmentInput>(blankDepartment);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit") return;
    if (!Number.isInteger(id) || id < 1) { setError("Department was not found."); setLoading(false); return; }
    fetchDepartment(id).then(({ data }) => setForm({ name: data.name, code: data.code, description: data.description ?? "", status: data.status })).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load department.")).finally(() => setLoading(false));
  }, [id, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (mode === "create") {
        await createDepartment(form);
        window.sessionStorage.setItem(DEPARTMENT_NOTICE_KEY, "Department created successfully.");
      } else {
        await updateDepartment(id, form);
        window.sessionStorage.setItem(DEPARTMENT_NOTICE_KEY, "Department updated successfully.");
      }
      router.replace("/departments");
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : `Could not ${mode} department.`);
      setSaving(false);
    }
  }

  const title = mode === "create" ? "Create department" : "Edit department";
  return <>
    <PageHeader title={title} description={mode === "create" ? "Add an academic department to the university." : "Update department details and status."} actions={<Button variant="secondary" size="sm" onClick={() => router.push("/departments")}><ArrowLeft className="size-4" />Back to departments</Button>} />
    {!loading && error && mode === "edit" && !form.name && !form.code && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading department…</Card> : mode === "edit" && error && !form.name && !form.code ? null : <Card className="w-full p-5 sm:p-7"><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Input label="Department name" placeholder="e.g. Computer Science" required maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <Input label="Department code" placeholder="e.g. CS" required maxLength={30} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} />
      <label className="space-y-1.5 text-sm font-semibold sm:col-span-2">Description <span className="font-normal text-muted">(optional)</span><textarea rows={4} placeholder="Briefly describe this department" value={form.description ?? ""} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-control border border-hairline bg-card px-3.5 py-3 text-sm font-normal text-ink outline-none placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-brand-100" /></label>
      {mode === "edit" && <label className="space-y-1.5 text-sm font-semibold">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as "active" | "inactive" })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push("/departments")}>Cancel</Button><Button type="submit" loading={saving}><Save className="size-4" />{mode === "create" ? "Create department" : "Save changes"}</Button></div>
    </form></Card>}
  </>;
}
