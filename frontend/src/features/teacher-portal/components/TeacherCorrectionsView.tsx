"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, FilePenLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/status";
import { getTeacherCorrections } from "../api";
import type { TeacherCorrection } from "../types";

export function TeacherCorrectionsView() {
  const [items, setItems] = useState<TeacherCorrection[]>([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTeacherCorrections({ status: status || undefined, page, per_page: 15 })
      .then((response) => {
        setItems(response.data);
        setTotal(response.meta?.total ?? response.data.length);
        setLastPage(response.meta?.last_page ?? 1);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load your correction requests."))
      .finally(() => setLoading(false));
  }, [status, page]);

  return (
    <div className="w-full space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Attendance corrections</h1><p className="mt-2 text-sm text-muted">Track requests you submitted for closed attendance sessions.</p></div><Link href="/teacher/attendance-history" className="inline-flex h-10 items-center gap-2 rounded-control border border-hairline bg-card px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50">Attendance history <ArrowRight className="size-4" /></Link></header>

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-hairline bg-card p-4 shadow-soft"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><ClipboardList className="size-5" /></span><div><p className="text-sm text-muted">Matching requests</p><p className="font-display text-2xl font-bold">{total}</p></div></div><label className="text-sm font-semibold">Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="ml-3 h-10 rounded-control border border-hairline bg-card px-3 text-sm"><option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></section>

      {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {loading ? <div className="space-y-3">{[0, 1, 2].map((row) => <div key={row} className="h-36 animate-pulse rounded-panel bg-card" />)}</div> : items.length === 0 ? <div className="rounded-panel border border-hairline bg-card p-10 text-center"><FilePenLine className="mx-auto size-8 text-muted" /><h2 className="mt-3 font-semibold">No correction requests</h2><p className="mt-1 text-sm text-muted">Requests you make from closed-session attendance records will appear here.</p></div> : <div className="space-y-3">{items.map((item) => {
        const record = item.attendance;
        const session = record?.session;
        const currentStatus = record?.status ?? "unknown";
        return <article key={item.id} className="rounded-panel border border-hairline bg-card p-5 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-600">{record?.student?.student_code ?? "Attendance record"} · {session?.class_section?.course?.course_code ?? "Class"} {session?.class_section?.section_code ? `· ${session.class_section.section_code}` : ""}</p><h2 className="mt-1 font-display text-lg font-bold">{record?.student?.user?.name ?? "Student"}</h2><p className="mt-1 text-xs text-muted">Session {session?.session_date ? new Date(`${session.session_date}T00:00:00`).toLocaleDateString() : ""} · Requested {new Date(item.created_at).toLocaleDateString()}</p></div><StatusBadge status={item.status} context="correction" /></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-control bg-canvas p-3"><p className="text-xs text-muted">Current status</p><p className="mt-1 text-sm font-semibold capitalize">{currentStatus}</p></div><div className="rounded-control bg-canvas p-3"><p className="text-xs text-muted">Requested status</p><p className="mt-1 text-sm font-semibold capitalize">{item.requested_status}</p></div><div className="rounded-control bg-canvas p-3"><p className="text-xs text-muted">Administrator review</p><p className="mt-1 text-sm font-semibold">{item.reviewer?.name ?? (item.status === "pending" ? "Waiting for review" : "Review completed")}</p></div></div><div className="mt-3 rounded-control border border-hairline p-3"><p className="text-xs font-semibold text-muted">Your reason</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.reason}</p></div>{item.review_note && <div className="mt-3 rounded-control bg-canvas p-3"><p className="text-xs font-semibold text-muted">Administrator note</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.review_note}</p></div>}</article>;
      })}</div>}
      <div className="flex items-center justify-between gap-3"><p className="text-sm text-muted">Page {page} of {lastPage}</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= lastPage || loading} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>
    </div>
  );
}
