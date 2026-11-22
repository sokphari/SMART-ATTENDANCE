"use client";

import { useRef, useState } from "react";
import { StatusConfirmationDialog, StatusSwitch } from "@/components/ui/status";
import { ApiError } from "@/lib/api/client";
import { updateUser } from "../api";
import type { ManagedUser } from "../types";

type Props = {
  user: ManagedUser;
  onUpdated: (user: ManagedUser) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

export function UserStatusToggle({ user, onUpdated, onFeedback }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isActive = user.status === "active";

  async function updateStatus() {
    setSaving(true);
    const status = isActive ? "inactive" : "active";
    try {
      const result = await updateUser(user.id, { name: user.name, email: user.email, status });
      onUpdated(result.data);
      onFeedback(`${user.name}'s account was ${isActive ? "deactivated" : "activated"}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update this account.", "error");
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return <>
    <StatusSwitch triggerRef={triggerRef} checked={isActive} loading={saving} accessibleLabel={`${user.name}'s account`} onToggle={() => setConfirmOpen(true)} />
    <StatusConfirmationDialog
      open={confirmOpen}
      title={isActive ? "Deactivate this account?" : "Activate this account?"}
      description={isActive ? "This account will lose access until activated again." : "This account will regain active access."}
      confirmLabel={isActive ? "Deactivate account" : "Activate account"}
      loading={saving}
      triggerRef={triggerRef}
      onConfirm={() => void updateStatus()}
      onClose={() => setConfirmOpen(false)}
    />
  </>;
}
