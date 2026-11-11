import type { ComponentProps } from "react";
import { cx } from "@/lib/utils/cx";

const BADGE_TONES = {
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-slate-100 text-slate-600",
} as const;

type BadgeProps = ComponentProps<"span"> & {
  tone?: keyof typeof BADGE_TONES;
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-xs font-bold",
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
