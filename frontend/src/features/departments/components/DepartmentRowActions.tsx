"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { Pencil } from "lucide-react";
import type { Department } from "../types";

type Props = {
  department: Department;
  onEdit: () => void;
};

export function DepartmentRowActions({ department, onEdit }: Props) {
  const { t } = useLocale();
  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${department.name}`}
        title={t("Edit department")}
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Pencil className="size-4" />
      </button>
    </div>
  );
}
