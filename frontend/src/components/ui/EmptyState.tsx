import type { ComponentType, ReactNode } from "react";

export type IconType = ComponentType<{ className?: string }>;

type EmptyStateProps = {
  icon?: IconType;
  title: string;
  description?: string;
  children?: ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-panel bg-brand-50 text-brand-600">
        {Icon && <Icon className="size-6" />}
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
