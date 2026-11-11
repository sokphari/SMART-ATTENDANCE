"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Plus } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createEnrollment, fetchClassSections, fetchStudent, fetchStudentEnrollments, type ClassSectionOption, type StudentEnrollment } from "../api";
import type { Student } from "../types";

export function StudentEnrollmentsView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [sections, setSections] = useState<ClassSectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    try {
      const [studentResponse, enrollmentResponse, sectionResponse] = await Promise.all([fetchStudent(Number(id)), fetchStudentEnrollments(Number(id)), fetchClassSections()]);
      setStudent(studentResponse.data);
      setEnrollments(enrollmentResponse.data);
      setSections(sectionResponse.data.filter((section) => section.status === "active"));
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Could not load enrollments."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try { await createEnrollment({ student_id: Number(id), class_section_id: Number(sectionId) }); setSectionId(""); setSuccess("Student enrolled successfully."); await load(); }
    catch (caught) { setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : "Could not create enrollment."); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader title="Class enrollment" description={student ? `Manage course enrollments for ${student.user?.name ?? student.student_code}.` : "Manage this student's course enrollments."} actions={<Button variant="secondary" size="sm" onClick={() => router.push(`/students/${id}`)}><ArrowLeft className="size-4" />Back to profile</Button>} />
    {error && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
    {success && <p role="status" className="mb-4 rounded-control bg-success-soft px-4 py-3 text-sm text-success">{success}</p>}
    <Card className="w-full p-5 sm:p-6"><h2 className="font-display text-lg font-bold">Enroll in a class section</h2><p className="mt-1 text-sm text-muted">The server validates availability, capacity, and duplicate enrollments.</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row"><select aria-label="Class section" required value={sectionId} onChange={(event) => setSectionId(event.target.value)} className="h-11 min-w-0 flex-1 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">Select a class section</option>{sections.map((section) => <option key={section.id} value={section.id}>{section.course?.course_code ?? "Course"} · {section.course?.name ?? ""} · {section.section_code}</option>)}</select><Button type="submit" loading={saving} disabled={!sections.length}><Plus className="size-4" />Enroll student</Button></form>
      {!loading && !sections.length && <p className="mt-3 text-xs text-muted">No active class sections are available.</p>}
    </Card>
    <Card className="mt-5 w-full overflow-hidden"><div className="border-b border-hairline p-5"><h2 className="font-display font-bold">Current and past enrollments</h2></div>{loading ? <p className="p-6 text-sm text-muted">Loading enrollments…</p> : enrollments.length === 0 ? <div className="p-8 text-center"><BookOpen className="mx-auto size-6 text-muted" /><p className="mt-2 text-sm text-muted">No enrollments recorded.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-canvas text-xs font-bold uppercase text-muted"><tr><th className="px-5 py-3">Course</th><th className="px-5 py-3">Section</th><th className="px-5 py-3">Semester</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-hairline">{enrollments.map((enrollment) => <tr key={enrollment.id}><td className="px-5 py-4">{enrollment.class_section?.course?.name ?? enrollment.class_section?.course?.course_code ?? "—"}</td><td className="px-5 py-4">{enrollment.class_section?.section_code ?? "—"}</td><td className="px-5 py-4">{enrollment.class_section?.semester?.name ?? "—"}</td><td className="px-5 py-4">{enrollment.enrollment_date}</td><td className="px-5 py-4"><Badge tone={enrollment.status === "enrolled" ? "success" : "neutral"}>{enrollment.status}</Badge></td></tr>)}</tbody></table></div>}</Card>
  </>;
}
