/**
 * The QR opens a phone-friendly HTTPS page. The token lives in the URL hash,
 * not the query string, so it is never sent to the web server or access logs.
 * The server still enforces the 30-second expiry, enrollment and GPS checks.
 */
export function studentScanUrl(token: string, browserOrigin: string, configuredBase?: string): string {
  let origin: URL;
  try {
    origin = new URL(configuredBase?.trim() || browserOrigin);
  } catch {
    origin = new URL(browserOrigin);
  }
  if (origin.protocol !== "http:" && origin.protocol !== "https:") {
    origin = new URL(browserOrigin);
  }
  const url = new URL("/student/scan", origin);
  url.hash = new URLSearchParams({ token }).toString();
  return url.toString();
}

export function phoneScanUrlWarning(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname)) {
      return "This QR points to localhost on your computer. For phone scanning, set NEXT_PUBLIC_STUDENT_SCAN_BASE_URL to an HTTPS address accessible from your phone, then rebuild the frontend.";
    }
    if (parsed.protocol !== "https:") {
      return "Phone geolocation requires HTTPS (except localhost on the same device). Use an HTTPS address to allow GPS check-in.";
    }
  } catch {
    return "The student scan URL is invalid.";
  }
  return null;
}
