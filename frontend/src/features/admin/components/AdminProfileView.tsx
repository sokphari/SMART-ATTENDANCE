"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, KeyRound, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/status";
import { useLocale } from "@/i18n/LocaleProvider";
import { ApiError } from "@/lib/api/client";
import { updateStoredUser } from "@/lib/api/session";
import { getCurrentUser, type AuthProfile } from "@/features/auth/api";
import { updateUser } from "@/features/users/api";

export function AdminProfileView() {
  const { t } = useLocale();
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    getCurrentUser()
      .then(({ data }) => {
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : t("Could not load your profile.")))
      .finally(() => setLoading(false));
  }, [t]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await updateUser(profile.id, {
        name: name.trim(),
        email: email.trim(),
        password: password || undefined,
        status: profile.status ?? "active",
      });
      updateStoredUser(result.data);
      setProfile({ ...profile, ...result.data });
      setPassword("");
      setNotice(t("Profile updated successfully."));
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(Object.values(caught.errors).flat()[0] ?? caught.message);
      } else {
        setError(t("Could not update your profile."));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full">
      <PageHeader title={t("My profile")} description="Manage your administrator account information and sign-in details." />
      {error && <p role="alert" className="mb-4 rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-control bg-success-soft px-4 py-3 text-sm text-success">{notice}</p>}
      {loading ? (
        <Card className="p-8 text-sm text-muted">{t("Loading profile…")}</Card>
      ) : profile ? (
        <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
          <Card className="p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-hairline pb-5">
              <span className="flex size-12 items-center justify-center rounded-panel bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"><UserRound className="size-6" /></span>
              <div><h2 className="font-display text-lg font-bold">{t("Account information")}</h2><p className="text-sm text-muted">{t("Update your name, email, or password.")}</p></div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <Input label={t("Name")} name="name" autoComplete="name" required maxLength={150} value={name} onChange={(event) => setName(event.target.value)} />
              <Input label={t("Email")} name="email" type="email" autoComplete="email" required maxLength={150} value={email} onChange={(event) => setEmail(event.target.value)} />
              <Input label={t("New password (optional)")} name="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={t("Leave blank to keep your current password")} />
              <div className="flex justify-end pt-2"><Button type="submit" loading={saving}>{t("Save profile")}</Button></div>
            </form>
          </Card>

          <Card className="p-5 sm:p-7">
            <div className="mb-5 flex items-center gap-3 border-b border-hairline pb-5">
              <span className="flex size-12 items-center justify-center rounded-panel bg-success-soft text-success"><BadgeCheck className="size-6" /></span>
              <div><h2 className="font-display text-lg font-bold">{t("Access and security")}</h2><p className="text-sm text-muted">{t("Your account role and status.")}</p></div>
            </div>
            <dl className="divide-y divide-hairline">
              <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-muted">{t("Role")}</dt><dd className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-muted" />{t(profile.role ?? "Admin")}</dd></div>
              <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-muted">{t("Status")}</dt><dd><StatusBadge status={profile.status} context="account" /></dd></div>
              <div className="flex items-center justify-between gap-3 py-3"><dt className="text-sm text-muted">{t("Member since")}</dt><dd className="text-sm font-semibold">{new Date(profile.created_at).toLocaleDateString()}</dd></div>
            </dl>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
