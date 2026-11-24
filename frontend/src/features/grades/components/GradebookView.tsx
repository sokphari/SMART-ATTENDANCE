"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/api/client";
import { useLocale } from "@/i18n/LocaleProvider";
import { SELECTED_SEMESTER_KEY } from "@/features/schedules/api";
import { getGradebook, getGradeSections, saveGrade, type GradeRow, type GradeSection } from "../api";

type Draft = { activities: string; midterm: string; final: string };

export function GradebookView({ teacher = false }: { teacher?: boolean }) {
  const { t } = useLocale();
  const [sections, setSections] = useState<GradeSection[]>([]);
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [semesterId, setSemesterId] = useState("");
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const setGradeRows = (data: GradeRow[]) => {
    setRows(data);
    setDrafts(Object.fromEntries(data.map((row) => [row.student.id, {
      activities: row.activities_score?.toString() ?? "",
      midterm: row.midterm_score?.toString() ?? "",
      final: row.final_score?.toString() ?? "",
    }])));
  };

  const load = useCallback(async () => {
    if (!teacher && !semesterId) {
      setSections([]);
      setSectionId(null);
      setGradeRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getGradeSections(teacher, !teacher ? Number(semesterId) : undefined);
      setSections(response.data);
      const id = (sectionId && response.data.some((section) => section.id === sectionId) ? sectionId : null)
        ?? response.data[0]?.id
        ?? null;
      setSectionId(id);
      if (id) setGradeRows((await getGradebook(id, teacher)).data);
      else setGradeRows([]);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("Unable to load grades."));
    } finally {
      setLoading(false);
    }
  }, [sectionId, semesterId, teacher, t]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (teacher) return;
    const stored = window.localStorage.getItem(SELECTED_SEMESTER_KEY) ?? "";
    setSemesterId(stored);
    const syncSemester = (event: Event) => {
      const detail = (event as CustomEvent<{ semesterId?: number | null }>).detail;
      if (!detail || !Object.prototype.hasOwnProperty.call(detail, "semesterId")) return;
      setSemesterId(detail.semesterId ? String(detail.semesterId) : "");
      setSectionId(null);
    };
    window.addEventListener("sa-semester-change", syncSemester);
    return () => window.removeEventListener("sa-semester-change", syncSemester);
  }, [teacher]);

  const chooseSection = async (id: number) => {
    setSectionId(id);
    setRows([]);
    setLoading(true);
    setError("");
    try { setGradeRows((await getGradebook(id, teacher)).data); }
    catch (caught) { setError(caught instanceof Error ? caught.message : t("Unable to load grades.")); }
    finally { setLoading(false); }
  };

  const save = async (row: GradeRow, finalize = false) => {
    if (!sectionId) return;
    const draft = drafts[row.student.id];
    const score = (value: string) => value.trim() === "" ? null : Number(value);
    setBusy(row.student.id);
    setError("");
    setNotice("");
    try {
      await saveGrade(sectionId, row.student.id, {
        activities_score: score(draft?.activities ?? ""),
        midterm_score: score(draft?.midterm ?? ""),
        final_score: score(draft?.final ?? ""),
        ...(finalize ? { finalize: true } : {}),
      }, teacher);
      setNotice(`${row.student.name}: ${t("grade saved")}.`);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat().join(" ") || caught.message : caught instanceof Error ? caught.message : t("Unable to save grades."));
    } finally { setBusy(null); }
  };

  const selected = sections.find((section) => section.id === sectionId);
  const limits = selected?.policy;
  const inputs: Array<{ key: keyof Draft; label: string; max: number }> = [
    { key: "activities", label: t("Activities"), max: limits?.activities_points ?? 10 },
    { key: "midterm", label: t("Midterm"), max: limits?.midterm_points ?? 30 },
    { key: "final", label: t("Final"), max: limits?.final_points ?? 50 },
  ];

  return <div className="space-y-5">
    <PageHeader title="Gradebook" description="Enter assessments for assigned course sections. Attendance marks use closed attendance sessions only." actions={<Button variant="secondary" onClick={() => void load()}><RefreshCw size={16}/>{t("Refresh")}</Button>} />
    <Card className="p-4">
      <label htmlFor="grade-section" className="mb-2 block text-sm font-semibold">{t("Course section")}</label>
      <select id="grade-section" className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-ink sm:max-w-xl" value={sectionId ?? ""} onChange={(event) => void chooseSection(Number(event.target.value))}>
        <option value="">{t("Select a section")}</option>
        {sections.map((section) => <option key={section.id} value={section.id}>{section.course.course_code} · {section.course.name} · {section.section_code} · {section.semester.name}</option>)}
      </select>
      {selected && <p className="mt-2 text-xs text-muted">{t("Weekly timetable")}: {selected.scheduled_weekly_hours ?? 0} / {selected.weekly_contact_hours ?? 2} {t("contact hours")}</p>}
    </Card>
    {error && <p role="alert" className="flex items-center gap-2 rounded-control border border-danger/30 bg-danger-soft p-3 text-sm text-danger"><AlertCircle size={16}/>{error}</p>}
    {notice && <p role="status" className="rounded-control bg-success-soft p-3 text-sm text-success">{notice}</p>}
    <Card className="overflow-hidden"><div className="overflow-x-auto">
      <table className="w-full min-w-[950px] text-left text-sm">
        <thead className="bg-subtle text-xs uppercase text-muted"><tr>
          <th className="px-4 py-3">{t("Student")}</th>
          <th className="px-4 py-3">{t("Attendance")} / {limits?.attendance_points ?? 10}</th>
          {inputs.map((input) => <th key={input.key} className="px-4 py-3">{input.label} / {input.max}</th>)}
          <th className="px-4 py-3">{t("Total")} / 100</th><th className="px-4 py-3">{t("Status")}</th><th className="px-4 py-3">{t("Actions")}</th>
        </tr></thead>
        <tbody className="divide-y divide-hairline">
          {loading ? <tr><td className="p-8 text-center text-muted" colSpan={7}>{t("Loading gradebook…")}</td></tr> : rows.length === 0 ? <tr><td className="p-8 text-center text-muted" colSpan={7}>{t("No currently enrolled students in this section.")}</td></tr> : rows.map((row) => <tr key={row.student.id}>
            <td className="px-4 py-3"><strong>{row.student.name}</strong><div className="text-xs text-muted">{row.student.student_code}</div></td>
            <td className="px-4 py-3">{row.attendance.score === null ? <span className="text-warning">{t("Pending attendance")}</span> : `${row.attendance.score} / ${row.attendance.points_possible}`}<div className="text-xs text-muted">{row.attendance.finalized_sessions} {t("finalized sessions")}</div></td>
            {inputs.map((input) => <td className="px-4 py-3" key={input.key}><input aria-label={`${row.student.name} ${input.label} ${t("score")}`} type="number" min="0" max={input.max} step="0.25" className="h-9 w-24 rounded-control border border-hairline bg-canvas px-2" value={drafts[row.student.id]?.[input.key] ?? ""} onChange={(event) => setDrafts((old) => ({ ...old, [row.student.id]: { ...old[row.student.id], [input.key]: event.target.value } }))} /></td>)}
            <td className="px-4 py-3 font-bold">{row.total ?? "—"}</td><td className="px-4 py-3"><Badge tone={row.status === "pass" ? "success" : row.status === "fail" ? "danger" : "warning"}>{t(row.status.toUpperCase())}</Badge></td>
            <td className="px-4 py-3"><div className="flex gap-2"><Button size="sm" variant="secondary" loading={busy === row.student.id} onClick={() => void save(row)}>{t("Save")}</Button><Button size="sm" loading={busy === row.student.id} disabled={row.attendance.score === null} onClick={() => void save(row, true)}><Check size={14}/>{t("Finalize")}</Button></div></td>
          </tr>)}
        </tbody>
      </table>
    </div></Card>
  </div>;
}
