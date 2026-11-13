"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, BookOpen, GraduationCap, Plus, Search, UserRound } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { getStoredUser } from "@/lib/api/session";
import { fetchDepartments, fetchStudents } from "../api";
import type { DepartmentOption, Paginated, Student } from "../types";
import { StudentActionsMenu } from "./StudentActionsMenu";

export function StudentsView({ initialData }: { initialData?: Paginated<Student> | null }) {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>(initialData?.data ?? []);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(initialData?.meta?.last_page ?? 1);
  const [total, setTotal] = useState(initialData?.meta?.total ?? 0);
  const [loading, setLoading] = useState(initialData === undefined || initialData === null);
  const [error, setError] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const initialDataUsed = useRef(initialData !== undefined && initialData !== null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (departmentId) params.set("department_id", departmentId);
    if (status) params.set("status", status);
    if (gender) params.set("gender", gender);
    try {
      const result = await fetchStudents(params);
      setStudents(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load students.");
    } finally {
      setLoading(false);
    }
  }, [departmentId, gender, page, search, status]);

  useEffect(() => {
    if (initialDataUsed.current && page === 1 && !search && !departmentId && !status && !gender) {
      initialDataUsed.current = false;
      return;
    }
    void loadStudents();
  }, [departmentId, gender, loadStudents, page, search, status]);
  useEffect(() => { setCanManage(getStoredUser()?.role === "admin"); }, []);
  useEffect(() => {
    fetchDepartments().then((result) => setDepartments(result.data)).catch(() => setDepartments([]));
  }, []);

  const activeCount = useMemo(() => students.filter((student) => student.user?.status === "active").length, [students]);

  function exportCsv() {
    const rows = [
      ["Student ID", "Name", "Email", "Gender", "Department", "Year", "Status", "Phone"],
      ...students.map((student) => [student.student_code, student.user?.name ?? "", student.user?.email ?? "", student.gender ?? "", student.department?.name ?? "", String(student.year_level), student.user?.status ?? "unknown", student.phone ?? ""]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "students.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader title="Students" description="Manage student records, profiles, departments, and account status."
        actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={exportCsv}><ArrowDownToLine className="size-4" />Export current page</Button><Button size="sm" onClick={() => router.push("/students/create")}><Plus className="size-4" />Create student</Button></div>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-4 p-4"><span className="rounded-panel bg-brand-50 p-3.5 text-brand-600"><GraduationCap className="size-7" /></span><div><p className="text-sm font-medium text-muted">Matching students</p><p className="font-display mt-1 text-3xl leading-none font-bold">{total}</p></div></Card>
        <Card className="flex items-center gap-4 p-4"><span className="rounded-panel bg-success-soft p-3.5 text-success"><UserRound className="size-7" /></span><div><p className="text-sm font-medium text-muted">Active on this page</p><p className="font-display mt-1 text-3xl leading-none font-bold">{activeCount}</p></div></Card>
        <Card className="flex items-center gap-4 p-4"><span className="rounded-panel bg-slate-100 p-3.5 text-slate-600"><BookOpen className="size-7" /></span><div><p className="text-sm font-medium text-muted">Departments</p><p className="font-display mt-1 text-3xl leading-none font-bold">{departments.length}</p></div></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-hairline p-4 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search students" placeholder="Search name, student ID, or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div>
          <select aria-label="Filter by department" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
          <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
          <select aria-label="Filter by gender" value={gender} onChange={(event) => { setGender(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All genders</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select>
        </div>
        {error && <p role="alert" className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}
        {feedback && <p role={feedback.kind === "error" ? "alert" : "status"} className={`mx-4 mt-4 rounded-control px-4 py-3 text-sm font-medium ${feedback.kind === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>{feedback.message}<button type="button" className="ml-3 underline" onClick={() => setFeedback(null)}>Dismiss</button></p>}
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-canvas text-xs font-bold tracking-wide text-muted uppercase"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Student ID</th><th className="px-5 py-3">Gender</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Year</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-hairline">{loading ? <tr><td colSpan={8} className="px-5 py-12 text-center text-muted">Loading students…</td></tr> : students.length === 0 ? <tr><td colSpan={8} className="px-5 py-12 text-center text-muted">No students match these filters.</td></tr> : students.map((student) => <tr key={student.id} className="transition-colors hover:bg-canvas/70"><td className="px-5 py-4"><button type="button" onClick={() => router.push(`/students/${student.id}`)} className="font-semibold text-ink hover:text-brand-600">{student.user?.name ?? "Unnamed student"}</button><p className="mt-0.5 text-xs text-muted">{student.user?.email ?? "No email"}</p></td><td className="px-5 py-4"><span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">{student.student_code}</span></td><td className="px-5 py-4 capitalize">{student.gender?.replaceAll("_", " ") ?? "—"}</td><td className="px-5 py-4">{student.department?.name ?? "—"}</td><td className="px-5 py-4">Year {student.year_level}</td><td className="px-5 py-4"><Badge tone={student.user?.status === "active" ? "success" : student.user?.status === "suspended" ? "danger" : "neutral"}>{student.user?.status ?? "unknown"}</Badge></td><td className="px-5 py-4">{student.phone || "—"}</td><td className="px-5 py-3"><StudentActionsMenu student={student} canManage={canManage} onStudentUpdated={(updated) => setStudents((current) => current.map((item) => item.id === updated.id ? updated : item))} onFeedback={(message, kind) => setFeedback({ message, kind })} /></td></tr>)}</tbody>
        </table></div>
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted"><span>Page {page} of {lastPage}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
      </Card>
    </>
  );
}
