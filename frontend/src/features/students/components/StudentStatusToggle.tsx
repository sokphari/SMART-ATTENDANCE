"use client";

import { useRef, useState } from "react";
import { StatusConfirmationDialog, StatusSwitch } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { updateStudent } from "../api";
import type { Student } from "../types";

type Props = {
  student: Student;
  onUpdated: (student: Student) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

export function StudentStatusToggle({ student, onUpdated, onFeedback }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isActive = student.user?.status === "active";

  async function updateStatus() {
    setSaving(true);
    const status = isActive ? "inactive" : "active";
    try {
      const response = await updateStudent(student.id, { status });
      onUpdated(response.data);
      onFeedback(`${student.user?.name ?? "Student"} ${isActive ? "deactivated" : "activated"}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update student status.", "error");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <StatusSwitch triggerRef={triggerRef} checked={isActive} loading={saving} accessibleLabel={student.user?.name ?? "Student"} onToggle={() => setConfirmOpen(true)} />
    <StatusConfirmationDialog
      open={confirmOpen}
      title={isActive ? "Deactivate this student?" : "Activate this student?"}
      description={isActive ? "This student will lose active account access until activated again." : "This student will regain active account access."}
      confirmLabel={isActive ? "Deactivate student" : "Activate student"}
      loading={saving}
      triggerRef={triggerRef}
      onConfirm={() => void updateStatus()}
      onClose={() => setConfirmOpen(false)}
    />
  </>;
}
