"use client";

import { StatusSelect, type StatusOption } from "./StatusSelect";

export function StatusFilter(props: { value: string; options: StatusOption[]; onChange: (value: string) => void; label?: string; className?: string }) {
  return <StatusSelect {...props} label={props.label ?? "Filter by status"} includeAll />;
}
