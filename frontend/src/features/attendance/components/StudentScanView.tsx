"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, LocateFixed, LogIn, MapPin, QrCode, ShieldAlert } from "lucide-react";
import { ApiError, apiFetch } from "@/lib/api/client";
import { getStoredUser, getToken } from "@/lib/api/session";
import { clearPendingStudentScan, readPendingStudentScan, savePendingStudentScan } from "../studentScanPending";
import { Button } from "@/components/ui/Button";

type ScanResult = {
  data: {
    id: number;
    status: "present" | "late";
    checked_in_at: string | null;
    session?: {
      starts_at: string;
      closes_at: string;
      session_ends_at?: string | null;
      class_section?: { section_code?: string; course?: { name?: string } };
    } | null;
    student?: { user?: { name: string } };
  };
};

function readQrTokenFromUrl(): string {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = hash.get("token") ?? readPendingStudentScan();
  // Remove the credential from browser history after reading it.
  if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  if (token) savePendingStudentScan(token);
  return token;
}

function requestPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GPS is unavailable. Use a mobile browser with location services enabled."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });
}

export function StudentScanView() {
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult["data"] | null>(null);
  const [status, setStatus] = useState("Ready to confirm your classroom location.");
  const requestPending = useRef(false);

  useEffect(() => {
    setToken(readQrTokenFromUrl());
    setReady(true);
  }, []);

  const user = ready ? getStoredUser() : null;
  const signedIn = ready && Boolean(getToken());
  const isStudent = user?.role?.toLowerCase() === "student";

  async function checkIn() {
    if (requestPending.current || !token || !signedIn || !isStudent) return;
    requestPending.current = true;
    setBusy(true);
    setError("");
    setResult(null);

    try {
      if (!window.isSecureContext) {
        throw new Error("Phone check-in needs HTTPS to request your location. Open the QR with an HTTPS address.");
      }
      setStatus("Requesting your phone's location...");
      const position = await requestPosition();
      setStatus("Submitting your QR check-in securely...");
      const response = await apiFetch<ScanResult>("/api/v1/student/attendance/check-in", {
        method: "POST",
        body: {
          token,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          gps_accuracy_meters: position.coords.accuracy,
        },
      });
      clearPendingStudentScan();
      setToken("");
      setResult(response.data);
      setStatus("Attendance saved successfully.");
    } catch (caught) {
      if (caught instanceof ApiError) {
        const detail = Object.values(caught.errors).flat()[0];
        setError(detail ?? caught.message);
      } else if (typeof caught === "object" && caught !== null && "code" in caught) {
        const code = (caught as GeolocationPositionError).code;
        setError(code === 1
          ? "Location permission was denied. Enable location access and try again."
          : code === 2
            ? "Your phone could not determine its location. Enable GPS and try again."
            : "Location request timed out. Try again near your classroom.");
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to check in. Please try again.");
      }
      setStatus("Check-in was not recorded.");
    } finally {
      setBusy(false);
      requestPending.current = false;
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-8 text-ink">
      <section className="w-full max-w-md overflow-hidden rounded-panel border border-hairline bg-card shadow-lift">
        <div className="border-b border-hairline bg-brand-50 px-5 py-6 text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-panel bg-brand-600 text-white">
            {result ? <CheckCircle2 className="size-7" /> : <QrCode className="size-7" />}
          </span>
          <h1 className="font-display text-2xl font-extrabold">Student QR Check-in</h1>
          <p className="mt-2 text-sm text-muted">Smart Attendance · Secure classroom verification</p>
        </div>

        <div className="space-y-4 p-5">
          {!ready ? <p role="status" className="text-center text-sm text-muted">Loading your check-in...</p> :
            result ? (
              <div role="status" className="space-y-3 rounded-control border border-emerald-500/20 bg-emerald-500/10 p-5 text-center">
                <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
                <h2 className="text-lg font-bold text-emerald-500">Attendance recorded</h2>
                <p className="text-sm font-semibold">{result.student?.user?.name ?? user?.name ?? "Student"}</p>
                <p className="text-sm">Status: <strong className="capitalize">{result.status}</strong></p>
                {result.session?.class_section?.course?.name && <p className="text-xs text-muted">{result.session.class_section.course.name}</p>}
                {result.checked_in_at && <p className="text-xs text-muted">{new Date(result.checked_in_at).toLocaleString("en-GB", { timeZone: "Asia/Phnom_Penh", dateStyle: "medium", timeStyle: "short" })}</p>}
                <p className="text-xs text-muted">Your Telegram classroom notification is sent separately when configured.</p>
              </div>
            ) : (
              <>
                {!token && (
                  <div role="alert" className="rounded-control border border-hairline p-4 text-sm">
                    <ShieldAlert className="mb-2 size-6 text-amber-500" />
                    No QR token found. Scan the current QR displayed by your teacher using your phone camera.
                  </div>
                )}
                {token && !signedIn && (
                  <div className="space-y-3 rounded-control border border-brand-400/20 bg-brand-50 p-4">
                    <p className="font-semibold">Student sign-in required</p>
                    <p className="text-sm text-muted">Sign in with your student account, then return to this QR check-in. Your code expires quickly, so rescan if needed.</p>
                    <Link href="/login" className="flex h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
                      <LogIn className="size-4" /> Sign in as Student
                    </Link>
                  </div>
                )}
                {token && signedIn && !isStudent && (
                  <p role="alert" className="rounded-control bg-danger-soft p-4 text-sm text-danger">
                    This QR can only be used by a student account. Please sign in as a student.
                  </p>
                )}
                {token && signedIn && isStudent && (
                  <div className="space-y-3">
                    <p className="text-center text-sm font-semibold">Welcome, {user?.name}</p>
                    <div className="flex items-start gap-3 rounded-control bg-canvas p-3">
                      <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" />
                      <p className="text-sm text-muted">Your phone will ask for your current location. You must be inside the classroom's allowed radius to check in.</p>
                    </div>
                    <Button block disabled={busy} loading={busy} className="w-full" onClick={() => void checkIn()}>
                      <LocateFixed className="size-4" /> {busy ? "Checking in..." : "Confirm attendance"}
                    </Button>
                  </div>
                )}
              </>
            )}

          {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
          {busy && <p role="status" className="text-center text-xs text-muted">{status}</p>}
          {!result && token && <p className="flex items-start justify-center gap-2 text-center text-xs text-muted"><Clock3 className="mt-0.5 size-3.5 shrink-0" /> QR codes expire after 30 seconds. Scan a fresh code if yours has expired.</p>}
          <div className="border-t border-hairline pt-4 text-center">
            <Link href={signedIn && isStudent ? "/student/scan" : "/login"} className="text-xs font-semibold text-brand-600 hover:underline">Smart Attendance</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
