"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Building2, CheckCircle2, Plus, Search, X } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchDepartments } from "../api";
import type { Department } from "../types";
import { DepartmentRowActions } from "./DepartmentRowActions";

const DEPARTMENT_NOTICE_KEY = "sa_department_notice";

export function DepartmentsView() {
  const router = useRouter();
  const [items, setItems] = useState<Department[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; kind: "success" | "error" } | null>(null);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    try {
      const result = await fetchDepartments(params);
      setItems(result.data);
      setTotal(result.meta?.total ?? result.data.length);
      setLastPage(result.meta?.last_page ?? 1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load departments.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { void loadDepartments(); }, [loadDepartments]);
  useEffect(() => {
    const notice = window.sessionStorage.getItem(DEPARTMENT_NOTICE_KEY);
    if (notice) {
      setFeedback({ message: notice, kind: "success" });
      window.sessionStorage.removeItem(DEPARTMENT_NOTICE_KEY);
    }
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), feedback.kind === "error" ? 7000 : 4500);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const activeCount = useMemo(() => items.filter((item) => item.status === "active").length, [items]);

  return <>
    <PageHeader title="Departments" description="Manage academic departments and their status." actions={<Button onClick={() => router.push("/departments/create")}><Plus className="size-4" />Create department</Button>} />

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-brand-50 p-3 text-brand-600"><Building2 className="size-6" /></span><div><p className="text-sm text-muted">Matching departments</p><p className="font-display mt-1 text-2xl font-bold">{total}</p></div></Card>
      <Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-success-soft p-3 text-success"><Building2 className="size-6" /></span><div><p className="text-sm text-muted">Active on this page</p><p className="font-display mt-1 text-2xl font-bold">{activeCount}</p></div></Card>
      <Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-slate-100 p-3 text-slate-600"><Building2 className="size-6" /></span><div><p className="text-sm text-muted">Inactive on this page</p><p className="font-display mt-1 text-2xl font-bold">{items.length - activeCount}</p></div></Card>
    </div>

    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-hairline p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search departments" placeholder="Search department name or code" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div>
        <select aria-label="Filter by department status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>
      {error && <p role="alert" className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}
      {feedback && <div className="pointer-events-none fixed top-20 right-4 z-[100] w-[min(24rem,calc(100vw-2rem))] animate-fade-up" role={feedback.kind === "error" ? "alert" : "status"} aria-live={feedback.kind === "error" ? "assertive" : "polite"} aria-atomic="true"><div className={`pointer-events-auto flex items-start gap-3 rounded-panel border bg-card p-4 shadow-lift ${feedback.kind === "success" ? "border-success/30" : "border-danger/30"}`}><span className={feedback.kind === "success" ? "mt-0.5 text-success" : "mt-0.5 text-danger"}>{feedback.kind === "success" ? <CheckCircle2 className="size-5" /> : <AlertCircle className="size-5" />}</span><p className="flex-1 text-sm font-semibold text-ink">{feedback.message}</p><button type="button" aria-label="Dismiss notification" className="rounded-control p-1 text-muted hover:bg-canvas hover:text-ink" onClick={() => setFeedback(null)}><X className="size-4" /></button></div></div>}
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Department</th><th className="px-5 py-3">Code</th><th className="px-5 py-3">Description</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
        <tbody className="divide-y divide-hairline">{loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">Loading departments…</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">No departments match these filters.</td></tr> : items.map((department) => <tr key={department.id} className="transition-colors hover:bg-canvas/70"><td className="px-5 py-4"><button type="button" onClick={() => router.push(`/departments/${department.id}/edit`)} className="font-semibold text-ink hover:text-brand-600">{department.name}</button></td><td className="px-5 py-4"><span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-bold text-brand-700">{department.code}</span></td><td className="max-w-sm px-5 py-4 text-muted">{department.description || "—"}</td><td className="px-5 py-4"><Badge tone={department.status === "active" ? "success" : "neutral"}>{department.status}</Badge></td><td className="px-5 py-4 text-muted">{new Date(department.created_at).toLocaleDateString()}</td><td className="px-5 py-3"><DepartmentRowActions department={department} onUpdated={(updated) => setItems((current) => current.map((item) => item.id === updated.id ? updated : item))} onFeedback={(message, kind) => setFeedback({ message, kind })} onEdit={() => router.push(`/departments/${department.id}/edit`)} /></td></tr>)}</tbody>
      </table></div>
      <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted"><span>Showing {items.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, total)} of {total} departments</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </Card>
  </>;
}
