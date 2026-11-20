import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/**
 * Compact, accessible navigation for pages and multi-step workflows.
 * Each item can be a route link, an in-page action, or a read-only label.
 */
export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`mb-3 ${className}`}>
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          const itemClass =
            "inline-block max-w-[180px] truncate align-bottom sm:max-w-none";

          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-2"
            >
              {index > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted"
                  aria-hidden="true"
                />
              )}

              {isCurrent ? (
                <span
                  aria-current="page"
                  className={`${itemClass} font-semibold text-ink`}
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className={`${itemClass} text-muted transition-colors hover:text-brand-600 focus-visible:underline`}
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={`${itemClass} text-left text-muted transition-colors hover:text-brand-600 focus-visible:underline disabled:cursor-not-allowed disabled:opacity-60`}
                  title={item.label}
                >
                  {item.label}
                </button>
              ) : (
                <span className={`${itemClass} text-muted`} title={item.label}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
