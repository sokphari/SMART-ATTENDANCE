"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, CalendarDays, Mail, Pencil, Phone, ShieldCheck, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api/client";
import { updateStoredUser } from "@/lib/api/session";
import { getInitials } from "@/lib/utils/name";
import { getMyClassSections, getTeacherProfile, updateTeacherProfile } from "../api";
import type { TeacherProfile } from "../types";

export function TeacherProfileView() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [sectionCount, setSectionCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([getTeacherProfile(), getMyClassSections(null)])
      .then(([profileResponse, sectionsResponse]) => {
        setProfile(profileResponse.data);
        setSectionCount(sectionsResponse.data.length);
        setForm({
          name: profileResponse.data.user.name,
          email: profileResponse.data.user.email,
          phone: profileResponse.data.phone ?? "",
        });
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Unable to load your profile."))
      .finally(() => setLoading(false));
  }, []);

  function startEditing() {
    if (!profile) return;
    setForm({ name: profile.user.name, email: profile.user.email, phone: profile.phone ?? "" });
    setFieldErrors({});
    setError(null);
    setNotice(null);
    setEditing(true);
  }

  function cancelEditing() {
    if (!profile) return;
    setForm({ name: profile.user.name, email: profile.user.email, phone: profile.phone ?? "" });
    setFieldErrors({});
    setEditing(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    setFieldErrors({});
    try {
      const response = await updateTeacherProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
      });
      const updated = response.data;
      setProfile(updated);
      setForm({ name: updated.user.name, email: updated.user.email, phone: updated.phone ?? "" });
      setEditing(false);
      setNotice("Your profile has been updated.");
      updateStoredUser({
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.user.role,
        status: updated.user.status,
      });
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        const mapped: Record<string, string> = {};
        for (const [key, messages] of Object.entries(caught.errors)) mapped[key] = messages[0];
        setFieldErrors(mapped);
      } else setError(caught instanceof Error ? caught.message : "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="w-full animate-pulse space-y-5"><div className="h-36 rounded-panel bg-card" /><div className="h-64 rounded-panel bg-card" /></div>;
  if (error && !profile) return <div role="alert" className="rounded-panel border border-rose-200 bg-danger-soft p-5 text-sm text-danger">{error}</div>;
  if (!profile) return null;

  const detailRows = [
    { label: "Teacher code", value: profile.teacher_code, icon: BadgeCheck },
    { label: "Department", value: profile.department?.name ?? "Not assigned", icon: ShieldCheck },
    { label: "Account role", value: profile.user.role ?? "Teacher", icon: ShieldCheck },
    { label: "Email verification", value: profile.user.email_verified_at ? `Verified ${new Date(profile.user.email_verified_at).toLocaleDateString()}` : "Not verified", icon: BadgeCheck },
    { label: "Account created", value: new Date(profile.user.created_at).toLocaleDateString(undefined, { dateStyle: "long" }), icon: CalendarDays },
  ];

  const inputClass = "mt-1 h-11 w-full rounded-control border border-hairline bg-card px-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100";

  return (
    <div className="w-full space-y-6">
      <header><p className="text-sm font-semibold text-brand-600">Teacher workspace</p><h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">My profile</h1><p className="mt-2 text-sm text-muted">Manage your contact information and view teaching access.</p></header>
      {notice && <p role="status" className="rounded-control bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="rounded-control bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <section className="flex flex-wrap items-center gap-5 rounded-panel border border-hairline bg-card p-6 shadow-soft sm:p-8">
        <span className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 font-display text-xl font-bold text-white">{getInitials(profile.user.name)}</span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-2xl font-extrabold">{profile.user.name}</h2><span className="rounded-pill bg-brand-50 px-2.5 py-1 text-xs font-semibold capitalize text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{profile.user.role ?? "Teacher"}</span></div><p className="mt-1 text-sm text-muted">{profile.user.email}</p></div>
        <span className={`rounded-pill px-3 py-1.5 text-xs font-bold capitalize ${profile.user.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}>{profile.user.status ?? "Unknown status"}</span>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <section className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-lg font-bold">Contact details</h2><p className="mt-1 text-sm text-muted">Change your name, sign-in email, or phone number.</p></div>{!editing && <Button type="button" variant="secondary" size="sm" onClick={startEditing}><Pencil className="size-4" />Edit profile</Button>}</div>
          {editing ? <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold">Full name<input required maxLength={150} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className={inputClass} autoComplete="name" />{fieldErrors.name && <span className="mt-1 block text-xs text-danger">{fieldErrors.name}</span>}</label>
            <label className="block text-sm font-semibold">Email address<input required type="email" maxLength={150} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} className={inputClass} autoComplete="email" />{fieldErrors.email && <span className="mt-1 block text-xs text-danger">{fieldErrors.email}</span>}</label>
            <label className="block text-sm font-semibold">Phone number<input type="tel" maxLength={30} value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} className={inputClass} autoComplete="tel" placeholder="Add a phone number" />{fieldErrors.phone && <span className="mt-1 block text-xs text-danger">{fieldErrors.phone}</span>}</label>
            <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={cancelEditing} disabled={saving}><X className="size-4" />Cancel</Button><Button type="submit" loading={saving}>Save profile</Button></div>
          </form> : <div className="mt-4 divide-y divide-hairline">
            <DetailRow label="Full name" value={profile.user.name} icon={UserRound} />
            <DetailRow label="Email address" value={profile.user.email} icon={Mail} />
            <DetailRow label="Phone number" value={profile.phone || "Not provided"} icon={Phone} />
            {detailRows.map((item) => <DetailRow key={item.label} {...item} />)}
          </div>}
        </section>

        <aside className="rounded-panel border border-hairline bg-card p-5 shadow-soft sm:p-6"><h2 className="font-display text-lg font-bold">Teaching access</h2><p className="mt-1 text-sm text-muted">Your class access is managed by your campus administrator.</p><div className="mt-5 rounded-control bg-canvas p-4"><p className="text-sm text-muted">Assigned sections</p><p className="mt-1 font-display text-3xl font-extrabold">{sectionCount ?? "—"}</p></div><div className="mt-4 rounded-control border border-brand-200 bg-brand-50/60 p-4 text-sm text-brand-800 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200">Your role, account status, teacher code, department, and class assignments remain administrator-managed.</div></aside>
      </div>
    </div>
  );
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UserRound }) {
  return <div className="flex items-center gap-3 py-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-canvas text-muted"><Icon className="size-4" /></span><div className="min-w-0 flex-1"><p className="text-xs text-muted">{label}</p><p className="mt-0.5 truncate text-sm font-semibold capitalize">{value}</p></div></div>;
}
