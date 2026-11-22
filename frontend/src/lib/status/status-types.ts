export type StatusContext =
  | "account"
  | "resource"
  | "class"
  | "enrollment"
  | "attendance"
  | "session"
  | "correction"
  | "academic-period"
  | "teaching";

export type StatusTone = "success" | "danger" | "warning" | "info" | "neutral";

export type StatusDefinition = {
  label: string;
  tone: StatusTone;
  icon: "check" | "close" | "clock" | "info" | "pause" | "play" | "calendar";
};
