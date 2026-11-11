"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Power } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { updateCourse } from "../api";
import type { Course } from "../types";

type Props = { course: Course; onEdit: () => void; onUpdated: (course: Course) => void; onFeedback: (message: string, kind: "success" | "error") => void };

export function CourseRowActions({ course, onEdit, onUpdated, onFeedback }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (confirmOpen && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!confirmOpen && dialog.current?.open) dialog.current.close();
  }, [confirmOpen]);

  async function toggleStatus() {
    setSaving(true);
    const status = course.status === "active" ? "inactive" : "active";
    try {
      const result = await updateCourse(course.id, { status });
      onUpdated(result.data);
      onFeedback(`${course.name} marked ${status}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update course status.", "error");
      setConfirmOpen(false);
    } finally { setSaving(false); }
  }

  return <div className="flex items-center justify-end gap-2">
    <Button variant="secondary" size="sm" aria-label={`View ${course.name}`} onClick={() => router.push(`/courses/${course.id}`)}><Eye className="size-4" /></Button>
    <Button variant="secondary" size="sm" aria-label={`Edit ${course.name}`} onClick={onEdit}><Pencil className="size-4" /></Button>
    <Button variant="ghost" size="sm" aria-label={course.status === "active" ? `Deactivate ${course.name}` : `Reactivate ${course.name}`} onClick={() => setConfirmOpen(true)}><Power className="size-4" /></Button>
    <dialog ref={dialog} aria-labelledby={`course-status-title-${course.id}`} aria-describedby={`course-status-description-${course.id}`} onCancel={(event) => { event.preventDefault(); if (!saving) setConfirmOpen(false); }} onClose={() => { if (confirmOpen) setConfirmOpen(false); }} className="m-auto w-[min(92vw,28rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/45">
      <div className="p-6"><h2 id={`course-status-title-${course.id}`} className="font-display text-lg font-bold">{course.status === "active" ? "Deactivate course?" : "Reactivate course?"}</h2><p id={`course-status-description-${course.id}`} className="mt-2 text-sm leading-relaxed text-muted">{course.status === "active" ? `${course.name} will be marked inactive. Existing class records are preserved.` : `${course.name} will be available for use again.`}</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</Button><Button variant={course.status === "active" ? "danger" : "primary"} loading={saving} onClick={() => void toggleStatus()}>{course.status === "active" ? "Deactivate" : "Reactivate"}</Button></div></div>
    </dialog>
  </div>;
}
