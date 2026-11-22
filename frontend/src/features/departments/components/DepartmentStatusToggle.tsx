"use client";

import { useRef, useState } from "react";
import { StatusConfirmationDialog, StatusSwitch } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { updateDepartment } from "../api";
import type { Department } from "../types";

type Props = {
  department: Department;
  onUpdated: (department: Department) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

export function DepartmentStatusToggle({ department, onUpdated, onFeedback }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isActive = department.status === "active";

  async function updateStatus() {
    setSaving(true);
    const status = isActive ? "inactive" : "active";
    try {
      const result = await updateDepartment(department.id, { status });
      onUpdated(result.data);
      onFeedback(`${department.name} ${isActive ? "deactivated" : "reactivated"}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update department status.", "error");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <StatusSwitch triggerRef={triggerRef} checked={isActive} loading={saving} accessibleLabel={department.name} onToggle={() => setConfirmOpen(true)} />
    <StatusConfirmationDialog
      open={confirmOpen}
      title={isActive ? "Deactivate department?" : "Reactivate department?"}
      description={isActive ? "The department will be marked inactive. Existing academic records are preserved." : "The department will be available for use again."}
      confirmLabel={isActive ? "Deactivate" : "Reactivate"}
      loading={saving}
      triggerRef={triggerRef}
      onConfirm={() => void updateStatus()}
      onClose={() => setConfirmOpen(false)}
    />
  </>;
}
