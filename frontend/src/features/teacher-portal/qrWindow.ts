import type { TeacherAttendanceSession } from "./types";

type SessionClock = Pick<TeacherAttendanceSession, "status" | "starts_at" | "closes_at">;

export type QrWindowPhase = "upcoming" | "active" | "waiting" | "ended" | "unavailable";

/**
 * Attendance-session status and QR check-in availability are distinct.
 * A session can be open for review while QR check-in is not yet available
 * or has already ended. Never use UI status as authorization: the backend
 * enforces the check-in window for every QR token.
 */
export function getQrWindowPhase(session: SessionClock | null, nowMs: number): QrWindowPhase {
  if (!session) return "unavailable";
  const startsAt = Date.parse(session.starts_at);
  const closesAt = Date.parse(session.closes_at);

  if (!Number.isFinite(startsAt) || !Number.isFinite(closesAt) || closesAt <= startsAt) {
    return "unavailable";
  }
  if (session.status === "closed" || session.status === "cancelled") return "ended";
  if (nowMs < startsAt) return "upcoming";
  if (nowMs >= closesAt) return "ended";
  if (session.status !== "open") return "waiting";
  return "active";
}

export function secondsUntil(timestamp: string, nowMs: number): number {
  return Math.max(0, Math.ceil((Date.parse(timestamp) - nowMs) / 1000) || 0);
}

export function readableCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${hours}h ${minutes}m ${remainingSeconds}s`
    : `${minutes}m ${remainingSeconds}s`;
}
