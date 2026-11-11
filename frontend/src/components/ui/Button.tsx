import type { ComponentProps } from "react";
import { cx } from "@/lib/utils/cx";
import { Spinner } from "./Spinner";

const BUTTON_VARIANTS = {
  primary:
    "bg-brand-600 text-white shadow-soft hover:bg-brand-700 hover:shadow-lift active:scale-[0.98]",
  secondary:
    "border border-hairline bg-card text-ink shadow-xs hover:border-brand-300 hover:text-brand-700",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-danger text-white hover:bg-red-700 active:scale-[0.98]",
} as const;

const BUTTON_SIZES = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
} as const;

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-semibold transition-all duration-200 select-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:pointer-events-none disabled:opacity-60",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
