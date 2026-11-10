"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "connected" | "unavailable";

export function BackendStatus() {
  const [status, setStatus] = useState<Status>("checking");

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

  return (
    <div className={`status status-${status}`}>
      <span className="status-dot" />
      <span>
        {status === "checking" && "Checking backend..."}
        {status === "connected" && "Backend connected"}
        {status === "unavailable" && "Backend unavailable"}
      </span>
    </div>
  );
}
