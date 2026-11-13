"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createAcademicYear, fetchAcademicYear, updateAcademicYear } from "../api";
import type { AcademicYearInput } from "../types";

const initial: AcademicYearInput = { name: "", start_date: "", end_date: "", status: "upcoming" };

export function AcademicYearFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<AcademicYearInput>(initial);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit") return;
    if (!Number.isInteger(id) || id < 1) { setError("Academic year was not found."); setLoading(false); return; }
    fetchAcademicYear(id).then(({ data }) => setForm({ name: data.name, start_date: data.start_date, end_date: data.end_date, status: data.status })).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load academic year.")).finally(() => setLoading(false));
  }, [id, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (mode === "create") await createAcademicYear(form);
      else await updateAcademicYear(id, form);
      router.replace("/academic-years");
    } catch (caught) { setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : `Could not ${mode} academic year.`); setSaving(false); }
  }

  return <>
    <PageHeader title={mode === "create" ? "Create academic year" : "Edit academic year"} description="Define the academic year name and date range." actions={<Button variant="secondary" size="sm" onClick={() => router.push("/academic-years")}><ArrowLeft className="size-4" />Back to academic years</Button>} />
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading academic year…</Card> : mode === "edit" && error && !form.name ? <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : <Card className="w-full p-5 sm:p-7"><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <Input label="Academic year name" placeholder="e.g. 2026–2027" required maxLength={30} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <label className="space-y-1.5 text-sm font-semibold">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as AcademicYearInput["status"] })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
      <Input label="Start date" type="date" required value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
      <Input label="End date" type="date" required min={form.start_date || undefined} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push("/academic-years")}>Cancel</Button><Button type="submit" loading={saving}><Save className="size-4" />{mode === "create" ? "Create academic year" : "Save changes"}</Button></div>
    </form></Card>}
  </>;
}
