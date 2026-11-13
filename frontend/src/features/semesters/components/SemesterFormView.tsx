"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { createSemester, fetchAcademicYearOptions, fetchSemester, updateSemester } from "../api";
import type { AcademicYearOption, SemesterInput } from "../types";

const initial: SemesterInput = { academic_year_id: 0, name: "", start_date: "", end_date: "", status: "upcoming" };

export function SemesterFormView({ mode }: { mode: "create" | "edit" }) {
  const params = useParams<{ id?: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<SemesterInput>(initial);
  const [years, setYears] = useState<AcademicYearOption[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode === "create") {
      fetchAcademicYearOptions().then((result) => setYears(result.data)).catch(() => setError("Could not load academic years."));
      return;
    }
    if (!Number.isInteger(id) || id < 1) { setError("Semester was not found."); setLoading(false); return; }
    Promise.all([fetchSemester(id), fetchAcademicYearOptions()]).then(([semesterResult, yearResult]) => {
      const semester = semesterResult.data;
      setYears(yearResult.data);
      setForm({ academic_year_id: semester.academic_year_id, name: semester.name, start_date: semester.start_date, end_date: semester.end_date, status: semester.status });
    }).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load semester.")).finally(() => setLoading(false));
  }, [id, mode]);

  const selectedYear = useMemo(() => years.find((year) => year.id === Number(form.academic_year_id)), [form.academic_year_id, years]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const payload = { ...form, academic_year_id: Number(form.academic_year_id) };
      if (mode === "create") await createSemester(payload);
      else await updateSemester(id, payload);
      router.replace("/semesters");
    } catch (caught) { setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : `Could not ${mode} semester.`); setSaving(false); }
  }

  return <>
    <PageHeader title={mode === "create" ? "Create semester" : "Edit semester"} description="Choose an academic year and set dates within its range." actions={<Button variant="secondary" size="sm" onClick={() => router.push("/semesters")}><ArrowLeft className="size-4" />Back to semesters</Button>} />
    {loading ? <Card className="w-full p-8 text-sm text-muted">Loading semester…</Card> : mode === "edit" && error && !form.name ? <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : <Card className="w-full p-5 sm:p-7"><form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      <label className="space-y-1.5 text-sm font-semibold sm:col-span-2">Academic year<select required value={form.academic_year_id || ""} onChange={(event) => setForm({ ...form, academic_year_id: Number(event.target.value), start_date: "", end_date: "" })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="" disabled>Select academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name} · {year.start_date} to {year.end_date}</option>)}</select></label>
      <Input label="Semester name" placeholder="e.g. Fall Semester" required maxLength={50} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <label className="space-y-1.5 text-sm font-semibold">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as SemesterInput["status"] })} className="h-11 w-full rounded-control border border-hairline bg-card px-3.5 text-sm font-normal text-ink"><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
      <Input label="Start date" type="date" required min={selectedYear?.start_date} max={selectedYear?.end_date} value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} />
      <Input label="End date" type="date" required min={form.start_date || selectedYear?.start_date} max={selectedYear?.end_date} value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} />
      {selectedYear && <p className="text-xs text-muted sm:col-span-2">Semester dates must fall between {selectedYear.start_date} and {selectedYear.end_date}; the server validates this range.</p>}
      {error && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-sm text-danger sm:col-span-2">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-hairline pt-4 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => router.push("/semesters")}>Cancel</Button><Button type="submit" loading={saving} disabled={!years.length}><Save className="size-4" />{mode === "create" ? "Create semester" : "Save changes"}</Button></div>
    </form></Card>}
  </>;
}
