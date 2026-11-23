"use client";

import { useEffect, useState } from "react";

export type BackendStatusState = "checking" | "connected" | "unavailable";
export type ConnectionCheckState = BackendStatusState | "unknown";
export type SystemHealthState = "checking" | "healthy" | "degraded" | "offline";
export type SystemHealth = {
  status: SystemHealthState;
  api: ConnectionCheckState;
  database: ConnectionCheckState;
};

const INITIAL_HEALTH: SystemHealth = {
  status: "checking",
  api: "checking",
  database: "checking",
};

export function useSystemHealth(): SystemHealth {
  const [health, setHealth] = useState<SystemHealth>(INITIAL_HEALTH);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("/api/v1/health", { cache: "no-store" });
        if (!response.ok) throw new Error("Health endpoint unavailable");
        const payload = await response.json() as {
          status?: string;
          checks?: { api?: { status?: string }; database?: { status?: string } };
        };
        const api = payload.checks?.api?.status === "connected"
          ? "connected"
          : payload.checks?.api?.status === "unavailable" ? "unavailable" : "unknown";
        const database = payload.checks?.database?.status === "connected"
          ? "connected"
          : payload.checks?.database?.status === "unavailable" ? "unavailable" : "unknown";
        const status: SystemHealthState = api === "unavailable"
          ? "offline"
          : api === "connected" && database === "connected" && payload.status === "ok"
            ? "healthy"
            : "degraded";
        if (active) setHealth({ status, api, database });
      } catch {
        if (active) setHealth({ status: "offline", api: "unavailable", database: "unknown" });
      }
    };

    void check();
    const interval = window.setInterval(() => void check(), 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return health;
}

/** Legacy API-only status used by the sign-in screen. */
export function useBackendStatus(): BackendStatusState {
  const health = useSystemHealth();
  if (health.api === "checking") return "checking";
  return health.api === "connected" ? "connected" : "unavailable";
}
