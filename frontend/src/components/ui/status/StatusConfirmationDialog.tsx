"use client";

import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";

export function StatusConfirmationDialog({ open, title, description, confirmLabel, cancelLabel = "Cancel", loading = false, destructive = true, triggerRef, onConfirm, onClose }: { open: boolean; title: string; description: string | ReactNode; confirmLabel: string; cancelLabel?: string; loading?: boolean; destructive?: boolean; triggerRef?: RefObject<HTMLElement | null>; onConfirm: () => void; onClose: () => void }) {
  const { t } = useLocale();
  const dialogId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={dialogRef} aria-labelledby={`${dialogId}-title`} aria-describedby={`${dialogId}-description`} onCancel={(event) => { event.preventDefault(); if (!loading) onClose(); }} onClose={() => requestAnimationFrame(() => triggerRef?.current?.focus())} className="m-auto w-[min(92vw,28rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/45">
    <div className="p-6">
      <h2 id={`${dialogId}-title`} className="font-display text-lg font-bold">{t(title)}</h2>
      <p id={`${dialogId}-description`} className="mt-2 text-sm leading-relaxed text-muted">{typeof description === "string" ? t(description) : description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={loading} onClick={onClose}>{t(cancelLabel)}</Button>
        <Button type="button" variant={destructive ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{t(confirmLabel)}</Button>
      </div>
    </div>
  </dialog>;
}
