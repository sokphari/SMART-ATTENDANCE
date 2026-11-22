"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, LocateFixed, LogIn, MapPin, QrCode, ShieldAlert } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { getStoredUser, getToken } from "@/lib/api/session";
import { clearPendingStudentScan, readPendingStudentScan, savePendingStudentScan } from "../studentScanPending";
import { Button } from "@/components/ui/Button";

type ScanResult = { data: {
  id: number; status: "present" | "late"; checked_in_at: string | null;
  student?: { user?: { name: string } };
  session?: { class_section?: { course?: { name: string } } };
}};
type Availability = { enabled: boolean };
const DEVICE_KEY = "smart_attendance_device_id";

function getDeviceId(): string {
  const previous = window.localStorage.getItem(DEVICE_KEY);
  if (previous && /^[0-9a-f-]{36}$/i.test(previous)) return previous;
  const id = window.crypto.randomUUID();
  window.localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function readQr(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const token = fragment.get("token") ?? readPendingStudentScan();
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  if (token) savePendingStudentScan(token);
  return token;
}

function position(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true, timeout: 12000, maximumAge: 0,
    });
  });
}

export function StudentScanView() {
  const [qr, setQr] = useState("");
  const [attendanceId, setAttendanceId] = useState("");
  const [localAllowed, setLocalAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ScanResult["data"] | null>(null);
  const activeRequest = useRef(false);

  useEffect(() => {
    setQr(readQr());
    void apiFetch<Availability>("/api/v1/attendance/local-scan-availability")
      .then((r) => setLocalAllowed(r.enabled))
      .catch(() => setLocalAllowed(false))
      .finally(() => setReady(true));
  }, []);

  const user = ready ? getStoredUser() : null;
  const signedIn = ready && Boolean(getToken());
  const student = user?.role?.toLowerCase() === "student";
  const canCheckIn = localAllowed || (signedIn && student);

  async function submit() {
    if (activeRequest.current || !qr || !canCheckIn) return;
    if (localAllowed && !/^[0-9]{9}$/.test(attendanceId)) {
      setError("Enter your unique nine-digit attendance ID, e.g. 000000001.");
      return;
    }
    activeRequest.current = true;
    setBusy(true); setError(""); setResult(null);
    try {
      if (!window.isSecureContext) throw new Error("Use the HTTPS link to allow GPS access on your phone.");
      setProgress("Checking classroom GPS location...");
      const gps = await position();
      setProgress("Submitting attendance...");
      const response = await apiFetch<ScanResult>(
        localAllowed ? "/api/v1/attendance/local-check-in" : "/api/v1/student/attendance/check-in", {
          method: "POST",
          body: {
            token: qr,
            ...(localAllowed ? { attendance_id: attendanceId, device_id: getDeviceId() } : {}),
            latitude: gps.coords.latitude,
            longitude: gps.coords.longitude,
            gps_accuracy_meters: gps.coords.accuracy,
          },
        });
      clearPendingStudentScan();
      setQr("");
      setResult(response.data);
    } catch (caught) {
      if (caught instanceof ApiError) {
        const reason = Object.values(caught.errors).flat()[0] ?? caught.message;
        if (localAllowed && caught.status === 409) {
          setError(/device/i.test(reason)
            ? "ឧបករណ៍នេះបានកត់វត្តមានរួចហើយក្នុង Session នេះ។ This browser has already checked in; use another unused test device."
            : "សិស្សនេះមានកំណត់ត្រាវត្តមានរួចហើយ។ Please choose a student marked Pending on the Teacher attendance page and enter their 9-digit Attendance ID.");
        } else {
          setError(reason);
        }
      } else if (typeof caught === "object" && caught !== null && "code" in caught) {
        const code = (caught as GeolocationPositionError).code;
        setError(code === 1 ? "Please allow your phone location permission."
          : code === 2 ? "GPS location is not available. Move near the classroom and try again."
          : "GPS timed out. Please try again.");
      } else setError(caught instanceof Error ? caught.message : "Check-in failed.");
    } finally {
      activeRequest.current = false;
      setBusy(false);
    }
  }

  return <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8 text-ink">
    <section className="w-full max-w-md rounded-panel border border-hairline bg-card shadow-lift">
      <header className="rounded-t-panel border-b border-hairline bg-brand-50 px-5 py-6 text-center">
        <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-panel bg-brand-600 text-white">
          {result ? <CheckCircle2 className="size-7" /> : <QrCode className="size-7" />}
        </span>
        <h1 className="font-display text-2xl font-extrabold">Student Attendance</h1>
        <p className="mt-1 text-sm text-muted">Scan QR · Verify location · Confirm</p>
      </header>
      <div className="space-y-4 p-5">
        {!ready ? <p role="status" className="text-sm text-muted">Preparing scanner...</p> :
          result ? <div role="status" className="space-y-2 rounded-control bg-emerald-500/10 p-5 text-center">
            <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
            <h2 className="text-lg font-bold text-emerald-600">Attendance recorded</h2>
            <p className="font-semibold">{result.student?.user?.name ?? "Student"}</p>
            <p>Result: <strong className="capitalize">{result.status}</strong></p>
            {result.checked_in_at && <p className="text-xs text-muted">{new Date(result.checked_in_at).toLocaleString("en-GB", { timeZone: "Asia/Phnom_Penh" })}</p>}
            <p className="text-xs text-muted">Teacher's attendance list will update automatically.</p>
          </div> : <>
            {!qr && <div role="alert" className="rounded-control border border-hairline p-4 text-sm"><ShieldAlert className="mb-2 size-6 text-amber-500"/>Scan your teacher's active QR code first.</div>}
            {qr && localAllowed && <div className="space-y-3">
              <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">Local development mode. Student ID alone is not secure authentication and is disabled in production.</p>
              <label htmlFor="student-attendance-id" className="block text-sm font-semibold">Your 9-digit Attendance ID</label>
              <input id="student-attendance-id" type="text" inputMode="numeric" pattern="[0-9]{9}" maxLength={9} autoComplete="off" placeholder="000000001"
                className="h-12 w-full rounded-control border border-hairline bg-card px-4 text-lg tracking-widest outline-none focus:border-brand-600"
                value={attendanceId} onChange={(e) => setAttendanceId(e.target.value.replace(/[^0-9]/g, "").slice(0, 9))} />
              <p className="text-xs text-muted">Each student ID and browser device can register only once for this class session.</p>
            </div>}
            {qr && !localAllowed && !signedIn && <div className="space-y-3 rounded-control bg-brand-50 p-4">
              <p className="font-semibold">Student account required</p>
              <Link className="flex h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 font-semibold text-white" href="/login"><LogIn className="size-4"/>Sign in as student</Link>
            </div>}
            {qr && !localAllowed && signedIn && !student && <p role="alert" className="rounded-control bg-danger-soft p-4 text-sm text-danger">Please use a Student account.</p>}
            {qr && canCheckIn && <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-control bg-canvas p-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600"/>
                <p className="text-sm text-muted">Allow GPS so the server can verify your classroom location.</p>
              </div>
              <Button disabled={busy || (localAllowed && attendanceId.length !== 9)} loading={busy} className="w-full" onClick={() => void submit()}>
                <LocateFixed className="size-4"/>{busy ? "Checking in..." : "Confirm Attendance"}
              </Button>
            </div>}
          </>}
        {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
        {busy && <p role="status" className="text-center text-xs text-muted">{progress}</p>}
        {!result && qr && <p className="flex items-center justify-center gap-2 text-xs text-muted"><Clock3 className="size-4"/>QR is valid until its one-hour session deadline.</p>}
      </div>
    </section>
  </main>;
}
