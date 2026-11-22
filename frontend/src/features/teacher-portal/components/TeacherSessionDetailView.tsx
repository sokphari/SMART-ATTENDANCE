"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Check, CheckCircle2, Clipboard, Clock3, FileCheck2, QrCode, RefreshCw, Search, XCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { closeTeacherSession, generateSessionQrToken, getSessionAttendance, getTeacherSession, markSessionAttendance, startLocalQrTest } from "../api";
import type { AttendanceSummary, SessionAttendance, SessionAttendanceStatus, TeacherAttendanceSession } from "../types";
import { getQrWindowPhase, readableCountdown, secondsUntil } from "../qrWindow";
import { studentScanUrl, phoneScanUrlWarning } from "@/features/attendance/studentScanLink";

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
const GENDER_STYLE: Record<string, string> = {
  male: "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-400/20",
  female: "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-400/20",
  other: "bg-violet-500/15 text-violet-300 ring-1 ring-inset ring-violet-400/20",
};

function GenderBadge({ gender }: { gender: string | null }) {
  const value = gender?.toLowerCase() ?? "";
  return <span className={`inline-flex rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${GENDER_STYLE[value] ?? "bg-slate-500/15 text-slate-300 ring-1 ring-inset ring-slate-400/20"}`}>{gender ?? "Not provided"}</span>;
}

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
  const [pendingAttendance, setPendingAttendance] = useState<Record<number, { status: Exclude<SessionAttendanceStatus, "unmarked">; remarks?: string }>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savedSummary, setSavedSummary] = useState<AttendanceSummary | null>(null);
  const [saveSummaryDialogOpen, setSaveSummaryDialogOpen] = useState(false);
  const [permissionStudent, setPermissionStudent] = useState<SessionAttendance | null>(null);
  const [permissionReason, setPermissionReason] = useState("");
  const [qrToken, setQrToken] = useState<{ token: string; expires_at: string } | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [studentScanBase, setStudentScanBase] = useState("");
  const [qrError, setQrError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [startingLocalTest, setStartingLocalTest] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const qrRequestId = useRef(0);
  const attendanceRequestId = useRef(0);
  const permissionDialog = useRef<HTMLDialogElement>(null);
  const qrDialog = useRef<HTMLDialogElement>(null);
  const saveSummaryDialog = useRef<HTMLDialogElement>(null);

  const refresh = useCallback(async (targetPage = 1, options: { background?: boolean } = {}) => {
    const requestId = ++attendanceRequestId.current;
    const background = options.background ?? false;
    if (!background) setLoading(true);
    setError(null);
    try {
      const [sessionResponse, attendanceResponse] = await Promise.all([
        getTeacherSession(sessionId),
        getSessionAttendance(sessionId, targetPage, { search, status: statusFilter }),
      ]);
      if (requestId !== attendanceRequestId.current) return;
      setSession(sessionResponse.data);
      setRows(attendanceResponse.data);
      setSummary(attendanceResponse.summary);
      setPage(attendanceResponse.meta?.current_page ?? targetPage);
      setLastPage(attendanceResponse.meta?.last_page ?? 1);
    } catch (caught) {
      if (requestId !== attendanceRequestId.current) return;
      setError(caught instanceof Error ? caught.message : "Unable to load this attendance session.");
    } finally {
      if (!background && requestId === attendanceRequestId.current) setLoading(false);
    }
  }, [search, sessionId, statusFilter]);

  useEffect(() => { void refresh(1); }, [refresh]);

  useEffect(() => {
    if (session?.status !== "open" && session?.status !== "scheduled") return;
    const timer = window.setInterval(() => void refresh(page, { background: true }), 5000);
    return () => window.clearInterval(timer);
  }, [session?.status, page, refresh]);

  useEffect(() => {
    if (session?.status !== "open" && session?.status !== "scheduled") return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session?.status]);

  useEffect(() => {
    const dialog = permissionDialog.current;
    if (!dialog) return;
    if (permissionStudent && !dialog.open) dialog.showModal();
    if (!permissionStudent && dialog.open) dialog.close();
  }, [permissionStudent]);

  const qrPhase = useMemo(() => getQrWindowPhase(session, clock), [clock, session]);
  const qrCanGenerate = qrPhase === "active";
  const secondsUntilQrClose = session ? secondsUntil(session.closes_at, clock) : 0;
  const secondsUntilQrOpens = session ? secondsUntil(session.starts_at, clock) : 0;
  const qrWindowHint = !session ? "Session information is unavailable."
    : qrPhase === "upcoming" ? `QR check-in opens at ${formatTime(session.starts_at)} (in ${readableCountdown(secondsUntilQrOpens)}).`
    : qrPhase === "active" ? `QR check-in is open · closes in ${readableCountdown(secondsUntilQrClose)}.`
    : qrPhase === "waiting" ? "Waiting for this attendance session to open."
    : qrPhase === "ended" ? `QR check-in ended at ${formatTime(session.closes_at)}. Attendance review is still available.`
    : "This attendance session is not available for QR check-in.";

  const refreshQr = useCallback(async () => {
    const requestId = ++qrRequestId.current;
    setGeneratingQr(true);
    setQrError(null);
    try {
      const response = await generateSessionQrToken(sessionId);
      if (qrRequestId.current !== requestId) return;
      setQrToken(response.data);
    } catch (caught) {
      if (qrRequestId.current !== requestId) return;
      setQrError(caught instanceof Error ? caught.message : "Unable to generate the attendance QR token.");
      setQrToken(null);
    } finally {
      if (qrRequestId.current === requestId) setGeneratingQr(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // The server issues one stable QR; never automatically rotate or renew it.
    if (!qrDialogOpen || !qrCanGenerate || generatingQr || qrError || qrToken) return;
    void refreshQr();
  }, [qrDialogOpen, qrCanGenerate, qrToken, generatingQr, qrError, refreshQr]);

  useEffect(() => {
    // Never display an expired or previously issued token when QR check-in closes.
    if (qrPhase === "active" || !qrToken) return;
    setQrToken(null);
    qrRequestId.current += 1;
  }, [qrPhase, qrToken]);

  useEffect(() => {
    const dialog = qrDialog.current;
    if (!dialog) return;
    if (qrDialogOpen && !dialog.open) dialog.showModal();
    if (!qrDialogOpen && dialog.open) dialog.close();
  }, [qrDialogOpen]);

  useEffect(() => {
    const dialog = saveSummaryDialog.current;
    if (!dialog) return;
    if (saveSummaryDialogOpen && savedSummary && !dialog.open) dialog.showModal();
    if (!saveSummaryDialogOpen && dialog.open) dialog.close();
  }, [saveSummaryDialogOpen, savedSummary]);

  function selectStudentStatus(row: SessionAttendance, status: Exclude<SessionAttendanceStatus, "unmarked">, remarks?: string) {
    setNotice(null);
    setError(null);
    setPendingAttendance((current) => ({ ...current, [row.student_id]: { status, remarks } }));
  }

  async function savePendingAttendance() {
    const records = Object.entries(pendingAttendance).map(([studentId, record]) => ({
      student_id: Number(studentId),
      status: record.status,
      remarks: record.remarks,
    }));
    if (records.length === 0) return;

    setSavingAttendance(true);
    setError(null);
    try {
      const response = await markSessionAttendance(sessionId, records);
      setSummary(response.summary);
      setPendingAttendance({});
      await refresh(page);
      setSavedSummary(response.summary);
      setSaveSummaryDialogOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save attendance.");
    } finally {
      setSavingAttendance(false);
    }
  }

  async function submitPermission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!permissionStudent) return;
    selectStudentStatus(permissionStudent, "excused", permissionReason.trim() || undefined);
    setPermissionStudent(null);
    setPermissionReason("");
  }

  async function handleStartLocalQrTest() {
    if (!session?.local_qr_testing_available || startingLocalTest) return;
    setStartingLocalTest(true);
    setQrError(null);
    try {
      const response = await startLocalQrTest(sessionId);
      setSession(response.data);
      setClock(Date.now());
      setQrToken(null);
      qrRequestId.current += 1;
      setQrError(null);
      // Keep the modal visible; the regular QR refresh effect will fetch
      // a new token from the server after the session becomes active.
      setNotice("Local QR testing is active for 1 hour. Scan using a student test account.");
    } catch (caught) {
      setQrError(caught instanceof Error ? caught.message : "Unable to start the local QR test.");
    } finally {
      setStartingLocalTest(false);
    }
  }

  async function handleClose() {
    if (Object.keys(pendingAttendance).length > 0) {
      setError("Save attendance before closing the session.");
      return;
    }
    setClosing(true);
    setError(null);
    try {
      const response = await closeTeacherSession(sessionId);
      setSession(response.data);
      setSummary(response.summary);
      setQrToken(null);
      setQrDialogOpen(false);
      qrRequestId.current += 1;
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

  function openQrDialog() {
    setStudentScanBase(window.location.origin);
    setQrDialogOpen(true);
    setQrError(null);
    // QR generation is handled by the active-window effect, not the click.
  }

  function displayedStatus(row: SessionAttendance): SessionAttendanceStatus {
    return pendingAttendance[row.student_id]?.status ?? row.status;
  }

  const pendingCount = Object.keys(pendingAttendance).length;

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
        {session.status === "scheduled" && <p role="status" className="mt-4 rounded-control bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">{qrWindowHint}</p>}
        {session.status === "open" && <p role="status" className="mt-4 rounded-control bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">{qrWindowHint}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{summary && ([['Present', summary.present], ['Late', summary.late], ['Absent', summary.absent], ['Permission', summary.excused], ['Pending', summary.unmarked], ['Enrolled', summary.total]] as const).map(([label, count]) => <div key={label} className="rounded-control bg-canvas p-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 font-display text-xl font-bold">{count}</p></div>)}</div>
      </section>

      {session.status === "open" && <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Manual attendance</h2><p className="mt-1 text-sm text-muted">Ask students to scan the QR or mark them manually below. QR check-in is available only to students who are still Pending.</p></div><div className="flex flex-wrap gap-2">{pendingCount > 0 && <Button onClick={() => void savePendingAttendance()} loading={savingAttendance}><Check className="size-4" />Save attendance ({pendingCount})</Button>}<Button variant="secondary" onClick={openQrDialog}><QrCode className="size-4" />Open QR for students</Button></div></div>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-control border border-hairline bg-canvas px-3 py-2 text-xs text-muted">
            <span>Testing with a phone? Select a Pending student and enter their 9-digit Attendance ID.</span>
            <button type="button" onClick={() => { setStatusFilter("unmarked"); setSearch(""); setPage(1); }} className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700">Show Pending students</button>
          </div>
          {qrError && <p role="alert" className="mt-3 text-sm text-danger">{qrError}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search student name or ID" aria-label="Search students" className="h-11 w-full rounded-control border border-hairline bg-card pl-10 pr-3 text-sm" /></label>
            <select aria-label="Filter attendance status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="h-11 rounded-control border border-hairline bg-card px-3 text-sm"><option value="">All statuses</option><option value="unmarked">Pending</option><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Permission</option></select>
          </div>
          {loading && rows.length === 0 && <p role="status" className="py-3 text-sm text-muted">Loading attendance…</p>}
          <div className="mt-3 space-y-3 md:hidden">
            {rows.map((row, index) => <article key={row.student_id} className="rounded-control border border-hairline bg-card p-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{row.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{(page - 1) * 50 + index + 1}. {row.name}</p><p className="text-xs text-muted">Attendance ID: <span className="font-mono font-semibold">{row.attendance_id}</span></p><GenderBadge gender={row.gender} /></div><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[displayedStatus(row)]}`}>{STATUS_LABEL[displayedStatus(row)]}</span></div><div className="mt-3 grid grid-cols-2 gap-2">{STATUS_OPTIONS.map(({ status, label, icon: Icon, style }) => <button key={status} type="button" aria-label={`${label} for ${row.name}`} aria-pressed={displayedStatus(row) === status} disabled={savingAttendance} onClick={() => status === "excused" ? (setPermissionStudent(row), setPermissionReason("")) : selectStudentStatus(row, status)} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-control border px-2 text-xs font-semibold transition-colors disabled:opacity-50 ${style} ${displayedStatus(row) === status ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}><Icon className="size-4" />{label}</button>)}</div></article>)}
          </div>
          <div className="mt-3 hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">No.</th><th className="px-3 py-3">Student</th><th className="px-3 py-3">Gender</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead><tbody className="divide-y divide-hairline">{rows.map((row, index) => <tr key={row.student_id}><td className="px-3 py-3 text-muted">{(page - 1) * 50 + index + 1}</td><td className="px-3 py-3"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{row.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span><div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">Attendance ID: <span className="font-mono font-semibold text-ink">{row.attendance_id}</span></p><p className="text-xs text-muted">{row.email}</p></div></div></td><td className="px-3 py-3"><GenderBadge gender={row.gender} /></td><td className="px-3 py-3"><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[displayedStatus(row)]}`}>{STATUS_LABEL[displayedStatus(row)]}</span><p className="mt-1 text-[11px] text-muted">{row.verification_method ? row.verification_method.replaceAll("_", " ") : "Awaiting mark"}</p></td><td className="px-3 py-3"><div className="grid grid-cols-2 gap-1.5 xl:flex">{STATUS_OPTIONS.map(({ status, label, icon: Icon, style }) => <button key={status} type="button" aria-label={`${label} for ${row.name}`} aria-pressed={displayedStatus(row) === status} disabled={savingAttendance} onClick={() => status === "excused" ? (setPermissionStudent(row), setPermissionReason("")) : selectStudentStatus(row, status)} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-control border px-2 text-xs font-semibold transition-colors disabled:opacity-50 ${style} ${displayedStatus(row) === status ? "ring-2 ring-brand-500 ring-offset-1" : ""}`}><Icon className="size-3.5" />{label}</button>)}</div></td></tr>)}</tbody></table></div>
          {rows.length === 0 && !loading && <p className="py-6 text-center text-sm text-muted">No enrolled students match this search and status filter.</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Page {page} of {lastPage} · {summary?.unmarked ?? 0} pending</p><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => void refresh(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= lastPage || loading} onClick={() => void refresh(page + 1)}>Next</Button></div></div>
        </div>

      </section>}

      {session.status !== "open" && <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft"><h2 className="font-display text-lg font-bold">Attendance records</h2><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-canvas text-xs uppercase tracking-wide text-muted"><tr><th className="px-3 py-3">Student</th><th className="px-3 py-3">Gender</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Verified by</th></tr></thead><tbody className="divide-y divide-hairline">{rows.map((row) => <tr key={row.student_id}><td className="px-3 py-3 font-semibold">{row.name}</td><td className="px-3 py-3"><GenderBadge gender={row.gender} /></td><td className="px-3 py-3"><span className={`rounded-pill px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[row.status]}`}>{row.status}</span></td><td className="px-3 py-3 text-muted">{row.verification_method?.replaceAll("_", " ") ?? "—"}</td></tr>)}</tbody></table></div><div className="mt-4 flex justify-end gap-2"><Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => void refresh(page - 1)}>Previous</Button><Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => void refresh(page + 1)}>Next</Button></div></section>}

      <dialog ref={permissionDialog} aria-labelledby="permission-title" aria-describedby="permission-description" onCancel={(event) => { event.preventDefault(); if (!savingAttendance) setPermissionStudent(null); }} onClose={() => { if (permissionStudent && !savingAttendance) setPermissionStudent(null); }} className="m-auto w-[min(92vw,30rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/50">
        {permissionStudent && <form onSubmit={(event) => void submitPermission(event)} className="p-6"><h2 id="permission-title" className="font-display text-lg font-bold">Record permission</h2><p id="permission-description" className="mt-2 text-sm text-muted">Mark {permissionStudent.name} as excused for this session. A reason is optional. Click Save attendance after selecting students.</p><label htmlFor="permission-reason" className="mt-4 block text-sm font-semibold">Reason (optional)</label><textarea id="permission-reason" value={permissionReason} onChange={(event) => setPermissionReason(event.target.value)} maxLength={1000} rows={3} placeholder="Add a short note" className="mt-2 w-full resize-y rounded-control border border-hairline bg-canvas p-3 text-sm outline-none focus:border-brand-400" /><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={savingAttendance} onClick={() => setPermissionStudent(null)}>Cancel</Button><Button type="submit" loading={savingAttendance}><FileCheck2 className="size-4" />Select permission</Button></div></form>}
      </dialog>

      <dialog ref={qrDialog} aria-labelledby="qr-dialog-title" onCancel={(event) => { event.preventDefault(); setQrDialogOpen(false); }} onClose={() => setQrDialogOpen(false)} className="m-auto w-[min(92vw,28rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/50">
        <div className="p-6 text-center">
          <div className="flex items-start justify-between gap-4 text-left">
            <div><h2 id="qr-dialog-title" className="font-display text-lg font-bold">Student attendance QR</h2><p className="mt-1 text-sm text-muted">Students can scan this code during the scheduled attendance window.</p></div>
            <button type="button" aria-label="Close QR popup" onClick={() => setQrDialogOpen(false)} className="rounded-control px-2 py-1 text-muted hover:bg-canvas">×</button>
          </div>
          {qrError && <p role="alert" className="mt-4 rounded-control bg-danger-soft p-3 text-left text-sm text-danger">{qrError}</p>}
          {session.local_qr_testing_available && !qrCanGenerate && session.status === "open" && (
            <div className="mt-4 rounded-control border border-amber-300 bg-amber-50 p-3 text-left text-sm text-amber-900">
              <p className="font-semibold">Local development test only</p>
              <p className="mt-1">Start a temporary 1-hour QR window for this session. This changes only its attendance times and invalidates existing QR tokens.</p>
              <Button className="mt-3" size="sm" disabled={startingLocalTest} loading={startingLocalTest} onClick={() => void handleStartLocalQrTest()}>
                <QrCode className="size-4" />Start QR test now
              </Button>
            </div>
          )}
          <p role="status" className="mt-4 rounded-control bg-brand-50 p-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">{qrWindowHint}</p>
          <div className="mx-auto mt-5 flex min-h-64 w-fit min-w-64 items-center justify-center rounded-xl bg-white p-3">
            {qrToken && qrCanGenerate && Date.parse(qrToken.expires_at) > clock ? <QRCodeSVG value={studentScanUrl(qrToken.token, studentScanBase || window.location.origin, process.env.NEXT_PUBLIC_STUDENT_SCAN_BASE_URL)} size={240} level="M" includeMargin /> :
              <p role="status" className="max-w-48 text-sm text-slate-600">{qrPhase !== "active" ? qrWindowHint : generatingQr ? "Generating student QR…" : "No QR available. Refresh to retry."}</p>}
          </div>
          {studentScanBase && phoneScanUrlWarning(studentScanUrl("preview", studentScanBase, process.env.NEXT_PUBLIC_STUDENT_SCAN_BASE_URL)) && <p role="status" className="mt-3 rounded-control bg-warning-soft p-3 text-left text-xs text-amber-800 dark:text-amber-200">{phoneScanUrlWarning(studentScanUrl("preview", studentScanBase, process.env.NEXT_PUBLIC_STUDENT_SCAN_BASE_URL))}</p>}
          {qrToken && qrCanGenerate && <p className="mt-3 text-xs text-muted">Expires {new Date(qrToken.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>}
          <div className="mt-4 flex justify-center gap-2">
            <Button size="sm" variant="secondary" disabled={!qrToken || !qrCanGenerate || Date.parse(qrToken.expires_at) <= clock} onClick={() => void copyToken()}>{copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}{copied ? "Copied" : "Copy token"}</Button>
            <p className="self-center text-xs text-muted">QR remains the same until expiry</p>
          </div>
          <Button className="mt-4 w-full" variant="secondary" onClick={() => setQrDialogOpen(false)}>Close</Button>
        </div>
      </dialog>

      <dialog ref={saveSummaryDialog} aria-labelledby="save-summary-title" onCancel={(event) => { event.preventDefault(); setSaveSummaryDialogOpen(false); }} onClose={() => setSaveSummaryDialogOpen(false)} className="m-auto w-[min(92vw,34rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/50">
        {savedSummary && <div className="p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Check className="size-5" /></span><div><h2 id="save-summary-title" className="font-display text-xl font-bold">Attendance saved</h2><p className="mt-1 text-sm text-muted">Your changes were saved successfully.</p></div></div><button type="button" aria-label="Close attendance summary" onClick={() => setSaveSummaryDialogOpen(false)} className="rounded-control px-2 py-1 text-muted hover:bg-canvas">×</button></div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-control border border-emerald-500/15 bg-emerald-500/10 p-3"><p className="text-xs text-muted">Present</p><p className="mt-1 text-2xl font-bold text-emerald-400">{savedSummary.present}</p></div><div className="rounded-control border border-rose-500/15 bg-rose-500/10 p-3"><p className="text-xs text-muted">Absent</p><p className="mt-1 text-2xl font-bold text-rose-300">{savedSummary.absent}</p></div><div className="rounded-control border border-amber-500/15 bg-amber-500/10 p-3"><p className="text-xs text-muted">Late</p><p className="mt-1 text-2xl font-bold text-amber-300">{savedSummary.late}</p></div><div className="rounded-control border border-blue-500/15 bg-blue-500/10 p-3"><p className="text-xs text-muted">Permission</p><p className="mt-1 text-2xl font-bold text-blue-300">{savedSummary.excused}</p></div></div><div className="mt-4 flex items-center justify-between rounded-control border border-hairline bg-canvas p-4"><div><p className="text-sm font-semibold">Pending attendance</p><p className="mt-1 text-xs text-muted">Students still waiting for a status</p></div><p className="font-display text-xl font-bold">{savedSummary.unmarked}<span className="ml-1 text-sm font-normal text-muted">/ {savedSummary.total}</span></p></div><p className="mt-4 text-xs leading-relaxed text-muted">Continue marking to update more students, or close the session when attendance is complete. Closing marks any remaining pending students absent.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button onClick={() => setSaveSummaryDialogOpen(false)}>Cancel</Button><Button variant="danger" loading={closing} onClick={() => { setSaveSummaryDialogOpen(false); void handleClose(); }}>Close session</Button></div></div>}
      </dialog>
    </div>
  );
}

const STATUS_STYLE_OPEN = "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
