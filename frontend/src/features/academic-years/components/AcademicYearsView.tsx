"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, Plus, Search } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchAcademicYears } from "../api";
import type { AcademicYear } from "../types";

export function AcademicYearsView() {
  const router = useRouter();
  const [items, setItems] = useState<AcademicYear[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    try { const result = await fetchAcademicYears(params); setItems(result.data); setTotal(result.meta?.total ?? result.data.length); setLastPage(result.meta?.last_page ?? 1); }
    catch (caught) { setError(caught instanceof ApiError ? caught.message : "Could not load academic years."); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { void load(); }, [load]);
  const activeCount = useMemo(() => items.filter((item) => item.status === "active").length, [items]);

  return <>
    <PageHeader title="Academic Years" description="Set academic year date ranges and lifecycle status." actions={<Button onClick={() => router.push("/academic-years/create")}><Plus className="size-4" />Create academic year</Button>} />
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-brand-50 p-3 text-brand-600"><CalendarRange className="size-6" /></span><div><p className="text-sm text-muted">Matching years</p><p className="font-display mt-1 text-2xl font-bold">{total}</p></div></Card><Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-success-soft p-3 text-success"><CalendarRange className="size-6" /></span><div><p className="text-sm text-muted">Active on this page</p><p className="font-display mt-1 text-2xl font-bold">{activeCount}</p></div></Card><Card className="flex min-h-28 items-center gap-4 p-5"><span className="rounded-panel bg-slate-100 p-3 text-slate-600"><CalendarRange className="size-6" /></span><div><p className="text-sm text-muted">Semesters in view</p><p className="font-display mt-1 text-2xl font-bold">{items.reduce((sum, year) => sum + (year.semesters_count ?? 0), 0)}</p></div></Card></div>
    <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-hairline p-4 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" /><Input aria-label="Search academic years" placeholder="Search academic year" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="pl-9" /></div><select aria-label="Filter academic year status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm text-ink"><option value="">All statuses</option><option value="upcoming">Upcoming</option><option value="active">Active</option><option value="completed">Completed</option></select></div>
      {error && <p role="alert" className="m-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-canvas text-xs font-bold uppercase tracking-wide text-muted"><tr><th className="px-5 py-3">Academic year</th><th className="px-5 py-3">Start date</th><th className="px-5 py-3">End date</th><th className="px-5 py-3">Semesters</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-hairline">{loading ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">Loading academic years…</td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted">No academic years found.</td></tr> : items.map((year) => <tr key={year.id} className="hover:bg-canvas/70"><td className="px-5 py-4 font-semibold">{year.name}</td><td className="px-5 py-4">{year.start_date}</td><td className="px-5 py-4">{year.end_date}</td><td className="px-5 py-4">{year.semesters_count ?? 0}</td><td className="px-5 py-4"><Badge tone={year.status === "active" ? "success" : year.status === "completed" ? "neutral" : "brand"}>{year.status}</Badge></td><td className="px-5 py-3 text-right"><Button variant="secondary" size="sm" onClick={() => router.push(`/academic-years/${year.id}/edit`)}>Edit</Button></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-hairline px-4 py-3 text-sm text-muted"><span>Showing {items.length ? (page - 1) * 10 + 1 : 0}–{Math.min(page * 10, total)} of {total} academic years</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </Card>
  </>;
}
