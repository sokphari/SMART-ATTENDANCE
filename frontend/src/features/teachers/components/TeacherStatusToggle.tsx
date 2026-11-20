"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { updateTeacher } from "../api";
import type { Teacher } from "../types";

type Props = {
  teacher: Teacher;
  onUpdated: (teacher: Teacher) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

export function TeacherStatusToggle({ teacher, onUpdated, onFeedback }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isActive = teacher.user?.status === "active";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (confirmOpen && dialog && !dialog.open) dialog.showModal();
    if (!confirmOpen && dialog?.open) dialog.close();
  }, [confirmOpen]);

  async function updateStatus() {
    setSaving(true);
    const status = isActive ? "inactive" : "active";
    try {
      const result = await updateTeacher(teacher.id, { status });
      onUpdated(result.data);
      onFeedback(`${teacher.user?.name ?? "Teacher"} ${isActive ? "deactivated" : "activated"}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update teacher status.", "error");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="switch"
        aria-checked={isActive}
        aria-label={`${isActive ? "Deactivate" : "Activate"} ${teacher.user?.name ?? "teacher"}`}
        title={isActive ? "Deactivate teacher" : "Activate teacher"}
        onClick={() => setConfirmOpen(true)}
        className="inline-flex h-10 min-w-[132px] touch-manipulation items-center gap-3 rounded-full border border-slate-700 bg-slate-900 px-3 text-sm font-bold text-white shadow-[inset_0_1px_3px_rgba(255,255,255,0.12),0_2px_8px_rgba(2,8,23,0.25)] transition-colors hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <span className={`relative flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${isActive ? "bg-green-500 shadow-[inset_0_0_8px_rgba(255,255,255,0.22)]" : "bg-slate-600"}`}>
          <span className={`size-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] transition-transform ${isActive ? "translate-x-5" : "translate-x-0"}`} />
        </span>
        {isActive ? "Active" : "Inactive"}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`teacher-status-title-${teacher.id}`}
        aria-describedby={`teacher-status-description-${teacher.id}`}
        onCancel={(event) => { event.preventDefault(); if (!saving) setConfirmOpen(false); }}
        onClose={() => {
          if (confirmOpen) setConfirmOpen(false);
          requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        className="m-auto w-[min(92vw,28rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/45"
      >
        <div className="p-6">
          <h2 id={`teacher-status-title-${teacher.id}`} className="font-display text-lg font-bold">{isActive ? "Deactivate teacher?" : "Reactivate teacher?"}</h2>
          <p id={`teacher-status-description-${teacher.id}`} className="mt-2 text-sm leading-relaxed text-muted">
            {isActive ? `${teacher.user?.name ?? "This teacher"} will lose active account access. Their teaching records will remain.` : `${teacher.user?.name ?? "This teacher"} will regain active account access.`}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="secondary" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button type="button" variant={isActive ? "danger" : "primary"} loading={saving} onClick={() => void updateStatus()}>{isActive ? "Deactivate" : "Reactivate"}</Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
