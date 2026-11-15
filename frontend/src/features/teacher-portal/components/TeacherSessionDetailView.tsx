"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Clipboard, QrCode, RefreshCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { closeTeacherSession, generateSessionQrToken, getSessionAttendance, getTeacherSession, markSessionAttendance } from "../api";
import type { AttendanceSummary, SessionAttendance, SessionAttendanceStatus, TeacherAttendanceSession } from "../types";

const STATUS_OPTIONS: Exclude<SessionAttendanceStatus, "unmarked">[] = ["present", "late", "absent", "excused"];
const STATUS_STYLE: Record<SessionAttendanceStatus, string> = {
  present: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  late: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  absent: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  excused: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  unmarked: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
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
  const [selected, setSelected] = useState<Record<number, Exclude<SessionAttendanceStatus, "unmarked">>>({});
  const [qrToken, setQrToken] = useState<{ token: string; expires_at: string } | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeDialog = useRef<HTMLDialogElement>(null);

  const refresh = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError(null);
    try {
      const [sessionResponse, attendanceResponse] = await Promise.all([
        getTeacherSession(sessionId),
        getSessionAttendance(sessionId, targetPage),
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
  }, [sessionId]);

  useEffect(() => { void refresh(1); }, [refresh]);

  useEffect(() => {
    const dialog = closeDialog.current;
    if (!dialog) return;
    if (confirmClose && !dialog.open) dialog.showModal();
    if (!confirmClose && dialog.open) dialog.close();
  }, [confirmClose]);

  const qrCanGenerate = useMemo(() => {
    if (!session || session.status !== "open") return false;
    const now = Date.now();
    return now >= new Date(session.starts_at).getTime() && now <= new Date(session.closes_at).getTime();
  }, [session]);

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
    if (!qrToken || session?.status !== "open") return;
    const untilExpiry = new Date(qrToken.expires_at).getTime() - Date.now();
    const timer = window.setTimeout(() => void refreshQr(), Math.max(1000, untilExpiry - 1500));
    return () => window.clearTimeout(timer);
  }, [qrToken, refreshQr, session?.status]);

  async function handleManualSave() {
    const records = Object.entries(selected).map(([studentId, status]) => ({ student_id: Number(studentId), status }));
    if (!records.length) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await markSessionAttendance(sessionId, records);
      setSelected({});
      setNotice(`${records.length} attendance record${records.length === 1 ? "" : "s"} saved.`);
      await refresh(page);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to save manual attendance.";
      await refresh(page);
      setError(message);
    } finally {
      setSaving(false);
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
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{summary && ([['Present', summary.present], ['Late', summary.late], ['Absent', summary.absent], ['Excused', summary.excused], ['Unmarked', summary.unmarked], ['Enrolled', summary.total]] as const).map(([label, count]) => <div key={label} className="rounded-control bg-canvas p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-display text-xl font-bold">{count}</p></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-3">{session.status === "open" && <Button variant="danger" onClick={() => setConfirmClose(true)}>Close session</Button>}</div>
      </section>

      {session.status === "open" && <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6">
          <h2 className="font-display text-lg font-bold">Manual attendance</h2><p className="mt-1 text-sm text-muted">Use this for students verified in person. Existing QR records stay unchanged.</p>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Student</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">Current status</th><th className="px-3 py-3">Mark status</th></tr></thead><tbody className="divide-y divide-hairline">{rows.map((row) => <tr key={row.student_id}><td className="px-3 py-3"><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{row.email}</p></td><td className="px-3 py-3">{row.student_code}</td><td className="px-3 py-3"><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[row.status]}`}>{row.status}</span><p className="mt-1 text-[11px] text-muted">{row.verification_method ? row.verification_method.replaceAll("_", " ") : "Awaiting mark"}</p></td><td className="px-3 py-3">{row.status === "unmarked" ? <select aria-label={`Mark ${row.name}`} value={selected[row.student_id] ?? ""} onChange={(event) => setSelected((current) => event.target.value ? { ...current, [row.student_id]: event.target.value as Exclude<SessionAttendanceStatus, "unmarked"> } : Object.fromEntries(Object.entries(current).filter(([id]) => id !== String(row.student_id))))} className="h-10 w-36 rounded-control border border-hairline bg-card px-2 text-sm"><option value="">Leave unmarked</option>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select> : <span className="text-xs text-muted">Already recorded</span>}</td></tr>)}</tbody></table></div>
          {rows.length === 0 && <p className="py-6 text-sm text-muted">There are no active enrolled students on this page.</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Page {page} of {lastPage} · {summary?.unmarked ?? 0} still unmarked</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => { setSelected({}); void refresh(page - 1); }}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => { setSelected({}); void refresh(page + 1); }}>Next</Button></div></div>
          <div className="mt-5 flex justify-end"><Button onClick={() => void handleManualSave()} loading={saving} disabled={Object.keys(selected).length === 0}>Save manual marks ({Object.keys(selected).length})</Button></div>
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
    </div>
  );
}

const STATUS_STYLE_OPEN = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
