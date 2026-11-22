"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CalendarClock, Check, Palette, Settings2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLocale } from "@/i18n/LocaleProvider";
import { ApiError } from "@/lib/api/client";
import { fetchTimetableConfiguration, updateTimetableSettings } from "@/features/schedules/api";
import type { TimetableConfig } from "@/features/schedules/types";
import { useBranding } from "@/components/branding/BrandingProvider";
import { updateSystemBranding, type SystemBranding } from "@/lib/api/branding";

type PolicyDraft = Pick<
  TimetableConfig,
  | "max_weekly_teaching_hours"
  | "max_assigned_sections"
  | "automatic_attendance_enabled"
  | "late_after_minutes"
  | "check_in_window_minutes"
  | "geofencing_enabled"
  | "gps_accuracy_threshold_meters"
>;

function toDraft(config: TimetableConfig): PolicyDraft {
  return {
    max_weekly_teaching_hours: config.max_weekly_teaching_hours,
    max_assigned_sections: config.max_assigned_sections,
    automatic_attendance_enabled: config.automatic_attendance_enabled,
    late_after_minutes: config.late_after_minutes,
    check_in_window_minutes: config.check_in_window_minutes,
    geofencing_enabled: config.geofencing_enabled,
    gps_accuracy_threshold_meters: config.gps_accuracy_threshold_meters,
  };
}

