import { AlertCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/utils/cx";

type InputProps = ComponentProps<"input"> & {
  label?: string;
  error?: string;
  action?: ReactNode;
};

export function Input({
  label,
  error,
  action,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-ink"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          className={cx(
            "h-11 w-full rounded-control border bg-card px-3.5 text-sm text-ink outline-none transition-all duration-200 placeholder:text-slate-400 focus-visible:ring-4",
            action && "pr-12",
            error
              ? "border-danger focus-visible:border-danger focus-visible:ring-red-100"
              : "border-hairline hover:border-brand-300 focus-visible:border-brand-500 focus-visible:ring-brand-100",
            className,
          )}
          {...props}
        />
        {action && (
          <div className="absolute top-1/2 right-2 -translate-y-1/2">
            {action}
          </div>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
          <AlertCircle className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
