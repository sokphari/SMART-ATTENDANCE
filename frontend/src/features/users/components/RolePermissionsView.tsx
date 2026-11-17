"use client";

import { useEffect, useState } from "react";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchRolePermissions, saveTeacherPermissions } from "../api";
import type { TeacherModulePermission } from "../types";

export function RolePermissionsView() {
  const [modules, setModules] = useState<TeacherModulePermission[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetchRolePermissions()
      .then(({ data }) => {
        setModules(data.teacher);
        setSaved(Object.fromEntries(data.teacher.map((module) => [module.key, module.enabled])));
      })
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : "Could not load role permissions."))
      .finally(() => setLoading(false));
  }, []);

  const draft = Object.fromEntries(modules.map((module) => [module.key, module.enabled]));
  const dirty = modules.some((module) => saved[module.key] !== module.enabled);

  const save = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await saveTeacherPermissions(draft);
      setModules(result.data.teacher);
      setSaved(Object.fromEntries(result.data.teacher.map((module) => [module.key, module.enabled])));
      setNotice("Teacher permissions saved. Changes are enforced by the server immediately.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save teacher permissions.");
    } finally {
      setSaving(false);
    }
  };

  return <>
    <PageHeader title="Roles & permissions" description="Control which parts of Smart Attendance teacher accounts can access." actions={<Button onClick={() => void save()} loading={saving} disabled={!dirty || loading}><Check className="size-4" />Save changes</Button>} />
    {notice && <p role="status" className="mb-4 rounded-control bg-success-soft px-4 py-3 text-sm font-medium text-success">{notice}</p>}
    {error && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{error}</p>}
    <Card className="overflow-hidden">
      <div className="flex items-start gap-4 border-b border-hairline p-5 sm:p-6"><span className="rounded-control bg-brand-50 p-3 text-brand-600"><ShieldCheck className="size-6" /></span><div><h2 className="font-display text-lg font-bold">Teacher role</h2><p className="mt-1 text-sm text-muted">Turn modules on or off for every teacher account. Disabled access is rejected by the Laravel API, including direct requests.</p></div></div>
      {loading ? <p className="p-8 text-center text-sm text-muted">Loading permissions…</p> : <div className="divide-y divide-hairline">{modules.map((module) => <label key={module.key} className="flex min-h-[76px] cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-canvas/60 sm:px-6"><span className="flex items-center gap-3"><span className={`rounded-control p-2 ${module.enabled ? "bg-success-soft text-success" : "bg-canvas text-muted"}`}><LockKeyhole className="size-4" /></span><span><span className="block text-sm font-semibold">{module.label}</span><span className="mt-0.5 block text-xs text-muted">{module.enabled ? "Teachers can open this module" : "Access is blocked for teachers"}</span></span></span><input type="checkbox" role="switch" aria-label={`${module.enabled ? "Disable" : "Enable"} ${module.label} for teachers`} checked={module.enabled} onChange={(event) => setModules((current) => current.map((item) => item.key === module.key ? { ...item, enabled: event.target.checked } : item))} className="size-5 accent-brand-600" /></label>)}</div>}
    </Card>
  </>;
}