export function SystemSettingsView() {
  const { t } = useLocale();
  const { branding, updateBranding } = useBranding();
  const [config, setConfig] = useState<TimetableConfig | null>(null);
  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [brandingDraft, setBrandingDraft] = useState<SystemBranding>(branding);
  const [brandingSaving, setBrandingSaving] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const result = await fetchTimetableConfiguration();
      setConfig(result.data);
      setDraft(toDraft(result.data));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("Could not load system settings."));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setBrandingDraft(branding); }, [branding]);

  function update<K extends keyof PolicyDraft>(key: K, value: PolicyDraft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setNotice("");
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await updateTimetableSettings(draft);
      const result = await fetchTimetableConfiguration();
      setConfig(result.data);
      setDraft(toDraft(result.data));
      setNotice(t("System settings saved."));
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : t("Could not save system settings."));
    } finally {
      setSaving(false);
    }
  }

  async function saveBranding() {
    setBrandingSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await updateSystemBranding({
        ...brandingDraft,
        system_name: brandingDraft.system_name.trim(),
        logo_url: brandingDraft.logo_url?.trim() || null,
      });
      updateBranding(result.data);
      setNotice(t("Brand identity saved."));
    } catch (caught) {
      setError(caught instanceof ApiError ? Object.values(caught.errors).flat()[0] ?? caught.message : t("Could not save brand identity."));
    } finally {
      setBrandingSaving(false);
    }
  }

  return (
    <div className="w-full">
      <PageHeader title={t("Settings")} description="Control attendance rules and teaching limits for the system." />
      {error && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-control bg-success-soft px-4 py-3 text-sm text-success"><Check className="size-4" />{notice}</p>}

      <Card className="mb-5 p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3 border-b border-hairline pb-5">
          <span className="flex size-12 items-center justify-center rounded-panel bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><Palette className="size-6" /></span>
          <div><h2 className="font-display text-lg font-bold">{t("System branding")}</h2><p className="text-sm text-muted">{t("Set the system name, logo, and primary color for all users.")}</p></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("System name")} value={brandingDraft.system_name} maxLength={80} onChange={(event) => setBrandingDraft((current) => ({ ...current, system_name: event.target.value }))} />
          <Input label={t("Logo image URL (optional)")} type="url" value={brandingDraft.logo_url ?? ""} placeholder={t("https://example.com/logo.png")} onChange={(event) => setBrandingDraft((current) => ({ ...current, logo_url: event.target.value || null }))} />
          <label className="flex flex-col gap-2 text-sm font-semibold text-ink">
            {t("Primary color")}
            <span className="flex min-h-11 items-center gap-3 rounded-control border border-hairline bg-card px-3">
              <input aria-label={t("Primary color")} type="color" value={brandingDraft.primary_color} onChange={(event) => setBrandingDraft((current) => ({ ...current, primary_color: event.target.value }))} className="size-8 cursor-pointer rounded border-0 bg-transparent p-0" />
              <span className="font-mono text-sm text-muted">{brandingDraft.primary_color.toUpperCase()}</span>
            </span>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
          <p className="text-xs text-muted">{t("Changes appear across the login page and dashboards after saving.")}</p>
          <Button type="button" onClick={() => void saveBranding()} loading={brandingSaving}>{t("Save branding")}</Button>
        </div>
      </Card>

      {loading ? <Card className="p-8 text-sm text-muted">{t("Loading system settings…")}</Card> : draft && config ? (
        <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
          <Card className="p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-hairline pb-5">
              <span className="flex size-12 items-center justify-center rounded-panel bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><ShieldCheck className="size-6" /></span>
              <div><h2 className="font-display text-lg font-bold">{t("Attendance policy")}</h2><p className="text-sm text-muted">{t("These rules apply to scheduled attendance across the system.")}</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t("Max weekly teaching hours")} type="number" min={1} max={168} value={draft.max_weekly_teaching_hours} onChange={(event) => update("max_weekly_teaching_hours", Number(event.target.value))} />
              <Input label={t("Maximum assigned sections (optional)")} type="number" min={1} value={draft.max_assigned_sections ?? ""} placeholder={t("No limit")} onChange={(event) => update("max_assigned_sections", event.target.value ? Number(event.target.value) : null)} />
              <Input label={t("Late after (minutes)")} type="number" min={0} max={240} value={draft.late_after_minutes} onChange={(event) => update("late_after_minutes", Number(event.target.value))} />
              <Input label={t("QR check-in window (minutes)")} type="number" min={1} max={480} value={draft.check_in_window_minutes} onChange={(event) => update("check_in_window_minutes", Number(event.target.value))} />
              <label className="flex min-h-11 items-center gap-3 rounded-control border border-hairline px-3 text-sm font-medium sm:col-span-2"><input type="checkbox" className="size-4 accent-brand-600" checked={draft.automatic_attendance_enabled} onChange={(event) => update("automatic_attendance_enabled", event.target.checked)} />{t("Automatically prepare scheduled attendance")}</label>
              <label className="flex min-h-11 items-center gap-3 rounded-control border border-hairline px-3 text-sm font-medium sm:col-span-2"><input type="checkbox" className="size-4 accent-brand-600" checked={draft.geofencing_enabled} onChange={(event) => update("geofencing_enabled", event.target.checked)} />{t("Require classroom location for check-in")}</label>
              <Input label={t("Maximum GPS accuracy (meters)")} type="number" min={1} max={500} value={draft.gps_accuracy_threshold_meters} disabled={!draft.geofencing_enabled} onChange={(event) => update("gps_accuracy_threshold_meters", Number(event.target.value))} />
            </div>
            <div className="mt-6 flex justify-end"><Button type="button" onClick={() => void save()} loading={saving}>{t("Save settings")}</Button></div>
          </Card>

          <div className="space-y-5">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-control bg-info-soft text-info"><CalendarClock className="size-5" /></span><div><h2 className="font-display font-bold">{t("Timetable structure")}</h2><p className="text-xs text-muted">{t("Timezone")}: {config.timezone}</p></div></div>
              <p className="mt-4 text-sm leading-relaxed text-muted">{t("Manage teaching periods, breaks, classrooms, and schedule assignments in the timetable module.")}</p>
              <Link href="/schedules" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-control border border-hairline px-3 text-sm font-semibold text-brand-600 hover:bg-canvas">{t("Open class timetable")}<ArrowRight className="size-4" /></Link>
            </Card>
            <Card className="p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-control bg-canvas text-muted"><Settings2 className="size-5" /></span><div><h2 className="font-display font-bold">{t("Display preferences")}</h2><p className="text-sm text-muted">{t("Choose your language and light or dark theme from the header controls.")}</p></div></div>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
