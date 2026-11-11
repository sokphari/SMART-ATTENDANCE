"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, GraduationCap, ShieldCheck, UserRound, UserRoundX } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchStudent, fetchStudentAttendance, updateStudent } from "../api";
import type { Student } from "../types";
import type { StudentAttendance } from "../api";

type ProfileTab = "Personal Info" | "Academic" | "Attendance" | "Account";
const profileTabs: { name: ProfileTab; icon: typeof UserRound }[] = [
  { name: "Personal Info", icon: UserRound },
  { name: "Academic", icon: GraduationCap },
  { name: "Attendance", icon: CalendarDays },
  { name: "Account", icon: ShieldCheck },
];

export function StudentProfileView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("Personal Info");
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");

  useEffect(() => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id < 1) {
      setError("Student was not found.");
      setLoading(false);
      return;
    }
    fetchStudent(id).then((result) => setStudent(result.data)).catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load student profile.")).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "attendance") setActiveTab("Attendance");
    if (requestedTab === "account") setActiveTab("Account");
  }, []);

  useEffect(() => {
    if (activeTab !== "Attendance" || !student) return;
    setAttendanceLoading(true);
    setAttendanceError("");
    fetchStudentAttendance(student.id).then((result) => setAttendance(result.data)).catch((caught) => setAttendanceError(caught instanceof ApiError ? caught.message : "Could not load attendance history.")).finally(() => setAttendanceLoading(false));
  }, [activeTab, student]);

  async function toggleStatus() {
    if (!student) return;
    setBusy(true);
    setError("");
    try {
      const result = await updateStudent(student.id, { status: student.user?.status === "active" ? "inactive" : "active" });
      setStudent(result.data);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update student status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Student profile" description="Manage student information, academics, attendance, and account access." actions={<Button variant="secondary" size="sm" onClick={() => router.push("/students")}><ArrowLeft className="size-4" />Back to students</Button>} />
      {error && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {loading ? <Card className="w-full p-8 text-sm text-muted">Loading student profile…</Card> : student && <Card className="w-full p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-50 text-brand-600"><UserRound className="size-7" /></span>
            <div><h2 className="font-display text-xl font-bold">{student.user?.name ?? "Student"}</h2><p className="mt-1 text-sm text-muted">{student.student_code} · {student.department?.name ?? "Department not assigned"}</p><div className="mt-2"><Badge tone={student.user?.status === "active" ? "success" : "neutral"}>{student.user?.status ?? "unknown"}</Badge></div></div>
          </div>
          {activeTab === "Account" && <Button variant="secondary" size="sm" onClick={() => void toggleStatus()} loading={busy}><UserRoundX className="size-4" />{student.user?.status === "active" ? "Deactivate account" : "Activate account"}</Button>}
        </div>

        <div className="mt-6 flex gap-2 overflow-x-auto border-b border-hairline pb-3" role="tablist" aria-label="Student profile sections">
          {profileTabs.map(({ name, icon: Icon }) => <button key={name} type="button" role="tab" aria-selected={activeTab === name} onClick={() => setActiveTab(name)} className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-pill border px-4 py-2 text-sm font-semibold transition-colors ${activeTab === name ? "border-brand-600 bg-brand-600 text-white" : "border-hairline bg-card text-muted hover:bg-canvas hover:text-ink"}`}><Icon className="size-4" />{name}</button>)}
        </div>

        <div className="pt-5" role="tabpanel">
          {activeTab === "Personal Info" && <dl className="divide-y divide-hairline">{[["Student ID", student.student_code], ["Full name", student.user?.name ?? "—"], ["Email", student.user?.email ?? "—"], ["Phone", student.phone || "—"], ["Gender", student.gender?.replaceAll("_", " ") ?? "Not specified"]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0"><dt className="text-sm text-muted">{label}</dt><dd className="break-all text-right text-sm font-semibold capitalize">{value}</dd></div>)}</dl>}
          {activeTab === "Academic" && <dl className="divide-y divide-hairline">{[["Department", student.department?.name ?? "Not assigned"], ["Department code", student.department?.code ?? "—"], ["Year level", `Year ${student.year_level}`], ["Class section", "Not assigned"], ["Enrollment", "No enrollment data yet"]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0"><dt className="text-sm text-muted">{label}</dt><dd className="text-right text-sm font-semibold">{value}</dd></div>)}</dl>}
          {activeTab === "Attendance" && <div>{attendanceError && <p role="alert" className="mb-3 rounded-control bg-danger-soft px-3 py-2 text-sm text-danger">{attendanceError}</p>}{attendanceLoading ? <p className="py-8 text-center text-sm text-muted">Loading attendance history…</p> : attendance.length === 0 ? <div className="rounded-control bg-canvas px-4 py-8 text-center"><CalendarDays className="mx-auto size-7 text-muted" /><p className="mt-3 text-sm font-semibold">No attendance records found</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-canvas text-xs font-bold uppercase text-muted"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Course</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Check-in</th></tr></thead><tbody className="divide-y divide-hairline">{attendance.map((record) => <tr key={record.id}><td className="px-4 py-3">{record.session?.session_date ?? "—"}</td><td className="px-4 py-3">{record.session?.class_section?.course?.name ?? record.session?.class_section?.course?.course_code ?? "—"}</td><td className="px-4 py-3">{record.session?.class_section?.section_code ?? "—"}</td><td className="px-4 py-3"><Badge tone={record.status === "present" ? "success" : record.status === "absent" ? "danger" : "neutral"}>{record.status}</Badge></td><td className="px-4 py-3">{record.checked_in_at ? new Date(record.checked_in_at).toLocaleTimeString() : "—"}</td></tr>)}</tbody></table></div>}</div>}
          {activeTab === "Account" && <dl className="divide-y divide-hairline">{[["Account email", student.user?.email ?? "—"], ["Account status", student.user?.status ?? "unknown"], ["Profile created", new Date(student.created_at).toLocaleString()], ["Last updated", new Date(student.updated_at).toLocaleString()]].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0"><dt className="text-sm text-muted">{label}</dt><dd className="break-all text-right text-sm font-semibold">{value}</dd></div>)}</dl>}
        </div>
      </Card>}
    </>
  );
}
