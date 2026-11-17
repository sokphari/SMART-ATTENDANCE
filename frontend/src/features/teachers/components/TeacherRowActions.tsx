"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Ellipsis, Eye, Pencil, UserRoundCheck, UserRoundX } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuItemRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuId = `teacher-actions-${teacher.id}`;
  const active = teacher.user?.status === "active";

  useEffect(() => {
    if (menuOpen) menuItemRef.current?.focus();
  }, [menuOpen]);

  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current.getBoundingClientRect().height;
    const below = Math.max(0, window.innerHeight - trigger.bottom - 16);
    const above = Math.max(0, trigger.top - 16);
    const openAbove = menuHeight > below && above > below;
    const maxHeight = Math.max(112, openAbove ? above : below);
    const top = openAbove
      ? Math.max(8, trigger.top - Math.min(menuHeight, maxHeight) - 8)
      : Math.max(8, trigger.bottom + 8);
    setMenuPosition({ top, right: Math.max(8, window.innerWidth - trigger.right), maxHeight });
  }, [menuOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (confirmOpen && dialog && !dialog.open) dialog.showModal();
    if (!confirmOpen && dialog?.open) dialog.close();
  }, [confirmOpen]);

  function closeMenu(restoreFocus = true) {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === "Tab") {
      closeMenu(false);
      return;
    }
    if (event.key === "ArrowDown" && !menuOpen && event.target === triggerRef.current) {
      event.preventDefault();
      setMenuOpen(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      menuItemRef.current?.focus();
    }
  }

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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5" onKeyDown={handleMenuKeyDown}>
      <button
        type="button"
        aria-label={`View profile for ${teacher.user?.name ?? teacher.teacher_code}`}
        title="View profile"
        onClick={() => router.push(`/teachers/${teacher.id}`)}
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-muted transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Eye className="size-4.5" />
      </button>
      <button
        type="button"
        aria-label={`Edit ${teacher.user?.name ?? teacher.teacher_code}`}
        title="Edit teacher"
        onClick={onEdit}
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Pencil className="size-4.5" />
      </button>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`More actions for ${teacher.user?.name ?? teacher.teacher_code}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((value) => !value)}
        className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500"
      >
        <Ellipsis className="size-5" />
      </button>

      {menuOpen && typeof document !== "undefined" && createPortal(
        <>
          <button type="button" aria-label="Close teacher actions" className="fixed inset-0 z-[60] cursor-default" onClick={() => closeMenu(false)} />
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={`Teacher actions for ${teacher.user?.name ?? teacher.teacher_code}`}
            style={menuPosition ? { top: menuPosition.top, right: menuPosition.right, maxHeight: menuPosition.maxHeight } : { top: 8, right: 8 }}
            className="fixed z-[70] w-56 overflow-y-auto rounded-panel border border-hairline bg-card p-1.5 shadow-lift"
          >
            <button
              ref={menuItemRef}
              type="button"
              role="menuitem"
              onClick={() => { closeMenu(false); setConfirmOpen(true); }}
              className="flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-ink transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50 focus-visible:outline-none"
            >
              {active ? <UserRoundX className="size-4" /> : <UserRoundCheck className="size-4" />}
              {active ? "Deactivate teacher" : "Reactivate teacher"}
            </button>
          </div>
        </>,
        document.body,
      )}

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
          <h2 id={`teacher-status-title-${teacher.id}`} className="font-display text-lg font-bold">{active ? "Deactivate teacher?" : "Reactivate teacher?"}</h2>
          <p id={`teacher-status-description-${teacher.id}`} className="mt-2 text-sm leading-relaxed text-muted">
            {active ? `${teacher.user?.name ?? "This teacher"} will lose active account access. Their teaching records will remain.` : `${teacher.user?.name ?? "This teacher"} will regain active account access.`}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant={active ? "danger" : "primary"} loading={saving} onClick={() => void updateStatus()}>{active ? "Deactivate" : "Reactivate"}</Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
