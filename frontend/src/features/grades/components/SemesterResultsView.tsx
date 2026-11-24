"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLocale } from "@/i18n/LocaleProvider";
import { selectGlobalSemester } from "@/features/schedules/api";
import { getGradeSections, getGradePolicy, saveGradePolicy, getSemesterResults, publishResults, downloadResultsPdf, type GradeSection, type GradePolicy } from "../api";

type ResultsPayload = Awaited<ReturnType<typeof getSemesterResults>>["data"];

export function SemesterResultsView({ student = false }: { student?: boolean }) {
  const { t } = useLocale();
  const [sections, setSections] = useState<GradeSection[]>([]);
  const [data, setData] = useState<ResultsPayload>({ sections: [], students: [] });
  const [sectionId, setSectionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [policy, setPolicy] = useState<GradePolicy | null>(null);
  const [policySaving, setPolicySaving] = useState(false);
  const semesters = useMemo(() => [...new Map(sections.map(s => [s.semester.id, s.semester])).values()], [sections]);
  const departments = useMemo(() => [...new Map(sections.map(s => [s.department_id, { id: s.department_id, name: s.course.department ?? "—" }])).values()], [sections]);
  const load = useCallback(async () => {
    setLoading(true); setMessage("");
    try {
      if (!student) { const response = await getGradeSections(); setSections(response.data); }
      const result = await getSemesterResults({semester_id: semesterId ? Number(semesterId) : undefined, department_id: departmentId ? Number(departmentId) : undefined, class_section_id: sectionId ? Number(sectionId) : undefined, search: search || undefined}, student);
      setData(result.data);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to load semester results."); }
    finally { setLoading(false); }
  }, [departmentId, search, sectionId, semesterId, student]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (student) return;
    const syncSemester = (event: Event) => {
      const detail = (event as CustomEvent<{ semesterId?: number | null }>).detail;
      if (!detail || !Object.prototype.hasOwnProperty.call(detail, "semesterId")) return;
      setSemesterId(detail.semesterId ? String(detail.semesterId) : "");
      setSectionId("");
    };
    window.addEventListener("sa-semester-change", syncSemester);
    return () => window.removeEventListener("sa-semester-change", syncSemester);
  }, [student]);
  useEffect(() => { if (!student && semesterId) void getGradePolicy(Number(semesterId)).then(r=>setPolicy(r.data)).catch(e=>setMessage(e instanceof Error?e.message:"Unable to load grade policy.")); else setPolicy(null); }, [semesterId, student]);
  const mutate = async (id: number, action: "approve" | "publish") => { setMessage(""); try { await publishResults(id, action); setMessage(action === "approve" ? "Results approved and locked." : "Results published to enrolled students."); await load(); } catch (e) { setMessage(e instanceof Error ? e.message : "The result action failed."); } };
  const savePolicy = async () => { if (!semesterId||!policy)return; setPolicySaving(true);setMessage("");try{const response=await saveGradePolicy(Number(semesterId),policy);setPolicy(response.data);setMessage("Semester grading policy saved.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to save policy.");}finally{setPolicySaving(false);} };
  const exportPdf = async (id: number, draft: boolean, studentId?: number) => { try { await downloadResultsPdf(id, draft, student, studentId); } catch (e) { setMessage(e instanceof Error ? e.message : "PDF export failed."); } };
  const sectionById = new Map(sections.map(s => [s.id, s]));

  return <div className="space-y-5"><PageHeader title="Semester Results" description={student ? "Your published subject grades and semester average." : "Review, approve, publish, and export semester results."}/>
    {!student && <Card className="flex flex-wrap gap-3 p-4"><select aria-label={t("Department")} className="h-10 rounded-control border border-hairline bg-card px-3" value={departmentId} onChange={e=>{setDepartmentId(e.target.value);setSectionId("");}}><option value="">{t("All departments")}</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select><select aria-label="Semester" className="h-10 rounded-control border border-hairline bg-card px-3" value={semesterId} onChange={e=>{setSemesterId(e.target.value);selectGlobalSemester(e.target.value?Number(e.target.value):null);setSectionId("");}}><option value="">All semesters</option>{semesters.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select aria-label="Class section" className="h-10 min-w-56 rounded-control border border-hairline bg-card px-3" value={sectionId} onChange={e=>setSectionId(e.target.value)}><option value="">All sections</option>{sections.filter(s=>(!semesterId||s.semester.id===Number(semesterId))&&(!departmentId||s.department_id===Number(departmentId))).map(s=><option key={s.id} value={s.id}>{s.course.course_code} · {s.section_code}</option>)}</select><div className="flex min-w-56 flex-1 items-center gap-2 rounded-control border border-hairline px-3"><Search size={16}/><input className="h-10 min-w-0 flex-1 bg-transparent outline-none" placeholder={t("Search students")} value={search} onChange={e=>setSearch(e.target.value)}/></div></Card>}
    {!student && policy && semesterId && <details className="rounded-card border border-hairline bg-card p-4"><summary className="cursor-pointer font-semibold">{t("Grading policy")}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(["attendance_points","activities_points","midterm_points","final_points","pass_threshold","late_credit","permission_credit","absent_credit","max_subject_offerings","weekly_contact_hours"] as const).map(key=><label key={key} className="text-xs font-semibold capitalize text-muted">{t(key.replaceAll("_"," "))}<input type="number" min="0" step={key.includes("credit")||key.includes("hours")||key.includes("threshold")?"0.1":"1"} className="mt-1 h-10 w-full rounded-control border border-hairline bg-canvas px-3 text-sm text-ink" value={policy[key]} onChange={e=>setPolicy({...policy,[key]:Number(e.target.value)})}/></label>)}<label className="text-xs font-semibold text-muted">{t("Missing attendance")}<select className="mt-1 h-10 w-full rounded-control border border-hairline bg-canvas px-3 text-sm text-ink" value={policy.missing_attendance_policy} onChange={e=>setPolicy({...policy,missing_attendance_policy:e.target.value as GradePolicy["missing_attendance_policy"]})}><option value="exclude">{t("Exclude unrecorded session")}</option><option value="zero">{t("Count as zero")}</option></select></label><label className="flex items-center gap-2 pt-5 text-sm"><input type="checkbox" checked={policy.require_all_subjects_pass} onChange={e=>setPolicy({...policy,require_all_subjects_pass:e.target.checked})}/>{t("Require every subject to pass")}</label><div className="sm:col-span-2 lg:col-span-4"><Button loading={policySaving} onClick={()=>void savePolicy()}>{t("Save policy")}</Button><span className="ml-3 text-xs text-muted">{t("Component points must total 100.")}</span></div></div></details>}
    {message && <p role="status" className="rounded-control bg-canvas p-3 text-sm text-muted">{message}</p>}
    {!student && <div className="space-y-2">{data.sections.map(({class_section:section}) => <Card key={section.id} className="group relative flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-brand-500/40 hover:bg-subtle/50">
      <Link
        href={`/class-sections/${section.id}`}
        aria-label={`${t("View class")} ${section.course_code} · ${section.section}`}
        title={t("View class")}
        className="absolute inset-0 z-0 rounded-card outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset"
      />
      <div><strong>{section.course_code} · {section.section}</strong><p className="text-xs text-muted">{section.course} · {section.department ?? "—"} · {section.semester}</p><span className="sr-only">{t("View class roster")}</span></div>
      <div className="relative z-10 flex flex-wrap items-center gap-2"><Badge tone={section.publication_status === "published" ? "success" : section.publication_status === "approved" ? "brand" : "warning"}>{t(section.publication_status)}</Badge><Button size="sm" variant="secondary" onClick={() => void exportPdf(section.id, section.publication_status !== "published")}><Download size={14}/>{section.publication_status === "published" ? t("PDF") : t("Draft PDF")}</Button>{section.publication_status === "draft" && <Button size="sm" onClick={() => void mutate(section.id, "approve")}><ShieldCheck size={14}/>{t("Approve")}</Button>}{section.publication_status === "approved" && <Button size="sm" onClick={() => void mutate(section.id, "publish")}>{t("Publish")}</Button>}</div>
    </Card>)}</div>}
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-subtle text-xs uppercase text-muted"><tr>{["Student", "Subject", "Attendance", "Activities", "Midterm", "Final", "Total", "Result", "Actions"].map((heading) => <th key={heading} className="px-4 py-3">{t(heading)}</th>)}</tr></thead>
          <tbody className="divide-y divide-hairline">
            {loading ? <tr><td colSpan={9} className="p-8 text-center text-muted">{t("Loading results…")}</td></tr> : data.students.length === 0 ? <tr><td colSpan={9} className="p-8 text-center text-muted">{t("No published or matching semester results.")}</td></tr> : data.students.flatMap((row) => row.subjects.map((subject, index) => {
              const item = subject as { class_section_id: number; course: string; attendance: number | null; activities_score: number | null; midterm_score: number | null; final_score: number | null; total: number | null; status: string; publication_status: string };
              const meta = sectionById.get(item.class_section_id);
              return <tr key={`${row.student.id}-${item.class_section_id}`} className={row.status === "fail" ? "text-danger" : undefined}>
                <td className="px-4 py-3">{index === 0 && <><strong className={row.status === "fail" ? "line-through" : ""}>{row.student.name}</strong><div className="text-xs text-muted">{row.student.student_code} · {t("Semester average")}: {row.average ?? "—"} <Badge tone={row.status === "pass" ? "success" : row.status === "fail" ? "danger" : "warning"}>{t(row.status.toUpperCase())}</Badge></div></>}</td>
                <td className="px-4 py-3">{item.course}</td><td className="px-4 py-3">{item.attendance ?? "—"}</td><td className="px-4 py-3">{item.activities_score ?? "—"}</td><td className="px-4 py-3">{item.midterm_score ?? "—"}</td><td className="px-4 py-3">{item.final_score ?? "—"}</td>
                <td className={`px-4 py-3 font-bold ${item.status === "fail" ? "text-danger" : ""}`}>{item.total ?? "—"}</td>
                <td className="px-4 py-3"><Badge tone={item.status === "pass" ? "success" : item.status === "fail" ? "danger" : "warning"}>{t(item.status.toUpperCase())}</Badge></td>
                <td className="px-4 py-3">{student ? <Button size="sm" variant="secondary" disabled={item.publication_status !== "published"} onClick={() => void exportPdf(item.class_section_id, false)}><Download size={14}/>{t("PDF")}</Button> : meta && <Button size="sm" variant="secondary" onClick={() => void exportPdf(item.class_section_id, item.publication_status !== "published", row.student.id)}><Download size={14}/>{t("Student PDF")}</Button>}</td>
              </tr>;
            }))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>;
}
