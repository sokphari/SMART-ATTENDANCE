"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, UserRoundX } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { updateTeacher } from "../api";
import type { Teacher } from "../types";

type Props = {
  teacher: Teacher;
  onEdit: () => void;
  onUpdated: (teacher: Teacher) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

export function TeacherRowActions({ teacher, onEdit, onUpdated, onFeedback }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const active = teacher.user?.status === "active";

  useEffect(() => {
    if (confirmOpen && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!confirmOpen && dialog.current?.open) dialog.current.close();
  }, [confirmOpen]);

  async function updateStatus() {
    setSaving(true);
    const status = active ? "inactive" : "active";
    try {
      const result = await updateTeacher(teacher.id, { status });
      onUpdated(result.data);
      onFeedback(`${teacher.user?.name ?? "Teacher"} ${active ? "deactivated" : "reactivated"}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update teacher status.", "error");
      setConfirmOpen(false);
    } finally { setSaving(false); }
  }

  return <div className="flex items-center justify-end gap-2">
    <Button variant="secondary" size="sm" onClick={() => router.push(`/teachers/${teacher.id}`)}><Eye className="size-4" /><span className="sr-only sm:not-sr-only">View</span></Button>
    <Button variant="secondary" size="sm" onClick={onEdit}><Pencil className="size-4" /><span className="sr-only sm:not-sr-only">Edit</span></Button>
    <Button variant="ghost" size="sm" aria-label={active ? `Deactivate ${teacher.user?.name}` : `Reactivate ${teacher.user?.name}`} onClick={() => setConfirmOpen(true)}><UserRoundX className="size-4" /></Button>
    <dialog ref={dialog} aria-labelledby={`teacher-status-title-${teacher.id}`} aria-describedby={`teacher-status-description-${teacher.id}`} onCancel={(event) => { event.preventDefault(); if (!saving) setConfirmOpen(false); }} onClose={() => { if (confirmOpen) setConfirmOpen(false); }} className="m-auto w-[min(92vw,28rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/45">
      <div className="p-6"><h2 id={`teacher-status-title-${teacher.id}`} className="font-display text-lg font-bold">{active ? "Deactivate teacher?" : "Reactivate teacher?"}</h2><p id={`teacher-status-description-${teacher.id}`} className="mt-2 text-sm leading-relaxed text-muted">{active ? `${teacher.user?.name ?? "This teacher"} will lose active account access. Their teaching records will remain.` : `${teacher.user?.name ?? "This teacher"} will regain active account access.`}</p><div className="mt-6 flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</Button><Button variant={active ? "danger" : "primary"} loading={saving} onClick={() => void updateStatus()}>{active ? "Deactivate" : "Reactivate"}</Button></div></div>
    </dialog>
  </div>;
}
