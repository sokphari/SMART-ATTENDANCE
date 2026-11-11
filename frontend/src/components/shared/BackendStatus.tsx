"use client";

import {
  useBackendStatus,
  type BackendStatusState,
} from "@/hooks/use-backend-status";
import { cx } from "@/lib/utils/cx";

const TONES: Record<BackendStatusState, { chip: string; dot: string; label: string }> = {
  checking: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500 animate-pulse",
    label: "Checking API...",
  },
  connected: {
    chip: "border-success/20 bg-success-soft text-success",
    dot: "bg-success",
    label: "API online",
  },
  unavailable: {
    chip: "border-danger/20 bg-danger-soft text-danger",
    dot: "bg-danger",
    label: "API offline",
  },
};

export function BackendStatus() {
  const status = useBackendStatus();
  const tone = TONES[status];

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-xs font-bold",
        tone.chip,
      )}
    >
      <span className={cx("size-2 rounded-pill", tone.dot)} />
      {tone.label}
    </span>
  );
}
