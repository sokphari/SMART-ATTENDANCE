"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Ellipsis, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { updateDepartment } from "../api";
import type { Department } from "../types";

type Props = {
  department: Department;
  onEdit: () => void;
  onUpdated: (department: Department) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

export function DepartmentRowActions({ department, onEdit, onUpdated, onFeedback }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; maxHeight: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstItem = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuId = `department-actions-${department.id}`;

  useEffect(() => { if (open) firstItem.current?.focus(); }, [open]);
  useLayoutEffect(() => {
    if (!open || !trigger.current || !menu.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const bounds = menu.current.getBoundingClientRect();
    const below = Math.max(0, window.innerHeight - anchor.bottom - 16);
    const above = Math.max(0, anchor.top - 16);
    const openAbove = bounds.height > below && above > below;
    const maxHeight = Math.max(120, openAbove ? above : below);
    setMenuPosition({ top: openAbove ? Math.max(8, anchor.top - Math.min(bounds.height, maxHeight) - 8) : Math.max(8, anchor.bottom + 8), right: Math.max(8, window.innerWidth - anchor.right), maxHeight });
  }, [open]);
  useEffect(() => {
    if (confirmOpen && dialog.current && !dialog.current.open) dialog.current.showModal();
    if (!confirmOpen && dialog.current?.open) dialog.current.close();
  }, [confirmOpen]);

  function closeMenu(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus());
  }

  async function changeStatus() {
    setSaving(true);
    const nextStatus = department.status === "active" ? "inactive" : "active";
    try {
      const response = await updateDepartment(department.id, { status: nextStatus });
      onUpdated(response.data);
      onFeedback(`${department.name} ${nextStatus === "active" ? "reactivated" : "deactivated"}.`, "success");
      setConfirmOpen(false);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update department status.", "error");
      setConfirmOpen(false);
    } finally { setSaving(false); }
  }

  return <div className="relative flex justify-end">
    <button ref={trigger} type="button" aria-label={`Actions for ${department.name}`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)} onKeyDown={(event) => { if (event.key === "ArrowDown" && !open) { event.preventDefault(); setOpen(true); } if (event.key === "Escape") closeMenu(); }} className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-muted hover:bg-brand-50 hover:text-brand-700"><Ellipsis className="size-5" /></button>
    {open && typeof document !== "undefined" && createPortal(<><button type="button" aria-label="Close department actions" className="fixed inset-0 z-[60] cursor-default" onClick={() => closeMenu(false)} /><div ref={menu} id={menuId} role="menu" aria-label={`Department actions for ${department.name}`} style={menuPosition ? { top: menuPosition.top, right: menuPosition.right, maxHeight: menuPosition.maxHeight } : { top: 8, right: 8 }} className="fixed z-[70] w-52 overflow-y-auto rounded-panel border border-hairline bg-card p-1.5 shadow-lift">
      <button ref={firstItem} type="button" role="menuitem" onClick={() => { closeMenu(false); onEdit(); }} className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-medium hover:bg-brand-50"><Pencil className="size-4" />Edit department</button>
      <button type="button" role="menuitem" onClick={() => { closeMenu(false); setConfirmOpen(true); }} className="flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-sm font-medium hover:bg-brand-50">{department.status === "active" ? <ToggleLeft className="size-4" /> : <ToggleRight className="size-4" />}{department.status === "active" ? "Deactivate" : "Reactivate"}</button>
    </div></>, document.body)}
    <dialog ref={dialog} aria-labelledby={`department-confirm-${department.id}`} onCancel={(event) => { event.preventDefault(); if (!saving) setConfirmOpen(false); }} onClose={() => { if (confirmOpen) setConfirmOpen(false); }} className="m-auto w-[min(92vw,28rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/45">
      <div className="p-6"><h2 id={`department-confirm-${department.id}`} className="font-display text-lg font-bold">{department.status === "active" ? "Deactivate department?" : "Reactivate department?"}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{department.status === "active" ? `${department.name} will be marked inactive. Existing academic records are preserved.` : `${department.name} will be available for use again.`}</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</Button><Button type="button" variant={department.status === "active" ? "danger" : "primary"} loading={saving} onClick={() => void changeStatus()}>{department.status === "active" ? "Deactivate" : "Reactivate"}</Button></div></div>
    </dialog>
  </div>;
}
