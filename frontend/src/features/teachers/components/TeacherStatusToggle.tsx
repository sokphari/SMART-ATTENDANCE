"use client";

import { useRef, useState } from "react";
import { StatusConfirmationDialog, StatusSwitch } from "@/components/ui/status";
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
  const isActive = teacher.user?.status === "active";

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

  return <>
    <StatusSwitch triggerRef={triggerRef} checked={isActive} loading={saving} accessibleLabel={teacher.user?.name ?? "Teacher"} onToggle={() => setConfirmOpen(true)} />
    <StatusConfirmationDialog
      open={confirmOpen}
      title={isActive ? "Deactivate teacher?" : "Reactivate teacher?"}
      description={isActive ? "This teacher will lose active account access. Their teaching records will remain." : "This teacher will regain active account access."}
      confirmLabel={isActive ? "Deactivate" : "Reactivate"}
      loading={saving}
      triggerRef={triggerRef}
      onConfirm={() => void updateStatus()}
      onClose={() => setConfirmOpen(false)}
    />
  </>;
}
