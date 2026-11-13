"use client";

import { useEffect, useState } from "react";

export type BackendStatusState = "checking" | "connected" | "unavailable";

export function useBackendStatus(): BackendStatusState {
  const [status, setStatus] = useState<BackendStatusState>("checking");

  useEffect(() => {
    const check = () => fetch("/api/v1/health", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Backend health check failed");
        }

        return response.json();
      })
      .then((payload) => {
        setStatus(payload.status === "ok" ? "connected" : "unavailable");
      })
      .catch(() => {
        setStatus("unavailable");
      });

    check();
    const interval = window.setInterval(check, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return status;
}
