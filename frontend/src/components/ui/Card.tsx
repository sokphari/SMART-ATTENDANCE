import type { ComponentProps } from "react";
import { cx } from "@/lib/utils/cx";

type CardProps = ComponentProps<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-card border border-hairline bg-card shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
