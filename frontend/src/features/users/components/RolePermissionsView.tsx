"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, LockKeyhole, RotateCcw, ShieldCheck } from "lucide-react";
import { ApiError } from "@/lib/api/client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchRolePermissions, saveTeacherPermissions } from "../api";
import type { TeacherModulePermission } from "../types";

const MODULE_DESCRIPTIONS: Record<string, string> = {
  dashboard: "Open the teacher workspace overview and class summaries.",
  classes: "View assigned classes, rosters, and class schedules.",
  attendance_sessions:
    "Start sessions and manage attendance for assigned classes.",
  attendance_history: "Review submitted attendance records.",
  attendance_reports: "View attendance reports for assigned classes.",
  corrections: "Submit and track attendance correction requests.",
  profile: "View and update the teacher's own profile details.",
};

export function RolePermissionsView() {
  const [modules, setModules] = useState<TeacherModulePermission[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await fetchRolePermissions();
      setModules(data.teacher);
      setSaved(
        Object.fromEntries(
          data.teacher.map((module) => [module.key, module.enabled]),
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not load role permissions.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const draft = useMemo(
    () =>
      Object.fromEntries(modules.map((module) => [module.key, module.enabled])),
    [modules],
  );
  const dirty = modules.some((module) => saved[module.key] !== module.enabled);
  const enabledCount = modules.filter((module) => module.enabled).length;

  const save = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await saveTeacherPermissions(draft);
      setModules(result.data.teacher);
      setSaved(
        Object.fromEntries(
          result.data.teacher.map((module) => [module.key, module.enabled]),
        ),
      );
      setNotice(
        "Teacher access settings saved. The API enforces these permissions immediately.",
      );
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not save teacher permissions.",
      );
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setModules((current) =>
      current.map((module) => ({
        ...module,
        enabled: saved[module.key] ?? module.enabled,
      })),
    );
    setNotice("");
    setError("");
  };

  const toggleModule = (key: string) => {
    setNotice("");
    setModules((current) =>
      current.map((module) =>
        module.key === key ? { ...module, enabled: !module.enabled } : module,
      ),
    );
  };

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="Choose which parts of Smart Attendance teacher accounts can access."
        actions={
          <div className="flex items-center gap-2">
            {dirty && (
              <Button
                variant="secondary"
                onClick={discardChanges}
                disabled={saving}
              >
                <RotateCcw className="size-4" />
                Discard
              </Button>
            )}
            <Button
              onClick={() => void save()}
              loading={saving}
              disabled={!dirty || loading || modules.length === 0}
            >
              <Check className="size-4" />
              Save changes
            </Button>
          </div>
        }
      />

      {notice && (
        <p
          role="status"
          aria-live="polite"
          className="mb-4 rounded-control bg-success-soft px-4 py-3 text-sm font-medium text-success"
        >
          {notice}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <span>{error}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            Try again
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="rounded-control bg-brand-50 p-3 text-brand-600">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold">
                Teacher role access
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                These settings apply to every teacher account. Disabled modules
                disappear from teacher navigation and are blocked by Laravel
                authorization.
              </p>
            </div>
          </div>
          {!loading && (
            <Badge tone={enabledCount > 0 ? "success" : "danger"}>
              {enabledCount} of {modules.length} enabled
            </Badge>
          )}
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted">
            Loading permissions…
          </p>
        ) : modules.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            No teacher permissions were returned.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {modules.map((module) => (
              <div
                key={module.key}
                className="flex min-h-[88px] items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-canvas/60 sm:px-6"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 rounded-control p-2 ${module.enabled ? "bg-success-soft text-success" : "bg-canvas text-muted"}`}
                  >
                    <LockKeyhole className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">
                      {module.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {MODULE_DESCRIPTIONS[module.key] ??
                        "Allow or block teacher access to this module."}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`hidden rounded-pill px-2.5 py-1 text-xs font-semibold sm:inline-flex ${module.enabled ? "bg-success-soft text-success" : "bg-canvas text-muted"}`}
                  >
                    {module.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={module.enabled}
                    aria-label={`${module.enabled ? "Disable" : "Enable"} ${module.label} for teachers`}
                    disabled={saving}
                    onClick={() => toggleModule(module.key)}
                    className={`relative inline-flex h-7 w-12 touch-manipulation items-center rounded-pill transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 disabled:cursor-wait disabled:opacity-60 ${module.enabled ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-700"}`}
                  >
                    <span
                      className={`size-5 rounded-pill bg-white shadow-sm transition-transform ${module.enabled ? "translate-x-6" : "translate-x-1"}`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {dirty && !loading && (
          <div className="border-t border-warning/20 bg-warning-soft/50 px-5 py-3 text-xs font-medium text-warning sm:px-6">
            You have unsaved changes. Save to apply them to teacher accounts.
          </div>
        )}
      </Card>
    </>
  );
}
