"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Plus, Search, UserRound, Users, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchTeacherDepartments, fetchTeachers } from "../api";
import type { DepartmentOption, Teacher } from "../types";
import { TeacherRowActions } from "./TeacherRowActions";

const NOTICE_KEY = "sa_teacher_notice";

export function TeachersView() {
  const router = useRouter();
  const [items, setItems] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (departmentId) params.set("department_id", departmentId);
    if (status) params.set("status", status);
    try {
      const result = await fetchTeachers(params);
      setItems(result.data); setTotal(result.meta?.total ?? result.data.length); setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : "Could not load teachers."); }
    finally { setLoading(false); }
  }, [departmentId, page, search, status]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    fetchTeacherDepartments().then((result) => setDepartments(result.data)).catch(() => setDepartments([]));
    const message = window.sessionStorage.getItem(NOTICE_KEY);
    if (message) { setNotice({ message, kind: "success" }); window.sessionStorage.removeItem(NOTICE_KEY); }
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.kind === "error" ? 7000 : 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeCount = useMemo(() => items.filter((item) => item.user?.status === "active").length, [items]);

  return <>
    <PageHeader title="Teachers" description="Manage teacher profiles, departments, and account status." actions={<Button onClick={() => router.push("/teachers/create")}><Plus className="size-4" />Create teacher</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-brand-50 p-3 text-brand-600"><Users className="size-6" /></span><div><p className="text-sm text-muted">Matching teachers</p><p className="font-display mt-1 text-2xl font-bold">{total}</p></div></Card>
      <Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-success-soft p-3 text-success"><UserRound className="size-6" /></span><div><p className="text-sm text-muted">Active on this page</p><p className="font-display mt-1 text-2xl font-bold">{activeCount}</p></div></Card>
      <Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-slate-100 p-3 text-slate-600"><Users className="size-6" /></span><div><p className="text-sm text-muted">Departments</p><p className="font-display mt-1 text-2xl font-bold">{departments.length}</p></div></Card>
    </div>
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-hairline p-4 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search teachers" placeholder="Search name, teacher ID, or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div>
        <select aria-label="Filter by department" value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All departments</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select>
        <select aria-label="Filter by account status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option></select>
      </div>
      {error && <p role="alert" className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {notice && <div className="pointer-events-none fixed top-20 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] animate-fade-up" role={notice.kind === "error" ? "alert" : "status"} aria-live={notice.kind === "error" ? "assertive" : "polite"} aria-atomic="true"><div className={`pointer-events-auto flex items-start gap-3 rounded-panel border bg-card p-4 shadow-lift ${notice.kind === "success" ? "border-success/30" : "border-danger/30"}`}><span className={notice.kind === "success" ? "mt-0.5 text-success" : "mt-0.5 text-danger"}>{notice.kind === "success" ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}</span><p className="flex-1 text-sm font-semibold text-ink">{notice.message}</p><button type="button" aria-label="Dismiss notification" className="rounded-control p-1 text-muted hover:bg-canvas hover:text-ink" onClick={() => setNotice(null)}><X className="size-4" /></button></div></div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Teacher</th><th className="px-5 py-3">Teacher ID</th><th className="px-5 py-3">Department</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-hairline">{loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">Loading teachers…</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">No teachers match these filters.</td></tr> : items.map((teacher) => <tr key={teacher.id} className="transition-colors hover:bg-canvas/70"><td className="px-5 py-4"><button type="button" onClick={() => router.push(`/teachers/${teacher.id}`)} className="font-semibold hover:text-brand-600">{teacher.user?.name ?? "Unnamed teacher"}</button><p className="mt-0.5 text-xs text-muted">{teacher.user?.email ?? "No email"}</p></td><td className="px-5 py-4"><span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">{teacher.teacher_code}</span></td><td className="px-5 py-4">{teacher.department?.name ?? "—"}</td><td className="px-5 py-4">{teacher.phone || "—"}</td><td className="px-5 py-4"><Badge tone={teacher.user?.status === "active" ? "success" : teacher.user?.status === "suspended" ? "danger" : "neutral"}>{teacher.user?.status ?? "unknown"}</Badge></td><td className="px-5 py-3"><TeacherRowActions teacher={teacher} onEdit={() => router.push(`/teachers/${teacher.id}/edit`)} onUpdated={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))} onFeedback={(message, kind) => setNotice({ message, kind })} /></td></tr>)}</tbody>
      </table></div>
      <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted"><span>Showing {items.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, total)} of {total} teachers</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </Card>
  </>;
}
