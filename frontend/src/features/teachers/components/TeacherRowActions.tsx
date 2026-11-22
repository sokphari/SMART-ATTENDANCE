"use client";

import { useLocale } from "@/i18n/LocaleProvider";

import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import type { Teacher } from "../types";

type Props = {
  teacher: Teacher;
  onEdit: () => void;
};

export function TeacherRowActions({ teacher, onEdit }: Props) {
  const { t } = useLocale();
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        aria-label={`View profile for ${teacher.user?.name ?? "teacher"}`}
        title={t("View profile")}
        onClick={() => router.push(`/teachers/${teacher.id}`)}
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Eye className="size-4.5" />
      </button>
      <button
        type="button"
        aria-label={`Edit ${teacher.user?.name ?? "teacher"}`}
        title={t("Edit teacher")}
        onClick={onEdit}
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Pencil className="size-4.5" />
      </button>
    </div>
  );
}
