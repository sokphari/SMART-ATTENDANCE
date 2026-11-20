"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Clipboard, QrCode, RefreshCw, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { fetchActiveQrSessions, generateAdminQrToken, type ActiveQrSession, type QrTokenData } from "../api";

type Props = { open: boolean; onClose: () => void };

export function AdminAttendanceQrDialog({ open, onClose }: Props) {
  const [sessions, setSessions] = useState<ActiveQrSession[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [qr, setQr] = useState<QrTokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [reopenCount, setReopenCount] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const generationRef = useRef(0);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetchActiveQrSessions();
      setSessions(response.data);
      setSessionId((current) => response.data.some((item) => String(item.id) === current)
        ? current : String(response.data[0]?.id ?? ""));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load active sessions.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const issueQr = useCallback(async (id: number) => {
    const requestId = ++generationRef.current;
    setGenerating(true);
    setError("");
    try {
      const response = await generateAdminQrToken(id);
      if (requestId !== generationRef.current) return;
      setQr(response.data);
    } catch (caught) {
      if (requestId !== generationRef.current) return;
      setQr(null);
      setError(caught instanceof Error ? caught.message : "Unable to generate QR. Check the session time.");
    } finally {
      if (requestId === generationRef.current) setGenerating(false);
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    if (open) {
      setQr(null);
      setSessionId("");
      setCopied(false);
      setReopenCount((current) => current + 1);
      void loadSessions();
    } else {
      generationRef.current++;
    }
  }, [open, loadSessions]);

  useEffect(() => {
    if (!open || loading || !sessionId || !sessions.some((item) => String(item.id) === sessionId)) return;
    setQr(null);
    void issueQr(Number(sessionId));
  }, [open, loading, sessions, sessionId, issueQr, reopenCount]);

  useEffect(() => {
    if (!open || !qr || !sessionId) return;
    const expiry = new Date(qr.expires_at).getTime();
    const remaining = expiry - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(() => void issueQr(Number(sessionId)), Math.max(1000, remaining - 2000));
    return () => window.clearTimeout(timer);
  }, [open, qr, sessionId, issueQr]);

  function dismiss() {
    generationRef.current++;
    onClose();
  }

  const selected = sessions.find((item) => String(item.id) === sessionId);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-qr-title"
      onCancel={(event) => { event.preventDefault(); dismiss(); }}
      onClose={dismiss}
      className="m-auto w-[min(94vw,32rem)] max-h-[92dvh] overflow-y-auto rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/60"
    >
      <div className="flex items-start justify-between border-b border-hairline p-4">
        <div>
          <h2 id="admin-qr-title" className="text-lg font-bold">Student attendance QR</h2>
          <p className="mt-1 text-xs text-muted">Show a rotating QR to students in an open class.</p>
        </div>
        <button aria-label="Close QR popup" type="button" onClick={dismiss} className="rounded-control p-2 text-muted hover:bg-canvas"><X className="size-4" /></button>
      </div>
      <div className="space-y-4 p-4">
        <div>
          <label htmlFor="attendance-qr-session" className="mb-1 block text-sm font-semibold">Active attendance session</label>
          <select id="attendance-qr-session" className="h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm"
            disabled={loading || !sessions.length} value={sessionId}
            onChange={(event) => { generationRef.current++; setSessionId(event.target.value); setQr(null); }}>
            {!sessions.length && <option value="">No open attendance sessions</option>}
            {sessions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.class_section?.course?.course_code ?? item.class_section?.course?.code ?? "Class"} · Section {item.class_section?.section_code ?? item.id} · {item.classroom?.room_code ?? "Room"}
              </option>
            ))}
          </select>
        </div>

        {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {loading ? (
          <p role="status" className="py-10 text-center text-sm text-muted">Loading open sessions…</p>
        ) : !sessions.length ? (
          <div className="rounded-control border border-dashed border-hairline p-5 text-center">
            <QrCode className="mx-auto mb-2 size-8 text-muted" />
            <p className="font-semibold">No active sessions right now</p>
            <p className="mt-2 text-sm text-muted">Ask a teacher to start an attendance session during the configured check-in time.</p>
            <Button className="mt-4" variant="secondary" size="sm" onClick={() => void loadSessions()}>Refresh sessions</Button>
          </div>
        ) : (
          <>
            <p className="text-center text-sm font-semibold">{selected?.class_section?.course?.name ?? "Attendance session"}</p>
            <div className="mx-auto flex min-h-64 w-fit items-center justify-center rounded-xl bg-white p-3">
              {qr ? <QRCodeSVG size={240} includeMargin level="M" value={qr.token} /> :
                <p role="status" className="max-w-48 text-center text-sm text-slate-600">{generating ? "Generating QR…" : "QR unavailable"}</p>}
            </div>
            <p className="text-center text-xs text-muted">{qr ? `QR expires at ${new Date(qr.expires_at).toLocaleTimeString()}. It refreshes automatically.` : "Only open sessions within the check-in window can generate a QR."}</p>
            <div className="flex justify-center gap-2">
              <Button variant="secondary" size="sm" disabled={!qr} onClick={() => {
                if (!qr) return;
                void navigator.clipboard.writeText(qr.token).then(() => setCopied(true)).catch(() => setError("Clipboard is unavailable."));
              }}>
                {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}{copied ? "Copied" : "Copy token"}
              </Button>
              <Button size="sm" disabled={generating} loading={generating} onClick={() => void issueQr(Number(sessionId))}>
                <RefreshCw className="size-4" />Refresh QR
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
