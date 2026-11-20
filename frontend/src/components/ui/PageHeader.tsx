"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const { t } = useLocale();
  return (
    <div className="animate-fade-up mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink lg:text-3xl">
          {t(title)}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-xl text-sm text-muted">{t(description)}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
