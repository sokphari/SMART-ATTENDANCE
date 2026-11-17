
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Pencil,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { updateCourse } from "../api";
import type { Course } from "../types";

type Props = {
  course: Course;
  onEdit: () => void;
  onUpdated: (course: Course) => void;
  onFeedback: (
    message: string,
    kind: "success" | "error"
  ) => void;
};

export function CourseRowActions({
  course,
  onEdit,
  onUpdated,
  onFeedback,
}: Props) {
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const dialog = useRef<HTMLDialogElement>(null);
  const isActive = course.status === "active";

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (confirmOpen && !element.open) {
      element.showModal();
    } else if (!confirmOpen && element.open) {
      element.close();
    }
  }, [confirmOpen]);

  async function toggleStatus() {
    if (saving) return;

    setSaving(true);

    const nextStatus = isActive ? "inactive" : "active";

    try {
      const result = await updateCourse(course.id, {
        status: nextStatus,
      });

      onUpdated(result.data);

      onFeedback(
        `${course.name} ${
          nextStatus === "active"
            ? "reactivated"
            : "deactivated"
        }.`,
        "success"
      );

      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(
        caught instanceof ApiError
          ? caught.message
          : "Could not update course status.",
        "error"
      );

      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {/* View */}
      <button
        type="button"
        onClick={() => router.push(`/courses/${course.id}`)}
        disabled={saving}
        aria-label={`View ${course.name}`}
        title="View course"
        className="
          inline-flex size-9 items-center justify-center
          rounded-lg border border-slate-500/20
          bg-slate-500/10 text-slate-400
          transition-colors
          hover:bg-slate-500/20 hover:text-slate-200
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-slate-500
          disabled:cursor-not-allowed disabled:opacity-50
        "
      >
        <Eye className="size-4" />
      </button>

      {/* Edit */}
      <button
        type="button"
        onClick={onEdit}
        disabled={saving}
        aria-label={`Edit ${course.name}`}
        title="Edit course"
        className="
          inline-flex size-9 items-center justify-center
          rounded-lg border border-blue-500/20
          bg-blue-500/10 text-blue-400
          transition-colors
          hover:bg-blue-500/20 hover:text-blue-300
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500
          disabled:cursor-not-allowed disabled:opacity-50
        "
      >
        <Pencil className="size-4" />
      </button>

      {/* Active / Inactive */}
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={saving}
        aria-label={`${
          isActive ? "Deactivate" : "Reactivate"
        } ${course.name}`}
        title={
          isActive
            ? "Deactivate course"
            : "Reactivate course"
        }
        className={`
          inline-flex size-9 items-center justify-center
          rounded-lg border transition-colors
          focus-visible:outline-none focus-visible:ring-2
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            isActive
              ? "border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20 focus-visible:ring-green-500"
              : "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20 focus-visible:ring-red-500"
          }
        `}
      >
        {isActive ? (
          <ToggleRight className="size-5" />
        ) : (
          <ToggleLeft className="size-5" />
        )}
      </button>

      {/* Confirmation dialog */}
      <dialog
        ref={dialog}
        aria-labelledby={`course-status-title-${course.id}`}
        aria-describedby={`course-status-description-${course.id}`}
        onCancel={(event) => {
          if (saving) {
            event.preventDefault();
          } else {
            setConfirmOpen(false);
          }
        }}
        onClose={() => setConfirmOpen(false)}
        className="
          m-auto w-[min(92vw,28rem)]
          rounded-panel border border-hairline
          bg-card p-0 text-ink shadow-lift
          backdrop:bg-ink/45
        "
      >
        <div className="p-6">
          <h2
            id={`course-status-title-${course.id}`}
            className="font-display text-lg font-bold"
          >
            {isActive
              ? "Deactivate course?"
              : "Reactivate course?"}
          </h2>

          <p
            id={`course-status-description-${course.id}`}
            className="mt-2 text-sm leading-relaxed text-muted"
          >
            {isActive
              ? `${course.name} will be marked inactive. Existing class records are preserved.`
              : `${course.name} will be available for use again.`}
          </p>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant={isActive ? "danger" : "primary"}
              loading={saving}
              onClick={() => void toggleStatus()}
            >
              {isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
