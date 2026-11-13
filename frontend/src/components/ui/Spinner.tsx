import { cx } from "@/lib/utils/cx";

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-block animate-spin rounded-pill border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}
