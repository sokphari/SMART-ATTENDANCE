export const PENDING_STUDENT_SCAN_KEY = "smart_attendance_pending_student_qr";

/** Used only on the same browser tab while completing student sign-in. */
export function hasPendingStudentScan(): boolean {
  if (typeof window === "undefined") return false;
  try { return Boolean(window.sessionStorage.getItem(PENDING_STUDENT_SCAN_KEY)); }
  catch { return false; }
}

export function readPendingStudentScan(): string {
  if (typeof window === "undefined") return "";
  try { return window.sessionStorage.getItem(PENDING_STUDENT_SCAN_KEY) ?? ""; }
  catch { return ""; }
}

export function savePendingStudentScan(token: string): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(PENDING_STUDENT_SCAN_KEY, token); } catch {}
}

export function clearPendingStudentScan(): void {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.removeItem(PENDING_STUDENT_SCAN_KEY); } catch {}
}
