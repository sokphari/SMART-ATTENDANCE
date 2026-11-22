import type { StatusContext, StatusDefinition } from "./status-types";

const SHARED: Record<string, StatusDefinition> = {
  active: { label: "Active", tone: "success", icon: "check" },
  inactive: { label: "Inactive", tone: "neutral", icon: "pause" },
  suspended: { label: "Suspended", tone: "danger", icon: "close" },
  pending: { label: "Pending", tone: "warning", icon: "clock" },
  unmarked: { label: "Pending", tone: "warning", icon: "clock" },
  pending_setup: { label: "Setup needed", tone: "warning", icon: "info" },
  upcoming: { label: "Upcoming", tone: "info", icon: "calendar" },
  completed: { label: "Completed", tone: "neutral", icon: "check" },
  cancelled: { label: "Cancelled", tone: "danger", icon: "close" },
  scheduled: { label: "Scheduled", tone: "info", icon: "calendar" },
  open: { label: "Open", tone: "success", icon: "play" },
  closed: { label: "Closed", tone: "neutral", icon: "pause" },
  present: { label: "Present", tone: "success", icon: "check" },
  absent: { label: "Absent", tone: "danger", icon: "close" },
  late: { label: "Late", tone: "warning", icon: "clock" },
  excused: { label: "Excused", tone: "info", icon: "info" },
  enrolled: { label: "Enrolled", tone: "success", icon: "check" },
  dropped: { label: "Dropped", tone: "neutral", icon: "close" },
  approved: { label: "Approved", tone: "success", icon: "check" },
  rejected: { label: "Rejected", tone: "danger", icon: "close" },
  in_progress: { label: "In progress", tone: "info", icon: "play" },
};

const CONTEXTUAL: Partial<Record<StatusContext, Record<string, StatusDefinition>>> = {
  enrollment: {
    completed: { label: "Completed", tone: "info", icon: "check" },
  },
  "academic-period": {
    completed: { label: "Completed", tone: "neutral", icon: "check" },
  },
};

export function getStatusDefinition(status: string | null | undefined, context?: StatusContext): StatusDefinition {
  const value = (status ?? "").trim().toLowerCase();
  return CONTEXTUAL[context ?? "resource"]?.[value]
    ?? SHARED[value]
    ?? { label: value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unknown", tone: "neutral", icon: "info" };
}
