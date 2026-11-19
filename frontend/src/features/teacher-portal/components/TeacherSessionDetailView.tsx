"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, Clipboard, Clock3, FileCheck2, QrCode, RefreshCw, Search, X, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { closeTeacherSession, generateSessionQrToken, getSessionAttendance, getTeacherSession, markSessionAttendance } from "../api";
import type { AttendanceSummary, SessionAttendance, SessionAttendanceStatus, TeacherAttendanceSession } from "../types";

const STATUS_OPTIONS = [
  { status: "present", label: "Present", icon: CheckCircle2, style: "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10" },
  { status: "absent", label: "Absent", icon: XCircle, style: "border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10" },
  { status: "late", label: "Late", icon: Clock3, style: "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10" },
  { status: "excused", label: "Permission", icon: FileCheck2, style: "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10" },
] as const;
const STATUS_STYLE: Record<SessionAttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  late: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  absent: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  excused: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  unmarked: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};
const STATUS_LABEL: Record<SessionAttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Permission",
  unmarked: "Pending",
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function TeacherSessionDetailView({ sessionId }: { sessionId: number }) {
  const [session, setSession] = useState<TeacherAttendanceSession | null>(null);
  const [rows, setRows] = useState<SessionAttendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [savingStudentId, setSavingStudentId] = useState<number | null>(null);
  const [permissionStudent, setPermissionStudent] = useState<SessionAttendance | null>(null);
  const [permissionReason, setPermissionReason] = useState("");
  const [qrToken, setQrToken] = useState<{ token: string; expires_at: string } | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const autoQrStarted = useRef(false);
  const closeDialog = useRef<HTMLDialogElement>(null);
  const permissionDialog = useRef<HTMLDialogElement>(null);

  const refresh = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [sessionResponse, attendanceResponse] = await Promise.all([
        getTeacherSession(sessionId),
        getSessionAttendance(sessionId, targetPage, { search, status: statusFilter }),
      ]);
      setSession(sessionResponse.data);
      setRows(attendanceResponse.data);
      setSummary(attendanceResponse.summary);
      setPage(attendanceResponse.meta?.current_page ?? targetPage);
      setLastPage(attendanceResponse.meta?.last_page ?? 1);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this attendance session.");
    } finally {
      setLoading(false);
    }
  }, [search, sessionId, statusFilter]);

  useEffect(() => { void refresh(1); }, [refresh]);

  useEffect(() => {
    if (session?.status !== "open" && session?.status !== "scheduled") return;
    const timer = window.setInterval(() => void refresh(page), 5000);
    return () => window.clearInterval(timer);
  }, [session?.status, page, refresh]);

  useEffect(() => {
    if (session?.status !== "open" && session?.status !== "scheduled") return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.status]);

  useEffect(() => {
    const dialog = closeDialog.current;
    if (!dialog) return;
    if (confirmClose && !dialog.open) dialog.showModal();
    if (!confirmClose && dialog.open) dialog.close();
  }, [confirmClose]);

  useEffect(() => {
    const dialog = permissionDialog.current;
    if (!dialog) return;
    if (permissionStudent && !dialog.open) dialog.showModal();
    if (!permissionStudent && dialog.open) dialog.close();
  }, [permissionStudent]);

  const qrCanGenerate = useMemo(() => {
    if (!session || session.status !== "open") return false;
    return clock >= new Date(session.starts_at).getTime() && clock <= new Date(session.closes_at).getTime();
  }, [clock, session]);
  const secondsUntilQrClose = session ? Math.max(0, Math.ceil((new Date(session.closes_at).getTime() - clock) / 1000)) : 0;

  const refreshQr = useCallback(async () => {
    setGeneratingQr(true);
    setQrError(null);
    try {
      const response = await generateSessionQrToken(sessionId);
      setQrToken(response.data);
    } catch (caught) {
      setQrError(caught instanceof Error ? caught.message : "Unable to generate the attendance QR token.");
      setQrToken(null);
    } finally {
      setGeneratingQr(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!qrCanGenerate || qrToken || qrError || generatingQr || autoQrStarted.current) return;
    autoQrStarted.current = true;
    void refreshQr();
  }, [qrCanGenerate, qrToken, qrError, generatingQr, refreshQr]);

  useEffect(() => {
    if (!qrToken || session?.status !== "open") return;
    const untilExpiry = new Date(qrToken.expires_at).getTime() - Date.now();
    const timer = window.setTimeout(() => void refreshQr(), Math.max(1000, untilExpiry - 1500));
    return () => window.clearTimeout(timer);
  }, [qrToken, refreshQr, session?.status]);

  async function markStudent(row: SessionAttendance, status: Exclude<SessionAttendanceStatus, "unmarked">, remarks?: string) {
    setSavingStudentId(row.student_id);
    setNotice(null);
    setError(null);
    try {
      const response = await markSessionAttendance(sessionId, [{ student_id: row.student_id, status, remarks }]);
      setRows((current) => statusFilter && statusFilter !== status
        ? current.filter((item) => item.student_id !== row.student_id)
        : current.map((item) => item.student_id === row.student_id ? {
          ...item,
          status,
          verification_method: "manual",
          checked_in_at: status === "present" || status === "late" ? new Date().toISOString() : null,
          remarks: remarks ?? null,
        } : item));
      setSummary(response.summary);
      setNotice(`${row.name}'s attendance saved as ${status === "excused" ? "Permission" : status}.`);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save attendance.");
      return false;
    } finally {
      setSavingStudentId(null);
    }
  }

  async function submitPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissionStudent) return;
    const saved = await markStudent(permissionStudent, "excused", permissionReason.trim() || undefined);
    if (saved) {
      setPermissionStudent(null);
      setPermissionReason("");
    }
  }

  async function handleClose() {
    setClosing(true);
    setError(null);
    try {
      const response = await closeTeacherSession(sessionId);
      setSession(response.data);
      setSummary(response.summary);
      setQrToken(null);
      setConfirmClose(false);
      setNotice("Session closed. Remaining enrolled students were marked absent.");
      await refresh(page);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to close the session.");
    } finally {
      setClosing(false);
    }
  }

  async function copyToken() {
    if (!qrToken) return;
    await navigator.clipboard.writeText(qrToken.token);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (loading && !session) return <div className="w-full animate-pulse space-y-5"><div className="h-8 w-64 rounded bg-slate-200" /><div className="h-52 rounded-panel bg-slate-100" /><div className="h-80 rounded-panel bg-slate-100" /></div>;
  if (error && !session) return <div className="w-full"><Link href="/teacher/attendance-sessions" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600"><ArrowLeft className="size-4" />Back to sessions</Link><p role="alert" className="mt-5 rounded-control bg-danger-soft p-4 text-sm text-danger">{error}</p></div>;
  if (!session) return null;

  const course = session.class_section.course;
  const className = `${course?.course_code ?? course?.code ?? "Class"} · Section ${session.class_section.section_code}`;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/teacher/attendance-sessions" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"><ArrowLeft className="size-4" />Back to sessions</Link><Button variant="secondary" size="sm" onClick={() => void refresh(page)} loading={loading}><RefreshCw className="size-4" />Refresh</Button></div>
      {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-control bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}

      <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wide text-brand-600">{className}</p><h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight">{course?.name ?? "Attendance session"}</h1><p className="mt-2 text-sm text-muted">{formatDate(session.session_date)} · {formatTime(session.starts_at)}–{formatTime(session.closes_at)} · {session.classroom?.room_code ?? "Classroom"}</p></div><span className={`rounded-pill px-3 py-1.5 text-xs font-semibold capitalize ${session.status === "open" ? STATUS_STYLE_OPEN : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{session.status}</span></div>
        {session.status === "scheduled" && <p role="status" className="mt-4 rounded-control bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">Attendance will open automatically at {formatTime(session.starts_at)}. QR check-in is configured to close at {formatTime(session.closes_at)}.</p>}
        {session.status === "open" && <p role="status" className="mt-4 rounded-control bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{qrCanGenerate ? `QR check-in is open · closes in ${Math.floor(secondsUntilQrClose / 60)}m ${secondsUntilQrClose % 60}s.` : `QR check-in is closed. The session remains open until ${formatTime(session.session_ends_at ?? session.closes_at)} for attendance review.`}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{summary && ([['Present', summary.present], ['Late', summary.late], ['Absent', summary.absent], ['Permission', summary.excused], ['Pending', summary.unmarked], ['Enrolled', summary.total]] as const).map(([label, count]) => <div key={label} className="rounded-control bg-canvas p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-display text-xl font-bold">{count}</p></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3">{session.status === "open" && <Button variant="danger" onClick={() => setConfirmClose(true)}>Close session</Button>}</div>
      </section>

      {session.status === "open" && <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6">
          <h2 className="font-display text-lg font-bold">Manual attendance</h2><p className="mt-1 text-sm text-muted">Mark or correct each enrolled student. Updates share the same attendance record as QR check-in.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search student name or ID" aria-label="Search students" className="h-11 w-full rounded-control border border-hairline bg-card pl-10 pr-3 text-sm" /></label>
            <select aria-label="Filter attendance status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm"><option value="">All statuses</option><option value="unmarked">Pending</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Permission</option></select>
          </div>
          {loading && <p role="status" className="py-3 text-sm text-muted">Loading attendance…</p>}
          <div className="mt-3 space-y-3 md:hidden">
            {rows.map((row, index) => <article key={row.student_id} className="rounded-control border border-hairline bg-card p-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{row.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{(page - 1) * 50 + index + 1}. {row.name}</p><p className="truncate text-xs text-muted">{row.student_code}</p></div><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}>{STATUS_LABEL[row.status]}</span></div><div className="mt-3 grid grid-cols-2 gap-2">{STATUS_OPTIONS.map(({ status, label, icon: Icon, style }) => <button key={status} type="button" aria-label={`${label} for ${row.name}`} aria-pressed={row.status === status} disabled={savingStudentId === row.student_id} onClick={() => status === "excused" ? (setPermissionStudent(row), setPermissionReason("")) : void markStudent(row, status)} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-control border px-2 text-xs font-semibold transition-colors disabled:opacity-50 ${style} ${row.status === status ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}><Icon className="size-4" />{label}{savingStudentId === row.student_id && <span className="sr-only">Saving</span>}</button>)}</div></article>)}
          </div>
          <div className="mt-3 hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">No.</th><th className="px-3 py-3">Student</th><th className="px-3 py-3">Student ID</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y divide-hairline">{rows.map((row, index) => <tr key={row.student_id}><td className="px-3 py-3 text-muted">{(page - 1) * 50 + index + 1}</td><td className="px-3 py-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{row.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.email}</p></div></div></td><td className="px-3 py-3">{row.student_code}</td><td className="px-3 py-3"><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}>{STATUS_LABEL[row.status]}</span><p className="mt-1 text-[11px] text-muted">{row.verification_method ? row.verification_method.replaceAll("_", " ") : "Awaiting mark"}</p></td><td className="px-3 py-3"><div className="grid grid-cols-2 gap-1.5 xl:flex">{STATUS_OPTIONS.map(({ status, label, icon: Icon, style }) => <button key={status} type="button" aria-label={`${label} for ${row.name}`} aria-pressed={row.status === status} disabled={savingStudentId === row.student_id} onClick={() => status === "excused" ? (setPermissionStudent(row), setPermissionReason("")) : void markStudent(row, status)} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-control border px-2 text-xs font-semibold transition-colors disabled:opacity-50 ${style} ${row.status === status ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}><Icon className="size-3.5" />{label}</button>)}</div></td></tr>)}</tbody></table></div>
          {rows.length === 0 && !loading && <p className="py-6 text-center text-sm text-muted">No enrolled students match this search and status filter.</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Page {page} of {lastPage} · {summary?.unmarked ?? 0} pending</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => void refresh(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= lastPage || loading} onClick={() => void refresh(page + 1)}>Next</Button></div></div>
        </div>

        <aside className="rounded-panel border border-hairline bg-card p-5 text-center shadow-soft sm:p-6"><div className="mx-auto flex size-11 items-center justify-center rounded-control bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><QrCode className="size-5" /></div><h2 className="mt-3 font-display text-lg font-bold">Live attendance QR</h2><p className="mt-1 text-sm text-muted">QR tokens expire after 30 seconds and rotate automatically.</p>
          {qrToken ? <><div className="mx-auto mt-5 flex w-fit rounded-xl bg-white p-3"><QRCodeSVG value={qrToken.token} size={220} level="M" includeMargin /></div><p className="mt-3 text-xs text-muted">Expires {new Date(qrToken.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p><div className="mt-3 flex justify-center gap-2"><Button size="sm" variant="secondary" onClick={() => void copyToken()}>{copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}{copied ? "Copied" : "Copy token"}</Button><Button size="sm" onClick={() => void refreshQr()} loading={generatingQr}><RefreshCw className="size-4" />Refresh QR</Button></div></> : <div className="mt-5 rounded-control bg-canvas p-5"><p className="text-sm text-muted">{qrCanGenerate ? "Generate a code for students to scan." : `The QR is available from ${formatTime(session.starts_at)} until ${formatTime(session.closes_at)}.`}</p><Button className="mt-4 w-full" onClick={() => void refreshQr()} loading={generatingQr} disabled={!qrCanGenerate}>Generate QR</Button></div>}
          {qrError && <p role="alert" className="mt-3 text-xs text-danger">{qrError}</p>}
        </aside>
      </section>}

      {session.status !== "open" && <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft"><h2 className="font-display text-lg font-bold">Attendance records</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Student</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Verified by</th></tr></thead><tbody className="divide-y divide-hairline">{rows.map((row) => <tr key={row.student_id}><td className="px-3 py-3 font-semibold">{row.name}</td><td className="px-3 py-3">{row.student_code}</td><td className="px-3 py-3"><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[row.status]}`}>{row.status}</span></td><td className="px-3 py-3 text-muted">{row.verification_method?.replaceAll("_", " ") ?? "—"}</td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => void refresh(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => void refresh(page + 1)}>Next</Button></div></section>}

      <dialog ref={closeDialog} onCancel={(event) => { event.preventDefault(); setConfirmClose(false); }} className="m-auto w-[min(92vw,30rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/50">
        <div className="p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-lg font-bold">Close attendance session?</h2><p className="mt-2 text-sm text-muted">All remaining enrolled students without an attendance record will be marked absent. This action cannot be undone.</p></div><button type="button" aria-label="Cancel" onClick={() => setConfirmClose(false)} className="rounded-control p-1.5 text-muted hover:bg-canvas"><X className="size-4" /></button></div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setConfirmClose(false)}>Keep open</Button><Button variant="danger" loading={closing} onClick={() => void handleClose()}>Close session</Button></div></div>
      </dialog>

      <dialog ref={permissionDialog} aria-labelledby="permission-title" aria-describedby="permission-description" onCancel={(event) => { event.preventDefault(); if (!savingStudentId) setPermissionStudent(null); }} onClose={() => { if (permissionStudent && !savingStudentId) setPermissionStudent(null); }} className="m-auto w-[min(92vw,30rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/50">
        {permissionStudent && <form onSubmit={(event) => void submitPermission(event)} className="p-6"><h2 id="permission-title" className="font-display text-lg font-bold">Record permission</h2><p id="permission-description" className="mt-2 text-sm text-muted">Mark {permissionStudent.name} as excused for this session. A reason is optional.</p><label htmlFor="permission-reason" className="mt-4 block text-sm font-semibold">Reason (optional)</label><textarea id="permission-reason" value={permissionReason} onChange={(event) => setPermissionReason(event.target.value)} maxLength={1000} rows={3} placeholder="Add a short note" className="mt-2 w-full resize-y rounded-control border border-hairline bg-canvas p-3 text-sm outline-none focus:border-brand-400" /><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={savingStudentId === permissionStudent.student_id} onClick={() => setPermissionStudent(null)}>Cancel</Button><Button type="submit" loading={savingStudentId === permissionStudent.student_id}><FileCheck2 className="size-4" />Save permission</Button></div></form>}
      </dialog>
    </div>
  );
}

const STATUS_STYLE_OPEN = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
