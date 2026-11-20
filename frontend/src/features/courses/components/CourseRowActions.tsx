"use client";

import { useRouter } from "next/navigation";
import { Eye, Pencil } from "lucide-react";
import type { Course } from "../types";

type Props = {
  course: Course;
  onEdit: () => void;
};

export function CourseRowActions({ course, onEdit }: Props) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => router.push(`/courses/${course.id}`)}
        aria-label={`View ${course.name}`}
        title="View course"
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Eye className="size-4" />
      </button>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${course.name}`}
        title="Edit course"
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Pencil className="size-4" />
      </button>
    </div>
  );
}
