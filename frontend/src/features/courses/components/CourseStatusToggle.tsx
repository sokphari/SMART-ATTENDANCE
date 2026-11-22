"use client";

import { useRef, useState } from "react";
import { StatusConfirmationDialog, StatusSwitch } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { updateCourse } from "../api";
import type { Course } from "../types";

type Props = {
  course: Course;
  onUpdated: (course: Course) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

export function CourseStatusToggle({ course, onUpdated, onFeedback }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isActive = course.status === "active";

  async function updateStatus() {
    setSaving(true);
    const status = isActive ? "inactive" : "active";
    try {
      const result = await updateCourse(course.id, { status });
      onUpdated(result.data);
      onFeedback(`${course.name} ${isActive ? "deactivated" : "reactivated"}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update course status.", "error");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <StatusSwitch triggerRef={triggerRef} checked={isActive} loading={saving} accessibleLabel={course.name} onToggle={() => setConfirmOpen(true)} />
    <StatusConfirmationDialog
      open={confirmOpen}
      title={isActive ? "Deactivate course?" : "Reactivate course?"}
      description={isActive ? "The course will be marked inactive. Existing class records are preserved." : "The course will be available for use again."}
      confirmLabel={isActive ? "Deactivate" : "Reactivate"}
      loading={saving}
      triggerRef={triggerRef}
      onConfirm={() => void updateStatus()}
      onClose={() => setConfirmOpen(false)}
    />
  </>;
}
