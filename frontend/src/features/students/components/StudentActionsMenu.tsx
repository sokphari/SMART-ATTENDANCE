"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ElementType, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Archive, BookOpen, CalendarClock, Ellipsis, Eye, Pencil, ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { updateStudent } from "../api";
import type { Student } from "../types";

type Props = {
  student: Student;
  canManage: boolean;
  onStudentUpdated: (student: Student) => void;
  onFeedback: (message: string, kind: "success" | "error") => void;
};

type ConfirmAction = "suspend" | "reactivate";

export function StudentActionsMenu({ student, canManage, onStudentUpdated, onFeedback }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuId = `student-actions-${student.id}`;
  const isActive = student.user?.status === "active";

  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const below = Math.max(0, window.innerHeight - trigger.bottom - 16);
    const above = Math.max(0, trigger.top - 16);
    const openAbove = menu.height > below && above > below;
    const maxHeight = Math.max(120, openAbove ? above : below);
    const top = openAbove ? Math.max(8, trigger.top - Math.min(menu.height, maxHeight) - 8) : Math.max(8, trigger.bottom + 8);
    setMenuPosition({ top, right: Math.max(8, window.innerWidth - trigger.right), maxHeight });
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (confirmAction && dialog && !dialog.open) dialog.showModal();
    if (!confirmAction && dialog?.open) dialog.close();
  }, [confirmAction]);

  function closeMenu(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (!open && event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (open && event.key === "Tab") {
      closeMenu(false);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(document.querySelectorAll<HTMLButtonElement>(`#${menuId} [role="menuitem"]:not(:disabled)`));
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : event.key === "ArrowUp" ? (currentIndex - 1 + items.length) % items.length : (currentIndex + 1) % items.length;
    items[next]?.focus();
  }

  async function confirmStatusChange() {
    if (!confirmAction) return;
    setSaving(true);
    const nextStatus = confirmAction === "suspend" ? "suspended" : "active";
    try {
      const response = await updateStudent(student.id, { status: nextStatus });
      onStudentUpdated(response.data);
      onFeedback(`${student.user?.name ?? "Student"} ${confirmAction === "suspend" ? "suspended" : "reactivated"}.`, "success");
      setConfirmAction(null);
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? caught.message : "Could not update student status.", "error");
      setConfirmAction(null);
    } finally {
      setSaving(false);
    }
  }

  if (!canManage) return null;

  return (
    <div className="relative flex justify-end" onKeyDown={moveFocus}>
      <button ref={triggerRef} type="button" aria-label={`Actions for ${student.user?.name ?? student.student_code}`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)} className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500">
        <Ellipsis className="size-5" />
      </button>
      {open && typeof document !== "undefined" && createPortal(<>
        <button type="button" aria-label="Close actions menu" className="fixed inset-0 z-[60] cursor-default" onClick={() => closeMenu(false)} />
        <div ref={menuRef} id={menuId} role="menu" aria-label={`Student actions for ${student.user?.name ?? student.student_code}`} style={menuPosition ? { top: menuPosition.top, right: menuPosition.right, maxHeight: menuPosition.maxHeight } : { top: 8, right: 8 }} className="fixed z-[70] w-56 overflow-y-auto rounded-panel border border-hairline bg-card p-1.5 shadow-lift">
          <MenuItem ref={firstItemRef} icon={Eye} onClick={() => { closeMenu(false); router.push(`/students/${student.id}`); }}>View Profile</MenuItem>
          <MenuItem icon={Pencil} onClick={() => { closeMenu(false); router.push(`/students/${student.id}/edit`); }}>Edit Student</MenuItem>
          <MenuItem icon={BookOpen} onClick={() => { closeMenu(false); router.push(`/students/${student.id}/enrollments`); }}>Class Enrollment</MenuItem>
          <MenuItem icon={CalendarClock} onClick={() => { closeMenu(false); router.push(`/students/${student.id}?tab=attendance`); }}>Attendance History</MenuItem>
          <MenuItem icon={ShieldCheck} onClick={() => { closeMenu(false); router.push(`/students/${student.id}?tab=account`); }}>Manage Account</MenuItem>
          <div className="my-1 border-t border-hairline" />
          <MenuItem icon={isActive ? UserRoundX : UserRoundCheck} onClick={() => { closeMenu(false); setConfirmAction(isActive ? "suspend" : "reactivate"); }}>{isActive ? "Suspend Student" : "Reactivate Student"}</MenuItem>
          <button type="button" role="menuitem" disabled title="Archive requires a dedicated backend endpoint; DELETE currently only deactivates the account." className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-muted opacity-55" onClick={() => undefined}><Archive className="size-4" />Archive Student <span className="ml-auto text-[10px]">Unavailable</span></button>
        </div>
      </>, document.body)}

      <dialog ref={dialogRef} aria-labelledby={`confirm-title-${student.id}`} aria-describedby={`confirm-description-${student.id}`} onCancel={(event) => { event.preventDefault(); if (!saving) setConfirmAction(null); }} onClose={() => { if (confirmAction) setConfirmAction(null); }} className="m-auto w-[min(92vw,28rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/45">
        {confirmAction && <div className="p-6"><h2 id={`confirm-title-${student.id}`} className="font-display text-lg font-bold">{confirmAction === "suspend" ? "Suspend this student?" : "Reactivate this student?"}</h2><p id={`confirm-description-${student.id}`} className="mt-2 text-sm leading-relaxed text-muted">{confirmAction === "suspend" ? `${student.user?.name ?? "This student"} will lose active account access until reactivated.` : `${student.user?.name ?? "This student"} will regain active account access.`}</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={saving} onClick={() => setConfirmAction(null)}>Cancel</Button><Button type="button" variant={confirmAction === "suspend" ? "danger" : "primary"} loading={saving} onClick={() => void confirmStatusChange()}>{confirmAction === "suspend" ? "Suspend student" : "Reactivate student"}</Button></div></div>}
      </dialog>
    </div>
  );
}

const MenuItem = forwardRef<HTMLButtonElement, Omit<ComponentProps<"button">, "role"> & { icon: ElementType }>(function MenuItem({ icon: Icon, children, ...props }, ref) {
  return <button ref={ref} type="button" role="menuitem" className="flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-ink transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50 focus-visible:outline-none" {...props}><Icon className="size-4 shrink-0" />{children}</button>;
});
