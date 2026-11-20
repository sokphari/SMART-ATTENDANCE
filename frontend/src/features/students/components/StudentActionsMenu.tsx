"use client";

import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ElementType, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Archive, ArrowRightLeft, BookOpen, CalendarClock, Ellipsis, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { fetchAllClassSections, transferStudentClass } from "../api";
import type { ClassSectionOption } from "../api";
import type { Student } from "../types";

type Props = {
  student: Student;
  canManage: boolean;
  onFeedback: (message: string, kind: "success" | "error") => void;
  onRefresh: () => void;
};

export function StudentActionsMenu({ student, canManage, onFeedback, onRefresh }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchSaving, setSwitchSaving] = useState(false);
  const [sections, setSections] = useState<ClassSectionOption[]>([]);
  const [targetSectionId, setTargetSectionId] = useState("");
  const switchDialogRef = useRef<HTMLDialogElement>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number; maxHeight: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `student-actions-${student.id}`;

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
    const dialog = switchDialogRef.current;
    if (switchOpen && dialog && !dialog.open) dialog.showModal();
    if (!switchOpen && dialog?.open) dialog.close();
  }, [switchOpen]);

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

  async function openSwitchDialog() {
    closeMenu(false);
    setSwitchOpen(true);
    setSwitchLoading(true);
    setTargetSectionId("");
    try {
      const result = await fetchAllClassSections();
      setSections(result.filter((section) => section.status === "active"));
    } catch {
      // Direct class ID entry still works; section data is only used for a preview.
      setSections([]);
    } finally {
      setSwitchLoading(false);
    }
  }

  async function submitSwitch() {
    const current = student.current_enrollment;
    if (!current || !targetSectionId) return;
    setSwitchSaving(true);
    try {
      await transferStudentClass(current.id, Number(targetSectionId));
      setSwitchOpen(false);
      onFeedback(`${student.user?.name ?? "Student"} was switched to the selected class.`, "success");
      onRefresh();
    } catch (caught) {
      onFeedback(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : "Could not switch the student's class.", "error");
    } finally {
      setSwitchSaving(false);
    }
  }

  const currentEnrollment = student.current_enrollment;
  const switchOptions = sections.filter((section) => section.id !== currentEnrollment?.class_section_id
    && section.course_id === currentEnrollment?.course_id
    && section.semester_id === currentEnrollment?.semester_id
    && section.enrolled_count < section.capacity);
  const typedTarget = Number(targetSectionId);
  const targetPreview = switchOptions.find((section) => section.id === typedTarget);

  if (!canManage) return null;

  return (
    <div className="relative flex justify-end gap-2" onKeyDown={moveFocus}>
      <button ref={triggerRef} type="button" aria-label={`Actions for ${student.user?.name ?? student.student_code}`} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)} className="flex size-10 touch-manipulation items-center justify-center rounded-control border border-hairline bg-card text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-500">
        <Ellipsis className="size-5" />
      </button>
      {open && typeof document !== "undefined" && createPortal(<>
        <button type="button" aria-label="Close actions menu" className="fixed inset-0 z-[60] cursor-default" onClick={() => closeMenu(false)} />
        <div ref={menuRef} id={menuId} role="menu" aria-label={`Student actions for ${student.user?.name ?? student.student_code}`} style={menuPosition ? { top: menuPosition.top, right: menuPosition.right, maxHeight: menuPosition.maxHeight } : { top: 8, right: 8 }} className="fixed z-[70] w-56 overflow-y-auto rounded-panel border border-hairline bg-card p-1.5 shadow-lift">
          <MenuItem ref={firstItemRef} icon={BookOpen} onClick={() => { closeMenu(false); router.push(`/students/${student.id}/enrollments`); }}>Class Enrollment</MenuItem>
          {currentEnrollment && <MenuItem icon={ArrowRightLeft} onClick={() => void openSwitchDialog()}>Switch Class</MenuItem>}
          <MenuItem icon={CalendarClock} onClick={() => { closeMenu(false); router.push(`/students/${student.id}?tab=attendance`); }}>Attendance History</MenuItem>
          <MenuItem icon={ShieldCheck} onClick={() => { closeMenu(false); router.push(`/students/${student.id}?tab=account`); }}>Manage Account</MenuItem>
          <div className="my-1 border-t border-hairline" />
          <button type="button" role="menuitem" disabled title="Archive requires a dedicated backend endpoint; DELETE currently only deactivates the account." className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-muted opacity-55" onClick={() => undefined}><Archive className="size-4" />Archive Student <span className="ml-auto text-[10px]">Unavailable</span></button>
        </div>
      </>, document.body)}

      <dialog ref={switchDialogRef} aria-labelledby={`switch-title-${student.id}`} aria-describedby={`switch-description-${student.id}`} onCancel={(event) => { event.preventDefault(); if (!switchSaving) setSwitchOpen(false); }} onClose={() => { if (switchOpen) setSwitchOpen(false); }} className="m-auto w-[min(92vw,34rem)] rounded-panel border border-hairline bg-card p-0 text-ink shadow-lift backdrop:bg-ink/45">
        <div className="p-6">
          <h2 id={`switch-title-${student.id}`} className="font-display text-lg font-bold">Switch class</h2>
          <p id={`switch-description-${student.id}`} className="mt-2 text-sm text-muted">Move {student.user?.name ?? "this student"} to another section of the same course and semester. Their current enrollment will be kept in history as dropped.</p>
          {currentEnrollment && <div className="mt-4 rounded-control bg-canvas p-3 text-sm"><p className="text-xs font-semibold text-muted">CURRENT CLASS</p><p className="mt-1 font-semibold">{currentEnrollment.section_code ?? "Current section"} · {currentEnrollment.course_name ?? "Course"}</p><p className="mt-0.5 text-xs text-muted">Class ID: {currentEnrollment.class_section_id} · {currentEnrollment.semester_name ?? "Current semester"}</p></div>}
          <label htmlFor={`switch-target-${student.id}`} className="mt-4 block text-sm font-semibold">New class section ID</label>
          <input id={`switch-target-${student.id}`} type="number" min="1" step="1" inputMode="numeric" value={targetSectionId} onChange={(event) => setTargetSectionId(event.target.value)} placeholder="Enter the destination class ID" className="mt-2 h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-brand-500" />
          {targetPreview ? <p className="mt-2 text-xs text-success">{targetPreview.section_code} · {targetPreview.course?.name ?? "Course"}{(targetPreview.schedules ?? []).filter((schedule) => schedule.status === "active").map((schedule) => ` · ${schedule.period ?? "Class"} ${schedule.start_time.slice(0, 5)}–${schedule.end_time.slice(0, 5)}`).join("")} · {targetPreview.capacity - targetPreview.enrolled_count} seats left</p> : targetSectionId && !switchLoading ? <p className="mt-2 text-xs text-muted">The server will verify that this ID belongs to an active section of the same course and semester with available capacity.</p> : null}
          <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" disabled={switchSaving} onClick={() => setSwitchOpen(false)}>Cancel</Button><Button type="button" loading={switchSaving} disabled={!Number.isInteger(typedTarget) || typedTarget < 1 || switchSaving} onClick={() => void submitSwitch()}><ArrowRightLeft className="size-4" />Switch class</Button></div>
        </div>
      </dialog>
    </div>
  );
}

const MenuItem = forwardRef<HTMLButtonElement, Omit<ComponentProps<"button">, "role"> & { icon: ElementType }>(function MenuItem({ icon: Icon, children, ...props }, ref) {
  return <button ref={ref} type="button" role="menuitem" className="flex min-h-11 w-full touch-manipulation items-center gap-3 rounded-control px-3 text-left text-sm font-medium text-ink transition-colors hover:bg-brand-50 hover:text-brand-700 focus-visible:bg-brand-50 focus-visible:outline-none" {...props}><Icon className="size-4 shrink-0" />{children}</button>;
});
