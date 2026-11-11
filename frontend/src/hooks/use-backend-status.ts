"use client";

import { useEffect, useState } from "react";

export type BackendStatusState = "checking" | "connected" | "unavailable";

export function useBackendStatus(): BackendStatusState {
  const [status, setStatus] = useState<BackendStatusState>("checking");

  useEffect(() => {
    fetch("/api/v1/health")
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
  }, []);

  return status;
}
